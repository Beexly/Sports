/**
 * Tripwire: bootstrapGateResponse must not lie when only a feature gate is off.
 */
import { afterEach, describe, expect, it } from "vitest";
import { bootstrapGateResponse } from "@sports/prediction-engine";

const KEYS = [
  "CANONICAL_HISTORY_ENABLED",
  "PUBLIC_PICKS_ENABLED",
  "PERFORMANCE_STATS_ENABLED",
] as const;

const saved: Record<string, string | undefined> = {};

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

function snapEnv(): void {
  for (const k of KEYS) saved[k] = process.env[k];
}

describe("bootstrapGateResponse honesty", () => {
  it("says feature_gate when history is canonical but public picks stay dark", () => {
    snapEnv();
    process.env.CANONICAL_HISTORY_ENABLED = "true";
    process.env.PUBLIC_PICKS_ENABLED = "false";
    const body = bootstrapGateResponse("Public picks");
    expect(body.bootstrapMode).toBe(false);
    expect(body.reason).toBe("feature_gate");
    expect(body.error).toMatch(/feature gate/i);
    expect(body.error).not.toMatch(/bootstrap mode/i);
  });

  it("says bootstrap when canonical history is still off", () => {
    snapEnv();
    process.env.CANONICAL_HISTORY_ENABLED = "false";
    const body = bootstrapGateResponse("Public picks");
    expect(body.bootstrapMode).toBe(true);
    expect(body.reason).toBe("bootstrap");
    expect(body.error).toMatch(/bootstrap mode/i);
  });
});
