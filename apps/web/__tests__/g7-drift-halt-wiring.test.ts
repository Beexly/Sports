/**
 * G7 IS WIRED TO THE LIVE PUBLISH PATH.
 *
 * THE G7 MODULE WAS DEAD CODE. It computed a per-market-family calibration-drift
 * verdict correctly (see `packages/prediction-engine/src/learning/g7-circuit-breaker.ts`
 * and its 15-test suite + 10-mutation sweep), and NOTHING consumed it: the module had
 * ZERO live importers, and the spec's rule -- "If ECE30-ECE250>0.02, Gate G7 halts firing
 * on that market family" -- had no path to a family's picks.
 *
 * THE WIRING, IN THREE HOPS:
 *
 *   1. PRODUCER. `buildProvenPathPlan` now runs the G7 breaker over the settled,
 *      TIME-STAMPED rows it is already given, and puts the halt list on the plan as
 *      `g7HaltedGroups`. The rows come from the same settled picks the bake-off uses;
 *      the only new thing is the settlement timestamp, which the queries already
 *      selected.
 *   2. TRANSPORT. The plan is persisted whole (`JSON.stringify(plan)`) and read back
 *      whole, so the list survives to the runtime.
 *   3. CONSUMER. `passesPublicSelectiveFilter` -- which `/api/picks` calls per pick --
 *      drops a pick whose family is in the list.
 *
 * WHY THE G7 LIST IS NOT `pauseGroups`. `pauseGroups` is the FOUNDER's list and is
 * advisory until the founder opts in (`ranking-pause-apply.ts` needs
 * `RANKING_PAUSE_APPLY` or a durable founder-yes). A machine-computed calibration halt
 * must not need a human to approve it, and it must not overwrite the founder's list
 * either. So: two lists, two owners, applied together. These tests pin that separation
 * as well as the wiring.
 *
 * WHAT WOULD MAKE THESE TESTS VACUOUS, AND HOW EACH IS BLOCKED:
 *
 *   - A test that asserts the MODULE works. It already has 15 tests. Pointless here.
 *   - A test that asserts the plan CARRIES the list. That is one hop of three; the
 *     consumer could ignore it and the test would still pass. So the load-bearing
 *     assertion here is on the CONSUMER: the live filter's return value.
 *   - A test that would still pass if the wiring were deleted. So every test below
 *     has a CONTROL: the same pick shape, in a family that did NOT drift, still
 *     passes. The pair (control passes, halted drops) is what makes the difference
 *     attributable to G7 and to nothing else.
 */
import { describe, expect, it } from "vitest";
import { buildProvenPathPlan, type ProvenPathPickRow } from "@/lib/calibration/proven-path-engine";
import { passesPublicSelectiveFilter } from "@/lib/calibration/selective-publish-runtime";
import { G7_MIN_FAMILY_SAMPLES } from "@sports/prediction-engine";

/** A settled, time-stamped row for one family. */
function row(
  groupKey: string,
  i: number,
  p: number,
  y: 0 | 1,
  baseMs: number,
): ProvenPathPickRow {
  return {
    pConfidence: p,
    pEdge: null,
    pIndependent: p,
    marketP: null,
    y,
    groupKey,
    // One hour apart, so the fast window is unambiguously the most recent.
    settledAt: baseMs + i * 3_600_000,
  };
}

const BASE = Date.UTC(2026, 0, 1);

/**
 * A family whose LAST 30 settled bets are badly miscalibrated, on top of 250
 * well-calibrated ones.
 *
 * 280 samples: the first 250 are the slow baseline, the last 30 are the fast window.
 * `p = 0.9` with every outcome a loss is the worst possible calibration in that bin,
 * so ECE_fast ~ 0.9 against ECE_slow ~ 0.
 */
function driftingRows(groupKey: string, count = 280): ProvenPathPickRow[] {
  const out: ProvenPathPickRow[] = [];
  for (let i = 0; i < count; i++) {
    const isFastWindow = i >= count - 30;
    if (isFastWindow) {
      out.push(row(groupKey, i, 0.9, 0, BASE));
    } else {
      // Exactly 3 wins in every 5, so ANY window -- 30 or 250 -- has a 60% win
      // rate and an ECE of ~0. A pattern that only balanced over the whole set
      // would put noise in the fast window and the test would be measuring luck.
      out.push(row(groupKey, i, 0.6, i % 5 < 3 ? 1 : 0, BASE));
    }
  }
  return out;
}

/** A family that never drifts: calibrated throughout, by construction. */
function healthyRows(groupKey: string, count = 280): ProvenPathPickRow[] {
  const out: ProvenPathPickRow[] = [];
  for (let i = 0; i < count; i++) {
    out.push(row(groupKey, i, 0.6, i % 5 < 3 ? 1 : 0, BASE));
  }
  return out;
}

const DRIFTING = "nfl|MONEYLINE";
const HEALTHY = "nfl|SPREAD";

/** The public pick shape the live filter takes. */
function pickFor(groupKey: string) {
  const [sportKey, pickType] = groupKey.split("|");
  return {
    sportKey: sportKey ?? "unknown",
    pickType: pickType ?? "unknown",
    rankingP: 0.99,
    marketImpliedProb: null,
  };
}

