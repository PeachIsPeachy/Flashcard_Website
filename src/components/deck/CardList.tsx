import { useState, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { CardRow } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

type Props = {
  deckId: string;
  cards: CardRow[];
  setCards: Dispatch<SetStateAction<CardRow[]>>;
};

export function CardList({ deckId, cards, setCards }: Props) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    const front = newFront.trim();
    const back = newBack.trim();
    if (!front && !back) {
      toast.error("Add at least a question or answer");
      return;
    }
    const { data, error } = await supabase
      .from("cards")
      .insert({ deck_id: deckId, front, back })
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setCards((prev) => [...prev, data as CardRow]);
    setNewFront("");
    setNewBack("");
    toast.success("Card added");
  }

  async function updateCard(
    id: string,
    patch: Partial<Pick<CardRow, "front" | "back">>
  ) {
    const { error } = await supabase.from("cards").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
    toast.success("Card saved");
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from("cards").delete().eq("id", deleteId);
    if (error) {
      toast.error(error.message);
    } else {
      setCards((prev) => prev.filter((c) => c.id !== deleteId));
      toast.success("Card deleted");
    }
    setDeleteId(null);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={addCard}
        className="rounded-xl border bg-card p-4 shadow-sm"
      >
        <p className="mb-3 text-sm font-medium">Add card</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="sr-only" htmlFor="new-front">
              Question
            </label>
            <Input
              id="new-front"
              placeholder="Word / question"
              value={newFront}
              onChange={(e) => setNewFront(e.target.value)}
              className="min-h-11"
            />
          </div>
          <div>
            <label className="sr-only" htmlFor="new-back">
              Answer
            </label>
            <Input
              id="new-back"
              placeholder="Meaning / answer"
              value={newBack}
              onChange={(e) => setNewBack(e.target.value)}
              className="min-h-11"
            />
          </div>
        </div>
        <Button type="submit" className="mt-3 gap-2 min-h-11" size="sm">
          <Plus className="h-4 w-4" />
          Add card
        </Button>
      </form>

      {cards.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No cards yet. Add your first card above.
        </p>
      ) : (
        <ul className="space-y-3">
          {cards.map((card) => (
            <li
              key={card.id}
              className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Question
                  </p>
                  <Input
                    key={`${card.id}-f-${card.front}`}
                    defaultValue={card.front}
                    className="min-h-11"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== card.front) {
                        void updateCard(card.id, { front: v });
                      }
                    }}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Answer
                  </p>
                  <Input
                    key={`${card.id}-b-${card.back}`}
                    defaultValue={card.back}
                    className="min-h-11"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== card.back) {
                        void updateCard(card.id, { back: v });
                      }
                    }}
                  />
                </div>
                <div className="flex justify-end sm:pb-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="min-h-11 min-w-11 text-destructive hover:text-destructive"
                    aria-label="Delete card"
                    onClick={() => setDeleteId(card.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete card?</DialogTitle>
            <DialogDescription>
              This cannot be undone. The card will be removed from this deck.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
