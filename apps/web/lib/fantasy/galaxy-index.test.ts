import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  galaxyIndex,
  galaxyIndexPool,
  galaxySignals,
  positionStats,
  GALAXY_WEIGHTS,
  GALAXY_CONFIDENCE,
  GALAXY_HALF_LIFE_DAYS,
  INDEX_CENTER,
} from "./galaxy-index";
import type { Player, Pos, Trend, Injury } from "./players";

/**
 * The band is DERIVED from proj at the neutral ratios the upside/floorSafety
 * centres assume (ceiling +25%, floor -35%), so overriding `proj` alone changes
 * only the production signal. A first draft held floor and ceiling fixed while
 * varying proj, which handed a 120-point player a 108% ceiling headroom and
 * inverted a ranking - a fixture artifact that looked exactly like a scoring
 * defect. Pass floor/ceiling explicitly to exercise the band.
 */
const mk = (
  id: string,
  pos: Pos,
  over: Partial<Player> = {},
): Player => {
  const proj = over.proj ?? 200;
  return {
    id,
    name: id,
    pos,
    team: "AAA",
    bye: 7,
    proj,
    floor: Math.round(proj * 0.65),
    ceiling: Math.round(proj * 1.25),
    usage: 0.5,
    schemeFit: 0.6,
    role: "role",
    trend: "flat" as Trend,
    injury: "healthy" as Injury,
    note: "",
    ...over,
  };
};

/** A pool with real spread so z-scores exist. */
const pool = (): Player[] => [
  mk("a", "RB", { proj: 300 }),
  mk("b", "RB", { proj: 250 }),
  mk("c", "RB", { proj: 200 }),
  mk("d", "RB", { proj: 150 }),
  mk("e", "RB", { proj: 100 }),
];

describe("the Galaxy Index is a blend, not a projection rename", () => {
  it("separates two players who share a projection", () => {
    // The entire product claim in one assertion. If the index cannot tell
    // these apart it is a rename of `proj` with extra steps.
    const players = [
      ...pool(),
      mk("same-good", "RB", { proj: 220, usage: 0.82, schemeFit: 0.84, trend: "up" }),
      mk("same-bad", "RB", { proj: 220, usage: 0.22, schemeFit: 0.38, trend: "down" }),
    ];
    const idx = galaxyIndexPool(players);
    const good = idx.get("same-good")!;
    const bad = idx.get("same-bad")!;
    expect(good.index).toBeGreaterThan(bad.index);
    // And by a margin a reader would act on. DERIVED, not picked: the gap must
    // exceed the median gap between consecutive players in the ranked pool, so
    // the two are not merely adjacent. A hand-chosen "> 10" here would be a
    // number fitted to the output rather than a statement of the contract.
    const ranked = [...idx.values()].map((r) => r.index).sort((a, b) => b - a);
    const gaps = ranked.slice(1).map((v, i) => ranked[i]! - v).sort((a, b) => a - b);
    const medianGap = gaps[Math.floor(gaps.length / 2)]!;
    expect(good.index - bad.index).toBeGreaterThan(medianGap);
  });

  it("centres a league-average player on 50", () => {
    // Every signal at its neutral reading: projection exactly at the position
    // mean, an even usage split, the neutral scheme fit, healthy, flat trend,
    // and a band at the widths the upside/floorSafety centres assume.
    const stats = positionStats([mk("x", "RB", { proj: 100 }), mk("y", "RB", { proj: 300 })]);
    const average = mk("avg", "RB", {
      proj: 200,
      ceiling: 250, // (250-200)/200 = 0.25, the upside centre
      floor: 130, // (200-130)/200 = 0.35, the floorSafety centre
      usage: 0.5,
      schemeFit: 0.6,
      trend: "flat",
      injury: "healthy",
    });
    expect(galaxyIndex(average, stats).index).toBe(INDEX_CENTER);
  });

  it("omits a signal it does not have instead of scoring it average", () => {
    // A position where every player projects identically has no relative
    // reading to give. Reporting z = 0 would assert "exactly league average",
    // which is a claim about a measurement that was never made.
    const flat = [mk("p", "TE", { proj: 120 }), mk("q", "TE", { proj: 120 })];
    const keys = galaxySignals(flat[0]!, positionStats(flat)).map((s) => s.key);
    expect(keys).not.toContain("production");
    // The rest still contribute — one missing input must not void the index.
    expect(keys).toContain("usage");
    expect(galaxyIndex(flat[0]!, positionStats(flat)).signalsUsed).toBeGreaterThan(0);
  });
});

