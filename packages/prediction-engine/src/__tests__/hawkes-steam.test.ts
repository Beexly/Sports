import { describe, it, expect } from "vitest";
import {
  HawkesSteamDetector,
  hawkesIntensity,
  resolveSteamDirection,
  DEFAULT_MU,
  DEFAULT_ALPHA,
  DEFAULT_BETA,
  DEFAULT_STEAM_MULTIPLIER,
  DEFAULT_WINDOW_MS,
  DEFAULT_DIRECTION_WINDOW_MS,
} from "../hawkes-steam.js";
import type { OddsEvent } from "../hawkes-steam.js";

// Fixed base timestamp for determinism — never Date.now() in a test body.
const T0 = 1_700_000_000_000;

// Build a well-formed OddsEvent for testing, with sane overridable defaults.
function makeEvent(overrides: Partial<OddsEvent> = {}): OddsEvent {
  return {
    timestamp: T0,
    side: "home",
    impliedProbDelta: 0.01,
    ...overrides,
  };
}

// Default threshold used throughout: intensity must clear mu * multiplier.
const DEFAULT_THRESHOLD = DEFAULT_MU * DEFAULT_STEAM_MULTIPLIER;

describe("hawkesIntensity (pure function)", () => {
  it("returns exactly mu when there are no events", () => {
    expect(hawkesIntensity([], T0, DEFAULT_MU, DEFAULT_ALPHA, DEFAULT_BETA)).toBe(DEFAULT_MU);
  });

  it("returns mu + alpha for a single event at zero elapsed time", () => {
    const events = [makeEvent({ timestamp: T0 })];
    const intensity = hawkesIntensity(events, T0, DEFAULT_MU, DEFAULT_ALPHA, DEFAULT_BETA);
    expect(intensity).toBeCloseTo(DEFAULT_MU + DEFAULT_ALPHA, 10);
  });

  it("decays as elapsed time increases (monotonic decrease, no new events)", () => {
    const events = [makeEvent({ timestamp: T0 })];
    const soon = hawkesIntensity(events, T0 + 1_000, DEFAULT_MU, DEFAULT_ALPHA, DEFAULT_BETA);
    const later = hawkesIntensity(events, T0 + 10_000, DEFAULT_MU, DEFAULT_ALPHA, DEFAULT_BETA);
    const muchLater = hawkesIntensity(events, T0 + 300_000, DEFAULT_MU, DEFAULT_ALPHA, DEFAULT_BETA);
    expect(soon).toBeGreaterThan(later);
    expect(later).toBeGreaterThan(muchLater);
    // Asymptotically approaches (and, once the exponential term underflows
    // to 0 in floating point, can equal) baseline mu — never below it.
    expect(muchLater).toBeGreaterThanOrEqual(DEFAULT_MU);
    expect(muchLater).toBeCloseTo(DEFAULT_MU, 2);
  });

  it("clamps a future-dated event's elapsed time to zero instead of blowing up", () => {
    const futureEvent = [makeEvent({ timestamp: T0 + 60_000 })]; // 60s in the "future" relative to `now`
    const intensity = hawkesIntensity(futureEvent, T0, DEFAULT_MU, DEFAULT_ALPHA, DEFAULT_BETA);
    // Must equal the zero-elapsed case (mu + alpha), NOT some blown-up exp(positive) value.
    expect(intensity).toBeCloseTo(DEFAULT_MU + DEFAULT_ALPHA, 10);
    expect(Number.isFinite(intensity)).toBe(true);
  });

  it("sums contributions across multiple events", () => {
    const events = [makeEvent({ timestamp: T0 }), makeEvent({ timestamp: T0 })];
    const intensity = hawkesIntensity(events, T0, DEFAULT_MU, DEFAULT_ALPHA, DEFAULT_BETA);
    expect(intensity).toBeCloseTo(DEFAULT_MU + 2 * DEFAULT_ALPHA, 10);
  });

  it("is never NaN/Infinity for finite params, however large the event list", () => {
    const events = Array.from({ length: 500 }, (_, i) => makeEvent({ timestamp: T0 - i * 100 }));
    const intensity = hawkesIntensity(events, T0, DEFAULT_MU, DEFAULT_ALPHA, DEFAULT_BETA);
    expect(Number.isFinite(intensity)).toBe(true);
  });

  it("falls back to mu when `now` itself is non-finite", () => {
    const events = [makeEvent({ timestamp: T0 })];
    expect(hawkesIntensity(events, NaN, DEFAULT_MU, DEFAULT_ALPHA, DEFAULT_BETA)).toBe(DEFAULT_MU);
    expect(hawkesIntensity(events, Infinity, DEFAULT_MU, DEFAULT_ALPHA, DEFAULT_BETA)).toBe(DEFAULT_MU);
  });
});

