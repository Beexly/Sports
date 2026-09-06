# Launch finish line, 2026-09-05

One document, three audiences: the founder (decisions and console actions only you can
take), the next agent sessions (dispatchable work packages with acceptance tests), and
anyone auditing what was claimed. Every number here traces to a command run on
2026-09-05 or to a commit on `claude/sports-prediction-launch-rtiexc`. Nothing is
estimated that could be measured.

NFL kickoff is in five days. Production is live at the `main` tip with public picks on
and live Stripe keys. This is not a launch-the-site plan; the site is launched. It is the
plan to make what is live correct, honest and complete, in the order that protects
customers and the record.

## 1. Production state at the start of the session (all observed)

Source: `https://www.galaxysportsedge.com/api/ops/public-surface-truth` and
`/api/health?strict=1` at 15:36 UTC; Vercel runtime error groups (48h); read-only SQL
against the production database (SELECT only; precedent ledger C-62).

| Signal | Value | Consequence |
|---|---|---|
| Deployment | `1a3f00d` = `origin/main` tip; CI green on that head | Production is current |
| Gates | publicPicks on, forceNoBetIfStale on, performanceStats off, calibrationPublished off | Correct posture per GATE_OPENING_RUNBOOK |
| Settlement | CRITICAL: 36 of 2,344 commenced picks PENDING past 6h | `/api/health?strict=1` returns 503; PROVEN ladder blocked |
| Overdue composition (SQL) | MLS 22 (Aug 22-30), MLB 13 (Sep 1-5), NFL preseason 1; all `SCHEDULED`, no score, zero settlement observations | The grader never saw them |
| Game identity (SQL, 21d window) | Same fixture stored under 3 externalId namespaces (`odds-api` hash, `espn:mlb:`, `espn:baseball_mlb:`); MLB 268 fixtures with 2-3 rows, NCAAF 102, MLS 75, NFL 34; zero merged | Triple picks per game; triple overdue counts; CLV and calibration samples double count |
| Moneyline picks by writer (SQL, 30d) | MLB: 450 signal-slate rows (no book) vs 19 book-priced; NCAAF: 46 signal rows written 15:54-16:05 today over the book slate | The public moneyline board was almost entirely single-source estimates |
| Market probability coverage (SQL) | 28 of 738 settled moneyline picks still carried a market fair (3.8%) | Calibration was being measured on the wrong number |
| Calibration eligibility | RED: Brier 0.2466 (floor 0.22), ECE 0.0573 (floor 0.05), n 1,166 | Not fixable by any map; fixable by measuring the right probability (section 3) |
| Confidence tail | >= 80 wins 43.7% while claiming 86.2% (n 167), INVERTED; byMarket empty | Confidence must never be shown as a probability |
| Paid settlement supplement | The Odds API returns HTTP 402 (payment circuit open) on every settle cycle since 2026-09-03; 401 INVALID_KEY on NFL until 2026-09-04 | Free path is the only grader; the key/plan needs the founder |
| Cron timeouts (Vercel) | 583 "Task timed out after 120 seconds" across board-fill, refresh-odds, generate-signal-slate, free-spine-health, autonomy-cycle, calibration-metrics since 2026-08-10 | Work cut off mid-cycle every cycle |
| OOM kills (Vercel) | 7 since 2026-06-17 on board-fill, refresh-player-stats, ingest-player-stats, /mlb, /observatory | Low frequency, real |
| Auth | 1 Google OAuth callback error today ("iss missing") | Watch; not reproduced |
| Stale published picks | 20 PENDING picks on unstarted NFL/NCAAF games last refreshed May-June | Will be graded at kickoff on months-old lines unless adjudicated |
| Market coverage next 72h | NCAAF 252 games / 145 picks; MLB 41 games, 0 ML, 0 TOTAL; MLS 51 games, 0 ML, 0 TOTAL | MLB/MLS ML paused by founder YES; TOTAL absence unexplained (work package WP-7) |
| Money path | Stripe secret, webhook secret, 6/6 price slots | Ready; one live checkout smoke still owed (founder) |

## 2. What this branch fixes (verified locally: typecheck 0, lint 0, guardrails 26/26, targeted suites green)

Root causes, each proven before it was fixed (live ESPN probes, real-board replays, SQL):

| Commit | Fix | Proof |
|---|---|---|
| `2294db2` | ESPN scoreboard `limit=1000` made ESPN fall back to a 25-event page; now `ESPN_SCOREBOARD_LIMIT = 300` in all three ESPN clients, plus `groups=80,81` (FBS+FCS) and `groups=50` (D-I hoops) | Live: `dates=20250906&limit=1000` returns 25 events, `limit=300` returns 80; today 25 of 68 |
| `6880f18` | Matcher: bare "fc/sc/united" tokens dropped, 2-3 letter abbreviations match exactly (no "LA" inside atLAnta), bipartite side matching, diacritics folded (CF Montreal) | Real 2026-08-29 MLS board: 13/13 settle with zero holds; Buffalo/South Florida collision stays NO_FINAL |
| `6cd5eda` | Runner grades every pending pick each cycle, overdue first (it processed only the overdue slice, so fresh picks always crossed the grace) | Pure helper + tests |
| `f987259` | Backfill lane derives scoreboard dates oldest-first so a backlog tail is reachable | Tests pin both orders |
| `31564d9` | Signal slate never overwrites a book-priced moneyline pick; teaser carries no percentage | Mocked-db tripwire |
| `ef24e77` | `/api/picks` strips any probability from teaser text served without confidence | Unit + source-contract tests |
| `67730a6` | Confidence tail byMarket populated (loader forwarded pickType) | Loader test |
| `8a8f292` | Calibration loaders read the receipt's publish-time market probability when the factor breakdown lost it; operator note restated | 11 tests; six existing suites unchanged |
| `3eaf058` | `provenPath.scoreBakeoffByMarket`: every score kind per market, coverage within market | Fixture shows the pooled row hiding both facts |
| `e957482` | generate-signal-slate and autonomy-cycle at the 300s cron ceiling | Vercel error groups |
| `a06d59f` | `GET /api/ops/settlement-rca` (Bearer CRON_SECRET): why each overdue pick is stuck, dry-run of the production grader, read-only | 5 tests |
| `0e9835c` | `npm run ops:stale-picks` (read-only) + OPERATOR_TASKS `STALE-PICKS` | Guard smoke exit 2 without DATABASE_URL |
| docs | `docs/calibration-proposals/2026-09-05-market-anchored-display-probability-v5.2.8.md` (PROPOSED) | model-freeze exit 0 |
| `a7ca36a` | reconcile-entitlements and repair-checkout-attempts moved off the shared :00 minute (now :45 and :50) | cron manifest test; `CRON_MATRIX.generated.md` regenerated |
| `00931f0` | `publicEdgeScore`: the edge number is withheld when the viewer cannot see confidence and the pick has no book price (it was derivable back to the gated probability) | unit test; wired in `/api/picks` and board state |
| `486b0a3` | Dashboard post-checkout banner says "Payment received. Activating your plan." until the webhook lands (it said "Welcome to Pro" to a still-FREE account) | dashboard test |
| `19937d8` | `/api/picks` and daily-slate select the US-Eastern slate day of the game; the UTC day was hiding 80 of 91 book-priced NCAAF picks | SQL count on production (read-only); 7 window tests including the DST fall-back day |
| `6631646` | Signal slate skips soccer keys; its reasoning says "uncalibrated and not a sportsbook quote" | guard test |
| `246fc9e` | Receipt-claim copy says "every book-priced pick" (signal rows carry no receipt) | brand lint |
| `994a2fa` | Dashboard confidence as NN/100 (was "NN% conf"); SentientShell unmounted from public routes; pricing and picks copy derived from the live PUBLIC_PICKS gate; FAQ and sign-in state facts | 35 + 71 tests; trust-gate; full web suite: 12,135 passed, the 2 failures were stale source invariants repaired here |
| `74e8e38` | Studio disclosure no longer says "AI-generated" (false and banned; scripts are template-composed); Sleeper Connect defaults to the live season instead of 2025; NFL Week 1 matcher regression cases (Jets@Titans vs an NE@SEA final) | 60 tests across four suites |

What to expect after deploy, and how to check it (no gate is flipped by any of this):

```
# within one hourly settle cycle: MLS/MLB overdue drain; NCAAF Saturday slate settles by Sunday morning
curl -sS https://www.galaxysportsedge.com/api/ops/public-surface-truth | jq '.settlement'
# operator view of anything still stuck (needs CRON_SECRET)
curl -sS -H "Authorization: Bearer $CRON_SECRET" https://www.galaxysportsedge.com/api/ops/settlement-rca | jq '.bySport'
# no anonymous teaser carries a percentage
curl -sS https://www.galaxysportsedge.com/api/picks | jq -r '.data[].reasoning' | grep -Ec '[0-9]+ ?%'     # expect 0
# signal slate no longer rewrites book picks (after one refresh cycle)
curl -sS https://www.galaxysportsedge.com/api/picks | jq '[.data[] | select(.pickType=="MONEYLINE" and .receiptHash != null and (.selection|endswith("(model signal)")))] | length'   # expect 0
# after the next calibration-metrics cron: per-market rows and market coverage above 0.34
curl -sS https://www.galaxysportsedge.com/api/ops/public-surface-truth | jq '.provenPath.scoreBakeoffByMarket'
```

