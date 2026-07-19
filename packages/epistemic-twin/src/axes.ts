/**
 * @sports/epistemic-twin — pure core.
 *
 * Implements the composition law from
 * docs/frontier/OPERATIONAL_EPISTEMIC_TWIN_CONTRACT.md (FV-003), §3.
 *
 * Three orthogonal axes:
 *   - Severity  (operational): healthy(0) < degraded(1) = stale(1) < unavailable(2)
 *   - Certainty (epistemic):   evidenced | unknown
 *   - Intent    (modal):       open | proof_gated | owner_gated
 *
 * Design note on "make invalid states unrepresentable": severity is only
 * meaningful when evidence is both present/fresh (certainty=evidenced) AND
 * not intentionally gated. Rather than carrying severity + certainty + intent
 * as three independently-settable fields (which lets you construct nonsense
 * like "unavailable" + "unknown" certainty), OwnState and ComposedState are
 * discriminated unions keyed on a single `kind` that can only ever be one of
 * the five mutually-exclusive composition outcomes:
 *   unavailable | gated | unknown | impaired (degraded/stale) | healthy
 * `severities`/`tags` (rank-1 detail) and `intent` (gated detail) only exist
 * on the branches where they are meaningful. This mirrors the composition
 * law's own priority order (§3 rules 1-5) directly in the type system.
 */

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/** Wire-form severity tag. degraded/stale share rank 1 but are distinct tags. */
export type SeverityTag = "degraded" | "stale";

/** Operational severity, rank order healthy(0) < degraded=stale(1) < unavailable(2). */
export type Severity = "healthy" | "degraded" | "stale" | "unavailable";

export const SEVERITY_RANK: Readonly<Record<Severity, 0 | 1 | 2>> = Object.freeze({
  healthy: 0,
  degraded: 1,
  stale: 1,
  unavailable: 2,
});

/** Epistemic certainty. Unknown is NOT a severity. */
export type Certainty = "evidenced" | "unknown";

/** Modal intent. Intentional darkness is not an outage. */
export type Intent = "open" | "proof_gated" | "owner_gated";
export type GatedIntent = Exclude<Intent, "open">;

export type DepKind = "hard" | "soft";

export interface CapabilityEdge {
  readonly id: string;
  readonly kind: DepKind;
}

// ---------------------------------------------------------------------------
// Evidence (input) — what a producer (health adapter, counter, flag, sentinel)
// asserts about a single node, before decay and before composition with deps.
// ---------------------------------------------------------------------------

export interface OwnEvidence {
  /** When this evidence was observed. null => never observed => unknown. */
  readonly observedAt: Date | null;
  /** Evidence older than this (relative to `now` at compose time) decays to unknown. */
  readonly freshnessHorizonMs: number;
  /**
   * Modal intent for this node. Gating is a structural/config fact (e.g. a
   * feature flag read), not decaying evidence — it does not expire the way
   * severity evidence does.
   */
  readonly intent: Intent;
  /**
   * Severity tags when intent === "open" and evidence is fresh.
   * [] => healthy. Non-empty subset of {"degraded","stale"} => rank 1.
   * Ignored (should be []) when `unavailable` is true.
   */
  readonly severityTags?: readonly SeverityTag[];
  /** True => this node itself is unavailable (rank 2). */
  readonly unavailable?: boolean;
  readonly reasons?: readonly string[];
}

export interface CapabilityNode {
  readonly id: string;
  readonly label?: string;
  readonly deps: readonly CapabilityEdge[];
  readonly evidence: OwnEvidence;
}

// ---------------------------------------------------------------------------
// OwnState — the decayed, per-node contribution fed into composition.
// Mutually exclusive branches: a node cannot simultaneously be "gated" and
// "unavailable" from its own evidence — the evidence producer picks one.
// ---------------------------------------------------------------------------

export type OwnState =
  | { readonly kind: "unavailable"; readonly reasons: readonly string[] }
  | { readonly kind: "gated"; readonly intent: GatedIntent; readonly reasons: readonly string[] }
  | { readonly kind: "unknown"; readonly reasons: readonly string[] }
  | { readonly kind: "impaired"; readonly tags: readonly SeverityTag[]; readonly reasons: readonly string[] }
  | { readonly kind: "healthy"; readonly reasons: readonly string[] };

