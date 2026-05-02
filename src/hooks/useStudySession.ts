import { useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { MissedCardSnapshot } from "@/types";

export function useStudySession() {
  const saveSession = useCallback(
    async (params: {
      deckId: string;
      userId: string;
      score: number;
      total: number;
      missedCards: MissedCardSnapshot[];
      scope?: "daily" | "full";
    }) => {
      const { deckId, userId, score, total, missedCards, scope = "full" } =
        params;
      const base = {
        deck_id: deckId,
        user_id: userId,
        score,
        total,
        missed_cards: missedCards,
        studied_at: new Date().toISOString(),
      };
      let { data, error } = await supabase
        .from("study_sessions")
        .insert({ ...base, scope })
        .select("id")
        .single();
      const msg = error?.message ?? "";
      if (
        error &&
        (msg.includes("scope") || msg.toLowerCase().includes("schema cache"))
      ) {
        const retry = await supabase
          .from("study_sessions")
          .insert(base)
          .select("id")
          .single();
        data = retry.data;
        error = retry.error;
      }
      if (error) throw error;
      return data;
    },
    []
  );

  return { saveSession };
}