describe("resolveSteamDirection (pure function)", () => {
  it("returns null for an empty event list", () => {
    expect(resolveSteamDirection([], T0, DEFAULT_DIRECTION_WINDOW_MS)).toBeNull();
  });

  it("returns the majority side", () => {
    const events = [
      makeEvent({ side: "home", timestamp: T0 }),
      makeEvent({ side: "home", timestamp: T0 }),
      makeEvent({ side: "away", timestamp: T0 }),
    ];
    expect(resolveSteamDirection(events, T0, DEFAULT_DIRECTION_WINDOW_MS)).toBe("home");
  });

  it("returns null on an exact tie rather than defaulting to a side", () => {
    const events = [
      makeEvent({ side: "home", timestamp: T0 }),
      makeEvent({ side: "away", timestamp: T0 }),
      makeEvent({ side: "home", timestamp: T0 }),
      makeEvent({ side: "away", timestamp: T0 }),
    ];
    expect(resolveSteamDirection(events, T0, DEFAULT_DIRECTION_WINDOW_MS)).toBeNull();
  });

  it("excludes events outside the direction window even if they'd flip the majority", () => {
    const events = [
      makeEvent({ side: "home", timestamp: T0 }), // inside window
      makeEvent({ side: "away", timestamp: T0 - DEFAULT_DIRECTION_WINDOW_MS - 1 }), // just outside
      makeEvent({ side: "away", timestamp: T0 - DEFAULT_DIRECTION_WINDOW_MS - 1 }),
      makeEvent({ side: "away", timestamp: T0 - DEFAULT_DIRECTION_WINDOW_MS - 1 }),
    ];
    expect(resolveSteamDirection(events, T0, DEFAULT_DIRECTION_WINDOW_MS)).toBe("home");
  });

  it("excludes future-dated events (age < 0)", () => {
    const events = [makeEvent({ side: "away", timestamp: T0 + 5_000 })];
    expect(resolveSteamDirection(events, T0, DEFAULT_DIRECTION_WINDOW_MS)).toBeNull();
  });
});

describe("HawkesSteamDetector — empty stream", () => {
  it("reports baseline intensity, no steam, and no direction with zero events", () => {
    const detector = new HawkesSteamDetector();
    const signal = detector.getSignal(T0);
    expect(signal.intensity).toBe(DEFAULT_MU);
    expect(signal.steamDetected).toBe(false);
    expect(signal.direction).toBeNull();
    expect(detector.bufferedEventCount).toBe(0);
  });
});

describe("HawkesSteamDetector — single event", () => {
  it("never detects steam from a single event", () => {
    const detector = new HawkesSteamDetector();
    const signal = detector.processEvent(makeEvent({ timestamp: T0, side: "home" }), T0);
    expect(signal.steamDetected).toBe(false);
    expect(signal.direction).toBeNull();
    expect(signal.intensity).toBeLessThan(DEFAULT_THRESHOLD);
    expect(detector.bufferedEventCount).toBe(1);
  });
});

describe("HawkesSteamDetector — tight same-direction burst", () => {
  it("detects steam and reports the correct direction", () => {
    const detector = new HawkesSteamDetector();
    // 6 same-side events, 2s apart — a "tight burst" by this module's tuning.
    let signal = detector.getSignal(T0);
    for (let i = 0; i < 6; i++) {
      const t = T0 + i * 2_000;
      signal = detector.processEvent(makeEvent({ timestamp: t, side: "home" }), t);
    }
    expect(signal.steamDetected).toBe(true);
    expect(signal.direction).toBe("home");
    expect(signal.intensity).toBeGreaterThan(DEFAULT_THRESHOLD);
    expect(detector.bufferedEventCount).toBe(6);
  });

  it("detects steam for a tight away-side burst too, with direction 'away'", () => {
    const detector = new HawkesSteamDetector();
    let signal = detector.getSignal(T0);
    for (let i = 0; i < 6; i++) {
      const t = T0 + i * 2_000;
      signal = detector.processEvent(makeEvent({ timestamp: t, side: "away", impliedProbDelta: -0.01 }), t);
    }
    expect(signal.steamDetected).toBe(true);
    expect(signal.direction).toBe("away");
  });
});

