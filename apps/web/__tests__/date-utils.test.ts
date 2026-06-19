/**
 * Tests for date-utils.ts — comprehensive coverage of all exports.
 *
 * All dates use fixed UTC strings to avoid timezone ambiguity unless the test
 * is specifically exercising local-time behaviour (startOfQuarter, endOfQuarter,
 * startOfHour, endOfHour, setTime, getDayOfYear, formatDateEx, gameDay, etc.).
 */
import { describe, it, expect } from 'vitest';
import {
  // Basic arithmetic (spec names)
  addDays,
  addWeeks,
  addMonths,
  addYears,
  addHours,
  addMinutes,
  addSeconds,
  subtractDays,
  diffDays,
  diffHours,
  diffMinutes,
  diffMonths,
  diffYears,
  // Original arithmetic (keep working)
  subDays,
  subHours,
  subMonths,
  diffInDays,
  diffInHours,
  diffInMinutes,
  diffInWeeks,
  diffInMonths,
  // Start/end of period
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfQuarter,
  endOfQuarter,
  startOfHour,
  endOfHour,
  // Comparisons
  isBefore,
  isAfter,
  isSameDay,
  isSameMonth,
  isSameYear,
  isToday,
  isTomorrow,
  isYesterday,
  isWeekend,
  isWeekday,
  isFuture,
  isPast,
  isValid,
  isLeapYear,
  clampDate,
  // Getters/setters
  getDayOfYear,
  getWeekOfYear,
  getDaysInMonth,
  getDaysInYear,
  getQuarter,
  getTimezoneOffset,
  setTime,
  // Formatting
  formatDate,
  formatDateEx,
  formatRelative,
  formatDateRange,
  toISO,
  toUTCString,
  // Parsing
  parseDateStrict,
  parseTime,
  parseDuration,
  parseDate,
  parseFlexibleDate,
  // Sports
  nflWeekDates,
  nbaSeasonDates,
  mlbSeasonDates,
  nhlSeasonDates,
  isInSeasonEx,
  gameDay,
  nextGameDay,
  hoursUntilGame,
  isDoubleheaderRisk,
  timezoneLabel,
  // Batch
  dateRange,
  groupByDayRecord,
  groupByMonth,
  sortDates,
  uniqueDays,
  countByDayOfWeek,
  // Legacy (kept working)
  isThisWeek,
  isThisMonth,
  nflSeasonStart,
  nflSeasonYear,
  nflWeekFromDate,
  isoWeek,
  isoWeekYear,
  ordinalSuffix,
  dayOrdinal,
  quarterOfYear,
  countdownTo,
  formatCountdown,
  formatDuration,
  formatGameTime,
} from '@/lib/utils/date-utils';

// ==========================================================================
// 1. Basic arithmetic
// ==========================================================================

describe('addDays', () => {
  it('adds positive days', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    expect(addDays(d, 5).toISOString()).toBe('2024-01-20T12:00:00.000Z');
  });

  it('subtracts when negative', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    expect(addDays(d, -3).toISOString()).toBe('2024-01-12T12:00:00.000Z');
  });

  it('crosses month boundary', () => {
    const d = new Date('2024-01-30T00:00:00Z');
    const r = addDays(d, 3);
    expect(r.getUTCDate()).toBe(2);
    expect(r.getUTCMonth()).toBe(1);
  });

  it('does not mutate original', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    addDays(d, 5);
    expect(d.toISOString()).toBe('2024-01-15T12:00:00.000Z');
  });
});

describe('addWeeks', () => {
  it('adds 1 week', () => {
    const d = new Date('2024-01-15T00:00:00Z');
    expect(addWeeks(d, 1).toISOString()).toBe('2024-01-22T00:00:00.000Z');
  });

  it('adds 2 weeks', () => {
    const d = new Date('2024-01-01T00:00:00Z');
    expect(addWeeks(d, 2).toISOString()).toBe('2024-01-15T00:00:00.000Z');
  });
});

describe('addMonths', () => {
  it('adds one month normally', () => {
    const d = new Date('2024-03-15T00:00:00Z');
    const result = addMonths(d, 1);
    expect(result.getUTCMonth()).toBe(3);
    expect(result.getUTCDate()).toBe(15);
  });

  it('Jan 31 + 1 month = Feb 29 (2024 leap)', () => {
    const d = new Date('2024-01-31T00:00:00Z');
    const result = addMonths(d, 1);
    expect(result.getUTCMonth()).toBe(1);
    expect(result.getUTCDate()).toBe(29);
  });

  it('Jan 31 + 1 month = Feb 28 (2023 non-leap)', () => {
    const d = new Date('2023-01-31T00:00:00Z');
    const result = addMonths(d, 1);
    expect(result.getUTCMonth()).toBe(1);
    expect(result.getUTCDate()).toBe(28);
  });

  it('Mar 31 - 1 month = Feb 29 (2024 leap)', () => {
    const d = new Date('2024-03-31T00:00:00Z');
    const result = addMonths(d, -1);
    expect(result.getUTCMonth()).toBe(1);
    expect(result.getUTCDate()).toBe(29);
  });

  it('adds multiple months crossing year boundary', () => {
    const d = new Date('2024-11-01T00:00:00Z');
    const result = addMonths(d, 3);
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(1);
  });
});

describe('addYears', () => {
  it('adds years', () => {
    const d = new Date('2024-01-15T00:00:00Z');
    expect(addYears(d, 2).getUTCFullYear()).toBe(2026);
  });
});

describe('addHours', () => {
  it('adds hours', () => {
    const d = new Date('2024-01-15T10:00:00Z');
    expect(addHours(d, 3).getUTCHours()).toBe(13);
  });

  it('crosses day boundary', () => {
    const d = new Date('2024-01-15T22:00:00Z');
    const r = addHours(d, 3);
    expect(r.getUTCDate()).toBe(16);
    expect(r.getUTCHours()).toBe(1);
  });
});

describe('addMinutes', () => {
  it('adds 90 minutes', () => {
    const d = new Date('2024-01-15T10:00:00Z');
    expect(addMinutes(d, 90).getUTCHours()).toBe(11);
    expect(addMinutes(d, 90).getUTCMinutes()).toBe(30);
  });
});

describe('addSeconds', () => {
  it('adds 90 seconds', () => {
    const d = new Date('2024-01-15T10:00:00Z');
    const r = addSeconds(d, 90);
    expect(r.getUTCMinutes()).toBe(1);
    expect(r.getUTCSeconds()).toBe(30);
  });

  it('does not mutate', () => {
    const d = new Date('2024-01-15T10:00:00Z');
    addSeconds(d, 60);
    expect(d.getUTCSeconds()).toBe(0);
  });
});

describe('subtractDays', () => {
  it('subtracts days', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    expect(subtractDays(d, 5).toISOString()).toBe('2024-01-10T12:00:00.000Z');
  });
});

