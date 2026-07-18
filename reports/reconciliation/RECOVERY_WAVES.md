# Recovery Waves — Reconciliation Plan

**Status:** inventory pass complete + one verification wave (R0.5) complete, both this session (2026-07-18). Per
the reconciliation contract's own "Recovery-wave law," each wave is its own bounded pass — R0.5 was scoped to
verification only (resolving whether #76-96's content landed on main, not porting any missing content forward).
Per `.claude/commands/genesis-reconcile.md` §8 ("Stop after one inventory or recovery wave"), actual code
recovery (Wave R0.6) is intentionally NOT performed in this same pass.

Sequencing below is the seed doc's own `R0`-`R11` order, refreshed against this pass's live findings. It changes
only where fresh evidence demonstrates a stronger dependency or urgent correctness/security defect — two such
changes are made below (R0.5, now DONE, and its own child R0.6) and explicitly justified.

## Wave R0 — Restore trustworthy CI baseline (#128)

**Status: ready, founder-merge-only.** Independently re-verified this session (prior to this reconciliation
pass — same-day): `commercial-copy-scan` OK, `trust-gate` OK, `secret-scan` OK, `git diff --check` clean. One
file, four lines, comment-only. No agent action remains — merging is founder-only.

## Wave R0.5 — DONE (2026-07-18): verify the #76-96 PR-content gap

**Why inserted here, ahead of R1:** this reconciliation pass's own mechanical PR-reference sweep of `main`'s
commit history found PR numbers **#76-96** absent from the squash-commit trail that #97-120 all show clearly.
Several of these are named hotfixes for **settlement race conditions, cockpit auth, and proof-count bounds** —
exactly the class of "live correctness/security defect" the queue-drain contract's own priority law
(`CONTINUOUS_EXECUTION_CONTRACT.md` §6) says should reorder the queue when fresh evidence reveals it.

**Method used:** each of the 21 PRs (#76-96) was resolved to its head branch via `pull_request_read`, then
`git diff origin/main...origin/<head-branch> --stat` was run, followed by direct reading of `main`'s current
file content against each PR's described fix (comparison-method tier 4: exported-symbol/behavioral
equivalence via direct inspection — not branch-ahead-count, not commit-message pattern matching alone).

**Result: 5 SUPERSEDED, 16 RECOVER_WHOLE, 0 unresolved.** Full verdicts with evidence citations are in
`BRANCH_PR_LEDGER.json`'s `namedEntries` (`group: "R0.5"`) and `BRANCH_PR_LEDGER.md`'s dedicated section.
**6 of the 16 RECOVER_WHOLE verdicts are LIVE, currently-exploitable defects on `main`** (#82 prod-DB
fail-open, #84 orphaned CLV grades, #86 picks stuck PENDING forever, #89 outage masked as empty response, #92
settle/refresh TOCTOU race, #93 cockpit per-page ADMIN gap — the last already tracked separately via open PR
#123). This wave was scoped to **verification only** per its own original framing — recovery (porting the
content forward as bounded PRs) is Wave R0.6, below, priority-ordered by the contract's own live-defect law.

## Wave R0.6 — NEW, evidence-driven insertion: recover the 6 live-defect fixes from R0.5

**Why inserted here, ahead of R1:** these are not speculative gaps — R0.5 confirmed by direct code inspection
that each of the following is exploitable on `main` **today**. `CONTINUOUS_EXECUTION_CONTRACT.md` §6 ranks
"live correctness / security / money-truth defect" above all other priority factors, including previously
higher-numbered waves in this same sequence.

**Priority order (most severe first, by blast radius):**

1. **DONE (2026-07-18, DEC-035) — #92 — settle/refresh TOCTOU race + stale-close CLV fabrication.**
   `process-sport.ts`'s check-then-act unconditional upsert replaced with an atomic `updateMany` scoped to
   `result:"PENDING"` + a race-safe `create`-with-P2002-catch + a sidecar-mint gate; `settle-sport.ts`'s
   `take:80`→`take:240`; `clv-capture.ts` gained `MAX_CLOSE_AGE_MS` (6h). gse-red-team CONFIRMED clean, zero
   findings. 44/44 + 127/127 (ingestion-pipeline), 13/13 + 1462/1462 (prediction-engine), guardrails 17/17.
   Committed (`7c1276f8`) and pushed to `claude/galaxy-sports-edge-pdcswh`, tracked by the existing accounting
   PR #129 (per Wave R5's own ruling against splitting this branch into separate PRs — DEC-numbered ledger
   entries substitute for per-workstream PR boundaries); founder-merge-only, never merged to `main` by this
   agent. Was: `process-sport.ts:483`'s check-then-act could let a refresh
   overwrite a just-settled pick's published grade; no `MAX_CLOSE_AGE_MS` guard existed. Highest severity:
   directly threatened settlement correctness and CLV integrity, the platform's core money-truth surface.
   Protected zones: settlement, CLV — mandatory red-team (completed).
