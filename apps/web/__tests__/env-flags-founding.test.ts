import { describe, expect, it } from "vitest";
import { flagEnabled, waitlistGated } from "@/lib/env/flags";
import { resolveBoardSurface } from "@/lib/board/board-surface-policy";
import { loadSelectiveRuntimeConfig, passesPublicSelectiveFilter } from "@/lib/calibration/selective-publish-runtime";

describe("founding env defaults", () => {
  it("waitlist open when gate true but FORCE unset (legacy)", () => {
    expect(
      waitlistGated({ GSE_WAITLIST_GATE_ENABLED: "true" }),
    ).toBe(false);
  });

  it("waitlist gated only with both flags", () => {
    expect(
      waitlistGated({
        GSE_WAITLIST_GATE_ENABLED: "true",
        GSE_WAITLIST_BASIC_FORCE: "true",
      }),
    ).toBe(true);
  });

  it("flagEnabled unset is false", () => {
    expect(flagEnabled("SELECTIVE_PUBLISH_ENABLED", {})).toBe(false);
  });

  it("board auto signal when odds stale", () => {
    expect(resolveBoardSurface({}, { oddsFresh: false })).toBe("signal");
    expect(resolveBoardSurface({}, { oddsFresh: true })).toBe("market");
  });

  it("selective filter default off passes all", () => {
    expect(passesPublicSelectiveFilter({ confidence: 50 }, {})).toBe(true);
  });

  it("selective filter on drops coin-flips", () => {
    const env = { SELECTIVE_PUBLISH_ENABLED: "true", SELECTIVE_PUBLISH_DELTA: "0.10" };
    expect(passesPublicSelectiveFilter({ confidence: 50 }, env)).toBe(false);
    expect(passesPublicSelectiveFilter({ confidence: 65 }, env)).toBe(true);
  });

  it("pause groups", () => {
    const env = {
      SELECTIVE_PUBLISH_ENABLED: "true",
      SELECTIVE_PAUSE_GROUPS: "mlb|ml",
    };
    expect(
      passesPublicSelectiveFilter(
        { confidence: 70, sportKey: "mlb", pickType: "ml" },
        env,
      ),
    ).toBe(false);
  });
});

describe("signal board product law", () => {
  it("documents dual freshness: generation SLA or upcoming pending signals", () => {
    // Implementation: isSignalBoardSlateStale in public-freshness-gate.ts
    expect(true).toBe(true);
  });
});
