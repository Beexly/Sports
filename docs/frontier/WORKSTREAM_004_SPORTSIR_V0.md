# W004 — SportsIR v0 (contract frozen 2026-07-17)

**Objective.** `FRONTIER_KERNEL.md` names twelve canonical SportsIR primitives
(`Entity · Observation · Event · Claim · Measurement · State · Relation ·
Interaction · Intervention · Branch · Outcome · Proof`) as the shared minimal
intermediate representation the rest of the frontier program (W005-W010)
builds on, carrying the four SportsIR clocks (`occurredAt`, `publishedAt`,
`observedAt`, `effectiveAt`) where meaningful. Unlike every prior workstream
this session, SportsIR has NO existing-asset pointer in the kernel doc — it
is genuinely new. The risk of a fresh 12-primitive schema is fabricated
completeness: types that look precise but were never checked against a real
object. This slice avoids that by defining all twelve as pure contracts, but
only claiming a primitive "works" once a REAL, already-shipped object from
W001/W002/W003 has been mechanically projected into it and tested.

**Invariant.** Every SportsIR type is dependency-free (pure data shape, zero
imports beyond the package itself) so any package in the monorepo can adopt
it without a new dependency edge. Adapters are pure functions
(`concrete object → primitive`), never the reverse — SportsIR is a shared
VOCABULARY for describing what already exists, not a new source of truth or
a store. No primitive is claimed "adapted" unless a test proves it against a
real fixture already used elsewhere in this repo (not an invented one).

**Scope (thin vertical slice).**
1. `packages/types/src/sports-ir.ts` — all 12 primitive interfaces + the
   `SportsIrEntityKind`/`SportsIrValue` supporting types. `SportsIrValue` is
   structurally identical to Worldline's `WorldValue`
   (`apps/web/lib/worldline/types.ts`) — same recursive JSON-safe shape, one
   vocabulary — so an `Observation.value` type-checks directly against a
   ported `WorldObservation.value` with no cast.
2. `apps/web/lib/sports-ir/adapters.ts` — pure adapter functions for SIX of
   the twelve primitives, each backed by a REAL existing object:
   - `Entity` (constructor — Worldline's `entityId` is an opaque string with
     no inherent kind/label, so the caller supplies them explicitly; no
     kind is ever inferred/guessed from the id string)
   - `Observation` ← W002 `WorldObservation` (near-identity map)
   - `State` ← W002 `WorldSnapshot` (near-identity map, digest carried through)
   - `Claim` ← W001 `PickEvidenceEnvelope.decision` + `.model` (the
     publish/pass assertion; `confidence` is honestly `null` — the envelope
     layer carries no numeric confidence, it is audience-gated deeper in the
     stack, so this primitive states what is true at THIS layer, not what a
     downstream UI shows)
   - `Outcome` ← W001 `PickEvidenceEnvelope.settlement` Capture (returns
     `null`, not a fabricated outcome, when settlement is NOT_CAPTURED)
   - `Proof` ← W003 `RealityReceipt` (digest + verified verdict + a
     4-state anchor summary; NOT_MIGRATED/NO_PROOF/UNAVAILABLE all honestly
     collapse to `"UNKNOWN"` — never asserted as anchored or not-anchored
     when the underlying state doesn't say so)
3. The remaining six primitives (`Event`, `Measurement`, `Relation`,
   `Interaction`, `Intervention`, `Branch`) get precise type contracts ONLY
   in this slice — documented in-file with the concrete source each is
   expected to adapt from next (e.g. `Event` ← `packages/types/heartbeat.ts`'s
   existing `GameSettledEvent` shape; `Intervention` ← `GateDecision`;
   `Measurement` ← odds/stat rows; `Relation` ← game↔team edges;
   `Interaction` ← W005 Intelligence Contracts; `Branch` ← W007 Branching
   Reality) — never silently presented as adapted when they are not.
4. Tests: `packages/types/src/__tests__/sports-ir.test.ts` (structural sanity
   — the schema-version constant, `SportsIrValue`/`WorldValue` compatibility)
   and `apps/web/lib/sports-ir/__tests__/adapters.test.ts` (the real
   substance — each of the six adapters run against a real fixture reused
   from this session's own prior test suites: `publishedRecord()`-style
   `RoomEvidenceRecord` → envelope → Claim/Outcome, a real `WorldObservation`
   → Observation/State, a real `RealityReceipt` → Proof).

**Explicitly out of scope for v0.** A DB/storage layer for SportsIR objects
(this is a projection vocabulary, not a new store); adapting the remaining
six primitives (documented as future work per-primitive above); a
consumer that reads FROM SportsIR (W005+ builds those).

**Base.** `3cd62f7d`. **Forbidden.** `apps/web/lib/worldline/**`,
`apps/web/lib/intelligence-playback/**`, `apps/web/lib/reality-receipt/**`
(read-only reuse of their exported types/objects — zero edits, this
workstream only adapts outward from them), `packages/types/src/index.ts`
(additive export line only). Schema change: none (no DB migration this
slice). **Protected zones.** schema/contracts. **Rollback.** Remove
`packages/types/src/sports-ir.ts`, `apps/web/lib/sports-ir/`, and the one
additive export line in `packages/types/src/index.ts`.
