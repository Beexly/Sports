import { describe, it, expect } from "vitest";
import { decideEntryTiming, type EntryTimingInput } from "../entry-timing.js";

const base: EntryTimingInput = {
  lockNowClv: 0,
  forecastStdErr: 0.5,
  timeToKickoffHours: 24,
  minActWindowHours: 0.25,
  transactionMargin: 0,
};

describe("decideEntryTiming", () => {
  it("locks now when the current number already beats the close beyond the noise", () => {
    const d = decideEntryTiming({ ...base, lockNowClv: 1.0, forecastStdErr: 0.5 });
    expect(d.decision).toBe("LOCK_NOW");
    expect(d.reason).toBe("now-beats-close");
  });

  it("treats lockNowClv exactly equal to σ as 'now beats close' (≥)", () => {
    const d = decideEntryTiming({ ...base, lockNowClv: 0.5, forecastStdErr: 0.5 });
    expect(d.decision).toBe("LOCK_NOW");
    expect(d.reason).toBe("now-beats-close");
  });

  it("waits when the line is expected to move toward us beyond noise + costs", () => {
    // lockNowClv = -1.0 → expected gain from waiting = 1.0 > bar (0.5 + 0) → WAIT
    const d = decideEntryTiming({ ...base, lockNowClv: -1.0, forecastStdErr: 0.5 });
    expect(d.decision).toBe("WAIT");
    expect(d.reason).toBe("wait-for-favorable-move");
    expect(d.expectedClvGainFromWaiting).toBe(1.0);
    expect(d.waitBar).toBe(0.5);
  });

  it("defaults to locking when the expected gain is within the noise band", () => {
    // gain = 0.3, bar = 0.5 → not worth waiting
    const d = decideEntryTiming({ ...base, lockNowClv: -0.3, forecastStdErr: 0.5 });
    expect(d.decision).toBe("LOCK_NOW");
    expect(d.reason).toBe("default-lock");
  });

  it("treats expected gain exactly equal to the bar as not worth waiting (strict >)", () => {
    // gain = 0.5, bar = 0.5 → default lock
    const d = decideEntryTiming({ ...base, lockNowClv: -0.5, forecastStdErr: 0.5 });
    expect(d.decision).toBe("LOCK_NOW");
    expect(d.reason).toBe("default-lock");
  });

  it("respects the latency floor: locks now even when waiting looks favorable", () => {
    // Strong favorable move, but only 6 minutes (0.1h) left vs a 15-min floor.
    const d = decideEntryTiming({
      ...base,
      lockNowClv: -5.0,
      forecastStdErr: 0.5,
      timeToKickoffHours: 0.1,
      minActWindowHours: 0.25,
    });
    expect(d.decision).toBe("LOCK_NOW");
    expect(d.reason).toBe("latency-floor");
  });

  it("raises the wait bar by the transaction margin", () => {
    // gain = 0.6. Without margin (bar 0.5) → WAIT. With 0.2 margin (bar 0.7) → default lock.
    const noMargin = decideEntryTiming({ ...base, lockNowClv: -0.6, forecastStdErr: 0.5 });
    expect(noMargin.decision).toBe("WAIT");

    const withMargin = decideEntryTiming({
      ...base,
      lockNowClv: -0.6,
      forecastStdErr: 0.5,
      transactionMargin: 0.2,
    });
    expect(withMargin.decision).toBe("LOCK_NOW");
    expect(withMargin.reason).toBe("default-lock");
    expect(withMargin.waitBar).toBeCloseTo(0.7, 12);
  });

  it("uses a 15-minute default act window when none is provided", () => {
    const d = decideEntryTiming({
      lockNowClv: -5.0,
      forecastStdErr: 0.5,
      timeToKickoffHours: 0.2, // 12 min < default 0.25h floor
    });
    expect(d.reason).toBe("latency-floor");
  });

  it("rejects invalid inputs", () => {
    expect(() => decideEntryTiming({ ...base, forecastStdErr: -0.1 })).toThrow(RangeError);
    expect(() => decideEntryTiming({ ...base, timeToKickoffHours: -1 })).toThrow(RangeError);
    expect(() => decideEntryTiming({ ...base, lockNowClv: Number.NaN })).toThrow(RangeError);
    expect(() => decideEntryTiming({ ...base, transactionMargin: -1 })).toThrow(RangeError);
  });
});
