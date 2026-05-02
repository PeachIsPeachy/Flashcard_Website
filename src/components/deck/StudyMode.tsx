import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudySession } from "@/hooks/useStudySession";
import { supabase } from "@/lib/supabaseClient";
import type { CardRow } from "@/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Check, CheckCircle2, RotateCcw, StickyNote, Volume2, X } from "lucide-react";
import { toast } from "sonner";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type StudyScope = "daily" | "all";

type Props = {
  deckId: string;
  userId: string;
  /** Full deck, ordered by `created_at` ascending (card list order). */
  cards: CardRow[];
  studyScope: StudyScope;
  dailyGoal: number;
  dailyBatchOffset: number;
  onSessionSaved?: () => void;
  /** After a finished daily session is saved; advance deck offset by `studiedCount`. */
  onDailyBatchCompleted?: (studiedCount: number) => Promise<void>;
  /** After items are saved to the deck notebook from results. */
  onNotebookSaved?: () => void;
};

export function StudyMode({
  deckId,
  userId,
  cards: initialCards,
  studyScope,
  dailyGoal,
  dailyBatchOffset,
  onSessionSaved,
  onDailyBatchCompleted,
  onNotebookSaved,
}: Props) {
  const { saveSession } = useStudySession();

  const studyCards = useMemo(() => {
    if (studyScope === "all") return [...initialCards];
    const start = Math.min(dailyBatchOffset, initialCards.length);
    const end = Math.min(start + dailyGoal, initialCards.length);
    return initialCards.slice(start, end);
  }, [initialCards, studyScope, dailyBatchOffset, dailyGoal]);

  const packKey = useMemo(
    () =>
      `${studyScope}|${dailyBatchOffset}|${dailyGoal}|${studyCards.map((c) => c.id).join(",")}`,
    [studyScope, dailyBatchOffset, dailyGoal, studyCards]
  );

  const [order, setOrder] = useState<CardRow[]>(() => shuffle(studyCards));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [missed, setMissed] = useState<CardRow[]>([]);
  const [phase, setPhase] = useState<"study" | "results">("study");
  const [saving, setSaving] = useState(false);
  const [correctCards, setCorrectCards] = useState<CardRow[]>([]);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [savingNotebook, setSavingNotebook] = useState(false);
  const [notebookCard, setNotebookCard] = useState<CardRow | null>(null);
  const [notebookNoteDraft, setNotebookNoteDraft] = useState("");
  const [savedNotebookCardIds, setSavedNotebookCardIds] = useState<Set<string>>(
    () => new Set()
  );

  // packKey encodes scope, offset, goal, and study pack card ids (avoids reset when parent passes a new array reference).
  // Do not reset while showing results — parent may advance daily_batch_offset after save, which changes packKey.
  useEffect(() => {
    if (phase === "results") return;
    setOrder(shuffle(studyCards));
    setIndex(0);
    setFlipped(false);
    setCorrect(0);
    setMissed([]);
    setCorrectCards([]);
    setLastSessionId(null);
    setSavedNotebookCardIds(new Set());
    setNotebookCard(null);
    setNotebookNoteDraft("");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- studyCards is fully determined by packKey
  }, [packKey, phase]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakQuestion = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Nothing to read for this question.");
      return;
    }
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Read aloud is not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [index, packKey]);

  const current = order[index];
  const total = order.length;
  const done = phase === "results";

  const restart = useCallback(() => {
    setOrder(shuffle(studyCards));
    setIndex(0);
    setFlipped(false);
    setCorrect(0);
    setMissed([]);
    setCorrectCards([]);
    setLastSessionId(null);
    setSavedNotebookCardIds(new Set());
    setNotebookCard(null);
    setNotebookNoteDraft("");
    setPhase("study");
  }, [studyCards]);

  const closeNotebookDialog = useCallback((open: boolean) => {
    if (!open) {
      setNotebookCard(null);
      setNotebookNoteDraft("");
    }
  }, []);

  const saveNotebookFromDialog = useCallback(async () => {
    if (!notebookCard) return;
    setSavingNotebook(true);
    try {
      const note = notebookNoteDraft.trim();
      const { error } = await supabase.from("notebook_entries").insert({
        user_id: userId,
        deck_id: deckId,
        card_id: notebookCard.id,
        front: notebookCard.front,
        back: notebookCard.back,
        note,
        study_session_id: lastSessionId,
      });
      if (error) {
        if (error.message.includes("note") || error.code === "42703") {
          toast.error(
            "Run the latest database migration (supabase/migrations/004_notebook_entry_note.sql)."
          );
        } else {
          toast.error(error.message);
        }
        return;
      }
      setSavedNotebookCardIds((prev) => new Set(prev).add(notebookCard.id));
      toast.success("Saved to notebook");
      onNotebookSaved?.();
      setNotebookCard(null);
      setNotebookNoteDraft("");
    } finally {
      setSavingNotebook(false);
    }
  }, [
    notebookCard,
    notebookNoteDraft,
    userId,
    deckId,
    lastSessionId,
    onNotebookSaved,
  ]);

  const finishAndSave = useCallback(
    async (
      finalCorrect: number,
      finalTotal: number,
      missedCards: CardRow[]
    ) => {
      if (finalTotal === 0) return;
      setSaving(true);
      try {
        const saved = await saveSession({
          deckId,
          userId,
          score: finalCorrect,
          total: finalTotal,
          missedCards: missedCards.map((c) => ({
            id: c.id,
            front: c.front,
            back: c.back,
          })),
          scope: studyScope === "daily" ? "daily" : "full",
        });
        if (saved && typeof saved === "object" && "id" in saved) {
          setLastSessionId((saved as { id: string }).id);
        } else {
          setLastSessionId(null);
        }
        toast.success("Session saved");
        onSessionSaved?.();
        if (studyScope === "daily") {
          await onDailyBatchCompleted?.(finalTotal);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save session");
      } finally {
        setSaving(false);
      }
    },
    [
      deckId,
      userId,
      saveSession,
      onSessionSaved,
      studyScope,
      onDailyBatchCompleted,
    ]
  );

  const recordAnswer = useCallback(
    (isCorrect: boolean) => {
      if (!current || phase !== "study") return;
      const nextCorrect = correct + (isCorrect ? 1 : 0);
      const nextMissed = isCorrect ? missed : [...missed, current];
      const nextIndex = index + 1;
      setFlipped(false);
      setCorrectCards((prev) => (isCorrect ? [...prev, current] : prev));
      if (nextIndex >= total) {
        setCorrect(nextCorrect);
        setMissed(nextMissed);
        setPhase("results");
        void finishAndSave(nextCorrect, total, nextMissed);
      } else {
        setCorrect(nextCorrect);
        if (!isCorrect) setMissed(nextMissed);
        setIndex(nextIndex);
      }
    },
    [current, phase, correct, missed, index, total, finishAndSave]
  );

  const pct = useMemo(() => {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  }, [correct, total]);

  if (initialCards.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Add cards to this deck before studying.
      </p>
    );
  }

  if (studyScope === "daily" && studyCards.length === 0) {
    const deckTotal = initialCards.length;
    const atEnd = dailyBatchOffset >= deckTotal;
    return (
      <div className="mx-auto max-w-md space-y-3 rounded-xl border border-dashed border-border/80 bg-card/40 px-5 py-8 text-center">
        <p className="font-medium text-foreground">No cards in this daily batch</p>
        <p className="text-sm text-muted-foreground">
          {atEnd
            ? "You've finished every card in this deck for daily study (by card order). Reset daily progress in study settings to start again from the first card, or switch to All cards."
            : "Try adding cards, or use All cards to review the whole deck."}
        </p>
      </div>
    );
  }

  if (done) {
    const wrongCount = missed.length;
    const rightCount = correctCards.length;
    return (
      <div className="mx-auto max-w-lg space-y-6 py-4">
        <div className="text-center">
          <h3 className="text-2xl font-bold tracking-tight">Session complete</h3>
          <p className="mt-2 text-muted-foreground">
            <span className="font-semibold text-foreground">{rightCount}</span>{" "}
            correct ·{" "}
            <span className="font-semibold text-foreground">{wrongCount}</span>{" "}
            incorrect ({pct}%)
          </p>
          {studyScope === "daily" && (
            <p className="mt-2 text-xs text-muted-foreground">
              Daily batch saved — next session moves to the following cards in
              order.
            </p>
          )}
        </div>

        {rightCount > 0 && (
          <div className="rounded-xl border border-emerald-500/25 bg-card/80 p-4">
            <p className="mb-3 text-sm font-medium text-emerald-200/90">
              Correct ({rightCount})
            </p>
            <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
              {correctCards.map((c) => (
                <li
                  key={`ok-${c.id}-${c.front}`}
                  className="rounded-lg bg-muted/40 px-3 py-2"
                >
                  <span className="font-medium text-foreground">{c.front}</span>
                  <span className="text-muted-foreground"> → </span>
                  <span>{c.back}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {wrongCount > 0 && (
          <div className="rounded-xl border border-destructive/30 bg-card/80 p-4">
            <div className="mb-3 space-y-1">
              <p className="text-sm font-medium text-destructive/90">
                Incorrect ({wrongCount})
              </p>
              <p className="text-xs text-muted-foreground">
                Tap the note icon to add a reminder and save to your notebook.
              </p>
            </div>
            <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
              {missed.map((c) => {
                const saved = savedNotebookCardIds.has(c.id);
                return (
                  <li
                    key={`${c.id}-${c.front}`}
                    className="flex items-center gap-2 rounded-lg bg-muted/50 py-2 pl-3 pr-1"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-foreground">{c.front}</span>
                      <span className="text-muted-foreground"> → </span>
                      <span>{c.back}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-11 w-11 shrink-0 rounded-xl transition-colors",
                        saved
                          ? "cursor-default text-primary hover:bg-transparent hover:text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      onClick={() => {
                        setNotebookCard(c);
                        setNotebookNoteDraft("");
                      }}
                      disabled={saved}
                      aria-label={
                        saved
                          ? "Saved to notebook"
                          : "Open note and save to notebook"
                      }
                      title={saved ? "Saved" : "Add note to notebook"}
                    >
                      {saved ? (
                        <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
                      ) : (
                        <StickyNote className="h-5 w-5" strokeWidth={2} />
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <Dialog open={notebookCard !== null} onOpenChange={closeNotebookDialog}>
          <DialogContent className="gap-0 border-border/80 bg-card p-0 sm:max-w-md">
            <DialogHeader className="border-b border-border/60 px-6 pb-4 pt-6 text-left">
              <DialogTitle>Add to notebook</DialogTitle>
              <DialogDescription className="text-left">
                Optional note — reminders, mnemonics, or why this one was tricky.
                The card is saved with your text.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 px-6 py-4">
              <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm leading-relaxed">
                <p className="font-medium text-foreground">
                  {notebookCard?.front || "—"}
                </p>
                <p className="mt-2 text-muted-foreground">
                  <span className="text-muted-foreground/70">→ </span>
                  {notebookCard?.back || "—"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notebook-note" className="text-foreground">
                  Your note
                </Label>
                <Textarea
                  id="notebook-note"
                  value={notebookNoteDraft}
                  onChange={(e) => setNotebookNoteDraft(e.target.value)}
                  placeholder="Type here…"
                  className="min-h-[120px] resize-y"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter className="border-t border-border/60 bg-muted/20 px-6 py-4 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => closeNotebookDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void saveNotebookFromDialog()}
                disabled={savingNotebook}
                className="min-w-[140px]"
              >
                {savingNotebook ? "Saving…" : "Save to notebook"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          className="w-full min-h-11 gap-2"
          onClick={restart}
          variant="secondary"
          disabled={saving}
        >
          <RotateCcw className="h-4 w-4" />
          Study again
        </Button>
      </div>
    );
  }

  const progressValue = index + 1;

  const dailyFrom =
    studyScope === "daily"
      ? Math.min(dailyBatchOffset, initialCards.length) + 1
      : null;
  const dailyTo =
    studyScope === "daily"
      ? Math.min(dailyBatchOffset, initialCards.length) + studyCards.length
      : null;

  return (
    <div className="mx-auto max-w-lg space-y-6 py-2">
      {studyScope === "daily" && dailyFrom !== null && dailyTo !== null && (
        <p className="text-center text-xs text-muted-foreground">
          Daily batch: cards {dailyFrom}–{dailyTo} of {initialCards.length}{" "}
          (by order)
        </p>
      )}
      {studyScope === "all" && (
        <p className="text-center text-xs text-muted-foreground">
          All {initialCards.length} card{initialCards.length === 1 ? "" : "s"}{" "}
          · shuffled
        </p>
      )}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Card {index + 1} of {total}
          </span>
          <span>{Math.round((progressValue / total) * 100)}%</span>
        </div>
        <Progress value={progressValue} max={total} />
      </div>

      <button
        type="button"
        className="flashcard-scene w-full cursor-pointer rounded-2xl border-0 bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Show question" : "Show answer"}
      >
        <div
          className={cn(
            "flashcard-inner relative min-h-[220px] w-full sm:min-h-[260px]",
            flipped && "is-flipped"
          )}
        >
          <div className="flashcard-face absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border bg-card bg-gradient-to-br from-[#FFF2D0] via-card to-[#FFB2B2]/55 p-6 text-center shadow-md">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10 h-9 w-9 shrink-0 rounded-full text-foreground/80 hover:bg-background/40 hover:text-foreground"
              aria-label="Read question aloud"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                speakQuestion(current?.front ?? "");
              }}
            >
              <Volume2 className="h-5 w-5" />
            </Button>
            <Badge variant="outline" className="mb-1">
              Question
            </Badge>
            <p className="text-lg font-medium leading-relaxed sm:text-xl">
              {current?.front || "—"}
            </p>
            <p className="text-xs text-muted-foreground">Tap to flip</p>
          </div>
          <div className="flashcard-face flashcard-face--back absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border bg-card bg-gradient-to-br from-[#FFB2B2]/55 via-card to-[#FFF2D0] p-6 text-center shadow-md">
            <Badge variant="outline" className="mb-1">
              Answer
            </Badge>
            <p className="text-lg font-medium leading-relaxed sm:text-xl">
              {current?.back || "—"}
            </p>
            <p className="text-xs text-muted-foreground">Tap to flip</p>
          </div>
        </div>
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          type="button"
          variant="outline"
          className="min-h-12 flex-1 gap-2 border-[#FFB2B2] text-[#FFD1D1] hover:bg-[#3d2a2a]"
          onClick={(e) => {
            e.stopPropagation();
            recordAnswer(true);
          }}
        >
          <Check className="h-5 w-5" />
          Correct
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-12 flex-1 gap-2 border-[#E36A6A]/60 text-[#FFB2B2] hover:bg-[#FFB2B2]/20"
          onClick={(e) => {
            e.stopPropagation();
            recordAnswer(false);
          }}
        >
          <X className="h-5 w-5" />
          Incorrect
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Tap the card to reveal the answer, then mark correct or incorrect.
      </p>
    </div>
  );
}