## 3. The calibration decision, stated once

The floors are met today by exactly one probability the system computes: the de-vigged
market probability of the picked side. It is arithmetic on quoted prices, it is committed to
the immutable receipt, and it clears Brier 0.22 on the closing-line corpus (0.2106,
n 2,750). Confidence is a 0-100 selection score whose top tail is inverted. The engine's
job is selection and explanation; the displayed probability should be the market-anchored
number, labelled as such, and the public calibration claim should say it measures that
number on settled moneyline picks. Full design, evidence, file list and acceptance bar:
`docs/calibration-proposals/2026-09-05-market-anchored-display-probability-v5.2.8.md`.

Founder decision required: YES flips the doc to IMPLEMENTED and dispatches work package
WP-1. Until then confidence keeps rendering "NN/100" to PRO only and no percentage is
shown to anyone (shipped).

## 3b. Decisions taken on the founder's behalf (delegated 2026-09-05, 18:00 UTC)

The founder delegated these in-session. Each is reversible by editing this list and the
ledger row named; none flips a gate, changes an env value, or touches production data.

1. **Odds supply.** The Odds API stays an optional supplement; our own ingestion becomes
   primary with **TheRundown as the second book** (WP-26). Facts behind it: (a) read-only
   SQL at 18:00 UTC: the last paid-book odds row (fanduel, draftkings, betmgm) was fetched
   2026-09-05 00:30 UTC; since then only `espn_public` inserted and zero book-priced picks
   were generated in 18 hours. (b) ESPN public is one book (DraftKings via ESPN; the core
   odds endpoint returned exactly one provider, verified live for NFL, CFB, MLB and MLS) and
   `MIN_BOOKMAKERS = 2`. (c) Production logs, verbatim, every 15-minute cycle for all four
   in-season sports: `rundown empty (2d): HTTP 429 rate_limited (abort remaining days)`.
   TheRundown is already wired as the fallback, is registered for commercial use
   (`source-registry.ts` id `therundown`, free 20k data-points/day) and alone carries
   DraftKings, FanDuel, MGM and Pinnacle; our own cadence (refresh-odds every 15 minutes
   plus board-fill 4x/h, 4 sports, 2 dates, no memory of a 429) exhausts its quota early
   each day. (d) Founder position, verbatim from the Hermes brief on PR #680: "we are the
   provider (Galaxy Sports API). Not Rundown. Not The Odds API." The completely free
   two-book board is already designed in the repo and is about 80 percent built: book 1 is
   ESPN inline odds through `GalaxySportsApiOddsProvider` (PR #680, de-vig formula, 8s
   timeouts, `galaxy-espn-inline` registry entry, verdict use-with-caution); book 2 is
   Kalshi exchange quotes as a real bookmaker (`galaxy-kalshi-book.ts`, PR #680) fed through
   the PredExon catalog (`predexon-client.ts` on main, verdict use-with-caution, free key the
   founder already holds, `PREDEXON_INGEST` default OFF), the legal route around Kalshi Dev
   Agreement section 3. Kalshi lists `KXNFLSPREAD` and `KXNFLTOTAL`, so NFL spreads and
   totals are reachable. Nothing on main consumes PredExon yet. Activation is **WP-27**
   (ledger C-104); TheRundown is at most a bridge (WP-26). Do not upgrade The Odds API
   tier; fix the account for Week 1 only if WP-27 cannot land before Thursday.
2. **v5.2.8: YES, NOW** (revised 19:05 UTC; the earlier "after the first NFL Sunday" was
   wrong). It is the PROVEN unlock. Section 3c has the measured floors and the day-count
   path. (F-14, WP-1, WP-28)
12. **No pick ever sits.** Founder policy, 2026-09-05: every pick is graded, or voided with
    an RCA reason through the settlement outbox lane, or unpublished. Nothing stays PENDING
    past its window, nothing stays stale on an unstarted game. The 36 overdue drain when
    #707 deploys; the 20 stale go through the owner tool once; WP-29 automates both so the
    condition cannot recur. (C-106)
3. **Stale published picks: unpublish all rows the selector finds.** Not void (it writes
   settlement events into the record), not leave (they grade on May lines). One-command
   owner tool: `npm run ops:stale-picks:unpublish` (dry run) then `-- --execute`. (F-16)
4. **ESPN Power Index: gated fail-closed at the package layer.** The registry permits ESPN
   facts only; FPI is a proprietary prediction. `ESPN_POWERINDEX_LICENSED` unset means the
   independent source is off. The signal slate loses FPI for NFL and NCAAF until a license
   exists; book-priced picks are unaffected. (F-21, C-90)
5. **Hermes branch `hermes/settlement-token-fix` is superseded.** It sets the containment
   minimum to 3, which still lets "chi" match "kansascitychiefs"; `6880f18` on this branch
   uses 4 plus exact abbreviations plus bipartite side matching, with the NFL regression
   cases. Do not merge it; close it after #707 lands. (F-33)
6. **Schedulers.** Vercel cron is primary; `external-cron.yml` stays as the watchdog; the
   autonomy executor gets a recency guard (C-99). No workflow edit is needed for Week 1.
7. **Landing montage OFF for organic first visits**, keep `?intro=play` (FE-07 moves from
   founder item 15 to the engineering queue, C-93).
8. **Home IA.** `/picks` is the product; hero CTAs go to `/picks` and `/pricing`; `/board`
   is retitled as telemetry (FE-06 moves from founder item 18 to C-93).
9. **Age gate on `/fantasy` stays** until counsel says otherwise; accept the SEO cost (F-25).
10. **Contest Bay stays dark through launch**; no migration now (F-27 deferred).
11. **Production migration status: verified.** Read-only SQL on `_prisma_migrations`:
    `20260101000000_baseline`, `20260902230000_game_merge_alias`,
    `20260902231000_week1_hot_path_indexes` all finished 2026-09-03 20:00 UTC, no
    rollbacks. Section 4 item 7 is closed.

## 3c. Path to PROVEN before kickoff (measured 2026-09-05 19:05 UTC, read-only SQL)

PROVEN needs at least 100 settled picks and a published calibration. The published
calibration needs Brier at or under 0.22, ECE at or under 0.05, Murphy REL at or under 0.05,
n at least 100, and three consecutive green runs of the calibration-metrics cron (every six
hours). This is days, not weeks, because the probability that clears the floors is already
committed to every receipt.

| Floor | Required | Market-anchored p, settled MONEYLINE with receipt, today | Status |
|---|---|---|---|
| n | at least 100 | 150 | met |
| Brier | at most 0.22 | 0.1692 | met |
| Murphy REL | at most 0.05 | 0.0050 | met |
| ECE (10 equal-width bins) | at most 0.05 | 0.0552 | missed by 0.005 |

Context: hit rate 0.7533 against mean p 0.7958 (favorites-heavy sample); 1,894 settled picks
in total; 610 settled moneyline picks carry no receipt (older rows and signal-slate rows).

**Split by sport (same query, 19:20 UTC) and the floors pass today.** MLB (n 100) reads
hit 0.780 against p 0.801, Brier 0.1558: calibrated. MLS (n 35) reads hit 0.600 against p
0.726, Brier 0.2505: that is the two-way moneyline on a three-way market, whose probability
drops the draw mass and is wrong by construction; the engine already refuses to publish
those (`scoring.ts` `isThreeWayMoneylineSport`) and the signal slate skips soccer since
`6631646`. Applying the same rule to the calibration sample (exclude three-way-sport
moneylines, a structural exclusion, not a tuning) gives:

| Floor | Required | Non-soccer MONEYLINE with receipt, today | Status |
|---|---|---|---|
| n | at least 100 | 115 | met |
| Brier | at most 0.22 | 0.1444 | met |
| ECE | at most 0.05 | 0.0440 (10 equal-width bins), 0.0354 (5 equal-mass bins) | met |
| Murphy REL | at most 0.05 | 0.0044 | met |

All four floors are met today on the number that will be displayed. What remains is code
(WP-1 with the three-way exclusion written into the loaders), the streak, and the founder's
gate flips. Watch item, not a blocker: the current model version's MLB slice (v5.2.7, Aug
22 to 24, n 25) read hit 0.600 against p 0.806; small n, but it is the most recent stretch,
so the surface must keep reporting by version and by sport after publish.