2. **DONE (2026-07-18, DEC-036) — #82 — prod DB fail-open + fake-healthy health check.**
   `packages/db/src/index.ts`'s `buildClient()` now throws before activating the stub client when
   `VERCEL_ENV==="production"` or `PRODUCTION_RUNTIME==="true"` (explicit `ALLOW_STUB_DB_IN_PRODUCTION=true`
   escape hatch available); `/api/health` reports honest `error` via the pre-existing `isStubMode()` export
   instead of a vacuous `ok`; all 3 worker Dockerfiles + oracle-vps compose.yml declare `PRODUCTION_RUNTIME=true`
   so the guard actually trips in the self-hosted path. gse-red-team CONFIRMED clean, zero findings, and
   surfaced a founder-authored divergent fix attempt on a separate unmerged branch (commit `3c8df41e`) —
   recorded as `COLLISION-7a`/`COLLISION-7b` in `FILE_SYMBOL_OWNERSHIP.csv`, not silently overridden. 23/23
   (packages/db) + 10/10 (health-route) green, guardrails 17/17. Committed and pushed to
   `claude/galaxy-sports-edge-pdcswh`, tracked by the existing accounting PR #129. Was: a misconfigured
   production `DATABASE_URL` silently dropped writes while `/api/health` reported healthy — an operational
   blind spot that could mask a total outage. Protected zones: production integrity, observability — mandatory
   red-team (completed).
3. **DONE (2026-07-18, DEC-037) — #93 — cockpit per-page ADMIN.** Re-verified PR #123's rebase against the
   CURRENT main tip: only 1 of 32 target files had drifted (non-overlapping), applied via a verified-clean
   `git apply`. New `apps/web/lib/cockpit/require-admin.ts` called first in all 32 cockpit `page.tsx` files;
   new 36-test source-scan suite makes a future page that forgets the guard fail CI automatically. gse-red-team
   CONFIRMED CLEAN on all 9 review points, zero findings. `test:cockpit` 279/279, `test:brand-safety` 3053/3053,
   full `apps/web` suite 634/8,592 green. Committed and pushed to `claude/galaxy-sports-edge-pdcswh`, tracked
   by the existing accounting PR #129 (converges with PR #123's own eventual founder disposition). Protected
   zones: entitlements, auth — mandatory red-team (completed).
4. **DONE (2026-07-18, DEC-038) — #86 — picks stuck PENDING forever.** `settle-sport.ts` rewritten: shared
   `settleCompletedGame()` extracted so the live feed loop and a new `catchUpSweep()` grade identically;
   `catchUpSweep()` runs unconditionally after the feed pass (even on feed error — DB-only, must keep healing
   through an outage) with two arms — HEAL (any FINAL-with-both-scores game whose picks are still PENDING, no
   age cutoff) and VOID (picks past a 72h `commenceTime` horizon with no gradeable outcome, terminally closed
   via an atomic `updateMany` scoped to `PENDING`, mirrors sportsbook "no action" grading). Required manual
   reconciliation, not blind `git apply` — the historical branch forked before both DEC-035's own `take:240`
   fix and an unrelated `awayTeamName`-required-arg change already on `pdcswh`. Self-initiated 16-file ripple
   audit (VOID now reachable in volume for the first time) found 14/16 already correct, fixed 1
   (`brief/compose.ts`'s admin-only settlement text now reconciles with a `V` term), resolved 2 as moot
   (watchlist alerts are fully inert behind a default-off flag; the calibration replay-provenance route is
   hardcoded to an empty array, so it never serves real data regardless of its missing auth check). gse-red-team
   CONFIRMED clean on all 7 settlement-correctness review points, zero findings. `settle-sport.test.ts` 29/29,
   `brief-compose.test.ts` 3/3, full `apps/web` suite 634/8,595 (was 634/8,592), guardrails 17/17, workspace
   typecheck clean. Committed and pushed to `claude/galaxy-sports-edge-pdcswh`, tracked by the existing
   accounting PR #129. Was: a game that goes FINAL but whose picks the feed loop never revisits (a missed poll
   window) or a cancelled/postponed game left its picks PENDING forever with zero path to a terminal state,
   silently understating the public "settled" population. Protected zones: settlement, data integrity, public
   claims — mandatory red-team (completed).
