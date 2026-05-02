import { Link } from "react-router-dom";
import { Flame, Layers } from "lucide-react";
import type { DeckWithStats } from "@/types";
import { formatShortDate } from "@/lib/dates";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function DeckTile({ deck }: { deck: DeckWithStats }) {
  return (
    <Link
      to={`/deck/${deck.id}`}
      state={{
        deckPreview: {
          id: deck.id,
          name: deck.name,
          card_count: deck.card_count,
        },
      }}
      className="group block touch-manipulation"
    >
      <Card
        className={cn(
          "aspect-square h-full overflow-hidden border-border/80 transition-all duration-300",
          "hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
        )}
      >
        <CardContent className="flex h-full flex-col p-5 sm:p-6">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              <Layers className="h-5 w-5" />
            </div>
            {deck.study_streak > 0 && (
              <Badge
                variant="secondary"
                className="gap-1 border-[#E36A6A]/25 bg-[#FFB2B2]/35 text-[#FFD9D9]"
              >
                <Flame className="h-3 w-3" />
                {deck.study_streak}d
              </Badge>
            )}
          </div>
          <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-foreground">
            {deck.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {deck.card_count} card{deck.card_count === 1 ? "" : "s"}
          </p>
          <div className="mt-auto pt-4">
            <p className="text-xs text-muted-foreground">
              Last studied{" "}
              <span className="font-medium text-foreground">
                {formatShortDate(deck.last_studied_at)}
              </span>
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FFB2B2] to-[#E36A6A] transition-all duration-500"
                style={{
                  width: `${Math.min(100, deck.card_count > 0 ? 35 + deck.study_streak * 8 : 12)}%`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
