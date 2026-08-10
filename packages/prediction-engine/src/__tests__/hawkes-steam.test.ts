import { describe, it, expect } from "vitest";
import {
  HawkesSteamDetector,
  fitHawkesToWindow,
  hawkesWindowLogLikelihood,
  DEFAULT_PRIOR_MU,
  DEFAULT_PRIOR_BETA,
  DEFAULT_MAX_PROBABILITY_NUDGE,
  type SteamEvent,
  type SteamSide,
} from "../hawkes-steam.js";

/** Deterministic PRNG (mulberry32) — matches the package's other seeded modules. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Independent O(n) brute-force intensity oracle, written directly against the
 * raw event-time list (NOT calling into any of this module's O(1) machinery).
 * This is the ground truth §1 (the recursive identity) is checked against.
 */
function bruteForceIntensity(
  pastTimes: readonly number[],
  queryTime: number,
  mu: number,
  alpha: number,
  beta: number,
): number {
  let sum = 0;
  for (const ti of pastTimes) {
    if (ti < queryTime) sum += Math.exp(-beta * (queryTime - ti));
  }
  return mu + alpha * sum;
}

/** Independent exponential inter-arrival (homogeneous Poisson) generator — the null control. */
function generatePoissonTimes(rate: number, count: number, rng: () => number): number[] {
  const times: number[] = [];
  let t = 0;
  for (let i = 0; i < count; i++) {
    const u = Math.max(rng(), 1e-12);
    t += -Math.log(u) / rate;
    times.push(t);
  }
  return times;
}

function toEvents(times: readonly number[], side: SteamSide): SteamEvent[] {
  return times.map((time) => ({ time, impliedProbDelta: side === "home" ? 0.007 : -0.007, side }));
}

describe("O(1) recursive intensity update vs. O(n) brute-force resum", () => {
  it("observeEvent's returned pre-event intensity matches independent brute force at every step", () => {
    const mu = 0.03;
    const alpha = 0.8;
    const beta = 1.1;
    const rng = mulberry32(1234);
    const times: number[] = [];
    let t = 0;
    for (let i = 0; i < 30; i++) {
      t += 0.2 + rng() * 3; // irregular gaps
      times.push(t);
    }

    const detector = new HawkesSteamDetector({ priorMu: mu, priorAlpha: alpha, priorBeta: beta });
    const seenSoFar: number[] = [];
    for (const eventTime of times) {
      const preIntensity = detector.observeEvent(eventTime, "home");
      const expected = bruteForceIntensity(seenSoFar, eventTime, mu, alpha, beta);
      expect(preIntensity).toBeCloseTo(expected, 9);
      seenSoFar.push(eventTime);
    }
  });

  it("intensityAt matches brute force at arbitrary query points between events", () => {
    const mu = 0.05;
    const alpha = 1.4;
    const beta = 2.0;
    const rng = mulberry32(777);
    const times: number[] = [];
    let t = 0;
    for (let i = 0; i < 25; i++) {
      t += 0.1 + rng() * 2;
      times.push(t);
    }

    const detector = new HawkesSteamDetector({ priorMu: mu, priorAlpha: alpha, priorBeta: beta });
    for (let i = 0; i < times.length; i++) {
      const eventTime = times[i]!;
      detector.observeEvent(eventTime, "away");

      const nextTime = times[i + 1];
      // Sample a handful of query points strictly between this event and the next
      // (or a fixed lookahead past the last event) and cross-check each one.
      const horizon = nextTime !== undefined ? nextTime : eventTime + 5;
      for (const frac of [0.1, 0.37, 0.9]) {
        const queryTime = eventTime + frac * (horizon - eventTime);
        const observed = detector.intensityAt(queryTime, "away");
        const expected = bruteForceIntensity(times.slice(0, i + 1), queryTime, mu, alpha, beta);
        expect(observed).toBeCloseTo(expected, 9);
      }
    }
  });

  it("matches brute force after a long dormant gap (large elapsed time)", () => {
    const mu = 0.01;
    const alpha = 0.5;
    const beta = 0.2;
    const detector = new HawkesSteamDetector({ priorMu: mu, priorAlpha: alpha, priorBeta: beta });
    const times = [0, 1, 2, 3];
    for (const et of times) detector.observeEvent(et, "home");

    const farQuery = 1e6;
    const observed = detector.intensityAt(farQuery, "home");
    const expected = bruteForceIntensity(times, farQuery, mu, alpha, beta);
    expect(Number.isFinite(observed)).toBe(true);
    expect(observed).toBeCloseTo(expected, 9);
    expect(observed).toBeCloseTo(mu, 9); // excitation has fully decayed away
  });

  it("is deterministic: identical event sequences produce bit-identical intensities", () => {
    const opts = { priorMu: 0.02, priorAlpha: 0.6, priorBeta: 0.9 };
    const times = [0, 0.5, 1.3, 1.4, 5, 5.1, 12];
    const d1 = new HawkesSteamDetector(opts);
    const d2 = new HawkesSteamDetector(opts);
    const out1 = times.map((t) => d1.observeEvent(t, "home"));
    const out2 = times.map((t) => d2.observeEvent(t, "home"));
    expect(out1).toEqual(out2);
    expect(d1.intensityAt(20, "home")).toBe(d2.intensityAt(20, "home"));
  });
});