5. **#84 — orphaned CLV grades.** A crash between settle-write and CLV-write permanently drops that pick from
   the public beat-close-rate sample, with no healing sweep. Must sequence after item 4 above — also touches
   `settle-sport.ts`'s settlement path; contract against the file state DEC-038 established, not the historical
   PR's stale base. Protected zones: CLV, public claims.
6. **#89 — outage on `/api/promotions` masked as an honest empty response.** Depends on #87's `outage-gate.ts`
   (also RECOVER_WHOLE, not itself in the live-defect-6 but a direct dependency, not yet recovered). Protected
   zones: data reliability, public claims.

**Method for each:** FREEZE CONTRACT (re-derive the exact fix against CURRENT main, not the stale PR diff —
main has advanced since these PRs were authored) → CODE (port the fix, re-verified against today's file
state) → TARGETED TEST → mandatory red-team (all six touch a protected zone) → FINAL VERIFY → ledgers → commit
→ push → bounded recovery PR (never merged to main by this agent). Items 1-4 DONE (DEC-035/036/037/038); items
5-6 remain, each its own "one bounded recovery wave," per the contract's own law, not a single mega-wave.

## Wave R1 — Security hardening (#123)

**DONE (2026-07-18) — converged with R0.6 item 3 above (DEC-037).** Per-page Cockpit ADMIN checks re-verified
against the CURRENT main tip and landed. The founder's own disposition of PR #123 itself (close as
superseded-by-this-port, or keep separately for its own review trail) remains an OWNER_GATE — this wave did
not close or modify PR #123, only ported its content forward onto `pdcswh`.

## Wave R2 — Genesis shadow kernel (#127)

