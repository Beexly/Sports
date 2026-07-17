# W007 — Branching Reality v0 (contract frozen 2026-07-17)

**Objective.** `WORKSTREAM_QUEUE.md`'s W007 row names the goal as "preserve
unresolved worlds instead of flattening uncertainty," depending on W002
(Worldline) and W004 (SportsIR) — both DONE. `packages/types/src/sports-ir.ts`
already anticipates this exact workstream: `SportsIrBranch`'s own header
comment reads "future adapter: W007 Branching Reality — an unresolved
alternate world, not flattened into a single consensus." This is the sixth
and final DECLARED-only SportsIR primitive from W004 to become ADAPTED.

**The gap this closes.** `WorldlineStore`'s resolution rule
(`apps/web/lib/worldline/store.ts`, `beats()`) is a total order: for any cell
(entity, attribute), it picks exactly ONE winning observation — latest
`occurredAt`, then latest `observedAt`, then `id` as a pure determinism
tiebreak. When two DIFFERENT sources report DIFFERENT values for the same
cell at the exact same `(occurredAt, observedAt)`, the `id` comparison is not
an epistemic judgment — it exists only so replay is deterministic — yet
`WorldSnapshot` silently reports one of them as *the* value, discarding the
other's information entirely. That is precisely "flattening uncertainty":
the single-snapshot view cannot express "we don't actually know which of
these is true," even though the underlying facts say exactly that.

**Scope (thin vertical slice).**
1. `apps/web/lib/worldline/types.ts` — new `WorldConflict` type: `{entityId,
   attribute, candidates: readonly WorldObservation[]}`. `candidates` always
   has length ≥ 2 and always carries ≥ 2 distinct canonical values —
   agreement between sources (same value, same instant) is corroboration,
   never reported as a conflict.
2. `apps/web/lib/worldline/store.ts` — ONE new, purely additive public
   method on `WorldlineStore`: `detectConflicts(at: WorldCoordinate):
   WorldConflict[]`. Reuses the exact same no-lookahead eligibility filter
   `winnersOver` already uses; for each cell, finds the subset of
   observations tied for the winning position once the `id` tiebreak is set
   aside (i.e., indistinguishable by `occurredAt`/`observedAt` alone), and
   reports it as a conflict only when those tied candidates carry genuinely
   different values (compared via `canonicalJson`, the same W001 serializer
   Worldline's own digest already uses — one canonical equality check, not a
   second one). **`resolveOver`/`snapshotAt`/`resolve` are NOT modified** —
   the single-winner snapshot behavior every existing W002 test locks in
   stays byte-identical; this is a new, separate read, not a behavior
   change to the existing one.
3. `apps/web/lib/sports-ir/adapters.ts` — the sixth ADAPTED primitive:
   `worldConflictToSportsIrBranches(conflict: WorldConflict):
   SportsIrBranch[]`. One `SportsIrBranch` per candidate: `id` derived from
   the observation's own id (`branch:<observationId>`, so every branch
   traces back to real evidence — never a synthetic id); `parentBranchId:
   null` (v0 is a flat set of sibling alternate worlds off the single trunk
   that non-conflicting cells still resolve to — no nested branch hierarchy
   yet, honestly not claimed); `label` states the diverging claim in plain
   language (`"<entityId>.<attribute> = <value> (per <source>)"`);
   `createdAt` is the tied observation's own `observedAt` (when this
   candidate became known — identical across all branches in one conflict,
   since by definition they are tied on `observedAt`).
4. `apps/web/lib/worldline/__tests__/conflicts.test.ts` — REAL
   `WorldlineStore`/`ingest()` fixtures reproducing a genuine simultaneous
   contradiction (two injury-report sources disagreeing about a player's
   status at the identical instant — a real, plausible domain scenario, not
   an invented shape), proving: a clean single-source cell reports ZERO
   conflicts; a true tie with differing values IS reported, with exactly the
   tied candidates (never every observation ever ingested for that cell);
   multiple sources agreeing at the same instant is NOT reported as a
   conflict (corroboration ≠ contradiction); a later, non-tied observation
   correctly supersedes an earlier tie (the earlier tie must not leak into
   the final conflict set once a genuine winner exists); the no-lookahead
   filter applies identically to conflict detection as it does to normal
   resolution (a conflict from an observation with `observedAt` after the
   query coordinate's knowledge time must never appear).
5. `apps/web/lib/sports-ir/__tests__/adapters.test.ts` — new test(s) proving
   `worldConflictToSportsIrBranches` against a REAL `WorldConflict` produced
   by `WorldlineStore.detectConflicts()` (not a hand-built conflict object),
   asserting the branch count matches candidate count, `parentBranchId` is
   always `null` in v0, and each branch's `id`/`label`/`createdAt` trace
   back to its source observation exactly.

**Explicitly out of scope for v0** (fast-follow candidates, not blockers):
nested branch hierarchies (`parentBranchId` populated) — would require a
policy for WHEN one branch is considered a refinement of another, not yet
designed; branch resolution/pruning (deciding a conflict is settled and
collapsing back to one world) — the mirror-image of this workstream's
detection half, a separate, later capability; persisting detected conflicts
— v0 is a pure, on-demand read over the existing in-memory store, exactly
like every other Worldline read; surfacing conflicts on any public page —
this is a backend/analysis capability only, no UI, no public claim.

**Protected zones.** model/public interpretation (per the workstream's own
queue row) — a conflict-detection read could, if wired to a public surface,
shape how uncertainty is communicated; this v0 has zero public wiring
(nothing calls `detectConflicts` outside its own tests), but a gse-red-team
pass is still run given the proximity to public-claims territory and this
session's own established discipline for near-adjacent protected zones.

**REQUIRED before any live/public wiring (not optional — self-flagged, same
pattern as DEC-021's W005 finding).** `worldConflictToSportsIrBranches`'s
`label` field embeds `obs.source` and `JSON.stringify(obs.value)` VERBATIM
into a human-readable string. Before any future caller surfaces a
`SportsIrBranch`'s `label` (or the underlying `WorldConflict`) on any
public or user-facing surface, it MUST first pass through this repo's
source-rights clearance pipeline (`apps/web/lib/scraping/clearance-engine.ts`)
exactly like every other extraction this repo ships — a raw source name or
value string could otherwise leak a data vendor's identity or licensed
content without attribution/rights review. This v0 has no such caller today
(confirmed: zero references to `detectConflicts`/
`worldConflictToSportsIrBranches` outside their own definitions/barrel
exports/tests), so nothing is exposed yet — but the clean function
signature offers no structural guard forcing a future caller to remember
this, exactly the "future misuse" pattern this session's W005 pass (DEC-021)
first named. Documented here so it cannot be silently dropped.

**Acceptance criteria.** All new tests green; `tsc --noEmit` clean;
`eslint --max-warnings=0` clean on touched files; `npm run guardrails`
green; the existing W002 Worldline test suite re-run green with zero
changes needed (proving `resolveOver`/`snapshotAt` truly untouched); zero
new API routes, zero new DB writes, zero UI changes.

**Verification commands.**
```
npx vitest run apps/web/lib/worldline apps/web/lib/sports-ir
npx tsc --noEmit -p apps/web/tsconfig.json
npx eslint --max-warnings=0 apps/web/lib/worldline/**/*.ts apps/web/lib/sports-ir/**/*.ts
npm run guardrails
```
