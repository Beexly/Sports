# Launch command sheet — 2026-09-08 (measured 19:01 UTC)

Sources, named once and cited by short tag below. **[T]** the live `/api/ops/public-surface-truth`
read at `2026-09-08T19:01:53Z` (`generatedAt` from the surface itself; saved as
`truth-2026-09-08T1901Z.json`). **[A]** `AGENTS.md` at `origin/main` `8cc069585`, by line number.
**[L]** `docs/ops/AGENT_LEDGER.md`: the founder rows are byte-identical on `origin/main` and on
`origin/claude/sports-launch-round2-fixes-hk7kv9` (diff exit 0); rows C-197, C-232, C-242..C-259 exist
only on that branch (tip `1514c8aff` when fetched; the orchestrator's 19:01 UTC read of PR #720 named head
`0639189d2`, so the branch moved after that read). **[FL]** `docs/ops/LAUNCH_FINISH_LINE_2026-09-05.md`
on that branch, sections 3e, 4 and 7. **[O]** `docs/ops/OPERATOR.md` sections 4, 5 and 6. **[C]** code
on `origin/main`, by path and line. **[PR]** PR #720 facts as relayed by the orchestrator at 19:01 UTC
(open, not draft, 78 commits, 140 files, `mergeable_state` "unstable", owned by a running Opus session);
not re-fetched from GitHub in this session.

What changed since the 2026-09-06 16:40 UTC note in [A] line 33 ("PROVEN IS NOT CLOSE", eligibility RED,
ECE 0.0524): eligibility now reads **GREEN with `consecutiveGreen` 10 of `streakRequired` 3**, n 475, Brier
0.1898, ECE 0.0466, Murphy REL 0.0050 / RES 0.0253, basis `market_anchored_v2` [T
`calibrationEligibility`]. Settlement is HEALTHY at 0 of 2694 overdue, stale unstarted picks 0, and the
ladder's only blocker to PROVEN is "Calibration not published" [T `settlement`, `stalePendingPicks`,
`revenueLadder.blockersToNext`]. PROVEN is therefore one founder flag away
(`calibrationPublish.operatorHint`: "Set CALIBRATION_AUTO_PUBLISH=true (one-time) or
CALIBRATION_PUBLISHED=true to publish"). What has NOT changed: the pooled figure still flatters its strata,
exactly as [A] lines 58-69 warned. The deployed version **v5.2.7 measures ECE 0.0947 on 262 rows**, about
twice the 0.05 floor; **NFL is n 28 with ECE 0.267**, too thin to steer by ([A] lines 70-78); the **≥80
confidence tail wins 52.11% while claiming 86.69%** (n 213, verdict `overconfident`) [T `confidenceTail`];
the pooled ECE's 95% bootstrap interval is 0.0345-0.0859, so the floor sits inside it [T
`calibrationEligibility.eceCi95`]; and **C-247 found 25 of 169 MLB FINAL rows whose stored score contradicts
the feed they were ingested from, 54 settled picks on them, 16 of the 475 calibration rows graded on a
contradicted score and 8 on a flipped one** [L C-247]. Every number on this sheet is an input to that repair,
not an output of it, until `npm run ops:repair-scores` has run.

## 0. Security first — R-1

| Row | Text (summarized) | Owner | Status | Source |
|---|---|---|---|---|
| R-1 | Rotate the ~25 Hermes `.env` credentials exposed in a session transcript (Fireworks, Together, DeepSeek, OpenRouter x2, Vercel first); delete the browser agent's own mistyped 401 gateway key. Evidence: "APPROVED (fable) 2026-08-19; these are the real exposure, not the phantom sk-ant key". | browser | OPEN | [L] |

This has been OPEN and approved since 2026-08-19 and is still OPEN on both ledgers read today. It is a live
exposure, it precedes every flip below, and no agent can do it (law 3: never search for credentials; the
`.env*` files are Read-denied). Do it on each vendor dashboard, then set the new values in Vercel Production
and redeploy. No key value is written anywhere, including this sheet. Verification is vendor-side (old keys
return 401) and the truth surface staying HEALTHY after the redeploy [FL 3e script E].

## 1. Founder flips, in order

Each flip is FOUNDER-ONLY. The variable and value are the ones the truth surface, the code, or the ledger
names; an agent lists them and never sets them (law 3). Verification is the public surface, no secret:

```
curl -sS https://www.galaxysportsedge.com/api/ops/public-surface-truth | jq '<path>'
```

