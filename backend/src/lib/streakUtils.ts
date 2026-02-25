/**
 * Calculates consecutive check-in day streak.
 * @param dates - ISO date strings (YYYY-MM-DD), sorted descending
 */
export function calculateCheckinStreak(dates: string[]): number {
  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  let checkDate = today;
  for (const d of dates) {
    if (d === checkDate) {
      streak++;
      const dt = new Date(checkDate);
      dt.setDate(dt.getDate() - 1);
      checkDate = dt.toISOString().slice(0, 10);
    } else break;
  }
  return streak;
}
