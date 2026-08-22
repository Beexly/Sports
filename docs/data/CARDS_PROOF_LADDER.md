# Proof Ladder Cards — pick lifecycle, grading correctness, PROVEN gate (Wave PL)

**Deck data class: mixed — see Routing summary.** No card in this deck is CROWN (nothing
here is proprietary edge methodology; it is the settlement/grading/proof-surface plumbing
behind the FOUNDING→PROVEN step in `apps/web/lib/pricing/pricing-phases.ts` and
`apps/web/lib/autonomy/revenue-ladder.ts`). Individual cards below carry their own class;
route each to its lane per the table, never by assumption.

---

## Recon summary (pick → publish → settle → grade → calibrate → PROVEN)

```
workers/data-refresh (odds ingest, getInSeasonSports()) ──► scoreGames() writes Pick(PENDING)
        │  in-season TODAY (2026-08-22, month=8): NFL(preseason)+NCAAF+MLB+MLS only
        │  (packages/data-ingestion/src/config.ts SEASON_WINDOWS — NBA/NCAAB/NHL dark)
        ▼
apps/web/app/api/cron/settle-picks/route.ts (hourly, vercel.json "20 * * * *")
        │
        ├─ paid path: hasOddsApiKey(key) ─► settleSport() [packages/ingestion-pipeline/
        │     src/settle-sport.ts] ─► calculatePickResult() [packages/prediction-engine/
        │     src/settlement.ts] ─► Pick.result WIN|LOSS|PUSH (updateMany WHERE PENDING,
        │     idempotent) ─► PickSettlementEvent outbox ─► gradePickClv() ─► CLV fields
        │
        └─ free path: !hasOddsApiKey(key) OR ?path=free (PR #550, forceFree) ─►
              persistFreeScores() + runFreePathSettlement() [apps/web/lib/data-sources/
              free-settlement-runner.ts] ─► buildTrustedFinals()/settlePendingPicks()
              [free-settlement.ts] ─► same calculatePickResult() ─► same idempotent write
              ─► gradeFreePathClv() ─► same CLV fields. Stale (>3d) backlog additionally
              drained by backfillStaleSettlement() [settle-backfill.ts], same grader.
        ▼
Settled-count sources of truth (THREE, and they now materially disagree — see PL3):
  - apps/web/lib/performance/public-performance-policy.ts loadPublicPerformancePolicy()
    → canonicalSettledCount = COUNT(result IN [WIN,LOSS,PUSH], isPublished, !isBootstrap,
      modelVersion≠"v5.0.0-seed"). Cumulative, DB-truth. Feeds /dashboard, /performance, Jarvis.
  - apps/web/lib/ops/canonical-sample-posture.ts loadCanonicalSamplePosture() — same
    query, ops-framed (operatorHint). Feeds /api/ops/daily-truth, /api/ops/public-surface-truth.
  - apps/web/lib/autonomy/settlement-learning.ts summarizeLearningBatch().nEligible —
    THIS CYCLE's freshly-graded batch only (PUSH/VOID/DISPUTED/bootstrap excluded from y).
    Wired into planAutonomyCycle({canonicalSettled: learning?.nEligible}) inside
    free-settlement-runner.ts L576 — the ONLY call site that feeds this slot a non-null
    value (autonomy-cycle/route.ts:120 and health-alert/route.ts:167 both pass `null`).
        ▼
scripts/export-settled-picks-for-calibration.mjs (result≠PENDING, isBootstrap:false)
→ scripts/calibration-offline/run.mjs (CIR/PAVA/Shin dry-run harness, synthetic fixture
  by default — no live DB read unless pointed at a real export)
        ▼
apps/web/lib/calibration/report.ts loadPublicCalibrationReport() [gates on
  resolveEffectivePerformanceGate()] → computeCalibration() → apps/web/app/performance/page.tsx
  (CalibrationPanel) — the actual public calibration/track-record surface (NOT /edge-index,
  which is the free embeddable Edge Index badge with no confidence/calibration content).
  /app/calibration/page.tsx is the branded "Proof Room" hub that LINKS to /performance,
  /clv, /ledger, /proof, /track, /accountability. All of it already exists; no card in
  §4 creates a page from nothing — the gaps found are narrower (PL6, PL7).
        ▼
apps/web/lib/autonomy/revenue-ladder.ts evaluateRevenueLadder() — PROVEN requires
  canonicalSettled ≥ 100 AND calibrationPublished AND settlementHealthy. Advances on
  founder YES only (operatorMessage says so explicitly); never auto-flips a pricing env var.
```

**Settled-picks count today: UNKNOWN.** No fixture/seed in this branch materializes a
canonical (non-bootstrap, non-seed) settled sample; `loadPublicPerformancePolicy`'s counts
are live DB queries with no static answer available from source alone. Do not invent a
number — PL4/PL5 below build the per-sport visibility to make this answerable without
guessing.

**CLV ledger (Elite) recon:** `packages/prediction-engine/src/edge-lab/kernel` and
`edge-lab/kelly.ts` (`clvDeflator`, `portfolioKellyStakes`) have **zero importers under
`apps/web`** (grepped repo-wide) — pure research/staking math, not wired to any surface.
The one CLV-branded user page, `apps/web/app/track/page.tsx` (`BetTracker` component,
ELITE-gated via `viewer.canUseClvLedger` / `packages/types/src/index.ts:151,197`), is a
100%-client-side, `localStorage`-only manual bet log (`components/tracker/bet-tracker.tsx`
L49-52) — it has no code path to the platform's own graded picks or their already-computed
`Pick.clvValue`/`clvVerdict`/`clvCloseLine`/`clvLockLine` fields (populated at settlement by
`gradePickClv`/`gradeFreePathClv`). Elite is priced (root CLAUDE.md) as including "CLV/line-
value ledger"; today that means a personal tracker, not a view of the platform's own CLV
track record. PL8 closes part of this gap.

---

## Routing summary (which lanes)