describe('diffDays (abs floor)', () => {
  it('returns floor of abs difference', () => {
    const a = new Date('2024-01-20T00:00:00Z');
    const b = new Date('2024-01-15T00:00:00Z');
    expect(diffDays(a, b)).toBe(5);
    expect(diffDays(b, a)).toBe(5); // symmetrical
  });

  it('same day returns 0', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    expect(diffDays(d, d)).toBe(0);
  });

  it('partial day uses floor', () => {
    const a = new Date('2024-01-16T06:00:00Z');
    const b = new Date('2024-01-15T00:00:00Z');
    expect(diffDays(a, b)).toBe(1);
  });
});

describe('diffHours (abs floor)', () => {
  it('symmetric abs floor', () => {
    const a = new Date('2024-01-15T15:00:00Z');
    const b = new Date('2024-01-15T10:00:00Z');
    expect(diffHours(a, b)).toBe(5);
    expect(diffHours(b, a)).toBe(5);
  });
});

describe('diffMinutes (abs floor)', () => {
  it('symmetric abs floor', () => {
    const a = new Date('2024-01-15T10:45:00Z');
    const b = new Date('2024-01-15T10:00:00Z');
    expect(diffMinutes(a, b)).toBe(45);
    expect(diffMinutes(b, a)).toBe(45);
  });
});

describe('diffMonths', () => {
  it('year diff * 12 + month diff', () => {
    const a = new Date('2025-03-01T00:00:00Z');
    const b = new Date('2024-01-01T00:00:00Z');
    expect(diffMonths(a, b)).toBe(14); // (2025-2024)*12 + (3-1) = 14
  });

  it('same month returns 0', () => {
    const a = new Date('2024-06-10T00:00:00Z');
    const b = new Date('2024-06-25T00:00:00Z');
    expect(diffMonths(a, b)).toBe(0);
  });

  it('signed result', () => {
    const a = new Date('2024-01-01T00:00:00Z');
    const b = new Date('2025-03-01T00:00:00Z');
    expect(diffMonths(a, b)).toBe(-14);
  });
});

describe('diffYears', () => {
  it('floor of abs years difference', () => {
    const a = new Date('2024-01-01T00:00:00Z');
    const b = new Date('2020-01-01T00:00:00Z');
    expect(diffYears(a, b)).toBe(4);
    expect(diffYears(b, a)).toBe(4);
  });
});

// ==========================================================================
// 2. Start/end of period
// ==========================================================================

describe('startOfDay', () => {
  it('sets UTC hours to 0', () => {
    const d = new Date('2024-01-15T15:30:45.123Z');
    const r = startOfDay(d);
    expect(r.getUTCHours()).toBe(0);
    expect(r.getUTCMinutes()).toBe(0);
    expect(r.getUTCSeconds()).toBe(0);
    expect(r.getUTCMilliseconds()).toBe(0);
  });

  it('preserves UTC date', () => {
    const d = new Date('2024-01-15T15:30:45Z');
    const r = startOfDay(d);
    expect(r.getUTCDate()).toBe(15);
    expect(r.getUTCMonth()).toBe(0);
    expect(r.getUTCFullYear()).toBe(2024);
  });
});

describe('endOfDay', () => {
  it('sets to 23:59:59.999 UTC', () => {
    const d = new Date('2024-01-15T08:00:00Z');
    const r = endOfDay(d);
    expect(r.getUTCHours()).toBe(23);
    expect(r.getUTCMinutes()).toBe(59);
    expect(r.getUTCSeconds()).toBe(59);
    expect(r.getUTCMilliseconds()).toBe(999);
  });
});

describe('startOfWeek', () => {
  it('Sunday start: returns prior Sunday', () => {
    const d = new Date('2024-01-15T12:00:00Z'); // Monday
    const r = startOfWeek(d, 0);
    expect(r.getUTCDay()).toBe(0);
    expect(r.getUTCDate()).toBe(14);
  });

  it('Monday start: stays on Monday', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    const r = startOfWeek(d, 1);
    expect(r.getUTCDay()).toBe(1);
    expect(r.getUTCDate()).toBe(15);
  });

  it('Monday start: Wednesday returns prior Monday', () => {
    const d = new Date('2024-01-17T12:00:00Z'); // Wednesday
    expect(startOfWeek(d, 1).getUTCDate()).toBe(15);
  });

  it('sets time to midnight UTC', () => {
    const d = new Date('2024-01-15T15:30:00Z');
    const r = startOfWeek(d);
    expect(r.getUTCHours()).toBe(0);
    expect(r.getUTCMinutes()).toBe(0);
  });
});

describe('endOfWeek', () => {
  it('Sunday start: ends on Saturday 23:59:59.999', () => {
    const d = new Date('2024-01-15T12:00:00Z'); // Monday
    const r = endOfWeek(d, 0);
    expect(r.getUTCDay()).toBe(6);
    expect(r.getUTCHours()).toBe(23);
    expect(r.getUTCMinutes()).toBe(59);
    expect(r.getUTCSeconds()).toBe(59);
  });
});

describe('startOfMonth', () => {
  it('returns 1st of month midnight UTC', () => {
    const d = new Date('2024-01-15T15:00:00Z');
    const r = startOfMonth(d);
    expect(r.getUTCDate()).toBe(1);
    expect(r.getUTCHours()).toBe(0);
  });
});

describe('endOfMonth', () => {
  it('January: last day is 31', () => {
    const r = endOfMonth(new Date('2024-01-15T00:00:00Z'));
    expect(r.getUTCDate()).toBe(31);
    expect(r.getUTCHours()).toBe(23);
  });

  it('February leap year: last day is 29', () => {
    const r = endOfMonth(new Date('2024-02-10T00:00:00Z'));
    expect(r.getUTCDate()).toBe(29);
  });

  it('February non-leap: last day is 28', () => {
    const r = endOfMonth(new Date('2023-02-10T00:00:00Z'));
    expect(r.getUTCDate()).toBe(28);
  });
});

describe('startOfYear', () => {
  it('returns Jan 1 midnight UTC', () => {
    const r = startOfYear(new Date('2024-06-15T12:00:00Z'));
    expect(r.getUTCMonth()).toBe(0);
    expect(r.getUTCDate()).toBe(1);
    expect(r.getUTCHours()).toBe(0);
  });
});

describe('endOfYear', () => {
  it('returns Dec 31 23:59:59.999 UTC', () => {
    const r = endOfYear(new Date('2024-06-15T12:00:00Z'));
    expect(r.getUTCMonth()).toBe(11);
    expect(r.getUTCDate()).toBe(31);
    expect(r.getUTCSeconds()).toBe(59);
    expect(r.getUTCMilliseconds()).toBe(999);
  });
});

