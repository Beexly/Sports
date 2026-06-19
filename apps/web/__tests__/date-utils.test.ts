/**
 * Tests for date-utils.ts
 *
 * All dates use fixed UTC strings to avoid timezone ambiguity.
 */
import { describe, it, expect } from 'vitest';
import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  addYears,
  subDays,
  subHours,
  subMonths,
  diffInDays,
  diffInHours,
  diffInMinutes,
  diffInWeeks,
  diffInMonths,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isToday,
  isYesterday,
  isTomorrow,
  isThisWeek,
  isThisMonth,
  isFuture,
  isPast,
  isSameDay,
  isSameMonth,
  isSameYear,
  isWeekend,
  isLeapYear,
  formatDate,
  formatRelative,
  formatGameTime,
  formatDuration,
  nflSeasonYear,
  nflSeasonStart,
  nflWeekFromDate,
  sportsSeasonDates,
  isInSeason,
  countdownTo,
  formatCountdown,
  dayOfWeekName,
  monthName,
  isoWeek,
  isoWeekYear,
  dateRange,
  isInRange,
  overlapDays,
  parseDate,
  parseFlexibleDate,
  age,
  ordinalSuffix,
  dayOrdinal,
  quarterOfYear,
} from '@/lib/utils/date-utils';

// -------------------------------------------------------------------------
// addDays
// -------------------------------------------------------------------------
describe('addDays', () => {
  it('adds positive days', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    expect(addDays(d, 5).toISOString()).toBe('2024-01-20T12:00:00.000Z');
  });

  it('adds negative days (subtracts)', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    expect(addDays(d, -3).toISOString()).toBe('2024-01-12T12:00:00.000Z');
  });

  it('crosses month boundary', () => {
    const d = new Date('2024-01-30T00:00:00Z');
    expect(addDays(d, 3).getUTCDate()).toBe(2);
    expect(addDays(d, 3).getUTCMonth()).toBe(1); // February
  });

  it('does not mutate original', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    addDays(d, 5);
    expect(d.toISOString()).toBe('2024-01-15T12:00:00.000Z');
  });
});

// -------------------------------------------------------------------------
// addHours / addMinutes
// -------------------------------------------------------------------------
describe('addHours', () => {
  it('adds hours', () => {
    const d = new Date('2024-01-15T10:00:00Z');
    expect(addHours(d, 3).getUTCHours()).toBe(13);
  });

  it('crosses day boundary', () => {
    const d = new Date('2024-01-15T22:00:00Z');
    const result = addHours(d, 3);
    expect(result.getUTCDate()).toBe(16);
    expect(result.getUTCHours()).toBe(1);
  });
});

describe('addMinutes', () => {
  it('adds minutes', () => {
    const d = new Date('2024-01-15T10:00:00Z');
    expect(addMinutes(d, 90).getUTCHours()).toBe(11);
    expect(addMinutes(d, 90).getUTCMinutes()).toBe(30);
  });
});

// -------------------------------------------------------------------------
// addMonths
// -------------------------------------------------------------------------
describe('addMonths', () => {
  it('adds one month normally', () => {
    const d = new Date('2024-03-15T00:00:00Z');
    const result = addMonths(d, 1);
    expect(result.getUTCMonth()).toBe(3); // April
    expect(result.getUTCDate()).toBe(15);
  });

  it('Jan 31 + 1 month = Feb 29 (2024 is leap)', () => {
    const d = new Date('2024-01-31T00:00:00Z');
    const result = addMonths(d, 1);
    expect(result.getUTCMonth()).toBe(1); // February
    expect(result.getUTCDate()).toBe(29); // leap year
  });

  it('Jan 31 + 1 month = Feb 28 (2023 non-leap)', () => {
    const d = new Date('2023-01-31T00:00:00Z');
    const result = addMonths(d, 1);
    expect(result.getUTCMonth()).toBe(1); // February
    expect(result.getUTCDate()).toBe(28);
  });

  it('Mar 31 - 1 month = Feb 29 (2024 leap)', () => {
    const d = new Date('2024-03-31T00:00:00Z');
    const result = addMonths(d, -1);
    expect(result.getUTCMonth()).toBe(1); // February
    expect(result.getUTCDate()).toBe(29);
  });

  it('adds multiple months crossing year boundary', () => {
    const d = new Date('2024-11-01T00:00:00Z');
    const result = addMonths(d, 3);
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(1); // February
  });
});

// -------------------------------------------------------------------------
// addYears / subDays / subHours / subMonths
// -------------------------------------------------------------------------
describe('addYears', () => {
  it('adds years', () => {
    const d = new Date('2024-01-15T00:00:00Z');
    expect(addYears(d, 2).getUTCFullYear()).toBe(2026);
  });
});

describe('subDays', () => {
  it('subtracts days', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    expect(subDays(d, 5).toISOString()).toBe('2024-01-10T12:00:00.000Z');
  });
});

describe('subHours', () => {
  it('subtracts hours', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    expect(subHours(d, 3).getUTCHours()).toBe(9);
  });
});

