# Operational Epistemic Twin — Frozen Architecture Contract (Fable, FV-003)

**Status:** FROZEN — v0 implementable by Sonnet immediately after OP-003
(capability-state module) lands; consumes it as its atom.
**Origin:** `POST_LC_CRITICAL_REVIEW.md` frontier section + `gse-operate` §11.

## 0. What this is, and is deliberately not

The Twin answers: *which capabilities are trustworthy right now, which are
degraded, stale, gated, or simply unknown — and why, with what evidence, and what
observation would resolve it.* It is the substrate the production incident
exposed the need for: `/nflverse` OOM-500ing while `/api/health` said healthy.

It is **not** a new monitoring datastore, not a metrics pipeline, and not a
dashboard. v0 is a **pure composition law over evidence the system already
produces** — OP-003 CapabilityState atoms, nflverse cache counters, settlement
health bands, gate flags, sentinel results — assembled through a typed
dependency graph at read time. Persistence, revenue weighting, and journey
modeling are explicitly later phases (§6).

## 1. Canonical vocabulary (three axes, not one)

The repo grew 8+ incompatible status enums because "is X healthy" conflates
three orthogonal questions. The Twin separates them:

- **Severity** (operational): `healthy(0) · degraded(1) · stale(1) · unavailable(2)`
  — degraded and stale share rank; they are different *tags* on the same rank
  (impairment vs freshness), both retained in composed reasons.
- **Certainty** (epistemic): `evidenced · unknown`. Unknown is NOT a severity.
  A node's composed state can never be more certain than its least-certain
  required evidence.
- **Intent** (modal): `open · proof_gated · owner_gated`. Intentional darkness
  is not an outage; reporting a founder-gated capability as "unavailable" would
  be dishonest alarm. Modal provenance records WHICH gate.

OP-003's `CapabilityStatus` is the wire form; the Twin's composition operates on
the three axes and projects back down to it for compatibility.

## 2. The graph

Nodes are namespaced capability ids:
`route:/nflverse · engine:clv-decomposition · source:nflverse ·
revenue:checkout · proof:slate-commitment · gate:PUBLISH_LEDGER · db:primary`.

Edges are typed: **hard** (required — dependent cannot function without it) or
**soft** (enhancing — absence degrades, never disables). The registry is code
(reviewed, typed), never runtime-mutated.

## 3. Composition law (the load-bearing section)

Effective state of node X, given own state and dependency states:

1. **unavailable** if own is unavailable, or ANY hard dep composes unavailable.
2. else **gated** (with gate provenance chain) if own is gated or any hard dep
   composes gated — intentional darkness propagates as intent, never as outage.
3. else **unknown** if own is unknown or any hard dep composes unknown —
   ignorance is contagious through hard edges; a green light built on an
   unmeasured dependency is a lie.
4. else **degraded/stale** (max rank; union of tags and reasons) if own or any
   hard dep carries rank 1, or any SOFT dep composes to ANY non-healthy state
   — **not only severity-rank ≥ 1.** "Rank" is a Severity-axis concept (§1);
   Certainty (unknown) is a separate axis, so a soft dep that composes
   **unknown** (missing/expired evidence) is not literally "rank ≥ 1" under a
   narrow reading, but it MUST still cap the dependent at degraded — silently
   leaving the dependent healthy just because the axis label differs would
   contradict the rule's own point (an enhancing signal going dark still
   degrades). Precisely: impaired, unavailable, gated, AND unknown soft deps
   each contribute exactly one "degraded" tag; own/hard-dep-sourced tags
   (e.g. "stale") are real and propagate as-is, but a soft dep's specific
   tag granularity or composed kind is never propagated through the edge —
   only the capped "degraded" notch is. Soft deps never gate, never
   unknown-ify, never disable.
5. else **healthy**.

**Own-state derivation priority (evidence → OwnState, before composition):**
a single evidence record can, in principle, carry conflicting fields (e.g.
`unavailable: true` alongside a non-open `intent`). Resolve in this order:
(a) fresh, evidenced `unavailable` first — matching composition rule
1-before-2, a real currently-evidenced outage is never masked as merely
intentional darkness; (b) `intent` (gating) next, and unconditionally —
gating is a structural/config fact, not decaying evidence, so it must NOT be
short-circuited by a stale or missing `observedAt`; a gate stays honestly
gated even if it hasn't been re-read recently; (c) only then does the
observedAt/freshness-horizon check run, decaying stale or missing severity
evidence to unknown exactly as below.

**Evidence decay:** every evidence ref carries `observedAt` + a freshness
horizon. Evidence past horizon decays to **unknown** automatically — this
applies to SEVERITY evidence (unavailable/degraded/stale), not to gating
(see above). This is the epistemic heart: the Twin knows when it no longer
knows, without anyone turning anything red by hand. (Direct generalization
of OP-003's absence-of-coverage-is-not-green invariant, applied over time.)

**Determinism:** composition is a pure function of (registry, evidence set,
now). Same inputs ⇒ same graph. Property test: composition is monotone — worse
evidence in never yields a better composed state out.

## 4. Evidence sources (v0 — all already exist)

| Source | Feeds nodes | Kind |
|---|---|---|
| OP-003 health-route adapters | db:primary, ingestion, settlement | probe/derived |
| `nflverseTableCacheStats()` (OP-002) | source:nflverse → route:/nflverse | counter |
| SettlementHealthBand (LC-005) | engine:settlement | derived |
| Gate flags (LC-006 matrix) | gate:* nodes | flag |
| Sentinel result artifact (when present) | route:* nodes | sentinel |

## 5. v0 consumers

1. `/api/health` — capabilities array upgraded from flat list to composed graph
   output (same wire shape, richer truth). Never changes `ok`/503 semantics.
2. Cockpit capability map — internal page rendering the graph with reasons and
   next-resolving-observation per non-healthy node.
3. **Agent planning guard** — exported predicate
   `canActAsIf(capabilityId, atLeast: CapabilityStatus): boolean`. Agents and
   crons consult it before acting; acting as if an unknown/unavailable
   capability were healthy becomes a checkable violation rather than a habit.

## 6. Phasing

- **v0** (Sonnet, after OP-003 merges): `packages/epistemic-twin` — pure
  registry types + composition law + decay + ~15-node seed registry covering
  the live funnel (home → picks → checkout, nflverse reports, proof surfaces,
  health atoms) + the three consumers above. No persistence.
- **v1**: Sentinel enrichment (each check maps to a node; coverage gaps surface
  as unknown nodes automatically), deployment-SHA correlation, freshness-SLA
  integration (refresh-sla.ts becomes an evidence source).
- **v2**: revenue-impact weighting, user-journey nodes (journeys as derived
  nodes over capability paths — "signup works" as a composed capability),
  Genesis integration (agents negotiating actions against the Twin).

## 7. Non-goals, stated so they stay dead

No auto-remediation. No runtime registry mutation. No new alerting channel in
v0. No replacement of any existing enum — the 8 vocabularies stay; the Twin
*adapts* them (OP-003 adapters) rather than forcing a migration. No persistence
until v1 proves read-time composition insufficient.