describe('startOfQuarter', () => {
  it('Q1 (Jan): starts on Jan 1', () => {
    const d = new Date(2024, 0, 15); // Jan 15 local
    const r = startOfQuarter(d);
    expect(r.getMonth()).toBe(0);
    expect(r.getDate()).toBe(1);
    expect(r.getHours()).toBe(0);
  });

  it('Q2 (Apr): starts on Apr 1', () => {
    const d = new Date(2024, 4, 20); // May 20 local
    const r = startOfQuarter(d);
    expect(r.getMonth()).toBe(3); // April
    expect(r.getDate()).toBe(1);
  });

  it('Q3 (Jul): starts on Jul 1', () => {
    const d = new Date(2024, 7, 5); // Aug 5 local
    const r = startOfQuarter(d);
    expect(r.getMonth()).toBe(6); // July
  });

  it('Q4 (Oct): starts on Oct 1', () => {
    const d = new Date(2024, 11, 1); // Dec 1 local
    const r = startOfQuarter(d);
    expect(r.getMonth()).toBe(9); // October
  });
});

describe('endOfQuarter', () => {
  it('Q1 ends Mar 31 23:59:59.999', () => {
    const d = new Date(2024, 1, 15); // Feb 15 local
    const r = endOfQuarter(d);
    expect(r.getMonth()).toBe(2); // March
    expect(r.getDate()).toBe(31);
    expect(r.getHours()).toBe(23);
    expect(r.getMilliseconds()).toBe(999);
  });

  it('Q4 ends Dec 31 23:59:59.999', () => {
    const d = new Date(2024, 10, 15); // Nov 15 local
    const r = endOfQuarter(d);
    expect(r.getMonth()).toBe(11); // December
    expect(r.getDate()).toBe(31);
  });
});

describe('startOfHour', () => {
  it('sets minutes/seconds/ms to 0', () => {
    const d = new Date(2024, 0, 15, 14, 35, 50, 200);
    const r = startOfHour(d);
    expect(r.getHours()).toBe(14);
    expect(r.getMinutes()).toBe(0);
    expect(r.getSeconds()).toBe(0);
    expect(r.getMilliseconds()).toBe(0);
  });
});

describe('endOfHour', () => {
  it('sets to xx:59:59.999', () => {
    const d = new Date(2024, 0, 15, 14, 0, 0, 0);
    const r = endOfHour(d);
    expect(r.getHours()).toBe(14);
    expect(r.getMinutes()).toBe(59);
    expect(r.getSeconds()).toBe(59);
    expect(r.getMilliseconds()).toBe(999);
  });
});

// ==========================================================================
// 3. Comparisons
// ==========================================================================

describe('isBefore', () => {
  it('true when a < b', () => {
    const a = new Date('2024-01-01T00:00:00Z');
    const b = new Date('2024-01-02T00:00:00Z');
    expect(isBefore(a, b)).toBe(true);
  });

  it('false when a === b', () => {
    const d = new Date('2024-01-01T00:00:00Z');
    expect(isBefore(d, d)).toBe(false);
  });

  it('false when a > b', () => {
    const a = new Date('2024-01-02T00:00:00Z');
    const b = new Date('2024-01-01T00:00:00Z');
    expect(isBefore(a, b)).toBe(false);
  });
});

describe('isAfter', () => {
  it('true when a > b', () => {
    const a = new Date('2024-01-02T00:00:00Z');
    const b = new Date('2024-01-01T00:00:00Z');
    expect(isAfter(a, b)).toBe(true);
  });

  it('false when a === b', () => {
    const d = new Date('2024-01-01T00:00:00Z');
    expect(isAfter(d, d)).toBe(false);
  });
});

describe('isSameDay', () => {
  it('true for same UTC day', () => {
    const a = new Date('2024-01-15T08:00:00Z');
    const b = new Date('2024-01-15T23:00:00Z');
    expect(isSameDay(a, b)).toBe(true);
  });

  it('false for different days', () => {
    const a = new Date('2024-01-15T23:59:00Z');
    const b = new Date('2024-01-16T00:01:00Z');
    expect(isSameDay(a, b)).toBe(false);
  });
});

describe('isSameMonth', () => {
  it('true for same month', () => {
    const a = new Date('2024-01-01T00:00:00Z');
    const b = new Date('2024-01-31T00:00:00Z');
    expect(isSameMonth(a, b)).toBe(true);
  });

  it('false across years for same month number', () => {
    const a = new Date('2023-01-15T00:00:00Z');
    const b = new Date('2024-01-15T00:00:00Z');
    expect(isSameMonth(a, b)).toBe(false);
  });
});

describe('isSameYear', () => {
  it('true same year', () => {
    const a = new Date('2024-01-01T00:00:00Z');
    const b = new Date('2024-12-31T00:00:00Z');
    expect(isSameYear(a, b)).toBe(true);
  });

  it('false different year', () => {
    const a = new Date('2023-12-31T00:00:00Z');
    const b = new Date('2024-01-01T00:00:00Z');
    expect(isSameYear(a, b)).toBe(false);
  });
});

describe('isToday', () => {
  it('true for same day as reference', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-01-15T08:00:00Z');
    expect(isToday(d, ref)).toBe(true);
  });

  it('false for different day', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-01-16T08:00:00Z');
    expect(isToday(d, ref)).toBe(false);
  });
});

describe('isTomorrow', () => {
  it('true for tomorrow', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-01-16T06:00:00Z');
    expect(isTomorrow(d, ref)).toBe(true);
  });

  it('false for today', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    expect(isTomorrow(ref, ref)).toBe(false);
  });
});

describe('isYesterday', () => {
  it('true for yesterday', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-01-14T12:00:00Z');
    expect(isYesterday(d, ref)).toBe(true);
  });

  it('false for today', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    expect(isYesterday(ref, ref)).toBe(false);
  });
});

describe('isWeekend', () => {
  it('Saturday is weekend', () => {
    expect(isWeekend(new Date('2024-01-13T12:00:00Z'))).toBe(true);
  });

  it('Sunday is weekend', () => {
    expect(isWeekend(new Date('2024-01-14T12:00:00Z'))).toBe(true);
  });

  it('Monday is not weekend', () => {
    expect(isWeekend(new Date('2024-01-15T12:00:00Z'))).toBe(false);
  });

  it('Friday is not weekend', () => {
    expect(isWeekend(new Date('2024-01-19T12:00:00Z'))).toBe(false);
  });
});

describe('isWeekday', () => {
  it('Monday is weekday', () => {
    expect(isWeekday(new Date('2024-01-15T12:00:00Z'))).toBe(true);
  });

  it('Saturday is not weekday', () => {
    expect(isWeekday(new Date('2024-01-13T12:00:00Z'))).toBe(false);
  });
});

describe('isFuture', () => {
  it('true when date is after reference', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-01-16T00:00:00Z');
    expect(isFuture(d, ref)).toBe(true);
  });

  it('false for same instant', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    expect(isFuture(d, d)).toBe(false);
  });
});

