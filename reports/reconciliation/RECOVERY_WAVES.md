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

**Next slice:** remaining long-tail branches beyond the 73 now triaged (of 138 total long-tail entries per
`BRANCH_PR_LEDGER.json`). `intraday-odds-scheduler` stays open as a standing OWNER_GATE candidate, not a
blocker.

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
R11   Deletion receipts for the 12 proven-ancestor branches
R11.5 73/138 long-tail triaged (magical-volta DEC-046, recency subset DEC-047, dfs-optimizer-edge DEC-048,
      consensus-accuracy-engine DEC-049, final 8-branch slice DEC-050 incl. live refund-window fix);
      intraday-odds-scheduler open OWNER_GATE candidate; next: remaining long-tail beyond 73
```
