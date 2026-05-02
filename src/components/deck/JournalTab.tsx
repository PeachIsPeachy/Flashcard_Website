import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { LearningLog } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

type Props = {
  deckId: string;
  userId: string;
};

export function JournalTab({ deckId, userId }: Props) {
  const [logs, setLogs] = useState<LearningLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from("learning_logs")
      .select("*")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: false });
    if (error) {
      if (
        error.message.includes("learning_logs") ||
        error.code === "42P01"
      ) {
        toast.error("Run the database migration for the learning journal (see supabase/migrations/003).");
      } else {
        toast.error(error.message);
      }
      setLogs([]);
      return;
    }
    setLogs((data ?? []) as LearningLog[]);
  }, [deckId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      await fetchLogs();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [deckId, fetchLogs]);

  async function handleSave() {
    const body = draft.trim();
    if (!body) {
      toast.error("Write something first");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("learning_logs").insert({
        user_id: userId,
        deck_id: deckId,
        body,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setDraft("");
      toast.success("Saved to journal");
      await fetchLogs();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("learning_logs").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLogs((prev) => prev.filter((x) => x.id !== id));
    toast.success("Removed");
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h3 className="text-sm font-medium text-foreground">Learning log</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Short notes after a session, what felt hard, or reminders — anything
          about this deck.
        </p>
      </div>
      <div className="space-y-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. Today I focused on definitions I keep mixing up…"
          className="min-h-[100px] resize-y"
          aria-label="Journal entry"
        />
        <Button
          type="button"
          className="min-h-10"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? "Saving…" : "Save entry"}
        </Button>
      </div>
      <div className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Recent entries
        </h4>
        {logs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/80 py-8 text-center text-sm text-muted-foreground">
            No entries yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {logs.map((log) => (
              <li
                key={log.id}
                className="group rounded-lg border bg-card/50 p-4 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="whitespace-pre-wrap text-foreground">{log.body}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 opacity-60 hover:opacity-100"
                    aria-label="Delete entry"
                    onClick={() => void handleDelete(log.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
