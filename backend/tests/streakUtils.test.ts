import { describe, it, expect } from '@jest/globals';
import { calculateCheckinStreak } from '../src/lib/streakUtils.js';

// Compute date strings relative to "today" at run-time so tests are always
// deterministic without needing to mock Date.
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const TODAY = daysAgo(0);
const YESTERDAY = daysAgo(1);
const TWO_DAYS_AGO = daysAgo(2);
const THREE_DAYS_AGO = daysAgo(3);
const TEN_DAYS_AGO = daysAgo(10);

describe('calculateCheckinStreak', () => {

  // ── empty / no check-ins ────────────────────────────────────────────────────

  it('returns 0 for an empty array', () => {
    expect(calculateCheckinStreak([])).toBe(0);
  });

  // ── no check-in today ──────────────────────────────────────────────────────

  it('returns 0 when the most recent date is yesterday (streak broken today)', () => {
    expect(calculateCheckinStreak([YESTERDAY])).toBe(0);
  });

  it('returns 0 when the only date is two days ago', () => {
    expect(calculateCheckinStreak([TWO_DAYS_AGO])).toBe(0);
  });

  it('returns 0 for a long run that does not include today', () => {
    const dates = [YESTERDAY, TWO_DAYS_AGO, THREE_DAYS_AGO];
    expect(calculateCheckinStreak(dates)).toBe(0);
  });

  // ── streak of 1 ────────────────────────────────────────────────────────────

  it('returns 1 when only today is checked in', () => {
    expect(calculateCheckinStreak([TODAY])).toBe(1);
  });

  // ── streak of 2 ────────────────────────────────────────────────────────────

  it('returns 2 for today and yesterday', () => {
    expect(calculateCheckinStreak([TODAY, YESTERDAY])).toBe(2);
  });

  // ── streak of 3 ────────────────────────────────────────────────────────────

  it('returns 3 for today, yesterday, and two days ago', () => {
    expect(calculateCheckinStreak([TODAY, YESTERDAY, TWO_DAYS_AGO])).toBe(3);
  });

  // ── streak stops at gap ────────────────────────────────────────────────────

  it('returns 1 when today is present but yesterday is missing (gap after today)', () => {
    expect(calculateCheckinStreak([TODAY, TWO_DAYS_AGO])).toBe(1);
  });

  it('returns 2 when today+yesterday are consecutive but two days ago is skipped', () => {
    expect(calculateCheckinStreak([TODAY, YESTERDAY, THREE_DAYS_AGO])).toBe(2);
  });

  it('ignores entries after the first gap', () => {
    // The streak is 2 (today + yesterday); two-days-ago is missing so the
    // loop breaks; three-days-ago is never counted.
    const dates = [TODAY, YESTERDAY, THREE_DAYS_AGO, daysAgo(4)];
    expect(calculateCheckinStreak(dates)).toBe(2);
  });

  // ── long streak ───────────────────────────────────────────────────────────

  it('counts a 7-day consecutive streak', () => {
    const dates = [0, 1, 2, 3, 4, 5, 6].map(daysAgo);
    expect(calculateCheckinStreak(dates)).toBe(7);
  });

  it('counts a 10-day consecutive streak', () => {
    const dates = Array.from({ length: 10 }, (_, i) => daysAgo(i));
    expect(calculateCheckinStreak(dates)).toBe(10);
  });

  // ── duplicates ────────────────────────────────────────────────────────────

  it('stops counting at the first duplicate (duplicate treated as wrong date)', () => {
    // After today matches, checkDate advances to yesterday.
    // The second "today" entry doesn't equal yesterday → streak breaks at 1.
    const dates = [TODAY, TODAY, YESTERDAY];
    expect(calculateCheckinStreak(dates)).toBe(1);
  });

  it('handles duplicate yesterday entries mid-streak', () => {
    // today matches (streak=1, next expected=yesterday)
    // first YESTERDAY matches (streak=2, next expected=two-days-ago)
    // second YESTERDAY ≠ two-days-ago → break
    const dates = [TODAY, YESTERDAY, YESTERDAY, TWO_DAYS_AGO];
    expect(calculateCheckinStreak(dates)).toBe(2);
  });

  // ── single old date ───────────────────────────────────────────────────────

  it('returns 0 for a single far-past date', () => {
    expect(calculateCheckinStreak([TEN_DAYS_AGO])).toBe(0);
  });

  // ── date string format ────────────────────────────────────────────────────

  it('works correctly with YYYY-MM-DD formatted strings', () => {
    // Verify the expected format is handled (the function slices ISO to 10 chars)
    expect(TODAY).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(calculateCheckinStreak([TODAY])).toBe(1);
  });
});