describe('subMonths', () => {
  it('subtracts months', () => {
    const d = new Date('2024-03-15T00:00:00Z');
    expect(subMonths(d, 1).getUTCMonth()).toBe(1); // February
  });
});

// -------------------------------------------------------------------------
// diffInDays
// -------------------------------------------------------------------------
describe('diffInDays', () => {
  it('positive diff when a > b', () => {
    const a = new Date('2024-01-20T00:00:00Z');
    const b = new Date('2024-01-15T00:00:00Z');
    expect(diffInDays(a, b)).toBe(5);
  });

  it('negative diff when a < b', () => {
    const a = new Date('2024-01-10T00:00:00Z');
    const b = new Date('2024-01-15T00:00:00Z');
    expect(diffInDays(a, b)).toBe(-5);
  });

  it('same day returns 0', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    expect(diffInDays(d, d)).toBe(0);
  });

  it('partial day uses floor', () => {
    const a = new Date('2024-01-16T06:00:00Z');
    const b = new Date('2024-01-15T00:00:00Z');
    expect(diffInDays(a, b)).toBe(1); // 30h → floor = 1
  });
});

// -------------------------------------------------------------------------
// diffInHours / diffInMinutes / diffInWeeks / diffInMonths
// -------------------------------------------------------------------------
describe('diffInHours', () => {
  it('calculates hours diff', () => {
    const a = new Date('2024-01-15T15:00:00Z');
    const b = new Date('2024-01-15T10:00:00Z');
    expect(diffInHours(a, b)).toBe(5);
  });
});

describe('diffInMinutes', () => {
  it('calculates minutes diff', () => {
    const a = new Date('2024-01-15T10:45:00Z');
    const b = new Date('2024-01-15T10:00:00Z');
    expect(diffInMinutes(a, b)).toBe(45);
  });
});

describe('diffInWeeks', () => {
  it('calculates weeks diff', () => {
    const a = new Date('2024-02-12T00:00:00Z');
    const b = new Date('2024-01-15T00:00:00Z');
    expect(diffInWeeks(a, b)).toBe(4);
  });
});

describe('diffInMonths', () => {
  it('approximates months diff (floor of days/30.4375)', () => {
    // Jan 15 → Apr 15 = 91 days; floor(91/30.4375) = 2
    const a = new Date('2024-04-15T00:00:00Z');
    const b = new Date('2024-01-15T00:00:00Z');
    expect(diffInMonths(a, b)).toBe(2);
  });

  it('approximates 6 months', () => {
    // Jan 15 → Jul 15 = 182 days; floor(182/30.4375) = 5 (close to 6)
    const a = new Date('2024-08-01T00:00:00Z');
    const b = new Date('2024-01-01T00:00:00Z');
    // 213 days; floor(213/30.4375) = 6
    expect(diffInMonths(a, b)).toBe(6);
  });
});

// -------------------------------------------------------------------------
// startOfDay / endOfDay
// -------------------------------------------------------------------------
describe('startOfDay', () => {
  it('sets UTC hours to 0', () => {
    const d = new Date('2024-01-15T15:30:45.123Z');
    const result = startOfDay(d);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });

  it('preserves the date', () => {
    const d = new Date('2024-01-15T15:30:45Z');
    expect(startOfDay(d).getUTCDate()).toBe(15);
    expect(startOfDay(d).getUTCMonth()).toBe(0);
    expect(startOfDay(d).getUTCFullYear()).toBe(2024);
  });
});

describe('endOfDay', () => {
  it('sets to 23:59:59.999 UTC', () => {
    const d = new Date('2024-01-15T08:00:00Z');
    const result = endOfDay(d);
    expect(result.getUTCHours()).toBe(23);
    expect(result.getUTCMinutes()).toBe(59);
    expect(result.getUTCSeconds()).toBe(59);
    expect(result.getUTCMilliseconds()).toBe(999);
  });
});

// -------------------------------------------------------------------------
// startOfWeek
// -------------------------------------------------------------------------
describe('startOfWeek', () => {
  // 2024-01-15 is a Monday
  it('Sunday start: returns prior Sunday', () => {
    const d = new Date('2024-01-15T12:00:00Z'); // Monday
    const result = startOfWeek(d, 0);
    expect(result.getUTCDay()).toBe(0); // Sunday
    expect(result.getUTCDate()).toBe(14); // Jan 14
  });

  it('Monday start: returns same Monday', () => {
    const d = new Date('2024-01-15T12:00:00Z'); // Monday
    const result = startOfWeek(d, 1);
    expect(result.getUTCDay()).toBe(1); // Monday
    expect(result.getUTCDate()).toBe(15);
  });

  it('Monday start: Wednesday returns prior Monday', () => {
    const d = new Date('2024-01-17T12:00:00Z'); // Wednesday
    const result = startOfWeek(d, 1);
    expect(result.getUTCDate()).toBe(15); // Monday Jan 15
  });

  it('sets time to midnight UTC', () => {
    const d = new Date('2024-01-15T15:30:00Z');
    const result = startOfWeek(d);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
  });
});

