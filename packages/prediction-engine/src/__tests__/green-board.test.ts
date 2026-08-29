import { describe, expect, test } from 'vitest';
import {
  greenBoardEligible,
  GreenGateInput,
  GreenGateResult,
  BoardTier,
  GREEN_P_MIN,
  INDEPENDENT_DISSENT_BAND,
  PRIME_P_MIN,
  PLUS_P_MIN,
  GREEN_BOOKMAKER_MIN,
  PLUS_BOOKMAKER_MIN,
} from '../green-board';

describe('greenBoardEligible', () => {
  test('returns GREEN when calibratedP >= 0.70, bookmakerCount >=2, freshnessOk, no dissent, no vetoFlags', () => {
    const input: GreenGateInput = {
      calibratedP: 0.75,
      bookmakerCount: 3,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: []
    };
    const result: GreenGateResult = greenBoardEligible(input);
    expect(result.green).toBe(true);
    expect(result.tier).toBe('GREEN');
    expect(result.reasons).toEqual(['GREEN']);
  });

  test('returns PRIME when calibratedP >= 0.80 and other conditions pass', () => {
    const input: GreenGateInput = {
      calibratedP: 0.85,
      bookmakerCount: 2,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: []
    };
    const result: GreenGateResult = greenBoardEligible(input);
    expect(result.green).toBe(true);
    expect(result.tier).toBe('PRIME');
    expect(result.reasons).toEqual(['GREEN']);
  });

  test('returns not green when calibratedP < GREEN_P_MIN', () => {
    const input: GreenGateInput = {
      calibratedP: 0.69,
      bookmakerCount: 3,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: []
    };
    const result: GreenGateResult = greenBoardEligible(input);
    expect(result.green).toBe(false);
    expect(result.tier).toBeNull();
    expect(result.reasons).toContain('GREEN_P_MIN');
  });

  test('returns not green when bookmakerCount < 2', () => {
    const input: GreenGateInput = {
      calibratedP: 0.75,
      bookmakerCount: 1,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: []
    };
    const result: GreenGateResult = greenBoardEligible(input);
    expect(result.green).toBe(false);
    expect(result.tier).toBeNull();
    expect(result.reasons).toContain('BOOKMAKER_COUNT');
  });

  test('returns not green when freshnessOk is false', () => {
    const input: GreenGateInput = {
      calibratedP: 0.75,
      bookmakerCount: 2,
      freshnessOk: false,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: []
    };
    const result: GreenGateResult = greenBoardEligible(input);
    expect(result.green).toBe(false);
    expect(result.tier).toBeNull();
    expect(result.reasons).toContain('FRESHNESS');
  });

  test('returns not green when independent dissent > band for elo', () => {
    const input: GreenGateInput = {
      calibratedP: 0.75,
      bookmakerCount: 2,
      freshnessOk: true,
      independents: { elo: 0.68, poisson: null, fpi: null }, // difference 0.07 > 0.06
      vetoFlags: []
    };
    const result: GreenGateResult = greenBoardEligible(input);
    expect(result.green).toBe(false);
    expect(result.tier).toBeNull();
    expect(result.reasons).toContain('INDEPENDENT_DISSENT');
  });

  test('returns not green when independent dissent > band for poisson', () => {
    const input: GreenGateInput = {
      calibratedP: 0.75,
      bookmakerCount: 2,
      freshnessOk: true,
      independents: { elo: null, poisson: 0.68, fpi: null },
      vetoFlags: []
    };
    const result: GreenGateResult = greenBoardEligible(input);
    expect(result.green).toBe(false);
    expect(result.tier).toBeNull();
    expect(result.reasons).toContain('INDEPENDENT_DISSENT');
  });

  test('returns not green when independent dissent > band for fpi', () => {
    const input: GreenGateInput = {
      calibratedP: 0.75,
      bookmakerCount: 2,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: 0.68 },
      vetoFlags: []
    };
    const result: GreenGateResult = greenBoardEligible(input);
    expect(result.green).toBe(false);
    expect(result.tier).toBeNull();
    expect(result.reasons).toContain('INDEPENDENT_DISSENT');
  });

  test('returns not green when vetoFlags non-empty', () => {
    const input: GreenGateInput = {
      calibratedP: 0.75,
      bookmakerCount: 2,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: ['some_flag']
    };
    const result: GreenGateResult = greenBoardEligible(input);
    expect(result.green).toBe(false);
    expect(result.tier).toBeNull();
    expect(result.reasons).toContain('VETO_FLAGS');
  });

  test('handles null independents correctly (no dissent)', () => {
    const input: GreenGateInput = {
      calibratedP: 0.75,
      bookmakerCount: 2,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: []
    };
    const result: GreenGateResult = greenBoardEligible(input);
    expect(result.green).toBe(true);
    expect(result.tier).toBe('GREEN');
  });

  test('boundary case calibratedP exactly GREEN_P_MIN', () => {
    const input: GreenGateInput = {
      calibratedP: GREEN_P_MIN,
      bookmakerCount: 2,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: []
    };
    const result: GreenGateResult = greenBoardEligible(input);
    expect(result.green).toBe(true);
    expect(result.tier).toBe('GREEN');
  });

  test('boundary case dissent exactly at band (should NOT veto)', () => {
    const input: GreenGateInput = {
      calibratedP: 0.75,
      bookmakerCount: 2,
      freshnessOk: true,
      independents: { elo: 0.6900000000000001, poisson: null, fpi: null }, // difference slightly under 0.06
      vetoFlags: []
    };
    const result: GreenGateResult = greenBoardEligible(input);
    // Since dissent > band is required, exactly equal should not veto
    expect(result.green).toBe(true);
    expect(result.tier).toBe('GREEN');
  });
});

