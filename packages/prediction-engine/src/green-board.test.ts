import { describe, expect, test } from 'vitest';
import {
  greenBoardEligible,
  GREEN_P_MIN,
  PRIME_P_MIN,
  INDEPENDENT_DISSENT_BAND,
  type GreenGateInput,
  type GreenGateResult,
} from '../src/green-board';

describe('green-board constants', () => {
  test('GREEN_P_MIN = 0.70 (per dispatch §GB-1)', () => {
    expect(GREEN_P_MIN).toBe(0.70);
  });
  test('PRIME_P_MIN = 0.80 (per dispatch §GB-1 / doctrine §PRIME)', () => {
    expect(PRIME_P_MIN).toBe(0.80);
  });
  test('INDEPENDENT_DISSENT_BAND = 0.06 (per dispatch §GB-1, strict-greater)', () => {
    expect(INDEPENDENT_DISSENT_BAND).toBe(0.06);
  });
});

describe('greenBoardEligible', () => {
  const baseInput: GreenGateInput = {
    calibratedP: 0.75,
    bookmakerCount: 3,
    freshnessOk: true,
    independents: { elo: null, poisson: null, fpi: null },
    vetoFlags: [],
  };

  test('G1 boundary: 0.699 fails, 0.700 passes', () => {
    expect(greenBoardEligible({ ...baseInput, calibratedP: 0.699 }).green).toBe(false);
    expect(greenBoardEligible({ ...baseInput, calibratedP: 0.700 }).green).toBe(true);
  });

  test('G2: bookmakerCount >= 2 && freshnessOk', () => {
    // bookmakerCount = 1 fails
    expect(greenBoardEligible({ ...baseInput, bookmakerCount: 1 }).green).toBe(false);
    // freshnessOk = false fails
    expect(greenBoardEligible({ ...baseInput, freshnessOk: false }).green).toBe(false);
    // both pass
    expect(greenBoardEligible({ ...baseInput, bookmakerCount: 2, freshnessOk: true }).green).toBe(true);
  });

  test('G3: independent dissent band (elo trigger)', () => {
    // present independent more than 0.06 below calibratedP -> veto
    const input = { ...baseInput, independents: { elo: 0.68, poisson: null, fpi: null } }; // 0.75 - 0.68 = 0.07 > 0.06
    expect(greenBoardEligible(input).green).toBe(false);
    // at exactly the band edge (0.06) is not a veto (since > 6pts under p* = veto, so strictly greater)
    const inputEdge = { ...baseInput, independents: { elo: 0.69, poisson: null, fpi: null } }; // 0.75 - 0.69 = 0.06
    expect(greenBoardEligible(inputEdge).green).toBe(true);
    // absent independents are not a veto
    expect(greenBoardEligible(baseInput).green).toBe(true);
  });

  test('G3: poisson dissent trigger (gap > band)', () => {
    // 0.75 - 0.67 = 0.08 > 0.06 → veto
    const input = { ...baseInput, independents: { elo: null, poisson: 0.67, fpi: null } };
    expect(greenBoardEligible(input).green).toBe(false);
  });

  test('G3: fpi dissent trigger (gap > band)', () => {
    const input = { ...baseInput, independents: { elo: null, poisson: null, fpi: 0.65 } }; // 0.75 - 0.65 = 0.10 > 0.06
    expect(greenBoardEligible(input).green).toBe(false);
  });

  test('G3: any present independent vetoes (only one needs to be off)', () => {
    // elo fine, poisson fine, fpi off — still vetoes
    const input = {
      ...baseInput,
      independents: { elo: 0.74, poisson: 0.73, fpi: 0.60 }, // fpi is 0.15 below
    };
    expect(greenBoardEligible(input).green).toBe(false);
  });

  test('G3: mixed present + absent — only present ones are scored', () => {
    // elo present and off, poisson absent, fpi present and on — elo vetoes
    const veto = {
      ...baseInput,
      independents: { elo: 0.60, poisson: null, fpi: 0.74 },
    };
    expect(greenBoardEligible(veto).green).toBe(false);
    // elo present and OK, poisson absent, fpi present and OK — passes
    const pass = {
      ...baseInput,
      independents: { elo: 0.70, poisson: null, fpi: 0.74 },
    };
    expect(greenBoardEligible(pass).green).toBe(true);
  });

  test('G4: vetoFlags empty', () => {
    expect(greenBoardEligible({ ...baseInput, vetoFlags: ['REST_DEFICIT'] }).green).toBe(false);
    expect(greenBoardEligible({ ...baseInput, vetoFlags: [] }).green).toBe(true);
  });

  test('G4: any non-empty vetoFlags fails the gate (length 2)', () => {
    const input = { ...baseInput, vetoFlags: ['REST_DEFICIT', 'HIGH_WIND_TOTAL'] };
    const result = greenBoardEligible(input);
    expect(result.green).toBe(false);
    expect(result.reasons).toContain('G4');
  });

  test('tier assignment — PRIME when p ≥ 0.80 and all gates pass', () => {
    const primeInput = { ...baseInput, calibratedP: 0.80 };
    expect(greenBoardEligible(primeInput).tier).toBe('PRIME');
  });

  test('tier assignment — GREEN when 0.70 ≤ p < 0.80 and all gates pass', () => {
    const greenInput = { ...baseInput, calibratedP: 0.75 };
    expect(greenBoardEligible(greenInput).tier).toBe('GREEN');
  });

  test('tier assignment — null when p is GREEN-eligible but a gate fails', () => {
    // p = 0.85 (would be PRIME) but only 1 book — tier must be null
    const result = greenBoardEligible({ ...baseInput, calibratedP: 0.85, bookmakerCount: 1 });
    expect(result.tier).toBeNull();
    expect(result.green).toBe(false);
  });

  test('tier assignment — null when p = 0.799 (just below PRIME) but all other gates pass → still GREEN', () => {
    const result = greenBoardEligible({ ...baseInput, calibratedP: 0.799 });
    expect(result.tier).toBe('GREEN');
    expect(result.green).toBe(true);
  });

  test('tier assignment — null when p = 0.801 (just above PRIME) and all gates pass → PRIME', () => {
    const result = greenBoardEligible({ ...baseInput, calibratedP: 0.801 });
    expect(result.tier).toBe('PRIME');
  });

  test('reasons array — single-gate failures', () => {
    expect(greenBoardEligible({ ...baseInput, calibratedP: 0.69 }).reasons).toEqual(['G1']);
    expect(greenBoardEligible({ ...baseInput, bookmakerCount: 1 }).reasons).toEqual(['G2']);
    expect(greenBoardEligible({ ...baseInput, independents: { elo: 0.68, poisson: null, fpi: null } }).reasons).toEqual(['G3']);
    expect(greenBoardEligible({ ...baseInput, vetoFlags: ['TEST'] }).reasons).toEqual(['G4']);
  });

  test('reasons array — all four gates failing preserves order G1, G2, G3, G4', () => {
    const result = greenBoardEligible({
      calibratedP: 0.50, // G1
      bookmakerCount: 1, // G2
      freshnessOk: false, // G2 (already)
      independents: { elo: 0.30, poisson: 0.20, fpi: 0.10 }, // G3
      vetoFlags: ['X'], // G4
    });
    expect(result.reasons).toEqual(['G1', 'G2', 'G3', 'G4']);
    expect(result.green).toBe(false);
    expect(result.tier).toBeNull();
  });

  test('reasons array — G1 + G2 combination', () => {
    expect(
      greenBoardEligible({ ...baseInput, calibratedP: 0.69, bookmakerCount: 1 }).reasons
    ).toEqual(['G1', 'G2']);
  });

  test('reasons array — all pass collapses to ["GREEN"]', () => {
    expect(greenBoardEligible(baseInput).reasons).toEqual(['GREEN']);
  });

  test('NaN calibratedP fails G1 (defensive: the resolver should not produce NaN, but the predicate must not lie)', () => {
    const result = greenBoardEligible({ ...baseInput, calibratedP: NaN });
    expect(result.green).toBe(false);
    expect(result.reasons).toContain('G1');
  });

  test('non-finite calibratedP (-Infinity) fails G1', () => {
    const result = greenBoardEligible({ ...baseInput, calibratedP: -Infinity });
    expect(result.green).toBe(false);
    expect(result.reasons).toContain('G1');
  });

  test('NaN independent is treated as absent (honest miss, not a veto)', () => {
    const result = greenBoardEligible({
      ...baseInput,
      independents: { elo: NaN, poisson: null, fpi: null },
    });
    // No present independents → G3 does not fire
    expect(result.green).toBe(true);
    expect(result.reasons).toEqual(['GREEN']);
  });

  test('non-finite independent is treated as absent (no veto, no boost)', () => {
    const result = greenBoardEligible({
      ...baseInput,
      independents: { elo: Infinity, poisson: null, fpi: null },
    });
    expect(result.green).toBe(true);
  });

  test('is pure — calling twice with the same input returns the same result', () => {
    const a: GreenGateResult = greenBoardEligible(baseInput);
    const b: GreenGateResult = greenBoardEligible(baseInput);
    expect(a).toEqual(b);
  });

  test('reasons array is a fresh array per call (no shared mutable state)', () => {
    const a = greenBoardEligible({ ...baseInput, calibratedP: 0.5 });
    const b = greenBoardEligible({ ...baseInput, calibratedP: 0.5 });
    expect(a.reasons).not.toBe(b.reasons);
    expect(a.reasons).toEqual(b.reasons);
  });
});