// -------------------------------------------------------------------------
// endOfWeek
// -------------------------------------------------------------------------
describe('endOfWeek', () => {
  it('Sunday start: ends on Saturday at 23:59:59.999', () => {
    const d = new Date('2024-01-15T12:00:00Z'); // Monday
    const result = endOfWeek(d, 0);
    expect(result.getUTCDay()).toBe(6); // Saturday
    expect(result.getUTCHours()).toBe(23);
    expect(result.getUTCMinutes()).toBe(59);
  });
});

// -------------------------------------------------------------------------
// startOfMonth / endOfMonth
// -------------------------------------------------------------------------
describe('startOfMonth', () => {
  it('returns the 1st of the month at midnight UTC', () => {
    const d = new Date('2024-01-15T15:00:00Z');
    const result = startOfMonth(d);
    expect(result.getUTCDate()).toBe(1);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMonth()).toBe(0);
  });
});

describe('endOfMonth', () => {
  it('returns last day of January', () => {
    const d = new Date('2024-01-15T00:00:00Z');
    const result = endOfMonth(d);
    expect(result.getUTCDate()).toBe(31);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCHours()).toBe(23);
  });

  it('returns last day of February (leap year)', () => {
    const d = new Date('2024-02-10T00:00:00Z');
    const result = endOfMonth(d);
    expect(result.getUTCDate()).toBe(29);
    expect(result.getUTCMonth()).toBe(1);
  });

  it('returns last day of February (non-leap)', () => {
    const d = new Date('2023-02-10T00:00:00Z');
    const result = endOfMonth(d);
    expect(result.getUTCDate()).toBe(28);
  });
});

// -------------------------------------------------------------------------
// startOfYear / endOfYear
// -------------------------------------------------------------------------
describe('startOfYear', () => {
  it('returns Jan 1 midnight UTC', () => {
    const d = new Date('2024-06-15T12:00:00Z');
    const result = startOfYear(d);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCDate()).toBe(1);
    expect(result.getUTCHours()).toBe(0);
  });
});

describe('endOfYear', () => {
  it('returns Dec 31 23:59:59.999 UTC', () => {
    const d = new Date('2024-06-15T12:00:00Z');
    const result = endOfYear(d);
    expect(result.getUTCMonth()).toBe(11);
    expect(result.getUTCDate()).toBe(31);
    expect(result.getUTCHours()).toBe(23);
    expect(result.getUTCMinutes()).toBe(59);
    expect(result.getUTCSeconds()).toBe(59);
    expect(result.getUTCMilliseconds()).toBe(999);
  });
});

// -------------------------------------------------------------------------
// isToday / isYesterday / isTomorrow
// -------------------------------------------------------------------------
describe('isToday', () => {
  it('returns true for same day', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-01-15T08:00:00Z');
    expect(isToday(d, ref)).toBe(true);
  });

  it('returns false for different day', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-01-16T08:00:00Z');
    expect(isToday(d, ref)).toBe(false);
  });
});

describe('isYesterday', () => {
  it('returns true for yesterday', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-01-14T12:00:00Z');
    expect(isYesterday(d, ref)).toBe(true);
  });

  it('returns false for today', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    expect(isYesterday(ref, ref)).toBe(false);
  });
});

describe('isTomorrow', () => {
  it('returns true for tomorrow', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-01-16T06:00:00Z');
    expect(isTomorrow(d, ref)).toBe(true);
  });

  it('returns false for today', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    expect(isTomorrow(ref, ref)).toBe(false);
  });
});

// -------------------------------------------------------------------------
// isThisWeek / isThisMonth
// -------------------------------------------------------------------------
describe('isThisWeek', () => {
  it('returns true for date in same week (Sunday start)', () => {
    const ref = new Date('2024-01-15T12:00:00Z'); // Monday
    const d = new Date('2024-01-17T12:00:00Z');   // Wednesday
    expect(isThisWeek(d, ref)).toBe(true);
  });

  it('returns false for date in different week', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-01-22T12:00:00Z');
    expect(isThisWeek(d, ref)).toBe(false);
  });
});

describe('isThisMonth', () => {
  it('returns true for same month', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-01-30T12:00:00Z');
    expect(isThisMonth(d, ref)).toBe(true);
  });

  it('returns false for different month', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-02-01T12:00:00Z');
    expect(isThisMonth(d, ref)).toBe(false);
  });
});

// -------------------------------------------------------------------------
// isFuture / isPast
// -------------------------------------------------------------------------
describe('isFuture', () => {
  it('returns true when date is after reference', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-01-16T00:00:00Z');
    expect(isFuture(d, ref)).toBe(true);
  });

  it('returns false when date is before reference', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-01-14T12:00:00Z');
    expect(isFuture(d, ref)).toBe(false);
  });

  it('returns false for same instant', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    expect(isFuture(d, d)).toBe(false);
  });
});

describe('isPast', () => {
  it('returns true when date is before reference', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-01-14T12:00:00Z');
    expect(isPast(d, ref)).toBe(true);
  });

  it('returns false when date is after reference', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-01-16T12:00:00Z');
    expect(isPast(d, ref)).toBe(false);
  });
});