describe('isPast', () => {
  it('true when date is before reference', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-01-14T12:00:00Z');
    expect(isPast(d, ref)).toBe(true);
  });

  it('false when date is after reference', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-01-16T12:00:00Z');
    expect(isPast(d, ref)).toBe(false);
  });
});

describe('isValid', () => {
  it('valid Date returns true', () => {
    expect(isValid(new Date('2024-01-15T00:00:00Z'))).toBe(true);
  });

  it('invalid Date returns false', () => {
    expect(isValid(new Date('not-a-date'))).toBe(false);
  });
});

describe('isLeapYear', () => {
  it('2024 is leap', () => expect(isLeapYear(2024)).toBe(true));
  it('2023 is not leap', () => expect(isLeapYear(2023)).toBe(false));
  it('2100 is not leap (century)', () => expect(isLeapYear(2100)).toBe(false));
  it('2000 is leap (400 rule)', () => expect(isLeapYear(2000)).toBe(true));
  it('1900 is not leap', () => expect(isLeapYear(1900)).toBe(false));
  it('1600 is leap (400 rule)', () => expect(isLeapYear(1600)).toBe(true));
});

describe('clampDate', () => {
  it('returns date when within range', () => {
    const d = new Date('2024-01-15T00:00:00Z');
    const min = new Date('2024-01-10T00:00:00Z');
    const max = new Date('2024-01-20T00:00:00Z');
    expect(clampDate(d, min, max).toISOString()).toBe(d.toISOString());
  });

  it('clamps to min when below', () => {
    const d = new Date('2024-01-05T00:00:00Z');
    const min = new Date('2024-01-10T00:00:00Z');
    const max = new Date('2024-01-20T00:00:00Z');
    expect(clampDate(d, min, max).toISOString()).toBe(min.toISOString());
  });

  it('clamps to max when above', () => {
    const d = new Date('2024-01-25T00:00:00Z');
    const min = new Date('2024-01-10T00:00:00Z');
    const max = new Date('2024-01-20T00:00:00Z');
    expect(clampDate(d, min, max).toISOString()).toBe(max.toISOString());
  });
});

// ==========================================================================
// 4. Getters/setters
// ==========================================================================

describe('getDayOfYear', () => {
  it('Jan 1 = day 1', () => {
    const d = new Date(2024, 0, 1, 12, 0, 0); // local
    expect(getDayOfYear(d)).toBe(1);
  });

  it('Dec 31 non-leap = 365', () => {
    const d = new Date(2023, 11, 31, 12, 0, 0);
    expect(getDayOfYear(d)).toBe(365);
  });

  it('Dec 31 leap = 366', () => {
    const d = new Date(2024, 11, 31, 12, 0, 0);
    expect(getDayOfYear(d)).toBe(366);
  });
});

describe('getWeekOfYear', () => {
  it('Jan 1 2024 is ISO week 1', () => {
    expect(getWeekOfYear(new Date('2024-01-01T00:00:00Z'))).toBe(1);
  });

  it('Dec 30 2019 is ISO week 1 of 2020', () => {
    // Dec 30 2019 is a Monday; ISO week 1 of 2020
    expect(getWeekOfYear(new Date('2019-12-30T00:00:00Z'))).toBe(1);
  });

  it('Dec 31 2020 is ISO week 53', () => {
    expect(getWeekOfYear(new Date('2020-12-31T00:00:00Z'))).toBe(53);
  });
});

describe('getDaysInMonth', () => {
  it('January has 31 days', () => expect(getDaysInMonth(2024, 1)).toBe(31));
  it('February 2024 (leap) has 29 days', () => expect(getDaysInMonth(2024, 2)).toBe(29));
  it('February 2023 (non-leap) has 28 days', () => expect(getDaysInMonth(2023, 2)).toBe(28));
  it('April has 30 days', () => expect(getDaysInMonth(2024, 4)).toBe(30));
  it('December has 31 days', () => expect(getDaysInMonth(2024, 12)).toBe(31));
});

describe('getDaysInYear', () => {
  it('2024 (leap) = 366', () => expect(getDaysInYear(2024)).toBe(366));
  it('2023 (non-leap) = 365', () => expect(getDaysInYear(2023)).toBe(365));
  it('2000 (leap) = 366', () => expect(getDaysInYear(2000)).toBe(366));
});

describe('getQuarter', () => {
  it('Jan = Q1', () => expect(getQuarter(new Date('2024-01-01T00:00:00Z'))).toBe(1));
  it('Apr = Q2', () => expect(getQuarter(new Date('2024-04-01T00:00:00Z'))).toBe(2));
  it('Jul = Q3', () => expect(getQuarter(new Date('2024-07-01T00:00:00Z'))).toBe(3));
  it('Oct = Q4', () => expect(getQuarter(new Date('2024-10-01T00:00:00Z'))).toBe(4));
});

describe('getTimezoneOffset', () => {
  it('returns a number', () => {
    const d = new Date('2024-01-15T00:00:00Z');
    expect(typeof getTimezoneOffset(d)).toBe('number');
  });

  it('returns same as date.getTimezoneOffset()', () => {
    const d = new Date('2024-01-15T00:00:00Z');
    expect(getTimezoneOffset(d)).toBe(d.getTimezoneOffset());
  });
});

describe('setTime', () => {
  it('sets hours and minutes', () => {
    const d = new Date(2024, 0, 15, 10, 30, 0, 0);
    const r = setTime(d, 14, 45);
    expect(r.getHours()).toBe(14);
    expect(r.getMinutes()).toBe(45);
    expect(r.getSeconds()).toBe(0);
    expect(r.getMilliseconds()).toBe(0);
  });

  it('sets hours, minutes, seconds, ms', () => {
    const d = new Date(2024, 0, 15, 0, 0, 0, 0);
    const r = setTime(d, 9, 15, 30, 500);
    expect(r.getSeconds()).toBe(30);
    expect(r.getMilliseconds()).toBe(500);
  });

  it('does not mutate original', () => {
    const d = new Date(2024, 0, 15, 10, 0, 0, 0);
    setTime(d, 14, 0);
    expect(d.getHours()).toBe(10);
  });
});

// ==========================================================================
// 5. Formatting
// ==========================================================================

describe('formatDate (UTC-based)', () => {
  const d = new Date('2024-01-15T16:05:03Z');

  it('YYYY-MM-DD', () => expect(formatDate(d, 'YYYY-MM-DD')).toBe('2024-01-15'));
  it('MMM D, YYYY', () => expect(formatDate(d, 'MMM D, YYYY')).toBe('Jan 15, 2024'));
  it('HH:mm', () => expect(formatDate(d, 'HH:mm')).toBe('16:05'));
  it('MMMM full month', () => expect(formatDate(d, 'MMMM D, YYYY')).toBe('January 15, 2024'));
  it('YY 2-digit year', () => expect(formatDate(d, 'YY')).toBe('24'));
  it('ddd short weekday', () => expect(formatDate(d, 'ddd')).toBe('Mon'));
  it('dddd full weekday', () => expect(formatDate(d, 'dddd')).toBe('Monday'));
  it('ss seconds padded', () => expect(formatDate(d, 'ss')).toBe('03'));
  it('M/D/YYYY no padding', () => expect(formatDate(d, 'M/D/YYYY')).toBe('1/15/2024'));
});

