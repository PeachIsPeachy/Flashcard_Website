export interface Deck {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  daily_goal: number;
  daily_batch_offset: number;
}

export interface CardRow {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  created_at: string;
}

/** Snapshot of cards marked incorrect in a study session (stored as JSON on the row). */
export interface MissedCardSnapshot {
  id: string;
  front: string;
  back: string;
}

export interface StudySession {
  id: string;
  deck_id: string;
  user_id: string;
  score: number;
  total: number;
  studied_at: string;
  missed_cards?: MissedCardSnapshot[] | null;
  scope?: "daily" | "full";
}

export interface DeckWithStats extends Deck {
  card_count: number;
  last_studied_at: string | null;
  study_streak: number;
}

export interface StudySessionWithTrend extends StudySession {
  trend: "up" | "down" | "same" | "first";
  prevRatio: number | null;
  ratio: number;
}

export interface LearningLog {
  id: string;
  user_id: string;
  deck_id: string;
  body: string;
  created_at: string;
}

export interface NotebookEntry {
  id: string;
  user_id: string;
  deck_id: string;
  card_id: string | null;
  front: string;
  back: string;
  note?: string;
  study_session_id: string | null;
  created_at: string;
}
