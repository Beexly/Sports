import { describe, it, expect, vi } from "vitest";
import { registerProjectionsFromEnv } from "../instrumentation";
import type { GradedPoolResult } from "@/lib/integrations/graded-pool";

const LIVE: GradedPoolResult = { status: "live", season: 2025, count: 3, players: [], error: null };
const EMPTY_LIVE: GradedPoolResult = { status: "live", season: 2025, count: 0, players: [], error: null };
const SRC_ERR: GradedPoolResult = { status: "source-error", season: 0, count: 0, players: [], error: "blocked" };

describe("instrumentation projections gate", () => {
  it("does nothing outside the Node.js runtime", async () => {
    const loader = vi.fn(async () => LIVE);
    expect(await registerProjectionsFromEnv({}, loader)).toBe("skipped-runtime");
    expect(await registerProjectionsFromEnv({ NEXT_RUNTIME: "edge" }, loader)).toBe("skipped-runtime");
    expect(loader).not.toHaveBeenCalled();
  });

  it("skips when PROJECTIONS_PROVIDER is explicitly disabled", async () => {
    const loader = vi.fn(async () => LIVE);
    expect(await registerProjectionsFromEnv({ NEXT_RUNTIME: "nodejs", PROJECTIONS_PROVIDER: "off" }, loader)).toBe("skipped-disabled");
    expect(await registerProjectionsFromEnv({ NEXT_RUNTIME: "nodejs", PROJECTIONS_PROVIDER: "false" }, loader)).toBe("skipped-disabled");
    expect(await registerProjectionsFromEnv({ NEXT_RUNTIME: "nodejs", PROJECTIONS_PROVIDER: "disabled" }, loader)).toBe("skipped-disabled");
    expect(loader).not.toHaveBeenCalled();
  });

  it("registers by default in Node runtime when PROJECTIONS_PROVIDER is unset or any other value", async () => {
    const loader = vi.fn(async () => LIVE);
    // Default on: no env var at all
    expect(await registerProjectionsFromEnv({ NEXT_RUNTIME: "nodejs" }, loader)).toBe("registered");
    // Explicit value (e.g. "graded") also enables it
    expect(await registerProjectionsFromEnv({ NEXT_RUNTIME: "nodejs", PROJECTIONS_PROVIDER: "graded" }, loader)).toBe("registered");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("reports source-error (registers nothing) when the pool is empty or the source failed — never fabricates", async () => {
    expect(await registerProjectionsFromEnv({ NEXT_RUNTIME: "nodejs" }, async () => EMPTY_LIVE)).toBe("source-error");
    expect(await registerProjectionsFromEnv({ NEXT_RUNTIME: "nodejs" }, async () => SRC_ERR)).toBe("source-error");
  });

  it("never lets a loader throw crash startup", async () => {
    const loader = vi.fn(async () => { throw new Error("network down"); });
    await expect(registerProjectionsFromEnv({ NEXT_RUNTIME: "nodejs" }, loader)).resolves.toBe("load-failed");
  });
});