Already independently verified this session (26 tests, `tsc --noEmit` clean across every workspace, gse-verifier
PASS 13/13 on the contract's own §13 checklist). Ready for founder rebase/merge decision. No further agent
action possible.

## Wave R3 — Consolidate #125/#126 control packages

**Already complete.** PR #126 confirmed closed (live-verified this pass); its unique convergence-map content
preserved verbatim in #125's `docs/genesis/archive/`. Nothing further required.

## Wave R4 — Exhaustive branch/PR ledger

**This pass.** `BRANCH_PR_LEDGER.json`/`.md`, `FILE_SYMBOL_OWNERSHIP.csv` (six proven collisions), this file,
`DELETION_RECEIPTS.md`, and `scripts/genesis/audit-work-inventory.mjs` produced. 184/184 branches have a ledger
entry; 25 carry full semantic detail; 159 carry real metadata with an honest `UNKNOWN` disposition pending
dedicated review (see R11.5 below).

## Wave R5 — Split #129 into bounded recovery PRs

**Substantially already done, differently than originally framed.** The seed doc's Group C candidate slices
(SportsIR, worldline, playback, Reality Receipt, OTS/MCP, weather-edge, Intelligence Watch/hypothesis-to-
instrument, source-rights convergence) are — per this session's own `DECISION_REGISTER.md` — each already a
separately contracted, separately tested, separately reviewed workstream (W001-W009, W-OTS, W-MCP,
W-WEATHER-REC), all landed on the SAME branch (`pdcswh`) rather than as separate PRs. The remaining gap vs. the
seed's literal instruction ("split by capability... never merge the branch wholesale") is a PROCESS gap, not a
CONTENT gap: the work is already capability-bounded and reviewed, it simply all lives under one PR (#129)
instead of nine. Splitting #129 into nine separate PRs at this point would be a large, mechanically risky
git-history operation (cherry-picking each workstream's commits onto separate branches) for a benefit (easier
founder review) that PR #129's own updated body already provides via its "Campaign status" section's per-
workstream breakdown with exact evidence. Recommend the founder decide whether literal PR-splitting is still
wanted given the existing per-workstream documentation already substitutes for it, before an agent spends the
git-history-surgery effort. Not performed this pass.

## Wave R6 — Recover #121 Fantasy Engine

Trademark rename independently re-verified complete (DEC-022, this session). Rebase pending merge-order
resolution with #123 (shared `require-admin.ts`). No further agent action possible until founder resolves
merge order between #121/#122/#123.

## Wave R7 — Recover #124 Foundry/Radar/Assurance into the Genesis genome

Blocked on #127 landing (W006's own confirmed-BLOCKED status, re-checked live multiple times this session).
Convergence ruling already exists (this pass's `FILE_SYMBOL_OWNERSHIP.csv` COLLISION-2d/3d). No agent action
possible until the founder merges #127.

## Wave R8 — Compare #112 vs #129, recover residual playback value

Not performed this pass. Concrete next action: diff `codex/gse-frontier-recovery-2026-07-13` against current
`pdcswh` HEAD to isolate `market-values` canonical types + `lib/market/*`, cockpit selected-game playback,
fantasy public gate, and Twin/Brain/autopsy/Studio projections (per `RECOVERY_MATRIX.md` row #112) — the
specific residual assets RECOVERY_MATRIX already named as still-recoverable.

## Wave R9 — Validate #122 in the protected migration lane

`OWNER_GATE`. A fresh shadow-DB/drift proof against the CURRENT main tip (main has advanced since #122's
authoring) plus an independent red-team pass are the concrete next actions. No production migration in this or
any wave without founder action.

## Wave R10 — Preserve and later port #52 Dynasty packages

`ARCHIVE_ONLY`. No semantic dependencies are ready yet (Genesis kernel/#127 not landed). No action until #127
merges and a bounded port target is scoped.

## Wave R11 — Delete only branches with completed deletion receipts

Zero deletions this pass (see `DELETION_RECEIPTS.md`). The 12 branches proven to be pure ancestors of `main`
(0 commits ahead — real `git merge-base --is-ancestor` evidence) are the cleanest deletion-receipt candidates
for a future wave; a receipt was not written this pass because the contract requires the receipt to exist
BEFORE any deletion action, as its own explicit step, not bundled into inventory.

## Wave R11.5 — NEW: triage the 159-branch long tail

Not in the original seed sequencing (the seed's known groups covered the PR-backed subset only). Recommended
method for a future pass: (1) name-pattern clustering — branches matching `claude/magical-volta-*` (≈25
branches, per this pass's raw listing) share a naming pattern strongly suggestive of duplicate/abandoned
agent-session artifacts, a hypothesis to verify via content-diff, not asserted as fact here; (2) recency
triage — the 74 branches with a last-commit date on/after 2026-07-01 are the higher-signal subset to review
first; (3) for each, apply the SAME comparison-method tiers used in R0.5 before assigning any
`SUPERSEDED`/`ARCHIVE_ONLY`/`DELETE_AFTER_PROOF` disposition.

## Recommended order (refreshed)

```text
R0    Land #128 (founder-merge-only; agent work complete)
R0.5  DONE (2026-07-18) — Verify #76-96 PR-content gap: 5 SUPERSEDED, 16 RECOVER_WHOLE
R0.6  Recover the 6 live-defect fixes from R0.5 (#92 > #82 > #93 > #86 > #84 > #89)
      — items 1-3 (#92, #82, #93) DONE (DEC-035/036/037, 2026-07-18); items 4-6 NOT performed this pass
R1    DONE (2026-07-18) — converged with R0.6 item 3 (DEC-037); PR #123's own disposition stays OWNER_GATE
R2    #127 founder decision (agent work complete)
R3    Done
R4    Done (this pass)
R5    Founder decision on literal PR-splitting of #129 vs. existing per-workstream docs
R6    #121 rebase pending founder merge-order call
R7    Blocked on #127
R8    Diff #112 vs #129 residual value
R9    Fresh #122 drift proof + red-team
R10   Blocked on #127
R11   Deletion receipts for the 12 proven-ancestor branches
R11.5 Long-tail triage (138 branches remaining after R0.5's 21 resolutions)
```