1. **WP-1 measurement side: SHIPPED `fbc3784c7`** (adversarially reviewed; three blockers
   found and fixed before commit). The eligibility and calibration surfaces score the
   market-anchored probability only, receipt first (minted once before kickoff, immutable),
   factor-breakdown market fair only for rows that predate receipts, then the WP-28
   resolver; confidence/100 never reaches the floors. Structural exclusions, counted:
   three-way-sport moneylines and non-moneyline markets (scope decision: the pooled floors
   sample is two-way MONEYLINE only; spreads and totals are reported per market). The
   streak persists its probability basis and resets on a basis change. bySport,
   byModelVersion, byMarket and seeded bootstrap intervals are on the truth surface.
   **Remaining (C-107, the coder):** the pick-card label and the public claim copy with the
   verified wording in the proposal doc section 1, then the proposal status flips to
   IMPLEMENTED and MODEL_VERSION to v5.2.8 in the same commit.
2. **WP-28: SHIPPED `fbc3784c7`.** Publish-time market probability for receipt-less settled
   moneylines, recomputed at read time from the append-only odds table (latest snapshot per
   bookmaker at or before `generatedAt`, `MIN_BOOKMAKERS` real books, the same mean-implied
   proportional de-vig the receipts carry, never `consensusNoVig` because no receipt carries
   it), one query per cycle, zero writes, provenance counted (`pSources`). How many of the
   610 resolve appears on the truth surface after the first cron run on the deployed branch.
3. **Book-priced flow restored** (section 4 item 1 or WP-27) so every settled pick from
   Saturday onward carries a receipt.
4. **Streak**: three consecutive green cron runs (12 to 18 hours). The founder may trigger
   `calibration-metrics` by hand to compress this; agents never run a cron with a secret.
5. **Founder flips** `calibrationPublished` per GATE_OPENING_RUNBOOK when the streak is
   green, then moves the pricing phase to PROVEN (`pricing-phases.ts`). (F-36)

Honest caveat: with soccer moneylines included, ECE reads 0.0552 and is not a pass; without
them, by the engine's own publication rule, every floor passes. WP-1 must write that
exclusion into the loaders explicitly and the public claim must name the scope
(book-priced, non-three-way moneylines). Founder approval recorded 19:20 UTC: source switch
first, streak compressed by triggering the cron.

## 3d. Calibration excellence checklist (what "best of the best" means here, and what is verified)

| # | Item | Status |
|---|---|---|
| 1 | Measured probability is the one displayed, labelled, scope named (book-priced, two-way moneylines) | measurement shipped `fbc3784c7`; display label and claim copy: C-107 |
| 2 | Three-way sports excluded from two-way moneyline calibration by the same rule that refuses to publish them; non-moneyline markets excluded from the pooled floors (scope decision) | shipped `fbc3784c7`, counted on the artifact |
| 3 | Receipt probability recovered for receipt-less settled picks from the odds table, zero writes | shipped `fbc3784c7` (WP-28) |
| 4 | Bootstrap interval on Brier and ECE so a point estimate never carries the claim alone; the route's ECE is 10 equal-width bins, the 5-equal-mass figure in 3c was a hand check | shipped `fbc3784c7` (seeded); the interval note travels with the artifact |
| 5 | Holdout: no fitted map touches the scored probability (every isotonic, Platt and temperature module is an offline artifact with `applyOff`); the scored value is fixed at publish (receipt first) and outcomes arrive later | verified 2026-09-05; receipt-first enforced in `fbc3784c7` |
| 6 | Report by sport, by model version and by market on the surface; publish the scoped claim, not a pooled headline | shipped `fbc3784c7` |
| 7 | One row per game in the sample (duplicate Game rows would inflate n): 150 receipts map to 150 distinct games today | verified 2026-09-05 |
| 8 | Confidence has no ranking power (AUC 0.4965 on 13,646 picks, PR #698) and its top tail is inverted: never shown as a probability; recalibration (isotonic, CIR) stays R&D behind `CALIBRATION_ADJUSTMENTS_ENABLED` | shipped (display), R&D deferred |
| 9 | De-vig method: receipts carry the MEAN implied probability across books with a proportional two-way de-vig (`scoring.ts`), not Shin-median; the proposal's label and claim were rewritten to describe that number; switching methods would require new receipts first | verified 2026-09-05; proposal corrected |
| 10 | Publish-time versus closing probability: display publish-time (what the customer saw); the CLV ledger carries the difference; CLOSE stamps must come from the free path too | NFL-05 (C-95) |
| 11 | Drift after publish: durable marker on GREEN to RED or streak reset after a published receipt, health-alert pages, truth surface shows it | shipped `fbc3784c7` |
| 12 | Signal-slate, stale, voided and pushed picks never enter the sample; a pick with no market type fails closed | verified; stale rows leave via WP-29 |

## 3e. Path to 100, measured, and the browser-agent handoff (2026-09-06 02:08 UTC)

PR #707 merged to `main` as `cff3e72d7` and is deployed (the truth surface reports that
SHA). One hourly cycle later the overdue PENDING count read 16 (from 36); stale unstarted
picks 18; odds inserting from one book; the calibration surface RED with streak 0 because its
last snapshot predates the deploy (first market-anchored run: the 02:40 UTC cron).

Score 60 of 100. Founder instruction (2026-09-06): no human step where a machine can do it;
where a console is unavoidable, the Claude browser agent does it from the founder's
logged-in browser using the script below. Decisions taken accordingly:

- **Stale picks are automated, not hand-run.** WP-29 (C-106) is the coder's first task; the
  owner tool stays as a fallback only.
- **The calibration streak runs on the schedule.** No manual cron triggers. The durable
  publish receipt is written automatically by `evaluateAndPersistEligibility` when the
  streak reaches three ("Auto-publish: eligibility GREEN for required streak"). What
  remains manual is the public exposure flag, below.
- **Public flips are two Vercel variables**, set only after both preconditions hold:
  `PERFORMANCE_STATS_ENABLED=true` (the truth surface's `calibrationPublished` follows it)
  and `PRICING_PHASE=PROVEN` (`pricing-phases.ts` reads it). Preconditions: the truth
  surface shows the durable publish receipt (streak 3, published true) AND C-107 is
  deployed so the displayed probability matches the published claim.

| # | To reach 100 | Owner | How it closes |
|---|---|---|---|
| 1 | Book-priced picks flowing: clear The Odds API billing, no tier change | browser agent (script A) | paid book rows return within one six-hour breaker window |
| 2 | Overdue picks to 0 | automatic (deployed fixes) | `settlement.overduePending` reads 0; leftovers carry a reason on `/api/ops/settlement-rca` |
| 3 | Stale picks to 0 | coder: WP-29 (C-106), priority 1 | `stalePendingPicks.count` reads 0 after one cycle |
| 4 | Calibration GREEN three runs | automatic (02:40, 08:40, 14:40 UTC) | truth surface `calibrationEligibility` published true, streak 3 |
| 5 | C-107 display label and claim, IMPLEMENTED flip, MODEL_VERSION v5.2.8 | coder, priority 2 | proposal status IMPLEMENTED; model-freeze green |
| 6 | `PERFORMANCE_STATS_ENABLED=true`, `PRICING_PHASE=PROVEN` after 4 and 5 | browser agent (script B) | truth surface `gates.calibrationPublished` true; pricing page shows PROVEN rates |
| 7 | Live checkout, then refund | browser agent with the founder's card (script D) | dashboard shows the plan active; Stripe shows the refund |
| 8 | Alerting: webhook URL and Sentry DSN in Vercel | browser agent (script B) | `alerting` booleans true once OPS-01 (C-98) ships; until then, health-alert logs DELIVERED |
| 9 | Stripe: Terms URL, consent flag, three webhook events, no live Payment Link | browser agent (script C) | checkout shows the consent checkbox; endpoint lists ten events |
| 10 | FE-05, FE-10, FE-15 copy | coder, priority 3 | acceptance greps in the FE table |

Blocks: 1 to 3 reach 75. 4 to 6 reach 90 (PROVEN). 7 to 10 reach 100.

### Browser-agent scripts (no secret is ever pasted into chat, a doc, or a commit)

**A. The Odds API billing.** Open the-odds-api.com, sign in with the founder's account, open
Account or Billing. Clear the overdue invoice or re-enter the card. Do not change the plan
tier. Confirm the subscription shows active and the key shows enabled. Do not copy the key
anywhere. Verify later: Vercel runtime errors for `/api/cron/settle-picks` stop showing
"payment circuit open after HTTP 402", and `/api/picks` returns picks with
`bookmakerCount` of 2 or more.

**B. Vercel environment (project `sports-web`, team `pick-pilot-s-projects`).** Open
vercel.com, Project Settings, Environment Variables, scope Production. Add
`HEALTH_ALERT_WEBHOOK_URL` (create a Slack incoming webhook or a Discord channel webhook
first and paste its URL here only) and `SENTRY_DSN` (Sentry, the project's Client Keys
page, copy the DSN here only). Then Deployments, latest production deployment, Redeploy, so
the variables apply. Later, only after the preconditions above hold, add
`PERFORMANCE_STATS_ENABLED=true` and `PRICING_PHASE=PROVEN` the same way and redeploy.
Never edit any other variable. Never blank `THE_ODDS_API_KEY` before WP-27 is deployed.

**C. Stripe Dashboard, live mode.** Settings, Business, Public details: set the Terms of
service URL to the site's Terms page (the footer link on www.galaxysportsedge.com). Then in
Vercel add `STRIPE_TERMS_CONSENT_ENABLED=true` and redeploy (this order is required by
OPERATOR.md section 5). Developers, Webhooks, the production endpoint ending in
`/api/webhooks/stripe`: add `checkout.session.expired`, `invoice.paid`, `charge.refunded`
so all ten handled events are subscribed. Payments, Payment Links: deactivate any active
link (they charge without granting access by construction). Do not create products, prices
or coupons.

**D. Live checkout smoke.** On www.galaxysportsedge.com/pricing choose Pro monthly, complete
Stripe Checkout with the founder's card (the founder enters the card; the agent does not
store it), confirm the consent checkbox appears if script C ran, confirm the dashboard shows
the plan active within a minute, then in Stripe refund the payment and cancel the
subscription immediately. Record the date in OPERATOR_TASKS.