// -------------------------------------------------------------------------
// isSameDay / isSameMonth / isSameYear
// -------------------------------------------------------------------------
describe('isSameDay', () => {
  it('returns true for same day different time', () => {
    const a = new Date('2024-01-15T08:00:00Z');
    const b = new Date('2024-01-15T23:00:00Z');
    expect(isSameDay(a, b)).toBe(true);
  });

  it('returns false for different days', () => {
    const a = new Date('2024-01-15T23:59:00Z');
    const b = new Date('2024-01-16T00:01:00Z');
    expect(isSameDay(a, b)).toBe(false);
  });
});

describe('isSameMonth', () => {
  it('returns true for same month', () => {
    const a = new Date('2024-01-01T00:00:00Z');
    const b = new Date('2024-01-31T00:00:00Z');
    expect(isSameMonth(a, b)).toBe(true);
  });

  it('returns false across year for same month number', () => {
    const a = new Date('2023-01-15T00:00:00Z');
    const b = new Date('2024-01-15T00:00:00Z');
    expect(isSameMonth(a, b)).toBe(false);
  });
});

describe('isSameYear', () => {
  it('returns true same year', () => {
    const a = new Date('2024-01-01T00:00:00Z');
    const b = new Date('2024-12-31T00:00:00Z');
    expect(isSameYear(a, b)).toBe(true);
  });

  it('returns false different year', () => {
    const a = new Date('2023-12-31T00:00:00Z');
    const b = new Date('2024-01-01T00:00:00Z');
    expect(isSameYear(a, b)).toBe(false);
  });
});

// -------------------------------------------------------------------------
// isWeekend
// -------------------------------------------------------------------------
describe('isWeekend', () => {
  it('Saturday is weekend', () => {
    const d = new Date('2024-01-13T12:00:00Z'); // Saturday
    expect(isWeekend(d)).toBe(true);
  });

  it('Sunday is weekend', () => {
    const d = new Date('2024-01-14T12:00:00Z'); // Sunday
    expect(isWeekend(d)).toBe(true);
  });

  it('Monday is not weekend', () => {
    const d = new Date('2024-01-15T12:00:00Z'); // Monday
    expect(isWeekend(d)).toBe(false);
  });

  it('Friday is not weekend', () => {
    const d = new Date('2024-01-19T12:00:00Z'); // Friday
    expect(isWeekend(d)).toBe(false);
  });
});

// -------------------------------------------------------------------------
// isLeapYear
// -------------------------------------------------------------------------
describe('isLeapYear', () => {
  it('2024 is a leap year', () => {
    expect(isLeapYear(2024)).toBe(true);
  });

  it('2023 is not a leap year', () => {
    expect(isLeapYear(2023)).toBe(false);
  });

  it('2100 is not a leap year (century rule)', () => {
    expect(isLeapYear(2100)).toBe(false);
  });

  it('2000 is a leap year (400 rule)', () => {
    expect(isLeapYear(2000)).toBe(true);
  });

  it('1900 is not a leap year', () => {
    expect(isLeapYear(1900)).toBe(false);
  });
});

// -------------------------------------------------------------------------
// formatDate
// -------------------------------------------------------------------------
describe('formatDate', () => {
  const d = new Date('2024-01-15T16:05:03Z');

  it('formats YYYY-MM-DD', () => {
    expect(formatDate(d, 'YYYY-MM-DD')).toBe('2024-01-15');
  });

  it('formats MMM D, YYYY', () => {
    expect(formatDate(d, 'MMM D, YYYY')).toBe('Jan 15, 2024');
  });

  it('formats HH:mm', () => {
    expect(formatDate(d, 'HH:mm')).toBe('16:05');
  });

  it('formats full month name MMMM', () => {
    expect(formatDate(d, 'MMMM D, YYYY')).toBe('January 15, 2024');
  });

  it('formats YY (2-digit year)', () => {
    expect(formatDate(d, 'YY')).toBe('24');
  });

  it('formats M (no padding)', () => {
    expect(formatDate(d, 'M/D/YYYY')).toBe('1/15/2024');
  });

  it('formats ddd (short day name)', () => {
    expect(formatDate(d, 'ddd')).toBe('Mon');
  });

  it('formats dddd (full day name)', () => {
    expect(formatDate(d, 'dddd')).toBe('Monday');
  });

  it('formats ss (seconds)', () => {
    expect(formatDate(d, 'ss')).toBe('03');
  });
});

