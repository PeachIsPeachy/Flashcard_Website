import { useEffect, useRef } from "react";
import { useDecks } from "@/hooks/useDecks";
import { useAuth } from "@/hooks/useAuth";
import { DeckGrid } from "@/components/dashboard/DeckGrid";
import { CreateDeckModal } from "@/components/dashboard/CreateDeckModal";
import { DashboardEmpty } from "@/components/dashboard/DashboardEmpty";
import { toast } from "sonner";

export function DashboardPage() {
  const { user } = useAuth();
  const { decks, loading, error, createDeck } = useDecks(user?.id);
  const lastError = useRef<string | null>(null);

  useEffect(() => {
    if (error && error !== lastError.current) {
      lastError.current = error;
      toast.error(error);
    }
    if (!error) lastError.current = null;
  }, [error]);

  async function handleCreate(name: string) {
    await createDeck(name);
  }

  const showEmpty = !loading && decks.length === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your decks</h1>
          <p className="mt-1 text-muted-foreground">
            Open a deck to manage cards, study, or view history.
          </p>
        </div>
        {!showEmpty && (
          <CreateDeckModal onCreate={handleCreate} />
        )}
      </div>

      {showEmpty ? (
        <DashboardEmpty onCreateDeck={handleCreate} />
      ) : (
        <DeckGrid decks={decks} loading={loading} />
      )}
    </div>
  );
}