**E. Verify after each script**, read-only:
```
curl -sS https://www.galaxysportsedge.com/api/ops/public-surface-truth | jq '{deployment: .deployment.sha, gates, settlement: .settlement.overduePending, stale: .stalePendingPicks.count, calibration: .calibrationEligibility}'
```

## 4. Founder-only actions (nothing here can be done by an agent)

Ordered by damage-if-skipped before Thursday.

1. **The Odds API key or plan.** Every settle cycle since 2026-09-03 logs `payment circuit
   open after HTTP 402`; NFL returned `401 INVALID_KEY` until 2026-09-04. The free path
   now grades everything ESPN publishes, but book depth for NFL Week 1 and the CLV close
   snapshots depend on this feed. Check the-odds-api.com account status and quota; the
   truth surface's `oddsInserting.dualPath.oddsKeyPresent` only says a value exists.
2. **Adjudicate the 20 stale published picks** (`npm run ops:stale-picks`, then
   OPERATOR_TASKS `STALE-PICKS`). They grade at kickoff on May lines otherwise.
3. **Section 3 decision** (v5.2.8 YES or not-yet).
4. **One live checkout smoke** on production (CURRENT_STATE lists it as the largest
   revenue lever still unproven end to end).
5. `HEALTH_ALERT_WEBHOOK_URL` in Vercel and as the GitHub Actions secret, and an uptime
   monitor on `/api/health?strict=1` (SONNET_LAUNCH_ACTION_PLAN phase 4).
6. **Duplicate games.** Run `npm run ops:merge-games` (owner tool, exists) after reading
   `apps/web/lib/ops/game-merge-plan.ts`; the two ESPN namespaces are unified for new
   rows by WP-3 below, the existing 500+ duplicate rows need the owner-run merge.
7. ~~Confirm production migration status~~ Verified by read-only SQL on 2026-09-05 (section
   3b item 11). Re-check only if a future PR adds a migration.
8. **ESPN FPI rights.** The signal slate's main independent source is ESPN's Power Index,
   fetched from `sports.core.api.espn.com` with no clearance gate; the rights registry
   allows ESPN facts only (`commercial_display_allowed: false`, attribution required) and
   FPI is a proprietary prediction, not a fact. Decide: license, or gate the fetch behind
   the registry (fail closed; NFL and NCAAF moneyline signal picks stop until cleared).
   Engineering floor is in the ledger (C-90). Copy stops naming the source to anonymous
   viewers either way.
9. **Point-of-sale Terms consent.** `STRIPE_TERMS_CONSENT_ENABLED` is opt-in and default
   OFF; production state is not readable from the repo. Set the public Terms URL in the
   Stripe Dashboard first, then the flag, then redeploy; watch the checkbox in the live
   checkout smoke (item 4).
10. **Founding Payment Links** created by `scripts/ops/create-founding-payment-link.mjs`
    charge without granting access by construction (no userId metadata, redirect to
    /pricing). Confirm none is shared or active in Stripe Dashboard, Payment Links.
11. **Webhook event list.** The Stripe endpoint must listen for all ten events the
    handler processes; the go-live checklist lists seven (missing
    checkout.session.expired, invoice.paid, charge.refunded). Confirm in the Dashboard.
12. **Age controls are attestation-only** (cookie on pages, none on JSON, self-declared
    DOB at checkout, unpersisted by design). Marketing copy must say "attestation",
    never "verified".
13. **The Odds API plan versus burn.** At `*/15` with four in-season sports and three
    markets the refresh alone is about 34.6K credits per 30 days in September and about
    51.8K in October, plus the hourly paid getScores pass over all seven sports. The live
    plan tier is not readable from the repo (docs mention 20K). Confirm it on the vendor
    dashboard; upgrade, or reduce the non-NFL cadence. Ledger F-26; code half C-96.
14. **X handle.** `@GalaxySportsAI` is stamped into twitter:site and creator on every
    page and linked in the footer. Rename or register a handle matching the domain, then
    update `apps/web/lib/brand.ts` SOCIAL.x (ORG_HANDLE should derive from it). F-23.
15. **Landing media weight.** About 10.5 MB on first visit plus an 8-second full-screen
    video interstitial (`gse-reveal.mp4`, 4.16 MB) before any content. Decide: montage off
    for organic first visits (keep `?intro=play`), hero still under 250 KB. F-24.
16. **Age gate on /fantasy.** Every `/fantasy/*` URL 307s anonymous visitors to the 21+
    gate (live curl today), including the pages the sitemap canonicalises. Keep the gate on
    contests and props only, or accept the SEO cost and drop the fantasy sitemap claims. F-25.
17. **Contest Bay tables.** `apps/web/lib/contests/store.ts` creates its two Postgres
    tables with runtime DDL outside Prisma migrations. Land a migration (owner-only) before
    `CONTESTS_PUBLIC` ever opens; it is off today. F-27.
18. **Home information architecture.** The hero has no path to `/picks` or `/pricing`;
    `/board` and `/picks` compete as "today" surfaces and two proof pages carry
    calibration in the name. Decide the primary CTA and which surface is the product. F-28.
19. **Is anyone paged?** Confirm `HEALTH_ALERT_WEBHOOK_URL` (or `ALERT_WEBHOOK_URL`) and
    `SENTRY_DSN` are set in Vercel Production and as the GitHub Actions secret. The
    health-alert route logs BLIND or UNDELIVERED to the console only; no surface shows
    whether the CRITICAL band reaches a human. Not verifiable from the repo. F-29.
20. **Schedulers and CI (workflow files are frozen for agents).** Three schedulers run
    settle-picks about six times an hour (Vercel cron, `external-cron.yml`, the autonomy
    executor); pick the primary. In `ci.yml`, set the four env-gated Postgres suite URLs to
    the existing test `DATABASE_URL` and point the brand-safety step at
    `npm run test:brand-safety` so the seven-file list cannot drift from the nineteen. F-30.
21. **Open pull request triage.** Thirty are open; nine are merged or superseded, five are
    clean and worth merging after CI, #693 re-lands eleven money and access-control fixes
    that never reached main and must be split by original PR, four mega-branches should be
    closed, #670 is a MODEL_VERSION bump in disguise. Order of operations in F-31.
22. **Operator read secret.** `CRON_SECRET` authorizes both cron mutations and the read-only
    operator surfaces. Once `lib/ops/ops-auth.ts` accepts `OPS_READ_SECRET` (C-102), set it
    in Vercel so a leaked read credential cannot fire a cron. F-32.

## 5. Work packages for the next sessions

Each package is one PR, one owner, with the laws that bind it (AGENTS.md) and the exact
acceptance command. None flips a gate. Effort is a real estimate of agent time.