That command is [FL 3e] script E with the path swapped in. `npm run launch:ready` [O §6] is the one-shot
read-only version of section 4 below and exits 1 on any FAIL.

### (a) Merge PR #720 once CI is green

- **Action**: merge #720 to `main`; merge-to-main auto-deploys (CLAUDE.md, Tech Stack). [PR]: open, not
  draft, `mergeable_state` "unstable" at 19:01 UTC, owned by a running Opus session, carries C-242..C-259
  including the C-253 market-anchored slate and the C-248/C-249/C-254/C-256/C-258 score verify and repair
  tools [L].
- **Precondition**: CI green on the PR (not observed here; the 19:01 read said "unstable").
- **Verify**: `.deployment.sha` changes from `8cc069585871d8a316714ce93bf1022a31b892eb` [T] to the merge
  SHA; `.settlement.health` stays `HEALTHY` after the first settle cycle.
- **Rollback**: revert the merge commit on `main` (auto-deploys the revert).

### (b) `CALIBRATION_AUTO_PUBLISH=true` (or `CALIBRATION_PUBLISHED=true`)

- **Variable / value**: `CALIBRATION_AUTO_PUBLISH=true` (one-time), or `CALIBRATION_PUBLISHED=true`, in
  Vercel Production, then redeploy. Names verbatim from [T `calibrationPublish.operatorHint`] and
  [T `founderNextSteps[1]`]; read by `apps/web/lib/ops/calibration-publish-policy.ts:54-55` [C].
- **What the two do differently** [C `calibration-publish-policy.ts:4-11, 56-60`]: `publishedEffective`
  is `CALIBRATION_PUBLISHED === true` OR (`CALIBRATION_AUTO_PUBLISH === true` AND status GREEN AND streak
  met). `CALIBRATION_AUTO_UNPUBLISH` defaults to the AUTO_PUBLISH value, so the AUTO path unpublishes itself
  on the next RED run; the PUBLISHED path stays published through a RED run unless
  `CALIBRATION_AUTO_UNPUBLISH=true` is also set. The AUTO path is the self-correcting one.
- **Precondition the surface must show now**: `.calibrationEligibility.status` `"GREEN"`,
  `.calibrationEligibility.consecutiveGreen` ≥ `.calibrationEligibility.streakRequired` (10 ≥ 3 today) [T].
- **Precondition from the finish line** [FL 3e]: C-107's display must match the published claim. C-107 is
  CLAIMED (claude) [L]; its display half landed `f06be6b31` [FL 3e row 5]; the proposal doc still reads
  `status: PROPOSED` [C `docs/calibration-proposals/2026-09-05-market-anchored-display-probability-v5.2.8.md:3`],
  and the IMPLEMENTED flip plus MODEL_VERSION v5.2.8 wait for the first clean NFL Sunday, 2026-09-13, by prior
  decision ([A] "UPDATED 2026-09-06 05:00 UTC"). Publishing the curve before 2026-09-13 means the
  `/calibration` page is published while the card copy is still on the pre-v5.2.8 label; [A] records that
  wording was changed to "The calibration we measure ourselves on is ..." for exactly this window.
- **The caveat, restated in two lines**: the pooled ECE 0.0466 is carried by MLB (n 373, ECE 0.0451); the
  deployed v5.2.7 stratum reads 0.0947 on 262 rows and NFL reads 0.267 on 28 [T `bySport`, `byModelVersion`].
  16 of the 475 rows are graded on a score C-247 shows the feed contradicts; run the repair (f) and re-read
  ECE before treating the pooled number as settled [L C-247].
- **Verify after redeploy**: `.calibrationPublish.publishedEffective` `true`, `.calibrationPublish.source`
  `"auto"` or `"env"`, `.gates.calibrationPublished` `true` (the route sets it from the publish policy AND
  GREEN, `route.ts:490-492` [C]), `.revenueLadder.blockersToNext` `[]`,
  `.pricingPhaseReadiness.eligible` `true`.
- **Rollback**: remove the variable and redeploy; `publishedEffective` returns to `false` and every
  downstream gate follows (`canExposePerformanceStats = publishedEffective && GREEN`, policy line 11 [C]).

### (c) `PERFORMANCE_STATS_ENABLED=true`