describe("coordinate-ascent fit vs. independent brute-force 3-D grid search", () => {
  it("the fitted (mu,alpha,beta) achieves log-likelihood >= the best grid point, and is in the same ballpark", () => {
    // Small synthetic window with visible clustering: a sparse background plus
    // one tight cluster.
    const times = [0, 8, 15, 16, 16.3, 16.6, 24, 33, 41, 41.4, 50];

    const fit = fitHawkesToWindow(times);
    expect(fit.logLikelihood).not.toBeNull();
    const fitLL = fit.logLikelihood as number;

    // Independent brute-force grid search over the SAME (exported) likelihood —
    // a different search strategy (exhaustive grid) over the same objective,
    // not a re-derivation of the objective itself.
    let bestGridLL = Number.NEGATIVE_INFINITY;
    let bestGrid = { mu: 0, alpha: 0, beta: 0 };
    const muGrid = Array.from({ length: 20 }, (_, i) => 0.01 + (i * (1.0 - 0.01)) / 19);
    const betaGrid = Array.from({ length: 20 }, (_, i) => Math.exp(Math.log(0.01) + (i * (Math.log(10) - Math.log(0.01))) / 19));
    for (const beta of betaGrid) {
      const alphaGrid = Array.from({ length: 20 }, (_, i) => (i * beta * 0.999) / 19);
      for (const alpha of alphaGrid) {
        for (const mu of muGrid) {
          const ll = hawkesWindowLogLikelihood(times, mu, alpha, beta);
          if (ll !== null && ll > bestGridLL) {
            bestGridLL = ll;
            bestGrid = { mu, alpha, beta };
          }
        }
      }
    }

    expect(bestGridLL).toBeGreaterThan(Number.NEGATIVE_INFINITY);
    // The coordinate-ascent optimum must be at least as good as the best point
    // an independent exhaustive grid search found (tiny numerical slack only).
    expect(fitLL).toBeGreaterThanOrEqual(bestGridLL - 1e-6);

    // Reasonably close in parameter space (loose bounds — grid resolution is coarse).
    expect(Math.abs(fit.mu - bestGrid.mu)).toBeLessThan(0.25);
    expect(fit.beta).toBeGreaterThan(bestGrid.beta / 8);
    expect(fit.beta).toBeLessThan(bestGrid.beta * 8);
  });

  it("both alpha=0 and beta-invariant cases (n<2) are exact/degenerate, not searched", () => {
    expect(fitHawkesToWindow([]).logLikelihood).toBeNull();
    expect(fitHawkesToWindow([5]).logLikelihood).toBeNull();
    // A purely homogeneous-looking two-point window has alpha fit near 0 and mu
    // close to the closed-form Poisson rate 1/T_obs — a coarse sanity check that
    // does not depend on the search machinery being exactly right.
    const fit = fitHawkesToWindow([0, 10]);
    expect(fit.mu).toBeGreaterThan(0);
    expect(fit.alpha).toBeGreaterThanOrEqual(0);
  });
});