describe("HawkesSteamDetector — evenly split opposite-direction burst", () => {
  it("may detect steam, but direction must be null on a tie, never a default side", () => {
    const detector = new HawkesSteamDetector();
    const sides: Array<"home" | "away"> = ["home", "away", "home", "away", "home", "away"];
    let signal = detector.getSignal(T0);
    for (let i = 0; i < sides.length; i++) {
      const t = T0 + i * 2_000;
      signal = detector.processEvent(makeEvent({ timestamp: t, side: sides[i]! }), t);
    }
    // Same magnitude burst as the same-direction test above, so intensity
    // clears the threshold the same way — only the direction differs.
    expect(signal.steamDetected).toBe(true);
    expect(signal.direction).toBeNull();
  });
});

describe("HawkesSteamDetector — NaN/Infinity garbage events", () => {
  it("drops a NaN-timestamp event without corrupting state or spiking intensity", () => {
    const detector = new HawkesSteamDetector();
    const goodSignal = detector.processEvent(makeEvent({ timestamp: T0, side: "home" }), T0);
    expect(detector.bufferedEventCount).toBe(1);

    const garbageNow = T0 + 1_000;
    const afterGarbage = detector.processEvent(
      makeEvent({ timestamp: NaN, side: "home", impliedProbDelta: 0.01 }),
      garbageNow
    );

    // Garbage never entered the buffer.
    expect(detector.bufferedEventCount).toBe(1);
    // The returned signal must match recomputing from the one valid event
    // alone, at garbageNow — not some corrupted/spiked value.
    const expected = hawkesIntensity([makeEvent({ timestamp: T0 })], garbageNow, DEFAULT_MU, DEFAULT_ALPHA, DEFAULT_BETA);
    expect(afterGarbage.intensity).toBeCloseTo(expected, 10);
    expect(Number.isFinite(afterGarbage.intensity)).toBe(true);
    expect(goodSignal.intensity).toBeGreaterThan(0); // sanity: the earlier valid call worked
  });

  it("drops an Infinity-delta event without corrupting state", () => {
    const detector = new HawkesSteamDetector();
    detector.processEvent(makeEvent({ timestamp: T0, side: "home", impliedProbDelta: 0.02 }), T0);
    const signal = detector.processEvent(
      makeEvent({ timestamp: T0 + 500, side: "home", impliedProbDelta: Infinity }),
      T0 + 500
    );
    expect(detector.bufferedEventCount).toBe(1);
    expect(Number.isFinite(signal.intensity)).toBe(true);
  });

  it("drops a -Infinity timestamp event without corrupting state", () => {
    const detector = new HawkesSteamDetector();
    detector.processEvent(makeEvent({ timestamp: T0, side: "away" }), T0);
    const signal = detector.processEvent(
      makeEvent({ timestamp: -Infinity, side: "away", impliedProbDelta: -0.01 }),
      T0 + 500
    );
    expect(detector.bufferedEventCount).toBe(1);
    expect(Number.isFinite(signal.intensity)).toBe(true);
  });

  it("drops an event with an invalid `side` value", () => {
    const detector = new HawkesSteamDetector();
    detector.processEvent(makeEvent({ timestamp: T0, side: "home" }), T0);
    const garbage = { timestamp: T0 + 500, side: "north", impliedProbDelta: 0.01 } as unknown as OddsEvent;
    const signal = detector.processEvent(garbage, T0 + 500);
    expect(detector.bufferedEventCount).toBe(1);
    expect(Number.isFinite(signal.intensity)).toBe(true);
  });

  it("keeps working normally on valid events after a garbage event", () => {
    const detector = new HawkesSteamDetector();
    detector.processEvent(makeEvent({ timestamp: T0, side: "home" }), T0);
    detector.processEvent(makeEvent({ timestamp: NaN, side: "home" }), T0 + 500);
    // Buffer should still be exactly 1 (garbage rejected) before we add more.
    expect(detector.bufferedEventCount).toBe(1);

    // Feed a real burst afterward — should behave exactly like a clean burst.
    let signal = detector.getSignal(T0 + 500);
    for (let i = 1; i < 6; i++) {
      const t = T0 + 500 + i * 2_000;
      signal = detector.processEvent(makeEvent({ timestamp: t, side: "home" }), t);
    }
    expect(signal.steamDetected).toBe(true);
    expect(signal.direction).toBe("home");
    expect(detector.bufferedEventCount).toBe(6); // 1 original + 5 new; garbage never counted
  });

  it("also guards a non-finite `now` argument itself, without throwing", () => {
    const detector = new HawkesSteamDetector();
    expect(() => detector.processEvent(makeEvent({ timestamp: T0 }), NaN)).not.toThrow();
    const signal = detector.processEvent(makeEvent({ timestamp: T0 }), Infinity);
    expect(Number.isFinite(signal.intensity)).toBe(true);
  });
});

