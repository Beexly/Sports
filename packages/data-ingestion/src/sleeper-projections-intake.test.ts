import { describe, expect, it } from "vitest";
import {
  ingestSleeperProjections,
  ingestSleeperWeekStats,
  sleeperProjectionsIntakeEnabled,
} from "./sleeper-projections-intake.js";

const enabledEnv = { SLEEPER_PROJECTIONS_INTAKE_ENABLED: "true" } as NodeJS.ProcessEnv;
const disabledEnv = {} as NodeJS.ProcessEnv;
const asOf = "2026-09-25T22:00:00.000Z";

describe("sleeperProjectionsIntakeEnabled", () => {
  it("is disabled by default", () => {
    expect(sleeperProjectionsIntakeEnabled(disabledEnv)).toBe(false);
  });

  it("enables on explicit true", () => {
    expect(sleeperProjectionsIntakeEnabled(enabledEnv)).toBe(true);
  });
});

describe("ingestSleeperProjections", () => {
  it("fails closed when disabled", () => {
    const res = ingestSleeperProjections(2026, 4, {}, asOf, disabledEnv);
    expect(res.ok).toBe(false);
  });

  it("normalizes ADP, projected points and stat lines", () => {
    const res = ingestSleeperProjections(
      2026,
      4,
      {
        "11533": { adp_dd_ppr: 999.0, fga: 2.35, fgm: 2.04, pts_ppr: 8.5, gp: 1 },
      },
      asOf,
      enabledEnv,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted).toHaveLength(1);
    const r = res.data.accepted[0]!;
    expect(r.playerId).toBe("11533");
    expect(r.adp).toBe(999.0);
    expect(r.ptsPpr).toBe(8.5);
    expect(r.statProjections).toMatchObject({ fga: 2.35, fgm: 2.04 });
    expect(r.season).toBe(2026);
    expect(r.week).toBe(4);
  });

  it("rejects an invalid season/week", () => {
    expect(ingestSleeperProjections(2026, 0, {}, asOf, enabledEnv).ok).toBe(false);
    expect(ingestSleeperProjections(1999, 4, {}, asOf, enabledEnv).ok).toBe(false);
  });

  it("rejects a non-object payload", () => {
    expect(ingestSleeperProjections(2026, 4, null as never, asOf, enabledEnv).ok).toBe(false);
  });
});

describe("ingestSleeperWeekStats", () => {
  it("fails closed when disabled", () => {
    const res = ingestSleeperWeekStats(2026, 3, {}, asOf, disabledEnv);
    expect(res.ok).toBe(false);
  });

  it("normalizes games active, pos ranks and stat lines", () => {
    const res = ingestSleeperWeekStats(
      2026,
      3,
      {
        "12586": { gms_active: 1, pos_rank_half_ppr: 12, off_snp: 45 },
      },
      asOf,
      enabledEnv,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.accepted).toHaveLength(1);
    const r = res.data.accepted[0]!;
    expect(r.gamesActive).toBe(1);
    expect(r.posRankHalfPpr).toBe(12);
    expect(r.stats).toMatchObject({ off_snp: 45 });
    expect(r.source).toBe("sleeper-projections-api");
  });
});