| ID | Package | Files (entry points) | Acceptance | Effort |
|---|---|---|---|---|
| WP-1 | v5.2.8 Phase 2 (needs founder YES) | see proposal doc section 4 | proposal doc section 4 commands | L |
| WP-2 | Cockpit settlement-hold shows the reason column from `/api/ops/settlement-rca` | `apps/web/app/cockpit/settlement-hold/page.tsx` | `npx vitest run __tests__/cockpit-settlement-hold.test.tsx` and a rendered reason per row | S |
| WP-3 | Unify the ESPN externalId namespace for new Game rows: `espn-schedule-seed.ts:121` writes `espn:${short}:${id}`, `espn-odds-client.ts:361` writes `espn:${sportKey}:${id}`; pick one (the odds key form), upsert on it, and stop creating a third row per fixture. Do not touch existing rows (owner merge). | `packages/data-ingestion/src/espn-schedule-seed.ts`, `espn-odds-client.ts`, `packages/ingestion-pipeline/src/seed-games-from-espn.ts` | SQL count of fixtures with >1 row stops growing after deploy; unit test on the id builder | M |
| WP-4 | Settle cycle memoizes board fetches per (sport, dates) and adds a soft deadline (240s) with a `skipped[]` field | `apps/web/app/api/cron/settle-picks/route.ts`, `free-score-persist.ts`, `free-settlement-runner.ts`, `settle-backfill.ts` | fetch stub called at most once per sport per cycle in `settle-picks-free-first.test.ts` | M |
| WP-5 | Doubleheader tie window 4h -> 90 minutes with kickoff-order tiebreak | `apps/web/lib/data-sources/free-settlement.ts` `NEAREST_CANDIDATE_TIE_MS` | `free-settlement-doubleheader.test.ts` with a 3.5h-apart fixture that settles | S |
| WP-6 | Cross-path score conflict gets its own RCA code instead of `WRITE_RACE_LOST` | `free-settlement-runner.ts:361-378`, `apps/web/lib/settlement/root-cause-analysis.ts` | new rca test | S |
| WP-7 | Why MLB and MLS TOTAL picks are 0 with 41/51 games in window (pause groups cover ML/SPREAD only) | `packages/ingestion-pipeline/src/process-sport.ts` totals path, `selective-publish-runtime.ts` | a written finding with file:line, then the fix or a labelled reason on the coverage surface | S |
| WP-8 | Signal-slate rows never get a CLV entry price; process-sport should backfill the entry when it takes over a row that has none | `process-sport.ts:905-982`, `generate-signal-slate.ts:297-306` | process-sport test | M |
| WP-9 | B2B `pModel` is confidence/100 (`/api/v1/probabilities`); proof page model-vs-market uses confidence/100 | `apps/web/app/api/v1/probabilities/route.ts:88-91`, `apps/web/lib/proof/load-proof-of-record.ts:262-269` | grep shows no `confidence / 100` in either | S |
| WP-10 | Edge Index copy says "calibrated"; value-gap comment says calibrated | `components/home/annotated-sample-signal.tsx:35`, `components/picks/value-gap.tsx:4` | `npm run lint:brand`; `home-signal-anatomy.test.tsx` | S |
| WP-11 | Settlement fallback snapshot hardcodes `hadOddsSignal: true` for signal rows | `packages/ingestion-pipeline/src/settlement-snapshots.ts:90-101` | settlement-snapshots test | S |
| WP-12 | Wire `CONFIDENCE_DISPLAY_MODE` into the confidence badge (dead gate today) | `components/picks/pick-card.tsx:520-531`, `platform-config.ts:66-72` | a consumer exists; test | S |

From the money-path audit (paywall core sound and single-sourced; webhook verified,
idempotent, fail-closed; 174 money-path unit tests green) and the pick-generation audit:

| ID | Package | Files (entry points) | Acceptance | Effort |
|---|---|---|---|---|
| WP-13 | Stripe `unpaid` is access-granting in the webhook (maps to PAST_DUE and stamps a fresh grace anchor) but a downgrade in the reconciler; make the two agree without a schema change | `apps/web/app/api/webhooks/stripe/route.ts:741-803`, `apps/web/lib/billing/reconcile-entitlements.ts:73,144-149` | webhook test: an `unpaid` sync never yields canSeePremiumPicks | S |
| WP-14 | Double-billing guard is DB-only; list the customer's Stripe subscriptions before creating a checkout session (409 already_subscribed; 503 on Stripe error, no side effect) | `apps/web/app/api/subscriptions/checkout/route.ts:158-191,344` | `subscriptions-checkout-route.test.ts` new case | M |
| WP-15 | 37 entitlement-shaped routes and the 401/403 gate bodies return without Cache-Control no-store (repo rule .claude/rules/nextjs-caching.md) | `apps/web/lib/api-entitlement.ts:86-112`, every route importing requirePremiumApi/requireFantasyApi, `apps/web/app/api/board/state/route.ts` | test: every route importing api-entitlement also imports no-store | M |
| WP-16 | Env-path price ids are never amount-verified at runtime (only the lookup_key path is); retrieve and compare unit_amount to the advertised phase price, 503 on mismatch | `apps/web/lib/stripe.ts:145-174`, `scripts/lib/stripe-price-check.mjs` | checkout route test + `npm run deploy:ready` | S |
| WP-17 | Missing STRIPE_WEBHOOK_SECRET reports as a 400 signature failure instead of a 503 config error; malformed checkout JSON escapes as a 500 | `apps/web/app/api/webhooks/stripe/route.ts:45-51`, `apps/web/app/api/subscriptions/checkout/route.ts:86` | webhook + checkout tests | S |
| WP-18 | Hand-rolled tier predicates: FANTASY receives full blog content via `tier !== "FREE"`; audit route re-derives PRO/ELITE inline; export `isPremium` and use it | `apps/web/app/api/blog/route.ts:62`, `apps/web/app/api/picks/[id]/audit/route.ts`, `apps/web/lib/api-entitlement.ts:38` | grep shows no inline tier predicate outside webhooks/checkout | S |
| WP-19 | Checkout and portal use the in-memory per-instance rate limiter; move to the durable limiter keyed on user id | `apps/web/app/api/subscriptions/checkout/route.ts:78`, `portal/route.ts:15` | grep shows consumePublicFormRateLimit in both | S |
| WP-20 | Signal slate considers only the first 80 games by kickoff over 21 days (NFL Sunday starves behind CFB Saturday) and never refreshes rows pushed out of the window; batch per sport and add a refresh pass for its own rows | `packages/ingestion-pipeline/src/generate-signal-slate.ts:125-136` | guard test with 100 games across two sports | S |
| WP-21 | Signal slate writes game.dataQualityScore up to the public floor (70) so its rows pass the /api/picks quality gate: a gate made to resolve differently by code; move the floor to an explicit documented policy or pick-level quality | `generate-signal-slate.ts` (db.game.update block), `apps/web/lib/public-picks-quality.ts`, `apps/web/app/api/picks/route.ts` quality filter | no `db.game.update` in the slate; policy documented | S |
| WP-22 | Moneyline signal rows expose `line: 0` to JSON consumers and rely on the selection-string sentinel as their only provenance; add `priceSource` to the factor breakdown and emit `line: null` for book-less moneylines in PublicPick | `generate-signal-slate.ts`, `apps/web/app/api/picks/route.ts`, `packages/types/src/index.ts` | no MONEYLINE with line 0 in the anonymous payload | M |
| WP-23 | Book-pick create relies on the schema default `isPublished = true` while signal rows write it from the gate. Note before touching: writing the gate value into pickUpdateData would re-publish rows the owner has unpublished (STALE-PICKS procedure), so the flag belongs on create only | `packages/ingestion-pipeline/src/process-sport.ts` pick.create | process-sport test | S |
| WP-24 | Totals drop reasons: MLB/MLS TOTAL=0 is scoreTotalPick's own gates (fewer than 2 totals books, no two-sided prices, consensus below 0.55, confidence below 50) and the ESPN tertiary odds path emits one bookmaker so it can never yield a TOTAL; return a per-market drop reason from scoreGame and surface counts on the coverage hint (supersedes WP-7) | `packages/prediction-engine/src/scoring.ts` scoreTotalPick, `process-sport.ts` result, `apps/web/lib/board/market-coverage.ts` | coverage hint names the gate that fired | M |

