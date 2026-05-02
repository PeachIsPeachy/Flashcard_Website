import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Settings, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import type { CardRow, Deck } from "@/types";
import type { StudyScope } from "@/components/deck/StudyMode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CardList } from "@/components/deck/CardList";
import { StudyMode } from "@/components/deck/StudyMode";
import { HistoryTab } from "@/components/deck/HistoryTab";
import { JournalTab } from "@/components/deck/JournalTab";
import { NotebookTab } from "@/components/deck/NotebookTab";
import { toast } from "sonner";

type DeckPreviewState = {
  id: string;
  name: string;
  card_count: number;
};

export function DeckPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const deckPreview = (location.state as { deckPreview?: DeckPreviewState } | null)
    ?.deckPreview;
  const previewMatch = Boolean(
    deckId && deckPreview && deckPreview.id === deckId
  );

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(!previewMatch);
  const [historyRev, setHistoryRev] = useState(0);
  const [deleteDeckOpen, setDeleteDeckOpen] = useState(false);
  const [deletingDeck, setDeletingDeck] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [studyScope, setStudyScope] = useState<StudyScope>("daily");
  const [studySettingsOpen, setStudySettingsOpen] = useState(false);
  const [dailyGoalDraft, setDailyGoalDraft] = useState("5");
  const [savingStudySettings, setSavingStudySettings] = useState(false);
  const [notebookRev, setNotebookRev] = useState(0);

  useEffect(() => {
    setDeck(null);
    setCards([]);
    const match = Boolean(deckId && deckPreview?.id === deckId);
    setLoading(!match);
  }, [deckId, deckPreview?.id]);

  const loadDeckAndCards = useCallback(async () => {
    if (!deckId || !user?.id) {
      setLoading(false);
      return;
    }
    const match = Boolean(deckPreview?.id === deckId);
    if (!match) {
      setLoading(true);
    }
    const deckRes = await supabase
      .from("decks")
      .select("*")
      .eq("id", deckId)
      .maybeSingle();
    if (deckRes.error || !deckRes.data) {
      toast.error(deckRes.error?.message ?? "Deck not found");
      navigate("/", { replace: true });
      return;
    }
    const raw = deckRes.data as Record<string, unknown>;
    const d: Deck = {
      id: raw.id as string,
      user_id: raw.user_id as string,
      name: raw.name as string,
      created_at: raw.created_at as string,
      daily_goal: Number(raw.daily_goal ?? 5),
      daily_batch_offset: Number(raw.daily_batch_offset ?? 0),
    };
    if (d.user_id !== user.id) {
      toast.error("You do not have access to this deck");
      navigate("/", { replace: true });
      return;
    }
    setDeck(d);
    const cardsRes = await supabase
      .from("cards")
      .select("*")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: true });
    if (cardsRes.error) {
      toast.error(cardsRes.error.message);
      setCards([]);
    } else {
      setCards((cardsRes.data ?? []) as CardRow[]);
    }
    setLoading(false);
  }, [deckId, user?.id, navigate, deckPreview?.id]);

  useEffect(() => {
    void loadDeckAndCards();
  }, [loadDeckAndCards]);

  const refreshCardsOnly = useCallback(async () => {
    if (!deckId) return;
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: true });
    if (!error && data) setCards(data as CardRow[]);
  }, [deckId]);

  const handleSessionSaved = useCallback(() => {
    setHistoryRev((h) => h + 1);
  }, []);

  const advanceDailyBatch = useCallback(
    async (studiedCount: number) => {
      if (!deckId || !deck || studiedCount <= 0) return;
      const next = deck.daily_batch_offset + studiedCount;
      const { error } = await supabase
        .from("decks")
        .update({ daily_batch_offset: next })
        .eq("id", deckId);
      if (error) {
        toast.error(error.message);
        return;
      }
      setDeck({ ...deck, daily_batch_offset: next });
    },
    [deckId, deck]
  );

  useEffect(() => {
    if (deck) setDailyGoalDraft(String(deck.daily_goal));
  }, [deck?.daily_goal]);

  async function saveDailyGoalFromSettings() {
    if (!deckId || !deck) return;
    const n = parseInt(dailyGoalDraft, 10);
    if (Number.isNaN(n) || n < 1 || n > 200) {
      toast.error("Enter a daily goal between 1 and 200");
      return;
    }
    setSavingStudySettings(true);
    try {
      const { error } = await supabase
        .from("decks")
        .update({ daily_goal: n })
        .eq("id", deckId);
      if (error) {
        toast.error(error.message);
        return;
      }
      setDeck({ ...deck, daily_goal: n });
      toast.success("Daily goal updated");
      setStudySettingsOpen(false);
    } finally {
      setSavingStudySettings(false);
    }
  }

  async function resetDailyProgress() {
    if (!deckId || !deck) return;
    setSavingStudySettings(true);
    try {
      const { error } = await supabase
        .from("decks")
        .update({ daily_batch_offset: 0 })
        .eq("id", deckId);
      if (error) {
        toast.error(error.message);
        return;
      }
      setDeck({ ...deck, daily_batch_offset: 0 });
      toast.success("Daily progress reset — next batch starts from the first card");
      setStudySettingsOpen(false);
    } finally {
      setSavingStudySettings(false);
    }
  }

  function openRenameDialog() {
    if (!deck) return;
    setRenameValue(deck.name);
    setRenameError(null);
    setRenameOpen(true);
  }

  async function confirmRenameDeck() {
    if (!deck || !deckId) return;
    const next = renameValue.trim();
    if (!next) {
      setRenameError("Enter a deck name");
      return;
    }
    if (next === deck.name) {
      setRenameOpen(false);
      return;
    }
    setRenameError(null);
    setRenaming(true);
    try {
      const { error } = await supabase
        .from("decks")
        .update({ name: next })
        .eq("id", deckId);
      if (error) {
        toast.error(error.message);
        return;
      }
      setDeck({ ...deck, name: next });
      navigate(location.pathname, {
        replace: true,
        state: {
          deckPreview: {
            id: deckId,
            name: next,
            card_count: cards.length,
          },
        },
      });
      toast.success("Deck renamed");
      setRenameOpen(false);
    } finally {
      setRenaming(false);
    }
  }

  async function confirmDeleteDeck() {
    if (!deckId) return;
    setDeletingDeck(true);
    try {
      const { error } = await supabase.from("decks").delete().eq("id", deckId);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Deck deleted");
      setDeleteDeckOpen(false);
      navigate("/", { replace: true });
    } finally {
      setDeletingDeck(false);
    }
  }

  if (!deckId || !user) {
    if (!deckId) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      );
    }
    return null;
  }

  const showShell = deck !== null || previewMatch;
  if (!showShell && loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!showShell) return null;

  const displayName = deck?.name ?? deckPreview?.name ?? "Deck";
  const displayCardCount = deck ? cards.length : (deckPreview?.card_count ?? cards.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="mt-0.5 shrink-0">
            <Link to="/" aria-label="Back to dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {displayName}
              </h1>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                disabled={!deck}
                onClick={openRenameDialog}
                aria-label="Rename deck"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {displayCardCount} card{displayCardCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 shrink-0 gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 sm:self-start"
          disabled={!deck}
          onClick={() => setDeleteDeckOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Delete deck</span>
          <span className="sm:hidden">Delete</span>
        </Button>
      </div>

      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          setRenameOpen(open);
          if (!open) setRenameError(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename deck</DialogTitle>
            <DialogDescription>
              Choose a new name for this deck.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="deck-rename">Name</Label>
            <Input
              id="deck-rename"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="min-h-11"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void confirmRenameDeck();
                }
              }}
            />
            {renameError && (
              <p className="text-sm text-destructive">{renameError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameOpen(false)}
              disabled={renaming}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={renaming}
              onClick={() => void confirmRenameDeck()}
            >
              {renaming ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDeckOpen} onOpenChange={setDeleteDeckOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this deck?</DialogTitle>
            <DialogDescription>
              This will permanently remove &quot;{displayName}&quot; and all of its
              cards and study history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDeckOpen(false)}
              disabled={deletingDeck}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingDeck}
              onClick={() => void confirmDeleteDeck()}
            >
              {deletingDeck ? "Deleting…" : "Delete deck"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs
        defaultValue="cards"
        className="w-full"
        onValueChange={(v) => {
          if (v === "study") void refreshCardsOnly();
        }}
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3 lg:inline-flex lg:w-auto lg:flex-wrap">
          <TabsTrigger value="cards" className="min-h-11">
            Cards
          </TabsTrigger>
          <TabsTrigger value="study" className="min-h-11">
            Study
          </TabsTrigger>
          <TabsTrigger value="history" className="min-h-11">
            History
          </TabsTrigger>
          <TabsTrigger value="journal" className="min-h-11">
            Journal
          </TabsTrigger>
          <TabsTrigger value="notebook" className="min-h-11">
            Notebook
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cards" className="mt-6 data-[state=inactive]:hidden" forceMount>
          <CardList deckId={deckId} cards={cards} setCards={setCards} />
        </TabsContent>
        <TabsContent value="study" className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-lg border border-border/80 bg-muted/40 p-1">
              <Button
                type="button"
                variant={studyScope === "daily" ? "secondary" : "ghost"}
                size="sm"
                className="min-h-9 rounded-md px-4"
                onClick={() => setStudyScope("daily")}
              >
                Daily batch
              </Button>
              <Button
                type="button"
                variant={studyScope === "all" ? "secondary" : "ghost"}
                size="sm"
                className="min-h-9 rounded-md px-4"
                onClick={() => setStudyScope("all")}
              >
                All cards
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-9 gap-2 shrink-0"
              disabled={!deck}
              onClick={() => {
                if (deck) setDailyGoalDraft(String(deck.daily_goal));
                setStudySettingsOpen(true);
              }}
            >
              <Settings className="h-4 w-4" />
              Study settings
            </Button>
          </div>
          <Dialog open={studySettingsOpen} onOpenChange={setStudySettingsOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Daily study settings</DialogTitle>
                <DialogDescription>
                  Daily batch takes the next group of cards in your list order
                  (Cards tab order). Finishing a daily session moves you forward.
                  Use All cards anytime to review the entire deck shuffled.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="daily-goal">Words (cards) per daily batch</Label>
                  <Input
                    id="daily-goal"
                    type="number"
                    min={1}
                    max={200}
                    className="min-h-11"
                    value={dailyGoalDraft}
                    onChange={(e) => setDailyGoalDraft(e.target.value)}
                  />
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                  <p>
                    Current position: card{" "}
                    <span className="font-medium text-foreground">
                      {deck
                        ? Math.min(deck.daily_batch_offset, cards.length) + 1
                        : "—"}
                    </span>{" "}
                    next (of {cards.length} total)
                  </p>
                </div>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  type="button"
                  className="w-full"
                  disabled={savingStudySettings || !deck}
                  onClick={() => void saveDailyGoalFromSettings()}
                >
                  {savingStudySettings ? "Saving…" : "Save daily goal"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={savingStudySettings || !deck}
                  onClick={() => void resetDailyProgress()}
                >
                  Reset daily progress (start from card 1)
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <StudyMode
            key={`${studyScope}-${cards.map((c) => c.id).join(",")}`}
            deckId={deckId}
            userId={user.id}
            cards={cards}
            studyScope={studyScope}
            dailyGoal={deck?.daily_goal ?? 5}
            dailyBatchOffset={deck?.daily_batch_offset ?? 0}
            onSessionSaved={handleSessionSaved}
            onDailyBatchCompleted={advanceDailyBatch}
            onNotebookSaved={() => setNotebookRev((n) => n + 1)}
          />
        </TabsContent>
        <TabsContent value="history" className="mt-6 data-[state=inactive]:hidden" forceMount>
          <HistoryTab deckId={deckId} revalidateAt={historyRev} />
        </TabsContent>
        <TabsContent value="journal" className="mt-6 data-[state=inactive]:hidden" forceMount>
          <JournalTab deckId={deckId} userId={user.id} />
        </TabsContent>
        <TabsContent value="notebook" className="mt-6 data-[state=inactive]:hidden" forceMount>
          <NotebookTab deckId={deckId} revalidateAt={notebookRev} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