describe("HawkesSteamDetector — decay over time", () => {
  it("intensity decreases as `now` advances with no new events, eventually clearing steam", () => {
    const detector = new HawkesSteamDetector();
    let lastTimestamp = T0;
    for (let i = 0; i < 6; i++) {
      lastTimestamp = T0 + i * 2_000;
      detector.processEvent(makeEvent({ timestamp: lastTimestamp, side: "home" }), lastTimestamp);
    }
    const immediate = detector.getSignal(lastTimestamp);
    expect(immediate.steamDetected).toBe(true);

    const after30s = detector.getSignal(lastTimestamp + 30_000);
    const after5min = detector.getSignal(lastTimestamp + 300_000);

    expect(after30s.intensity).toBeLessThan(immediate.intensity);
    expect(after5min.intensity).toBeLessThan(after30s.intensity);
    expect(after5min.steamDetected).toBe(false);
    expect(after5min.intensity).toBeCloseTo(DEFAULT_MU, 2);
  });
});

describe("HawkesSteamDetector — buffer pruning", () => {
  it("prunes events older than windowMs so they stop contributing to intensity", () => {
    const detector = new HawkesSteamDetector({ windowMs: 5_000 });
    detector.processEvent(makeEvent({ timestamp: T0, side: "home" }), T0);
    expect(detector.bufferedEventCount).toBe(1);

    // 10s later — well past the 5s window.
    const signal = detector.getSignal(T0 + 10_000);
    expect(detector.bufferedEventCount).toBe(0);
    expect(signal.intensity).toBe(DEFAULT_MU);
    expect(signal.steamDetected).toBe(false);
  });

  it("pruned slots don't accumulate forever — buffer size stays bounded across a long run", () => {
    const detector = new HawkesSteamDetector({ windowMs: 1_000 });
    // Feed 50 events, each long after the previous one has aged out.
    for (let i = 0; i < 50; i++) {
      const t = T0 + i * 10_000; // 10s apart, window is only 1s
      detector.processEvent(makeEvent({ timestamp: t, side: "home" }), t);
      expect(detector.bufferedEventCount).toBe(1); // never grows past 1
    }
  });

  it("does not prune events still within windowMs", () => {
    const detector = new HawkesSteamDetector({ windowMs: 60_000 });
    detector.processEvent(makeEvent({ timestamp: T0 }), T0);
    const signal = detector.getSignal(T0 + 30_000); // within the 60s window
    expect(detector.bufferedEventCount).toBe(1);
    expect(signal.intensity).toBeGreaterThan(DEFAULT_MU);
  });
});

