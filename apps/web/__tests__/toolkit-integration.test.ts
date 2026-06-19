import { describe, it, expect } from 'vitest';

import * as toolkit from '@/lib/toolkit';
import { sports, analytics, math, utils } from '@/lib/toolkit';

/**
 * Integration test for the cohesive analytics-toolkit layer.
 * Proves the namespaced domain barrels resolve and that a representative
 * function from each domain is reachable and behaves correctly through the
 * single `@/lib/toolkit` entry point.
 */
describe('analytics toolkit — cohesive layer', () => {
  it('exposes all four domain namespaces from the top-level entry', () => {
    expect(typeof toolkit.sports).toBe('object');
    expect(typeof toolkit.analytics).toBe('object');
    expect(typeof toolkit.math).toBe('object');
    expect(typeof toolkit.utils).toBe('object');
  });

  it('reaches sports libraries through the barrel', () => {
    expect(typeof sports.badmintonAnalytics).toBe('object');
    // rally-point to 21, win by 2
    expect(sports.badmintonAnalytics.gameWinner(21, 19)).toBe('a');
    expect(sports.badmintonAnalytics.gameWinner(19, 21)).toBe('b');
  });

  it('reaches math libraries through the barrel', () => {
    expect(math.numberTheory.gcd(48, 18)).toBe(6);
    expect(math.numberTheory.isPrime(7)).toBe(true);
    expect(math.numberTheory.isPrime(1)).toBe(false);
    // magnitude of 3+4i = 5
    expect(math.complexNumbers.magnitude({ re: 3, im: 4 })).toBe(5);
  });

  it('reaches utils libraries through the barrel', () => {
    // marathon distance in km
    expect(utils.unitConversion.milesToKm(1)).toBeCloseTo(1.609344, 5);
    expect(utils.unitConversion.celsiusToFahrenheit(0)).toBe(32);
    expect(utils.unitConversion.celsiusToFahrenheit(100)).toBe(212);
  });

  it('reaches analytics libraries through the barrel', () => {
    expect(analytics.retentionAnalytics.retentionRate(0, 100)).toBe(0);
    expect(analytics.retentionAnalytics.retentionRate(40, 100)).toBeCloseTo(0.4, 10);
    expect(analytics.retentionAnalytics.churnRate(40, 100)).toBeCloseTo(0.4, 10);
  });

  it('namespaces identically-named helpers without collision', () => {
    // Many sports libraries export `dkProjection`; via namespacing they coexist.
    expect(typeof sports.badmintonAnalytics.dkProjection).toBe('function');
    expect(typeof sports.curlingAnalytics.dkProjection).toBe('function');
    expect(typeof sports.triathlonAnalytics.dkProjection).toBe('function');
    // distinct namespaces, distinct functions
    expect(sports.badmintonAnalytics.dkProjection).not.toBe(
      sports.curlingAnalytics.dkProjection,
    );
  });

  it('exposes a substantial number of barreled modules per domain', () => {
    expect(Object.keys(sports).length).toBeGreaterThanOrEqual(40);
    expect(Object.keys(math).length).toBeGreaterThanOrEqual(30);
    expect(Object.keys(utils).length).toBeGreaterThanOrEqual(30);
    expect(Object.keys(analytics).length).toBeGreaterThanOrEqual(20);
  });
});
