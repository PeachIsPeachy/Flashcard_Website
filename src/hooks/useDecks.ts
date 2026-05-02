import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { computeStudyStreak } from "@/lib/dates";
import type { DeckWithStats } from "@/types";

type DeckRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  daily_goal: number | null;
  daily_batch_offset: number | null;
  cards: { count: number }[] | null;
};

type SessionRow = { deck_id: string; studied_at: string };

export function useDecks(userId: string | undefined) {
  const [decks, setDecks] = useState<DeckWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDecks = useCallback(async () => {
    if (!userId) {
      setDecks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [decksRes, sessionsRes] = await Promise.all([
      supabase
        .from("decks")
        .select("*, cards(count)")
        .order("created_at", { ascending: false }),
      supabase.from("study_sessions").select("deck_id, studied_at"),
    ]);

    if (decksRes.error) {
      setError(decksRes.error.message);
      setDecks([]);
      setLoading(false);
      return;
    }
    if (sessionsRes.error) {
      setError(sessionsRes.error.message);
      setDecks([]);
      setLoading(false);
      return;
    }

    const sessionsByDeck = new Map<string, Date[]>();
    for (const row of (sessionsRes.data ?? []) as SessionRow[]) {
      const list = sessionsByDeck.get(row.deck_id) ?? [];
      list.push(new Date(row.studied_at));
      sessionsByDeck.set(row.deck_id, list);
    }

    const enriched: DeckWithStats[] = ((decksRes.data ?? []) as DeckRow[]).map(
      (d) => {
        const cardCount = Number(d.cards?.[0]?.count ?? 0);
        const dates = sessionsByDeck.get(d.id) ?? [];
        const lastStudied =
          dates.length > 0
            ? new Date(
                Math.max(...dates.map((x) => x.getTime()))
              ).toISOString()
            : null;
        return {
          id: d.id,
          user_id: d.user_id,
          name: d.name,
          created_at: d.created_at,
          daily_goal: d.daily_goal ?? 5,
          daily_batch_offset: d.daily_batch_offset ?? 0,
          card_count: cardCount,
          last_studied_at: lastStudied,
          study_streak: computeStudyStreak(dates),
        };
      }
    );

    setDecks(enriched);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchDecks();
  }, [fetchDecks]);

  const createDeck = useCallback(
    async (name: string) => {
      if (!userId) throw new Error("Not signed in");
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Name required");
      const { data, error: insertError } = await supabase
        .from("decks")
        .insert({ name: trimmed, user_id: userId })
        .select("*")
        .single();
      if (insertError) throw insertError;
      await fetchDecks();
      return data;
    },
    [userId, fetchDecks]
  );

  return useMemo(
    () => ({
      decks,
      loading,
      error,
      refetch: fetchDecks,
      createDeck,
    }),
    [decks, loading, error, fetchDecks, createDeck]
  );
}