| WP-25 | Gate the ESPN Power Index fetch behind the rights registry (fail closed, attribution) until F-21 clears it; anonymous copy never names the source | `packages/ingestion-pipeline/src/generate-signal-slate.ts` (espn_powerindex), `apps/web/lib/scraping/clearance-engine.ts` | slate test: fetch not called when clearance denies | S |
| WP-26 | Own odds ingestion as primary, TheRundown as the working second book (section 3b item 1). Phase A (NOT STARTED; fully specified, dispatch first): durable 429 cooldown read from `IngestionRun` (marker `rundown:429`, `RUNDOWN_429_COOLDOWN_MINUTES` default 60), freshness throttle from the newest Rundown-affiliate odds row (`RUNDOWN_FALLBACK_MIN_INTERVAL_MINUTES` default 30), `provider` and `providerNote` on every per-sport result and `oddsInserting.lastProviderNote` on the truth surface. Phase B: board-fill must not run a second odds pass when refresh-odds ran within the interval; Rundown `daySpan` follows the horizon of games actually on the board (NFL Thursday and Sunday from a Friday cycle); founder picks TheRundown Starter or keeps The Odds API. Phase C (optional, after Week 1): re-land the core of PR #680 (`GalaxySportsApiOddsProvider`, de-vig `fair_prob`, 8s timeouts, registry gating) | `packages/data-ingestion/src/rundown-client.ts`, `packages/ingestion-pipeline/src/process-sport.ts`, `apps/web/app/api/ops/public-surface-truth/route.ts`, `apps/web/app/api/cron/board-fill/route.ts`; reference `origin/hermes/galaxy-keyless-odds` (197 behind main) | production logs stop showing `HTTP 429 rate_limited` every cycle; `curl /api/ops/public-surface-truth \| jq .oddsInserting.lastProviderNote`; odds rows with Rundown affiliate bookmakers appear within one interval; ingestion-pipeline and data-ingestion suites green | M |
| WP-27 | **GSN API activation: the completely free two-book board** (founder position on PR #680: we are the provider, not Rundown, not The Odds API). (1) Re-land the PR #680 core onto main: `GalaxySportsApiOddsProvider` (ESPN inline odds via `site.web.api`, de-vig `fair_prob`, 8s timeouts, `galaxy-espn-inline` registry entry, provider selection in `odds-provider-adapter.ts`). (2) Select the Galaxy provider also when the paid circuit is open (HTTP 402), not only when `THE_ODDS_API_KEY` is unset. (3) Feed `galaxy-kalshi-book.ts` from the PredExon Kalshi catalog (`predexon-client.ts`, `PREDEXON_INGEST` + `PREDEXON_API_KEY`, `assertIngestible("predexon")` passes: verdict use-with-caution) instead of the direct Kalshi client, so the second book clears the registry. Cache the catalog per cycle (PredExon free tier is 1 rps, 1k requests per month; Kalshi list-markets is documented free and unlimited). (4) Extend the Kalshi book from H2H to NFL SPREAD and TOTAL using series `KXNFLSPREAD` and `KXNFLTOTAL` (`kalshi-series.ts`); other sports stay H2H until their series are verified. (5) Never invent the other side: both sides need a live two-way quote or no book is added (law already in `galaxy-kalshi-book.ts`). | `origin/hermes/galaxy-keyless-odds` (197 behind main; CI was green): `packages/data-ingestion/src/{odds-provider-adapter,galaxy-kalshi-book,source-registry}.ts`, `packages/ingestion-pipeline/src/process-sport.ts`; on main: `packages/data-ingestion/src/{predexon-client,kalshi-series,kalshi-client}.ts` | with `THE_ODDS_API_KEY` blank in a test, `processSport` mints MONEYLINE and NFL SPREAD/TOTAL picks with `bookmakerCount = 2` from `espn_public` plus `kalshi`; no pick minted when either side lacks a live quote; data-ingestion and ingestion-pipeline suites green; then founder F-34 sets the two PredExon env values and the first production cycle shows `kalshi` rows in the odds table | L |
| WP-28 | **Lock-time market probability from the odds table** (section 3c step 2): in `apps/web/lib/calibration/live-calibration-p.ts` add the third fallback after the receipt: for a settled MONEYLINE pick with no receipt and no factor-breakdown market p, read odds rows for the game with `fetchedAt` at or before `generatedAt` (latest snapshot per bookmaker, at least `MIN_BOOKMAKERS` books), de-vig with `consensusNoVig` (`packages/prediction-engine/src/market-read.ts`), take the picked side. Read-time only, no writes, deterministic. Loaders in `proven-path-seed.ts`, `calibration-eligibility-durable.ts` and `calibration-metrics/route.ts` pass the odds rows or a resolver. | `apps/web/lib/calibration/live-calibration-p.ts`, `proven-path-rows.ts`, `apps/web/lib/settlement/free-path-clv.ts:68-90` (query shape to reuse), `apps/web/lib/ops/calibration-eligibility-durable.ts:349` | unit test with a fixture of three bookmaker rows yields the de-vigged side probability; a pick with no odds rows stays excluded; `scoreBakeoffByMarket` coverage for MONEYLINE rises above 0.7 on the next cron run | M |
| WP-29 | **Zero-sit settlement policy** (section 3b item 12): a pick PENDING more than 24 hours after `commenceTime` whose settlement-rca reason is NO_FINAL after every free source and the backfill lane is VOIDED through the settlement outbox lane (`PickSettlementEvent` with result VOID and the RCA code in the payload), never deleted; a published PENDING pick on an unstarted game not refreshed within `STALE_PENDING_PICK_MAX_AGE_DAYS` is unpublished by the same cron using the shared selector in `scripts/ops/lib/stale-pending-picks-selection.ts`; both actions are counted on the truth surface and in the health alert. Founder policy replaces the "owner decides" stance in `stale-pick-policy.ts:16-20`; keep the owner tool for manual overrides. | `apps/web/app/api/cron/settle-picks/route.ts`, `apps/web/lib/settlement/root-cause-analysis.ts`, `apps/web/lib/board/stale-pick-policy.ts`, `apps/web/lib/data-sources/settle-backfill.ts`, `scripts/ops/lib/stale-pending-picks-selection.ts` | tests: a 25-hour NO_FINAL pick is voided with an outbox event; a 23-hour one is not; a stale unstarted pick is unpublished; `overduePending` and `stalePendingPicks` both read 0 on the truth surface after one cycle | M |

Public frontend (from the frontend audit; FE-01/03/04 shipped in `994a2fa` and `486b0a3`;
no screenshots were possible from the sandbox, every finding is from source):

| ID | Package | Files (entry points) | Acceptance | Effort |
|---|---|---|---|---|
| FE-02 | One floating launcher per corner on public routes: Nova launcher (bottom-left) collides with ThermalVision and GhostJarvis; ObservatoryBeacon (bottom-right) overlaps the command palette hint on the home page | `apps/web/app/layout.tsx`, `components/explainers/page-explainer.tsx:41`, `components/home/*beacon*`, `components/motion/*` | `grep -rn "fixed bottom-" apps/web/components apps/web/app --include=*.tsx` shows one per corner outside cockpit | M |
| FE-05 | Signal-slate rows on the pick card: "No book price attached" pill in the empty line slot and the "(model signal)" suffix stripped at display time | `components/picks/pick-card.tsx:110-125`, small display helper next to `lib/picks/teaser-text.ts` | card test; `curl /api/picks` shows no "(model signal)" in rendered selection | S |
| FE-08 | Checkout resume: persist tier, interval and DOB before the sign-in bounce and restore them on return; Free CTA lands on a dashboard with a next step | `components/pricing/subscribe-button.tsx:117-151` | e2e journey-checkout case: anonymous click, sign in, return restores the card | M |
| FE-09 | `id="main-content"` on every public page (missing on about 60; the skip link points at nothing) | shared shell or each `app/**/page.tsx` | unit test over `app/**/page.tsx` excluding api/admin/cockpit/embed | S |
| FE-10 | Plain-language gate copy on /board and /picks ("LIVE_BOARD / gate held by law", "refuse-default"); `timeLabel` returns "Unavailable" for NaN instead of "Just now"; rankingP/rankingSource hidden from the public row | `app/board/page.tsx:228-245`, `app/picks/page.tsx:404` | `grep -rn "LIVE_BOARD\|Just now\|refuse-default"` on both pages is empty | S |
| FE-11 | Dashboard uses `PICK_GRADE_LABELS` and `RISK_LEVEL_LABELS` (renders raw enums today) and stops labelling the render clock as a data sync | `app/dashboard/page.tsx:549-565` | both imports used; test | S |
| FE-12 | Remove "soon" chips in gm-autopilot, drop `/board/gate` from the sitemap and noindex it until it runs on live data | `components/fantasy/gm-autopilot.tsx:45-47`, `app/sitemap.ts` | grep for `>soon<` empty; sitemap test | S |
| FE-13 | Strip the brand suffix from about 17 page titles (the layout template appends it, so the tab reads "Title, Galaxy Sports Edge, Galaxy Sports Edge") | `app/**/page.tsx` metadata titles, `lib/brand.ts:210` | unit test: no page title contains BRAND_NAME unless `absolute` | S |
| FE-14 | Design-token drift: tailwind colors reference the CSS variables (ion-3 and obsidian differ today); codemod `text-ink-*` to ion tokens; RiskDisclosure compact to 12px | `tailwind.config.ts:48,64`, `styles/design-tokens.css:10,39`, public components | `grep -rho 'text-\[9px\]'` count 0 | L |
| FE-15 | FAQ and About match the paywall: factor trail and confidence are Pro/Elite; replace the "64% calibrated confidence" illustration with a tier-neutral, non-percentage sentence | `app/faq/page.tsx:71-85`, `app/about/page.tsx:24` | grep for "that's the whole product" and "64% calibrated" empty | S |
| FE-17 | Remove GalaxyCursor from the root layout (or restrict to the home hero) and HoloTilt from pricing cards | `components/ui/galaxy-cursor.tsx`, `components/pricing/pricing-plans.tsx:70` | grep shows neither mounted | S |
| FE-18 | "Save up to 45% annually" computed from the plans' `annualSavingsPct` (PROVEN would be 38%); sign-in uses `BrandLockup` instead of a generic SVG | `components/pricing/pricing-plans.tsx:60`, `app/auth/signin/page.tsx:33-53` | grep for "45%" empty; BrandLockup imported | S |

Fantasy suite (FANTASY tier, $4.99/mo; FAN-04 and FAN-09 shipped in `74e8e38`). The P0
here is honesty of the paid values, not a missing feature:

| ID | Package | Files (entry points) | Acceptance | Effort |
|---|---|---|---|---|
| FAN-01 | Paid fantasy values are 2025 REG season totals with no 2026 advance and the basis season is never shown. Carry `season` from the graded pool into `ProjectionsMeta`, render "Values: 2025 REG usage" on the badge and LIVE_NOTE strings, and implement the `hasRegRows` probe so the season advances once 2026 rows land (shared with NFL-06) | `lib/intelligence/player-model.ts:217`, `lib/trends/nflverse-readiness.ts:80-82`, `packages/data-ingestion/src/nflverse-season.ts`, `components/integrations/projections-badge.tsx` | graded-pool and nflverse-readiness tests; the season string is visible on every live surface | M |
| FAN-02 | Start-Sit, Waivers and Trade cannot describe a real league: 96-player pool (`TOP_PER_POS = 24`), sample roster not editable, synced Sleeper roster never fed in. Minimum honest path: pass the synced roster ids from /fantasy/connect into the three tools and resolve with `rosterFromIds`; widen the pool | `lib/intelligence/player-model.ts:70,108,231`, `lib/fantasy/waivers.ts:14,41-43`, `lib/intelligence/roster-advice.ts`, `app/fantasy/{lineup,waivers,trade}/page.tsx` | waivers, lineup and roster-advice tests; a Sleeper roster renders in Start-Sit | L |
| FAN-03 | "Projections: live · Data via nflverse" badge renders above fictional-player tools on six pages; pass `projectionsBadge={false}` on dfs, league-twin, scheme, autopilot, studio, connect and add a shared SampleBanner at the top of every fictional tool | `components/fantasy/fantasy-shell.tsx:25,71-77`, `app/fantasy/*/page.tsx` | `grep -ln "projectionsBadge={false}" app/fantasy/*/page.tsx` lists all six | S |
| FAN-05 | FREE viewers get a silently trimmed pool labelled as the full live pool; pass `canUseFantasyFull` into WaiverBoard, TradeAnalyzer, LineupOptimizer and render FantasyUpsell plus "Free preview: top 12 per position" | `app/fantasy/waivers/page.tsx:28-38` and siblings, `components/fantasy/{waiver-board,trade-analyzer,lineup-optimizer}.tsx` | grep shows FantasyUpsell in all three | S |
| FAN-06 | Fantasy hub hard-codes "Projections: gated" while the provider is enabled in production; derive readiness and TOOL_DIRECTORY status from `getLiveProjectionsMeta().live` and `isConfigured(...)` | `app/fantasy/page.tsx:45,60-64,129` | `grep -n 'value="gated"' app/fantasy/page.tsx` empty | S |
| FAN-07 | Pricing lists "The Academy: full training floor" under Fantasy, but Academy has no entitlement gate; list exactly what `canUseFantasyFull` unlocks | `app/pricing/page.tsx:113-114`, `app/fantasy/academy/page.tsx` | pricing tests; no Academy claim under FANTASY | S |
| FAN-08 | GM Ledger shows fictional decisions dated Sep-Oct 2026 with outcomes and a letter grade; add a visible DEMONSTRATION banner as the first element and use obviously historical example dates | `lib/fantasy/gm-ledger.ts:46-55,98-121`, `components/fantasy/gm-ledger-view.tsx` | grep for "illustrative" or "demonstration" in the view non-empty | S |
| FAN-10 | Start-Sit presents 17-game season totals as weekly "proj"/"median" with season-unit leverage thresholds; divide to per-game (`fppg` exists) and label "avg PPR/game, 2025 REG" | `lib/fantasy/lineup.ts:85-93`, `lib/integrations/graded-pool.ts:191`, `components/fantasy/lineup-optimizer.tsx` | lineup test with per-game fixtures | S |
| FAN-11 | Studio brief can mix real live-pool players into a page labelled "fictional players"; pin `waiverTargets(PLAYERS)` and `buildLeagueTwin(DEFAULT_ROSTER_IDS, PLAYERS)` | `lib/fantasy/studio.ts:29,33`, `lib/fantasy/{waivers,league-twin}.ts` defaults | studio test | S |
| FAN-12 | "Scheme fit" is advertised as a live ranking input but is a constant 0.6 on every live row; remove it from live-mode copy until team environment is loaded | `lib/integrations/graded-pool.ts:55,404-430`, `app/fantasy/waivers/page.tsx:34` | graded-pool and waivers tests; grep for "scheme fit" in live copy empty | S |
| FAN-13 | The only backtested projection method (`projectPlayerSeason`, MAE vs carry-forward) is not wired into the suite and gated `/api/tools/lineup` has no UI caller; decide (a) make it the value basis for the labelled season and surface the MAE, or (b) keep usage grades and delete the dead route | `packages/prediction-engine/src/player-projection.ts:34-105`, `apps/web/lib/projections/player-projections.ts:86`, `app/api/tools/lineup` | a written decision, then the wiring or the deletion with tests | M |
| FAN-14 | Baseline map cites the removed `FANTASY_PUBLIC_TOOLS_ENABLED` gate as current truth | `lib/fantasy/competitive-baseline.ts:113` | grep for the flag under apps/web/lib and app empty | S |

NFL Week 1 follow-ups (the audit independently reproduced the three settlement defects
this branch fixes; these are what remains):

| ID | Package | Files (entry points) | Acceptance | Effort |
|---|---|---|---|---|
| NFL-05 | Line-archive CLOSE stamps are written only by the paid settleSport path; call `markClosingSnapshotsIfEnabled` after a successful free settle write and in the backfill lane (flag-gated, failure-isolated already) | `apps/web/lib/data-sources/free-settlement-runner.ts` (after `written.count > 0`), `settle-backfill.ts`; today's only caller `packages/ingestion-pipeline/src/settle-sport.ts:716` | test: free path stamps CLOSE when `LINE_ARCHIVE_ENABLED=true` | S |
| NFL-06 | nflverse display season cannot advance to 2026 during the season because no caller passes `hasRegRows`; supply the probe from a PlayerGameStat REG count and pass it from snap-share, injury-report, nflverse-readiness and refresh-player-stats; fix the docblock | `packages/data-ingestion/src/nflverse-season.ts:29-83`, `apps/web/lib/ingestion/player-stats.ts:56`, `lib/nflverse/{snap-share,injury-report}.ts`, `app/api/cron/refresh-player-stats/route.ts:54` | after Week 1: `seasonResolution.season` 2026 with a REG-rows reason | M |
| NFL-07 | ESPN schedule seed samples UTC dates every 3 days although the NFL scoreboard is Eastern day-bucketed; use contiguous Eastern-day ranges | `packages/data-ingestion/src/espn-schedule-seed.ts:134-185` | seed test: every day in the horizon covered | S |
| NFL-04 (code half) | Surface the last refresh's Odds API remaining-request header on the truth surface and health alert; skip the paid getScores supplement for out-of-season sports (the free path stays for all sports) | `packages/data-ingestion/src/config.ts:52-69,101`, `apps/web/app/api/cron/settle-picks/route.ts:246` | `curl /api/ops/public-surface-truth | jq .oddsApiRemainingRequests` non-null | S |

Operations, alerting and the test suite. Cron authorization is sound (27 call sites, bearer
only, fail-closed on an unset secret), and self-healing is real: with settlement CRITICAL
the autonomy kernel plans a free settle as P0 every 15 minutes, on top of the hourly Vercel
cron and a live GitHub external-cron workflow (3,573 runs). Overdue staying at 36 under six
settle runs an hour is what proved the fault was matching and data, not scheduling.

| ID | Package | Files (entry points) | Acceptance | Effort |
|---|---|---|---|---|
| OPS-01 | Alerting posture booleans (health webhook configured, Sentry DSN configured) on the truth surface and cockpit; today "BLIND" and "UNDELIVERED" go to console only | `apps/web/app/api/cron/health-alert/route.ts:87-110,215-252`, new `lib/ops/alerting-posture.ts` mirroring `autonomy-posture.ts` | `curl /api/ops/public-surface-truth | jq .alerting` returns both booleans | S |
| OPS-02 | Durable rate limit on `/api/ops/public-surface-truth` and `/api/health` (in-memory per-instance limiter today; heaviest anonymous routes) | `app/api/ops/public-surface-truth/route.ts:150-166` | route test mirrors `picks/route.ts:35-41` (429, 503 when the store is down) | S |
| OPS-03 | Durable lease on settle-picks (JarvisMemoryEvent pattern from `traffic-heartbeat.ts:30-33,111-120`, no migration) and a recency guard in the autonomy kernel; refresh-odds and calibration-metrics are double-fired today | `app/api/cron/settle-picks/route.ts`, `lib/autonomy/operating-kernel.ts` | a run started under 10 minutes ago returns `skipped: lease-held`; test | M |
| OPS-04 | Autonomy observation hard-codes `boardSuppressed: true` and `canonicalSettled: null`, so every plan and alert carries a false P0; build it from the loaders the truth surface uses | `app/api/cron/health-alert/route.ts:165-167`, `app/api/cron/autonomy-cycle/route.ts:121-123`, `lib/autonomy/operating-kernel.ts:303-317` | kernel test: a healthy observation yields no honesty P0 | S |
| OPS-05 | Alert fatigue: hours in band and overdue count in the head line, escalation by band age, dedupe across the two sources | `lib/ops/health-alert-decision.ts:69-72`, health-alert `summarize()` | decision test with a 30-hour band | M |
| OPS-06 | Sentry is init-only: wire `withErrorCapture(route, handler, "critical")` around checkout, the Stripe webhook and `/api/picks`; give the error webhook payload a text summary key | `lib/observability/sentry.ts:46-71`, `lib/observability/capture-route-error.ts` | a thrown route error is captured in a test | M |
| OPS-07 | Runbook drift (seven places): LAUNCH_DAY_RUNBOOK has no alerting or autonomy step and tells the operator to re-run settle-picks by hand; CRON_MATRIX.md duplicates the generated table | `docs/ops/LAUNCH_DAY_RUNBOOK.md:89-103`, `docs/ops/CRON_MATRIX.md:27-36`, `docs/ops/GO_LIVE*.md` | one docs PR; the operator can follow it in 30 minutes | M |
| OPS-08 | Autonomy executor budget: four sequential 90s cron calls inside a 300s route; pass `timeoutMs: 60_000` and run distinct paths with `Promise.allSettled` | `lib/autonomy/execute-autonomy-cycle.ts:249,325-376`, `app/api/cron/autonomy-cycle/route.ts:130-136` | executor test with the budget | S |
| OPS-09 | Cron auth "dual" mode is documented but unreachable; delete the branch or add a test that fails if any route opts in | `lib/cron/authorize.ts:10-24` | grep or test | S |
| TCI-2 | Signal-slate publish rules have zero assertions (MIN_PUBLISH_CONFIDENCE, coin-flip skip, PREMIUM/FREE tier, isPublished gate) | `packages/ingestion-pipeline/src/__tests__/generate-signal-slate-guard.test.ts` (mocks exist) | four new cases green | S |
| TCI-3 | Anonymous `/api/picks` teaser contract (max 2 picks, confidence and factor breakdown null) is proven only by source regex; invoke the route with a stubbed db | new `apps/web/__tests__/picks-anon-teaser-contract.test.ts`, precedent `picks-stale-kill-switch.test.ts` | route returns 2 rows, both nulls | M |
| TCI-5 | `packages/db` has 32 passing tests that `npm test` never runs (no `test` script) | `packages/db/package.json` | `npm test` output lists packages/db | S |
| TCI-6 | Sealed-holdout guard test walks the whole repo under the default timeout; jsdom for everything makes the web suite about 300s | `apps/web/__tests__/sealed-holdout-open-scan-guard.test.ts:56-61`, `// @vitest-environment node` on route and lib tests | suite time drops; no timeout flake | M |
| TCI-8 | Ledger SLA warnings (owner-less OPEN rows), stale row count in AGENTS.md, no tests in three worker packages | `docs/ops/AGENT_LEDGER.md`, `AGENTS.md:24`, `workers/*` | guard prints no SLA warnings; one smoke test per worker | S |

TCI-1 (P0) was "the settlement fixes exist only on an unpushed branch"; this branch is
pushed and its pull request is the record. TCI-4 and TCI-7 (enable the four env-gated
Postgres suites and point the brand-safety CI step at `npm run test:brand-safety`) edit
`.github/workflows/ci.yml`, which is frozen for agents: founder item 20.

Security and auth (quick pass; no P0 or P1 found). The perimeter holds: middleware checks
cookie presence only, but the admin and cockpit layouts re-run `auth()` and require ADMIN,
every admin and cockpit API route carries an inline ADMIN check, ops routes compare the
Bearer secret in constant time, B2B keys are constant-time and default to FREE scope, and
open redirects are guarded on sign-in and age-verify.

| ID | Package | Files (entry points) | Acceptance | Effort |
|---|---|---|---|---|
| SEC-01 | Admin "Trigger Data Refresh" server action fetches its own API without the session cookie (dead and unauthenticated); call the handler directly under `requireAdminActor()` with the same rate limit | `apps/web/app/admin/page.tsx:112-122`, `lib/auth/actor.ts` | action test: non-admin rejected, admin triggers | S |
| SEC-02 | `emailVerified` stamping is fire-and-forget inside the JWT callback; on serverless the write can be dropped, keeping Elite alerts blocked. Await it with a fail-closed catch | `apps/web/lib/auth.ts:93-97` | auth test; founder review (auth path) | S |
| SEC-03 | Five public routes rate-limit on the leftmost X-Forwarded-For entry instead of `clientIp()` | `app/api/human/roster-availability`, `cipher/verify`, `intelligence/roster-advice`, `waitlist`, `contests/*` routes | grep shows `clientIp(` in all five | S |
| SEC-04 | Waitlist Basic Auth compares with `===`; use `safeEqualSecret` from `@sports/util` | `apps/web/lib/waitlist/access-gate.ts:59-62` | gate test | S |
| SEC-05 | Truth surface emits the detail-gated `mainFeatureMarkers` publicly as `expectedMainFeatures`, and provider env-var names anonymously | `app/api/ops/public-surface-truth/route.ts:610,815` | anonymous response carries neither | S |
| SEC-06 | Production CSP allows `'unsafe-inline'` scripts with no nonce; move to a per-request nonce with `'strict-dynamic'` | `apps/web/next.config.mjs:87-88`, `middleware.ts` | header test; pages render | M |
| SEC-08 | `/api/promotions` is CDN-cacheable for 5 minutes although compliance-gated; return via `jsonNoStore` | `app/api/promotions/route.ts:48-53` | route test asserts no-store | S |

SEC-07 (one secret authorizes both cron mutations and read-only operator surfaces) is
founder item 22 plus a small `ops-auth.ts` change.

Open pull requests (30, triaged read-only against `origin/main` 1a3f00d05; GitHub metadata
not read). All four launch-merge-train PRs from 2026-09-04 are merged. Nine are already
merged or superseded and should be closed. Five are clean-merging and production-relevant
(#665 adapters fail closed, #668 revenue-fence validation, #666 auth tests, #660
rollback/additivity, #669 ledger audit) and need only an update from main and a CI run. The
one consequential stranded item is #693: a 13-commit bundle re-landing twelve money and
access-control PRs, of which only one reached main; 47 of its 52 added files are absent
from main and it carries 11 conflicts, so it must be split by original PR, not rebased
blind. Four mega-branches (#663, #674, #672, #675) are unmergeable and should be closed
with a two-item salvage list. #670 bumps MODEL_VERSION to v5.3.0 and rescales the public
Edge Index: a calibration proposal, never routine cleanup. Hold the production dependabot
bump #437 until after Week 1. Details and the order of operations: ledger F-31.

All eleven audits have completed. Every P0 finding was independently re-verified against
the deployed SHA by a separate verifier that tried to refute it: 18 of 18 verdicts
CONFIRMED. The workflow journal is the evidence; the ledger rows point at it.

## 6. Verification commands (what "done" means for every package)

```
npm run typecheck && npm run lint && npm run lint:brand && npm run guardrails
cd apps/web && npx vitest run <touched suites>
node scripts/ops/check-agent-ledger.mjs
node scripts/check-launch-readiness.mjs           # production probe, read-only
```

## 7. What was deliberately not done in this session, and why

- No gate flipped, no env var changed, no cron run with a secret, no database write. The
  36 overdue picks drain when the fixed code deploys and the hourly cron runs; nothing was
  settled by hand.
- MODEL_VERSION not bumped: the display-probability change re-labels what every customer
  sees and belongs to a founder YES with the proposal doc as the record.
- The 500+ duplicate Game rows were not merged: an owner tool exists and the merge is a
  data operation, not code.
- The stale picks were not superseded or voided: the record is the product; the owner
  decides, with the rows in front of them.
