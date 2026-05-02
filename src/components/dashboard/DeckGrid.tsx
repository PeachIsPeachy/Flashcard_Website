import type { DeckWithStats } from "@/types";
import { DeckTile } from "@/components/dashboard/DeckTile";
import { Skeleton } from "@/components/ui/skeleton";

export function DeckGrid({
  decks,
  loading,
}: {
  decks: DeckWithStats[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={i}
            className="aspect-square w-full rounded-xl"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {decks.map((deck) => (
        <DeckTile key={deck.id} deck={deck} />
      ))}
    </div>
  );
}
