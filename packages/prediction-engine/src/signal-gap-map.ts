/**
 * Competitive / research signal gap map — precise file:line evidence.
 *
 * Ops notes name five high-leverage candidates. This module is the honest
 * inventory of what is ALREADY implemented, what this PR wires, and what
 * remains un-wired with the exact reason. It never claims a live signal
 * that is not live. Tracked TODOs, not fake stubs.
 *
 * Pure data. No I/O. Read by tests and by the PR body.
 */

export type SignalGapStatus =
  | "WIRED_LIVE"
  | "WIRED_FLAGGED" // implemented + tests + flag default off (this PR)
  | "IMPLEMENTED_NOT_WIRED" // full module + tests, zero live callers
  | "CATALOG_ONLY"; // named in a catalog, no module yet

export interface SignalGapEntry {
  /** Ops-note candidate name. */
  readonly key: string;
  readonly status: SignalGapStatus;
  /** Module path when a real implementation exists. */
  readonly module: string | null;
  /** Test path when tests exist. */
  readonly test: string | null;
  /** Flag name and default, when flag-gated. */
  readonly flag: string | null;
  /** Precise reason it is not (yet) driving published picks. */
  readonly reason: string;
  /** One-line data-path verdict: is there a clear, legal, in-repo path? */
  readonly dataPath: "CLEAR" | "PARTIAL" | "BLOCKED";
}

export const SIGNAL_GAP_MAP: readonly SignalGapEntry[] = [
  {
    key: "opp_adj_epa_team",
    status: "IMPLEMENTED_NOT_WIRED",
    module: "packages/prediction-engine/src/signals/opponent-adjusted-epa.ts",
    test: "packages/prediction-engine/src/signals/__tests__/opponent-adjusted-epa.test.ts",
    flag: null,
    reason:
      "computeOpponentAdjustedEpa is complete (466 lines, iterative opponent netting + DAVE-cited shrinkage, kill line pre-registered) but the file header states NOT WIRED IN: the combining WEIGHT against Elo is a calibration decision the module refuses to invent, and wiring it is a MODEL_VERSION bump. Related live path: opponent-adjusted.ts + nfl-epa-fair-value.ts (unchanged). Sibling PR #867 (hermes/opp-adj-epa-20260919) owns the live duels; do not fight it.",
    dataPath: "CLEAR",
  },
  {
    key: "expected_turnover_diff",
    status: "WIRED_FLAGGED",
    module: "packages/prediction-engine/src/signals/expected-turnover-diff.ts",
    test: "packages/prediction-engine/src/signals/__tests__/expected-turnover-diff.test.ts",
    flag: "EXPECTED_TURNOVER_DIFF_ENABLED (default false)",
    reason:
      "THIS PR. Thin signed-diff adapter over the already-tested computeTurnoverLuck decomposition (signals/turnover-luck.ts, which was NOT WIRED IN). Pure, additive, disabled by default. Combining weight vs Elo still requires a MODEL_VERSION step — the adapter only emits the differential.",
    dataPath: "CLEAR",
  },
  {
    key: "pressure_matchup",
    status: "CATALOG_ONLY",
    module: null,
    test: null,
    flag: null,
    reason:
      "No pressure_matchup module exists on this branch. Partial adjacent work: signals/efficiency/qb-turnover-worthy-play-regression.ts (turnover-luck differential on QB INTs) and signals/trench/offensive-line-continuity.ts. A true pressure_matchup (OL pressure rate vs DL pressure rate) needs per-side pressure rates per dropback — present in docs/research/2026-09-17/dossiers/advanced-metrics-data-source-catalog.md but not yet an ingestion adapter. NOT stubbed here so it cannot look live.",
    dataPath: "PARTIAL",
  },
  {
    key: "qb_epa_cpoe",
    status: "CATALOG_ONLY",
    module: null,
    test: null,
    flag: null,
    reason:
      "No qb_epa_cpoe module exists on this branch. Expected-metrics family (expected-metrics/expected-completion.ts, success-rate.ts, win-probability.ts) covers xCOMP/xSUCCESS/xEP at the PLAY level and is inventoried, but there is no QB-level EPA+CPOE composite and no ingestion of per-QB trailing EPA/CPOE. Leave as tracked TODO.",
    dataPath: "PARTIAL",
  },
  {
    key: "market_clv_features",
    status: "WIRED_FLAGGED",
    module: "packages/prediction-engine/src/market-clv-features.ts",
    test: "packages/prediction-engine/src/__tests__/market-clv-features.test.ts",
    flag: "MARKET_CLV_FEATURES_ENABLED (default false)",
    reason:
      "THIS PR. Pure feature extractor over the existing CLV open/close pair (clvOpen* written at mint, deriveClosingSnapshotFromOdds at settle). Produces clvBps + lineMoveForUs + beatClose for the Elite line-value ledger and the ESTABLISHED ≥52.4% gate. No new schema, no new pricing ladder.",
    dataPath: "CLEAR",
  },
  {
    key: "strength.opp_adj_epa (frontier catalog)",
    status: "CATALOG_ONLY",
    module: null, // frontier-signal-catalog.ts is on cursor/wire-port-contract-79e9, NOT on main
    test: null,
    flag: null,
    reason:
      "packages/prediction-engine/src/frontier-signal-catalog.ts does NOT exist on origin/main (this worktree). It exists only on the sibling wire-port-contract branch (cursor/wire-port-contract-79e9) where strength.opp_adj_epa is catalogued at that file's line 63. Do not restate the catalog here; track the import until that branch lands. Adjacent implemented module: signals/opponent-adjusted-epa.ts.",
    dataPath: "PARTIAL",
  },
];

export function signalGapSummary(map: readonly SignalGapEntry[] = SIGNAL_GAP_MAP): {
  readonly wiredLive: number;
  readonly wiredFlagged: number;
  readonly implementedNotWired: number;
  readonly catalogOnly: number;
  readonly clearDataPath: number;
} {
  return {
    wiredLive: map.filter((e) => e.status === "WIRED_LIVE").length,
    wiredFlagged: map.filter((e) => e.status === "WIRED_FLAGGED").length,
    implementedNotWired: map.filter((e) => e.status === "IMPLEMENTED_NOT_WIRED").length,
    catalogOnly: map.filter((e) => e.status === "CATALOG_ONLY").length,
    clearDataPath: map.filter((e) => e.dataPath === "CLEAR").length,
  };
}
