import { describe, it, expect, vi } from "vitest";
import { registerProjectionsFromEnv } from "../instrumentation";
import type { GradedPoolResult } from "@/lib/integrations/graded-pool";

const LIVE: GradedPoolResult = { status: "live", season: 2025, count: 3, players: [], error: null };
const EMPTY_LIVE: GradedPoolResult = { status: "live", season: 2025, count: 0, players: [], error: null };
const SRC_ERR: GradedPoolResult = { status: "source-error", season: 0, count: 0, players: [], error: "blocked" };

describe("instrumentation projections gate", () => {
  it("does nothing outside the Node.js runtime", async () => {
    const loader = vi.fn(async () => LIVE);
    expect(await registerProjectionsFromEnv({ PROJECTIONS_PROVIDER: "graded" }, loader)).toBe("skipped-runtime");
    expect(await registerProjectionsFromEnv({ NEXT_RUNTIME: "edge", PROJECTIONS_PROVIDER: "graded" }, loader)).toBe("skipped-runtime");
    expect(loader).not.toHaveBeenCalled();
  });

  it("does nothing when PROJECTIONS_PROVIDER is unset or blank (founder gate holds)", async () => {
    const loader = vi.fn(async () => LIVE);
    expect(await registerProjectionsFromEnv({ NEXT_RUNTIME: "nodejs" }, loader)).toBe("skipped-unset");
    expect(await registerProjectionsFromEnv({ NEXT_RUNTIME: "nodejs", PROJECTIONS_PROVIDER: "   " }, loader)).toBe("skipped-unset");
    expect(loader).not.toHaveBeenCalled();
  });

  it("registers when in Node runtime, keyed, and the loader returns a live pool", async () => {
    const loader = vi.fn(async () => LIVE);
    expect(await registerProjectionsFromEnv({ NEXT_RUNTIME: "nodejs", PROJECTIONS_PROVIDER: "graded" }, loader)).toBe("registered");
    expect(loader).toHaveBeenCalledOnce();
  });

  it("reports source-error (registers nothing) when the pool is empty or the source failed — never fabricates", async () => {
    expect(await registerProjectionsFromEnv({ NEXT_RUNTIME: "nodejs", PROJECTIONS_PROVIDER: "graded" }, async () => EMPTY_LIVE)).toBe("source-error");
    expect(await registerProjectionsFromEnv({ NEXT_RUNTIME: "nodejs", PROJECTIONS_PROVIDER: "graded" }, async () => SRC_ERR)).toBe("source-error");
  });

  it("never lets a loader throw crash startup", async () => {
    const loader = vi.fn(async () => { throw new Error("network down"); });
    await expect(registerProjectionsFromEnv({ NEXT_RUNTIME: "nodejs", PROJECTIONS_PROVIDER: "graded" }, loader)).resolves.toBe("load-failed");
  });
});
