import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type {
  MissedCardSnapshot,
  StudySession,
  StudySessionWithTrend,
} from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Minus,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

type Props = {
  deckId: string;
  /** Increment after a study session is saved to refetch without skeleton flicker. */
  revalidateAt?: number;
};

function ratio(s: StudySession): number {
  if (s.total <= 0) return 0;
  return s.score / s.total;
}

function pct(n: number): number {
  return Math.round(n * 100);
}

function trendLabel(deltaPct: number): "Improving" | "Stable" | "Needs review" {
  if (deltaPct >= 5) return "Improving";
  if (deltaPct <= -5) return "Needs review";
  return "Stable";
}

function Sparkline({ values }: { values: number[] }) {
  const w = 360;
  const h = 84;
  const p = 8;
  if (values.length === 0) return null;
  if (values.length === 1) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full">
        <line
          x1={p}
          y1={h / 2}
          x2={w - p}
          y2={h / 2}
          className="stroke-border"
          strokeWidth={2}
        />
      </svg>
    );
  }

  const stepX = (w - p * 2) / (values.length - 1);
  const points = values.map((v, i) => {
    const x = p + stepX * i;
    const y = p + (1 - v) * (h - p * 2);
    return { x, y };
  });
  const path = points.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x},${pt.y}`).join(" ");
  const last = points[points.length - 1]!;
  const bestIndex = values.reduce((best, v, i, arr) => (v > arr[best]! ? i : best), 0);
  const best = points[bestIndex]!;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full">
      <path d={path} fill="none" className="stroke-primary" strokeWidth={2.5} />
      <circle cx={best.x} cy={best.y} r={4} className="fill-[#E36A6A]" />
      <circle cx={last.x} cy={last.y} r={4} className="fill-primary" />
    </svg>
  );
}

function parseMissed(raw: unknown): MissedCardSnapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : "";
      const front = typeof o.front === "string" ? o.front : "";
      const back = typeof o.back === "string" ? o.back : "";
      if (!front && !back) return null;
      return { id, front, back };
    })
    .filter((x): x is MissedCardSnapshot => x !== null);
}

function withTrends(rows: StudySession[]): StudySessionWithTrend[] {
  const asc = [...rows].sort(
    (a, b) => new Date(a.studied_at).getTime() - new Date(b.studied_at).getTime()
  );
  const prevRatioById = new Map<string, number | null>();
  for (let i = 0; i < asc.length; i++) {
    const prev = i > 0 ? ratio(asc[i - 1]!) : null;
    prevRatioById.set(asc[i]!.id, prev);
  }
  const desc = [...asc].reverse();
  return desc.map((s) => {
    const prev = prevRatioById.get(s.id) ?? null;
    const r = ratio(s);
    let trend: StudySessionWithTrend["trend"] = "first";
    if (prev !== null) {
      if (r > prev) trend = "up";
      else if (r < prev) trend = "down";
      else trend = "same";
    }
    return { ...s, trend, prevRatio: prev, ratio: r };
  });
}

export function HistoryTab({ deckId, revalidateAt = 0 }: Props) {
  const [sessions, setSessions] = useState<StudySessionWithTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSessions = useCallback(async (): Promise<StudySessionWithTrend[]> => {
    const { data, error } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("deck_id", deckId)
      .order("studied_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return [];
    }
    return withTrends((data ?? []) as StudySession[]);
  }, [deckId]);

  useEffect(() => {
    let cancelled = false;
    setExpandedId(null);
    setLoading(true);
    void (async () => {
      const next = await fetchSessions();
      if (cancelled) return;
      setSessions(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [deckId, fetchSessions]);

  useEffect(() => {
    if (revalidateAt < 1) return;
    let cancelled = false;
    void (async () => {
      const next = await fetchSessions();
      if (cancelled) return;
      setSessions(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [revalidateAt, fetchSessions]);

  const formatted = useMemo(
    () =>
      sessions.map((s) => ({
        ...s,
        scope: s.scope === "daily" ? ("daily" as const) : ("full" as const),
        missed: parseMissed(s.missed_cards),
        deltaPct: s.prevRatio === null ? null : pct(s.ratio - s.prevRatio),
        ratioPct: pct(s.ratio),
        when: new Date(s.studied_at).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      })),
    [sessions]
  );

  const summary = useMemo(() => {
    if (sessions.length === 0) return null;
    const latest = sessions[0]!;
    const latestPct = pct(latest.ratio);
    const best = sessions.reduce((a, b) => (a.ratio >= b.ratio ? a : b));
    const recent = sessions.slice(0, 7);
    const avg = recent.reduce((acc, s) => acc + s.ratio, 0) / recent.length;
    const avgPct = pct(avg);
    const sparkValues = [...sessions].reverse().slice(-14).map((s) => s.ratio);
    return {
      latest,
      latestPct,
      bestPct: pct(best.ratio),
      avgPct,
      sparkValues,
      count: sessions.length,
    };
  }, [sessions]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No study sessions yet. Complete a study round to see history here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="rounded-xl border bg-card p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Latest score</p>
              <p className="mt-1 text-xl font-semibold">
                {summary.latest.score}/{summary.latest.total} ({summary.latestPct}%)
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">7-session average</p>
              <p className="mt-1 text-xl font-semibold">{summary.avgPct}%</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Personal best</p>
              <p className="mt-1 flex items-center gap-2 text-xl font-semibold">
                <Trophy className="h-4 w-4 text-primary" />
                {summary.bestPct}%
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border bg-background p-3">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Performance trend
              </span>
              <span>{Math.min(14, summary.count)} recent sessions</span>
            </div>
            <Sparkline values={summary.sparkValues} />
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="w-10 px-2 py-3" aria-hidden />
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Mode</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Change</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Words to review</th>
            </tr>
          </thead>
          <tbody>
            {formatted.map((s) => {
              const label = s.deltaPct === null ? "First session" : trendLabel(s.deltaPct);
              const deltaText =
                s.deltaPct === null ? "—" : `${s.deltaPct > 0 ? "+" : ""}${s.deltaPct}%`;
              const missedCount = s.missed.length;
              const expanded = expandedId === s.id;
              return (
                <Fragment key={s.id}>
                  <tr className="border-b border-border/60 transition-colors hover:bg-muted/30">
                    <td className="px-2 py-3 align-middle">
                      {missedCount > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          aria-expanded={expanded}
                          aria-label={
                            expanded
                              ? "Hide words to review"
                              : "Show words to review"
                          }
                          onClick={() =>
                            setExpandedId((id) => (id === s.id ? null : s.id))
                          }
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                          />
                        </Button>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-foreground">{s.when}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-normal">
                        {s.scope === "daily" ? "Daily" : "Full"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {s.score}/{s.total}
                      </span>
                      <span className="ml-2 text-muted-foreground">({s.ratioPct}%)</span>
                    </td>
                    <td className="px-4 py-3">
                      {s.deltaPct === null && <Badge variant="muted">—</Badge>}
                      {s.deltaPct !== null && s.deltaPct > 0 && (
                        <Badge variant="success" className="gap-1">
                          <ArrowUp className="h-3 w-3" />
                          {deltaText}
                        </Badge>
                      )}
                      {s.deltaPct !== null && s.deltaPct < 0 && (
                        <Badge variant="danger" className="gap-1">
                          <ArrowDown className="h-3 w-3" />
                          {deltaText}
                        </Badge>
                      )}
                      {s.deltaPct === 0 && (
                        <Badge variant="secondary" className="gap-1">
                          <Minus className="h-3 w-3" />
                          0%
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          label === "Improving"
                            ? "success"
                            : label === "Needs review"
                              ? "danger"
                              : "secondary"
                        }
                      >
                        {label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {missedCount === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Badge variant="outline">{missedCount} word{missedCount === 1 ? "" : "s"}</Badge>
                      )}
                    </td>
                  </tr>
                  {expanded && missedCount > 0 && (
                    <tr className="border-b border-border/60 bg-muted/20">
                      <td colSpan={7} className="px-4 py-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Marked incorrect this session — practice these next:
                        </p>
                        <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                          {s.missed.map((m, i) => (
                            <li
                              key={m.id || `${m.front}-${i}`}
                              className="rounded-lg border bg-card px-3 py-2"
                            >
                              <span className="font-medium text-foreground">{m.front || "—"}</span>
                              <span className="text-muted-foreground"> → </span>
                              <span>{m.back || "—"}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