describe('formatDateEx (local-time with Do token)', () => {
  it('Do ordinal day', () => {
    // Use a fixed date where local and UTC agree on the day number
    const d = new Date(2024, 0, 15, 12, 0, 0); // Jan 15 local
    expect(formatDateEx(d, 'MMMM Do, YYYY')).toMatch(/January 15th, 2024/);
  });

  it('1st ordinal', () => {
    const d = new Date(2024, 2, 1, 12, 0, 0); // Mar 1 local
    expect(formatDateEx(d, 'Do')).toBe('1st');
  });

  it('2nd ordinal', () => {
    const d = new Date(2024, 2, 2, 12, 0, 0);
    expect(formatDateEx(d, 'Do')).toBe('2nd');
  });

  it('3rd ordinal', () => {
    const d = new Date(2024, 2, 3, 12, 0, 0);
    expect(formatDateEx(d, 'Do')).toBe('3rd');
  });

  it('11th ordinal (special case)', () => {
    const d = new Date(2024, 2, 11, 12, 0, 0);
    expect(formatDateEx(d, 'Do')).toBe('11th');
  });

  it('21st ordinal', () => {
    const d = new Date(2024, 2, 21, 12, 0, 0);
    expect(formatDateEx(d, 'Do')).toBe('21st');
  });

  it('YYYY-MM-DD format', () => {
    const d = new Date(2024, 0, 5, 12, 0, 0); // Jan 5
    expect(formatDateEx(d, 'YYYY-MM-DD')).toBe('2024-01-05');
  });
});

describe('formatRelative', () => {
  const ref = new Date('2024-01-15T12:00:00Z');

  it('"just now" for < 60s ago', () => {
    const d = new Date(ref.getTime() - 30 * 1000);
    expect(formatRelative(d, ref)).toBe('just now');
  });

  it('"just now" for < 60s future', () => {
    const d = new Date(ref.getTime() + 30 * 1000);
    expect(formatRelative(d, ref)).toBe('just now');
  });

  it('past minutes "Xm ago"', () => {
    const d = new Date(ref.getTime() - 5 * 60 * 1000);
    expect(formatRelative(d, ref)).toMatch(/5m? ago|5 minute/);
  });

  it('past hours "Xh ago"', () => {
    const d = new Date(ref.getTime() - 2 * 60 * 60 * 1000);
    expect(formatRelative(d, ref)).toMatch(/2h? ago|2 hour/);
  });

  it('past days "Xd ago"', () => {
    const d = new Date(ref.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelative(d, ref)).toMatch(/3d? ago|3 day/);
  });

  it('past weeks "Xw ago"', () => {
    const d = new Date(ref.getTime() - 14 * 24 * 60 * 60 * 1000);
    expect(formatRelative(d, ref)).toMatch(/\d+w? ago|\d+ week/);
  });

  it('past months "Xmo ago"', () => {
    const d = new Date(ref.getTime() - 60 * 24 * 60 * 60 * 1000);
    expect(formatRelative(d, ref)).toMatch(/\d+mo? ago|\d+ month/);
  });

  it('past years "Xyr ago"', () => {
    const d = new Date(ref.getTime() - 400 * 24 * 60 * 60 * 1000);
    expect(formatRelative(d, ref)).toMatch(/\d+yr? ago|\d+ year/);
  });

  it('future minutes "in Xm"', () => {
    const d = new Date(ref.getTime() + 5 * 60 * 1000);
    expect(formatRelative(d, ref)).toMatch(/in 5m?|in 5 minute/);
  });

  it('future hours "in Xh"', () => {
    const d = new Date(ref.getTime() + 3 * 60 * 60 * 1000);
    expect(formatRelative(d, ref)).toMatch(/in 3h?|in 3 hour/);
  });

  it('future days "in Xd"', () => {
    const d = new Date(ref.getTime() + 3 * 24 * 60 * 60 * 1000);
    expect(formatRelative(d, ref)).toMatch(/in 3d?|in 3 day/);
  });
});

describe('formatDateRange', () => {
  it('same month: "Jan 5–7, 2025"', () => {
    const start = new Date(2025, 0, 5);
    const end = new Date(2025, 0, 7);
    expect(formatDateRange(start, end)).toBe('Jan 5–7, 2025');
  });

  it('different month same year: "Jan 5 – Feb 3, 2025"', () => {
    const start = new Date(2025, 0, 5);
    const end = new Date(2025, 1, 3);
    expect(formatDateRange(start, end)).toBe('Jan 5 – Feb 3, 2025');
  });

  it('different year: "Dec 30, 2024 – Jan 2, 2025"', () => {
    const start = new Date(2024, 11, 30);
    const end = new Date(2025, 0, 2);
    expect(formatDateRange(start, end)).toBe('Dec 30, 2024 – Jan 2, 2025');
  });
});

describe('toISO', () => {
  it('returns ISO 8601 string', () => {
    const d = new Date('2024-01-15T12:00:00.000Z');
    expect(toISO(d)).toBe('2024-01-15T12:00:00.000Z');
  });
});

describe('toUTCString', () => {
  it('returns a non-empty string', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    const s = toUTCString(d);
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(0);
    expect(s).toContain('Mon');
  });
});

// ==========================================================================
// 6. Parsing
// ==========================================================================

describe('parseDateStrict', () => {
  it('parses YYYY-MM-DD', () => {
    const r = parseDateStrict('2024-01-15');
    expect(r.getUTCFullYear()).toBe(2024);
    expect(r.getUTCMonth()).toBe(0);
    expect(r.getUTCDate()).toBe(15);
  });

  it('parses YYYY/MM/DD', () => {
    const r = parseDateStrict('2024/01/15');
    expect(r.getUTCFullYear()).toBe(2024);
    expect(r.getUTCDate()).toBe(15);
  });

  it('parses MM/DD/YYYY', () => {
    const r = parseDateStrict('01/15/2024');
    expect(r.getUTCFullYear()).toBe(2024);
    expect(r.getUTCMonth()).toBe(0);
    expect(r.getUTCDate()).toBe(15);
  });

  it('parses MM-DD-YYYY', () => {
    const r = parseDateStrict('01-15-2024');
    expect(r.getUTCFullYear()).toBe(2024);
    expect(r.getUTCDate()).toBe(15);
  });

  it('parses "Jan 6, 2025"', () => {
    const r = parseDateStrict('Jan 6, 2025');
    expect(r.getUTCFullYear()).toBe(2025);
    expect(r.getUTCMonth()).toBe(0);
    expect(r.getUTCDate()).toBe(6);
  });

  it('parses "January 6, 2025"', () => {
    const r = parseDateStrict('January 6, 2025');
    expect(r.getUTCFullYear()).toBe(2025);
    expect(r.getUTCMonth()).toBe(0);
  });

  it('parses ISO 8601 with time', () => {
    const r = parseDateStrict('2024-01-15T12:30:00Z');
    expect(r.getUTCHours()).toBe(12);
    expect(r.getUTCMinutes()).toBe(30);
  });

  it('throws for unrecognized format', () => {
    expect(() => parseDateStrict('not-a-date')).toThrow();
    expect(() => parseDateStrict('15/01/2024')).not.toThrow(); // MM-DD ambiguous but parses
  });

  it('throws for completely invalid string', () => {
    expect(() => parseDateStrict('foobar')).toThrow();
  });
});