// ---------------------------------------------------------------------------
// ComposedState — the output of composeGraph for one node: OwnState shape,
// plus the node id, after folding in all dependency states per the law.
// ---------------------------------------------------------------------------

export type ComposedState =
  | { readonly id: string; readonly kind: "unavailable"; readonly reasons: readonly string[] }
  | { readonly id: string; readonly kind: "gated"; readonly intent: GatedIntent; readonly reasons: readonly string[] }
  | { readonly id: string; readonly kind: "unknown"; readonly reasons: readonly string[] }
  | {
      readonly id: string;
      readonly kind: "impaired";
      readonly tags: readonly SeverityTag[];
      readonly reasons: readonly string[];
    }
  | { readonly id: string; readonly kind: "healthy"; readonly reasons: readonly string[] };

/** OP-003 wire enum — the single canonical projection of the three axes. */
export type CapabilityStatus =
  | "healthy"
  | "degraded"
  | "stale"
  | "unavailable"
  | "proof_gated"
  | "owner_gated"
  | "unknown";

// ---------------------------------------------------------------------------
// Cycle error
// ---------------------------------------------------------------------------

export class TwinCycleError extends Error {
  public readonly cycle: readonly string[];

  constructor(cycle: readonly string[]) {
    super(`epistemic-twin: dependency cycle detected: ${cycle.join(" -> ")}`);
    this.name = "TwinCycleError";
    this.cycle = cycle;
  }
}

// ---------------------------------------------------------------------------
// Decay — the epistemic heart. Pure function of (evidence, now).
// ---------------------------------------------------------------------------

export function decayEvidence(evidence: OwnEvidence, now: Date): OwnState {
  const baseReasons = evidence.reasons ? [...evidence.reasons] : [];

  // Fresh, evidenced unavailability is checked FIRST, ahead of gating —
  // matching composeOne's own rule order (rule 1: unavailable, rule 2:
  // gated). A real, currently-evidenced outage must never be masked by an
  // incidentally-set gate flag on the same evidence record: reporting an
  // actual outage as merely "intentionally gated" would hide the outage,
  // the mirror-image failure of the contract's stated worry about the
  // reverse case. This only fires when the unavailable evidence is itself
  // fresh (an expired/never-observed claim of unavailability carries no
  // more weight than any other stale severity evidence — see below).
  if (
    evidence.unavailable &&
    evidence.observedAt !== null &&
    now.getTime() - evidence.observedAt.getTime() <= evidence.freshnessHorizonMs
  ) {
    return { kind: "unavailable", reasons: baseReasons };
  }

  // Gating is a structural/config fact (e.g. a feature flag read), not
  // decaying evidence — per this module's own OwnEvidence.intent doc, "it
  // does not expire the way severity evidence does." Checked BEFORE the
  // observedAt/freshness gate below (not after) so a gate whose flag hasn't
  // been re-read in a while does not silently decay into "unknown" — the
  // config fact stays true until something actually changes it.
  if (evidence.intent !== "open") {
    return { kind: "gated", intent: evidence.intent, reasons: baseReasons };
  }

  if (evidence.observedAt === null) {
    return { kind: "unknown", reasons: [...baseReasons, "evidence_missing"] };
  }

  const age = now.getTime() - evidence.observedAt.getTime();
  if (age > evidence.freshnessHorizonMs) {
    return { kind: "unknown", reasons: [...baseReasons, "evidence_expired"] };
  }

  // Evidence is fresh (certainty=evidenced), intent is open, and the fresh-
  // unavailable check above already didn't fire (unavailable is either
  // false, or true-but-not-fresh — the latter decays to unknown just like
  // any other stale severity evidence, via the age check above).
  const tags = evidence.severityTags ?? [];
  if (tags.length > 0) {
    return { kind: "impaired", tags: [...tags], reasons: baseReasons };
  }

  return { kind: "healthy", reasons: baseReasons };
}

// ---------------------------------------------------------------------------
// composeOne — fold a node's own (decayed) state with its already-composed
// dependency states, per the §3 composition law, rules 1-5 in order.
// ---------------------------------------------------------------------------