- **Variable / value**: `PERFORMANCE_STATS_ENABLED=true` in Vercel Production, then redeploy. Named in
  [FL 3e] "Public flips are two Vercel variables" and [L F-36]; read by
  `packages/prediction-engine/src/platform-config.ts:168` into `readiness.ts:137` [C]. Listed under
  "Do not flip without founder YES" as PERFORMANCE_STATS [O §4].
- **Precondition**: (b) verified (`.calibrationPublish.publishedEffective` `true`), and
  `.gates.calibrationPublished` `true`. Today both read `false` [T `gates`].
- **Open objection you must close first**: ledger row C-197 (claude, OPEN, branch only) ends "DO NOT FLIP
  PERFORMANCE_STATS_ENABLED OR PRICING_PHASE=PROVEN: a published track record computed from fabricated lines
  is the worst claim this product could make" [L C-197; evidence `docs/ops/LINE_INTEGRITY_FINDING_2026-09-08.md`].
  Its scope: SPREAD 310 of 719 and TOTAL 369 of 599 published settled picks carry a line off the half-point
  grid; MONEYLINE 34 of 883 (3.9%, "a separate smaller anomaly"). The calibration sample behind (b) is
  MONEYLINE-only (`.calibrationEligibility.byMarket` has one row, MONEYLINE n 475 [T]), so (b) is the less
  exposed flip; (c) opens CLV and hit-rate surfaces across all markets (`.clvPosture.gradedSampleSize` 1384,
  blocker `GATE_OFF_PERFORMANCE_STATS` [T]). C-197 is a founder decision (section 2); this sheet does not
  overrule it.
- **Verify**: `.gates.envPerformanceStatsEnabled` `true`, `.gates.canExposePerformanceStats` `true`,
  `.clvPosture.canExposeClv` `true`, `.clvPosture.blockers` `[]`.
- **Rollback**: remove the variable and redeploy; the readiness gate defaults to `false`
  (`platform-config.ts:168` parses with default false [C]).

### (d) `PRICING_PHASE=PROVEN`

- **Variable / value**: `PRICING_PHASE=PROVEN` in Vercel Production, then redeploy [FL 3e; L F-36]. Read by
  `apps/web/lib/pricing/pricing-phases.ts:149-151` [C]; an unrecognized value falls back to FOUNDING, never
  up. PROVEN rates in that file: Fantasy 6.99/59, Pro 19.99/149, Elite 29.99/229 (Founding today 4.99/49,
  14.99/99, 24.99/179); founding members are grandfathered for life (CLAUDE.md, Subscription Tiers).
- **Precondition**: `.pricingPhaseReadiness.eligible` `true` and `.revenueLadder.blockersToNext` `[]`
  (today `false` and `["Calibration not published"]` [T]); (c) live so the pricing page's proof claim has a
  public curve behind it; C-197 resolved (same objection as (c)).
- **Verify**: `.revenueLadder.currentStep` `"PROVEN"`, `.pricingPhaseReadiness.currentPhaseId` `"PROVEN"`,
  the pricing page shows PROVEN rates [FL 3e row 6].
- **Rollback**: remove the variable and redeploy; code falls back to FOUNDING.

### (e) `PREDEXON_API_KEY` + `PREDEXON_INGEST=true` — only after WP-1 merges (F-34, F-35)

- **Variable / value**: set `PREDEXON_API_KEY` (the dashboard key the founder already holds) and
  `PREDEXON_INGEST=true` in Vercel Production once WP-27/C-104 lands; then optionally blank
  `THE_ODDS_API_KEY` [L F-34]. Read at `packages/data-ingestion/src/predexon-client.ts` [C].
- **Precondition**: the WP-1 PR (section 3, `claude/launch-c104-free-two-book-board`) merged and deployed;
  F-35 resolved (the app registry `espn-public-api` entry is facts-only with `commercial_display_allowed`
  false while the PR #680 package entry `galaxy-espn-inline` is use-with-caution with commercialUse true;
  reconcile with an ESPN license or a written posture before the keyless path is the only book-priced
  source) [L F-35].