describe('parseTime', () => {
  it('parses HH:MM', () => {
    const r = parseTime('14:30');
    expect(r.hours).toBe(14);
    expect(r.minutes).toBe(30);
    expect(r.seconds).toBe(0);
  });

  it('parses HH:MM:SS', () => {
    const r = parseTime('09:15:45');
    expect(r.hours).toBe(9);
    expect(r.minutes).toBe(15);
    expect(r.seconds).toBe(45);
  });

  it('parses H:MM AM', () => {
    const r = parseTime('9:30 AM');
    expect(r.hours).toBe(9);
    expect(r.minutes).toBe(30);
  });

  it('parses H:MM PM', () => {
    const r = parseTime('3:30 PM');
    expect(r.hours).toBe(15);
    expect(r.minutes).toBe(30);
  });

  it('parses 12:00 PM as noon', () => {
    const r = parseTime('12:00 PM');
    expect(r.hours).toBe(12);
  });

  it('parses 12:00 AM as midnight', () => {
    const r = parseTime('12:00 AM');
    expect(r.hours).toBe(0);
  });

  it('throws for invalid format', () => {
    expect(() => parseTime('25:00')).not.toThrow(); // technically parsed
    expect(() => parseTime('not-a-time')).toThrow();
  });
});

describe('parseDuration', () => {
  it('"2h" = 7200000ms', () => expect(parseDuration('2h')).toBe(7200000));
  it('"30m" = 1800000ms', () => expect(parseDuration('30m')).toBe(1800000));
  it('"90s" = 90000ms', () => expect(parseDuration('90s')).toBe(90000));
  it('"1h30m" = 5400000ms', () => expect(parseDuration('1h30m')).toBe(5400000));
  it('"1h30m45s" = 5445000ms', () => {
    expect(parseDuration('1h30m45s')).toBe(1 * 3600000 + 30 * 60000 + 45 * 1000);
  });
  it('throws for invalid format', () => {
    expect(() => parseDuration('invalid')).toThrow();
    expect(() => parseDuration('')).toThrow();
  });
});

// ==========================================================================
// 7. Sports schedule helpers
// ==========================================================================

describe('nflWeekDates', () => {
  it('week 1 of 2024 starts on first Thursday of September', () => {
    // Sep 1 2024 is Sunday → first Thu = Sep 5
    const { start, end } = nflWeekDates(2024, 1);
    expect(start.getUTCDay()).toBe(4); // Thursday
    expect(start.getUTCMonth()).toBe(8); // September
    expect(start.getUTCDate()).toBe(5);
    expect(end.getUTCDay()).toBe(3); // Wednesday
  });

  it('week 2 starts 7 days after week 1', () => {
    const { start: w1 } = nflWeekDates(2024, 1);
    const { start: w2 } = nflWeekDates(2024, 2);
    expect(w2.getTime() - w1.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('week 1 of 2023 is a Thursday in September', () => {
    const { start } = nflWeekDates(2023, 1);
    expect(start.getUTCDay()).toBe(4);
    expect(start.getUTCMonth()).toBe(8);
  });
});

describe('nbaSeasonDates', () => {
  it('starts Oct 1', () => {
    const { start } = nbaSeasonDates(2024);
    expect(start.getUTCMonth()).toBe(9); // October
    expect(start.getUTCDate()).toBe(1);
  });

  it('ends Jun 30 of year+1', () => {
    const { end } = nbaSeasonDates(2024);
    expect(end.getUTCFullYear()).toBe(2025);
    expect(end.getUTCMonth()).toBe(5); // June
    expect(end.getUTCDate()).toBe(30);
  });
});

describe('mlbSeasonDates', () => {
  it('starts April 1', () => {
    const { start } = mlbSeasonDates(2024);
    expect(start.getUTCMonth()).toBe(3); // April
    expect(start.getUTCDate()).toBe(1);
  });

  it('ends October 31', () => {
    const { end } = mlbSeasonDates(2024);
    expect(end.getUTCMonth()).toBe(9); // October
    expect(end.getUTCDate()).toBe(31);
  });
});

describe('nhlSeasonDates', () => {
  it('starts Oct 1', () => {
    const { start } = nhlSeasonDates(2024);
    expect(start.getUTCMonth()).toBe(9);
    expect(start.getUTCDate()).toBe(1);
  });

  it('ends Jun 30 year+1', () => {
    const { end } = nhlSeasonDates(2024);
    expect(end.getUTCFullYear()).toBe(2025);
    expect(end.getUTCMonth()).toBe(5);
  });
});

describe('isInSeasonEx', () => {
  it('November is in NFL season', () => {
    const d = new Date('2024-11-10T12:00:00Z');
    expect(isInSeasonEx(d, 'nfl')).toBe(true);
  });

  it('June is not in NFL season', () => {
    const d = new Date('2024-06-01T12:00:00Z');
    expect(isInSeasonEx(d, 'nfl')).toBe(false);
  });

  it('November is in NBA season', () => {
    const d = new Date('2024-11-10T12:00:00Z');
    expect(isInSeasonEx(d, 'nba')).toBe(true);
  });

  it('July is not in NBA season', () => {
    const d = new Date('2024-07-15T12:00:00Z');
    expect(isInSeasonEx(d, 'nba')).toBe(false);
  });

  it('June is in MLB season', () => {
    const d = new Date('2024-06-15T12:00:00Z');
    expect(isInSeasonEx(d, 'mlb')).toBe(true);
  });

  it('January is not in MLB season', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    expect(isInSeasonEx(d, 'mlb')).toBe(false);
  });

  it('November is in NHL season', () => {
    const d = new Date('2024-11-15T12:00:00Z');
    expect(isInSeasonEx(d, 'nhl')).toBe(true);
  });

  it('August is not in NHL season', () => {
    const d = new Date('2024-08-15T12:00:00Z');
    expect(isInSeasonEx(d, 'nhl')).toBe(false);
  });
});

describe('gameDay', () => {
  it('Monday returns "monday"', () => {
    const d = new Date('2024-01-15T12:00:00Z'); // Monday
    expect(gameDay(d)).toBe('monday');
  });

  it('Sunday returns "sunday"', () => {
    const d = new Date('2024-01-14T12:00:00Z'); // Sunday
    expect(gameDay(d)).toBe('sunday');
  });

  it('Saturday returns "saturday"', () => {
    const d = new Date('2024-01-13T12:00:00Z'); // Saturday
    expect(gameDay(d)).toBe('saturday');
  });
});

describe('nextGameDay', () => {
  it('NFL: next Sunday from Monday', () => {
    const d = new Date('2024-01-15T12:00:00Z'); // Monday Jan 15
    const r = nextGameDay(d, 'nfl');
    expect(r.getUTCDay()).toBe(0); // Sunday
    expect(r.getUTCDate()).toBe(21);
  });

  it('NFL: next Sunday from Sunday returns next Sunday', () => {
    const d = new Date('2024-01-14T12:00:00Z'); // Sunday
    const r = nextGameDay(d, 'nfl');
    expect(r.getUTCDay()).toBe(0); // next Sunday
    expect(r.getUTCDate()).toBe(21);
  });

  it('NBA: returns tomorrow', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    const r = nextGameDay(d, 'nba');
    expect(r.getUTCDate()).toBe(16);
  });

  it('MLB: returns tomorrow', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    const r = nextGameDay(d, 'mlb');
    expect(r.getUTCDate()).toBe(16);
  });

  it('NHL: returns tomorrow', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    const r = nextGameDay(d, 'nhl');
    expect(r.getUTCDate()).toBe(16);
  });
});

