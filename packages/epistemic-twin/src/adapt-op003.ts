/**
 * @sports/epistemic-twin — OP-003 adapter. Pure mapping only — no HTTP, no
 * Prisma.
 *
 * `toCapabilityStatus` (axes.ts) projects this package's internal
 * `ComposedState` outward onto the OP-003 wire enum. This module is the
 * inverse direction: it lifts an OP-003 wire atom inward into this package's
 * own `OwnEvidence` input shape, so a future consumer PR (the health route,
 * currently blocked on #135/#137 merging) can plug a wire-form health read
 * straight into a `CapabilityNode` and run it through the existing
 * `composeGraph`.
 *
 * The package owns both directions of its OP-003 boundary:
 * `toCapabilityStatus` (out) lives in axes.ts, `op003ToOwnEvidence` (in)
 * lives here. (The founder spec sketched this as `op003ToAxisState` against
 * a flat-axes model; #137's actual input shape is `OwnEvidence`, so the name
 * follows the real type — align with what the package exports, not the
 * sketch.)
 *
 * On the wire enum itself: `CapabilityStatusWire` below is an alias of
 * `CapabilityStatus` (axes.ts), which IS the 7-value OP-003 wire enum —
 * declared once, locally, inside this package (not imported from apps/web —
 * this package has no dependency on apps/web at all; do not invent a ninth
 * status vocabulary). It mirrors
 * `apps/web/lib/health/capability-state.ts`'s `CapabilityStatus` union by
 * documented convention, not by import: the two must be kept in sync by hand
 * whenever either changes, since nothing in the type system enforces it
 * across the package boundary.
 */

import type { CapabilityStatus, Intent, OwnEvidence, SeverityTag } from "./axes.js";

/** Mirror of the OP-003 CapabilityStatus wire enum (alias — not a ninth enum). */
export type CapabilityStatusWire = CapabilityStatus;

const DEFAULT_FRESHNESS_MS = 5 * 60 * 1000; // 5 minutes — matches seed-registry's default.

/**
 * An OP-003 wire atom for one capability. Field names deliberately mirror
 * OP-003's `CapabilityState` (apps/web/lib/health/capability-state.ts)
 * EXACTLY — `capabilityId`, `status`, `reason`, `observedAt`, `evidence` —
 * so a `CapabilityState` value passes straight in with zero silent field
 * loss (every field lines up by name; nothing is structurally dropped).
 *
 * - `capabilityId` — pass-through identification for callers mapping atom
 *   arrays onto graph nodes; not used by the mapping itself.
 * - `evidence` — what produced the reading (wire values today: "probe" |
 *   "derived" | "none"; typed as string so future kinds like "counter" or
 *   "sentinel" don't break the boundary). Provenance only, carried into
 *   `OwnEvidence.reasons` as `evidence_kind:<value>`.
 * - `observedAt` accepts `Date | string | null` (and may be omitted): wire
 *   payloads serialize timestamps as ISO strings. A missing/null/unparseable
 *   timestamp maps to `observedAt: null` — evidence-missing semantics (decays
 *   through `decayEvidence`'s existing null branch). A garbage string is
 *   treated as NO evidence, never coerced into a fabricated timestamp.
 */
export interface Op003CapabilityAtom {
  readonly capabilityId?: string;
  readonly status: CapabilityStatusWire;
  readonly reason?: string;
  readonly evidence?: string;
  readonly observedAt?: Date | string | null;
}

/**
 * Coerces the wire timestamp to `Date | null`. Invalid dates (unparseable
 * strings, or a supplied `Date` that is itself Invalid) collapse to null —
 * "no fake data": absence of a parseable timestamp is absence of evidence,
 * not a made-up time.
 */
