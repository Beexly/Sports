# W005 — Intelligence Watch v0 (contract frozen 2026-07-17)

**Objective.** `WORKSTREAM_QUEUE.md`'s W005 row names the goal as "persistent
user-maintained intelligence" over watchlist entities, depending on W002
(Worldline) and "existing watchlist." The existing watchlist system
(`apps/web/lib/watchlist/**`) already ships a complete follow/alert loop, but
its alert doctrine is narrowly scoped: an alert may fire only when a PICK
tied to a followed entity settles (`alert-eligibility.ts`'s graded-only
rule). It has no concept of "what changed about this entity" beyond that one
pick lifecycle event, and a `WatchlistEntry` carries no preference about
which kinds of change matter to the follower.

W005's genuine addition: generalize "is this worth telling a user about" from
"their picked entity's pick graded" to "something they said they care about
changed" — compiled against the bitemporal fact substrate W002 already
built (`WorldSnapshot`/`WorldDelta`), not just pick settlement. This session's
scope is v0: a pure evaluator over an already-computed `WorldDelta`, gated by
the same Elite-exclusive entitlement the existing alert system already uses.
It adds NO new persistence, NO new send path, and does not touch the
existing watchlist alert loop.

**Naming note.** `packages/genesis-kernel` (draft PR #127, GX-000/GG-001,
unmerged) independently defines a type also named `IntelligenceContract` —
a Metacortex plan-compiler concept (`question`, `requiredOutputs`,
`evidencePolicy`, `proof`, `budget` — "compile this question into an
evaluated plan"). That is a different domain from what this workstream's
queue row describes (a user's standing preference about ONE watched
entity). To avoid a real name collision if genesis-kernel is later merged,
this workstream's type is named `IntelligenceWatchContract`, not
`IntelligenceContract`. Recorded as a decision (DEC-021), matching this
session's precedent for naming collisions between parallel control packages
(the GG-001≡GX-000 convergence ruling).

**Invariant.** Pure, no I/O: the evaluator takes an already-computed
`WorldDelta` (W002), an `IntelligenceWatchContract`, and a boolean
entitlement value, and returns a discriminated decision — never a `boolean`,
never a throw, mirroring `watchlist/alert-eligibility.ts`'s exact style.
Nothing here sends anything; there is no dispatch seam in this slice at all
(the existing `watchlist/alert-dispatch.ts` inert-by-default seam is the only
place a future integration would wire a real send, and this workstream does
not touch it). No new Prisma model, no migration, no new entitlement field —
the v0 contract is *computed*, not persisted, and reuses the watchlist
system's existing `Entitlements.canGetAlerts` (Elite-exclusive per CLAUDE.md's
tier table) rather than inventing a second alerting dimension.

**Scope (thin vertical slice).**
1. `apps/web/lib/intelligence-watch/types.ts` — `IntelligenceWatchContract`
   (`watchlistEntryId`, `entityId`, `entityType`, `watchedAttributes` —
   empty means "all attributes", `materialityThreshold`, `createdAt`) and
   the discriminated `IntelligenceWatchOutcome` result type.
2. `apps/web/lib/intelligence-watch/contract.ts` —
   `defaultIntelligenceWatchContract(entry: WatchlistEntry): IntelligenceWatchContract`.
   V0 has no UI for per-attribute customization, so the default watches all
   attributes with a materiality threshold of 1 (any change is worth
   surfacing) — honestly declared as the v0 default, never presented as
   personalization that does not exist yet.
3. `apps/web/lib/intelligence-watch/evaluate.ts` —
   `evaluateIntelligenceWatch(input): IntelligenceWatchOutcome`, pure. Filters
   `WorldDelta.entries` to the contract's `entityId` + `watchedAttributes`,
   compares the count against `materialityThreshold`, gated first by the
   entitlement flag (fail-closed: entitlement is checked before any delta
   work, matching `alert-eligibility.ts`'s ordering doctrine).
4. `apps/web/lib/intelligence-watch/index.ts` — barrel.
5. `apps/web/lib/intelligence-watch/__tests__/evaluate.test.ts` — REAL
   fixtures: a `WatchlistEntry` shaped exactly like `watchlist/types.ts`'s
   `WatchlistEntry`, and a `WorldDelta` built via the real W002
   `WorldlineStore`/`worldDelta()` (not an invented delta shape) proving:
   not-entitled short-circuits before any delta inspection; a delta with zero
   entries for the watched entity does not surface; a delta below the
   materiality threshold does not surface; a delta at/above threshold surfaces
   with exactly the matching entries (never the whole delta); a
   `watchedAttributes` filter excludes entries for attributes the user did
   not ask about.

**Explicitly out of scope for v0** (fast-follow candidates, not blockers):
persisting a customized contract (needs a new Prisma model + founder-applied
migration — OWNER_GATE); a dispatch/send integration wiring this evaluator's
`surface: true` output into `watchlist/alert-dispatch.ts` (draft-only
doctrine — this slice produces a decision only, never a side effect); a
dedicated `canUseIntelligenceWatch` entitlement field (v0 reuses
`canGetAlerts`; splitting them is a real product decision, not an
autonomous one); SportsIR `Interaction` primitive adaptation (SportsIR's own
doc, `packages/types/src/sports-ir.ts` lines 142-143, names W005 as its
future adapter source — this v0 does not consume `SportsIrInteraction`
because `WorldDelta` already carries everything the evaluator needs and
forcing an unnecessary adapter would be premature abstraction).

**REQUIRED before any live wiring (not optional — gse-red-team finding).**
`evaluateIntelligenceWatch` has no graded/settled-fact guard: `WorldDeltaEntry`
carries no such marker, so today nothing stops a future Worldline producer
from ingesting speculative/unsettled data (a pending pick's confidence, an
unsettled line move) that this evaluator would then happily mark
`surface: true`. `watchlist/alert-eligibility.ts`'s graded-only doctrine
exists precisely to prevent that "hot tip" pattern, and its own doc comment
warns every alert-adjacent consumer must route through the graded check "so
the doctrine can never drift between call sites." This module is exactly
that kind of second call site and currently does not route through it.
Zero live risk TODAY — `WorldlineStore.ingest()` has no production caller
anywhere in the repo, and `evaluateIntelligenceWatch` has no caller outside
its own test file (both confirmed by repo-wide grep as part of the
gse-red-team pass for this workstream) — but before this evaluator gets its
first live caller or is wired to any send path, EITHER (a) add a
graded/settled predicate to `WorldObservation`/`WorldDeltaEntry` and require
callers to filter on it before surfacing (mirroring `isGradedEvent()`), OR
(b) restrict whatever ingestion adapter feeds intelligence-watch to
already-settled facts only, and document that restriction as an explicit
invariant of the adapter, not left implicit.

**Protected zones.** entitlements (read-only: consumes `canGetAlerts`,
introduces no new field), notifications (draft-only: no dispatch, no send
path — `scripts/guardrails/draft-only.mjs` compliance verified as part of
gates).

**Acceptance criteria.** All new tests green; `tsc --noEmit` clean;
`eslint --max-warnings=0` clean on touched files; `npm run guardrails`
(including `draft-only`) green; zero Prisma/schema changes; zero new API
routes; zero send-path code.

**Verification commands.**
```
npx vitest run apps/web/lib/intelligence-watch/__tests__/evaluate.test.ts
npx tsc --noEmit -p apps/web/tsconfig.json
npx eslint --max-warnings=0 apps/web/lib/intelligence-watch/**/*.ts
npm run guardrails
```
