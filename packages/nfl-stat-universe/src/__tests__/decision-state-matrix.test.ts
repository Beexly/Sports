/**
 * DECISION-STATE STAT MATRIX — acceptance.
 *
 * The matrix is the demand-and-supply spec: for every decision state, exactly which facts are required,
 * which source supplies them, the legal floor, and the strongest card it may be when a required fact is
 * missing. These invariants make the matrix safe to trust: nothing forbidden can back a card, missing
 * required data can NEVER reach an action card, and every required fact has a real production source.
 */

import { describe, it, expect } from "vitest";
import { STRENGTH_ORDER, type MaxPermittedStrength } from "@sports/decision-field-runtime";
import {
  DECISION_STATE_MATRIX,
  ALL_DECISION_STATES,
  PROVIDER_UNLOCKS,
  sourcesUnlocking,
  SOURCES,
  isForbiddenForProduction,
  isPaidRequired,
} from "../index.js";

const ACTION_RANK = STRENGTH_ORDER.ACTION; // 4 — missing required data must stay strictly below this

describe("Decision-state matrix — every state has a complete, sound contract", () => {
  it("declares all 14 states and each contract's key matches its state", () => {
    expect(ALL_DECISION_STATES.length).toBe(14);
    for (const key of ALL_DECISION_STATES) {
      const c = DECISION_STATE_MATRIX[key];
      expect(c, `no contract for ${key}`).toBeDefined();
      expect(c.state).toBe(key);
      expect(c.legalFloor.length, `${key} has no legal floor`).toBeGreaterThan(0);
    }
  });

  it("never names a forbidden source as a free or paid source", () => {
    for (const c of Object.values(DECISION_STATE_MATRIX)) {
      for (const s of [c.freeSource, c.paidSource]) {
        if (s === null) continue;
        const src = SOURCES[s];
        expect(src, `${c.state} names unknown source ${s}`).toBeDefined();
        expect(isForbiddenForProduction(src!), `${c.state} names forbidden source ${s}`).toBe(false);
      }
    }
  });

  it("caps every state below ACTION when a required fact is missing (fail-safe)", () => {
    for (const c of Object.values(DECISION_STATE_MATRIX)) {
      const rank = STRENGTH_ORDER[c.maxStrengthIfMissing as MaxPermittedStrength];
      expect(rank, `${c.state} can reach ${c.maxStrengthIfMissing} with a required fact missing`).toBeLessThan(ACTION_RANK);
    }
  });

  it("every required fact is unlockable by at least one production source", () => {
    for (const c of Object.values(DECISION_STATE_MATRIX)) {
      for (const fact of c.requiredFacts) {
        expect(sourcesUnlocking(fact).length, `${c.state} requires ${fact} but no production source unlocks it`).toBeGreaterThan(0);
      }
    }
  });
});

describe("Decision-state matrix — the data-hunger contracts the plan demands", () => {
  it("fantasy-late can't reach ACTION without a fantasy snapshot (caps at WATCH)", () => {
    const c = DECISION_STATE_MATRIX.ROLE_UP_FANTASY_LATE;
    expect(c.requiredFacts).toContain("platform_projection");
    expect(c.maxStrengthIfMissing).toBe("WATCH");
  });

  it("DFS can't reach ACTION without a licensed salary feed", () => {
    const c = DECISION_STATE_MATRIX.DFS_SALARY_LAG;
    expect(c.requiredFacts).toContain("dfs_salary");
    expect(c.maxStrengthIfMissing).toBe("INFO_ONLY");
    expect(c.paidSource, "DFS_SALARY_LAG must name a paid salary source").not.toBeNull();
    expect(isPaidRequired(SOURCES[c.paidSource!]!), "DFS_SALARY_LAG's salary source must be a licensed/paid feed").toBe(true);
  });

  it("ownership overreaction is grounded in a projected-ownership fact", () => {
    expect(DECISION_STATE_MATRIX.OWNERSHIP_OVERREACTION.requiredFacts).toContain("ownership_projection");
  });

  it("market-lag needs timestamped book snapshots (odds_history)", () => {
    expect(DECISION_STATE_MATRIX.PLAYER_PROP_MARKET_LAG.requiredFacts).toContain("odds_history");
  });

  it("injury-conflict surfaces the disagreement rather than resolving it as fact", () => {
    const c = DECISION_STATE_MATRIX.INJURY_SOURCE_CONFLICT;
    expect(c.requiredFacts).toContain("injury_report");
    expect(c.requiredFacts).toContain("practice_status");
    expect(c.publicLanguageLimits.some((l) => /disagreement/i.test(l))).toBe(true);
  });
});

describe("Decision-state matrix — the provider-unlock map keeps forbidden sources powerless", () => {
  it("a forbidden source unlocks nothing for production", () => {
    for (const [sourceId, facts] of Object.entries(PROVIDER_UNLOCKS)) {
      const src = SOURCES[sourceId];
      if (src && isForbiddenForProduction(src)) {
        expect(facts.length, `forbidden ${sourceId} unlocks ${facts.join(", ")}`).toBe(0);
      }
    }
    expect(PROVIDER_UNLOCKS.draftkings_unofficial).toEqual([]);
    expect(PROVIDER_UNLOCKS.pfr_scrape).toEqual([]);
  });

  it("sourcesUnlocking never returns a forbidden source", () => {
    const everyFact = new Set(Object.values(PROVIDER_UNLOCKS).flat());
    for (const fact of everyFact) {
      for (const sourceId of sourcesUnlocking(fact)) {
        const src = SOURCES[sourceId];
        expect(src && isForbiddenForProduction(src), `${sourceId} unlocking ${fact} is forbidden`).toBeFalsy();
      }
    }
  });

  it("dfs_salary is unlocked by a licensed feed, never by the unofficial scraper", () => {
    const unlockers = sourcesUnlocking("dfs_salary");
    expect(unlockers).toContain("fantasydata");
    expect(unlockers).not.toContain("draftkings_unofficial");
  });
});