// -------------------------------------------------------------------------
// formatRelative
// -------------------------------------------------------------------------
describe('formatRelative', () => {
  const ref = new Date('2024-01-15T12:00:00Z');

  it('"just now" for < 1 minute', () => {
    const d = new Date(ref.getTime() - 30 * 1000);
    expect(formatRelative(d, ref)).toBe('just now');
  });

  it('"X minutes ago"', () => {
    const d = new Date(ref.getTime() - 2 * 60 * 1000);
    expect(formatRelative(d, ref)).toBe('2 minutes ago');
  });

  it('"X hours ago"', () => {
    const d = new Date(ref.getTime() - 2 * 60 * 60 * 1000);
    expect(formatRelative(d, ref)).toBe('2 hours ago');
  });

  it('"yesterday"', () => {
    const d = new Date(ref.getTime() - 24 * 60 * 60 * 1000);
    expect(formatRelative(d, ref)).toBe('yesterday');
  });

  it('"X days ago"', () => {
    const d = new Date(ref.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelative(d, ref)).toBe('3 days ago');
  });

  it('"tomorrow"', () => {
    const d = new Date(ref.getTime() + 24 * 60 * 60 * 1000);
    expect(formatRelative(d, ref)).toBe('tomorrow');
  });

  it('"in X minutes"', () => {
    const d = new Date(ref.getTime() + 5 * 60 * 1000);
    expect(formatRelative(d, ref)).toBe('in 5 minutes');
  });

  it('"in X hours"', () => {
    const d = new Date(ref.getTime() + 3 * 60 * 60 * 1000);
    expect(formatRelative(d, ref)).toBe('in 3 hours');
  });

  it('"in X days"', () => {
    const d = new Date(ref.getTime() + 3 * 24 * 60 * 60 * 1000);
    expect(formatRelative(d, ref)).toBe('in 3 days');
  });
});

// -------------------------------------------------------------------------
// formatGameTime
// -------------------------------------------------------------------------
describe('formatGameTime', () => {
  it('formats Sunday afternoon game', () => {
    // 2024-01-14 (Sunday) at 16:25 UTC
    const d = new Date('2024-01-14T16:25:00Z');
    const result = formatGameTime(d);
    expect(result).toBe('Sun, Jan 14 · 4:25 PM');
  });

  it('formats midnight edge case', () => {
    const d = new Date('2024-01-15T00:00:00Z'); // Monday midnight
    const result = formatGameTime(d);
    expect(result).toContain('Mon');
    expect(result).toContain('12:00 AM');
  });

  it('formats noon correctly', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    const result = formatGameTime(d);
    expect(result).toContain('12:00 PM');
  });
});

// -------------------------------------------------------------------------
// formatDuration
// -------------------------------------------------------------------------
describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(2 * 60 * 60 * 1000 + 35 * 60 * 1000)).toBe('2h 35m');
  });

  it('formats minutes only', () => {
    expect(formatDuration(45 * 60 * 1000)).toBe('45m');
  });

  it('formats seconds only', () => {
    expect(formatDuration(30 * 1000)).toBe('30s');
  });

  it('formats days and hours', () => {
    expect(formatDuration(24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000)).toBe('1d 3h');
  });

  it('returns 0s for 0ms', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  it('returns 0s for negative', () => {
    expect(formatDuration(-1000)).toBe('0s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(61 * 1000)).toBe('1m 1s');
  });
});

// -------------------------------------------------------------------------
// nflSeasonYear
// -------------------------------------------------------------------------
describe('nflSeasonYear', () => {
  it('January 2024 → 2023 season', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    expect(nflSeasonYear(d)).toBe(2023);
  });

  it('September 2024 → 2024 season', () => {
    const d = new Date('2024-09-15T12:00:00Z');
    expect(nflSeasonYear(d)).toBe(2024);
  });

  it('July 2024 → 2023 season', () => {
    const d = new Date('2024-07-15T12:00:00Z');
    expect(nflSeasonYear(d)).toBe(2023);
  });

  it('August 2024 → 2024 season', () => {
    const d = new Date('2024-08-15T12:00:00Z');
    expect(nflSeasonYear(d)).toBe(2024);
  });
});

// -------------------------------------------------------------------------
// nflSeasonStart
// -------------------------------------------------------------------------
describe('nflSeasonStart', () => {
  it('2024 season starts on first Thursday of September 2024', () => {
    // Sep 1 2024 is a Sunday (day 0); first Thursday = Sep 5
    const result = nflSeasonStart(2024);
    expect(result.getUTCMonth()).toBe(8); // September
    expect(result.getUTCFullYear()).toBe(2024);
    expect(result.getUTCDay()).toBe(4); // Thursday
  });

  it('returns noon UTC', () => {
    const result = nflSeasonStart(2024);
    expect(result.getUTCHours()).toBe(12);
  });

  it('2023 season starts on a Thursday in September', () => {
    const result = nflSeasonStart(2023);
    expect(result.getUTCDay()).toBe(4);
    expect(result.getUTCMonth()).toBe(8);
    expect(result.getUTCFullYear()).toBe(2023);
  });
});

// -------------------------------------------------------------------------
// nflWeekFromDate
// -------------------------------------------------------------------------
describe('nflWeekFromDate', () => {
  it('returns 0 before season starts', () => {
    const seasonStart = new Date('2024-09-05T12:00:00Z');
    const beforeSeason = new Date('2024-08-01T12:00:00Z');
    expect(nflWeekFromDate(beforeSeason, seasonStart)).toBe(0);
  });

  it('returns week 1 on season start day', () => {
    const seasonStart = new Date('2024-09-05T12:00:00Z');
    expect(nflWeekFromDate(seasonStart, seasonStart)).toBe(1);
  });

  it('returns week 2 after 7 days', () => {
    const seasonStart = new Date('2024-09-05T12:00:00Z');
    const week2 = addDays(seasonStart, 7);
    expect(nflWeekFromDate(week2, seasonStart)).toBe(2);
  });
});

