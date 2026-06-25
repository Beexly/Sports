/**
 * STATE COMPILERS — exhaustive, per-state success / missing / conflict.
 *
 * Proves the compiler knows every story, not one: the registry covers the canonical union exactly, each
 * state builds its OWN claims + subject-titled narrative and reports the fact it actually observed (not
 * always route_rate), fewer facts never strengthen a card, and a source contradiction never strengthens it.
 */

import { describe, it, expect } from "vitest";
import type { FactType } from "@sports/data-intelligence";
import {
  ALL_DECISION_STATES,
  STATE_COMPILERS,
  cardStrengthFromClaims,
  rankOf,
  type CompileContext,
} from "../index.js";

// A "success" world where one fact from every group is creditable.
const ALL_FACTS = new Set<FactType>([
  "route_rate", "snap_share", "target_share", "carry_share",
  "player_prop", "spread", "total", "moneyline",
  "platform_projection", "roster_pct", "adp", "start_pct",
  "betting_splits", "add_drop_velocity", "social_trend",
  "odds_history", "closing_line",
  "injury_report", "practice_status", "inactive_status",
  "dfs_salary", "dfs_slate", "ownership_projection", "actual_ownership",
]);
const NO_FACTS = new Set<FactType>();

function ctx(creditableTypes: ReadonlySet<FactType>, hasContradiction = false): CompileContext {
  return { subjectLabel: "Test Player", creditableTypes, roleSignal: "aligned", hasContradiction, marketAlreadyCaughtUp: false };
}

describe("STATE_COMPILERS registry is exhaustive over the canonical union", () => {
  it("covers exactly ALL_DECISION_STATES, each keyed to its own state", () => {
    expect(Object.keys(STATE_COMPILERS).sort()).toEqual([...ALL_DECISION_STATES].sort());
    for (const s of ALL_DECISION_STATES) expect(STATE_COMPILERS[s].state).toBe(s);
  });

  it("reports the observed fact per state — NOT always route_rate", () => {
    const observed = ALL_DECISION_STATES
      .map((s) => STATE_COMPILERS[s].buildNarrative(ctx(ALL_FACTS)).observedFact)
      .filter((f): f is FactType => f !== null);
    // Market/DFS states observe market/DFS facts, not route_rate.
    expect(STATE_COMPILERS.GOOD_IDEA_BAD_PRICE.buildNarrative(ctx(ALL_FACTS)).observedFact).not.toBe("route_rate");
    expect(STATE_COMPILERS.DFS_SALARY_LAG.buildNarrative(ctx(ALL_FACTS)).observedFact).toBe("dfs_salary");
    expect(STATE_COMPILERS.OWNERSHIP_OVERREACTION.buildNarrative(ctx(ALL_FACTS)).observedFact).toBe("ownership_projection");
    expect(new Set(observed).size).toBeGreaterThan(1); // more than one distinct observed fact across states
  });
});

for (const state of ALL_DECISION_STATES) {
  const compiler = STATE_COMPILERS[state];
  describe(`compiler · ${state}`, () => {
    it("success: builds ≥1 claim + a subject-titled narrative; observed fact is creditable", () => {
      const claims = compiler.detectClaims(ctx(ALL_FACTS));
      const nar = compiler.buildNarrative(ctx(ALL_FACTS));
      expect(claims.length).toBeGreaterThan(0);
      expect(nar.title).toContain("Test Player");
      expect(nar.whatChanged.length).toBeGreaterThan(0);
      expect(nar.whatItMeans.length).toBeGreaterThan(0);
      if (nar.observedFact) expect(ALL_FACTS.has(nar.observedFact)).toBe(true);
    });

    it("missing: a card with no facts is never STRONGER than with facts", () => {
      const succ = cardStrengthFromClaims(compiler.detectClaims(ctx(ALL_FACTS)));
      const miss = cardStrengthFromClaims(compiler.detectClaims(ctx(NO_FACTS)));
      expect(rankOf(miss)).toBeLessThanOrEqual(rankOf(succ));
    });

    it("conflict: a contradicted read is never STRONGER than a clean one", () => {
      const clean = cardStrengthFromClaims(compiler.detectClaims(ctx(ALL_FACTS, false)));
      const conflicted = cardStrengthFromClaims(compiler.detectClaims(ctx(ALL_FACTS, true)));
      expect(rankOf(conflicted)).toBeLessThanOrEqual(rankOf(clean));
    });
  });
}

describe("specific state behaviours", () => {
  it("ROLE_UP_FANTASY_LATE collapses to INFO_ONLY without any role fact", () => {
    const miss = cardStrengthFromClaims(STATE_COMPILERS.ROLE_UP_FANTASY_LATE.detectClaims(ctx(NO_FACTS)));
    expect(miss).toBe("INFO_ONLY");
  });
  it("DATA_CONFLICT surfaces a CONFLICTED claim when a signal is present", () => {
    const claims = STATE_COMPILERS.DATA_CONFLICT.detectClaims(ctx(ALL_FACTS));
    expect(claims[0]!.proofStatus).toBe("CONFLICTED");
  });
});