describe("the honesty valves are wired, not decorative", () => {
  it("NEVER reads injuryDisplay — a rights boundary, asserted at the source", () => {
    // players.ts: the Sleeper-joined live injury flag is display-only under the
    // sleeper-api posture (commercial_display_allowed false, enrichment only,
    // never the value basis). The index IS a paid number. Asserted against the
    // FILE because the failure mode is a later author reaching for the more
    // informative field without knowing why the less informative one is there,
    // and a behavioural test can only prove the rows it happens to build.
    const src = readFileSync(join(__dirname, "galaxy-index.ts"), "utf8");
    const reads = src.split("\n").filter(
      (line) => line.includes("injuryDisplay") && !line.trimStart().startsWith("*"),
    );
    expect(reads, "injuryDisplay reached a scoring path").toEqual([]);
  });

  it("decays an old basis rather than pretending it is current", () => {
    const players = pool();
    const stats = positionStats(players);
    const strong = mk("s", "RB", { proj: 300, usage: 0.85 });
    const fresh = galaxyIndex(strong, stats, { basisAgeDays: 0 });
    // One half-life: a full offseason. This is the Week 1 case.
    const stale = galaxyIndex(strong, stats, { basisAgeDays: GALAXY_HALF_LIFE_DAYS });

    // The evidence behind the number shrinks with age. That is the freshness
    // half-life doing real work, not a label.
    // Exactly halved on the aged signals, by construction of the half-life.
    expect(stale.evidenceWeight).toBeLessThan(fresh.evidenceWeight);
    // A strong player still reads strong on an old basis - decay reduces
    // CONFIDENCE in the reading, it does not invert it.
    expect(stale.index).toBeGreaterThan(INDEX_CENTER);
    // And it pulls toward neutral, because the aged production/usage signals
    // lose share to the un-aged status signals.
    expect(stale.index).toBeLessThan(fresh.index);
  });

  it("does not inherit compositeScore's 14-day news half-life", () => {
    // Found by the test above failing on the first version of this module.
    // compositeScore defaults to 14 days, tuned for in-season news. A Week 1
    // index runs on a ~240-day-old basis, and 0.5^(240/14) = 6.9e-6 zeroes the
    // production, usage, upside, floorSafety and schemeFit signals.
    //
    // CORRECTED (C-236): this comment used to say EVERY player returned exactly
    // 50. Measured, that is false - availability and trend push with ageDays 0,
    // so they survive any half-life and the pool spreads over 30.1 / 32 / 48.1 /
    // 50 / 51.9, with 22 of 30 players off 50. THIS fixture returns exactly 50
    // because mk() defaults to healthy and flat, which is the only combination
    // that lands on centre. The defect pinned below is real; the description of
    // it was not. Kept because the failure is silent either way: a ranking that
    // cannot separate anyone on production looks conservative rather than broken.
    const stats = positionStats(pool());
    const strong = mk("hl", "RB", { proj: 300, usage: 0.85 });
    const newsHalfLife = galaxyIndex(strong, stats, { basisAgeDays: 240, halfLifeDays: 14 });
    expect(newsHalfLife.index).toBe(INDEX_CENTER); // the broken behaviour, pinned
    expect(GALAXY_HALF_LIFE_DAYS).toBeGreaterThan(14 * 10);
    expect(galaxyIndex(strong, stats, { basisAgeDays: 240 }).index).toBeGreaterThan(INDEX_CENTER);
  });

  it("keeps this-week status signals fresh even on a season-old basis", () => {
    // Availability and trend describe THIS WEEK. Ageing them with the
    // production basis would decay a status report for being about a season
    // that has not been played yet.
    const aged = galaxySignals(mk("z", "RB", { trend: "up", injury: "questionable" }), positionStats(pool()), {
      basisAgeDays: GALAXY_HALF_LIFE_DAYS,
    });
    expect(aged.find((s) => s.key === "availability")?.ageDays).toBe(0);
    expect(aged.find((s) => s.key === "trend")?.ageDays).toBe(0);
    expect(aged.find((s) => s.key === "production")?.ageDays).toBe(GALAXY_HALF_LIFE_DAYS);
  });

  it("does not let a reported trend vote like a settled usage share", () => {
    // compositeScore's confidence valve, used as its own docstring intends.
    // Both the weight and the confidence must be lower, and the test asserts
    // the ORDERING rather than the literals so retuning the numbers does not
    // silently invert the principle.
    expect(GALAXY_WEIGHTS.trend).toBeLessThan(GALAXY_WEIGHTS.usage);
    expect(GALAXY_CONFIDENCE.trend).toBeLessThan(GALAXY_CONFIDENCE.usage);
    expect(GALAXY_CONFIDENCE.trend).toBeLessThan(GALAXY_CONFIDENCE.production);

    // And measured, not just declared: flipping the trend must move the index
    // by less than flipping usage across the same span.
    const stats = positionStats(pool());
    const base = mk("t", "RB", { proj: 200, usage: 0.5, trend: "flat" });
    const trendSwing =
      galaxyIndex({ ...base, trend: "up" }, stats).index -
      galaxyIndex({ ...base, trend: "down" }, stats).index;
    const usageSwing =
      galaxyIndex({ ...base, usage: 0.9 }, stats).index -
      galaxyIndex({ ...base, usage: 0.1 }, stats).index;
    expect(Math.abs(trendSwing)).toBeLessThan(Math.abs(usageSwing));
  });

  it("scores an unavailable player down without silently excluding him", () => {
    // The index scores QUALITY. Dropping an unavailable player is the caller's
    // decision (lineup.ts, the DFS excludes) and must stay visible there
    // rather than hiding inside a number.
    const stats = positionStats(pool());
    const p = mk("inj", "RB", { proj: 300 });
    const healthy = galaxyIndex(p, stats);
    const out = galaxyIndex({ ...p, injury: "out" }, stats);
    expect(out.index).toBeLessThan(healthy.index);
    expect(out.index).toBeGreaterThan(0); // scored, not excluded
    expect(galaxyIndex({ ...p, injury: "questionable" }, stats).index).toBeGreaterThan(out.index);
  });
});

