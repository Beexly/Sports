# Launch command surface, 2026-09-03

Shared state for every agent working toward the Friday 2026-09-05 kickoff.
Written by the architect session from commands it actually ran. Every line below
traces to output that was observed. Where something was not checked, it says
NOT VERIFIED.

Read this before claiming a task. Do not re-derive what is already recorded here.

## 1. Verified state

| Fact | Value | How it was checked |
|---|---|---|
| `main` | `0db5ef808` (merge of PR #685) | `git rev-parse origin/main` after `git fetch --prune` |
| CI on `main` | SUCCESS | GitHub Actions run 33799645214, `ci.yml`, push event |
| typecheck | exit 0 | `npm run typecheck` on `0db5ef808` |
| lint | exit 0 | `npm run lint` on `0db5ef808` |
| guardrails | 26/26 PASS | `npm run guardrails` on `0db5ef808` |
| Production | LIVE on `0db5ef808` | Vercel `dpl_GoYrLkrJ2vTC28dYaXbXhEni9PbJ`, target=production, state=READY |
| Remote branches | 789 total, 640 diverging from `main` | `git ls-remote --heads` plus per-branch `git diff --shortstat origin/main...<ref>` |
| Ledger | 135 rows, guard exit 0 | `node scripts/ops/check-agent-ledger.mjs` |

Correction recorded honestly: an earlier read of this session reported `main` at
`bb0e7df` (2026-08-23). That was a stale ref read before `git fetch`. PR #685 is
merged and deployed. The stale reading was wrong.

## 2. The finding that drives the current run

Fifty open pull requests from the 2026-08-25 audit wave were never merged, and none
of their content is present on `main`. Each one was dry-run merged against
`0db5ef808` with `git merge-tree --write-tree`:

- 43 merge CLEAN
- 7 CONFLICT
- 0 already absorbed into `main`

They are named, reviewed launch fixes: access-control leaks, money-path defects, and
numbers rendered to users without a query behind them. Landing this queue is the
highest-value work available before kickoff.

A clean merge is TEXTUAL only. It is not evidence of correctness. Every batch is gated
by the full verify block before it is kept. A red batch is a real finding.

## 3. Landing queue

Merge with `git merge --no-ff origin/<branch>`. After each batch run:

```
npm run typecheck && npm run lint && npm run guardrails && npm run lint:brand
(cd apps/web && npx vitest run)
```

Green: commit the batch and continue. Red: fix inside the batch, or after two failed
attempts abort that one merge, record BLOCKED with the exact error, and continue.
Never weaken a test or a guard to reach green.

| Batch | PR | Merges into main | Files | What it fixes |
|---|---|---|---|---|
| B1 access control | #597 | CLEAN | 45 | BLOCKER-paid-board-bypass+free-grace-exploit |
| B1 access control | #606 | CLEAN | 5 | ungated-market-signal+B2B-PRO-leak |
| B1 access control | #621 | CLEAN | 6 | gate-nflverse-dfs-serverside |
| B1 access control | #615 | CLEAN | 13 | gate-fantasy-live-pool |
| B1 access control | #651 | CLEAN | 2 | gate-player-production-lab |
| B2 security | #652 | CLEAN | 6 | open-redirect-callbackUrl |
| B2 security | #629 | CLEAN | 14 | picks-cache-stampede+cost-amplifiers |
| B3 money path | #653 | CLEAN | 3 | stripe-invoice-payment-failed |
| B3 money path | #612 | CLEAN | 7 | checkout-price-validation+grace |
| B3 money path | #656 | CLEAN | 18 | atomic-PAST_DUE-entitlement |
| B3 money path | #668 | CLEAN | 7 | revenue-fence-fail-open |
| B3 money path | #664 | CLEAN | 13 | money-killswitch-alert-swallowed |
| B3 money path | #625 | CLEAN | 4 | money-path-claims+stripe-price-gate |
| B4 settlement | #642 | CLEAN | 7 | PUSH-reachable+line-drift |
| B4 settlement | #619 | CLEAN | 5 | exclude-pushes-from-winrates |
| B4 settlement | #618 | CLEAN | 9 | odds-staleness+FAILED-outbox |
| B4 settlement | #600 | CLEAN | 2 | line-archive-silent-failure |
| B4 settlement | #608 | CLEAN | 2 | season-replace-atomic |
| B4 settlement | #610 | CLEAN | 7 | silent-write-failures |
| B5 honesty | #636 | CLEAN | 17 | fabricated-stat-to-paying-reader |
| B5 honesty | #628 | CLEAN | 6 | local-clock-as-bookmaker-ts |
| B5 honesty | #616 | CLEAN | 2 | odds-probability-space+NaN-gates |
| B5 honesty | #614 | CLEAN | 4 | devig-before-averaging |
| B5 honesty | #639 | CLEAN | 3 | calibration-39-pinning-tests |
| B5 honesty | #644 | CLEAN | 18 | one-day-boundary |
| B5 honesty | #646 | CLEAN | 8 | tier-claims-vs-code |
| B5 honesty | #650 | CLEAN | 8 | one-grade-ladder |
| B6 frontend | #640 | CLEAN | 14 | blank-page-hang+nav+contrast |
| B6 frontend | #648 | CLEAN | 9 | false-subscription-active+NaN |
| B6 frontend | #624 | CLEAN | 11 | viewer-clock-kickoff |
| B6 frontend | #662 | CLEAN | 6 | 44px-touch-targets |
| B6 frontend | #658 | CLEAN | 14 | a11y-conversion-path |
| B7 remainder | #607 | CLEAN | 4 | seo-canonical-sitemap |
| B7 remainder | #645 | CLEAN | 7 | disclosure-surface |
| B7 remainder | #661 | CLEAN | 5 | operator-false-assertions |
| B7 remainder | #637 | CLEAN | 5 | content-grounding |
| B7 remainder | #638 | CLEAN | 20 | utc-sweep+copy-leaks |
| B7 remainder | #665 | CLEAN | 9 | adapter-fail-closed |
| B7 remainder | #666 | CLEAN | 3 | money-authz-coverage |
| B7 remainder | #604 | CLEAN | 3 | vacuous-assertions |
| B7 remainder | #603 | CLEAN | 2 | watchlist-N+1 |
| B7 remainder | #605 | CLEAN | 2 | outbox-batch-query |
| B7 remainder | #632 | CLEAN | 10 | killswitch-defers-not-deletes |

### Conflicted queue (resolve after the clean queue is green)

| PR | Files | What it fixes |
|---|---|---|
| #630 | 26 | rate-limiters-clientIp+waitlist-enum |
| #631 | 8 | health-leak+sleeper-fanout |
| #634 | 7 | cron-route-auth-coverage |
| #647 | 3 | bind-picks-to-right-game |
| #620 | 5 | fabricated-edge-index-loss-rate |
| #667 | 18 | test-blind-spots |
| #643 | 3 | cve-gate-silent-pass |

`#597` carries two BLOCKER findings (paid-board bypass, free-grace exploit) and
touches 45 files. Merge it alone, gate it, then continue the batch.

## 4. Preview-deployment verification

Every pull request has a Vercel preview deployment; its URL is on the PR as a
deployment status. Use it to PROVE an access-control fix instead of reasoning about it:

```
curl -sS -o /dev/null -w '%{http_code}\n' "$PREVIEW/api/picks"
curl -sS "$PREVIEW/api/picks" | jq '.[0] | keys'
curl -sS "$PREVIEW/api/picks?limit=99999" | jq 'length'
curl -sS "$PREVIEW/api/health?strict=1" | jq .
```

Rules. Preview deployments only. Read-only GETs only, never a write endpoint and
never a cron route, on any environment. If a preview is behind deployment protection,
fall back to a local `npm run dev`. A pasted curl transcript is evidence; a paragraph
of reasoning is not.

## 5. Efficiency laws for agents in this repo

- The ledger is APPEND-ONLY. To change a row's status, append a superseding row.
  A prior session spent eight tool calls on repeated string surgery against one
  markdown table row. If a text edit fails twice, append instead. Never write a third
  regex against a table row.
- Decision budget per task: 3 file reads, 2 command runs, one conclusion, then act.
- Precedent first on any test repair: `git grep -l "<symbol>" -- "*.test.ts"` and copy
  the mock pattern that already exists.
- Two attempts per task, then revert and record BLOCKED with the exact error text.
- Do not re-read a file already read this session. After each commit, forget that task.

## 6. Not verified by this session

These are open questions, recorded so nobody reports them as settled:

- Whether the 43 clean merges are SEMANTICALLY compatible with each other. Only the
  textual merge was tested. The batch gates exist to answer this.
- The full `apps/web` suite was NOT run against any merged combination.
- Behaviour of the live production surfaces was not exercised beyond confirming the
  deployment state through the Vercel API.
- The 7 conflicted pull requests were not resolved or analysed line by line.
- 640 branches diverge from `main`. Only the 50 audit-wave pull requests were triaged.
  The remainder are unaccounted for and are NOT claimed to be safe to delete.

## 7. Verified gap sweep, 2026-09-03

An eight-lane read-only sweep (money, settlement, honesty, cron, abuse, UX, SEO,
coverage). Every finding was then handed to a separate agent instructed to REFUTE
it, defaulting to refuted when the claim could not be reproduced from the code.
24 survived, 2 were refuted and are not listed.

Areas swept with nothing found are recorded per lane at the end; that is evidence too.

Each row is claimable. Follow the ledger rules: claim before starting, evidence on close.

| # | Severity | Lane | Finding | Location |
|---|---|---|---|---|
| G1 | BLOCKER | settlement | Free-lane ESPN date targeting uses UTC calendar day, but ESPN buckets evening games under the prior day — verified live, misses the scoreboard that actually has the final | `apps/web/lib/data-sources/settlement-score-dates.ts`:13-20 |
| G2 | BLOCKER | honesty | The flagship /performance win-rate numbers are gated only by the raw env flag, not the eligibility/publish system the rest of the honesty stack requires — including the panel on the same page | `apps/web/app/performance/page.tsx`:128-131, 189-217 |
| G3 | BLOCKER | coverage | runFreePathSettlement — the hourly settle-picks cron's core orchestrator — is never actually executed by any test | `apps/web/lib/data-sources/free-settlement-runner.ts`:157 |
| G4 | HIGH | money | Proof-of-record surfaces expose confidence/edgeScore for bootstrap-era picks — the one invariant every sibling picks route enforces is missing here | `apps/web/app/api/proof/receipts/route.ts`:80-106 |
| G5 | HIGH | settlement | A temporarily SUSPENDED game (not cancelled — will resume and finish) is graded identically to postponed/cancelled and permanently VOIDed before it actually completes | `apps/web/lib/data-sources/free-settlement.ts`:480-490 |
| G6 | HIGH | settlement | The hourly live free-settlement query caps at 1500 rows with NO orderBy, so its own 'overdue-first' priority sort can only reorder an arbitrary DB sample — under a real backlog the truly oldest picks may never even be fetched | `apps/web/lib/data-sources/free-settlement-runner.ts`:211-253 |
| G7 | HIGH | honesty | /api/performance never sets Cache-Control: no-store — every response (200 data, 503 gate, 429 rate-limit) is a bare NextResponse.json, violating the repo's own no-stale-data rule | `apps/web/app/api/performance/route.ts`:10-12, 129-140 |
| G8 | HIGH | honesty | The confidence-tail monitor documents that the model's current ≥80-confidence band is anti-predictive (~40% win rate while claiming ~86%), but this verdict is never rendered on any public page — only behind CRON_SECRET or the authenticated cockpit | `apps/web/lib/calibration/confidence-tail.ts`:1-16, 129-145 |
| G9 | HIGH | authz | Five routes derive the rate-limit key from the client-controlled leftmost X-Forwarded-For entry, which the codebase's own clientIp() helper documents as a known bypass — and one gates a real-cost external fetch, another gates a reward-claim endpoint | `apps/web/app/api/intelligence/roster-advice/route.ts`:14-16 |
| G10 | HIGH | ux | Tailwind `ink-400/500/600` text tokens are a light-surface color ramp misapplied as body text on the app's dark surfaces, rendering near-invisible on launch-critical pages | `apps/web/tailwind.config.ts`:160-178 (ramp def); apps/web/app/not-found.tsx:67; apps/web/app/launch/page.tsx:76,114; apps/web/components/trust-ledger/proof-of-record.tsx:46,54,90,94,110,125,129 |
| G11 | HIGH | seo | Podcast RSS feed link/guid bypass SITE_URL — hardcoded host, invisible to the canonical-host guard test | `apps/web/lib/podcast/episodes.ts`:23 |
| G12 | HIGH | seo | Public Edge Index embed widget (copy-paste iframe snippet third parties place on their own sites) hardcodes the host instead of SITE_URL | `apps/web/lib/embed/edge-index.ts`:23 |
| G13 | MEDIUM | money | Several pick-data JSON routes skip the project's own jsonNoStore/no-store convention, leaving tier-dependent responses without an explicit Cache-Control | `apps/web/app/api/board/state/route.ts`:15-18,37 |
| G14 | MEDIUM | settlement | SCORE_MISMATCH_CROSS_PATH and the stale-backfill's 'unresolved' list are correctly detected but never alerted anywhere — a real post-FINAL score correction (or a pick stuck past the 14-day grace) is invisible outside raw cron JSON | `apps/web/lib/data-sources/free-score-persist.ts`:233-241 |
| G15 | MEDIUM | settlement | The live hourly settlement pass grades ALL PENDING picks regardless of isPublished; only the stale-backfill lane restricts to isPublished:true | `apps/web/lib/data-sources/free-settlement-runner.ts`:211-215 |
| G16 | MEDIUM | cron | /api/ops/daily-truth is the only one of 26 cron/ops routes with no explicit maxDuration, and it does 7+ sequential DB-backed loader calls | `apps/web/app/api/ops/daily-truth/route.ts`:29-30 |
| G17 | MEDIUM | cron | daily-truth's header comment still claims it is 'NOT wired into vercel.json crons' though it has been the scheduled 22nd cron since the same commit that added this text | `apps/web/app/api/ops/daily-truth/route.ts`:9-11 |
| G18 | MEDIUM | cron | daily-truth hand-rolls its own Bearer check instead of the shared cronAuthError helper, so it silently drops out of CRON_SECRET rotation support that every other cron gets | `apps/web/app/api/ops/daily-truth/route.ts`:37-49 |
| G19 | MEDIUM | seo | Pricing page Product/Offer JSON-LD ships a bare relative URL instead of an absolute SITE_URL-derived one | `apps/web/app/pricing/page.tsx`:251 |
| G20 | MEDIUM | seo | Admin Studio content-draft generator defaults to the bare apex (not www, not SITE_URL) for links baked into social/newsletter drafts | `apps/web/lib/studio/load.ts`:100 |
| G21 | MEDIUM (OWNER-ONLY) | seo | Site-wide Twitter/X card metadata attributes every single page to the handle @GalaxySportsAI | `apps/web/app/layout.tsx`:90 |
| G22 | LOW | money | Stale comment in api-entitlement.ts asserts picks are free for all tiers, contradicting the live getEntitlements() implementation | `apps/web/lib/api-entitlement.ts`:118-122 |
| G23 | LOW | authz | /api/dfs/salaries is the one fantasy-gated route using the non-rate-limited requireFantasyApi() while its own comment names the exact denial-of-wallet risk its sibling route (tools/lineup) is protected against | `apps/web/app/api/dfs/salaries/route.ts`:10-16 |
| G24 | LOW | seo | Admin-only bot-outbox preview endpoint falls back to the apex host (same pattern as Studio, but auth-gated and non-public) | `apps/web/app/api/cockpit/bot-outbox/preview/route.ts`:356 |

### The three blockers, in full

**G1. Free-lane ESPN date targeting uses UTC calendar day, but ESPN buckets evening games under the prior day — verified live, misses the scoreboard that actually has the final**

- Location: `apps/web/lib/data-sources/settlement-score-dates.ts`:13-20
- Why it matters: uniqueScoreboardDates()/toEspnDateKey() is the ONLY thing that decides which ESPN scoreboard pages get requested — used by settle-backfill.ts:234, free-score-persist.ts:175, and free-settlement-runner.ts:281, all with no adjacent-day buffer at the fetch step (only the ±1-2 day tolerance applied AFTER fetch, to games already retrieved). Any game whose real US start time pushes its UTC timestamp into the next calendar day — every MLB West Coast night game, every NFL Sunday/Monday night 8:20pm ET kickoff (also UTC+1 day in EDT) — has its true ESPN scoreboard page skipped. When a settle cycle's pending set is dominated by one night's games (a normal hourly-cron scenario, e.g. a Friday-night ...
- Proposed fix: In uniqueScoreboardDates() (or at each call site), always also request `toEspnDateKey(commenceTime - 24h)` alongside the UTC-derived key for every distinct day (cheap: ESPN scoreboard fetches are already batched/compacted via compactEspnDateRanges), or derive the key from the US-Eastern calendar date of commenceTime instead of raw UTC. Add a test asserting a >8pm ET commence time resolves to the ESPN date one day before its UTC calendar day.
- Verify with: `cd apps/web && npx vitest run __tests__/settlement-score-dates.test.ts`

**G2. The flagship /performance win-rate numbers are gated only by the raw env flag, not the eligibility/publish system the rest of the honesty stack requires — including the panel on the same page**

- Location: `apps/web/app/performance/page.tsx`:128-131, 189-217
- Why it matters: Once an operator sets PERFORMANCE_STATS_ENABLED=true (the documented activation switch for the PROVEN pricing milestone), /performance and /api/performance publish real win/loss/win-rate numbers forever, regardless of what happens to calibration eligibility afterward. If settlement health degrades or ECE/MCE breaches and the durable eligibility system flips to RED (which is designed to auto-unpublish and does darken the CalibrationPanel, /clv, and /api/ops/public-surface-truth), /performance keeps showing the old win rate as a large 5xl headline stat while the CalibrationPanel two inches below it on the exact same page renders 'Building calibration history... Public metrics stay dark ...
- Proposed fix: Gate both `apps/web/app/performance/page.tsx` and `apps/web/app/api/performance/route.ts` on `resolveEffectivePerformanceGate()` (or route their win-rate computation through `evaluatePublicPerformancePolicy()` as the module's own header comment already claims they do), so the auto-unpublish/eligibility system actually protects these two surfaces the same way it protects CalibrationPanel, /clv, and /api/ops/public-surface-truth.
- Verify with: `(none given)`

**G3. runFreePathSettlement — the hourly settle-picks cron's core orchestrator — is never actually executed by any test**

- Location: `apps/web/lib/data-sources/free-settlement-runner.ts`:157
- Why it matters: This is the function the production hourly cron (/api/cron/settle-picks) actually calls to grade every free-path pick, decide overdue-first load order (STP), aggregate the RCA report, and drive the CLV/snapshot/team-game-log repair drains. A regression inside its 570+ lines of orchestration (wrong overdue-sort comparator, wrong sport-loop error isolation, mis-wired clvRepair/snapshotRepair/teamGameLogRepair aggregation into the returned result, a broken picksSettled/picksHeld count) would ship to production Friday and silently mis-grade or under-grade live picks — the exact honesty-surface failure this product exists to avoid — while every existing 'test' referencing this file would ...
- Proposed fix: Add a real (not source-text) unit test for runFreePathSettlement itself: call it with a fully mocked @sports/db (same delegate-mocking pattern already used in settle-sport.test.ts) and mocked lower-level drain/grade helpers (drainPendingClvGrades, drainPendingSnapshotOutcomes, drainPendingTeamGameLogs, buildTrustedFinals, settlePendingPicks), then assert on the REAL, unmocked return value: result.clvRepair/result.snapshotRepair/result.teamGameLogRepair equal exactly what the mocked drain ...
- Verify with: `npx vitest run apps/web/__tests__/free-settle-response-contract.test.ts apps/web/__tests__/settle-picks-free-first.test.ts (from apps/web) — both currently pass without ever invoking the real function`

### Areas swept clean

- **money** (11): apps/web/lib/entitlements.ts and apps/web/lib/api-entitlement.ts: getUserEntitlements/gateApi/requirePremiumApi/requirePremiumApiRateLimited/requireFantasyApi(+RateLimited) all read correctly — 401 unauthenticated, 403 under-tier, fail-closed to FREE on any lookup error, PAST_DUE_GRACE_DAYS anchored to pastDueSince so retries can't extend the grace window, DEV_FAKE_ADMIN hard-gated to non- ...
- **settlement** (5): packages/prediction-engine/src/settlement.ts calculatePickResult: pushes/ties handled correctly — SPREAD homeCoverMargin===0 -> PUSH (line 106), TOTAL total===line -> PUSH (line 114), MONEYLINE non-soccer tie -> PUSH / soccer tie -> LOSS (lines 95-97). Overtime is a non-issue: only final home/away scores are compared, never period-by-period, so OT periods already baked into the final score ...
- **honesty** (8): apps/web/app/edge-index/page.tsx and apps/web/app/embed/edge-index/[gameId]/page.tsx: no confidence leak (loadGameRoom called with canSeeFactorBreakdown/canSeeLineMovement: false), honest-empty path is exercised on missing game / bootstrap (lib/embed/edge-index.ts), formatEdgeIndex renders '—' for null rather than 0 — clean.; apps/web/app/clv/page.tsx: three cleanly separated states ...
- **cron** (5): vercel.json drift: `diff /home/user/Sports/vercel.json /home/user/Sports/apps/web/vercel.json` returns byte-identical (no drift). Both declare exactly 22 cron schedules (confirmed via grep -c '"path"').; refresh-odds, board-fill, settle-picks, deliver-settlement-alerts, reconcile-entitlements, repair-checkout-attempts, run-formal-receipt, drain-ai-telemetry-recovery, prune-rate-limits, jarvis- ...
- **authz** (10): Every cron route under apps/web/app/api/cron/* plus /api/ops/daily-truth and /api/ops/ranking-pause-apply calls cronAuthError() (Bearer CRON_SECRET / CRON_SECRET_PREVIOUS, bearer_only by default) before doing any work; none opt into the spoofable 'dual' x-vercel-cron mode (grep confirmed zero matches for mode:"dual" in any route file), so no cron is anonymously triggerable.; Every admin/* and ...
- **ux** (19): Board (/board, apps/web/app/board/page.tsx): server component, force-dynamic, distinguishes DB_UNREACHABLE outage vs STALE_DATA_SUPPRESSED vs DEMO_DATA_SUPPRESSED vs honest-empty with visually and textually distinct banners; no raw error ever surfaces; loading.tsx present.; Picks (/picks, apps/web/app/picks/page.tsx): entitlement-filtered fields (confidence, edgeScore, factorBreakdown, ...
- **seo** (8): apps/web/app/robots.ts and apps/web/app/sitemap.ts — both correctly import and derive every URL from SITE_URL; robots.txt disallows /admin, /cockpit, /api/, /auth/, /dashboard, /brief, /go/, and /stats (gated) while leaving complete public products crawlable; sitemap conditionally includes /stats and /fantasy/contests behind isStatsPublic()/isContestsPublic() gates.; apps/web/app/layout.tsx ...
- **coverage** (9): Money path core (apps/web/lib/entitlements.ts, apps/web/lib/api-entitlement.ts): exhaustive behavioral tests — 401/403/fail-closed, tier predicates (including the FANTASY-vs-PRO/ELITE regression guard), rate-limit-after-gate ordering, PAST_DUE grace window, DEV_FAKE_ADMIN prod-hardgate.; Stripe webhook route (apps/web/app/api/webhooks/stripe/route.ts, tested by apps/web/__tests__/stripe- ...

### Status

- G1 (ESPN Eastern date key) is FIXED in PR #692, with tripwire tests proven to fail
  against the previous code. The sweep's verifier reproduced it independently on a
  different game (MLB SF at ARI, event 401816714) from the one used in that PR.
- Every other row is OPEN and unclaimed.

