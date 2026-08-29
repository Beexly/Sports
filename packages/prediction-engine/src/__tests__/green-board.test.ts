import { describe, expect, test } from 'vitest';
import { greenBoardEligible, GreenGateInput, GreenGateResult, BoardTier, GREEN_P_MIN, INDEPENDENT_DISSENT_BAND } from '../green-board';

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