describe("G7 is wired to the live publish path", () => {
  const rows = [...driftingRows(DRIFTING), ...healthyRows(HEALTHY)];
  const plan = buildProvenPathPlan(rows);

  it("the PLAN carries the G7 halt list, and only the drifting family is in it", () => {
    expect(plan.g7HaltedGroups, "the plan must carry a G7 halt list").toBeDefined();
    expect(plan.g7HaltedGroups).toContain(DRIFTING);
    expect(plan.g7HaltedGroups).not.toContain(HEALTHY);
    expect(plan.g7Note, "the plan must carry a note an operator can check").toBeTruthy();
  });

  it("THE LIVE FILTER DROPS A PICK FROM THE DRIFTING FAMILY -- the wiring itself", () => {
    // THIS IS THE LOAD-BEARING ASSERTION. The live filter is what `/api/picks`
    // calls per pick. If the consumer stopped consulting the G7 list, this
    // returns TRUE and the test fails.
    const dropped = passesPublicSelectiveFilter(pickFor(DRIFTING), {}, plan, null);
    expect(
      dropped,
      "a pick in a family G7 halted must NOT be published -- this is the wiring",
    ).toBe(false);
  });

  it("THE CONTROL: the same pick shape in a family that did NOT drift still publishes", () => {
    // Without this, the first test would pass for the wrong reason -- the pick
    // could be dropped by the selective thresholds rather than by G7, and the
    // wiring could be deleted with no test going red.
    const kept = passesPublicSelectiveFilter(pickFor(HEALTHY), {}, plan, null);
    expect(
      kept,
      "a pick in a healthy family must still publish -- otherwise the drop above " +
        "was caused by something other than G7",
    ).toBe(true);
  });

  it("the G7 signal is MACHINE-OWNED: it applies without the founder opting in", () => {
    // `pauseGroups` needs RANKING_PAUSE_APPLY (or a durable founder-yes). The G7
    // halt must NOT: a calibration halt must not need a human to approve it.
    const envWithoutOptIn = { RANKING_PAUSE_APPLY: "false", SELECTIVE_PUBLISH_ENABLED: "true" };
    const dropped = passesPublicSelectiveFilter(pickFor(DRIFTING), envWithoutOptIn, plan, null);
    expect(
      dropped,
      "the G7 halt must apply even when the founder has not opted into the pause list",
    ).toBe(false);
  });

  it("the G7 signal does NOT overwrite the founder's list", () => {
    // The founder's own pause list is a separate list with a separate owner. The
    // G7 list must not become it, and must not become a superset of it.
    //
    // The founder's list is applied through `RANKING_PAUSE_APPLY` (or
    // `SELECTIVE_PAUSE_GROUPS`, or a durable founder-yes) -- see
    // `ranking-pause-apply.ts`. Without one of those the plan's pauseGroups are
    // ADVISORY, which is why the env below is set: this test is about the two
    // lists being independent, not about the founder's opt-in mechanism.
    const founderEnv = { RANKING_PAUSE_APPLY: "true", SELECTIVE_PUBLISH_ENABLED: "true" };
    const founderPlan = { ...plan, pauseGroups: [HEALTHY] };
    const founderDropped = passesPublicSelectiveFilter(pickFor(HEALTHY), founderEnv, founderPlan, null);
    expect(founderDropped, "the founder's pause list must still pause its own family").toBe(false);
    expect(
      plan.g7HaltedGroups,
      "the founder's pause list must not have been written into the G7 list",
    ).not.toContain(HEALTHY);
    // And the founder's list must not have been written into the G7 consumer
    // either: with the founder's opt-in OFF, the healthy family still publishes.
    const noOptIn = passesPublicSelectiveFilter(pickFor(HEALTHY), {}, founderPlan, null);
    expect(
      noOptIn,
      "with the founder's opt-in off, the plan's pause list must not apply",
    ).toBe(true);
  });

  it("a family with too FEW settled bets is not judged -- no evidence, no halt", () => {
    const thin = healthyRows("nfl|TOTAL").slice(0, G7_MIN_FAMILY_SAMPLES - 1);
    const thinPlan = buildProvenPathPlan([...thin, ...healthyRows(HEALTHY)]);
    expect(
      thinPlan.g7HaltedGroups ?? [],
      "a family below the sample floor must never be halted",
    ).not.toContain("nfl|TOTAL");
    expect(
      passesPublicSelectiveFilter(pickFor("nfl|TOTAL"), {}, thinPlan, null),
      "a thin family must still publish",
    ).toBe(true);
  });

  it("rows WITHOUT a settlement time are not silently treated as recent", () => {
    // A row with no timestamp has no place in either window. It is skipped, not
    // defaulted -- and the family it would have been in must therefore not be
    // halted on the strength of a sample it did not actually contribute to.
    const noTime: ProvenPathPickRow[] = driftingRows("nfl|SPREAD").map((r) => ({
      ...r,
      settledAt: null,
    }));
    const untimedPlan = buildProvenPathPlan([...noTime, ...healthyRows(HEALTHY)]);
    expect(
      untimedPlan.g7HaltedGroups ?? [],
      "a family whose rows have no settlement time must not be halted",
    ).not.toContain("nfl|SPREAD");
  });
});
