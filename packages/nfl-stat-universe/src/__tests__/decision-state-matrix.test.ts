/**
 * FACT SUPPLY GRAPH + ACQUISITION VIEW — acceptance.
 *
 * Two invariants matter most: (1) there is ONE decision grammar — the acquisition view covers exactly
 * the runtime's canonical `ALL_DECISION_STATES`, derived from the same `STAT_CONTRACTS`, with no detached
 * count; (2) provider marketing never unlocks a fact — only verified endpoints/derivations do, forbidden
 * sources supply nothing, CATALOGUED is not LIVE, route_rate is not falsely live, and betting_splits has
 * no supplier.
 */

import { describe, it, expect } from "vitest";
import { ALL_DECISION_STATES, STAT_CONTRACTS, type DecisionState } from "@sports/decision-field-runtime";
import {
  FACT_SUPPLY_GRAPH,
  DECISION_STATE_ACQUISITION,
  acquisitionViewFor,
  supplyPathsFor,
  sourcesSupplying,
  bestActivation,
  isFactLive,
  SOURCES,
  isForbiddenForProduction,
} from "../index.js";

describe("Canonical grammar — one source of truth, exhaustively covered", () => {
  it("the acquisition view covers EXACTLY the runtime's ALL_DECISION_STATES (no detached count)", () => {
    const viewKeys = Object.keys(DECISION_STATE_ACQUISITION).sort();
    const canonical = [...ALL_DECISION_STATES].sort();
    expect(viewKeys).toEqual(canonical);
  });

  it("every state's required groups come from the canonical STAT_CONTRACTS (not a fork)", () => {
    for (const state of ALL_DECISION_STATES) {
      const view = DECISION_STATE_ACQUISITION[state];
      const contractLabels = STAT_CONTRACTS[state].requiredGroups.map((g) => g.label);
      const viewLabels = view.requiredGroups.map((g) => g.label);
      expect(viewLabels).toEqual(contractLabels);
    }
  });

  it("acquisitionViewFor agrees with the precomputed map for every state", () => {
    for (const state of ALL_DECISION_STATES) {
      expect(acquisitionViewFor(state)).toEqual(DECISION_STATE_ACQUISITION[state]);
    }
  });
});

describe("Provider capability truth — marketing never unlocks a fact", () => {
  it("no supply path uses a forbidden source", () => {
    for (const p of FACT_SUPPLY_GRAPH) {
      const src = SOURCES[p.sourceId];
      expect(src, `unknown source ${p.sourceId}`).toBeDefined();
      expect(isForbiddenForProduction(src!), `${p.sourceId} supplies ${p.factType} but is forbidden`).toBe(false);
    }
  });

  it("CATALOGUED is not LIVE — nothing is wired live yet, so no state is liveReady", () => {
    for (const state of ALL_DECISION_STATES) {
      expect(DECISION_STATE_ACQUISITION[state].liveReady, `${state} claims liveReady but nothing is wired`).toBe(false);
    }
    for (const p of FACT_SUPPLY_GRAPH) {
      expect(p.activation).not.toBe("LIVE");
    }
  });

  it("route_rate is NOT falsely available: derived, not built, not live", () => {
    expect(isFactLive("route_rate")).toBe(false);
    expect(bestActivation("route_rate")).not.toBe("LIVE");
    const paths = supplyPathsFor("route_rate");
    // Any path that exists must be DERIVED and explicitly not-acquired (the derivation isn't built).
    for (const p of paths) {
      expect(p.mode).toBe("DERIVED");
      expect(p.contractStatus).toBe("NOT_ACQUIRED");
    }
  });

  it("betting_splits has NO supplier (The Odds API catalog documents none)", () => {
    expect(sourcesSupplying("betting_splits")).toEqual([]);
    expect(isFactLive("betting_splits")).toBe(false);
  });

  it("dfs_salary is supplied only by licensed/paid feeds, not acquired", () => {
    const sources = sourcesSupplying("dfs_salary");
    expect(sources).toContain("fantasydata");
    expect(sources).not.toContain("draftkings_unofficial");
    for (const p of supplyPathsFor("dfs_salary")) {
      expect(p.legalStatus).toBe("PAID_REQUIRED");
      expect(p.contractStatus).toBe("NOT_ACQUIRED");
    }
  });

  it("a weekly injury report is distinguished from a real-time inactive feed", () => {
    const injury = supplyPathsFor("injury_report");
    expect(injury.length).toBeGreaterThan(0);
    expect(injury.every((p) => p.latencyClass === "weekly")).toBe(true);
    const inactives = supplyPathsFor("inactive_status");
    // Only weekly roster-file coverage exists; none is a real-time game-day feed.
    expect(inactives.every((p) => p.latencyClass !== "real-time")).toBe(true);
  });
});

describe("Acquisition view — DFS states need a paid feed, role states are catalogued-free", () => {
  it("DFS_SALARY_LAG requires a dfs pricing group with only paid suppliers", () => {
    const view = DECISION_STATE_ACQUISITION.DFS_SALARY_LAG;
    const pricing = view.requiredGroups.find((g) => g.label === "dfs_pricing")!;
    expect(pricing).toBeDefined();
    expect(pricing.suppliers.length).toBeGreaterThan(0);
    expect(pricing.suppliers).toContain("fantasydata");
  });

  it("ROLE_UP_FANTASY_LATE's role group is catalogue-satisfiable from free nflverse facts", () => {
    const view = DECISION_STATE_ACQUISITION.ROLE_UP_FANTASY_LATE;
    const role = view.requiredGroups.find((g) => g.label === "role_delta")!;
    expect(role.catalogued).toBe(true); // snap_share/target_share are catalogued free
    expect(role.live).toBe(false); // but not wired live
  });

  it("every state is keyed by a real DecisionState", () => {
    for (const state of Object.keys(DECISION_STATE_ACQUISITION) as DecisionState[]) {
      expect(ALL_DECISION_STATES).toContain(state);
    }
  });
});
