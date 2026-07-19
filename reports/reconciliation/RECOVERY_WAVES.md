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
5. **DONE (2026-07-18, DEC-039) — #84 — orphaned CLV grades.** `settle-sport.ts`'s CLV write changed from
   unconditional `db.pick.update` to conditional `updateMany` scoped to `clvGradedAt:null` ("grade-once,"
   mirroring the existing settle-once pattern), via two extracted helpers (`fetchClosingSnapshot`,
   `gradeAndRecordClv`). New `healOrphanedClvGrades()` wired in as a third feed-independent arm inside
   DEC-038's `catchUpSweep()` — finds picks with a decisive result but `clvGradedAt:null`, groups by game,
   grades CLV WITHOUT ever re-deriving the settlement result, and defensively re-invokes the already-idempotent
   settlement-snapshot write. Re-derived against the CURRENT architecture rather than blind-ported: the
   historical PR threaded orphan detection into the live feed's own per-game query, which can never reach an
   orphan whose game aged out of the 3-day scores lookback — the exact blind-spot class DEC-038 already
   eliminated for stuck-PENDING picks. No consumer-side ripple audit required (unlike #86) since this
   introduces no new/newly-reachable result state, only fills in previously-null CLV fields on picks already
   WIN/LOSS/PUSH — confirmed `clv-coverage.ts`/`public-clv-policy.ts` already treat `clvVerdict:{not:null}` as
   eligibility. gse-red-team CONFIRMED clean on all 9 code-correctness review points, zero findings (resumed
   once via the agent-stall protocol). `settle-sport.test.ts` 36/36, full `ingestion-pipeline` suite 145/145,
   guardrails 17/17, workspace typecheck clean. Committed and pushed to `claude/galaxy-sports-edge-pdcswh`,
   tracked by the existing accounting PR #129. Was: a crash between the settlement-result write and the CLV
   write left a pick permanently ungraded once its game aged out of the scores feed's lookback — silently
   shrinking the public beat-close-rate sample one crash at a time. Protected zones: settlement, CLV, public
   claims — mandatory red-team (completed).
6. **DONE (2026-07-18, DEC-040 + DEC-041) — #89 — outage on `/api/promotions` masked as an honest empty
   response, plus 4 sibling surfaces.** Prerequisite #87 (DEC-040): new `outage-gate.ts` gives a DB-read
   failure on `/api/picks`/`/api/clv` its own distinct `reason:"backend_outage"` 503 body; `prod-probe.mjs`
   fails it by name; `docs/launch-runbook.md` documents all three dark-state discriminators. 6 of 7 non-test
   files byte-identical to current main, applied via clean `git apply`; `apps/web/app/picks/page.tsx` had
   drifted 266 lines (an independently-shipped paywall feature) and was manually reconciled. Ripple check
   found 4 other `bootstrapGateResponse` consumers all correctly scoped to deliberate gating only.
   #89 itself (DEC-041): extended the fix to `/api/calibration`, `/api/picks/daily-slate`, `/api/promotions`,
   and the game-room loader (`model-court` route + `/room/[gameId]` page). 4 of 8 non-test files byte-identical
   to the historical base, applied directly. `daily-slate/route.ts` manually reconciled around an unrelated,
   already-landed `recentRecord` honesty fix. The game-room trio — entitlements-adjacent, highest risk — had
   ALL drifted (this branch's own already-landed `GameRoomViewer` gating postdates #89's authoring); reconciled
   by hand with the ONLY change being `.catch(() => null)` removed from `db.game.findUnique`, every downstream
   entitlement-gating line confirmed byte-identical. A fifth target, the proof-of-record loader, was found
   ALREADY independently fixed on this branch via a different (resolved-flag, not throw-based) mechanism with
   its own existing test coverage — confirmed genuinely equivalent (arguably stronger) by both this session and
   the red-team, excluded from the port. Self-caught and corrected a drift-check methodology error mid-contract
   (initial comparisons were against `origin/main`; `pdcswh` is a superset branch — re-ran every check against
   `HEAD`). gse-red-team CONFIRMED clean across both passes (9+7 review points, two 8-point protected-zone
   checklists), zero findings total, each pass resumed via the agent-stall protocol. `apps/web` suite 636/8,616,
   guardrails 17/17, workspace typecheck clean. Committed and pushed to `claude/galaxy-sports-edge-pdcswh`,
   tracked by PR #129. **Closes Wave R0.6 entirely.** Protected zones: data reliability, public claims,
   entitlements (game-room trio).

**Method for each:** FREEZE CONTRACT (re-derive the exact fix against CURRENT main, not the stale PR diff —
main has advanced since these PRs were authored) → CODE (port the fix, re-verified against today's file
state) → TARGETED TEST → mandatory red-team (all six touch a protected zone) → FINAL VERIFY → ledgers → commit
→ push → bounded recovery PR (never merged to main by this agent). **All 6 items DONE**
(DEC-035/036/037/038/039/040/041). Wave R0.6 is fully drained.

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

**Classification pass DONE (2026-07-18, DEC-042); coding NOT yet performed.** Diffed
`codex/gse-frontier-recovery-2026-07-13` against `pdcswh` HEAD, scoped to the four named asset groups (a
whole-branch diff is 608 files / +9,634 / −56,079 and not a usable signal — codex is a much older snapshot
missing most of this session's own accumulated work):

- **Group A — `market-values` canonical types + `lib/market/*`. DONE (2026-07-18, DEC-044).** Ported
  `packages/types/src/market-values.ts` (289 lines) + test (canonical sport-aware American-odds/market-point
  normalization) and fixed the 4 already-existing `lib/market/*` files (`best-line.ts`, `game-market-read.ts`,
  `pick-death-clock.ts`, `load-line-shop-board.ts`) to use it — all applied via a verified-clean `git apply`.
  Fixes two real live bugs: (1) pick'em (0-value) spreads were silently dropped by the old `isNum`/`isPrice`
  helpers; (2) the death clock's MONEYLINE metric took a mathematically unsound median of raw American odds
  and has been disabled outright (returns `null`) rather than showing a meaningless number. `packages/types/
  src/index.ts` needed 3 manual (non-`git apply`) additive edits — a new `market-values.js` export alongside
  the pre-existing `sports-ir.js` export (the historical branch's diff would have deleted that line; a false
  collision caught before applying), an additive `drawPrice` field, and `AuditDeathClock`'s metric union
  narrowed to match. The one real live caller of the death clock (`api/picks/[id]/audit/route.ts`, PRO/ELITE-
  gated) got a 2-line change; tier-gating logic confirmed byte-identical otherwise. 3 new formatting utilities
  (`format-clv.ts`, `project-public-market.ts`, `format-committed-market.ts`) landed deliberately unwired
  (grep-verified zero live callers) — their consumer-surface wiring across 6 public pages is a new named
  follow-up, "R8 Group A2," not yet freeze-contracted. Independent red-team: zero findings across all 7 review
  points, including the highest-risk sport-name-matching check (all 7 seeded `Sport` rows match a
  normalization policy branch).
- **Group B — cockpit selected-game playback. DONE (2026-07-18, DEC-043).** Ported as 5 new files
  (`lib/cockpit/load-selected-game-playback.ts`, `app/cockpit/market-twin/[gameId]/page.tsx`,
  `components/cockpit/selected-game-playback.tsx`, its test, a manual-QA script) plus a 6-line additive
  link on the already-existing `market-twin/page.tsx`. The 2 reference screenshots from the historical
  branch were deliberately NOT ported (stale run-artifacts, not build/test dependencies). Zero drift on
  new files; gated behind the existing `requireCockpitAdmin()` call (first statement in the new page);
  hardcoded all-true `OPERATOR_VIEWER` confirmed unreachable outside that gate. Independent red-team:
  zero findings across all 8 review points. `cockpit-page-auth.test.ts`'s recursive source-scan
  live-verified to auto-extend to the new page (36→37 tests) with no additional test-writing.
- **Group C — fantasy public gate + `/fantasy/studio` admin-gate.** **COLLISION — OWNER_GATE (OG-008), NOT
  ported.** Traces to one founder-authored commit (`2724e78a`, Garrett Baxley, 2026-07-15) that is NOT an
  ancestor of `pdcswh` and would reintroduce a middleware-level `/fantasy/*` redirect gate of the same shape
  as one `pdcswh`'s own independent lineage deliberately removed (commit `c12decfc`) for a documented
  redirect-loop bug. Recorded as `COLLISION-8a`/`COLLISION-8b` in `FILE_SYMBOL_OWNERSHIP.csv`. Blocked on
  founder decision — see OG-008 in `DECISION_REGISTER.md`.
- **Noise (not recoverable):** `lib/studio/claude.ts` + its test — `pdcswh` is already ahead of `codex` here
  (has a prompt-caching optimization `codex` lacks). No separate "Brain/autopsy" files found under those
  names; the closest concept (`lossAutopsy`) is already covered by this session's own landed W004 work.

**Group A2 investigated, reclassified (2026-07-18, DEC-045).** A freeze-contract attempt on the "wire the 3
formatting utilities into 6 files" follow-up read the actual `git diff HEAD FETCH_HEAD` content (not just
line-count stats) and found it is not a clean additive port. `api/picks/route.ts` bundles the market-values
wiring with a reversion of this session's own already-shipped DEC-040/041 outage-gate fix and a swap of the
calibration-display mechanism — both protected-zone changes needing founder input. `load-proof-of-record.ts`
restructures the public CLV/proof JSON contract; `pick-ledger-row.tsx` (new) depends on that restructuring.
**`api/picks/route.ts` + `api/verify/route.ts` + their dependents are now OWNER_GATE (OG-009)** — see
`DECISION_REGISTER.md`. `verify-console.tsx` (depends on `api/verify/route.ts`'s shape) and
`preview/[sport]/[slug]/page.tsx` (keyword-scanned clean of calibration/CLV terms, but not yet fully read
line-by-line) remain plausible RECOVER_WHOLE candidates for a future, narrower, individually-scoped freeze
contract — not bundled with the owner-gated pieces.

**Next bounded step:** R11.5 (long-tail branch triage) is the next dependency-ready, non-owner-gated item. A
future session could also attempt a solo freeze contract for `api/verify/route.ts`'s separable
`relationMatchesPayload` proof-integrity idea (without the calibration bundling), or for
`preview/[sport]/[slug]/page.tsx` alone once fully read. Group C stays OWNER_GATE until the founder resolves
OG-008; Group A2's core files stay OWNER_GATE until the founder resolves OG-009.

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
method: (1) name-pattern clustering — branches matching `claude/magical-volta-*`; (2) recency triage — the 74
branches with a last-commit date on/after 2026-07-01 are the higher-signal subset to review first; (3) for
each, apply the SAME comparison-method tiers used in R0.5 before assigning any `SUPERSEDED`/`ARCHIVE_ONLY`/
`DELETE_AFTER_PROOF` disposition.

**First slice DONE (2026-07-18, DEC-046): the 22-branch `claude/magical-volta-*` cluster.** Real
`git merge-base --is-ancestor`/`git diff` evidence (not name-pattern inference) confirms: 22 daily branches
(2026-05-24 through 2026-06-14), non-linear/divergent (oldest is not an ancestor of newest), none an ancestor
of `pdcswh`, `pdcswh` overwhelmingly the content superset (2,655 files differ vs the newest branch, 270K
deletions vs 10K insertions going `pdcswh`→branch). Only 5 files exist in the newest branch (`4kilty`) with
no corresponding path on `pdcswh` at all: 2 already-superseded test files (equivalent coverage already exists
on `pdcswh` under different paths), 2 decorative landing-page visual components (seen, not evaluated further
this pass), and one run-log artifact. **One genuine asset recovered and landed**:
`apps/web/__tests__/pricing-drift-guard.test.ts` — a codebase-wide source-scan test (no hardcoded price
strings outside `pricing-phases.ts`) that `pdcswh` did not have. Running it against the live tree before
landing found a real violation (`lib/pricing/promo-codes.ts`'s `GALAXYFOUNDING` offer string hardcoded the
FOUNDING-phase annual prices as a literal) — fixed in the same pass by deriving the string from
`PRICING_PHASES` instead. Disposition for the full cluster: **ARCHIVE_ONLY** except the one recovered asset,
now landed; no deletion receipts written yet (deletion stays founder-gated, a separate explicit step).

**Process note:** the `gse-scout` agent dispatched for this slice stalled twice before reporting, and its
eventual report contained one factually-backwards claim (said `.claude/agents/`/`.claude/commands/` files
were unique to the branch when they were actually unique to `pdcswh` — the opposite). Every claim recorded
above was independently re-verified with direct `git` commands per the "reviewer-disagreement rule: reproduce
before ruling," not inherited from the scout's report.

**Second slice DONE (2026-07-18, DEC-047): the 43-branch recency subset (excl. `magical-volta-*`).** Method:
`merge-base --is-ancestor` (all 43 exit 1 — ancestry alone doesn't triage this set), `diff --name-status
--diff-filter=A` (novel-file detection), `diff --shortstat` (scale), direct content reads for anything novel.
- **20 branches ALREADY_ON_PDCSWH** (real evidence): the 13 `codex/api-v1-*` branches + 7 same-lineage
  branches under different names are ONE incremental lineage (3 `merge-base --is-ancestor` checks confirm),
  zero novel files vs `pdcswh`, and a spot-checked file is byte-identical — `pdcswh` already absorbed this
  entire "public API v1" build (the `api-v1-boundary.mjs` guardrail from this lineage runs in every
  `npm run guardrails` this session).
- **23 branches ALREADY_ON_PDCSWH** (evidence-based extrapolation, 6/23 directly sampled): all share exactly
  one novel file, a stale re-export shim (`lib/source-rights/source-rights-registry.ts` → `lib/scraping/
  source-rights-registry.ts`, the path `pdcswh` already consolidated to) — 6 sampled are byte-identical shims;
  the other 17 verified only via consistent `diff --shortstat` scale, not individually content-reviewed.
- **`claude/crypto-payments` — new OWNER_GATE candidate**: a full alternative Coinbase-Commerce payment rail
  + 2 DB migrations. Billing/payments protected zone, not evaluated further — a founder product decision, not
  an agent one.
- **`codex/galaxy-dynasty-v2-autonomous` + `claude/magical-feynman-j9180p` — ARCHIVE_ONLY, join a 3-way
  Dynasty cluster with #52** (`claude/gracious-albattani-f63wx1`): three independent, never-reconciled
  attempts at a "Galaxy Dynasty" product concept (world-graph, 3D city/game, progression backend). Needs one
  dedicated future reconciliation pass, not piecemeal picking here.
- **`claude/dfs-optimizer-edge` — DONE (2026-07-18, DEC-048).** Ported as 3 new files (`dfs-exact.ts`,
  `dfs-correlation.ts`, `dfs-optimizer-edge.ts` + tests) plus a 4-line strictly-additive change to `pdcswh`'s
  existing `dfs-optimizer.ts` (2 new `export` keywords, 2 new one-line exports — zero existing behavior
  changed). Found and fixed a real compatibility break during the port: the branch's `benchmark()` compared
  against a "restart-limited heuristic" `optimizeOne` that no longer exists on `pdcswh` (task #36 already
  replaced it with an exact DP solver) — reframed as a cross-check between two independently-implemented
  exact solvers, which must agree if both are correct, and empirically do (verified by red-team, not just
  claimed). Zero red-team findings across 10 review points. Zero live wiring — lands as available library
  capability, same shadow posture as several other items this campaign.
- **`claude/consensus-accuracy-engine` — DONE (2026-07-18, DEC-049).** Ported as 5 new files
  (`consensus-rankings.ts`, `expert-accuracy.ts` + 3 tests), zero changes to any existing file (the one
  dependency, `players.ts`, had drifted purely additively). Red-team found 2 confirmed findings, both fixed:
  an unused import failing `npm run lint` (not caught by `tsc`/`vitest`/`guardrails`), and a misleading doc
  comment on `ConsensusRow.avgRank` (claimed points-weighted, was actually a plain mean by design — fixed
  the doc, not the behavior, since the raw/unweighted transparency framing is legitimate). The lint-gap
  finding also surfaced 3 more pre-existing lint errors in already-committed DEC-046/DEC-048 work, fixed
  retroactively in the same pass — see DEC-049 for the full record.
- **8 branches DONE (2026-07-18, DEC-050) — the final slice of this subset.** Real
  `diff --name-status --diff-filter=A` evidence per branch, not name-pattern inference:
  - **5 ARCHIVE_ONLY, zero recoverable content**: `odds-freshness-diagnostics`, `night-shift`,
    `launch-review-fixes`, `humanize-polish`, `design-critique-zd94h2` — each has zero novel files vs
    `pdcswh` beyond the same two stale `handoff/codex/typecheck-prisma-baseline/*.log` artifacts seen on
    nearly every long-tail branch this wave.
  - **`freshness-badge` — ARCHIVE_ONLY.** One novel file, a dated overnight `MORNING-BRIEF.md` handoff note;
    read in full, nothing describes work absent from `pdcswh`.
  - **`intraday-odds-scheduler` — NEW OWNER_GATE candidate, not landed.** One novel file: a well-built
    GitHub Actions workflow adding 6 intraday odds-refresh crons hitting live production, fails closed if
    its repo secret is unset. Real production cost/cadence decision (CI/CD pipeline config, external API
    call volume) — recorded with full content in DEC-050 for founder review, same treatment as
    `crypto-payments` (DEC-047).
  - **`galaxy-sports-edge-audit-outqdi` — the one branch with real content.** Its `PUBLIC_FINDINGS_FOR_GROK.md`
    self-audit named 3 launch-blockers; independently re-verified against live `pdcswh`: 2 already fixed,
    1 (a Terms-vs-pricing refund-window contradiction, "at our discretion" vs. everywhere else's
    unconditional 3-day guarantee, plus a missing founding-rate grandfather clause) genuinely still live.
    Fixed — and a grep sweep for the underlying "3-day vs 7-day" number found the same stale claim live in
    3 more places (`tier-gate-panel.tsx`, dead-code `start-in-sixty.tsx`, and `trust-claims.ts`'s canonical
    approved-claims registry) — all fixed coherently in the same pass, plus the required
    `TERMS_LAST_UPDATED` bump. Red-team: 2 confirmed findings (both above), 1 plausible finding
    self-verified true by reading the actual Stripe price-persistence mechanism. Full detail in DEC-050.

**Process note (all slices):** a `gse-scout` agent dispatched for the first slice stalled twice and its
eventual report contained one factually-backwards claim, caught via direct re-verification. The second slice
was done via direct `git` commands throughout (no agent dispatch). The `dfs-optimizer-edge` and `consensus-
accuracy-engine` follow-ons each needed one red-team resume via the standing agent-stall protocol; the latter
also surfaced a genuine gap in this session's own verification loop (no full-workspace lint run), fixed
retroactively across 3 already-pushed files. The final 8-branch slice's red-team stalled twice with zero
output at all (a new failure mode vs. every earlier stall, which returned partial text) before succeeding on
a third resume under the same protocol.

**Accounting correction (2026-07-18, DEC-051):** the running "65/138" → "73/138" headline carried in this
section through the previous revision was arithmetically wrong — it inherited DEC-047's "43-branch" summary
number without adding back 13 more branches that same DEC-047 pass separately named and dispositioned with
real evidence in the same breath (`crypto-payments`, the 2-branch Dynasty cluster, `dfs-optimizer-edge`,
`consensus-accuracy-engine`), and DEC-047's "13 `codex/api-v1-*`" claim itself overcounts by 3 (`git branch
-r` confirms only 10 branches carry that exact prefix). Recomputed from first principles: the precise,
individually-evidenced total walking into the next slice was **58**, not 73.

**Next slice DONE (2026-07-18, DEC-051): 30 more branches from the 80-branch remaining pool, novel-file
counts 1-2 (cheapest tier first).**
- **17 ALREADY_ON_PDCSWH, individually confirmed** — the same stale `lib/source-rights/source-rights-
  registry.ts` re-export shim DEC-047 found in 6 sampled branches of a 23-branch cluster it could not fully
  verify. This slice individually confirms (byte-identical `md5sum`, consistent `--shortstat` signature) the
  other 17, closing that gap with real evidence.
- **9 more ARCHIVE_ONLY**, same stale typecheck-log-pair noise pattern.
- **New RECOVER_WHOLE candidate named, not ported**: 3 branches (`adoring-knuth-mhg8m4`, `friendly-fermat-
  fy99m2`, `codex/upgrade-galaxy-statking-to-nfl-intelligence-system`) independently carry a byte-identical
  `warp-nebula.tsx`/`warp-nebula-lazy.tsx` pair — a Three.js particle-nebula landing visual built to the same
  discipline as `pdcswh`'s already-live `ShaderAurora`/`ConsensusEngine3D` hero components. Needs its own
  freeze contract (which page, dedup check), not a rushed port.
- **Real finding, deliberately NOT landed**: `claude/fix-local-setup-PmnyX`'s otherwise-useful `scripts/
  local.sh` one-command dev bootstrap hardcodes a live-shaped `THE_ODDS_API_KEY` value in its generated
  `.env` template (every other credential in the same template is an explicit placeholder). A real
  `CLAUDE.md` rule-4 ("no secrets in code") violation — recorded for founder awareness, not silently
  sanitized-and-landed or silently dropped. Full detail in DEC-051.

Running total after this slice: **88 of 138** long-tail branches individually evidenced.

**Next slice DONE (2026-07-18, DEC-052): 26 more branches, novel-file counts 3-11.**
- **11 more ARCHIVE_ONLY** — a different noise signature this time: a self-describing
  `_overnight_quarantine/*` cluster (stale git locks + partial-install debris from a local Windows rebuild
  session, its own README says "safe to remove"), not the source-rights shim.
- **The `warp-nebula` RECOVER_WHOLE candidate cluster grows from 3 to 10 branches** — 7 more independently
  carry the identical asset, several bundled with additional distinct novel content of their own (an NFL
  coaches feature, a tracker-segmentation feature, presenter image assets, test suites). Ten independent
  convergences on the same unshipped asset makes it the strongest recovery candidate in the long tail.
- **New clean setup-script RECOVER_WHOLE candidate**: `claude/debug-previous-fix-g06Wz`'s cross-platform
  `setup.sh`/`.cmd`/`.ps1` trio — verified no hardcoded secret (copies from `.env.example` instead, unlike
  DEC-051's `local.sh` finding).
- **Several protected-zone / sensitive items named but deliberately NOT investigated beyond filenames**:
  an `NgsVisualizer.tsx` (NGS licensed-data display, a guardrail-policed area), a branch touching
  `settle-results.ts` (settlement protected zone), a `gse-score.ts`/`gse-method-spec.ts` pair (prediction-
  engine methodology protected zone), a corporate-structure/business-strategy doc cluster (sensitive
  founder-owned business content, not read), and a "presenter" image-asset branch (human-appearing stock
  images, licensing/product-direction unclear — flagged for founder awareness, images not opened). Full
  per-branch detail and rationale for each in DEC-052.

Running total after this slice: **114 of 138** long-tail branches individually evidenced.

**Correction (2026-07-18, DEC-053): `warp-nebula.tsx` is ARCHIVE_ONLY, not a recovery candidate.** DEC-051
and DEC-052 both mischaracterized this asset as "the strongest RECOVER_WHOLE candidate in the long tail."
While scoping a freeze contract for it, direct evidence on `pdcswh` itself reversed that call: `pdcswh`
already built this exact real-time WebGL warp-tunnel concept, then explicitly replaced it — the current
`cinematic-entrance.tsx`'s own header comment describes the warp-tunnel version verbatim as the thing it
was "rebuilt... for calm + clarity + zero lag" to fix ("stuttered on laptops and integrated GPUs," "looked
busy," "copy was unreadable"). That successor was itself superseded by a second generation, the currently-
live `montage-entrance.tsx` (an approved brand MP4 reveal). `pdcswh` even enforces a live regression test
(`homepage-doctrine-hero.test.ts:57`, `expect(page).not.toContain("CinematicEntrance")`) keeping the warp
tunnel's own direct successor OFF the homepage. The 10-branch convergence on `warp-nebula.tsx` is better
read as a common-ancestor artifact (many sessions forked before the problem was discovered and fixed), not
independent validation. Full evidence and process note in DEC-053. All other DEC-051/052 dispositions
(the NFL-coaches feature, tracker-segments feature, clean setup-script candidates, protected-zone flags,
etc.) are unaffected.

**FINAL SLICE DONE (2026-07-18, DEC-056) — Wave R11.5 CLOSED, 138/138.** A 24-agent parallel workflow
(default agent type, one branch per agent, after a first attempt failed 17/18 agents on a `gse-scout`
structured-output infrastructure issue and was retried) investigated the entire remaining 24-branch pool.
26 findings (one branch split into 3 concept clusters): 7 ARCHIVE_ONLY, 4 ALREADY_ON_PDCSWH, 5
RECOVER_WHOLE_CANDIDATE (newly named — Core-Web-Vitals/error-boundary bundle, per-route error/not-found
pages, History+Schedule Lab + fantasy tools, multi-market-ensemble + synthetic-fade, journal-retraction
tombstone), 8 NEEDS_DEDICATED_REVIEW, 2 SENSITIVE_FLAGGED_NOT_EVALUATED (two branches carrying a
"monetization-v3" corpus that includes founder succession/deceased-member protocols — flagged by filename
only, not read). Independently re-confirmed the exact `pdcswh` commit pair for `warp-nebula.tsx`'s build
(`94901a9f`) and removal (`cb55f1b3`), further corroborating DEC-053. Found and correctly declined to port a
genuine compliance violation (a `scores24.live` proprietary-prediction scraper with anti-bot evasion
tooling, on `claude/sports-prediction-platform-6F7Wa`). The Dynasty cluster grows to a 3rd/4th attempt
(`codex/galaxy-dynasty-studio-rescue-v2`, the most functionally real one found). Full detail in DEC-056.

**Wave R11.5 status: CLOSED.** All 138 long-tail branches individually evidenced. Open follow-on items
(none blocking): task #75 (pre-authorized `laughing-wozniak-gyryjx`/`happy-goodall-8lkxrb` dedicated port),
5 new RECOVER_WHOLE_CANDIDATEs, 8 NEEDS_DEDICATED_REVIEW branches, the Dynasty cluster's own pending
reconciliation pass, and the accumulated OWNER_GATE/founder-awareness items (`crypto-payments`,
`intraday-odds-scheduler`, `fix-local-setup-PmnyX`'s hardcoded key, the two succession-planning-bearing
branches, `determined-keller-dUcdG`'s legal-IP registers).

## Recommended order (refreshed)

```text
R0    Land #128 (founder-merge-only; agent work complete)
R0.5  DONE (2026-07-18) — Verify #76-96 PR-content gap: 5 SUPERSEDED, 16 RECOVER_WHOLE
R0.6  DONE (2026-07-18) — all 6 live-defect fixes recovered (#92 > #82 > #93 > #86 > #84 > #87+#89)
      — DEC-035/036/037/038/039/040/041, each independently red-teamed with zero confirmed findings
R1    DONE (2026-07-18) — converged with R0.6 item 3 (DEC-037); PR #123's own disposition stays OWNER_GATE
R2    #127 founder decision (agent work complete)
R3    Done
R4    Done (this pass)
R5    Founder decision on literal PR-splitting of #129 vs. existing per-workstream docs
R6    #121 rebase pending founder merge-order call
R7    Blocked on #127
R8    Groups A+B DONE (DEC-043/044). Group A2 core files OWNER_GATE (OG-009, DEC-045); Group C OWNER_GATE (OG-008)
R9    Fresh #122 drift proof + red-team
R10   Blocked on #127
R11   DONE (2026-07-18) — 12 deletion receipts issued in DELETION_RECEIPTS.md, re-verified ancestry;
      deletion itself stays founder-only
R11.5 CLOSED (2026-07-18, DEC-056) — 138/138 long-tail branches individually evidenced (magical-volta
      DEC-046, recency subset DEC-047, dfs-optimizer-edge DEC-048, consensus-accuracy-engine DEC-049,
      8-branch slice DEC-050 incl. live refund-window fix, 30-branch slice + accounting correction DEC-051,
      26-branch slice DEC-052, warp-nebula correction DEC-053, major pre-authorized finding DEC-054, final
      24-branch slice DEC-056 incl. 5 new RECOVER_WHOLE_CANDIDATEs + 1 declined compliance violation).
      Follow-on: task #75 (dedicated port) + 5 new candidates + 8 NEEDS_DEDICATED_REVIEW branches +
      accumulated OWNER_GATE items — none blocking further campaign work
      Task #76 progress (porting the 5 new RECOVER_WHOLE_CANDIDATEs): 3/5 DONE — Core Web Vitals RUM
      beacon + root error/loading boundary (DEC-057), per-route error boundaries + dynamic-segment
      not-found pages (DEC-058), journal-retraction HTTP 410 tombstone + revalidation (DEC-059). 4a/5
      DONE (DEC-060): History Lab + Schedule Lab ported from `claude/adoring-babbage-gq7v77`; Contest
      Simulator newly excluded (conflicts with the deliberately-sealed `/fantasy/contests` "Contest
      Bay" surface); Mock Draft/roster-import/FantasyCoach/Late-Swap from the same branch deferred to
      4b (real integration risk found in each, not a file-copy). 5/5 DONE (DEC-061, the LAST of the 5
      named candidates): multi-market-ensemble.ts + synthetic-fade.ts ported into
      packages/prediction-engine from `claude/pensive-brown-yql6ld` — dark, unwired, zero live callers,
      MODEL_VERSION unchanged, mandatory protected-zone red-team clean.
      Task #76 CLOSED (2026-07-18, DEC-064): candidate 4b (Mock Draft simulator) landed into
      `/fantasy/draft` as a second tab; a real entitlement-forwarding regression (canUseFantasyFull
      silently dropped) was fixed during the port, and red-team caught + fixed two more real defects
      before commit (a high-severity draft soft-lock against the 30-player illustrative pool, and a
      missing live-but-empty-pool honesty guard). All 5 of DEC-056's named RECOVER_WHOLE_CANDIDATEs are
      now fully closed. roster-import/FantasyCoach/Late-Swap remain named backlog, each needing its own
      freeze contract — Late-Swap specifically has a documented gotcha (DEC-064): the source branch's
      `late-swap-panel.tsx` calls `lateSwap(lineup, scratched, ...)`, but pdcswh's real `lateSwap`
      (`lib/fantasy/dfs-exact.ts`) treats its second argument as the LOCKED/KEPT set, not the scratched
      set — a verbatim port would invert the feature's behavior (locking the scratched players and
      re-optimizing everyone else). It also references a `LateSwapResult` object type
      (`swapped`/`changedSlots`/`salaryDelta`/`projDelta`) that doesn't exist on pdcswh's `lateSwap`,
      which returns a plain player array — needs a real adapter, not a drop-in port.
      Task #75 (2026-07-18): the `laughing-wozniak-gyryjx` model-promoter — named by DEC-054 as the
      single highest-value next port — was investigated and found broken at the code level: a
      hardcoded `computeClvMean() → 0.5` stub and a champion/challenger Brier comparison that reads the
      same field for both sides (so `brierImprovement` is mathematically always exactly 0, meaning the
      promoter can never actually promote a challenger). **Declined outright (DEC-062)** — never to be
      ported as-is, dark or wired; this corrects DEC-054's recommendation with code-level evidence.
      `oos-split.ts` (the promoter's one dependency) was independently verified honest, real, and
      deterministic on its own merits and shipped standalone, dark, zero live callers (DEC-063) — one
      real `tsc` type error was found and fixed during that port. Remaining under task #75: the 91-file
      DFS product tree and `happy-goodall-8lkxrb`'s 25-module `lib/gse` layer, both still unscoped and
      deliberately not attempted given their size — each needs its own dedicated freeze-contract cycle.
      Task #77 (2026-07-19, DEC-065, ledger-only per the freeze below): 2 of the remaining 6
      NEEDS_DEDICATED_REVIEW branches individually reviewed — `claude/keen-ptolemy-t38f1g` (MIXED: FDR/
      discovery core SUPERSEDED by main's own `trials-registry.ts`/`trend-discovery.ts`; CLV/closing-
      line research cluster OWNER_GATE, unverified against 108-156 commits of settlement drift;
      `packages/data-genesis` and the 122-file `packages/engine` "market physics" universe both
      ARCHIVE, zero presence on main, superseded in concept by shipped `epistemic-twin`/`promotion/`
      infra; also corrects DEC-056's false "unrelated by ancestry" claim — real merge-base at PR #53)
      and `safety/sports-wip-2026-06-04` (MIXED: `beat-the-model.tsx` OWNER_GATE — collides in name/
      route with the already-recovered, differently-designed `contest-scoring.ts` Phase-1 engine;
      `json-humanizer.tsx`, static `llms.txt`, and `api/live`+`api/ready`+observability trio all
      SUPERSEDED by better main-side equivalents; remaining ~500 files confirmed debris/protected-zone
      per DEC-056). Nothing ported — pure ledger entries, permitted post-freeze. 5 branches
      (`serene-hopper-rtjsfq`, `sports-prediction-platform-6F7Wa`, `awesome-sagan-LOyCa`,
      `codex/galaxy-dynasty-studio-rescue-v2`, `claude/determined-keller-dUcdG` — DEC-056 counted 8
      total across tasks #75/#77) stay unreviewed backlog per the campaign pivot.

## Campaign pivot: Launch Convergence (2026-07-18)

`claude/galaxy-sports-edge-pdcswh` / PR #129 is now FROZEN as an evidence and recovery-accounting
source, not a release vehicle — see `reports/reconciliation/PR129_FREEZE_RECEIPT.md` for the full
receipt and rationale. Task #75's remaining scope (DFS tree, `lib/gse`), Task #76's remaining
sub-features (roster-import, FantasyCoach, Late-Swap), and Task #77's 8 NEEDS_DEDICATED_REVIEW
branches all stay preserved here as backlog with their evidence and dependencies intact — they may
be pulled forward only if fresh production analysis proves one resolves a P0/P1 launch or revenue
blocker. All new work moves to Launch Convergence workstreams (LC-000 through LC-008,
`.claude/skills/gse-launch/SKILL.md`) on a fresh branch cut from `origin/main`, tracked under
`reports/launch/*`.
```