| Class | Cards | Lane |
|---|---|---|
| INTERNAL | PL1, PL2, PL3 | Grok / Hermes only, no-training endpoints, never stealth. Money-adjacent correctness logic — a wrong published grade is a customer-facing trust failure, not a research artifact. |
| INTERNAL | PL4, PL5 | Grok / Hermes, no-training endpoints. Settlement-throughput/observability — reads real settled Picks only, writes no new pipeline. |
| PUBLIC | PL6, PL7 | Any free model, stealth included, per `docs/ops/FREE_WINDOW_BLITZ.md` §3b — rendering/guarding already-graded data, no proprietary logic, no edge methodology. |
| INTERNAL | PL8 | Grok / Hermes, no-training endpoints. Touches entitlements + CLV fields — money-adjacent. |

**Cross-family verification rule (same as Waves K/SC):** the verifier is a different model
family than the author; run the card's Verify command, check the diff against the card's
exact Fix spec, then work the ATTACK list — each attack decided by a computation or a
concrete repro, never by reading. A test that only re-exercises the happy path already
covered by existing tests is vacuous — reject it.

## Dependency order within the deck

```
PL1 (critical) ──┐
PL2 (high)       ├─► run before PL4/PL5/PL6/PL7/PL8 — see "Grading fixes run first" below
PL3 (medium)  ───┘
PL3 ──► PL4 (PL4 reuses the loader PL3 wires in) ──► PL5 (script consumes PL4's export)
PL6 — independent (leak-guard test; touches ops import graph only)
PL7 — independent (calibration-panel.tsx render addition only)
PL8 — independent of PL1-PL7; depends only on existing Pick.clv* fields (already populated)
```

**Grading fixes run first — non-negotiable for this deck.** PL1/PL2/PL3 land, pass their
Verify commands, and are committed BEFORE any PL4-PL8 work starts, even though nothing in
PL4-PL8 technically imports PL1/PL2/PL3's files. Reason: PL4/PL5 exist to accumulate and
count settled picks toward the ≥100 PROVEN floor, and PL1 is a live mis-grading path — every
cycle that runs before PL1 lands risks silently mis-settling an MLB doubleheader pick into
the very sample PL4/PL5 are trying to grow honestly. Settling more before fixing correctness
is the failure mode this whole deck exists to prevent.

## Common contract — applies to every card in this deck

- **priced:false — N/A for this deck.** Nothing here sets or reads `rank.priced`
  (`packages/prediction-engine/src/scoring.ts`); these cards are settlement/grading/ops
  plumbing, not pricing. Stated explicitly per card below so "N/A" is a decision, not an
  omission.
- **Fail-closed on missing/ambiguous data.** No card may turn an unresolvable case into a
  guessed result. PL1 explicitly converts a silent guess into an explicit HELD state — the
  established pattern DISPUTED already uses in this codebase, not a new invention.
  Missing DB rows, a null score, or a network failure fail LOUD (existing `console.warn` +
  non-fatal-continue pattern already used throughout `free-settlement-runner.ts` /
  `settle-sport.ts`) — never silently fabricated.
- **No fake data / no fabricated stats (root CLAUDE.md non-negotiables 1-2).** Nothing in
  PL4/PL5/PL6/PL7 invents a settled pick, a score, or a percentage. PL4/PL5 only ever COUNT
  or SUMMARIZE picks that a real settlement path already graded through real game data.
- **Server-side enforcement only (non-negotiable 3).** PL8's ledger view must go through
  `getViewerEntitlements()` (`apps/web/lib/pricing/tier-access.ts`) server-side, fail-closed
  to FREE on any auth error — identical to `/track`'s existing gate. No client-only check.
- **Nothing enters live production grading without passing tests (root CLAUDE.md
  "Autonomous Loop Protocol").** Every PL1/PL2/PL3 fix ships with its Verify command green
  before merge; there is no "ship now, test later" path for settlement code in this deck.
- **Forbidden zones (every card in this deck):** `packages/db/prisma/schema.prisma`
  (no new columns/enums/migrations — PL1's new HELD reason and PL8's ledger view are both
  designed below to need ZERO schema change; where a card's ideal fix WOULD need a schema
  change, it says so and stops, filed under Open Questions instead), any
  `packages/ingestion-pipeline/src/event-odds-ingest.ts` write path, secrets/`.env`,
  `vercel.json` (cron cadence is already hourly for settle-picks — see PL5 — and edits there
  are an operator/owner action, never a card in this deck).
- **Strict TS**, no `any`. Every new test file follows this repo's existing
  grep-on-source-text contract-test pattern where a card says "contract test" (precedent:
  `apps/web/__tests__/free-settle-response-contract.test.ts`).
- **One artifact per card** = the named module/route/component + its test file. A card
  needing a third file is two cards.
- **Idempotent/restartable:** every card only edits/creates the files it names; re-running
  from a dead session is safe.
- **Commit-on-pass:** one commit per card, only after its Verify command is green.

---

# Section 1 — Grading-correctness fixes (run first)

## PL1 · CRITICAL — same-day/doubleheader rematch grades against an arbitrary final

**DATA CLASS: INTERNAL.**

**Files to fix:**
- `apps/web/lib/data-sources/free-settlement.ts` — `TrustedFinal`, `buildTrustedFinals()`,
  `PendingPick`, `settlePendingPicks()`, `SettlementOutcome` (all in this file)
- `apps/web/lib/settlement/root-cause-analysis.ts` — `SettlementRootCauseCode`,
  `SettlementRcaInput.holdReason`, `classifySettlementRootCause()`

**The bug.** Free-path matching is team-pair + calendar-day only — no game/event ID ever
enters the comparison:
- `ncaa-consensus.ts` `ComparableGame`/`matchupKey()` carries no `gameId`; `toComparableFromEspn`
  drops ESPN's own `event.id` on the floor.
- `free-settlement.ts` `settlePendingPicks()` (L281-334):
  `const candidates = finals.filter(f => daysApart(f.date, pick.gameDateIso.slice(0,10)) <= 2
  && finalMatchesPick(pick, f)); const final = candidates[0];` — when two DIFFERENT real games
  between the same two teams both fall inside the 2-day tolerance (the canonical case: an MLB
  straight doubleheader, Game 1 and Game 2 on the identical calendar date — common in August/
  September pennant-race scheduling, i.e. right now), `candidates` holds both finals and
  `[0]` picks whichever happened to sort first in ESPN's/henrygd's response — not the game the
  pick was actually written against.
- This is NOT caught by the existing DISPUTED path: DISPUTED fires when two sources disagree
  about the SAME game; here there is no disagreement — there are two genuinely different
  completed games that alias to one `matchupKey`. No anomaly, no hold, no log line.
