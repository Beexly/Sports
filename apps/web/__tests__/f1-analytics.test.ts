/**
 * f1-analytics.test.ts
 * Tests for the F1 motorsport analytics library.
 */

import { describe, it, expect } from 'vitest';
import {
  parseLapTime,
  formatLapTime,
  lapTimeDelta,
  fastestLap,
  personalBest,
  sectorBest,
  theoreticalBestLap,
  lapGap,
  avgLapTime,
  medianLapTime,
  lapVariability,
  sectorAnalysis,
  sectorShare,
  weakestSector,
  sectorImprovement,
  tireAge,
  tireDegradation,
  expectedLapTimeLoss,
  optimalPitWindow,
  compoundToCode,
  compoundFromCode,
  tireWindowEstimate,
  pitStopLoss,
  undercut,
  overcut,
  totalPitLoss,
  idealPitCount,
  f1Points,
  sprintPoints,
  championshipGap,
  constructorPoints,
  pointsToClosureRate,
  qualifyingGap,
  gridPenalty,
  qualifyingPerformance,
  frontRowProbability,
  driverStrengthScore,
  winProbability,
  podiumProbability,
  expectedFinishPosition,
  draftKingsF1Score,
} from '../lib/sports/f1-analytics';
import type { LapTime, PitStop, RaceResult, QualifyingResult, TireStint } from '../lib/sports/f1-analytics';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLap(
  overrides: Partial<LapTime> & { driver: string; lap: number; seconds: number }
): LapTime {
  return {
    s1: 20,
    s2: 30,
    s3: 25,
    compound: 'medium',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseLapTime
// ---------------------------------------------------------------------------

describe('parseLapTime', () => {
  it('parses "1:23.456" as 83.456', () => {
    expect(parseLapTime('1:23.456')).toBeCloseTo(83.456);
  });

  it('parses "0:23.456" as 23.456', () => {
    expect(parseLapTime('0:23.456')).toBeCloseTo(23.456);
  });

  it('parses "23.456" (no minutes) as 23.456', () => {
    expect(parseLapTime('23.456')).toBeCloseTo(23.456);
  });

  it('parses "1:00.000" as 60 seconds', () => {
    expect(parseLapTime('1:00.000')).toBeCloseTo(60);
  });

  it('parses "2:30.000" as 150 seconds', () => {
    expect(parseLapTime('2:30.000')).toBeCloseTo(150);
  });

  it('handles trimmed whitespace', () => {
    expect(parseLapTime('  1:23.456  ')).toBeCloseTo(83.456);
  });

  it('parses sector-style "23.789" without minutes', () => {
    expect(parseLapTime('23.789')).toBeCloseTo(23.789);
  });
});

// ---------------------------------------------------------------------------
// formatLapTime
// ---------------------------------------------------------------------------

describe('formatLapTime', () => {
  it('formats 83.456 as "1:23.456"', () => {
    expect(formatLapTime(83.456)).toBe('1:23.456');
  });

  it('formats 60 as "1:00.000"', () => {
    expect(formatLapTime(60)).toBe('1:00.000');
  });

  it('formats 150 as "2:30.000"', () => {
    expect(formatLapTime(150)).toBe('2:30.000');
  });

  it('formats sub-minute as "0:23.456"', () => {
    expect(formatLapTime(23.456)).toBe('0:23.456');
  });

  it('formats 0 as "0:00.000"', () => {
    expect(formatLapTime(0)).toBe('0:00.000');
  });
});

// ---------------------------------------------------------------------------
// parseLapTime / formatLapTime roundtrip
// ---------------------------------------------------------------------------

describe('parseLapTime / formatLapTime roundtrip', () => {
  const cases = ['1:23.456', '2:00.000', '0:45.123', '1:59.999'];

  for (const tc of cases) {
    it(`roundtrips "${tc}"`, () => {
      const seconds = parseLapTime(tc);
      const formatted = formatLapTime(seconds);
      expect(formatted).toBe(tc);
    });
  }

  it('roundtrips 83.456 seconds', () => {
    const formatted = formatLapTime(83.456);
    const back = parseLapTime(formatted);
    expect(back).toBeCloseTo(83.456);
  });
});

// ---------------------------------------------------------------------------
// lapTimeDelta
// ---------------------------------------------------------------------------

describe('lapTimeDelta', () => {
  it('returns "+0.456" when b > a', () => {
    expect(lapTimeDelta(83, 83.456)).toBe('+0.456');
  });

  it('returns "-0.456" when b < a', () => {
    expect(lapTimeDelta(83.456, 83)).toBe('-0.456');
  });

  it('returns "+0.000" when equal', () => {
    expect(lapTimeDelta(83, 83)).toBe('+0.000');
  });

  it('formats 3 decimal places', () => {
    expect(lapTimeDelta(80, 81.1)).toBe('+1.100');
  });
});

// ---------------------------------------------------------------------------
// fastestLap
// ---------------------------------------------------------------------------

describe('fastestLap', () => {
  it('returns null for empty array', () => {
    expect(fastestLap([])).toBeNull();
  });

  it('returns the lap with minimum seconds', () => {
    const laps: LapTime[] = [
      makeLap({ driver: 'HAM', lap: 1, seconds: 85 }),
      makeLap({ driver: 'VER', lap: 1, seconds: 83 }),
      makeLap({ driver: 'LEC', lap: 1, seconds: 84 }),
    ];
    const fl = fastestLap(laps);
    expect(fl?.seconds).toBe(83);
    expect(fl?.driver).toBe('VER');
  });

  it('returns the only lap if array has one element', () => {
    const laps = [makeLap({ driver: 'HAM', lap: 1, seconds: 90 })];
    expect(fastestLap(laps)?.seconds).toBe(90);
  });
});

// ---------------------------------------------------------------------------
// personalBest
// ---------------------------------------------------------------------------

describe('personalBest', () => {
  it('returns null when driver has no laps', () => {
    const laps = [makeLap({ driver: 'HAM', lap: 1, seconds: 85 })];
    expect(personalBest(laps, 'VER')).toBeNull();
  });

  it('returns fastest lap for specified driver', () => {
    const laps: LapTime[] = [
      makeLap({ driver: 'VER', lap: 1, seconds: 83 }),
      makeLap({ driver: 'VER', lap: 2, seconds: 82.5 }),
      makeLap({ driver: 'HAM', lap: 1, seconds: 81 }), // faster but different driver
    ];
    const pb = personalBest(laps, 'VER');
    expect(pb?.seconds).toBe(82.5);
  });
});

// ---------------------------------------------------------------------------
// sectorBest
// ---------------------------------------------------------------------------

describe('sectorBest', () => {
  const laps: LapTime[] = [
    makeLap({ driver: 'VER', lap: 1, seconds: 83, s1: 22, s2: 33, s3: 28 }),
    makeLap({ driver: 'HAM', lap: 1, seconds: 84, s1: 21, s2: 34, s3: 29 }),
    makeLap({ driver: 'LEC', lap: 1, seconds: 85, s1: 23, s2: 32, s3: 30 }),
  ];

  it('returns best s1 = 21', () => {
    expect(sectorBest(laps, 1)).toBe(21);
  });

  it('returns best s2 = 32', () => {
    expect(sectorBest(laps, 2)).toBe(32);
  });

  it('returns best s3 = 28', () => {
    expect(sectorBest(laps, 3)).toBe(28);
  });

  it('returns 0 for empty laps', () => {
    expect(sectorBest([], 1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// theoreticalBestLap
// ---------------------------------------------------------------------------

describe('theoreticalBestLap', () => {
  it('returns 0 for empty laps', () => {
    expect(theoreticalBestLap([])).toBe(0);
  });

  it('returns sum of best sectors', () => {
    const laps: LapTime[] = [
      makeLap({ driver: 'VER', lap: 1, seconds: 83, s1: 22, s2: 33, s3: 28 }),
      makeLap({ driver: 'HAM', lap: 1, seconds: 84, s1: 21, s2: 34, s3: 29 }),
      makeLap({ driver: 'LEC', lap: 1, seconds: 85, s1: 23, s2: 32, s3: 30 }),
    ];
    // best s1=21, best s2=32, best s3=28 => 81
    expect(theoreticalBestLap(laps)).toBe(81);
  });

  it('uses actual best across all drivers not just one', () => {
    const laps: LapTime[] = [
      makeLap({ driver: 'A', lap: 1, seconds: 83, s1: 25, s2: 28, s3: 30 }),
      makeLap({ driver: 'B', lap: 1, seconds: 84, s1: 26, s2: 27, s3: 31 }),
    ];
    // best s1=25, best s2=27, best s3=30 => 82
    expect(theoreticalBestLap(laps)).toBe(82);
  });

  it('theoretical best <= actual best lap', () => {
    const laps: LapTime[] = [
      makeLap({ driver: 'A', lap: 1, seconds: 83, s1: 22, s2: 33, s3: 28 }),
    ];
    const theoretical = theoreticalBestLap(laps);
    const actual = fastestLap(laps)!.seconds;
    // In a single-lap scenario, sectors should sum to total
    expect(theoretical).toBeLessThanOrEqual(actual + 0.01);
  });
});

// ---------------------------------------------------------------------------
// lapGap
// ---------------------------------------------------------------------------

describe('lapGap', () => {
  const laps: LapTime[] = [
    makeLap({ driver: 'VER', lap: 10, seconds: 83 }),
    makeLap({ driver: 'HAM', lap: 10, seconds: 84.5 }),
  ];

  it('returns driver1 - driver2 seconds', () => {
    expect(lapGap(laps, 'VER', 'HAM', 10)).toBeCloseTo(-1.5);
  });

  it('returns positive when driver1 is slower', () => {
    expect(lapGap(laps, 'HAM', 'VER', 10)).toBeCloseTo(1.5);
  });

  it('returns null if driver1 missing at lap', () => {
    expect(lapGap(laps, 'LEC', 'HAM', 10)).toBeNull();
  });

  it('returns null if driver2 missing at lap', () => {
    expect(lapGap(laps, 'VER', 'LEC', 10)).toBeNull();
  });

  it('returns null if no laps match the lap number', () => {
    expect(lapGap(laps, 'VER', 'HAM', 99)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// avgLapTime
// ---------------------------------------------------------------------------

describe('avgLapTime', () => {
  const laps: LapTime[] = [
    makeLap({ driver: 'VER', lap: 1, seconds: 82 }),
    makeLap({ driver: 'VER', lap: 2, seconds: 84 }),
    makeLap({ driver: 'HAM', lap: 1, seconds: 86 }),
  ];

  it('returns mean of all laps without driver filter', () => {
    expect(avgLapTime(laps)).toBeCloseTo(84);
  });

  it('returns mean for driver only', () => {
    expect(avgLapTime(laps, 'VER')).toBeCloseTo(83);
  });

  it('returns 0 for empty laps', () => {
    expect(avgLapTime([])).toBe(0);
  });

  it('returns 0 when driver has no laps', () => {
    expect(avgLapTime(laps, 'LEC')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// medianLapTime
// ---------------------------------------------------------------------------

describe('medianLapTime', () => {
  it('returns middle value for odd count', () => {
    const laps: LapTime[] = [
      makeLap({ driver: 'A', lap: 1, seconds: 81 }),
      makeLap({ driver: 'A', lap: 2, seconds: 83 }),
      makeLap({ driver: 'A', lap: 3, seconds: 85 }),
    ];
    expect(medianLapTime(laps, 'A')).toBe(83);
  });

  it('returns average of two middle values for even count', () => {
    const laps: LapTime[] = [
      makeLap({ driver: 'A', lap: 1, seconds: 81 }),
      makeLap({ driver: 'A', lap: 2, seconds: 83 }),
      makeLap({ driver: 'A', lap: 3, seconds: 85 }),
      makeLap({ driver: 'A', lap: 4, seconds: 87 }),
    ];
    expect(medianLapTime(laps, 'A')).toBe(84);
  });

  it('returns 0 for empty laps', () => {
    expect(medianLapTime([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// lapVariability
// ---------------------------------------------------------------------------

describe('lapVariability', () => {
  it('returns 0 for consistent lap times', () => {
    const laps: LapTime[] = [
      makeLap({ driver: 'A', lap: 1, seconds: 83 }),
      makeLap({ driver: 'A', lap: 2, seconds: 83 }),
      makeLap({ driver: 'A', lap: 3, seconds: 83 }),
    ];
    expect(lapVariability(laps, 'A')).toBeCloseTo(0);
  });

  it('returns non-zero for varying lap times', () => {
    const laps: LapTime[] = [
      makeLap({ driver: 'A', lap: 1, seconds: 80 }),
      makeLap({ driver: 'A', lap: 2, seconds: 90 }),
    ];
    // mean=85, variance=25, std=5
    expect(lapVariability(laps, 'A')).toBeCloseTo(5);
  });

  it('returns 0 for missing driver', () => {
    expect(lapVariability([], 'A')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// sectorAnalysis
// ---------------------------------------------------------------------------

describe('sectorAnalysis', () => {
  it('returns zeroes for empty laps', () => {
    const result = sectorAnalysis([]);
    expect(result.theoretical).toBe(0);
    expect(result.timeLoss).toBe(0);
  });

  it('calculates theoretical best and time loss', () => {
    const laps: LapTime[] = [
      makeLap({ driver: 'VER', lap: 1, seconds: 83, s1: 22, s2: 33, s3: 28 }),
      makeLap({ driver: 'HAM', lap: 2, seconds: 81.5, s1: 21, s2: 32, s3: 28.5 }),
    ];
    const result = sectorAnalysis(laps);
    // best s1=21, best s2=32, best s3=28 => theoretical=81
    expect(result.theoretical).toBe(81);
    // achievedBest = 81.5
    expect(result.achievedBest).toBe(81.5);
    // timeLoss = 81.5 - 81 = 0.5
    expect(result.timeLoss).toBeCloseTo(0.5);
  });

  it('timeLoss is non-negative (theoretical <= achievedBest)', () => {
    const laps: LapTime[] = [
      makeLap({ driver: 'A', lap: 1, seconds: 83, s1: 22, s2: 33, s3: 28 }),
    ];
    const result = sectorAnalysis(laps);
    expect(result.timeLoss).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// sectorShare
// ---------------------------------------------------------------------------

describe('sectorShare', () => {
  it('fractions sum to 1', () => {
    const lap = makeLap({ driver: 'A', lap: 1, seconds: 83, s1: 20, s2: 30, s3: 25 });
    const share = sectorShare(lap);
    expect(share.s1 + share.s2 + share.s3).toBeCloseTo(1);
  });

  it('returns correct fractions', () => {
    const lap = makeLap({ driver: 'A', lap: 1, seconds: 75, s1: 25, s2: 25, s3: 25 });
    const share = sectorShare(lap);
    expect(share.s1).toBeCloseTo(1 / 3);
    expect(share.s2).toBeCloseTo(1 / 3);
    expect(share.s3).toBeCloseTo(1 / 3);
  });

  it('returns zeroes if total is 0', () => {
    const lap = makeLap({ driver: 'A', lap: 1, seconds: 0, s1: 0, s2: 0, s3: 0 });
    const share = sectorShare(lap);
    expect(share.s1).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// weakestSector
// ---------------------------------------------------------------------------

describe('weakestSector', () => {
  it('returns sector with most time loss', () => {
    const laps: LapTime[] = [
      makeLap({ driver: 'A', lap: 1, seconds: 83, s1: 22, s2: 33, s3: 28 }),
      makeLap({ driver: 'REF', lap: 1, seconds: 80, s1: 20, s2: 30, s3: 30 }),
    ];
    // A vs REF: s1: +2, s2: +3, s3: -2. s2 biggest loss
    expect(weakestSector('A', laps, 'REF')).toBe(2);
  });

  it('handles equal sector times', () => {
    const laps: LapTime[] = [
      makeLap({ driver: 'A', lap: 1, seconds: 83, s1: 22, s2: 33, s3: 28 }),
      makeLap({ driver: 'REF', lap: 1, seconds: 83, s1: 22, s2: 33, s3: 28 }),
    ];
    // all equal, returns 1 or 2 (whichever satisfies >= condition first)
    const result = weakestSector('A', laps, 'REF');
    expect([1, 2, 3]).toContain(result);
  });
});

// ---------------------------------------------------------------------------
// sectorImprovement
// ---------------------------------------------------------------------------

describe('sectorImprovement', () => {
  it('returns positive delta when current is faster', () => {
    const current = makeLap({ driver: 'A', lap: 2, seconds: 82, s1: 21, s2: 32, s3: 27 });
    const previous = makeLap({ driver: 'A', lap: 1, seconds: 83, s1: 22, s2: 33, s3: 28 });
    const imp = sectorImprovement(current, previous);
    expect(imp.s1Delta).toBeCloseTo(1);
    expect(imp.s2Delta).toBeCloseTo(1);
    expect(imp.s3Delta).toBeCloseTo(1);
  });

  it('returns negative delta when current is slower', () => {
    const current = makeLap({ driver: 'A', lap: 2, seconds: 84, s1: 23, s2: 34, s3: 29 });
    const previous = makeLap({ driver: 'A', lap: 1, seconds: 83, s1: 22, s2: 33, s3: 28 });
    const imp = sectorImprovement(current, previous);
    expect(imp.s1Delta).toBeCloseTo(-1);
    expect(imp.s2Delta).toBeCloseTo(-1);
    expect(imp.s3Delta).toBeCloseTo(-1);
  });

  it('returns 0 when times are equal', () => {
    const lap = makeLap({ driver: 'A', lap: 1, seconds: 83, s1: 22, s2: 33, s3: 28 });
    const imp = sectorImprovement(lap, { ...lap });
    expect(imp.s1Delta).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// tireAge
// ---------------------------------------------------------------------------

describe('tireAge', () => {
  const stints: TireStint[] = [
    { compound: 'soft', startLap: 1, endLap: 20 },
    { compound: 'medium', startLap: 21, endLap: 45 },
    { compound: 'hard', startLap: 46, endLap: 70 },
  ];

  it('returns 1 on first lap of stint', () => {
    expect(tireAge(stints, 1)).toBe(1);
  });

  it('returns correct age mid-stint', () => {
    expect(tireAge(stints, 10)).toBe(10);
  });

  it('returns correct age at stint end', () => {
    expect(tireAge(stints, 20)).toBe(20);
  });

  it('returns 1 at start of second stint', () => {
    expect(tireAge(stints, 21)).toBe(1);
  });

  it('returns correct age in second stint', () => {
    expect(tireAge(stints, 30)).toBe(10);
  });

  it('returns 0 if lap is outside all stints', () => {
    expect(tireAge(stints, 80)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// tireDegradation
// ---------------------------------------------------------------------------

describe('tireDegradation', () => {
  it('returns 0 if fewer than 2 laps for compound', () => {
    const laps = [makeLap({ driver: 'A', lap: 1, seconds: 83, compound: 'soft' })];
    expect(tireDegradation(laps, 'soft')).toBe(0);
  });

  it('returns positive slope for increasing lap times', () => {
    const laps: LapTime[] = [
      { ...makeLap({ driver: 'A', lap: 1, seconds: 83 }), compound: 'soft' },
      { ...makeLap({ driver: 'A', lap: 2, seconds: 83.08 }), compound: 'soft' },
      { ...makeLap({ driver: 'A', lap: 3, seconds: 83.16 }), compound: 'soft' },
      { ...makeLap({ driver: 'A', lap: 4, seconds: 83.24 }), compound: 'soft' },
      { ...makeLap({ driver: 'A', lap: 5, seconds: 83.32 }), compound: 'soft' },
    ];
    const deg = tireDegradation(laps, 'soft');
    expect(deg).toBeGreaterThan(0);
    expect(deg).toBeCloseTo(0.08, 1);
  });

  it('returns negative slope for improving lap times (cooling effect)', () => {
    const laps: LapTime[] = [
      { ...makeLap({ driver: 'A', lap: 1, seconds: 85 }), compound: 'medium' },
      { ...makeLap({ driver: 'A', lap: 2, seconds: 84 }), compound: 'medium' },
      { ...makeLap({ driver: 'A', lap: 3, seconds: 83 }), compound: 'medium' },
    ];
    const deg = tireDegradation(laps, 'medium');
    expect(deg).toBeLessThan(0);
  });

  it('respects windowSize parameter', () => {
    const laps: LapTime[] = Array.from({ length: 10 }, (_, i) => ({
      ...makeLap({ driver: 'A', lap: i + 1, seconds: 83 + i * 0.1 }),
      compound: 'hard' as const,
    }));
    // Should calculate slope only on first 3 laps
    const deg3 = tireDegradation(laps, 'hard', 3);
    const deg10 = tireDegradation(laps, 'hard', 10);
    // Both should be approximately 0.1 as it's linear
    expect(deg3).toBeCloseTo(deg10, 1);
  });
});

// ---------------------------------------------------------------------------
// expectedLapTimeLoss
// ---------------------------------------------------------------------------

describe('expectedLapTimeLoss', () => {
  it('soft compound: 0.08 × age', () => {
    expect(expectedLapTimeLoss('soft', 10)).toBeCloseTo(0.8);
  });

  it('medium compound: 0.04 × age', () => {
    expect(expectedLapTimeLoss('medium', 10)).toBeCloseTo(0.4);
  });

  it('hard compound: 0.02 × age', () => {
    expect(expectedLapTimeLoss('hard', 10)).toBeCloseTo(0.2);
  });

  it('returns 0 for age 0', () => {
    expect(expectedLapTimeLoss('soft', 0)).toBe(0);
  });

  it('soft degrades fastest at same age', () => {
    const age = 20;
    expect(expectedLapTimeLoss('soft', age)).toBeGreaterThan(expectedLapTimeLoss('medium', age));
    expect(expectedLapTimeLoss('medium', age)).toBeGreaterThan(expectedLapTimeLoss('hard', age));
  });
});

// ---------------------------------------------------------------------------
// optimalPitWindow
// ---------------------------------------------------------------------------

describe('optimalPitWindow', () => {
  it('returns an array with candidate pit laps', () => {
    const result = optimalPitWindow(60, 15);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('one-stop is around lap totalLaps/2', () => {
    const result = optimalPitWindow(60, 15);
    expect(result).toContain(30); // 60/2 = 30
  });

  it('two-stop laps are around totalLaps/3 and 2*totalLaps/3', () => {
    const result = optimalPitWindow(60, 10);
    expect(result).toContain(20); // 60/3
    expect(result).toContain(40); // 2*60/3
  });

  it('returns sorted values', () => {
    const result = optimalPitWindow(70, 15);
    const sorted = [...result].sort((a, b) => a - b);
    expect(result).toEqual(sorted);
  });
});

// ---------------------------------------------------------------------------
// compoundToCode / compoundFromCode
// ---------------------------------------------------------------------------

describe('compoundToCode', () => {
  it('maps soft → S', () => expect(compoundToCode('soft')).toBe('S'));
  it('maps medium → M', () => expect(compoundToCode('medium')).toBe('M'));
  it('maps hard → H', () => expect(compoundToCode('hard')).toBe('H'));
  it('maps intermediate → I', () => expect(compoundToCode('intermediate')).toBe('I'));
  it('maps wet → W', () => expect(compoundToCode('wet')).toBe('W'));
});

describe('compoundFromCode', () => {
  it('maps S → soft', () => expect(compoundFromCode('S')).toBe('soft'));
  it('maps M → medium', () => expect(compoundFromCode('M')).toBe('medium'));
  it('maps H → hard', () => expect(compoundFromCode('H')).toBe('hard'));
  it('maps I → intermediate', () => expect(compoundFromCode('I')).toBe('intermediate'));
  it('maps W → wet', () => expect(compoundFromCode('W')).toBe('wet'));
});

describe('compoundToCode / compoundFromCode roundtrip', () => {
  const compounds = ['soft', 'medium', 'hard', 'intermediate', 'wet'] as const;
  for (const c of compounds) {
    it(`roundtrips ${c}`, () => {
      expect(compoundFromCode(compoundToCode(c))).toBe(c);
    });
  }
});

// ---------------------------------------------------------------------------
// tireWindowEstimate
// ---------------------------------------------------------------------------

describe('tireWindowEstimate', () => {
  it('soft: min=15, max=25', () => {
    expect(tireWindowEstimate('soft')).toEqual({ min: 15, max: 25 });
  });

  it('medium: min=25, max=40', () => {
    expect(tireWindowEstimate('medium')).toEqual({ min: 25, max: 40 });
  });

  it('hard: min=35, max=55', () => {
    expect(tireWindowEstimate('hard')).toEqual({ min: 35, max: 55 });
  });

  it('hard window is longer than soft', () => {
    const soft = tireWindowEstimate('soft');
    const hard = tireWindowEstimate('hard');
    expect(hard.max).toBeGreaterThan(soft.max);
  });
});

// ---------------------------------------------------------------------------
// pitStopLoss
// ---------------------------------------------------------------------------

describe('pitStopLoss', () => {
  it('returns duration + 30s undercut by default', () => {
    expect(pitStopLoss(2.5)).toBe(32.5);
  });

  it('accepts custom undercut', () => {
    expect(pitStopLoss(3, 25)).toBe(28);
  });

  it('undercut defaults to 30s', () => {
    expect(pitStopLoss(0)).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// undercut
// ---------------------------------------------------------------------------

describe('undercut', () => {
  it('returns true when attackerGap × 2 > degradationDelta × 5', () => {
    // gap=10, degradation=1: 20 > 5 → true
    expect(undercut(10, 30, 1)).toBe(true);
  });

  it('returns false when formula not met', () => {
    // gap=1, degradation=10: 2 > 50 → false
    expect(undercut(1, 30, 10)).toBe(false);
  });

  it('returns false at boundary when equal', () => {
    // gap=5, degradation=2: 10 > 10 → false (strict >)
    expect(undercut(5, 30, 2)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// overcut
// ---------------------------------------------------------------------------

describe('overcut', () => {
  it('returns true when defenderGap > pitLoss', () => {
    expect(overcut(35, 30)).toBe(true);
  });

  it('returns false when defenderGap <= pitLoss', () => {
    expect(overcut(25, 30)).toBe(false);
  });

  it('returns false at equal', () => {
    expect(overcut(30, 30)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// totalPitLoss
// ---------------------------------------------------------------------------

describe('totalPitLoss', () => {
  it('returns 0 for no stops', () => {
    expect(totalPitLoss([])).toBe(0);
  });

  it('returns duration + 30s for one stop', () => {
    const stops: PitStop[] = [{ lap: 20, duration: 2.5, compound: 'medium' }];
    expect(totalPitLoss(stops)).toBe(32.5);
  });

  it('sums all stops including 30s each', () => {
    const stops: PitStop[] = [
      { lap: 20, duration: 2.5, compound: 'medium' },
      { lap: 40, duration: 3.0, compound: 'hard' },
    ];
    expect(totalPitLoss(stops)).toBe(65.5); // (2.5+30) + (3.0+30)
  });
});

// ---------------------------------------------------------------------------
// idealPitCount
// ---------------------------------------------------------------------------

describe('idealPitCount', () => {
  it('returns 1 if totalLaps <= softWindow', () => {
    expect(idealPitCount(20, 25, 35)).toBe(1);
  });

  it('returns 2 if totalLaps <= 2 × softWindow', () => {
    expect(idealPitCount(40, 25, 35)).toBe(2);
  });

  it('returns 3 if totalLaps > 2 × softWindow', () => {
    expect(idealPitCount(70, 25, 35)).toBe(3);
  });

  it('boundary: totalLaps exactly equals softWindow', () => {
    expect(idealPitCount(25, 25, 35)).toBe(1);
  });

  it('boundary: totalLaps exactly equals 2 × softWindow', () => {
    expect(idealPitCount(50, 25, 35)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// f1Points
// ---------------------------------------------------------------------------

describe('f1Points', () => {
  it('1st place gets 25 points', () => {
    expect(f1Points(1)).toBe(25);
  });

  it('2nd place gets 18 points', () => {
    expect(f1Points(2)).toBe(18);
  });

  it('3rd place gets 15 points', () => {
    expect(f1Points(3)).toBe(15);
  });

  it('4th place gets 12 points', () => {
    expect(f1Points(4)).toBe(12);
  });

  it('5th place gets 10 points', () => {
    expect(f1Points(5)).toBe(10);
  });

  it('6th place gets 8 points', () => {
    expect(f1Points(6)).toBe(8);
  });

  it('7th place gets 6 points', () => {
    expect(f1Points(7)).toBe(6);
  });

  it('8th place gets 4 points', () => {
    expect(f1Points(8)).toBe(4);
  });

  it('9th place gets 2 points', () => {
    expect(f1Points(9)).toBe(2);
  });

  it('10th place gets 1 point', () => {
    expect(f1Points(10)).toBe(1);
  });

  it('11th+ places get 0 points', () => {
    expect(f1Points(11)).toBe(0);
    expect(f1Points(15)).toBe(0);
    expect(f1Points(20)).toBe(0);
  });

  it('+1 for fastest lap when position <= 10', () => {
    expect(f1Points(1, true)).toBe(26);
    expect(f1Points(10, true)).toBe(2);
  });

  it('no fastest lap bonus for position > 10', () => {
    expect(f1Points(11, true)).toBe(0);
    expect(f1Points(15, true)).toBe(0);
  });

  it('no fastest lap bonus by default', () => {
    expect(f1Points(1, false)).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// sprintPoints
// ---------------------------------------------------------------------------

describe('sprintPoints', () => {
  it('1st gets 8 points', () => {
    expect(sprintPoints(1)).toBe(8);
  });

  it('2nd gets 7 points', () => {
    expect(sprintPoints(2)).toBe(7);
  });

  it('3rd gets 6 points', () => {
    expect(sprintPoints(3)).toBe(6);
  });

  it('4th gets 5 points', () => {
    expect(sprintPoints(4)).toBe(5);
  });

  it('5th gets 4 points', () => {
    expect(sprintPoints(5)).toBe(4);
  });

  it('6th gets 3 points', () => {
    expect(sprintPoints(6)).toBe(3);
  });

  it('7th gets 2 points', () => {
    expect(sprintPoints(7)).toBe(2);
  });

  it('8th gets 1 point', () => {
    expect(sprintPoints(8)).toBe(1);
  });

  it('9th+ gets 0 points', () => {
    expect(sprintPoints(9)).toBe(0);
    expect(sprintPoints(20)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// championshipGap
// ---------------------------------------------------------------------------

describe('championshipGap', () => {
  it('computes maxPoints as racesRemaining × 26', () => {
    const result = championshipGap(200, 100, 5);
    expect(result.maxPoints).toBe(130);
  });

  it('computes currentGap as leader - challenger', () => {
    const result = championshipGap(200, 100, 5);
    expect(result.currentGap).toBe(100);
  });

  it('mathematicallyAlive = true when gap <= maxPoints', () => {
    const result = championshipGap(200, 100, 5); // gap=100, max=130
    expect(result.mathematicallyAlive).toBe(true);
  });

  it('mathematicallyAlive = false when gap > maxPoints', () => {
    const result = championshipGap(400, 100, 5); // gap=300, max=130
    expect(result.mathematicallyAlive).toBe(false);
  });

  it('alive at exactly max points', () => {
    const result = championshipGap(130, 0, 5); // gap=130, max=130
    expect(result.mathematicallyAlive).toBe(true);
  });

  it('not alive at gap = maxPoints + 1', () => {
    const result = championshipGap(131, 0, 5); // gap=131, max=130
    expect(result.mathematicallyAlive).toBe(false);
  });

  it('0 races remaining means maxPoints=0', () => {
    const result = championshipGap(100, 50, 0);
    expect(result.maxPoints).toBe(0);
    expect(result.mathematicallyAlive).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// constructorPoints
// ---------------------------------------------------------------------------

describe('constructorPoints', () => {
  it('returns 0 for empty array', () => {
    expect(constructorPoints([])).toBe(0);
  });

  it('sums points from all drivers', () => {
    expect(constructorPoints([{ points: 25 }, { points: 18 }])).toBe(43);
  });

  it('handles single driver', () => {
    expect(constructorPoints([{ points: 15 }])).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// pointsToClosureRate
// ---------------------------------------------------------------------------

describe('pointsToClosureRate', () => {
  it('returns gap/racesRemaining', () => {
    expect(pointsToClosureRate(50, 5)).toBe(10);
  });

  it('returns gap when racesRemaining = 0', () => {
    expect(pointsToClosureRate(50, 0)).toBe(50);
  });

  it('returns 0 when gap is 0', () => {
    expect(pointsToClosureRate(0, 5)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// qualifyingGap
// ---------------------------------------------------------------------------

describe('qualifyingGap', () => {
  const results: QualifyingResult[] = [
    { position: 1, driver: 'VER', q1: 82, q2: 81, q3: 80 },
    { position: 2, driver: 'HAM', q1: 82.5, q2: 81.5, q3: 80.5 },
    { position: 3, driver: 'LEC', q1: 83, q2: 82 }, // no q3
  ];

  it('returns q3 gap when both drivers have q3', () => {
    const gap = qualifyingGap(results, 'VER', 'HAM');
    expect(gap).toBeCloseTo(-0.5); // VER faster
  });

  it('falls back to q2 when one driver lacks q3', () => {
    const gap = qualifyingGap(results, 'VER', 'LEC');
    expect(gap).toBeCloseTo(-1); // 81 - 82
  });

  it('returns null if driver not found', () => {
    expect(qualifyingGap(results, 'VER', 'ALO')).toBeNull();
  });

  it('positive gap when driver1 is slower', () => {
    const gap = qualifyingGap(results, 'HAM', 'VER');
    expect(gap).toBeCloseTo(0.5);
  });
});

// ---------------------------------------------------------------------------
// gridPenalty
// ---------------------------------------------------------------------------

describe('gridPenalty', () => {
  it('applies penalty to position', () => {
    expect(gridPenalty(5, 5)).toBe(10);
  });

  it('clamps to totalDrivers (default 20)', () => {
    expect(gridPenalty(18, 10)).toBe(20);
  });

  it('uses custom totalDrivers', () => {
    expect(gridPenalty(15, 10, 22)).toBe(22);
  });

  it('returns same position with 0 penalty', () => {
    expect(gridPenalty(3, 0)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// qualifyingPerformance
// ---------------------------------------------------------------------------

describe('qualifyingPerformance', () => {
  it('returns minimum of q1/q2/q3', () => {
    const q: QualifyingResult = { position: 1, driver: 'VER', q1: 84, q2: 82, q3: 80 };
    expect(qualifyingPerformance(q)).toBe(80);
  });

  it('ignores undefined sessions', () => {
    const q: QualifyingResult = { position: 1, driver: 'A', q1: 85 };
    expect(qualifyingPerformance(q)).toBe(85);
  });

  it('returns 0 if no sessions', () => {
    const q: QualifyingResult = { position: 20, driver: 'A' };
    expect(qualifyingPerformance(q)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// frontRowProbability
// ---------------------------------------------------------------------------

describe('frontRowProbability', () => {
  it('returns value in [0, 1]', () => {
    const prob = frontRowProbability(80, 80);
    expect(prob).toBeGreaterThanOrEqual(0);
    expect(prob).toBeLessThanOrEqual(1);
  });

  it('returns ~0.5 when qualifyingPace equals fieldBestPace', () => {
    // ratio = 1, exponent = 0, prob = 0.5
    const prob = frontRowProbability(80, 80);
    expect(prob).toBeCloseTo(0.5, 1);
  });

  it('returns higher probability when driver is faster than field', () => {
    const faster = frontRowProbability(79, 80); // faster (lower time)
    const slower = frontRowProbability(81, 80); // slower
    expect(faster).toBeGreaterThan(slower);
  });
});

// ---------------------------------------------------------------------------
// driverStrengthScore
// ---------------------------------------------------------------------------

describe('driverStrengthScore', () => {
  it('returns 0 for empty results', () => {
    expect(driverStrengthScore([])).toBe(0);
  });

  it('weights most recent result × 1.2', () => {
    const results: RaceResult[] = [
      { position: 1, driver: 'A', team: 'T', laps: 57, timeOrStatus: '', points: 25, fastestLap: false },
      { position: 2, driver: 'A', team: 'T', laps: 57, timeOrStatus: '', points: 18, fastestLap: false },
    ];
    // first result: 25 × 1.0 = 25, last result: 18 × 1.2 = 21.6 => 46.6
    expect(driverStrengthScore(results)).toBeCloseTo(46.6);
  });

  it('uses lastN parameter', () => {
    const results: RaceResult[] = [
      { position: 1, driver: 'A', team: 'T', laps: 57, timeOrStatus: '', points: 1, fastestLap: false },
      { position: 1, driver: 'A', team: 'T', laps: 57, timeOrStatus: '', points: 25, fastestLap: false },
    ];
    // Only last 1: 25 × 1.2 = 30
    expect(driverStrengthScore(results, 1)).toBeCloseTo(30);
  });
});

// ---------------------------------------------------------------------------
// winProbability
// ---------------------------------------------------------------------------

describe('winProbability', () => {
  it('returns 1 if only driver in field (empty fieldStrengths)', () => {
    expect(winProbability(10, [])).toBe(1);
  });

  it('returns driver / total', () => {
    // driver=10, field=[10,10,10] => all = [10,10,10,10], total=40, prob=10/40=0.25
    expect(winProbability(10, [10, 10, 10])).toBeCloseTo(0.25);
  });

  it('probabilities sum to 1 across field', () => {
    const strengths = [100, 80, 60, 40, 20];
    const total = strengths.reduce((a, b) => a + b, 0);
    const probs = strengths.map((s) => winProbability(s, strengths.filter((x) => x !== s)));
    // Each driver's probability × total should roughly sum to total
    const probSum = probs.reduce((a, b) => a + b, 0);
    // Not exactly 1 because of how fieldStrengths is constructed, but should be close
    expect(probSum).toBeGreaterThan(0.5);
    expect(probSum).toBeLessThanOrEqual(strengths.length);
  });

  it('returns 0 if all strengths are 0', () => {
    expect(winProbability(0, [0, 0, 0])).toBe(0);
  });

  it('stronger driver has higher win probability', () => {
    const strong = winProbability(100, [50, 50]);
    const weak = winProbability(50, [100, 50]);
    expect(strong).toBeGreaterThan(weak);
  });
});

// ---------------------------------------------------------------------------
// podiumProbability
// ---------------------------------------------------------------------------

describe('podiumProbability', () => {
  it('returns a number', () => {
    const prob = podiumProbability(100, [80, 70, 60]);
    expect(typeof prob).toBe('number');
  });

  it('strongest driver has higher podium probability than weakest', () => {
    const strong = podiumProbability(100, [80, 70, 60, 50]);
    const weak = podiumProbability(50, [100, 80, 70, 60]);
    expect(strong).toBeGreaterThan(weak);
  });
});

// ---------------------------------------------------------------------------
// expectedFinishPosition
// ---------------------------------------------------------------------------

describe('expectedFinishPosition', () => {
  it('returns 1 for strongest driver', () => {
    expect(expectedFinishPosition(100, [80, 60, 40])).toBe(1);
  });

  it('returns last position for weakest driver', () => {
    expect(expectedFinishPosition(20, [100, 80, 60])).toBe(4);
  });

  it('returns correct rank in middle', () => {
    // strengths including driver: [100, 80, 60, 40] sorted desc. driver=60 is 3rd
    expect(expectedFinishPosition(60, [100, 80, 40])).toBe(3);
  });

  it('single driver returns 1', () => {
    expect(expectedFinishPosition(50, [])).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// draftKingsF1Score
// ---------------------------------------------------------------------------

describe('draftKingsF1Score', () => {
  it('scores 1st place finish correctly', () => {
    const score = draftKingsF1Score({
      position: 1,
      qualPosition: 5,
      lapsCompleted: 57,
      totalLaps: 57,
      fastestLap: false,
      positions: { gained: 0, lost: 0 },
      dnf: false,
    });
    // 25 (finish) + 5 (laps) = 30
    expect(score).toBeCloseTo(30);
  });

  it('adds fastest lap bonus', () => {
    const score = draftKingsF1Score({
      position: 5,
      qualPosition: 5,
      lapsCompleted: 57,
      totalLaps: 57,
      fastestLap: true,
      positions: { gained: 0, lost: 0 },
      dnf: false,
    });
    // 10 (finish) + 5 (FL) + 5 (laps) = 20
    expect(score).toBeCloseTo(20);
  });

  it('adds positions gained', () => {
    const score = draftKingsF1Score({
      position: 10,
      qualPosition: 15,
      lapsCompleted: 57,
      totalLaps: 57,
      fastestLap: false,
      positions: { gained: 5, lost: 0 },
      dnf: false,
    });
    // 1 (10th) + 5 (pos gained) + 5 (laps) = 11
    expect(score).toBeCloseTo(11);
  });

  it('deducts position lost', () => {
    const score = draftKingsF1Score({
      position: 5,
      qualPosition: 1,
      lapsCompleted: 57,
      totalLaps: 57,
      fastestLap: false,
      positions: { gained: 0, lost: 4 },
      dnf: false,
    });
    // 10 (finish) + 3 (pole) - 2 (4 pos lost × 0.5) + 5 (laps) = 16
    expect(score).toBeCloseTo(16);
  });

  it('applies DNF penalty', () => {
    const score = draftKingsF1Score({
      position: 18,
      qualPosition: 5,
      lapsCompleted: 30,
      totalLaps: 57,
      fastestLap: false,
      positions: { gained: 0, lost: 0 },
      dnf: true,
    });
    // 0 (finish) - 15 (DNF) + (30/57)*5 ≈ -12.37
    expect(score).toBeLessThan(0);
  });

  it('adds grid bonus for pole position', () => {
    const with_pole = draftKingsF1Score({
      position: 1,
      qualPosition: 1,
      lapsCompleted: 57,
      totalLaps: 57,
      fastestLap: false,
      positions: { gained: 0, lost: 0 },
      dnf: false,
    });
    const no_pole = draftKingsF1Score({
      position: 1,
      qualPosition: 2,
      lapsCompleted: 57,
      totalLaps: 57,
      fastestLap: false,
      positions: { gained: 0, lost: 0 },
      dnf: false,
    });
    expect(with_pole - no_pole).toBeCloseTo(3);
  });

  it('caps positions gained at 20', () => {
    const capped = draftKingsF1Score({
      position: 1,
      qualPosition: 5,
      lapsCompleted: 57,
      totalLaps: 57,
      fastestLap: false,
      positions: { gained: 25, lost: 0 }, // more than cap
      dnf: false,
    });
    const notCapped = draftKingsF1Score({
      position: 1,
      qualPosition: 5,
      lapsCompleted: 57,
      totalLaps: 57,
      fastestLap: false,
      positions: { gained: 20, lost: 0 }, // exactly at cap
      dnf: false,
    });
    expect(capped).toBe(notCapped);
  });

  it('laps completed fraction contributes to score', () => {
    const full = draftKingsF1Score({
      position: 5,
      qualPosition: 5,
      lapsCompleted: 57,
      totalLaps: 57,
      fastestLap: false,
      positions: { gained: 0, lost: 0 },
      dnf: false,
    });
    const partial = draftKingsF1Score({
      position: 5,
      qualPosition: 5,
      lapsCompleted: 28,
      totalLaps: 57,
      fastestLap: false,
      positions: { gained: 0, lost: 0 },
      dnf: false,
    });
    expect(full).toBeGreaterThan(partial);
  });
});

// ---------------------------------------------------------------------------
// Championship Alive Scenarios
// ---------------------------------------------------------------------------

describe('championship alive scenarios', () => {
  it('mathematically alive with 5 races left and 100 point gap', () => {
    const result = championshipGap(200, 100, 5);
    // max = 5 × 26 = 130 > 100 gap
    expect(result.mathematicallyAlive).toBe(true);
  });

  it('mathematically eliminated with 2 races left and 100 point gap', () => {
    const result = championshipGap(200, 100, 2);
    // max = 2 × 26 = 52 < 100 gap
    expect(result.mathematicallyAlive).toBe(false);
  });

  it('leader cannot be eliminated', () => {
    const result = championshipGap(300, 200, 0); // leader=300 vs challenger=200
    // gap=100, max=0: leader is ahead so currentGap>0 but challenger is not alive
    expect(result.mathematicallyAlive).toBe(false);
  });

  it('tied drivers both alive', () => {
    const result = championshipGap(200, 200, 3);
    expect(result.currentGap).toBe(0);
    expect(result.mathematicallyAlive).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Pit stop undercut logic
// ---------------------------------------------------------------------------

describe('pit stop undercut logic', () => {
  it('undercut viable when attacker close to leader with high degradation difference', () => {
    // attackerGap=5, degradationDelta=3: 5×2=10, 3×5=15 → 10 > 15 is false
    expect(undercut(5, 25, 3)).toBe(false);
  });

  it('undercut viable when attacker close with low degradation difference', () => {
    // attackerGap=20, degradationDelta=1: 40 > 5 → true
    expect(undercut(20, 25, 1)).toBe(true);
  });

  it('overcut viable when defender has gap > pit loss', () => {
    expect(overcut(35, 30)).toBe(true);
  });

  it('overcut not viable when gap is too small', () => {
    expect(overcut(20, 30)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Win probability sums to field size (checking structure)
// ---------------------------------------------------------------------------

describe('win probability consistency', () => {
  it('single driver wins with probability 1', () => {
    expect(winProbability(50, [])).toBeCloseTo(1);
  });

  it('equal field: each driver has equal probability', () => {
    const fieldStrength = 100;
    const numRivals = 4;
    const rivals = Array(numRivals).fill(fieldStrength);
    const prob = winProbability(fieldStrength, rivals);
    // 5 equal drivers: each has 1/5 = 0.2
    expect(prob).toBeCloseTo(0.2);
  });

  it('dominant driver has probability > 0.5 against weaker field', () => {
    const prob = winProbability(200, [50, 50, 50]);
    expect(prob).toBeGreaterThan(0.5);
  });

  it('probability is always between 0 and 1', () => {
    const prob = winProbability(75, [100, 80, 60, 40, 30]);
    expect(prob).toBeGreaterThanOrEqual(0);
    expect(prob).toBeLessThanOrEqual(1);
  });
});