describe("HawkesSteamDetector — constructor option handling", () => {
  it("uses documented defaults when constructed with no options", () => {
    const detector = new HawkesSteamDetector();
    const signal = detector.getSignal(T0);
    expect(signal.intensity).toBe(DEFAULT_MU);
  });

  it("accepts null/undefined options without throwing", () => {
    expect(() => new HawkesSteamDetector(null)).not.toThrow();
    expect(() => new HawkesSteamDetector(undefined)).not.toThrow();
    expect(() => new HawkesSteamDetector({})).not.toThrow();
  });

  it("falls back to defaults for non-finite/negative option values instead of throwing", () => {
    const garbageOptions = new HawkesSteamDetector({
      mu: NaN,
      alpha: -5,
      beta: 0,
      steamMultiplier: -Infinity,
      windowMs: -100,
      directionWindowMs: NaN,
    });
    const cleanDefaults = new HawkesSteamDetector();

    // Both detectors should behave identically on the same event stream,
    // since the garbage options all collapse back to the same defaults.
    let a = garbageOptions.getSignal(T0);
    let b = cleanDefaults.getSignal(T0);
    expect(a).toEqual(b);

    a = garbageOptions.processEvent(makeEvent({ timestamp: T0, side: "home" }), T0);
    b = cleanDefaults.processEvent(makeEvent({ timestamp: T0, side: "home" }), T0);
    expect(a).toEqual(b);
  });

  it("respects a custom steamMultiplier", () => {
    // A multiplier of 1 means intensity only needs to clear mu itself —
    // a single event should be enough to trigger steam.
    const sensitive = new HawkesSteamDetector({ steamMultiplier: 1 });
    const signal = sensitive.processEvent(makeEvent({ timestamp: T0, side: "away" }), T0);
    expect(signal.steamDetected).toBe(true);
    expect(signal.direction).toBe("away");
  });

  it("respects mu: 0 as an explicit (not fallback) value — any excitation clears steam", () => {
    const zeroBaseline = new HawkesSteamDetector({ mu: 0, alpha: 1 });
    const signal = zeroBaseline.processEvent(makeEvent({ timestamp: T0, side: "home" }), T0);
    // threshold = mu * multiplier = 0, and intensity = 0 + 1*exp(0) = 1 > 0.
    expect(signal.steamDetected).toBe(true);
    expect(signal.direction).toBe("home");
  });

  it("respects a custom windowMs and directionWindowMs", () => {
    const detector = new HawkesSteamDetector({ windowMs: 2_000, directionWindowMs: 1_000 });
    detector.processEvent(makeEvent({ timestamp: T0, side: "home" }), T0);
    // Still within windowMs (2s) but outside directionWindowMs (1s) at t+1500.
    const signal = detector.getSignal(T0 + 1_500);
    expect(detector.bufferedEventCount).toBe(1); // not pruned yet
    expect(signal.direction).toBeNull(); // steamDetected is false here anyway (single event), so this also holds trivially
  });
});

describe("HawkesSteamDetector — extreme/adversarial event volumes", () => {
  it("handles a long high-frequency stream without producing NaN/Infinity", () => {
    const detector = new HawkesSteamDetector();
    let last = T0;
    let signal = detector.getSignal(T0);
    for (let i = 0; i < 2_000; i++) {
      last = T0 + i * 10; // 10ms apart — extreme frequency
      signal = detector.processEvent(makeEvent({ timestamp: last, side: i % 2 === 0 ? "home" : "away" }), last);
    }
    expect(Number.isFinite(signal.intensity)).toBe(true);
    expect(typeof signal.steamDetected).toBe("boolean");
    // windowMs default is 1hr, so nothing pruned across this ~20s stream.
    expect(detector.bufferedEventCount).toBe(2_000);
  });

  it("never throws for an all-garbage stream, and reports the untouched baseline", () => {
    const detector = new HawkesSteamDetector();
    const garbageEvents: OddsEvent[] = [
      { timestamp: NaN, side: "home", impliedProbDelta: 0.01 },
      { timestamp: Infinity, side: "away", impliedProbDelta: 0.01 },
      { timestamp: -Infinity, side: "home", impliedProbDelta: 0.01 },
      { timestamp: T0, side: "home", impliedProbDelta: NaN },
      { timestamp: T0, side: "home", impliedProbDelta: Infinity },
      { timestamp: T0, side: "home", impliedProbDelta: -Infinity },
    ];
    let signal = detector.getSignal(T0);
    for (const event of garbageEvents) {
      expect(() => detector.processEvent(event, T0)).not.toThrow();
      signal = detector.processEvent(event, T0);
    }
    expect(detector.bufferedEventCount).toBe(0);
    expect(signal.intensity).toBe(DEFAULT_MU);
    expect(signal.steamDetected).toBe(false);
    expect(signal.direction).toBeNull();
  });
});