- Same root function is reused by THREE settlement lanes, so the exposure is not
  hypothetical-in-one-place: `runFreePathSettlement()` (free-settlement-runner.ts L291-293),
  `backfillStaleSettlement()` (settle-backfill.ts L219-221), and (per that file's own header)
  `scripts/backfill/historical-settlement-backfill.ts`.
- **No test exists.** Grepped every `free-settlement*.test.ts` file in the repo — zero
  mentions of "doubleheader," zero fixtures with two finals sharing a `matchupKey`.

**Concrete scenario.** Rangers @ Astros doubleheader, both games same date. Game 1 final
4-2 Astros, Game 2 final 1-6 Rangers. A published SPREAD pick on Astros -1.5 for Game 2 is
in `pendingRows`. ESPN's scoreboard JSON happens to list Game 1's event before Game 2's.
`buildTrustedFinals` emits two `TrustedFinal` entries with the identical `matchupKey`;
`settlePendingPicks` matches both, takes index 0 (Game 1's 4-2), and grades the Game-2 pick
as if Astros won by 2 and covered -1.5 — WIN — when the real Game 2 result (Rangers won by
5) means the pick actually LOSES. Published, real-money-adjacent, silently wrong.

**Fix spec.**
1. Extend `TrustedFinal` with `readonly sourceGameIds: readonly string[]` — the ESPN
   `event.id` / henrygd equivalent(s) that produced this final (plumb through
   `toTrusted()`; `ComparableGame` needs a matching optional `gameId?: string` field added
   in `ncaa-consensus.ts`, sourced from `NormalizedGame.gameId` / `NcaaGame`'s id field).
2. In `settlePendingPicks()`, after filtering `candidates`, if `candidates.length > 1`:
   - If every candidate's oriented `(homeScore, awayScore)` is identical, treat as one game
     seen via redundant records — settle normally (no behavior change for the common case).
   - Otherwise (candidates disagree — the doubleheader case), return a new outcome:
     `{ pickId, status: "HELD", reason: "AMBIGUOUS_MATCH", sources: candidates.flatMap(c =>
     c.sources) }` — never grade. Extend the `SettlementOutcome` HELD arm's `reason` union
     from `"DISPUTED"` to `"DISPUTED" | "AMBIGUOUS_MATCH"`.
3. `root-cause-analysis.ts`: widen `SettlementRcaInput.holdReason` to
   `"DISPUTED" | "AMBIGUOUS_MATCH"`; add `"AMBIGUOUS_MATCHUP"` to
   `SettlementRootCauseCode`, category `MATCHING`, clearance wave `"C"` (expert/audit,
   same wave as DISPUTED — never STP-auto-settled). Give it its own 5-Whys/remediation
   text (`fiveWhysFor`/`remediationFor`/`summaryFor`) pointing at "resolve by game-id, not
   team+date" as the underlying fix.
4. Do not change the single-candidate path at all — this is additive-only for the
   multi-candidate branch, so every existing passing test keeps passing unchanged.

**Test to add:** new file `apps/web/__tests__/free-settlement-doubleheader.test.ts`:
- Two ESPN `NormalizedGame` finals, same two teams, same calendar date, different scores
  (Game 1 4-2, Game 2 1-6) → `settlePendingPicks` for a pick dated that day returns
  `{status:"HELD", reason:"AMBIGUOUS_MATCH"}`, never a WIN/LOSS.
- Same two-final setup but both finals carry IDENTICAL oriented scores (a genuine duplicate
  record, e.g. ESPN + a second undated fetch of the same game) → still settles normally
  (regression guard — the fix must not turn every double-match into a false HELD).
  Legitimate single-final case (the existing corpus) is unchanged — run the full existing
  `free-settlement*.test.ts` suite alongside as a non-regression gate.
- `root-cause-analysis.test.ts` (existing file, if present — else inline in the new test):
  `classifySettlementRootCause({..., outcomeStatus:"HELD", holdReason:"AMBIGUOUS_MATCH"})`
  resolves to `code:"AMBIGUOUS_MATCHUP"`, `clearanceWave:"C"`.

**Verify (deterministic):**
```
cd apps/web && npx vitest run __tests__/free-settlement.test.ts __tests__/free-settlement-orientation.test.ts __tests__/free-settlement-abbr-match.test.ts __tests__/free-settlement-doubleheader.test.ts && npx tsc --noEmit
```

**Idempotent:** additive types + one new branch + one new test file; safe to redo from a
dead session.

**Commit on pass:** `fix(settle): hold ambiguous same-day rematch instead of grading candidates[0]`

**ATTACK LIST (verifier):**
- Confirm the fix actually changes behavior on the doubleheader fixture (revert the fix
  locally, show the same test fails before it — a test that passes with or without the fix
  is vacuous).
- Confirm `candidates.length > 1` really can occur end-to-end: trace an MLB `sport.key` from
  `runFreePathSettlement` through `fetchScoresMultiSource` into `buildTrustedFinals` and show
  a same-day doubleheader slate produces two entries with one `matchupKey` — not merely
  claimed in this card.
- Confirm `AMBIGUOUS_MATCH` never reaches Wave A/B (STP auto-settle) in `stp-clearance.ts` —
  read `planClearanceWaves` and verify the new code is excluded from `AUTO_SETTLE`/
  `AUTO_SETTLE_AUDIT` the same way `DISPUTED_SCORES` already is.
- Confirm no existing passing test's fixture accidentally now trips the new HELD branch
  (full existing suite green, not just the new file).
- Confirm `settle-backfill.ts` and `historical-settlement-backfill.ts` inherit the fix for
  free (they call the same `settlePendingPicks` — no separate patch needed) rather than
  silently keeping a forked, unfixed copy.

---

## PL2 · HIGH — forced-free drain (PR #550) vs. paid path: no reconciliation of divergent game scores

**DATA CLASS: INTERNAL.**

**Files to fix:**
- `apps/web/lib/data-sources/free-settlement-runner.ts` (the `db.$transaction` block,
  currently L335-369, that writes `tx.game.update({ homeScore, awayScore, status:"FINAL" })`
  unconditionally whenever `o.homeScore != null`)
- `packages/ingestion-pipeline/src/settle-sport.ts` (the equivalent paid-path `game.update`,
  L259-268 — already guards against overwriting a FINAL score with null, but not against
  overwriting it with a DIFFERENT non-null score from the other path)

**The bug.** PR #550 (`fix(settle): path=free drains overdue picks without Odds scores`,
commit `9ec15b0`) added `?path=free` (`forceFree`) so the FREE path can run even when
`THE_ODDS_API_KEY` is present (`apps/web/app/api/cron/settle-picks/route.ts` L48-56):
> "Owner drain: `?path=free` uses ESPN/henrygd even when THE_ODDS_API_KEY is set."

This is a genuinely new operating mode: free-path and paid-path settlement can now run
against the SAME game in the SAME rough window (scheduled hourly paid cron + an
owner/agent-triggered `?path=free` drain). Each path fetches its OWN score for that game
from its OWN source (Odds API vs. ESPN) and grades whatever picks it sees as PENDING
against ITS OWN fetched score — there is no read-then-compare against
`game.homeScore`/`game.awayScore` already recorded by the OTHER path before either side
writes. The `Pick.result` write is race-safe (`updateMany WHERE result:"PENDING"`,
already correct), but the `Game.homeScore`/`awayScore` write is not: whichever path runs
second overwrites the row with its own numbers, no comparison, no anomaly, no test — even
though `settle-sport.ts` already has a whole evidence/anomaly framework
(`recordScorelessCompletedEvidence`, `SettlementAnomaly`) for a related but different
failure mode (completed-but-scoreless), which this scenario does not reuse.

**Concrete scenario.** Game G, paid path settles pick P1 using Odds API's score (24-20),
writing `game.homeScore=24, awayScore=20, status=FINAL`. A new pick P2 on the same game is
published minutes later (e.g. a late in-play total/backfill) and is still PENDING when an
operator or the autonomy executor (`RUN_FREE_SETTLE` is in `AUTONOMY_SAFE_CRON_TARGETS`,
`apps/web/lib/autonomy/safe-cron-targets.ts`) triggers `?path=free` to drain a backlog.
ESPN, independently, has a data error or a late correction for G — say 23-20. The free
path grades P2 against 23-20, and unconditionally rewrites `game.homeScore=23`. The Game
row that P1 was already published and settled against (24-20) is now silently
self-contradicting: P1's stored result no longer matches the game's stored score, and any
downstream reader of `game.homeScore` (a game-room page, an audit) sees a number that
disagrees with what P1 was actually graded on.

**Fix spec.**
1. In `free-settlement-runner.ts`, before the `tx.game.update` write inside the settle loop,
   read the CURRENT `game.homeScore`/`awayScore`/`status` (already available on `row.game` —
   extend the `pendingRows` select if a fresher read is needed inside the tx) — if
   `status === "FINAL"` and either score is already non-null AND differs from
   `(o.homeScore, o.awayScore)`, do NOT overwrite. Instead route to a new anomaly kind
   sharing the existing `settlement-evidence.ts` machinery:
   `SCORE_MISMATCH_CROSS_PATH` (sibling constant to `SCORELESS_COMPLETED_ANOMALY`), opened
   OPEN→OWNER_REVIEW on first sighting — never auto-resolved, since two disagreeing real
   scores need a human, not a retry.
2. Symmetric guard in `settle-sport.ts`'s paid-path `game.update` (currently only guards
   null-vs-non-null; add the same non-null-vs-different-non-null check).
3. `forceFree` in the cron route should log (not silently proceed) whenever it detects the
   game it is about to touch was already settled this same UTC hour bucket by the OTHER
   path — reuse `computeScheduledWindow()` (already imported in the route) as the dedup key,
   the same pattern `settle-sport.ts` already uses for `SettlementRun` identity.

**Test to add:** new file `apps/web/__tests__/free-settlement-runner-cross-path-score.test.ts`
— seed (via the test's DB mock/fixture harness already used by
`apps/web/__tests__/free-settlement.test.ts`'s sibling tests) a game with
`status:"FINAL", homeScore:24, awayScore:20`, run `runFreePathSettlement`'s settle branch
with a mocked free score of `23-20` for that same externalId/team pair, and assert:
(a) `game.update` is NOT called with the conflicting score, (b) a `SCORE_MISMATCH_CROSS_PATH`
anomaly path is invoked instead of a silent overwrite.

**Verify (deterministic):**
```
cd apps/web && npx vitest run __tests__/free-settlement-runner-cross-path-score.test.ts __tests__/free-settle-response-contract.test.ts && npx tsc --noEmit
```

**Idempotent:** additive guard + one new anomaly kind constant + one new test; safe to redo.

**Commit on pass:** `fix(settle): refuse to overwrite a FINAL game score with a conflicting cross-path value`

**ATTACK LIST (verifier):**
- Confirm the guard triggers ONLY on a genuine score conflict, never on the (extremely
  common, harmless) case of the SAME path re-confirming the SAME score twice — a false
  positive here would stall legitimate settlement.
- Confirm `Pick.result` for any picks already graded against the FIRST score is untouched
  by the second path's run (this fix is about the `Game` row; verify it doesn't
  accidentally also block or duplicate the `Pick` write, which was already race-safe).
- Confirm the new anomaly is visible through the SAME operator surface
  `SCORELESS_COMPLETED_ANOMALY` already reaches (`SettlementAnomaly` state machine) rather
  than a dead-end log line nobody reads.
- Reproduce the "before" behavior on `main` (or via `git stash`) to show the silent
  overwrite actually happens today, before claiming the fix changes anything.

---

## PL3 · MEDIUM — `canonicalSettled` fed a per-cycle count where every other caller treats it as cumulative

**DATA CLASS: INTERNAL.**

**File to fix:** `apps/web/lib/data-sources/free-settlement-runner.ts`, the
`planAutonomyCycle({...})` call (currently ~L554-578), specifically:
```ts
canonicalSettled: learning?.nEligible ?? null,
```

**The bug.** `AutonomyObservation.canonicalSettled` is consumed by
`apps/web/lib/autonomy/operating-kernel.ts` as a CUMULATIVE total against
`minSettledForLearning` (100) — see `buildRevenueReadiness()` (`obs.canonicalSettled <
obs.minSettledForLearning` → `blockers.push("Settled sample X/100 below PROVEN ladder
floor")`) and the `ACCUMULATE_SETTLED_SAMPLE` action title `` `Accumulate settled sample
(${settled}/${obs.minSettledForLearning})` ``. Every OTHER caller of `planAutonomyCycle`
in the codebase either passes the real cumulative DB count or explicitly passes `null`
when it doesn't have one yet:
- `apps/web/app/api/cron/autonomy-cycle/route.ts:120` → `canonicalSettled: null`
- `apps/web/app/api/cron/health-alert/route.ts:167` → `canonicalSettled: null`
- The actual cumulative source of truth already exists and is correct:
  `apps/web/lib/ops/canonical-sample-posture.ts` `loadCanonicalSamplePosture()` (wraps
  `apps/web/lib/performance/public-performance-policy.ts` `loadPublicPerformancePolicy()`),
  used by `/api/ops/daily-truth` and `/api/ops/public-surface-truth`.

`free-settlement-runner.ts` is the ONE caller that passes a non-null value, and it is
`learning?.nEligible` — `LearningBatchReport.nEligible` from
`apps/web/lib/autonomy/settlement-learning.ts`, which is explicitly scoped to
`gradedForLearning`, an array populated ONLY from picks settled in THIS run of
`runFreePathSettlement` (see the function body: `gradedForLearning.push(...)` inside the
per-outcome loop, nothing carried over between cron invocations). A typical hourly cron
cycle settles a handful of picks, not 100 — so every time this specific response is read
(directly, or by anything that trusts its embedded `autonomy` field as ops truth), the
PROVEN-gate signal reads as perpetually far from the floor ("Accumulate settled sample
3/100") regardless of how many picks are ACTUALLY settled cumulatively in the database,
even after the true cumulative count (per `canonical-sample-posture.ts`) has long since
cleared 100. This is not a mis-grade — it is a metrics-integrity bug in the exact response
CLAUDE.md's "Autonomous Loop Protocol" tells an agent to read for "self-audit remaining
gaps," in the exact file this deck's other findings (PL1/PL2) live in.

**No test covers this today** — grepped `free-settlement*.test.ts` and
`autonomy-kernel.test.ts` for `canonicalSettled`/`nEligible` together: zero hits. The
kernel's own unit tests only exercise `operating-kernel.ts`'s pure function with
synthetic `obs.canonicalSettled` inputs; nothing asserts what `free-settlement-runner.ts`
actually wires into that slot.

**Fix spec.**
1. In `runFreePathSettlement`, before the `planAutonomyCycle` call, load the true
   cumulative count: reuse `loadCanonicalSamplePosture(db, { commencedTotal: <existing
   commenced count if in scope, else 0>, canExposePerformanceStats: <read the existing
   env the route already reads>, minSettledPicksForLearning: 100 })` — or, if pulling in
   the ops loader's extra fields is more than this call site needs, call
   `loadPublicPerformancePolicy` directly and take `.canonicalSettledCount`. Either way,
   pass THAT into `canonicalSettled`, not `learning?.nEligible`.
2. Keep `learning.nEligible` exactly as-is under its own `learning` field in the return
   value (it is a legitimate, separately-named, per-cycle metric) — this fix only changes
   what feeds the `canonicalSettled` slot, nothing else in the response shape.
3. Guard the extra DB round-trip the same way every other optional enrichment in this
   function already is (`try { } catch { ...= null }`, non-fatal) so a failure here can
   never break settlement itself.

**Test to add:** extend `apps/web/__tests__/free-settle-response-contract.test.ts` (this
repo's established grep-on-source-text pattern) with:
```ts
expect(route).not.toMatch(/canonicalSettled:\s*learning\?\.nEligible/);
```
plus a positive assertion that the runner source calls the cumulative loader
(`loadPublicPerformancePolicy(` or `loadCanonicalSamplePosture(`) before constructing the
`planAutonomyCycle` input.

**Verify (deterministic):**
```
cd apps/web && npx vitest run __tests__/free-settle-response-contract.test.ts && npx tsc --noEmit
```

**Idempotent:** one call-site swap + one guarded DB read + one contract assertion; safe to
redo from a dead session.

**Commit on pass:** `fix(autonomy): wire the cumulative canonical-settled count into free-path autonomy, not this cycle's batch`

**ATTACK LIST (verifier):**
- Confirm the "before" bug is real by pointing at a DB with >100 true cumulative settled
  picks and a cron cycle that only grades 2-3 this run — show `autonomy.revenueReadiness
  .trackRecordReady` reads `false` and the action title reads e.g. "3/100" pre-fix.
- Confirm post-fix the same scenario reads the true cumulative number.
- Confirm `learning.nEligible` is untouched in the response (downstream consumers of that
  specific field, if any, must not regress).
- Confirm the added DB call is wrapped so a query failure degrades to `canonicalSettled:
  null` (matching the other two callers' safe default) rather than throwing and aborting
  settlement.

---

# Section 2 — Settlement throughput scaling (existing pipelines only)

**In-season TODAY per `packages/data-ingestion/src/config.ts` `getInSeasonSports()`
(month=8, no `ODDS_REFRESH_ALL_SPORTS` override assumed): NFL (preseason feed only, via
the separate `NFL_PRESEASON_ODDS_KEY` remap — real regular-season kickoff is still ahead),
NCAAF (season openers land in the final days of August — by far the highest game-count
slate of the four), MLB (full daily season — the only sport with a complete month of
volume), MLS (in season). NBA/NCAAB/NHL are outside their `SEASON_WINDOWS` and correctly
produce zero new picks until their windows open — that is working as designed, not a gap.
No card below adds a sport, widens a season window, or fabricates a pick; `settle-picks`
already runs hourly (`vercel.json` "20 * * * *" — forbidden zone, not touched by this
deck) and the free-path RCA/STP/stale-backfill machinery
(`docs/ops/SETTLEMENT_BACKLOG_CLEARANCE.md`) is already load-prioritized toward the
overdue band. The only real gap found is VISIBILITY: nothing currently tells an operator
or the autonomy loop how close each of the four live pipelines is to the ≥100 floor,
individually — see PL4/PL5.**

## PL4 · per-sport canonical-settled breakdown

**DATA CLASS: INTERNAL.**

**Artifact:** `apps/web/lib/ops/canonical-sample-posture.ts` (extend — new export, no
signature change to the existing `loadCanonicalSamplePosture`) + companion test file
`apps/web/lib/ops/canonical-sample-posture.test.ts` (create if it does not already exist;
if it does, extend it).

**Depends:** PL3 landed (this card calls the same corrected cumulative-count query
pattern PL3 just fixed the wiring for, so the two share one code path instead of drifting).

**Spec.** Add:
```ts
export interface CanonicalSampleBySport {
  readonly sportKey: string;
  readonly displayName: string;
  readonly canonicalSettled: number;
  readonly canonicalWins: number;
  readonly canonicalLosses: number;
  readonly canonicalPushes: number;
}

export async function loadCanonicalSampleBySport(
  db: LoadablePerformanceClient & { pick: { count: (args: Record<string, unknown>) => Promise<number> } },
  sports: readonly { key: string; displayName: string }[],
): Promise<readonly CanonicalSampleBySport[]>
```
Mirror the exact filter `loadPublicPerformancePolicy` already uses
(`isPublished:true, isBootstrap:false, NOT:{modelVersion:"v5.0.0-seed"}`), scoped per sport
via `game: { sport: { key: sport.key } }`, one `Promise.all` batch of counts per sport (four
counts × four in-season sports today — cheap, same shape as the existing
`loadPublicPerformancePolicy` `Promise.all`). Read-only; touches no write path.

**Discipline:** no fabricated total — every number is a live `db.pick.count`; sports with
zero rows return zeros, never omitted or interpolated. priced:false n/a (no pricing
surface touched). Fail-closed: a query failure for one sport must not blank out the others
— wrap each sport's `Promise.all` group independently.

**Verify (deterministic):**
```
cd apps/web && npx vitest run lib/ops/canonical-sample-posture.test.ts && npx tsc --noEmit
```

**Idempotent:** additive export + test; safe to redo.

**Commit on pass:** `feat(ops): per-sport canonical-settled breakdown for the PROVEN floor`

**ATTACK LIST (verifier):**
- Confirm the per-sport filter is IDENTICAL to `loadPublicPerformancePolicy`'s
  `settledFilter`/`notSeed`/`isBootstrap` conditions (a drifted definition here would make
  the sum of per-sport counts disagree with the existing cumulative total — assert
  `sum(bySport[*].canonicalSettled) === (await loadPublicPerformancePolicy(...)).canonicalSettledCount`
  in the test, on a shared fixture).
- Confirm a sport with zero settled picks renders `0`, not `null`/omitted.
- Confirm one sport's count query throwing doesn't blank the other three.

## PL5 · read-only ops snapshot script for the four live pipelines

**DATA CLASS: INTERNAL.**

**Artifact:** `scripts/ops/settlement-progress-snapshot.mjs` (new file, modeled directly
on `scripts/export-settled-picks-for-calibration.mjs`'s DATABASE_URL-guard + read-only
pattern) — no test file (this is a thin CLI, like its sibling export script, which also
ships without a dedicated test; its correctness rides on PL4's tested loader).

**Depends:** PL4 landed.

**Spec.** A single read-only Prisma-backed script:
1. Refuse-closed exactly like `export-settled-picks-for-calibration.mjs`: no
   `DATABASE_URL`/stub value → exit 2, no query attempted.
2. Query per-sport counts for exactly the four sports `getInSeasonSports()` currently
   returns (import it — do not hardcode the list, so the script naturally goes quiet on a
   sport once its window closes and picks it up when NCAAB/NBA/NHL open, with zero edits).
3. Print a plain table: sport, canonicalSettled, canonicalWins/Losses/Pushes, `X/100`,
   `remainingToFloor` — reusing `loadCanonicalSampleBySport` (PL4) plus the existing
   cumulative total from `loadPublicPerformancePolicy` for a grand-total row.
4. No mutation, no argument that could write anything — this script cannot settle, cannot
   generate, cannot touch `Game`/`Pick` rows. It only counts.

**Discipline:** this IS the "cards for settlement throughput" deliverable — it does not
scale volume by adding a pipeline; it makes the EXISTING four pipelines' contribution to
the ≥100 floor visible per-sport, so an operator can see (for example) that NCAAF's
opening week is the single highest-volume lever available before NFL kickoff, without
guessing or fabricating a number to say so.

**Verify (deterministic):**
```
node --check scripts/ops/settlement-progress-snapshot.mjs && DATABASE_URL=stub node scripts/ops/settlement-progress-snapshot.mjs; test $? -eq 2
```
(second command asserts the refuse-closed guard exits 2 on a stub URL, exactly like its
sibling export script's own convention)

**Idempotent:** one new read-only file; safe to redo.

**Commit on pass:** `chore(ops): read-only per-sport settlement progress snapshot`

**ATTACK LIST (verifier):**
- Confirm the script contains no `create`/`update`/`delete`/`upsert`/`$executeRaw` call
  anywhere (grep the file) — it must be provably read-only, not just documented as such.
- Confirm it imports `getInSeasonSports()` rather than a hardcoded sport list (so it
  self-updates as season windows open/close without a follow-up edit).
- Confirm the stub-`DATABASE_URL` exit code is exactly `2` (matching its sibling script's
  contract, in case anything ever greps for that code).

---

# Section 3 — Public calibration/track-record page (fed only by graded data)

**Both routes already exist and already gate correctly** —
`apps/web/app/performance/page.tsx` (title "Calibration Report," renders
`CalibrationPanel`, sourced from `apps/web/lib/calibration/report.ts`
`loadPublicCalibrationReport()` → `resolveEffectivePerformanceGate()` →
`computeCalibration()`, itself reading only `db.pick` rows with
`signalSnapshot.eligibleForLearning:true` — VOID/DISPUTED/HELD picks are already
excluded by construction, so PL1's new `AMBIGUOUS_MATCH` HELD state needs no additional
plumbing here) and `apps/web/app/calibration/page.tsx` (the branded "Proof Room" hub
linking to it, `/clv`, `/ledger`, `/proof`, `/track`, `/accountability`). No card in this
section creates a page — the two real, bounded gaps found are below.

## PL6 · leak-guard: ops-only settled-sample counts must never reach a public route

**DATA CLASS: PUBLIC** (a boundary/import-graph test — no proprietary content, no edge
methodology, just confirming a public/private line the code already draws).

**Artifact:** `apps/web/__tests__/canonical-sample-posture-import-boundary.test.ts` (new).

**Spec.** Today `loadCanonicalSamplePosture`/`canonical-sample-posture.ts` is imported
only by `apps/web/app/api/ops/daily-truth/route.ts` and
`apps/web/app/api/ops/public-surface-truth/route.ts` (confirmed by recon: repo-wide grep
found exactly these two importers, both under `app/api/ops/`). This card locks that in as
a regression-proof contract, since PL4 is about to add a second exported function to the
same file and any future edit could accidentally import it from a real public page:
```ts
// grep every apps/web/app/**/page.tsx and every apps/web/app/**/route.ts NOT under
// app/api/ops/** for an import of "canonical-sample-posture"; assert zero matches.
```
Reuse this repo's existing grep-source-text contract-test idiom (same style as
`free-settle-response-contract.test.ts`).

**Discipline:** priced:false n/a. This is purely a static-import check — no runtime
behavior, no network, no DB.

**Verify (deterministic):**
```
cd apps/web && npx vitest run __tests__/canonical-sample-posture-import-boundary.test.ts && npx tsc --noEmit
```

**Idempotent:** one new test file; safe to redo.

**Commit on pass:** `test(ops): lock ops-only canonical-sample-posture out of public routes`

**ATTACK LIST (verifier):**
- Confirm the test actually fails if a `page.tsx` under, say, `app/performance/` is
  temporarily edited to import the ops module (don't just trust the glob — run it against
  a deliberately-broken fixture once, locally, to prove it catches the case, then revert).
- Confirm the glob genuinely covers nested app routes (`app/**/page.tsx`,
  `app/**/route.ts`), not just top-level ones.

## PL7 · calibration report computes a freshness timestamp the public page never shows

**DATA CLASS: PUBLIC** (pure rendering of an already-computed, already-public field — no
new data source, no proprietary logic).

**File to fix:** `apps/web/components/performance/calibration-panel.tsx`.

**The gap.** `apps/web/lib/calibration/report.ts` `loadPublicCalibrationReport()` already
computes and returns `data.updatedAt: string` (an ISO timestamp, set at request time) on
every `CalibrationReportPayload`. `CalibrationPanel` already destructures the wider
`CalibrationData` type that includes it (`type CalibrationData =
Awaited<ReturnType<typeof loadPublicCalibrationReport>>["data"]`) and already renders the
sibling `data.modelVersions` field right next to where a freshness stamp would go (L295-298)
— but `data.updatedAt` itself is never referenced anywhere in the component (grepped the
file: zero matches). Root CLAUDE.md non-negotiable 5 is "No stale data — always validate
timestamps and freshness"; the platform's own flagship "Calibration Report" / proof page
computes the one number that would let a visitor SEE that for themselves and drops it on
the floor.

**Fix spec.** In the same block that renders `modelVersions` (L294-299), add a rendered
"Updated `<relative-or-absolute time>`" line sourced from `data.updatedAt`, formatted with
whatever date-formatting utility this repo's other public surfaces already use for
timestamps (check `apps/web/lib/format/` for an existing helper before adding a new one —
`stat.ts` is already imported in this file for `formatCount`/`formatBrier`; prefer a
sibling formatter over a bespoke `Date` call in the component). No new data fetch, no new
prop — `data` already carries the field.

**Test to add:** extend (or create)
`apps/web/__tests__/calibration-panel-freshness.test.tsx` (or equivalent existing
component-render test for this file, if one exists — check
`apps/web/__tests__/` for `calibration-panel` first) asserting the rendered output
contains a formatted representation of a supplied `updatedAt` fixture value.

**Verify (deterministic):**
```
cd apps/web && npx vitest run __tests__/calibration-panel-freshness.test.tsx && npx tsc --noEmit
```

**Idempotent:** one render addition + one test; safe to redo.

**Commit on pass:** `feat(performance): show the calibration report's freshness stamp`

**ATTACK LIST (verifier):**
- Confirm the timestamp shown is `data.updatedAt` (server-computed at request time via
  `now.toISOString()` in `report.ts`), not `new Date()` evaluated client-side or at build
  time — a static/build-time stamp would silently lie about freshness on every subsequent
  page load.
- Confirm the collecting/gated state (`isCollecting: true`) still renders sensibly with a
  timestamp present (the gated branch of `loadPublicCalibrationReport` already sets
  `updatedAt: now.toISOString()` too — verify the component doesn't need a null-check that
  isn't already implied by the type).

---

# Section 4 — CLV ledger surfacing (Elite)

## PL8 · Elite CLV ledger: surface the platform's own graded CLV, not just a personal log

**DATA CLASS: INTERNAL** (entitlements + CLV fields are money-adjacent — Elite is a paid
tier keyed on this exact feature).

**Artifacts:**
- `apps/web/lib/clv/user-clv-ledger.ts` (new) — server-only loader
- `apps/web/app/track/platform/page.tsx` (new route, `/track/platform`) OR a new tab
  inserted into the existing `apps/web/app/track/page.tsx` (`BetTracker` stays exactly as
  it is — this is additive, not a replacement of the personal ledger)

**Depends:** none of PL1-PL7 (reads already-populated `Pick.clv*` fields — populated at
settlement time by `gradePickClv()` / `gradeFreePathClv()`, both already shipped and
tested); independent of this deck's other cards.

**The gap (recon).** `packages/prediction-engine/src/edge-lab/kelly.ts`'s `clvDeflator`/
`portfolioKellyStakes` have zero importers under `apps/web` (grepped repo-wide) — internal
research/staking math, not user-facing. The one CLV-branded page,
`apps/web/app/track/page.tsx`, gates on `viewer.canUseClvLedger` (ELITE-only, correctly
server-enforced via `getViewerEntitlements()` — fail-closed to FREE on any auth error) but
its `BetTracker` component (`apps/web/components/tracker/bet-tracker.tsx`) is 100%
`localStorage`-backed (L49-52) — a personal, manually-entered bet log with no code path to
the platform's own graded picks. Root CLAUDE.md's pricing table lists Elite as including
"CLV/line-value ledger"; today that promise is met only by a private diary tool, not by
any view of the platform's OWN settled picks' realized CLV — even though every settled
pick already carries `clvValue`, `clvVerdict`, `clvCloseLine`, `clvClosePrice`,
`clvLockLine`, `clvLockPrice` (see `scripts/export-settled-picks-for-calibration.mjs`'s own
select list for the exact field set already populated on `Pick`).

**Fix spec.**
1. `user-clv-ledger.ts`: a server-only loader, gated identically to `/track` —
   `getViewerEntitlements().canUseClvLedger` checked by the CALLING route/page, fail-closed
   to an empty/locked result on any auth error (same pattern as `tier-access.ts`). Query:
   `db.pick.findMany({ where: { isPublished:true, result:{not:"PENDING"} }, select: { id,
   sport, pickType, selection, line, result, settledAt, clvValue, clvVerdict, clvCloseLine,
   clvClosePrice, clvLockLine, clvLockPrice }, orderBy: { settledAt:"desc" }, take: 200 })`
   — read-only, no write path.
2. Render: a plain table (result, clvVerdict badge, clvValue) — fail-closed per row: a
   pick with `clvValue: null` (no closing snapshot was derivable — a real, already-modeled
   state in `gradePickClv`) renders "not graded," never a fabricated number or a silently
   dropped row.
3. This is a VIEW of already-published, already-graded picks the Elite tier already has
   full-board access to — it adds no new data collection and computes no new number; every
   value rendered already exists on the `Pick` row.
4. Do not touch `packages/db/prisma/schema.prisma` — every field this card needs already
   exists on `Pick`. If a future iteration wants THIS USER'S personal unlock history tied
   to the ledger (vs. "all published picks," which is what Elite's full-board access
   already means), that is a bigger feature needing an unlock/access-log join — out of
   scope here, filed under Open Questions.

**Test to add:** `apps/web/lib/clv/user-clv-ledger.test.ts` — asserts: FREE/PRO viewer gets
a locked/empty result (never partial data); ELITE viewer gets rows shaped as specified;
a pick with `clvValue:null` renders as ungraded, never coerced to `0` or omitted silently
from the count.

**Verify (deterministic):**
```
cd apps/web && npx vitest run lib/clv/user-clv-ledger.test.ts && npx tsc --noEmit
```

**Idempotent:** two new files (loader + its test) + one new route or tab addition; safe
to redo from a dead session.

**Commit on pass:** `feat(clv): surface the platform's own graded CLV to Elite (existing fields, new view)`

**ATTACK LIST (verifier):**
- Confirm a FREE or PRO session hitting the new route/loader gets a locked result
  server-side — never a client-only gate, never a flash of real data before a redirect
  (test this exactly the way `/track`'s existing gate is tested, if such a test exists —
  check `apps/web/__tests__/` for a `track` or `tier-gate` test first and mirror it).
- Confirm a `clvValue: null` row is rendered honestly ("not yet graded" / "no closing
  line captured"), not hidden or zero-filled — a hidden ungraded pick would make the
  visible sample look better than the true population, the exact failure mode
  `public-performance-policy.ts`'s population/rate split exists to prevent elsewhere.
- Confirm this view reads `Pick` rows only — no write, no mutation, no interaction with
  `event-odds-ingest.ts` or any ingestion write path.
- Confirm nothing here computes an aggregate "your CLV win rate" claim without the same
  Clopper-Pearson-interval discipline `public-performance-policy.ts` already applies to
  the platform-wide number — a per-user aggregate with a bare point estimate would be a
  smaller-sample version of the exact overclaim pattern that module was built to prevent.

---

## Open questions (tracked; none blocks the cards above except as stated)

1. **True current settled-picks count is UNKNOWN from source alone.** No fixture/seed in
   this branch materializes a canonical sample; PL4/PL5 make it queryable, but this deck
   does not and should not guess a number. Whoever runs PL5's snapshot script first should
   paste its actual output into the next ops handoff doc rather than this one carrying a
   stale guess forward.
2. **PL1's fix holds ambiguous same-day rematches rather than resolving them.** A fuller
   fix would thread a real per-game identifier (ESPN `event.id` / henrygd's id) all the way
   from `Pick`/`Game` through to `PendingPick` so a doubleheader resolves correctly instead
   of sitting HELD for manual audit an extra cycle. That is a larger, cross-cutting plumbing
   change (touches the `pendingRows` select in three call sites plus the `PendingPick` type)
   deliberately left out of this deck's critical-path fix — filed here for a follow-up card,
   not silently deferred.
3. **PL8 ships "all published picks" as the Elite CLV ledger, not "picks this specific user
   unlocked."** Those are the same set today (Elite = full board), but if unlock-level
   access logging is ever added, the ledger should probably scope to what the user actually
   saw. Needs a founder call on whether that distinction matters before it's built — not
   assumed here.
4. **HELD/AMBIGUOUS_MATCH and DISPUTED picks are never persisted** — `runFreePathSettlement`
   only counts them in-memory for the current cycle (`picksHeld++`); the DB row stays
   `PENDING` forever until a later cycle resolves it. A public "N picks currently held for
   audit" honesty line (which would pair naturally with PL7's freshness stamp) is NOT
   buildable without either a schema change (new `Pick.holdReason` column, forbidden zone
   for this deck) or re-deriving it live on every page render (expensive, and duplicates
   settlement logic outside the settlement path — worse than not showing it). Founder
   decision needed on whether this is worth a schema migration in a later deck; not
   proposed as a card here.
5. **PRs #555/#556/#557 are NOT a dependency for this deck.** Recon confirmed (`git log
   --all --grep`) none of these PR numbers exist as merged commits in this repo yet; per
   `docs/data/CARDS_SHARE_CORE_WIRING.md`'s own dependency ledger they are covariate-bus /
   barrel-export PRs for the props/edge-lab program, unrelated to Pick settlement, grading,
   or the calibration/PROVEN-gate surfaces this deck touches. Nothing above blocks on them;
   noted here explicitly rather than left ambiguous, since the task brief asked.
6. **PL2's severity depends on how often `?path=free` is actually invoked while a paid key
   is present.** If the owner never uses the `forceFree` drain in practice (it may be a
   break-glass tool used rarely), PL2's real-world exposure is lower than its HIGH label
   assumes; the label reflects worst-case blast radius (a silently corrupted `Game` row) at
   plausible-not-rare frequency (any operator or the autonomy executor invoking
   `RUN_FREE_SETTLE`), not a measured incident rate. Re-rate after PL5's snapshot script
   shows how often the two paths' windows actually overlap in practice.
