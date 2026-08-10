import { describe, expect, it } from "vitest";
import { resolvePausedGroups } from "@/lib/calibration/ranking-pause-apply";

describe("resolvePausedGroups durable founder-yes", () => {
  const plan = {
    pauseGroups: ["baseball_mlb|MONEYLINE", "baseball_mlb|SPREAD"] as const,
  };

  it("stays advisory when env and durable off", () => {
    const r = resolvePausedGroups({}, plan, null);
    expect(r.pausedGroups).toEqual([]);
    expect(r.source).toBe("none");
    expect(r.planPauseCount).toBe(2);
  });

  it("applies durable snap groups when enabled", () => {
    const r = resolvePausedGroups(
      {},
      plan,
      {
        enabled: true,
        groups: ["baseball_mlb|MONEYLINE", "baseball_mlb|SPREAD"],
        setAt: "2026-08-10T00:00:00.000Z",
        setBy: "test",
        note: "founder yes",
      },
    );
    expect(r.source).toBe("durable");
    expect(r.applyEnabled).toBe(true);
    expect(r.pausedGroups).toEqual([
      "baseball_mlb|MONEYLINE",
      "baseball_mlb|SPREAD",
    ]);
  });

  it("falls back to plan groups when durable enabled with empty groups", () => {
    const r = resolvePausedGroups(
      {},
      plan,
      {
        enabled: true,
        groups: [],
        setAt: "2026-08-10T00:00:00.000Z",
        setBy: "test",
        note: "use plan",
      },
    );
    expect(r.source).toBe("durable");
    expect(r.pausedGroups).toContain("baseball_mlb|MONEYLINE");
  });

  it("env SELECTIVE_PAUSE_GROUPS wins", () => {
    const r = resolvePausedGroups(
      { SELECTIVE_PAUSE_GROUPS: "soccer_epl|MONEYLINE" },
      plan,
      {
        enabled: true,
        groups: ["baseball_mlb|MONEYLINE"],
        setAt: "x",
        setBy: "t",
        note: "n",
      },
    );
    expect(r.source).toBe("env");
    expect(r.pausedGroups).toEqual(["soccer_epl|MONEYLINE"]);
  });
});