describe("the index explains itself", () => {
  it("names its drivers strongest first", () => {
    // The factor trail IS the product ("math you can read"). If this order is
    // wrong the headline driver shown to a user is not the biggest one.
    const { drivers } = galaxyIndex(
      mk("d", "RB", { proj: 300, usage: 0.9, trend: "up" }),
      positionStats(pool()),
    );
    expect(drivers.length).toBeGreaterThan(3);
    for (let i = 1; i < drivers.length; i++) {
      expect(Math.abs(drivers[i - 1]!.contribution)).toBeGreaterThanOrEqual(
        Math.abs(drivers[i]!.contribution),
      );
    }
  });

  it("reports weight shares that account for the whole blend", () => {
    const { drivers } = galaxyIndex(mk("w", "RB", { proj: 250 }), positionStats(pool()));
    const total = drivers.reduce((s, d) => s + d.weightShare, 0);
    // Derived tolerance: each share is round4'd independently, so the sum
    // carries up to one half-ulp per driver.
    expect(Math.abs(total - 1)).toBeLessThanOrEqual(drivers.length * 0.00005);
  });
});

describe("the pool centres every player against the same peer group", () => {
  it("gives identical players identical indices", () => {
    const players = [...pool(), mk("twin1", "RB", { proj: 275 }), mk("twin2", "RB", { proj: 275 })];
    const idx = galaxyIndexPool(players);
    expect(idx.get("twin1")!.index).toBe(idx.get("twin2")!.index);
  });

  it("centres within position, not across the whole pool", () => {
    // A 60-point TE in a pool of 300-point RBs is an ELITE TE, and a score
    // that ranks him below every RB is measuring the position, not the player.
    const players = [
      ...pool(),
      mk("te-elite", "TE", { proj: 220 }),
      mk("te-mid", "TE", { proj: 120 }),
      mk("te-low", "TE", { proj: 60 }),
    ];
    const idx = galaxyIndexPool(players);
    expect(idx.get("te-elite")!.index).toBeGreaterThan(idx.get("c")!.index); // beats the median RB
    expect(idx.get("te-elite")!.index).toBeGreaterThan(idx.get("te-mid")!.index);
    expect(idx.get("te-mid")!.index).toBeGreaterThan(idx.get("te-low")!.index);
  });

  it("stays inside 0..100 on hostile inputs", () => {
    const players = [
      mk("hostile", "WR", {
        proj: Number.POSITIVE_INFINITY,
        floor: Number.NaN,
        ceiling: -1,
        usage: 400,
        schemeFit: -50,
      }),
      mk("normal", "WR", { proj: 200 }),
      mk("normal2", "WR", { proj: 100 }),
    ];
    const idx = galaxyIndexPool(players);
    for (const [id, r] of idx) {
      expect(Number.isFinite(r.index), `${id} index not finite`).toBe(true);
      expect(r.index).toBeGreaterThanOrEqual(0);
      expect(r.index).toBeLessThanOrEqual(100);
    }
  });
});