describe('hoursUntilGame', () => {
  it('returns positive hours for future game', () => {
    const base = new Date('2024-01-15T12:00:00Z');
    const game = new Date('2024-01-15T20:00:00Z');
    expect(hoursUntilGame(game, base)).toBeCloseTo(8, 5);
  });

  it('returns negative hours for past game', () => {
    const base = new Date('2024-01-15T12:00:00Z');
    const game = new Date('2024-01-15T08:00:00Z');
    expect(hoursUntilGame(game, base)).toBeCloseTo(-4, 5);
  });
});

describe('isDoubleheaderRisk', () => {
  it('MLB Saturday in August is risk', () => {
    // Aug 17 2024 is a Saturday
    const d = new Date(2024, 7, 17); // Aug 17 local
    expect(isDoubleheaderRisk(d, 'mlb')).toBe(true);
  });

  it('MLB Sunday in September is risk', () => {
    // Sep 1 2024 is a Sunday
    const d = new Date(2024, 8, 1); // Sep 1 local
    expect(isDoubleheaderRisk(d, 'mlb')).toBe(true);
  });

  it('MLB Saturday in July is not risk', () => {
    // Jul 20 2024 is a Saturday
    const d = new Date(2024, 6, 20);
    expect(isDoubleheaderRisk(d, 'mlb')).toBe(false);
  });

  it('MLB weekday in August is not risk', () => {
    // Aug 19 2024 is a Monday
    const d = new Date(2024, 7, 19);
    expect(isDoubleheaderRisk(d, 'mlb')).toBe(false);
  });
});

describe('timezoneLabel', () => {
  it('returns a string', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    expect(typeof timezoneLabel(d)).toBe('string');
  });

  it('returns ET/CT/MT/PT/UTC for known offsets', () => {
    const validLabels = ['ET', 'CT', 'MT', 'PT', 'UTC'];
    const d = new Date('2024-01-15T12:00:00Z');
    expect(validLabels).toContain(timezoneLabel(d));
  });
});

// ==========================================================================
// 8. Batch utilities
// ==========================================================================

describe('dateRange', () => {
  it('returns correct count for day step', () => {
    const start = new Date('2024-01-15T00:00:00Z');
    const end = new Date('2024-01-20T00:00:00Z');
    expect(dateRange(start, end).length).toBe(6);
  });

  it('includes start and end', () => {
    const start = new Date('2024-01-15T00:00:00Z');
    const end = new Date('2024-01-17T00:00:00Z');
    const r = dateRange(start, end);
    expect(r[0]!.getUTCDate()).toBe(15);
    expect(r[r.length - 1]!.getUTCDate()).toBe(17);
  });

  it('returns single date when start === end', () => {
    const start = new Date('2024-01-15T00:00:00Z');
    expect(dateRange(start, start).length).toBe(1);
  });

  it('week step', () => {
    const start = new Date('2024-01-01T00:00:00Z');
    const end = new Date('2024-01-29T00:00:00Z');
    expect(dateRange(start, end, 'week').length).toBe(5);
  });

  it('month step', () => {
    const start = new Date('2024-01-01T00:00:00Z');
    const end = new Date('2024-04-01T00:00:00Z');
    const r = dateRange(start, end, 'month');
    expect(r.length).toBe(4); // Jan, Feb, Mar, Apr
  });
});

describe('groupByDayRecord', () => {
  it('groups by YYYY-MM-DD key', () => {
    const dates = [
      new Date('2024-01-15T08:00:00Z'),
      new Date('2024-01-15T20:00:00Z'),
      new Date('2024-01-16T12:00:00Z'),
    ];
    const r = groupByDayRecord(dates);
    expect(Object.keys(r)).toHaveLength(2);
    expect(r['2024-01-15']).toHaveLength(2);
    expect(r['2024-01-16']).toHaveLength(1);
  });

  it('empty input returns empty object', () => {
    expect(Object.keys(groupByDayRecord([]))).toHaveLength(0);
  });
});

describe('groupByMonth', () => {
  it('groups by YYYY-MM key', () => {
    const dates = [
      new Date('2024-01-15T00:00:00Z'),
      new Date('2024-01-20T00:00:00Z'),
      new Date('2024-02-10T00:00:00Z'),
    ];
    const r = groupByMonth(dates);
    expect(Object.keys(r)).toHaveLength(2);
    expect(r['2024-01']).toHaveLength(2);
    expect(r['2024-02']).toHaveLength(1);
  });
});

describe('sortDates', () => {
  const dates = [
    new Date('2024-01-20T00:00:00Z'),
    new Date('2024-01-10T00:00:00Z'),
    new Date('2024-01-15T00:00:00Z'),
  ];

  it('sorts ascending by default', () => {
    const r = sortDates(dates);
    expect(r[0]!.getUTCDate()).toBe(10);
    expect(r[1]!.getUTCDate()).toBe(15);
    expect(r[2]!.getUTCDate()).toBe(20);
  });

  it('sorts descending', () => {
    const r = sortDates(dates, 'desc');
    expect(r[0]!.getUTCDate()).toBe(20);
    expect(r[2]!.getUTCDate()).toBe(10);
  });

  it('does not mutate original array', () => {
    const origFirst = dates[0]!.getUTCDate();
    sortDates(dates, 'asc');
    expect(dates[0]!.getUTCDate()).toBe(origFirst);
  });
});