// -------------------------------------------------------------------------
// sportsSeasonDates
// -------------------------------------------------------------------------
describe('sportsSeasonDates', () => {
  it('NFL 2024: starts September', () => {
    const dates = sportsSeasonDates('NFL', 2024);
    expect(dates.start.getUTCMonth()).toBe(8); // September
    expect(dates.start.getUTCFullYear()).toBe(2024);
  });

  it('NFL 2024: end is in January 2025', () => {
    const dates = sportsSeasonDates('NFL', 2024);
    expect(dates.end.getUTCFullYear()).toBe(2025);
    expect(dates.end.getUTCMonth()).toBe(0); // January
  });

  it('NBA 2024: starts October', () => {
    const dates = sportsSeasonDates('NBA', 2024);
    expect(dates.start.getUTCMonth()).toBe(9); // October
  });

  it('MLB 2024: starts April', () => {
    const dates = sportsSeasonDates('MLB', 2024);
    expect(dates.start.getUTCMonth()).toBe(3); // April
  });

  it('NHL 2024: starts October', () => {
    const dates = sportsSeasonDates('NHL', 2024);
    expect(dates.start.getUTCMonth()).toBe(9); // October
  });

  it('NCAAF 2024: starts September', () => {
    const dates = sportsSeasonDates('NCAAF', 2024);
    expect(dates.start.getUTCMonth()).toBe(8); // September
  });

  it('NCAAB 2024: starts November', () => {
    const dates = sportsSeasonDates('NCAAB', 2024);
    expect(dates.start.getUTCMonth()).toBe(10); // November
  });

  it('all returned dates are at noon UTC', () => {
    const dates = sportsSeasonDates('NFL', 2024);
    expect(dates.start.getUTCHours()).toBe(12);
    expect(dates.end.getUTCHours()).toBe(12);
    expect(dates.playoffs.getUTCHours()).toBe(12);
    expect(dates.offseason.getUTCHours()).toBe(12);
  });
});

// -------------------------------------------------------------------------
// isInSeason
// -------------------------------------------------------------------------
describe('isInSeason', () => {
  it('November 2024 is NFL season', () => {
    const d = new Date('2024-11-10T12:00:00Z');
    expect(isInSeason(d, 'NFL')).toBe(true);
  });

  it('June 2024 is not NFL season', () => {
    const d = new Date('2024-06-01T12:00:00Z');
    expect(isInSeason(d, 'NFL')).toBe(false);
  });

  it('returns false for unknown sport', () => {
    const d = new Date('2024-06-01T12:00:00Z');
    expect(isInSeason(d, 'SOCCER')).toBe(false);
  });
});

// -------------------------------------------------------------------------
// countdownTo
// -------------------------------------------------------------------------
describe('countdownTo', () => {
  it('returns correct days/hours/minutes/seconds', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const target = new Date('2024-01-18T15:30:45Z'); // 3d 3h 30m 45s away
    const result = countdownTo(target, ref);
    expect(result.days).toBe(3);
    expect(result.hours).toBe(3);
    expect(result.minutes).toBe(30);
    expect(result.seconds).toBe(45);
  });

  it('returns all zeros if target is in the past', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const target = new Date('2024-01-14T12:00:00Z');
    const result = countdownTo(target, ref);
    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.seconds).toBe(0);
    expect(result.total).toBe(0);
  });

  it('total reflects milliseconds remaining', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const target = new Date('2024-01-15T13:00:00Z');
    const result = countdownTo(target, ref);
    expect(result.total).toBe(60 * 60 * 1000);
  });
});

// -------------------------------------------------------------------------
// formatCountdown
// -------------------------------------------------------------------------
describe('formatCountdown', () => {
  it('formats days, hours, minutes, seconds', () => {
    const ref = new Date('2024-01-15T00:00:00Z');
    const target = new Date('2024-01-18T03:22:05Z');
    const result = formatCountdown(target, ref);
    expect(result).toBe('3d 3h 22m 5s');
  });

  it('omits days/hours when zero but always shows m and s', () => {
    const ref = new Date('2024-01-15T00:00:00Z');
    const target = new Date('2024-01-15T00:45:30Z');
    const result = formatCountdown(target, ref);
    expect(result).toBe('45m 30s');
  });

  it('returns 0m 0s for past target', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const target = new Date('2024-01-14T12:00:00Z');
    expect(formatCountdown(target, ref)).toBe('0m 0s');
  });
});

// -------------------------------------------------------------------------
// dateRange
// -------------------------------------------------------------------------
describe('dateRange', () => {
  it('returns correct count for day step', () => {
    const start = new Date('2024-01-15T00:00:00Z');
    const end = new Date('2024-01-20T00:00:00Z');
    const result = dateRange(start, end);
    expect(result.length).toBe(6); // 15, 16, 17, 18, 19, 20
  });

  it('includes start and end', () => {
    const start = new Date('2024-01-15T00:00:00Z');
    const end = new Date('2024-01-17T00:00:00Z');
    const result = dateRange(start, end);
    expect(result[0].getUTCDate()).toBe(15);
    expect(result[result.length - 1].getUTCDate()).toBe(17);
  });

  it('returns single date when start equals end', () => {
    const start = new Date('2024-01-15T00:00:00Z');
    const result = dateRange(start, start);
    expect(result.length).toBe(1);
  });

  it('returns week-step array', () => {
    const start = new Date('2024-01-01T00:00:00Z');
    const end = new Date('2024-01-29T00:00:00Z');
    const result = dateRange(start, end, 'week');
    expect(result.length).toBe(5); // Jan 1, 8, 15, 22, 29
  });
});