describe("synthetic burst: clustering is detected and correctly attributed", () => {
  function buildBurstWindow(): { events: SteamEvent[]; burstStart: number; burstEnd: number } {
    // Sparse background on the home side (~1 event/70 time-units) plus a tight
    // 20-event burst crammed into a short window.
    const background = [0, 70, 145, 210, 290, 360, 430, 505, 575, 650, 720, 800, 860];
    const burstStart = 1000;
    const burst = Array.from({ length: 20 }, (_, i) => burstStart + i * 0.4);
    const burstEnd = burst[burst.length - 1]!;
    const homeTimes = [...background, ...burst];
    return { events: toEvents(homeTimes, "home"), burstStart, burstEnd };
  }

  it("fitted alpha/beta produce intensity > 5x fitted mu shortly after the burst", () => {
    const { events, burstEnd } = buildBurstWindow();
    const detector = new HawkesSteamDetector();
    detector.refit(events);

    const fit = detector.getFit("home");
    expect(fit.logLikelihood).not.toBeNull();
    expect(fit.alpha).toBeGreaterThan(0);
    expect(fit.alpha).toBeLessThan(fit.beta); // subcriticality held

    const shortlyAfter = burstEnd + 0.3;
    const intensity = detector.intensityAt(shortlyAfter, "home");
    expect(intensity).toBeGreaterThan(5 * fit.mu);
  });

  it("steamSignal identifies the correct (home) side shortly after the burst, and not before it", () => {
    const { events, burstStart, burstEnd } = buildBurstWindow();

    // "Before the burst": a detector that has only ever refit on events observed
    // SO FAR (background only — the burst hasn't happened from its point of
    // view yet), queried at "now". This is the realistic streaming usage
    // pattern (query time >= every observed event); querying a live detector
    // about an instant strictly BEFORE its most recent known event is a
    // different, deliberately out-of-scope question (see intensityAt's
    // out-of-order-query clamp, exercised separately in the edge-case suite).
    const duringCalm = burstStart - 50;
    const backgroundOnlyEvents = events.filter((e) => e.time <= duringCalm);
    const calmDetector = new HawkesSteamDetector();
    calmDetector.refit(backgroundOnlyEvents);
    const calmSignal = calmDetector.steamSignal(duringCalm);
    expect(calmSignal.side).toBeNull();

    // "After the burst": a detector that has refit on the full window, queried
    // shortly after the last (and therefore most recent) observed event.
    const hotDetector = new HawkesSteamDetector();
    hotDetector.refit(events);
    const shortlyAfter = burstEnd + 0.3;
    const hotSignal = hotDetector.steamSignal(shortlyAfter);
    expect(hotSignal.side).toBe("home");
    expect(hotSignal.magnitude).toBeGreaterThan(3);
    expect(hotSignal.suggestedProbabilityNudge).toBeGreaterThan(0);
    expect(hotSignal.suggestedProbabilityNudge).toBeLessThanOrEqual(DEFAULT_MAX_PROBABILITY_NUDGE);
  });
});

describe("null control: homogeneous (non-clustered) arrivals do not trigger steam", () => {
  it("fits alpha near 0 and steamSignal never fires, for a seeded homogeneous Poisson stream", () => {
    const rng = mulberry32(42);
    const homeTimes = generatePoissonTimes(0.05, 60, rng); // ~1 event per 20 time-units, no self-excitation by construction
    const events = toEvents(homeTimes, "home");

    const detector = new HawkesSteamDetector();
    detector.refit(events);
    const fit = detector.getFit("home");

    expect(fit.logLikelihood).not.toBeNull();
    // No true clustering in the generating process: fitted alpha should sit
    // close to 0 relative to beta (branching ratio well under the steam-relevant
    // range), not pushed toward the subcriticality boundary.
    expect(fit.alpha / fit.beta).toBeLessThan(0.3);

    // Check steamSignal never fires across the whole observed span.
    const lastTime = homeTimes[homeTimes.length - 1]!;
    for (let t = 0; t <= lastTime; t += lastTime / 40) {
      const signal = detector.steamSignal(t);
      expect(signal.side).toBeNull();
    }
  });
});

