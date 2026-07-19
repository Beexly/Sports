/**
 * ~15-node example registry covering the live funnel per
 * docs/frontier/OPERATIONAL_EPISTEMIC_TWIN_CONTRACT.md §6:
 *   home route, picks route, checkout, db:primary, ingestion,
 *   settlement engine, source:nflverse, route:/nflverse, three nflverse
 *   reports, proof:slate-commitment, gate:PUBLISH_LEDGER,
 *   gate:SEALED_ENGINE_ENABLED, revenue:checkout.
 *
 * This is exported for the future consumer PR (health-route wiring) but is
 * NOT imported/wired anywhere in this PR — v0 core only.
 *
 * Edge choices (hard vs soft), honest reasoning about the real system:
 *   - route:/home     — hard dep db:primary (renders public Edge Index /
 *                        calibration off the DB); soft dep source:nflverse
 *                        (trend widgets enhance, don't gate, the page).
 *   - route:/picks     — hard dep db:primary + ingestion (the board IS the
 *                        picks data); soft dep source:nflverse (factor trail
 *                        enrichment, not required for a pick to render).
 *   - route:/checkout  — hard dep db:primary (needs plan/price + user state).
 *   - db:primary       — root evidence node (health-route DB probe).
 *   - ingestion        — hard dep db:primary (nowhere to persist without it);
 *                        soft dep source:nflverse (enrichment feed).
 *   - engine:settlement — hard dep db:primary + ingestion (needs game
 *                        results to grade); hard dep gate:SEALED_ENGINE_ENABLED
 *                        (the sealed/holdout engine feature gate controls it).
 *   - source:nflverse  — root evidence node (OP-002 cache counter).
 *   - route:/nflverse  — hard dep source:nflverse. This is the exact
 *                        production incident this contract exists to prevent:
 *                        source outage must make this route composed
 *                        unavailable, not silently green.
 *   - report:nflverse-pbp/ngs/ftn — soft dep source:nflverse only (a stale/
 *                        degraded source degrades these reports, it does not
 *                        take them down — they can render last-known-good).
 *   - proof:slate-commitment — hard dep engine:settlement (the ledger being
 *                        proven over) + hard dep gate:PUBLISH_LEDGER (proof
 *                        publication is explicitly gated).
 *   - gate:PUBLISH_LEDGER, gate:SEALED_ENGINE_ENABLED — root flag nodes, no
 *                        deps. Their own evidence encodes intent directly.
 *   - revenue:checkout — hard dep route:/checkout + db:primary. Deliberately
 *                        NOT dependent (hard or soft) on source:nflverse,
 *                        engine:settlement, or any nflverse report — revenue
 *                        must stay healthy when nflverse falls over
 *                        (blast-radius honesty, the point of this contract).
 */

import type { CapabilityNode, OwnEvidence } from "./axes.js";

const DEFAULT_FRESHNESS_MS = 5 * 60 * 1000; // 5 minutes

/** All-healthy, freshly-observed evidence at `now`. */
function healthyEvidence(now: Date, freshnessHorizonMs = DEFAULT_FRESHNESS_MS): OwnEvidence {
  return {
    observedAt: now,
    freshnessHorizonMs,
    intent: "open",
    severityTags: [],
    unavailable: false,
    reasons: [],
  };
}

export const SEED_CAPABILITY_IDS = [
  "route:/home",
  "route:/picks",
  "route:/checkout",
  "db:primary",
  "ingestion",
  "engine:settlement",
  "source:nflverse",
  "route:/nflverse",
  "report:nflverse-pbp",
  "report:nflverse-ngs",
  "report:nflverse-ftn",
  "proof:slate-commitment",
  "gate:PUBLISH_LEDGER",
  "gate:SEALED_ENGINE_ENABLED",
  "revenue:checkout",
] as const;

export type SeedCapabilityId = (typeof SEED_CAPABILITY_IDS)[number];

/**
 * Builds the seed registry with all-healthy, freshly-observed evidence at
 * `now`. Callers (tests, and the future consumer PR) can post-process the
 * returned array to flip individual nodes' evidence for scenario testing.
 */
export function buildSeedRegistry(now: Date): CapabilityNode[] {
  const evidence = healthyEvidence(now);

  return [
    {
      id: "db:primary",
      label: "Primary Postgres database",
      deps: [],
      evidence,
    },
    {
      id: "source:nflverse",
      label: "nflverse data source (OP-002 cache)",
      deps: [],
      evidence,
    },
    {
      id: "gate:PUBLISH_LEDGER",
      label: "PUBLISH_LEDGER feature gate",
      deps: [],
      evidence,
    },
    {
      id: "gate:SEALED_ENGINE_ENABLED",
      label: "SEALED_ENGINE_ENABLED feature gate",
      deps: [],
      evidence,
    },
    {
      id: "ingestion",
      label: "Data ingestion pipeline",
      deps: [
        { id: "db:primary", kind: "hard" },
        { id: "source:nflverse", kind: "soft" },
      ],
      evidence,
    },
    {
      id: "engine:settlement",
      label: "Settlement engine",
      deps: [
        { id: "db:primary", kind: "hard" },
        { id: "ingestion", kind: "hard" },
        { id: "gate:SEALED_ENGINE_ENABLED", kind: "hard" },
      ],
      evidence,
    },
    {
      id: "route:/nflverse",
      label: "/nflverse route",
      deps: [{ id: "source:nflverse", kind: "hard" }],
      evidence,
    },
    {
      id: "report:nflverse-pbp",
      label: "nflverse play-by-play report",
      deps: [{ id: "source:nflverse", kind: "soft" }],
      evidence,
    },
    {
      id: "report:nflverse-ngs",
      label: "nflverse Next Gen Stats report",
      deps: [{ id: "source:nflverse", kind: "soft" }],
      evidence,
    },
    {
      id: "report:nflverse-ftn",
      label: "nflverse FTN charting report",
      deps: [{ id: "source:nflverse", kind: "soft" }],
      evidence,
    },
    {
      id: "proof:slate-commitment",
      label: "Slate commitment proof surface",
      deps: [
        { id: "engine:settlement", kind: "hard" },
        { id: "gate:PUBLISH_LEDGER", kind: "hard" },
      ],
      evidence,
    },
    {
      id: "route:/home",
      label: "Home route",
      deps: [
        { id: "db:primary", kind: "hard" },
        { id: "source:nflverse", kind: "soft" },
      ],
      evidence,
    },
    {
      id: "route:/picks",
      label: "Picks board route",
      deps: [
        { id: "db:primary", kind: "hard" },
        { id: "ingestion", kind: "hard" },
        { id: "source:nflverse", kind: "soft" },
      ],
      evidence,
    },
    {
      id: "route:/checkout",
      label: "Checkout route",
      deps: [{ id: "db:primary", kind: "hard" }],
      evidence,
    },
    {
      id: "revenue:checkout",
      label: "Revenue: checkout capability",
      deps: [
        { id: "route:/checkout", kind: "hard" },
        { id: "db:primary", kind: "hard" },
      ],
      evidence,
    },
  ];
}