interface ResolvedDep {
  readonly edge: CapabilityEdge;
  readonly composed: ComposedState;
}

export function composeOne(id: string, own: OwnState, deps: readonly ResolvedDep[]): ComposedState {
  const hardDeps = deps.filter((d) => d.edge.kind === "hard");
  const softDeps = deps.filter((d) => d.edge.kind === "soft");

  // Rule 1: unavailable — own OR any hard dep.
  if (own.kind === "unavailable") {
    return { id, kind: "unavailable", reasons: own.reasons };
  }
  const hardUnavailable = hardDeps.find((d) => d.composed.kind === "unavailable");
  if (hardUnavailable) {
    return {
      id,
      kind: "unavailable",
      reasons: [
        `hard_dep_unavailable:${hardUnavailable.edge.id}`,
        ...hardUnavailable.composed.reasons.map((r) => `${hardUnavailable.edge.id}:${r}`),
      ],
    };
  }

  // Rule 2: gated — own OR any hard dep. Provenance chain in reasons.
  if (own.kind === "gated") {
    return { id, kind: "gated", intent: own.intent, reasons: own.reasons };
  }
  const hardGated = hardDeps.find((d) => d.composed.kind === "gated");
  if (hardGated && hardGated.composed.kind === "gated") {
    return {
      id,
      kind: "gated",
      intent: hardGated.composed.intent,
      reasons: [
        `hard_dep_gated:${hardGated.edge.id}:${hardGated.composed.intent}`,
        ...hardGated.composed.reasons.map((r) => `${hardGated.edge.id}:${r}`),
      ],
    };
  }

  // Rule 3: unknown — own OR any hard dep. Ignorance is contagious.
  if (own.kind === "unknown") {
    return { id, kind: "unknown", reasons: own.reasons };
  }
  const hardUnknown = hardDeps.find((d) => d.composed.kind === "unknown");
  if (hardUnknown) {
    return {
      id,
      kind: "unknown",
      reasons: [
        `hard_dep_unknown:${hardUnknown.edge.id}`,
        ...hardUnknown.composed.reasons.map((r) => `${hardUnknown.edge.id}:${r}`),
      ],
    };
  }

  // Rule 4: degraded/stale — max rank, union of tags+reasons. Own/hard rank-1
  // contributes its real tags (own/hard deps are load-bearing — the actual
  // freshness/functional distinction matters). Soft deps contribute AT MOST
  // one notch, capped to a plain "degraded" tag REGARDLESS of the dep's own
  // tags or kind — an enhancing soft edge going stale, degraded, gated,
  // unknown, or unavailable never propagates its own kind OR its own tag
  // granularity (e.g. a soft dep that is impaired-with-only-"stale" still
  // contributes "degraded", not "stale" — "stale" is reserved for genuine
  // own/hard-sourced freshness impairment); soft deps never gate, never
  // unknown-ify, never disable.
  const tags = new Set<SeverityTag>();
  const reasons4: string[] = [];

  if (own.kind === "impaired") {
    own.tags.forEach((t) => tags.add(t));
    reasons4.push(...own.reasons);
  }
  for (const d of hardDeps) {
    if (d.composed.kind === "impaired") {
      d.composed.tags.forEach((t) => tags.add(t));
      reasons4.push(`hard_dep_impaired:${d.edge.id}`, ...d.composed.reasons.map((r) => `${d.edge.id}:${r}`));
    }
  }
  for (const d of softDeps) {
    if (d.composed.kind !== "healthy") {
      tags.add("degraded");
      reasons4.push(`soft_dep_${d.composed.kind}:${d.edge.id}`);
    }
  }

  if (tags.size > 0) {
    return { id, kind: "impaired", tags: [...tags], reasons: reasons4 };
  }

  // Rule 5: healthy.
  return { id, kind: "healthy", reasons: [] };
}

// ---------------------------------------------------------------------------
// composeGraph — topological evaluation over a full registry.
// Pure function of (nodes, now). No Date.now() calls; `now` is always
// injected. Detects cycles (typed error naming the cycle). Missing deps
// compose as unknown with a "missing_dependency:<id>" reason.
// ---------------------------------------------------------------------------