function coerceObservedAt(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

function provenanceReasons(atom: Op003CapabilityAtom): string[] {
  const reasons: string[] = [];
  if (atom.evidence) {
    reasons.push(`evidence_kind:${atom.evidence}`);
  }
  if (atom.reason) {
    reasons.push(atom.reason);
  }
  return reasons;
}

function evidenceFor(
  atom: Op003CapabilityAtom,
  freshnessHorizonMs: number,
  overrides: {
    readonly observedAt?: Date | null;
    readonly intent?: Intent;
    readonly severityTags?: readonly SeverityTag[];
    readonly unavailable?: boolean;
  },
): OwnEvidence {
  return {
    observedAt:
      overrides.observedAt !== undefined ? overrides.observedAt : coerceObservedAt(atom.observedAt),
    freshnessHorizonMs,
    intent: overrides.intent ?? "open",
    severityTags: overrides.severityTags ?? [],
    unavailable: overrides.unavailable ?? false,
    reasons: provenanceReasons(atom),
  };
}

/**
 * Maps an OP-003 wire atom to this package's `OwnEvidence` input shape (the
 * same shape `decayEvidence`/`composeGraph` already consume — no parallel
 * evidence vocabulary). `freshnessHorizonMs` governs how long the resulting
 * evidence stays fresh once composed; it is not part of the wire form
 * itself, so callers pass their own policy (defaults to 5 minutes, matching
 * the seed registry).
 *
 * Frozen per-status mapping (each chosen so the round-trip law holds — see
 * `src/__tests__/adapt-op003.test.ts`):
 *   - "healthy"      -> open intent, no severity tags, not unavailable.
 *   - "degraded"     -> open intent, severityTags: ["degraded"].
 *   - "stale"        -> open intent, severityTags: ["stale"] (single tag —
 *                        the internal model's tag union is richer than the
 *                        wire form, but a wire "stale" reading always means
 *                        exactly the stale tag alone, never degraded+stale).
 *   - "unavailable"  -> open intent, unavailable: true.
 *   - "proof_gated"  -> intent: "proof_gated" (gate provenance: proof).
 *   - "owner_gated"  -> intent: "owner_gated" (gate provenance: owner).
 *   - "unknown"      -> observedAt forced to null regardless of
 *                        `atom.observedAt`, giving evidence-missing
 *                        semantics unconditionally: an "unknown" wire
 *                        reading asserts "no evidence", so it cannot also
 *                        carry a timestamp for evidence that doesn't exist.
 *   - anything else  -> (runtime guard; unreachable for statically-typed
 *                        callers) unknown-composing evidence with an
 *                        `unrecognized_status:<value>` reason. This is a
 *                        WIRE boundary whose enum is synced by hand with
 *                        apps/web — if the two vocabularies ever drift, an
 *                        out-of-vocabulary atom must compose honest unknown,
 *                        not crash downstream on undefined.
 *
 * Round-trip caveat (test-pinned): the round-trip law holds when the atom
 * carries a timestamp fresh relative to compose-time `now`. A NON-"unknown"
 * atom with a missing/null/unparseable timestamp composes "unknown", not its
 * wire status — the frozen core checks evidence-missing BEFORE intent, and
 * no timestamp means no evidence. Producers of gate/flag readings must stamp
 * the read time as `observedAt` (a flag read IS evidence observed at read
 * time); fabricating one here is forbidden.
 */
export function op003ToOwnEvidence(
  atom: Op003CapabilityAtom,
  freshnessHorizonMs: number = DEFAULT_FRESHNESS_MS,
): OwnEvidence {
  switch (atom.status) {
    case "unknown":
      return evidenceFor(atom, freshnessHorizonMs, { observedAt: null });
    case "proof_gated":
    case "owner_gated":
      return evidenceFor(atom, freshnessHorizonMs, {
        intent: atom.status,
      });
    case "unavailable":
      return evidenceFor(atom, freshnessHorizonMs, { unavailable: true });
    case "degraded":
      return evidenceFor(atom, freshnessHorizonMs, { severityTags: ["degraded"] });
    case "stale":
      return evidenceFor(atom, freshnessHorizonMs, { severityTags: ["stale"] });
    case "healthy":
      return evidenceFor(atom, freshnessHorizonMs, {});
    default: {
      // Statically `never` (the switch above is exhaustive over the union),
      // but runtime-reachable for wire payloads cast past the type system.
      const unrecognized: never = atom.status;
      return {
        observedAt: null,
        freshnessHorizonMs,
        intent: "open",
        severityTags: [],
        unavailable: false,
        reasons: [`unrecognized_status:${String(unrecognized)}`, ...provenanceReasons(atom)],
      };
    }
  }
}
