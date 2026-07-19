/**
 * Epistemic Twin consumer wiring — P2.
 *
 * WHY: OP-003 (`capability-state.ts`) reports 4 flat leaf capabilities
 * (database, ingestion, settlement, nflverse-reports), each evaluated in
 * isolation. It cannot answer the actual production incident the twin
 * contract exists to prevent: "`/nflverse` OOM-500s while `/api/health`
 * reported healthy" is a question about a ROUTE that nothing directly
 * probes. This module composes those 4 leaf observations, plus the two real
 * founder feature-gate reads, through `@sports/epistemic-twin`'s frozen
 * composition law over the full 15-node seed registry — so dependent
 * capabilities with no direct probe (routes, reports, the proof surface,
 * revenue) get honest, dependency-derived truth instead of no answer at all.
 *
 * Pure composition only: no Prisma `CapabilityObservation` table (Phase-1 is
 * founder-gated per CLAUDE.md), no new DB queries — this takes the health
 * route's already-computed OP-003 atoms as input. The two feature-gate nodes
 * read `process.env` directly (a structural fact, not a probe) exactly as
 * `lib/ledger/ledger-view.ts` and `lib/sealed/sealed-slate-view.ts` already
 * do — this module does not introduce a third reader of those flags, it
 * mirrors the existing one.
 */

import {
  buildSeedRegistry,
  composeGraph,
  toCapabilityStatus,
  canActAsIf,
  op003ToOwnEvidence,
  type CapabilityNode,
  type ComposedState,
  type Severity,
  type OwnEvidence,
  type CapabilityStatus,
} from "@sports/epistemic-twin";
import type { CapabilityState } from "./capability-state";
import { computeLiveCapabilityProbes } from "./live-capability-probes";

const GRAPH_FRESHNESS_MS = 5 * 60 * 1000; // matches the seed registry's own default

/**
 * Real evidence for a founder-controlled feature-gate node: intent reflects
 * the literal env var read. Gating is a structural/config fact, not decaying
 * evidence (per `OwnEvidence.intent`'s own contract) — `observedAt` is set to
 * `now` for provenance only; it is not load-bearing for the gated outcome.
 */
function gateEvidence(now: Date, envVarName: string): OwnEvidence {
  const open = process.env[envVarName] === "true";
  return {
    observedAt: now,
    freshnessHorizonMs: GRAPH_FRESHNESS_MS,
    intent: open ? "open" : "owner_gated",
    severityTags: [],
    unavailable: false,
    reasons: open ? [] : [`${envVarName} is not "true" — founder-gated closed`],
  };
}

/**
 * Honest "nothing probes this node directly" evidence. Composes to "unknown"
 * unless a hard dependency overrides it (e.g. `route:/nflverse` has no probe
 * of its own but correctly shows "unavailable" when `source:nflverse` does,
 * via the composition law's hard-dep-unavailable rule) — absence of coverage
 * is not green.
 */
function noDirectProbeEvidence(): OwnEvidence {
  return {
    observedAt: null,
    freshnessHorizonMs: GRAPH_FRESHNESS_MS,
    intent: "open",
    severityTags: [],
    unavailable: false,
    reasons: ["no_direct_probe"],
  };
}

/** Maps the health route's OP-003 leaf capability ids onto the shared seed-registry node ids. */
const ATOM_ID_TO_SEED_ID: Readonly<Record<string, string>> = {
  database: "db:primary",
  ingestion: "ingestion",
  settlement: "engine:settlement",
  "nflverse-reports": "source:nflverse",
};

export interface CapabilityGraph {
  readonly nodes: readonly CapabilityNode[];
  readonly composed: ReadonlyMap<string, ComposedState>;
}

/**
 * Composes the full epistemic-twin dependency graph from already-computed
 * OP-003 leaf atoms. Pure: no I/O beyond synchronous `process.env` reads for
 * the two feature gates.
 */
export function composeCapabilityGraph(
  atoms: readonly CapabilityState[],
  now: Date = new Date()
): CapabilityGraph {
  const seedIdToAtom = new Map(
    atoms
      .filter((atom) => ATOM_ID_TO_SEED_ID[atom.capabilityId] !== undefined)
      .map((atom) => [ATOM_ID_TO_SEED_ID[atom.capabilityId], atom])
  );

  const nodes: CapabilityNode[] = buildSeedRegistry(now).map((node) => {
    if (node.id === "gate:PUBLISH_LEDGER") {
      return { ...node, evidence: gateEvidence(now, "PUBLISH_LEDGER") };
    }
    if (node.id === "gate:SEALED_ENGINE_ENABLED") {
      return { ...node, evidence: gateEvidence(now, "SEALED_ENGINE_ENABLED") };
    }
    const atom = seedIdToAtom.get(node.id);
    if (atom) {
      return { ...node, evidence: op003ToOwnEvidence(atom, GRAPH_FRESHNESS_MS) };
    }
    return { ...node, evidence: noDirectProbeEvidence() };
  });

  return { nodes, composed: composeGraph(nodes, now) };
}

export interface CapabilityGraphEntry {
  readonly capabilityId: string;
  readonly label: string | undefined;
  readonly status: CapabilityStatus;
  readonly reasons: readonly string[];
}

/** Projects the composed graph to the OP-003 wire enum, for JSON responses. */
export function projectCapabilityGraph(graph: CapabilityGraph): CapabilityGraphEntry[] {
  const labelById = new Map(graph.nodes.map((n) => [n.id, n.label]));
  return graph.nodes.map((node) => {
    const composed = graph.composed.get(node.id);
    // Every seed node is visited by composeGraph, so this is always present;
    // the fallback keeps this function total rather than throwing on a
    // future registry edit that adds a node composeGraph didn't reach.
    const status = composed ? toCapabilityStatus(composed) : "unknown";
    const reasons = composed ? composed.reasons : ["not_composed"];
    return { capabilityId: node.id, label: labelById.get(node.id), status, reasons };
  });
}

/**
 * Agent/cron guard: may the caller act as though `capabilityId` is at least
 * as healthy as `atLeast`? False for unknown or gated capabilities — acting
 * through a gate would violate the gate, not merely risk an outage.
 */
export function graphCanActAsIf(
  capabilityId: string,
  atLeast: Severity,
  graph: CapabilityGraph
): boolean {
  return canActAsIf(capabilityId, atLeast, graph.composed);
}

/**
 * Live convenience for cron/agent call sites that have no already-computed
 * atoms of their own (unlike the health route, which builds `capabilities`
 * once per request and passes it to `composeCapabilityGraph` directly). Runs
 * the same probes /api/health uses via the shared `live-capability-probes.ts`
 * module, then composes them.
 *
 * Example — a cron deciding whether to run an nflverse-dependent job:
 *   const graph = await fetchLiveCapabilityGraph();
 *   if (!graphCanActAsIf("source:nflverse", "degraded", graph)) return skip();
 */
export async function fetchLiveCapabilityGraph(now: Date = new Date()): Promise<CapabilityGraph> {
  const { capabilities } = await computeLiveCapabilityProbes();
  return composeCapabilityGraph(capabilities, now);
}