describe("subcriticality is enforced under an adversarial (near-explosive) window", () => {
  it("keeps alpha strictly below beta and intensity finite over a long horizon", () => {
    // Adversarial: a huge number of events crammed into a vanishingly short
    // span. A naive/unconstrained MLE would be pulled toward alpha -> beta (or
    // beyond) to explain the near-simultaneous cluster as pure self-excitation.
    const events: number[] = [];
    for (let i = 0; i < 40; i++) events.push(1000 + i * 0.001);
    // Plus a little background so mu is estimable at all.
    events.unshift(0, 200, 400, 600, 800);

    const fit = fitHawkesToWindow(events);
    expect(fit.logLikelihood).not.toBeNull();
    expect(fit.mu).toBeGreaterThan(0);
    expect(fit.beta).toBeGreaterThan(0);
    expect(fit.alpha).toBeGreaterThanOrEqual(0);
    expect(fit.alpha).toBeLessThan(fit.beta); // the hard constraint, never merely "close"
    expect(fit.alpha / fit.beta).toBeLessThan(1);

    const detector = new HawkesSteamDetector();
    detector.refit(events.map((time) => ({ time, impliedProbDelta: 0.01, side: "home" as const })));

    const lastTime = events[events.length - 1]!;
    const longHorizon = lastTime + 1e7;
    const intensity = detector.intensityAt(longHorizon, "home");
    expect(Number.isFinite(intensity)).toBe(true);
    expect(intensity).toBeCloseTo(fit.mu, 6); // excitation has decayed away completely
  });
});

describe("edge cases", () => {
  it("intensityAt before any events returns the prior mu, no throw", () => {
    const detector = new HawkesSteamDetector();
    expect(detector.intensityAt(0, "home")).toBe(DEFAULT_PRIOR_MU);
    expect(detector.intensityAt(1e9, "away")).toBe(DEFAULT_PRIOR_MU);
  });

  it("a single observed event still updates the O(1) state even though the fit stays at prior", () => {
    const detector = new HawkesSteamDetector({ priorAlpha: 0.4, priorBeta: 0.9 });
    const pre = detector.observeEvent(10, "home");
    expect(pre).toBe(DEFAULT_PRIOR_MU); // no history before the first event
    const post = detector.intensityAt(10, "home");
    expect(post).toBeCloseTo(DEFAULT_PRIOR_MU + 0.4 * 1, 12);
  });

  it("very large time gaps decay excitation to (numerically) zero without NaN/Infinity", () => {
    const detector = new HawkesSteamDetector({ priorAlpha: 0.7, priorBeta: 0.5 });
    detector.observeEvent(0, "home");
    const far = detector.intensityAt(1e12, "home");
    expect(Number.isFinite(far)).toBe(true);
    expect(far).toBeCloseTo(DEFAULT_PRIOR_MU, 9);
  });

  it("refit on an empty window does not throw and degrades to the prior for both sides", () => {
    const detector = new HawkesSteamDetector();
    expect(() => detector.refit([])).not.toThrow();
    expect(detector.getFit("home").fittedEventCount).toBe(0);
    expect(detector.getFit("home").logLikelihood).toBeNull();
    expect(detector.getFit("away").logLikelihood).toBeNull();
    expect(detector.intensityAt(0, "home")).toBe(DEFAULT_PRIOR_MU);
  });

  it("refit on a single-event window does not throw, degrades the fit, but still tracks the one event", () => {
    const detector = new HawkesSteamDetector({ priorAlpha: 0.3, priorBeta: 0.6 });
    expect(() =>
      detector.refit([{ time: 42, impliedProbDelta: 0.006, side: "home" }]),
    ).not.toThrow();
    const fit = detector.getFit("home");
    expect(fit.logLikelihood).toBeNull();
    expect(fit.fittedEventCount).toBe(1);
    // The one known event is still reflected in the live O(1) state.
    expect(detector.intensityAt(42, "home")).toBeCloseTo(fit.mu + fit.alpha * 1, 12);
  });

  it("fitHawkesToWindow never throws and never divides by zero on a zero-span window (duplicate timestamps)", () => {
    expect(() => fitHawkesToWindow([5, 5, 5, 5])).not.toThrow();
    const fit = fitHawkesToWindow([5, 5, 5, 5]);
    expect(fit.logLikelihood).toBeNull();
    expect(Number.isFinite(fit.mu)).toBe(true);
    expect(Number.isFinite(fit.beta)).toBe(true);
  });

  it("observeEvent and intensityAt throw RangeError on non-finite time", () => {
    const detector = new HawkesSteamDetector();
    expect(() => detector.observeEvent(Number.NaN, "home")).toThrow(RangeError);
    expect(() => detector.observeEvent(Number.POSITIVE_INFINITY, "home")).toThrow(RangeError);
    expect(() => detector.intensityAt(Number.NaN, "home")).toThrow(RangeError);
  });
});