- **Verify**: `.freeSpine.oddsPath.paidSinglePath` `false` and `.freeSpine.oddsPath.requireSpend` `0`
  (today `true` and 7: "Odds free dual-path ABSENT: 7 sport cell(s) single-cleared via the-odds-api
  (mustSpend)" [T]); `.oddsInserting.withinRefreshSla` stays `true`.
- **Rollback**: `PREDEXON_INGEST` unset (default OFF per [A] "UPDATED 2026-09-05" bullet 3) and redeploy.
- **Credits while you wait**: `.oddsInserting.dualPath.credits` reads remaining 13306, used 6694,
  `dailyBudget` 600, `paceOk` `false`, `projectedExhaustionAt` 2026-10-02, basis `linear_24h_unthrottled`
  [T]. The plan's next invoice is Sep 22 [FL 3e script A], so the projection lands after the reset; the
  governor (C-109, DONE `3359e072a` [A]) is what holds it there. Not a flip; a number to watch.

### (f) C-247 repair: dry-run, then execute — after (a)

- **Command**: `npm run ops:repair-scores` (dry-run by default: prints every field it would change and every
  settled pick whose result would flip, writes nothing), then `npm run ops:repair-scores -- --execute`
  (one transaction per game; refuses a game whole when any settled pick on it cannot be re-graded; never
  re-stamps `settledAt`) [L C-254, C-256, C-258]. Detector: `npm run ops:verify-scores` exits 1 on any
  source disagreement or self-contradiction [L C-248, C-249]. Script names verified in the branch
  `package.json:140,153` [C]. Both are on #720 and NOT on `main` until (a) merges.
- **Precondition**: (a) merged; `DATABASE_URL` in the founder's shell (the tools are DATABASE_URL-guarded;
  law 7 bars agents from running them). "NOT RUN against production" is the row's own status [L C-254].
- **Verify**: `npm run ops:verify-scores` exits 0; then re-read `.calibrationEligibility.ece` and
  `.calibrationEligibility.status` after the next `calibration-metrics` run (six-hourly, [FL 3e row 4]).
  The truth surface carries no contradictions count today (grep of [T] for `contradict`: none) — the exit
  code is the signal until C-98-style posture booleans exist for it.
- **Rollback**: none needed for the dry run; the execute path is per-game atomic by design [L C-254].

### (g) F-22: one live checkout smoke, then refund

- Founder decision on 2026-09-06 was SKIP (script D not run, no charge) [FL 3e row 7]; row F-22 remains
  OPEN [L]. Restated as a decision: either run it (Pro monthly on `/pricing`, confirm the plan activates
  within a minute, refund and cancel in Stripe, record the date in OPERATOR_TASKS [FL 3e script D]) or
  close F-22 as "skipped by decision". `.billingMoney.moneyPathReady` `true`, 6 of 6 price slots,
  `checkoutCreatable` `true` [T] is what the code can prove; the end-to-end charge is what it cannot.

### (h) Stripe dashboard: F-18, F-19, F-20 and `stripe-webhook-audit`

- [FL 3e row 9] records script C as DONE 2026-09-06: Privacy URL set, `STRIPE_TERMS_CONSENT_ENABLED`
  already `true` in Production, the `/api/webhooks/stripe` endpoint listens to ten events, five Payment
  Links deactivated. Rows F-18, F-19, F-20 still read OPEN on both ledgers [L]. Founder action: confirm on
  the dashboard, then close the three rows (or reopen with what is missing).
- Remaining item verbatim from [T `founderNextSteps[4]`]: "Stripe webhooks: confirm only
  galaxysportsedge.com is enabled (foreign disabled leftovers ok to delete)." The billing hint says the same
  [T `billingMoney.operatorHint`]. Ordering rule for the consent flag: Terms URL first, then the flag, then
  redeploy [O §5].

### (i) F-29: alerting — a decision, not a nag

- Founder skipped `HEALTH_ALERT_WEBHOOK_URL` and `SENTRY_DSN` on 2026-09-06 (no Slack, no Sentry)
  [FL 3e row 8 and script B]. Variables read at `apps/web/lib/observability/capture-route-error.ts` and
  `sentry.ts` [C]. Today the health-alert route logs BLIND or UNDELIVERED to console only and no surface
  shows whether a CRITICAL band pages anyone [L F-29]. The truth surface has no alerting booleans yet
  (WP-3 / C-98 adds them). Decision to record: set the two variables in Vercel Production, or write "no
  paging by decision" on F-29 and close it. Either is a valid state; the undecided state is the one section
  4 cannot verify.

### (j) F-30: scheduler primary

- Three schedulers drive `settle-picks` about six times an hour (Vercel cron, `external-cron.yml`, the
  autonomy executor) [L F-30]. Prior decision: Vercel cron is the primary ([A] "Decisions already taken").
  The workflow file is frozen for agents (law 2), so trimming `external-cron.yml`, enabling the four
  env-gated Postgres suites in `ci.yml` and pointing the brand-safety step at `npm run test:brand-safety`
  are founder edits. C-99 (durable lease + recency guard) is the code half, shipping in WP-3 (section 3).
  `.schedulerLiveness.status` `healthy`, last success 1 minute old [T].