export function composeGraph(nodes: readonly CapabilityNode[], now: Date): Map<string, ComposedState> {
  const byId = new Map<string, CapabilityNode>();
  for (const node of nodes) {
    byId.set(node.id, node);
  }

  const composed = new Map<string, ComposedState>();
  const inProgress = new Set<string>();
  const path: string[] = [];

  function visit(id: string): ComposedState {
    const cached = composed.get(id);
    if (cached) {
      return cached;
    }
    if (inProgress.has(id)) {
      const cycleStart = path.indexOf(id);
      throw new TwinCycleError([...path.slice(cycleStart === -1 ? 0 : cycleStart), id]);
    }

    const node = byId.get(id);
    if (!node) {
      // Should only happen if visit() is called directly for a non-root
      // missing id — dependency resolution below handles the normal case
      // (missing dep of an existing node) without recursing into visit().
      const missing: ComposedState = { id, kind: "unknown", reasons: [`missing_dependency:${id}`] };
      composed.set(id, missing);
      return missing;
    }

    inProgress.add(id);
    path.push(id);

    const own = decayEvidence(node.evidence, now);
    const resolvedDeps: ResolvedDep[] = node.deps.map((edge) => {
      const depNode = byId.get(edge.id);
      if (!depNode) {
        const missing: ComposedState = { id: edge.id, kind: "unknown", reasons: [`missing_dependency:${edge.id}`] };
        return { edge, composed: missing };
      }
      return { edge, composed: visit(edge.id) };
    });

    const result = composeOne(id, own, resolvedDeps);

    inProgress.delete(id);
    path.pop();
    composed.set(id, result);
    return result;
  }

  for (const node of nodes) {
    visit(node.id);
  }

  return composed;
}

// ---------------------------------------------------------------------------
// Projection to the OP-003 wire form.
// ---------------------------------------------------------------------------

export function toCapabilityStatus(composed: ComposedState): CapabilityStatus {
  switch (composed.kind) {
    case "unavailable":
      return "unavailable";
    case "gated":
      // Gated intent wins over severity in the projection — this branch is
      // only reachable when severity was never evaluated (rule 2 fires
      // before rule 4), so there is nothing to lose here by construction.
      return composed.intent;
    case "unknown":
      // Unknown certainty projects to "unknown" unless severity is
      // unavailable — but unavailable+unknown-certainty is unrepresentable
      // by construction (the "unavailable" branch above never has
      // certainty=unknown; decayEvidence only emits kind:"unavailable" from
      // fresh, evidenced evidence). So this branch is always exactly the
      // wire value "unknown".
      return "unknown";
    case "impaired":
      // Both tags may be present (union). Deterministic tie-break:
      // "degraded" (functional impairment) is surfaced over bare
      // "stale" (freshness-only) when both apply.
      return composed.tags.includes("degraded") ? "degraded" : "stale";
    case "healthy":
      return "healthy";
  }
}

// ---------------------------------------------------------------------------
// canActAsIf — agent planning guard.
// ---------------------------------------------------------------------------

function composedRank(composed: ComposedState): 0 | 1 | 2 {
  switch (composed.kind) {
    case "healthy":
      return 0;
    case "impaired":
      return 1;
    case "unavailable":
      return 2;
    // unknown/gated are excluded before this is called; treat as worst-case
    // if ever reached defensively.
    default:
      return 2;
  }
}

/**
 * True iff the agent may act as though `capabilityId` is at least as healthy
 * as `atLeast`. False when the capability is missing from the composed map,
 * unknown (we don't know), or gated (intentional — acting through it would
 * violate the gate, not merely risk an outage). Otherwise a straight severity
 * rank comparison: composed rank must be <= atLeast's rank.
 */
export function canActAsIf(
  capabilityId: string,
  atLeast: Severity,
  composed: ReadonlyMap<string, ComposedState>,
): boolean {
  const state = composed.get(capabilityId);
  if (!state) {
    return false;
  }
  if (state.kind === "unknown" || state.kind === "gated") {
    return false;
  }
  return composedRank(state) <= SEVERITY_RANK[atLeast];
}
