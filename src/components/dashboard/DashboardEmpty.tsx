import { BookOpen } from "lucide-react";
import { CreateDeckModal } from "@/components/dashboard/CreateDeckModal";

type Props = {
  onCreateDeck: (name: string) => Promise<void>;
};

export function DashboardEmpty({ onCreateDeck }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/50 px-6 py-16 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFF2D0] to-[#FFB2B2] text-primary">
        <BookOpen className="h-12 w-12" strokeWidth={1.25} />
      </div>
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
        No decks yet
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
        Create your first deck to start adding flashcards and tracking study
        streaks.
      </p>
      <div className="mt-8">
        <CreateDeckModal onCreate={onCreateDeck} />
      </div>
    </div>
  );
}