### (k) F-31: PR triage

- Thirty open PRs on the 2026-09-05 read: nine merged or superseded to close, five clean to merge after CI,
  #693 to split by original PR (eleven money and access-control fixes never reached main), four
  mega-branches to close with the salvage list, #670 is a MODEL_VERSION bump in disguise, #437 held until
  after Week 1 [L F-31; FL §4 item 21]. NOT VERIFIED here: GitHub PR metadata was not read this session.
  Also F-33: close `hermes/settlement-token-fix` (conflicts with `6880f18`) [L F-33].

## 2. Founder decisions with no command (policy)

| Row | Decision | What each option costs | Source |
|---|---|---|---|
| C-91 | Stripe `unpaid` handling: grace period versus immediate revoke (WP-13..19 money-path hardening; "Stripe unpaid never access-granting"). | Grace: a lapsed card keeps access for the window. Revoke: a card retry that would have succeeded loses a paying member. Both are code changes on the entitlement gate; agent-shippable once chosen. | [L C-91] |
| C-143 | Which line a settled pick is graded on. `selectGradingLine()` uses `clvLockLine` when present, the card renders `line`; they differ on 432 of 588 settled TOTAL picks, outcome-flipping on 34. | Grade on `clvLockLine` (publish-time line, arguably honest) means the DISPLAY must change; grade on `line` means re-grading history. Showing one and settling on another is not defensible either way. | [L C-143] |
| C-197 | Published picks carry model-predicted margins as lines (SPREAD 310/719, TOTAL 369/599 off-grid; MLB "runline" stored from -13.50 to +17.75). Founder call because fixing the write path may implicate frozen MODEL_VERSION. | Snap to a real quoted line = model version bump, founder-sequenced. Leave = rule 1 exposure on every card and the row's explicit "DO NOT FLIP PERFORMANCE_STATS_ENABLED OR PRICING_PHASE=PROVEN". | [L C-197] |
| C-125 / C-119 | MLB run-line guard. 355 of 725 published MLB spread picks (49%) carry `abs(line)` not in {1.5, 2.5, 3.5}; 8 of 12 books in the odds table carry impossible MLB spreads (11112 of 426019 rows). | Refuse invalid run lines: removes 49% of MLB spread board, no version bump. Snap to a quoted line: better product, MODEL_VERSION bump. Football and MLB must not share a rule (a mean of -3/-3.5/-3 is legitimate consensus). | [L C-125, C-119] |
| C-114 | The 87 picks and 5 games corrupted before the C-113 guard: revert to PENDING and re-grade after the real game, VOID with an RCA code through the outbox, or unpublish. Game rows with future `commenceTime` must have status and scores cleared whichever is chosen. | Re-grade preserves the record and makes it honest; VOID removes it from the sample; unpublish deletes it. Writes `result`, which the outbox owns: founder-run tool, agents cannot execute (law 7). | [L C-114] |
| C-232 | The graded-projections provider has two registration entry points (`instrumentation.ts` startup path bypasses `ensureLiveProjections`). Consequence 3 (permanent stuck state) fixed in #720; consequences 1-2 (double multi-MB load per cold start, stale-on-arrival) need a single-owner decision. | Retiring the startup path changes app-wide startup behaviour on the eve of NFL Week 1; leaving it is wasteful, not wrong. | [L C-232] |
| F-2 | `REFUND_REVOKES_ACCESS` default. Decided: stays OFF; flip to true after ONE observed production refund revokes correctly in logs. Read in `apps/web/app/api/webhooks/stripe/route.ts` [C]. | ON before observation risks revoking on a partial refund; OFF means a refunded member keeps access until the flip. | [L F-2] |
| F-5 | Read the Edge Roadmap and pick the QUICK experiments; enabler E1 (clean-room prod export) needs founder hands. | Every experiment is preregistered against CLV 52.4% with kill criteria; nothing runs without the export. | [L F-5] |
| F-8 | `LINE_ARCHIVE_ENABLED=true` in Vercel (phase-tagged OPEN/INTERIM/CLOSE snapshots; not about data loss, the odds table is append-only). Read at `packages/ingestion-pipeline/src/line-archive.ts` [C]. | ON: closes identified at capture time. OFF: closes reconstructed after the fact, the #1 contamination class in the round-3 failure table. Not an emergency. | [L F-8] |
| F-9 | Approve or amend the `LedgerChainEntry` Prisma model for the Glass Ledger hash chain. | Blocks B-6a/b/c only. Schema and migrations are frozen for agents (law 2). | [L F-9] |
| F-17 | Run `npm run ops:merge-games` over the duplicate Game rows (MLB 268 fixtures with 2-3 rows, NCAAF 102, MLS 75, NFL 34 in the 21d window) after WP-3 stops new duplicates. | Data operation, owner-run; C-249 shows 18 MLB + 1 MLS duplicate pairs hold disagreeing scores, so the merge and (f) interact — run (f) first. | [L F-17, C-249; FL §4 item 6] |
| F-21 | ESPN Power Index rights. Decided by delegation: gated fail-closed, `ESPN_POWERINDEX_LICENSED` unset = off [O §5]. Remaining action is the license itself. | License: NFL/NCAAF signal picks resume with the source. No license: they stay off. | [L F-21] |
| F-23 | X handle `@GalaxySportsAI` is stamped into `twitter:site`/creator and the footer; rename or register a handle matching the domain, then update `lib/brand.ts` SOCIAL.x. | Keeping it contradicts rule 8 positioning on every page's metadata. | [L F-23] |
| F-24 | First-visit media ~10.5 MB plus an 8s full-screen video interstitial (4.16 MB) before any content; decide montage default off for organic visits and a hero still under 250 KB. | Keep: bounce risk on mobile. Change: agent-shippable once decided. | [L F-24] |
| F-25 | Every `/fantasy/*` URL 307s anonymous visitors to the 21+ gate; keep it on contests and props only, or accept the SEO cost and drop the fantasy sitemap claims. Prior decision: the gate stays ([A]). | Restate or confirm; the sitemap claim is the cost of confirming. | [L F-25] |
| F-27 | Contest Bay creates its two tables with runtime DDL outside Prisma migrations; land a migration (owner-only) before `CONTESTS_PUBLIC` ever opens. `.gates.contestsPublic` `false` today [T]. | Nothing until contests open; blocks that opening. | [L F-27] |
| F-28 | Home hero has no path to `/picks` or `/pricing`; `/board` and `/picks` compete as today surfaces; two proof pages carry calibration in the name. Prior decision: `/picks` is the product surface ([A]). Decide the primary CTA. | Undecided IA is an FE-quality cost WP-4 cannot close alone. | [L F-28] |
| F-32 | One secret (`CRON_SECRET`) authorizes both cron mutations and read-only operator surfaces; add `OPS_READ_SECRET` in Vercel once `lib/ops/ops-auth.ts` accepts it. NOT yet read anywhere in code on `main` (grep: no non-doc hit) [C]. | Until the code lands there is nothing to set; the decision is whether C-102's companion ships first. | [L F-32] |
| F-33 | Close `hermes/settlement-token-fix` (containment minimum 3 lets "chi" match "kansascitychiefs"; conflicts with `6880f18`). | Leaving it open invites a wrong merge. | [L F-33] |

