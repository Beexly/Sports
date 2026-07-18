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

1. **#92 — settle/refresh TOCTOU race + stale-close CLV fabrication.** `process-sport.ts:483`'s check-then-act
   can let a refresh overwrite a just-settled pick's published grade; no `MAX_CLOSE_AGE_MS` guard exists.
   Highest severity: directly threatens settlement correctness and CLV integrity, the platform's core
   money-truth surface. Protected zones: settlement, CLV — mandatory red-team.
2. **#82 — prod DB fail-open + fake-healthy health check.** A misconfigured production `DATABASE_URL` silently
   drops writes while `/api/health` reports healthy — an operational blind spot that could mask a total outage.
   Protected zones: production integrity, observability.
3. **#93 — cockpit per-page ADMIN.** Already tracked as open PR #123 (`RECOVER_WHOLE` per Group F above) — this
   wave's action is to re-verify #123's rebase against the CURRENT main tip (same as Wave R1, below; R0.6 and
   R1 converge on the same unit of work) rather than re-deriving #93 from scratch. Protected zones: entitlements,
   auth.
4. **#86 — picks stuck PENDING forever.** No terminal-state sweep for cancelled/postponed/feed-missed games;
   `daysFrom` still 2 not 3. Protected zones: settlement, data integrity.
5. **#84 — orphaned CLV grades.** A crash between settle-write and CLV-write permanently drops that pick from
   the public beat-close-rate sample, with no healing sweep. Protected zones: CLV, public claims.
6. **#89 — outage on `/api/promotions` masked as an honest empty response.** Depends on #87's `outage-gate.ts`
   (also RECOVER_WHOLE, not itself in the live-defect-6 but a direct dependency). Protected zones: data
   reliability, public claims.

**Method for each:** FREEZE CONTRACT (re-derive the exact fix against CURRENT main, not the stale PR diff —
main has advanced since these PRs were authored) → CODE (port the fix, re-verified against today's file
state) → TARGETED TEST → mandatory red-team (all six touch a protected zone) → FINAL VERIFY → ledgers → commit
→ push → bounded recovery PR (never merged to main by this agent). **Not performed this pass** — each is its
own "one bounded recovery wave," per the contract's own law, not a single mega-wave covering all six at once.

## Wave R1 — Security hardening (#123)

Per-page Cockpit ADMIN checks. Seed disposition `RECOVER_WHOLE` stands, but the branch's zero-conflict-rebase
claim was made against an older main tip; main has since advanced (through #119/#120 at minimum). Re-verifying
the rebase against the CURRENT main tip, then re-running `test:cockpit`/`test:brand-safety`/full web suite, is
the concrete next action — not performed this pass.

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
R0.6  Recover the 6 live-defect fixes from R0.5 (#92 > #82 > #93 > #86 > #84 > #89) — NOT performed this pass
R1    Re-verify #123 rebase against current main tip (converges with R0.6 item 3)
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
