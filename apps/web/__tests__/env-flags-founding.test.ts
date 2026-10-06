import { beforeEach, describe, expect, it, vi } from "vitest";
import { flagEnabled, waitlistGated } from "@/lib/env/flags";
import { resolveBoardSurface } from "@/lib/board/board-surface-policy";
import { passesPublicSelectiveFilter } from "@/lib/calibration/selective-publish-runtime";

// Mocking precedent: apps/web/__tests__/picks-stale-kill-switch.test.ts
const mocks = vi.hoisted(() => ({
  pickFindFirst: vi.fn<(args?: unknown) => Promise<unknown>>(),
}));

vi.mock("@sports/db", () => ({
  db: { pick: { findFirst: mocks.pickFindFirst } },
}));

const { isSignalBoardSlateStale } = await import(
  "@/lib/data-reliability/public-freshness-gate"
);

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

  it("selective filter default ON drops coin-flips", () => {
    expect(passesPublicSelectiveFilter({ confidence: 50 }, {})).toBe(false);
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
  const now = new Date("2026-09-08T12:00:00Z");
  const fresh = new Date(now.getTime() - 60 * 60 * 1000); // 1h ago: ok
  const stale = new Date(now.getTime() - 5 * 60 * 60 * 1000); // 5h ago: stale (>240m SLA)

  beforeEach(() => {
    mocks.pickFindFirst.mockReset();
  });

  it("not stale when the last published pick is within the freshness SLA", async () => {
    mocks.pickFindFirst.mockResolvedValueOnce({ generatedAt: fresh });
    await expect(isSignalBoardSlateStale(now)).resolves.toBe(false);
    expect(mocks.pickFindFirst).toHaveBeenCalledTimes(1);
  });

  it("stale with no upcoming pending signal in the 7d horizon", async () => {
    mocks.pickFindFirst
      .mockResolvedValueOnce({ generatedAt: stale })
      .mockResolvedValueOnce(null);
    await expect(isSignalBoardSlateStale(now)).resolves.toBe(true);
    expect(mocks.pickFindFirst).toHaveBeenCalledTimes(2);
  });

  it("not stale when an upcoming pending signal exists in the 7d horizon", async () => {
    mocks.pickFindFirst
      .mockResolvedValueOnce({ generatedAt: stale })
      .mockResolvedValueOnce({ id: "pending-1" });
    await expect(isSignalBoardSlateStale(now)).resolves.toBe(false);
  });

  it("stale when there has never been a published pick", async () => {
    mocks.pickFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    await expect(isSignalBoardSlateStale(now)).resolves.toBe(true);
  });
});