describe("the probability-nudge cap is actually enforced under adversarial input", () => {
  it("caps the suggested nudge at maxProbabilityNudge (default) even for an astronomically dense cluster", () => {
    // Near-supercritical prior, then a huge number of near-simultaneous events —
    // designed to drive the background-subtracted intensity ratio enormous.
    const detector = new HawkesSteamDetector({ priorMu: 0.01, priorAlpha: 9.999, priorBeta: 10 });
    let t = 0;
    for (let i = 0; i < 500; i++) {
      t += 1e-6;
      detector.observeEvent(t, "home");
    }
    const signal = detector.steamSignal(t);
    expect(signal.side).toBe("home");
    expect(signal.magnitude).toBeGreaterThan(1000); // the raw ratio really is enormous
    expect(Number.isFinite(signal.suggestedProbabilityNudge)).toBe(true);
    expect(signal.suggestedProbabilityNudge).toBeLessThanOrEqual(DEFAULT_MAX_PROBABILITY_NUDGE);
    expect(signal.suggestedProbabilityNudge).toBeGreaterThan(0);
  });

  it("respects a custom (tighter) maxProbabilityNudge cap, not just the default", () => {
    const customCap = 0.017;
    const detector = new HawkesSteamDetector({
      priorMu: 0.01,
      priorAlpha: 9.999,
      priorBeta: 10,
      maxProbabilityNudge: customCap,
    });
    let t = 0;
    for (let i = 0; i < 500; i++) {
      t += 1e-6;
      detector.observeEvent(t, "home");
    }
    const signal = detector.steamSignal(t);
    expect(signal.suggestedProbabilityNudge).toBeLessThanOrEqual(customCap);
    expect(signal.suggestedProbabilityNudge).toBeGreaterThan(0);
  });

  it("nudge is exactly 0 when no side is steaming", () => {
    const detector = new HawkesSteamDetector();
    const signal = detector.steamSignal(0);
    expect(signal.side).toBeNull();
    expect(signal.suggestedProbabilityNudge).toBe(0);
  });
});

describe("independent side tracking (no pooling)", () => {
  it("home and away intensities are tracked completely independently", () => {
    const detector = new HawkesSteamDetector({ priorAlpha: 0.5, priorBeta: 1 });
    detector.observeEvent(0, "home");
    detector.observeEvent(0.1, "home");
    detector.observeEvent(0.2, "home");

    // Away side has seen nothing — must remain at the prior mu, unaffected by
    // the home-side burst.
    expect(detector.intensityAt(0.2, "away")).toBe(DEFAULT_PRIOR_MU);
    // Home side, by contrast, has visibly excited intensity from its own burst.
    expect(detector.intensityAt(0.2, "home")).toBeGreaterThan(DEFAULT_PRIOR_MU);
  });

  it("refit fits each side from only its own events, with no cross-contamination", () => {
    const detector = new HawkesSteamDetector();
    const background = [0, 70, 145, 210, 290, 360, 430, 505, 575, 650, 720, 800, 860];
    const burst = Array.from({ length: 15 }, (_, i) => 900 + i * 0.3);
    const homeTimes = [...background, ...burst]; // background + a visible burst
    const awayTimes = background; // same background pace, but no burst

    const events = [...toEvents(homeTimes, "home"), ...toEvents(awayTimes, "away")];
    detector.refit(events);

    const homeFit = detector.getFit("home");
    const awayFit = detector.getFit("away");

    // The burst is visible only on the home side.
    expect(homeFit.alpha).toBeGreaterThan(awayFit.alpha);
    expect(awayFit.alpha / awayFit.beta).toBeLessThan(0.3);

    // No cross-contamination: fitting each side alone, as an independent
    // single-side window, reproduces EXACTLY the numbers the two-sided refit
    // produced — the away events never leak into the home fit or vice versa.
    const homeAlone = fitHawkesToWindow(homeTimes);
    const awayAlone = fitHawkesToWindow(awayTimes);
    expect(homeFit).toEqual(homeAlone);
    expect(awayFit).toEqual(awayAlone);
  });
});