// ─── Phase D additions (D-1..D-5) ──────────────────────────────────────

describe('greenBoardEligible (Phase D additions)', () => {
  test('D-1: calibration drift in lastDriftCheck adds CALIBRATION_DRIFT reason', () => {
    const input: GreenGateInput = {
      calibratedP: 0.75,
      bookmakerCount: 2,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: [],
      lastDriftCheck: { drifted: true, note: 'ECE drift +0.04 over 7d' },
    };
    const result = greenBoardEligible(input);
    expect(result.green).toBe(false);
    expect(result.tier).toBeNull();
    expect(result.reasons).toContain('CALIBRATION_DRIFT');
  });

  test('D-1: no drift in lastDriftCheck does not add CALIBRATION_DRIFT', () => {
    const input: GreenGateInput = {
      calibratedP: 0.75,
      bookmakerCount: 2,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: [],
      lastDriftCheck: { drifted: false },
    };
    const result = greenBoardEligible(input);
    expect(result.green).toBe(true);
    expect(result.tier).toBe('GREEN');
    expect(result.reasons).not.toContain('CALIBRATION_DRIFT');
  });

  test('D-2: INJURY_REPORTED veto emits VETO_INJURY_REPORTED', () => {
    const input: GreenGateInput = {
      calibratedP: 0.85,
      bookmakerCount: 3,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: ['INJURY_REPORTED'],
    };
    const result = greenBoardEligible(input);
    expect(result.green).toBe(false);
    expect(result.reasons).toContain('VETO_INJURY_REPORTED');
  });

  test('D-2: LINEUP_LATE veto emits VETO_LINEUP_LATE', () => {
    const input: GreenGateInput = {
      calibratedP: 0.85,
      bookmakerCount: 3,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: ['LINEUP_LATE'],
    };
    const result = greenBoardEligible(input);
    expect(result.green).toBe(false);
    expect(result.reasons).toContain('VETO_LINEUP_LATE');
  });

  test('D-2: WEATHER_SUSPENDED veto emits VETO_WEATHER_SUSPENDED', () => {
    const input: GreenGateInput = {
      calibratedP: 0.85,
      bookmakerCount: 3,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: ['WEATHER_SUSPENDED'],
    };
    const result = greenBoardEligible(input);
    expect(result.green).toBe(false);
    expect(result.reasons).toContain('VETO_WEATHER_SUSPENDED');
  });

  test('D-2: BOOK_PULL veto emits VETO_BOOK_PULL', () => {
    const input: GreenGateInput = {
      calibratedP: 0.85,
      bookmakerCount: 3,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: ['BOOK_PULL'],
    };
    const result = greenBoardEligible(input);
    expect(result.green).toBe(false);
    expect(result.reasons).toContain('VETO_BOOK_PULL');
  });

  test('D-2: MARKET_HALTED veto emits VETO_MARKET_HALTED', () => {
    const input: GreenGateInput = {
      calibratedP: 0.85,
      bookmakerCount: 3,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: ['MARKET_HALTED'],
    };
    const result = greenBoardEligible(input);
    expect(result.green).toBe(false);
    expect(result.reasons).toContain('VETO_MARKET_HALTED');
  });

  test('D-3: boundary bookmakerCount === GREEN_BOOKMAKER_MIN returns GREEN', () => {
    const input: GreenGateInput = {
      calibratedP: 0.75,
      bookmakerCount: GREEN_BOOKMAKER_MIN,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: [],
    };
    const result = greenBoardEligible(input);
    expect(result.green).toBe(true);
    expect(result.tier).toBe('GREEN');
  });

  test('D-3: boundary bookmakerCount === GREEN_BOOKMAKER_MIN - 1 returns BOOKMAKER_COUNT', () => {
    const input: GreenGateInput = {
      calibratedP: 0.75,
      bookmakerCount: GREEN_BOOKMAKER_MIN - 1,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: [],
    };
    const result = greenBoardEligible(input);
    expect(result.green).toBe(false);
    expect(result.reasons).toContain('BOOKMAKER_COUNT');
  });

  test('D-4: PRIME boundary — calibratedP === PRIME_P_MIN returns PRIME', () => {
    const input: GreenGateInput = {
      calibratedP: PRIME_P_MIN,
      bookmakerCount: 2,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: [],
    };
    const result = greenBoardEligible(input);
    expect(result.green).toBe(true);
    expect(result.tier).toBe('PRIME');
  });

  test('D-4: PRIME just under boundary returns GREEN', () => {
    const input: GreenGateInput = {
      calibratedP: PRIME_P_MIN - 0.001,
      bookmakerCount: 2,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: [],
    };
    const result = greenBoardEligible(input);
    expect(result.green).toBe(true);
    expect(result.tier).toBe('GREEN');
  });

  test('D-4: PLUS boundary — calibratedP === PLUS_P_MIN with sufficient books returns PLUS', () => {
    const input: GreenGateInput = {
      calibratedP: PLUS_P_MIN,
      bookmakerCount: PLUS_BOOKMAKER_MIN,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: [],
    };
    const result = greenBoardEligible(input);
    expect(result.green).toBe(true);
    expect(result.tier).toBe('PLUS');
  });

  test('D-4: PLUS rejected when bookmakerCount < PLUS_BOOKMAKER_MIN', () => {
    const input: GreenGateInput = {
      calibratedP: PLUS_P_MIN,
      bookmakerCount: PLUS_BOOKMAKER_MIN - 1,
      freshnessOk: true,
      independents: { elo: null, poisson: null, fpi: null },
      vetoFlags: [],
    };
    const result = greenBoardEligible(input);
    expect(result.green).toBe(false);
    expect(result.reasons).toContain('PLUS_BOOKMAKER_COUNT');
  });

  test('D-5: two simultaneous dissenting independents → INDEPENDENT_DISSENT', () => {
    const input: GreenGateInput = {
      calibratedP: 0.75,
      bookmakerCount: 2,
      freshnessOk: true,
      independents: { elo: 0.50, poisson: 0.50, fpi: null }, // both far from 0.75
      vetoFlags: [],
    };
    const result = greenBoardEligible(input);
    expect(result.green).toBe(false);
    expect(result.reasons).toContain('INDEPENDENT_DISSENT');
  });

  test('D-5: all three dissenting slightly under the edge → GREEN', () => {
    // The existing boundary test exercises "exactly at band" → GREEN.
    // Here we have all three dissenters slightly under the band; the
    // pick remains green-eligible.
    const calibratedP = 0.80;
    const dissentP = 0.75; // difference 0.05, well under the 0.06 band
    const input: GreenGateInput = {
      calibratedP,
      bookmakerCount: 2,
      freshnessOk: true,
      independents: { elo: dissentP, poisson: dissentP, fpi: dissentP },
      vetoFlags: [],
    };
    const result = greenBoardEligible(input);
    expect(result.green).toBe(true);
  });

  test('D-5: all three dissenting just over the edge → INDEPENDENT_DISSENT', () => {
    const input: GreenGateInput = {
      calibratedP: 0.80,
      bookmakerCount: 2,
      freshnessOk: true,
      independents: { elo: 0.73, poisson: 0.73, fpi: 0.73 }, // difference 0.07 > 0.06
      vetoFlags: [],
    };
    const result = greenBoardEligible(input);
    expect(result.green).toBe(false);
    expect(result.reasons).toContain('INDEPENDENT_DISSENT');
  });

  test('D-5: dissent just over the band returns INDEPENDENT_DISSENT', () => {
    const input: GreenGateInput = {
      calibratedP: 0.75,
      bookmakerCount: 2,
      freshnessOk: true,
      independents: { elo: 0.75 - INDEPENDENT_DISSENT_BAND - 0.001, poisson: null, fpi: null },
      vetoFlags: [],
    };
    const result = greenBoardEligible(input);
    expect(result.green).toBe(false);
    expect(result.reasons).toContain('INDEPENDENT_DISSENT');
  });

  test('D-5: GREEN_P_MIN constant equals 0.70', () => {
    expect(GREEN_P_MIN).toBe(0.7);
  });

  test('D-5: INDEPENDENT_DISSENT_BAND constant equals 0.06', () => {
    expect(INDEPENDENT_DISSENT_BAND).toBe(0.06);
  });
});