// -------------------------------------------------------------------------
// isInRange
// -------------------------------------------------------------------------
describe('isInRange', () => {
  it('returns true for date within range', () => {
    const start = new Date('2024-01-10T00:00:00Z');
    const end = new Date('2024-01-20T00:00:00Z');
    const d = new Date('2024-01-15T00:00:00Z');
    expect(isInRange(d, start, end)).toBe(true);
  });

  it('returns true for date on boundary', () => {
    const start = new Date('2024-01-10T00:00:00Z');
    const end = new Date('2024-01-20T00:00:00Z');
    expect(isInRange(start, start, end)).toBe(true);
    expect(isInRange(end, start, end)).toBe(true);
  });

  it('returns false for date outside range', () => {
    const start = new Date('2024-01-10T00:00:00Z');
    const end = new Date('2024-01-20T00:00:00Z');
    const d = new Date('2024-01-25T00:00:00Z');
    expect(isInRange(d, start, end)).toBe(false);
  });
});

// -------------------------------------------------------------------------
// overlapDays
// -------------------------------------------------------------------------
describe('overlapDays', () => {
  it('returns 0 for non-overlapping ranges', () => {
    const a = { start: new Date('2024-01-01T00:00:00Z'), end: new Date('2024-01-10T00:00:00Z') };
    const b = { start: new Date('2024-01-15T00:00:00Z'), end: new Date('2024-01-25T00:00:00Z') };
    expect(overlapDays(a, b)).toBe(0);
  });

  it('calculates overlapping days', () => {
    const a = { start: new Date('2024-01-01T00:00:00Z'), end: new Date('2024-01-20T00:00:00Z') };
    const b = { start: new Date('2024-01-10T00:00:00Z'), end: new Date('2024-01-30T00:00:00Z') };
    expect(overlapDays(a, b)).toBe(10);
  });

  it('returns 0 for adjacent ranges', () => {
    const a = { start: new Date('2024-01-01T00:00:00Z'), end: new Date('2024-01-10T00:00:00Z') };
    const b = { start: new Date('2024-01-10T00:00:00Z'), end: new Date('2024-01-20T00:00:00Z') };
    expect(overlapDays(a, b)).toBe(0);
  });
});

// -------------------------------------------------------------------------
// parseDate
// -------------------------------------------------------------------------
describe('parseDate', () => {
  it('parses YYYY-MM-DD', () => {
    const result = parseDate('2024-01-15');
    expect(result).not.toBeNull();
    expect(result!.getUTCFullYear()).toBe(2024);
    expect(result!.getUTCMonth()).toBe(0);
    expect(result!.getUTCDate()).toBe(15);
  });

  it('parses ISO with time and Z', () => {
    const result = parseDate('2024-01-15T12:00:00Z');
    expect(result).not.toBeNull();
    expect(result!.getUTCHours()).toBe(12);
  });

  it('parses ISO with time no Z', () => {
    const result = parseDate('2024-01-15T12:00:00');
    expect(result).not.toBeNull();
    expect(result!.getUTCHours()).toBe(12);
  });

  it('returns null for invalid date', () => {
    expect(parseDate('not-a-date')).toBeNull();
  });

  it('returns null for M/D/YYYY (not ISO)', () => {
    expect(parseDate('1/15/2024')).toBeNull();
  });
});

// -------------------------------------------------------------------------
// parseFlexibleDate
// -------------------------------------------------------------------------
describe('parseFlexibleDate', () => {
  it('parses M/D/YYYY', () => {
    const result = parseFlexibleDate('1/15/2024');
    expect(result).not.toBeNull();
    expect(result!.getUTCMonth()).toBe(0);
    expect(result!.getUTCDate()).toBe(15);
  });

  it('parses M/D/YY', () => {
    const result = parseFlexibleDate('3/5/24');
    expect(result).not.toBeNull();
    expect(result!.getUTCFullYear()).toBe(2024);
  });

  it('parses "Month D, YYYY"', () => {
    const result = parseFlexibleDate('January 15, 2024');
    expect(result).not.toBeNull();
    expect(result!.getUTCMonth()).toBe(0);
    expect(result!.getUTCDate()).toBe(15);
  });

  it('parses ISO date', () => {
    const result = parseFlexibleDate('2024-01-15');
    expect(result).not.toBeNull();
  });

  it('returns null for unparseable', () => {
    expect(parseFlexibleDate('foobar')).toBeNull();
  });
});

