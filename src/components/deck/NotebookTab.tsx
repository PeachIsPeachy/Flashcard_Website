import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { NotebookEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

type Props = {
  deckId: string;
  revalidateAt?: number;
};

export function NotebookTab({ deckId, revalidateAt = 0 }: Props) {
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    const { data, error } = await supabase
      .from("notebook_entries")
      .select("*")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: false });
    if (error) {
      if (
        error.message.includes("notebook_entries") ||
        error.code === "42P01"
      ) {
        toast.error("Run the database migration for the notebook (see supabase/migrations/003).");
      } else {
        toast.error(error.message);
      }
      setEntries([]);
      return;
    }
    setEntries((data ?? []) as NotebookEntry[]);
  }, [deckId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      await fetchEntries();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [deckId, fetchEntries]);

  useEffect(() => {
    if (revalidateAt < 1) return;
    void fetchEntries();
  }, [revalidateAt, fetchEntries]);

  async function handleDelete(id: string) {
    const { error } = await supabase.from("notebook_entries").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEntries((prev) => prev.filter((x) => x.id !== id));
    toast.success("Removed from notebook");
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">Notebook</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Saved from study: each entry includes the card and any note you added.
          Use the Journal tab for general deck notes.
        </p>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/80 py-10 text-center text-sm text-muted-foreground">
          Nothing saved yet. After a session, tap the note icon next to a missed
          question to add a note and save it here.
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li
              key={e.id}
              className="group rounded-lg border bg-card/50 p-4 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-2">
                  <p className="font-medium text-foreground">{e.front || "—"}</p>
                  <p className="text-muted-foreground">
                    <span className="text-muted-foreground/80">→ </span>
                    {e.back || "—"}
                  </p>
                  {(e.note ?? "").trim() ? (
                    <p className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm text-foreground/95">
                      <span className="mb-1 block text-xs font-medium text-muted-foreground">
                        Your note
                      </span>
                      <span className="whitespace-pre-wrap">{e.note}</span>
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 opacity-60 hover:opacity-100"
                  aria-label="Remove from notebook"
                  onClick={() => void handleDelete(e.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(e.created_at).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
