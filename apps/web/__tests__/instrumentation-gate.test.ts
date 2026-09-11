import { describe, it, expect, vi } from "vitest";
import { registerProjectionsFromEnv, warmSourceLiveEvidence } from "../instrumentation";
import type { GradedPoolResult } from "@/lib/integrations/graded-pool";

const LIVE: GradedPoolResult = { status: "live", season: 2025, count: 3, players: [], attribution: "Data via nflverse (CC-BY-4.0)", error: null };
const EMPTY_LIVE: GradedPoolResult = { status: "live", season: 2025, count: 0, players: [], attribution: "Data via nflverse (CC-BY-4.0)", error: null };
const SRC_ERR: GradedPoolResult = { status: "source-error", season: 0, count: 0, players: [], attribution: "Data via nflverse (CC-BY-4.0)", error: "blocked" };

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

describe("instrumentation live-evidence warm (C-328)", () => {
  it("warms with the configured timeout and reports it", async () => {
    const load = vi.fn(async () => ({ warmed: true }));
    await expect(warmSourceLiveEvidence(load)).resolves.toBe("warmed");
    expect(load).toHaveBeenCalledWith({ timeoutMs: 20000 });
  });

  it("passes a custom budget through, so the boot warm can be tuned without touching callers", async () => {
    const load = vi.fn(async () => ({}));
    await warmSourceLiveEvidence(load, 5000);
    expect(load).toHaveBeenCalledWith({ timeoutMs: 5000 });
  });

  it("NEVER rejects — a failed warm must not delay or crash startup", async () => {
    // The whole point is that a slow or broken warm is invisible to the server. If
    // this ever rejects, register()'s void call would surface an unhandled rejection
    // on every cold boot.
    const load = vi.fn(async () => { throw new Error("nflverse unreachable"); });
    await expect(warmSourceLiveEvidence(load)).resolves.toBe("failed");
  });

  it("still resolves when the loader rejects with a non-Error", async () => {
    const load = vi.fn(async () => { throw "string failure"; });
    await expect(warmSourceLiveEvidence(load)).resolves.toBe("failed");
  });
});