Not in the list above but decided and recorded so nobody re-opens them: v5.2.8 sequenced after the first
clean NFL Sunday; stale picks are unpublished by the zero-sit lane; TheRundown is a bridge, not the product
path; Vercel cron is primary ([A] "Decisions already taken").

## 3. What agents are shipping right now

Dispatched by the orchestrator 2026-09-08 about 19:10 UTC; each is a separate cloud session on its own
branch off `main`, draft PR when green. NOT OBSERVED from this session: the dispatch note is the source,
and none of these branches was fetched or read here.

| WP | Rows | Branch | What it closes on the surface |
|---|---|---|---|
| WP-1 | C-104 free two-book board (re-land PR #680 core; Kalshi via PredExon as book 2) | `claude/launch-c104-free-two-book-board` | `.freeSpine.oddsPath.paidSinglePath` → `false` after (e) |
| WP-2 | NFL Week 1 coverage root cause + C-95 (line-archive CLOSE, nflverse probe) + C-118 (soccer moneyline guard) verification | `claude/launch-nfl-week1-coverage` | `.marketCoverage.degraded` NFL MONEYLINE / TOTAL rows (6 games, 0 picks each today [T]) |
| WP-3 | Ops hardening C-96 (Odds API remaining-request header on the surface), C-97 (durable rate limit, real autonomy loaders), C-98 (alerting posture booleans), C-99 (settle-picks lease) | `claude/launch-ops-hardening` | section 4 alerting row becomes readable |
| WP-4 | Frontend launch quality C-93 (FE-02..18) + C-224 (confidence rendered as a probability on four public surfaces) | `claude/launch-frontend-quality` | copy that survives `npm run lint:brand` |
| WP-5 | Money path C-181 (`/api/board/passes` ignores the paid `includeNoBetDetail` option) + `api-no-store` ratchet + C-101 (test-suite gaps) | `claude/launch-money-path-gating` | `.billingMoney.moneyPathReady` stays `true` with the gate bodies no-store |
| WP-6 | Settlement forensics C-120 (no record of the score a pick was graded against), C-143 evidence, C-115 evidence | `claude/launch-settlement-evidence` | evidence for section 2 rows C-143 / C-114; no policy change |
| WP-7 | Identical-row-set bake-off on the truth surface (`provenPath.scoreBakeoff` rows have different n per score: 1823 / 1132 / 1132 / 1039 [T]) | `claude/launch-identical-row-bakeoff` | `bestScore` compared on one row set |

Also: in `gse-competitive-intel` on `claude/kind-gauss-kb2qsd` (local HEAD `7f3ac9a`), the `data/extracted`
knowledge base is untracked in the working tree and `prompts/HANDOFF-2026-09-08-WORK-PACKAGES.md` is NOT
READABLE from this session (not present at that commit or on disk). And C-107's IMPLEMENTED flip plus
MODEL_VERSION v5.2.8 wait for the first clean NFL Sunday, 2026-09-13, by prior decision ([A], [FL 3e row 5]).

## 4. Definition of "fully operational" — what the truth surface can verify

Values now are from [T] at 19:01:53 UTC. "Required" is the value the surface's own hints and gates name.

| Signal | JSON path | Value now | Value required | Who closes it |
|---|---|---|---|---|
| Deployed SHA is main | `.deployment.sha` | `9046ff22a…` = `origin/main` (Hermes P0 PR #726 merged, 00:26 UTC) | equals `main` tip after (a) | founder merge, auto-deploy |
| Settlement | `.settlement.health` / `.overduePending` | `HEALTHY` / 0 of 2694 | `HEALTHY` / 0 | holds by itself; C-106 lane |
| Stale unstarted picks | `.stalePendingPicks.count` | 0 | 0 | zero-sit lane every settle cycle |
| Odds inserting | `.oddsInserting.withinRefreshSla` | `true` (9 min old, 240 min SLA) | `true` | refresh-odds cron |
| Credit pace | `.oddsInserting.dualPath.credits.paceOk` | `false` (13306 left, exhaustion 2026-10-02, reset Sep 22) | `true`, or exhaustion after reset | C-109 governor; (e) removes the dependence |
| Free dual-path odds | `.freeSpine.oddsPath.paidSinglePath` | `true` (7 cells mustSpend) | `false` | WP-1 then (e) F-34, F-35 |
| Market coverage | `.marketCoverage.degraded` | 2 rows at 00:35 UTC: NFL ML, NFL TOTAL (NCAAF now 9 games, ML 3 / SPR 6 / TOT 5) | `[]` for in-season sports | WP-2; NFL TOTAL needs a live odds feed per the hint |
| Calibration published | `.calibrationPublish.publishedEffective` | `true`, source `auto` (variable set 00:26 UTC) | `true` | founder (b) |
| Record gate | `.gates.calibrationPublished` | `true` (00:35 UTC) | `true` | follows (b) + GREEN |
| Performance env gate | `.gates.envPerformanceStatsEnabled` | `false` | `true` | founder (c), after C-197 |
| Ladder step | `.revenueLadder.currentStep` | `PROVEN` (00:35 UTC; next blocker toward ESTABLISHED: CLV 22.8% < 52.4%); `PRICING_PHASE` still unset, so customer-facing rates stay FOUNDING | `PROVEN` | founder (d) |
| Pricing readiness | `.pricingPhaseReadiness.eligible` | `true`, unmet `[]` (00:35 UTC) | `true` | follows (b) |
| Money path | `.billingMoney.moneyPathReady` | `true` (6/6 slots) | `true` | holds; (g) proves the charge |
| Eligibility streak | `.calibrationEligibility.consecutiveGreen` | 34 of 3, ECE 0.0466 (00:35 UTC) | ≥ 3, ECE ≤ 0.05 after (f) re-read | six-hourly cron; never a floor change |
| Deployed-version stratum | `.calibrationEligibility.byModelVersion[v5.2.7].ece` | 0.0947 (n 262) | no floor exists per stratum; report it beside the pooled number | more settled rows; v5.2.8 after 2026-09-13 |
| Confidence tail | `.confidenceTail.verdict` | `overconfident` (52.11% won vs 86.69% claimed, n 213) | not `overconfident` | needs a calibration proposal, founder-gated; see note |
| Map / adjustments | `.mapBakeoff.applyOff`, `.bestByBrier` | `true`, `"raw"` | unchanged | no map is justified today; see note |
| C-247 contradictions | not on the surface | NOT READABLE | `npm run ops:verify-scores` exit 0 | founder (f) after (a) |
| Alerting posture | not on the surface | NOT READABLE | booleans `true`, or F-29 recorded as decided | WP-3 (C-98) + founder (i) |
| Scheduler | `.schedulerLiveness.status` | `healthy` (1 min) | `healthy` | holds; F-30 trims duplicates |

Note on the tail and the maps: `.rpcpConformalBridge.productFlags.calibrationAdjustmentsEnabled` reads `true`
while `.bayesianRd.adjustmentsEnabled` reads `false`, `.mapBakeoff.applyOff` is `true`, and the best map by
Brier and by log-loss is `"raw"` (temperature 1.039, CV recommendation `identity`) [T]. So no map is
currently justified, and shrinking the ≥80 tail is a calibration-proposal decision for the founder, not a
threshold an agent moves ([A] lines 78-79; law 9). The tail is worst on SPREAD (44.44% won vs 88.04%
claimed, n 99) and TOTAL (25.64% vs 83.85%, n 39) and least bad on MONEYLINE (76% vs 86.37%, n 75) [T
`confidenceTail.byMarket`], which is the same market split C-197 describes.


### 4a. Executed 2026-09-09 00:26 UTC by the browser agent, verified on the truth surface at 00:35 UTC

`STATS_PUBLIC=true`, `CALIBRATION_AUTO_PUBLISH=true`, `LINE_ARCHIVE_ENABLED=true`, Production only,
one redeploy (sha `9046ff22a`). Verified: `.gates.statsPublic` true, STATKING `live_public`,
`.calibrationPublish.publishedEffective` true (`auto`), `.gates.calibrationPublished` true,
`.revenueLadder.currentStep` PROVEN, `.pricingPhaseReadiness.eligible` true, settlement HEALTHY.
Finding: an anonymous `GET /stats` returns 307 to `/age-verify?next=%2Fstats`, so StatKing sits
behind the 21+ attestation and search engines do not see it. Decision recorded for Agent 3 (gates):
the stats facts routes leave the age-gate matcher, `/stats/ask` and `/fantasy/*` keep it.

## 5. What was deliberately NOT started, and why

- A queue/stream/microservice re-architecture: the platform runs on Vercel cron routes with no queue library
  (CLAUDE.md, Tech Stack), the scheduler reads `healthy` [T], and F-30's problem is too many schedulers, not
  too few.
- A model zoo (gradient-boosted trees, deep or sequence networks): the engine is deterministic statistical
  modeling under a frozen MODEL_VERSION (CLAUDE.md rule 8; `scripts/guardrails/model-freeze.mjs`); the
  measured gap is data integrity (C-197, C-247, C-125), which no new model fixes.
- A conversational "co-pilot" feature on the picks: it would describe the product in exactly the terms rule 8
  bans, and the Claude API is content generation only, never the source of a pick (CLAUDE.md).
- Blue-green deploy automation: merge-to-main auto-deploys with a fail-closed migrate gate already; rollback
  is a revert (section 1a).
- A 9/9 launch announcement: the 2026-09-08 handoff calls POSTPONE on three findings (as relayed by the
  orchestrator; the document itself was NOT READABLE here). This sheet is the path to reversing that call
  with evidence — (a), (f), then (b)-(d) with C-197 decided — not around it.
- Any change to prices, floors, deltas, pause groups or MODEL_VERSION: floors stay n 100 / ECE 0.05 / Brier
  0.22 / Murphy REL 0.05 [T `floors`]; δ stays 0.12 and the durable pause set stays the founder's 2026-08-10
  YES [T `selectiveRuntime`]; law 9 and [A] lines 78-79. PRICING_PHASE=PROVEN in (d) is the coded ladder step,
  not a price edit.