// -------------------------------------------------------------------------
// ordinalSuffix
// -------------------------------------------------------------------------
describe('ordinalSuffix', () => {
  it('1 → 1st', () => expect(ordinalSuffix(1)).toBe('1st'));
  it('2 → 2nd', () => expect(ordinalSuffix(2)).toBe('2nd'));
  it('3 → 3rd', () => expect(ordinalSuffix(3)).toBe('3rd'));
  it('4 → 4th', () => expect(ordinalSuffix(4)).toBe('4th'));
  it('11 → 11th', () => expect(ordinalSuffix(11)).toBe('11th'));
  it('12 → 12th', () => expect(ordinalSuffix(12)).toBe('12th'));
  it('13 → 13th', () => expect(ordinalSuffix(13)).toBe('13th'));
  it('21 → 21st', () => expect(ordinalSuffix(21)).toBe('21st'));
  it('22 → 22nd', () => expect(ordinalSuffix(22)).toBe('22nd'));
  it('31 → 31st', () => expect(ordinalSuffix(31)).toBe('31st'));
});

// -------------------------------------------------------------------------
// age
// -------------------------------------------------------------------------
describe('age', () => {
  it('calculates completed years', () => {
    const birth = new Date('1994-01-15T00:00:00Z');
    const ref = new Date('2024-01-15T00:00:00Z');
    expect(age(birth, ref)).toBe(30);
  });

  it('does not count birthday not yet reached in the year', () => {
    const birth = new Date('1994-02-15T00:00:00Z');
    const ref = new Date('2024-01-15T00:00:00Z');
    expect(age(birth, ref)).toBe(29);
  });

  it('counts birthday on exact day', () => {
    const birth = new Date('2000-06-15T00:00:00Z');
    const ref = new Date('2024-06-15T00:00:00Z');
    expect(age(birth, ref)).toBe(24);
  });
});

// -------------------------------------------------------------------------
// isoWeek
// -------------------------------------------------------------------------
describe('isoWeek', () => {
  it('Jan 1, 2024 is ISO week 1', () => {
    const d = new Date('2024-01-01T00:00:00Z');
    expect(isoWeek(d)).toBe(1);
  });

  it('Dec 31, 2020 is ISO week 53', () => {
    // Dec 31 2020 is a Thursday, last week of 2020
    const d = new Date('2020-12-31T00:00:00Z');
    expect(isoWeek(d)).toBe(53);
  });

  it('Jan 1, 2023 is ISO week 52 (of 2022)', () => {
    // Jan 1 2023 is a Sunday; ISO week 52 of 2022
    const d = new Date('2023-01-01T00:00:00Z');
    expect(isoWeek(d)).toBe(52);
  });
});

// -------------------------------------------------------------------------
// isoWeekYear
// -------------------------------------------------------------------------
describe('isoWeekYear', () => {
  it('Jan 1 2023 belongs to ISO year 2022', () => {
    const d = new Date('2023-01-01T00:00:00Z');
    expect(isoWeekYear(d)).toBe(2022);
  });

  it('Jan 2 2023 belongs to ISO year 2023', () => {
    const d = new Date('2023-01-02T00:00:00Z');
    expect(isoWeekYear(d)).toBe(2023);
  });
});

// -------------------------------------------------------------------------
// dayOfWeekName / monthName
// -------------------------------------------------------------------------
describe('dayOfWeekName', () => {
  it('short format', () => {
    const d = new Date('2024-01-15T00:00:00Z'); // Monday
    expect(dayOfWeekName(d, 'short')).toBe('Mon');
  });

  it('long format', () => {
    const d = new Date('2024-01-15T00:00:00Z'); // Monday
    expect(dayOfWeekName(d, 'long')).toBe('Monday');
  });
});

describe('monthName', () => {
  it('short format', () => {
    const d = new Date('2024-01-15T00:00:00Z');
    expect(monthName(d, 'short')).toBe('Jan');
  });

  it('long format', () => {
    const d = new Date('2024-06-15T00:00:00Z');
    expect(monthName(d, 'long')).toBe('June');
  });
});

// -------------------------------------------------------------------------
// dayOrdinal
// -------------------------------------------------------------------------
describe('dayOrdinal', () => {
  it('formats date with ordinal', () => {
    const d = new Date('2024-01-15T00:00:00Z');
    expect(dayOrdinal(d)).toBe('January 15th, 2024');
  });

  it('handles 1st', () => {
    const d = new Date('2024-03-01T00:00:00Z');
    expect(dayOrdinal(d)).toBe('March 1st, 2024');
  });
});

// -------------------------------------------------------------------------
// quarterOfYear
// -------------------------------------------------------------------------
describe('quarterOfYear', () => {
  it('January is Q1', () => {
    expect(quarterOfYear(new Date('2024-01-15T00:00:00Z'))).toBe(1);
  });

  it('April is Q2', () => {
    expect(quarterOfYear(new Date('2024-04-15T00:00:00Z'))).toBe(2);
  });

  it('July is Q3', () => {
    expect(quarterOfYear(new Date('2024-07-15T00:00:00Z'))).toBe(3);
  });

  it('October is Q4', () => {
    expect(quarterOfYear(new Date('2024-10-15T00:00:00Z'))).toBe(4);
  });

  it('March is still Q1', () => {
    expect(quarterOfYear(new Date('2024-03-31T00:00:00Z'))).toBe(1);
  });
});