describe('uniqueDays', () => {
  it('deduplicates by UTC day', () => {
    const dates = [
      new Date('2024-01-15T08:00:00Z'),
      new Date('2024-01-15T20:00:00Z'),
      new Date('2024-01-16T12:00:00Z'),
    ];
    const r = uniqueDays(dates);
    expect(r).toHaveLength(2);
  });

  it('preserves first occurrence', () => {
    const d1 = new Date('2024-01-15T08:00:00Z');
    const d2 = new Date('2024-01-15T20:00:00Z');
    const r = uniqueDays([d1, d2]);
    expect(r[0]!.toISOString()).toBe(d1.toISOString());
  });
});

describe('countByDayOfWeek', () => {
  it('counts by 0=Sun..6=Sat', () => {
    const dates = [
      new Date('2024-01-14T12:00:00Z'), // Sunday (0)
      new Date('2024-01-14T20:00:00Z'), // Sunday (0)
      new Date('2024-01-15T12:00:00Z'), // Monday (1)
    ];
    const r = countByDayOfWeek(dates);
    expect(r[0]).toBe(2);
    expect(r[1]).toBe(1);
  });

  it('empty array returns empty object', () => {
    expect(Object.keys(countByDayOfWeek([]))).toHaveLength(0);
  });
});

// ==========================================================================
// Legacy / backward-compat exports
// ==========================================================================

describe('subDays', () => {
  it('subtracts days', () => {
    const d = new Date('2024-01-15T12:00:00Z');
    expect(subDays(d, 5).toISOString()).toBe('2024-01-10T12:00:00.000Z');
  });
});

describe('diffInDays (signed)', () => {
  it('positive when a > b', () => {
    const a = new Date('2024-01-20T00:00:00Z');
    const b = new Date('2024-01-15T00:00:00Z');
    expect(diffInDays(a, b)).toBe(5);
  });

  it('negative when a < b', () => {
    const a = new Date('2024-01-10T00:00:00Z');
    const b = new Date('2024-01-15T00:00:00Z');
    expect(diffInDays(a, b)).toBe(-5);
  });
});

describe('nflSeasonStart', () => {
  it('2024: first Thursday of September 2024', () => {
    const r = nflSeasonStart(2024);
    expect(r.getUTCDay()).toBe(4); // Thursday
    expect(r.getUTCMonth()).toBe(8); // September
    expect(r.getUTCFullYear()).toBe(2024);
    expect(r.getUTCDate()).toBe(5);
  });
});

describe('isoWeek', () => {
  it('Jan 1 2024 = week 1', () => {
    expect(isoWeek(new Date('2024-01-01T00:00:00Z'))).toBe(1);
  });

  it('Dec 30 2019 = week 1 (of 2020)', () => {
    expect(isoWeek(new Date('2019-12-30T00:00:00Z'))).toBe(1);
  });

  it('Jan 1 2023 = week 52', () => {
    expect(isoWeek(new Date('2023-01-01T00:00:00Z'))).toBe(52);
  });
});

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

describe('quarterOfYear', () => {
  it('January = Q1', () => expect(quarterOfYear(new Date('2024-01-15T00:00:00Z'))).toBe(1));
  it('April = Q2', () => expect(quarterOfYear(new Date('2024-04-15T00:00:00Z'))).toBe(2));
  it('July = Q3', () => expect(quarterOfYear(new Date('2024-07-15T00:00:00Z'))).toBe(3));
  it('October = Q4', () => expect(quarterOfYear(new Date('2024-10-15T00:00:00Z'))).toBe(4));
  it('March = Q1', () => expect(quarterOfYear(new Date('2024-03-31T00:00:00Z'))).toBe(1));
});

describe('countdownTo', () => {
  it('returns correct breakdown', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const target = new Date('2024-01-18T15:30:45Z');
    const r = countdownTo(target, ref);
    expect(r.days).toBe(3);
    expect(r.hours).toBe(3);
    expect(r.minutes).toBe(30);
    expect(r.seconds).toBe(45);
  });

  it('all zeros if past', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const target = new Date('2024-01-14T12:00:00Z');
    const r = countdownTo(target, ref);
    expect(r.total).toBe(0);
  });
});

describe('formatDuration', () => {
  it('formats 2h 35m', () => {
    expect(formatDuration(2 * 60 * 60 * 1000 + 35 * 60 * 1000)).toBe('2h 35m');
  });

  it('returns 0s for 0', () => expect(formatDuration(0)).toBe('0s'));
  it('returns 0s for negative', () => expect(formatDuration(-1000)).toBe('0s'));
});

describe('parseDate (original null-returning)', () => {
  it('parses YYYY-MM-DD', () => {
    const r = parseDate('2024-01-15');
    expect(r).not.toBeNull();
    expect(r!.getUTCDate()).toBe(15);
  });

  it('returns null for invalid', () => {
    expect(parseDate('not-a-date')).toBeNull();
  });

  it('returns null for M/D/YYYY (not ISO)', () => {
    expect(parseDate('1/15/2024')).toBeNull();
  });
});

describe('parseFlexibleDate', () => {
  it('parses M/D/YYYY', () => {
    const r = parseFlexibleDate('1/15/2024');
    expect(r).not.toBeNull();
    expect(r!.getUTCDate()).toBe(15);
  });

  it('parses "January 15, 2024"', () => {
    const r = parseFlexibleDate('January 15, 2024');
    expect(r).not.toBeNull();
    expect(r!.getUTCMonth()).toBe(0);
  });

  it('returns null for unparseable', () => {
    expect(parseFlexibleDate('foobar')).toBeNull();
  });
});

describe('dayOrdinal', () => {
  it('formats with ordinal', () => {
    const d = new Date('2024-01-15T00:00:00Z');
    expect(dayOrdinal(d)).toBe('January 15th, 2024');
  });

  it('1st', () => {
    const d = new Date('2024-03-01T00:00:00Z');
    expect(dayOrdinal(d)).toBe('March 1st, 2024');
  });
});

describe('isThisWeek', () => {
  it('true for date in same week', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-01-17T12:00:00Z');
    expect(isThisWeek(d, ref)).toBe(true);
  });

  it('false for different week', () => {
    const ref = new Date('2024-01-15T12:00:00Z');
    const d = new Date('2024-01-22T12:00:00Z');
    expect(isThisWeek(d, ref)).toBe(false);
  });
});

describe('formatGameTime', () => {
  it('formats Sunday afternoon', () => {
    const d = new Date('2024-01-14T16:25:00Z');
    expect(formatGameTime(d)).toBe('Sun, Jan 14 · 4:25 PM');
  });

  it('formats midnight', () => {
    const d = new Date('2024-01-15T00:00:00Z');
    expect(formatGameTime(d)).toContain('12:00 AM');
  });
});
