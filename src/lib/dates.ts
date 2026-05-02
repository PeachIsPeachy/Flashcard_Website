export function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Consecutive local calendar days with ≥1 session; if no session today, streak can still count from yesterday. */
export function computeStudyStreak(sessionDates: Date[]): number {
  if (sessionDates.length === 0) return 0;
  const dayKeys = new Set(
    sessionDates.map((d) => startOfLocalDay(d).getTime())
  );
  const today = startOfLocalDay(new Date());
  let cursor = today;
  if (!dayKeys.has(cursor.getTime())) {
    cursor = addDays(today, -1);
  }
  if (!dayKeys.has(cursor.getTime())) return 0;
  let streak = 0;
  while (dayKeys.has(cursor.getTime())) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function formatShortDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
