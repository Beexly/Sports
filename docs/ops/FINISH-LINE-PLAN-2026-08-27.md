# FINISH LINE PLAN — 2026-08-27

> The consolidated, verified path from "silent launch, everything gated off" to "fully
> public, revenue on, proof-gated." Written from a clean clone at `origin/main`
> (`bb0e7df`), an 8-reader verified sweep of code + docs, and the founder's live
> dashboards (2026-08-27). Every claim below is either CODE-VERIFIED in this tree,
> RUN-VERIFIED in this session, or marked as a probe to run. Where this document
> conflicts with `docs/ops/CANONICAL.md`, CANONICAL wins.

## ADDENDUM 2026-08-28 — Galaxy keyless decision + PR #680 review

**Founder decision (2026-08-27, do not reverse):** GSE becomes its own odds provider —
the **Galaxy Sports API** (keyless ESPN `site.web.api` inline scoreboard odds +
multiplicative de-vig). The Odds API $30/mo renewal (~Sep 22 invoice) is to die;
TheRundown signup was **rejected** as the kill switch. Wired in
[PR #680](https://github.com/Beexly/Sports/pull/680) (`hermes/galaxy-keyless-odds`);
full context in `docs/agents/CLOUD-BRIEF-2026-08-27.md` + the AGENTS.md findings index
on that branch. This supersedes the §4 framing that treated pasting the paid key as
the end state — but see the sequencing warning below before unsetting anything.

**Verified at `ffa6b9c40` (this session):** data-ingestion 355 pass, ingestion-pipeline
221 pass / 6 skip, CI Test/typecheck/lint green, Codacy 0 issues. Confirmed claims:
no invented prices anywhere on the ingest/persistence plane; Polymarket parser
unreachable from the quote plane and `INDEPENDENT_POLYMARKET` default off;
`fetchNflverseGameLines` (2018–2025 real closing lines) research-only; props ingest
default OFF with credit cap; no gate files touched.

**Adversarial review findings (3-lens, all file:line-verified — fix before this path
carries the product):**

1. **HIGH — inline spreads are dead on arrival.** `espn-odds-client.ts:211-212` names
   spread outcomes by team ABBREVIATION; `normalizer.ts:97-102` matches by FULL team
   name → every inline SPREADS row normalizes to `spread: undefined` and persists as
   an all-NULL Odds row. Two reviewers confirmed independently. Exactly what the
   admitted-missing `fetchNormalized` test would have caught.
2. **HIGH — rights/clearance gap.** The keyless ESPN odds path calls no
   `assertIngestible`/clearance; the data-ingestion source registry's only ESPN-JSON
   entry is `espn-hidden-api` = **forbidden**, and the web registry's
   `espn-public-api` permits logged-off scores FACTS only (`storage_allowed:false`,
   `commercial_display_allowed:false`) — yet `process-sport.ts:590-592` persists
   ESPN-relayed DraftKings odds + payload snapshots. `process-sport.ts:99-102` itself
   says "no free odds source is cleared today." The PR also deleted the old ToU
   caveat header. Needs a founder rights decision + registry entry + clearance wiring
   before Galaxy is the primary — this is CLAUDE.md's non-negotiable lane.
3. **MEDIUM — keyless path cannot mint picks as-is.** Galaxy events carry exactly one
   bookmaker (`espn_public`); `MIN_BOOKMAKERS=2` makes all three scorers return null
   (`scoring.ts:385,637,818`). **Unsetting `THE_ODDS_API_KEY` today stops fresh pick
   generation** — the board would run on signal-slate fills only. Also latent:
   `scoring.ts:414,418,421` still fabricates −110 for price-less spreads, and this PR
   ships the first producer of price-less spread rows; one added keyless book flips
   that from unreachable to live invented-price. Remove the −110 fallbacks.
4. **MEDIUM — blocked hosts still fetched, no timeouts.** `site.api.espn.com` remains
   a fallback host and `sports.core.api.espn.com` is hit per event when inline ML is
   missing (up to 24 sequential calls, no AbortSignal) — contradicting the PR's own
   AGENTS.md rule; a blackholed host can stall the ingestion cycle.
5. **MEDIUM — fabricated freshness.** `espn-odds-client.ts:376` stamps
   `new Date().toISOString()` as the upstream `last_update`, which the normalizer
   trusts as the anti-tautology freshness signal — keyless rows always look fresh,
   hollowing the no-stale-data invariant on that path.
6. **LOW —** `certifiableForLiveGate:false` has no production consumer (and
   `GalaxySportsApiOddsProvider` itself has no production caller — the pipeline calls
   `fetchEspnOddsForSport` directly, and does so whenever the board is empty even
   WITH the paid key); de-vig `fair_prob` is produced but read by nothing;
   `americanNum` lacks the `|price| ≥ 100` guard; the props credit cap counts only
   successful calls.

**Revised sequencing (replaces the §4 "paste key" step):**
- **Keep the rotated paid key live for now** — it is paid through ~Sep 22 and is the
  only pick-minting odds source until Galaxy is fixed and cleared. Credits reset
  Sep 1.
- **hermes:** fix the abbr/full-name normalization bug + add the two missing tests
  (`fetchNormalized` rows; unpaid `processSport` with non-empty ESPN fixture); add
  fetch timeouts and drop/flag the blocked hosts; honest upstream timestamps (or mark
  the path exempt explicitly); remove the scoring −110 fallbacks; wire clearance once
  a registry entry exists.
- **founder:** rights call on ESPN `site.web.api` odds as a stored/displayed source
  (registry entry + counsel note per COMPLIANCE §6); review PR #680 with the findings
  above; decide props credit spend (`EVENT_ODDS_INGEST_ENABLED=true`, cap 8) before
  cancelling; only after Galaxy mints certifiable picks (or the pick-gap is accepted
  deliberately), unset the key on a preview, verify, then production.
- **Never-do additions:** no Rundown signup as kill switch; no `/api/cron/gamma` or
  CLOB (compliance hold, not tech debt); no book scraping
  (`draftkings-unofficial` forbidden); no invented timestamps; no Vitest UI /
  `npm audit fix --force`.
- The §4 "credit governor" scope narrows to: event-odds cap hardening (count
  attempts, not successes) + `x-requests-remaining` telemetry while the paid key
  lives.

Related PRs, none on main: #680 (Galaxy), #679 (Grok audit), #678 (sports-intel
orientation), #677 (this plan).

## 96-HOUR LAUNCH ORDER (2026-08-28 → Sep 1) — the executive sequence

**Live-probed 2026-08-28 05:43 UTC:** prod is deployed at current main (`bb0e7dfc0`),
DB healthy, **ingestion succeeded 5 minutes before the probe — the cron plane is
ALIVE** (the deck's RED scheduler unknown is resolved: green). One degradation:
**`settlement is critically behind on commenced picks`** — the T11 debt is live and
is the #1 blocker, because canonical history (C1) must not start accruing on top of
a corrupted settlement record. Launch day Sep 1 = Odds API credit reset day (fresh
20k). Decisions below are made; execute in order.

**DAY 1 (Aug 28) — merge, keys, drain**
1. Merge [PR #677](https://github.com/Beexly/Sports/pull/677) (docs/plan, green) and
   [PR #680](https://github.com/Beexly/Sports/pull/680) (Galaxy: twice-reviewed,
   spreads bug fixed, clearance-gated, all suites green, no gate flips). Redeploy.
2. Paste the **new rotated** `THE_ODDS_API_KEY` into Vercel Production env now so
   the Sep 1 credit reset lands on a working key. Verify `oddsKeyPresent` flips
   true on the truth surface after redeploy.
3. **Send the Kalshi written-authorization email today** (grant per Developer
   Agreement §3.1, internal derived analytics + display). $0; it unlocks the
   keyless second book whenever it lands — launch does not wait on it.
4. **Drain settlement debt:** authorized manual hits of `/api/cron/settle-picks`
   (overdue-first path) until `/api/health` settlement capability reads healthy.
   If a cluster won't settle, the free-path DISPUTED holds are the honest state —
   investigate only actual errors.
5. `npx prisma migrate status` against prod (P3): apply anything pending
   (proof-receipt/slate-commitment tables) with `prisma migrate deploy`.
6. Rotations while in the console: R-1 (~25 exposed Hermes creds), R-2
   (`JYNX_MODE=auto`), verify `CRON_SECRET` (401-without / 200-with).

**DAY 2 (Aug 29) — money path + C1**
1. Stripe LIVE cutover: six price IDs + live secret + webhook secret; endpoint at
   the **www** host subscribing ALL handled events **including `charge.refunded`,
   `invoice.paid`, `checkout.session.expired`**; lookup_keys attached; Dashboard
   ToS URL FIRST, then `STRIPE_TERMS_CONSENT_ENABLED=true`.
2. One **test-mode checkout end-to-end**, then live mode. This is the revenue
   lever; do not defer it to launch night.
3. With settlement healthy + migrations clean: flip **`CANONICAL_HISTORY_ENABLED=true`**
   (C1). Canonical accrual starts — every day earlier compounds the PROVEN clock.
4. Canonical host pair + Google OAuth www redirect URI + apex→www 301 verified.

**DAY 3 (Aug 30-31) — readiness + polish**
1. `node scripts/check-deploy-readiness.mjs` in deploy context → all green;
   `npm run smoke:prod` green; gate-flip-readiness run for the C3 predicate
   (seed rows purged, DEMO off, fresh ingestion, ≥1 publishable FREE pick).
2. Flip **`DERIVED_MODEL_HISTORY_ENABLED=true`** (C2) as soon as any sport crosses
   50 canonical games (MLB reaches it first at ~15 games/day).
3. Hermes polish lane: visual-qa pass over public routes (states / contrast /
   responsive), Elite alert env optional (WARN-only), remove scoring −110
   fallbacks, LQ18 `--prod` script if time allows (else the manual list below).
4. Arm off-stack monitoring: `HEALTH_ALERT_WEBHOOK_URL` + an external pinger on
   `/api/health` (free tier of any uptime service).

**DAY 4 (Sep 1) — LAUNCH**
1. Fresh credits land 00:00 UTC. Confirm an `IngestionRun` with `oddsInserted>0`
   and the freshness clock green.
2. Set **`FORCE_NO_BET_IF_STALE=true`** (defaults false — must be explicit), then
   flip **`PUBLIC_PICKS_ENABLED=true`** (C3) once gate-flip-readiness passes.
3. Manual launch smoke (until LQ18 exists): every public route 200 on www; apex
   301→www; `/api/picks` anonymous shows FREE teaser with `confidence: null`;
   a premium API 401s logged-out; one live checkout; `/api/health` green;
   robots/sitemap resolve.
4. **Stays OFF at launch, non-negotiable:** `PERFORMANCE_STATS` (Brier 0.2478 is
   RED — no accuracy claims until ≤0.22 + green×3), `PUBLIC_BLOG`, precision
   display, `PRICING_PHASE` (unset = FOUNDING), LIVE_BOARD certification claims.
   The launch story is the honest one: live board + picks + proof accruing in
   public. That story is stronger than a fabricated track record — and it is
   the only one the guardrails will let through anyway.

**Standing after launch:** watch `/api/health` + truth surface daily; C4 and the
rest of the ladder flip on proof, not on excitement; Kalshi grant → registry
verdict flip → keyless second book goes live; cancel The Odds API before the
~Sep 22 invoice only once Galaxy mints (or renew deliberately — $30 is cheap
insurance for month one).

## THE ALIGNED MASTER PATH v2 (2026-08-28) — new direction reconciled to the codebase

The product direction is now `docs/strategy/GREEN-BOARD-DOCTRINE.md` (Proof
Stack identity · GREEN/PRIME/RARE-AIR bands · probability-priced access ·
simplicity overhaul). This section reconciles it with the machine as it
actually exists and supersedes emphasis (not content) of the phases below.

### The finish line, restated
Founding members paying through probability-priced bands · the public record
accruing from day one with cryptographic receipts · Band Report Cards audited
monthly · PROVEN milestone → first ladder step → the only verified record in
the industry. Honesty rails unchanged throughout.

### Alignment corrections (fresh-eyes findings — binding)
1. **P-0, the foundation stone: the clean probability harvest.** Everything
   (bands, receipts, report cards) stamps the pick's calibrated p. Live
   confidence is a degraded market echo (0.2478 vs clean de-vig 0.2107,
   cross-model verified). Workstream: diagnose the divergence with GB-4's
   field mapping, then make pick probability = clean de-vigged consensus
   (independents only as bounded, logged adjustments). No band ships to paying
   users before P-0 lands.
2. **Bands are computed, never persisted.** No new enums/columns (schema law
   also forbids it). One mapping file: band → subscription entitlement.
3. **Guardrail evolution, not weakening:** extend claims scanners with an
   allowed vocabulary for probability-threshold band definitions + receipts
   language, with tests. Copy that states forward probability ≠ performance
   claim; scanners must learn the difference before Phase D copy lands.
4. **Receipts plank is ops-gated:** hero claims hash-commitment only after the
   pending prod migration runs and receipts mint (96h runbook Day 1).
5. **Two records, never confused:** GB-4 retro = internal evidence (Math Room
   at most, clearly labeled counterfactual). The PUBLIC record starts at zero
   on launch day. Publishing retro as track record = claims violation.
6. **Inventory dependency:** GREEN/PRIME need ≥2 books at high p — the paid
   key's Sep 1 credit reset is the launch supply line; Galaxy keyless + Kalshi
   grant remain the sovereignty track behind it.

### Build waves (who/what, in order)
- **Wave 1 (Hermes now):** dispatch GB-1..GB-5 + Phase D
  (`docs/ops/hermes/GREEN-BOARD-DISPATCH-2026-08-28.md`). Claude verifies GB-4
  clean-room. Founder runs the 96h runbook Day-1 items in parallel.
- **Wave 2 (post-retro):** P-0 harvest fix (specced from GB-4 diagnosis) ·
  guardrail vocabulary task · Band Report Card generator (monthly, from
  settled picks by band; no schema) · Daily Receipts draft generator (graded
  results → founder-publish social draft via the existing draft-only content
  pipeline) — the distribution organ.
- **Wave 3 (launch week):** Sep 1 minimum-loud-product: Proof Stack hero,
  five doors, welcome-video slot, GREEN/PRIME lanes computed, live record at
  n=0 ("Day 1 of the record"), receipts minting; Green Room + verify-UI and
  Calibration Wall trail within days, not gating launch.
- **Wave 4 (post-launch flywheel):** weekly selection-alpha review (realized
  vs expected per band → SITREP weight tuning, human-approved, never
  auto-flipped) · RARE AIR productization once GB-4/live data proves monthly
  supply · Elite alerts for The Drop · Kalshi grant lands → keyless second
  book live.

## 0. Verified baseline (run in this session, 2026-08-27, at bb0e7df)

| Check | Result |
|---|---|
| apps/web test suite | **11,770 passed / 97 skipped (879 files, 12 skipped)** — exit 0 |
| prediction-engine suite | **3,125 passed (282 files)** — exit 0, zero failures |
| ingestion-pipeline suite | 221 passed / 6 skipped — exit 0 |
| Workspace typecheck | exit 0 |
| trust-gate + claims scanners | GREEN (2,062 files scanned, no banned phrases) |
| `metric-source-payload-rights` / `metric-evidence-report-markdown` | **both PASS** |

**Correction to the record:** the "2 red drift tests on main" reported on 2026-08-27
came from a stale clone (`Sports-pr` behind origin/main). The rights-registry fixture
(19 source_ids) matches `apps/web/lib/scraping/source-rights-registry.ts` exactly, and
the shadow-evidence markdown matches its generator. **There is no drift to fix. The
full suite is green.** Any agent working from a local clone: `git fetch origin main`
before diagnosing failures.

**Second correction:** "`settleClv` = 0 hits → the repo has no CLV settlement" is
false at the capability level. CLV settlement exists under different names:
`gradePickClv` runs inline at settlement (`packages/ingestion-pipeline/src/settle-sport.ts`,
close fetch + grade + persist), a free-path equivalent lives at
`apps/web/lib/settlement/free-path-clv.ts`, `clv*` fields persist on `Pick`, a durable
`PostSettlementWork` repair queue drains stranded grades, and the Elite CLV ledger is
live code at `/track`. Do **not** re-implement CLV settlement. The real CLV work is
integrity (below, Phase 3).

**Third correction:** the `codex/intelligence-core` lineage (E1 replay/backtest, B2
shrinkage, D1 prop-anchor, KS/WO fixes, DATA1-4 nflverse 2025 currency) is **already
on main** — landed by squash/copy, so `merge-base --is-ancestor` says "not merged"
for branches whose content fully shipped. Do not "rescue" superseded branches
(`rescue/intelligence-core-2026-06-28` would REGRESS the Newton-Tweedie fix). The only
genuinely stranded engine pieces: `gse-score.ts`/`gse-method-spec.ts` on
`research/proven-edge` (product decision: port or retire), and kernel slot K11
(+ K1–K13 generally, never built).

## 1. What the finish line is

1. **Money path live** — Stripe live keys + correctly-configured webhook + one real
   checkout observed end to end.
2. **Data heartbeat live** — crons proven firing at cadence; odds ingesting under a
   credit budget; settlement + freshness green.
3. **Gate ladder walked** — C1→C8 flipped in order, each on its proof, with the
   stale kill switch armed.
4. **Proof surfaces honest** — CLV lock-provenance fixed and the 52.4% /
   ESTABLISHED machinery wired to real data before any public "proven" claim;
   Brier RED respected until green ×3.
5. **Fleet coordination clean** — one queue, ledger hygiene enforced, every agent's
   work visible.

Hard dates: **Sep 1 00:00 UTC** — The Odds API credits reset (see §4). **~Sep 10** —
NFL kickoff. **~Aug 28-29** — claimed Ox Alpha free-compute window close
(unverified from repo; founder to confirm before it drives prioritization).

## 2. PHASE 0 — Truth probes (do first; everything else keys off these)

The map surfaced five unknowns that no document can settle. Each is one cheap check:

| # | Unknown | Probe | Why it gates |
|---|---|---|---|
| P1 | Do Vercel crons actually fire at declared cadence? (21 sub-hourly schedules vs possible Hobby daily cap; Actions fallback idle) | Vercel dashboard cron logs, or DB recency: latest `JarvisSnapshot` hourly rows / `IngestionRun` timestamps | Every launch precondition rides the heartbeat; the launch deck calls this its one RED item |
| P2 | Does GitHub Actions CI run? (docs claim billing dead — Aug 22-23 merge wave may have landed unchecked) | Actions run history for PRs #578–#594 | Local suite is verified green (this session), but CI enforcement of guardrails is claimed, not proven |
| P3 | Prod schema vs 54 in-tree migrations (June proof-receipt/slate-commitment tables claimed still unapplied; DOD-1 recorded "53 migrations found and none pending" on 2026-08-20 — reconcile) | `npx prisma migrate status` against prod `DATABASE_URL` (founder hands) | Code paths touching missing tables 500 at runtime; C1 flip is unsafe before this is known |
| P4 | Prod env truth post key-rotation (gates, `oddsKeyPresent`, `CRON_SECRET`) | `GET /api/ops/public-surface-truth` + Vercel env list | R-3 aside, the key was **rotated 2026-08-27** — the env now holds a dead key until re-pasted |
| P5 | Stripe live account drift (six price IDs verified 2026-07-08, ~7 weeks old) | Resolve all six price IDs via Stripe API with the live key | The go-live checklist's bottom line rests on a stale verification |

## 3. PHASE 1 — Money path (founder-led; agents support)

**Founder (console/env):**
1. Paste six `STRIPE_*_PRICE_ID` vars + `STRIPE_SECRET_KEY` (live) + `STRIPE_WEBHOOK_SECRET`
   into Vercel Production. Note: `START_HERE.md` says "4 price IDs" — it is **six**
   (Fantasy monthly/annual too; `check-deploy-readiness.mjs` requires all six).
2. Create the webhook endpoint at `https://www.galaxysportsedge.com/api/webhooks/stripe`
   subscribing **all handled events** — the checklist's seven PLUS
   `charge.refunded`, `invoice.paid`, `checkout.session.expired`. As written, the
   checklist configures refund-revocation (H-K/F-2) permanently dark.
3. Canonical host pair: `NEXT_PUBLIC_APP_URL` = `NEXTAUTH_URL` =
   `https://www.galaxysportsedge.com`; add the www Google OAuth redirect URI;
   apex→www 301 at the DNS/platform layer.
4. Terms consent ordering: Stripe Dashboard ToS URL FIRST, only then
   `STRIPE_TERMS_CONSENT_ENABLED=true` (wrong order 500s every checkout).
5. Run **one checkout smoke** (test mode first, then live) — `CURRENT_STATE.md`
   calls this the largest revenue lever. Then watch for the first production refund
   in log-only mode and flip `REFUND_REVOKES_ACCESS=true` (F-2).

**Agents (code/docs):**
- Fix `docs/ops/STRIPE_GO_LIVE_CHECKLIST.md` + `OPERATOR.md` webhook event lists
  (add the three missing events) — the single highest-leverage billing doc fix.
- Extend `scripts/check-deploy-readiness.mjs`: resolve the two Fantasy price IDs
  against the Stripe API (now presence-only) and sanity-check the
  `STRIPE_TERMS_CONSENT_ENABLED` ordering hazard.
- Add a truth-surface field for Stripe env presence (mirroring `oddsKeyPresent`).
- Wire `evaluatePhaseAdvance` (`apps/web/lib/pricing/phase-readiness.ts`) to live
  metrics on an ops surface — today the FOUNDING→AUTHORITY ladder is checked by
  nothing that runs.
- Doc drift: correct the stale "picks are free" comment in
  `apps/web/lib/api-entitlement.ts`; refresh `GO_LIVE_RUNBOOK.md` Phase 5 (stale
  $19/$49 prices); repoint the CLAUDE.md pricing-doc reference to its archived path.

## 4. PHASE 2 — Data heartbeat (founder + agents)

**New facts (founder dashboard, 2026-08-27):** The Odds API paid **20K plan is
active** (started Aug 22, $30/mo) and **exhausted — 20,000/20,000 credits used in
~5 days**; the free key sits at 499/500. Both reset **Sep 1, 00:00 UTC**. Both keys
were **rotated on 2026-08-27**, so any env still holding the old values is dead.
This supersedes both older doctrines in the docs ("renew the paid key" vs "never
re-buy, free path only"): the paid key exists; the missing piece is **credit
governance** — ~4,000 credits/day at current behavior exhausts a month's budget in
five days.

**Founder:**
1. Paste the **new** paid key into `THE_ODDS_API_KEY` (Vercel Production) and
   **redeploy** (completes ledger R-3; same redeploy flips `contentPlanPrimary` off
   `cerebras_free`). Until Sep 1 the key has no credits — schedule the redeploy
   now; flow resumes at reset.
2. Watch TheRundown request log ~1h post-redeploy; confirm 429s stop (R-4).
3. Decide the scheduler (the deck's RED item): Vercel plan that honors 21
   sub-hourly crons, or restore Actions billing + secrets for the backstop.
   Verify `CRON_SECRET` is set (routes 500 without it).
4. R-1: rotate the ~25 Hermes .env credentials from the exposed transcript
   (approved 2026-08-19, still open). R-2: `JYNX_MODE=auto`.

**Agents:**
- **Build the credit governor** (new, from today's burn evidence): per-sport/per-cron
  credit budgeting, usage telemetry surfaced on the truth surface (The Odds API
  returns `x-requests-remaining` headers — record them per `IngestionRun`), an
  early-stop when the monthly budget pace exceeds plan, and historical-endpoint
  discipline (historical pulls cost 10×). Acceptance: projected monthly burn ≤ 20k
  at current cadence, visible on `/cockpit`.
- Regenerate `docs/ops/CRON_MATRIX.generated.md` (`node scripts/ops/cron-matrix-from-vercel.mjs`),
  fix the hand-written cadence table (says refresh-odds */30; actual */15), and wire
  the script's `--check` mode into preflight so 20-vs-21 drift can't recur.
- Per-sport freshness in `apps/web/lib/data-reliability/public-freshness-gate.ts`
  (documented KNOWN LIMITATION: one fresh sport masks another's staleness).
- Land H-M's data-driven early-return for off-season no-op crons (branch
  `hermes/h-m-cron-audit`).
- S-1: rights-registry classification for TheSportsDB (schedules/results redundancy
  only — explicitly not odds).
- Post-redeploy: authorized hit of `/api/cron/refresh-odds`, confirm an
  `IngestionRun` with `oddsInserted>0`, confirm `isMarketBoardOddsStale()` flips fresh.

## 5. PHASE 3 — Proof-engine integrity (the honesty core; blocks any "proven" claim)

The L-9 measurement (2026-08-19, 909 graded picks) found **909/909 lock prices have
no matching odds_batch rows — every lock appears model-derived** — and only TOTAL
clears 52.4% decided-only (58.5%, CI [52.8, 63.9]); MONEYLINE beat rates (2.9%/9.0%)
and 57/388 SPREAD sign-flips indicate capture defects. The Elite `/track` ledger is
live code rendering these numbers. **No CLV display expansion, no ESTABLISHED rung
claim, no pricing-phase advance until this is fixed.** This currently owns no card
in any deck — it does now:

1. **Founder:** run the blocked L-9 lock-provenance DB audit (JOIN
   `picks.lock_line/lock_price` vs `odds_batch`) — DB access is founder-only.
   Also: confirm `LINE_ARCHIVE_ENABLED` stays on (C-62 proved it writing 37,402
   snapshot rows) and run the C-62 recheck — **CLOSE-phase counts after the next
   settled MLB cycle** (0 CLOSE rows is a pending observation, not yet a bug).
2. **Agent:** capture-time lock guards + tests in
   `packages/ingestion-pipeline/src/process-sport.ts` (SPREAD sign vs published
   side; ML price plausibility |price| ≥ 100), quarantine flagged locks instead of
   grading them; add a re-grade lane mirroring `drainPendingClvGrades` for picks
   graded off a flagged lock; add a CLV backfill drain for settled picks with a
   lock, derivable close, and null `clvGradedAt`.
3. **Agent:** teach `deriveClosingSnapshotFromOdds` a close-source ladder — prefer
   `OddsLineSnapshot` CLOSE rows (per-book, distinct-countable, Pinnacle-preferring)
   over the current soft multi-book average; no schema change needed.
4. **Agent:** wire `evaluatePhaseAdvance` + sport×market CLV slices behind admin
   auth (the L-9 decomposition), so the 52.4% rung is a checked readiness verdict.
5. **Agent:** extend the historical backfill/harness to grade replayed picks
   against nflverse true closing lines (`spread_line`/`total_line`) — an
   out-of-sample beat-close curve the live soft close can't provide, feeding the
   promotion gate's CLV leg.

**Calibration lane (unchanged law, restated):** Brier 0.2478 is RED (floor 0.22);
RES ≈ 0.002 is market-echo; "do not claim PROVEN," do not flip PERFORMANCE_STATS,
maps, or AUTO_PUBLISH while RED. The recorded projection verdicts stand: model loses
to naive persistence on 18,344 OOS player-weeks — `canPublishProjections` stays off.
Work that moves it: densify independent probabilities (the named bottleneck),
C-59/H-F5 MVE one-shot re-run (founder `DATABASE_URL`), K11 kernel slot →
kernel slots K1–K13 → the real ML iteration through the existing Clark-West
purged/embargoed harness (`scripts/backtest/player-projection-backtest.ts`).

## 6. PHASE 4 — Gate flips (founder-only, in order, each on its proof)

Sequence per `START_HERE.md` C1→C8 with the map's corrections:

- **Before C1:** P3 migration status clean; T11 settlement-debt check (master
  handoff: flip only after settlement debt is drained so the first published
  record can't be corrupted); heartbeat proven (P1).
- **C1** `CANONICAL_HISTORY_ENABLED=true` — relabels NEW writes only, no backfill;
  the PROVEN clock starts at zero here. Accumulate 1–7 days.
- **C2** `DERIVED_MODEL_HISTORY_ENABLED=true` at ≥50 canonical games/sport —
  needs a measurement surface (agent: extend `scripts/lib/gate-flip-readiness.mjs`,
  which today only covers C3/C4).
- **C3** `PUBLIC_PICKS_ENABLED=true` **and explicitly set `FORCE_NO_BET_IF_STALE=true`**
  (it defaults FALSE in code — the stale kill switch is inert until set). The
  readiness script enforces: zero seed rows, DEMO off, fresh ingestion ≤240m,
  ≥1 publishable FREE pick.
- **C4** `PERFORMANCE_STATS_ENABLED=true` — sample bar met (~339 eligible) but
  **blocked by the newer bar**: Brier ≤ 0.22 + consecutiveGreen 3. The effective
  gate in code already requires eligibility GREEN + calibration published; respect it.
- **C5** featured promotion (needs a grade-threshold surface — agent work),
  **C6** calibration adjustments (path-to-70 §7 audit at the real sample),
  **C7** blog, **C8** precision display — in that order, never early.
- **Launch night:** run LQ18 `--prod` mode — **which does not exist yet** (the
  deck ledger overstates it; `scripts/launch-night-smoke.mjs` is still the 51-line
  local runner). Agent builds it per `CARDS_LAUNCH_QA.md:980-1046` before flip week.

## 7. PHASE 5 — Fleet hygiene (agents; cheap, prevents relapse)

1. **Ledger hygiene pass** (~1 commit): close provably stale rows (C-36 duplicate of
   merged H-F3; B-QUEUE/B-QUEUE-2 complete/superseded; F-8 mooted by C-62's proof
   the archive writes; narrow Q-FINAL to H-F5-only; fix H-N's squash-dropped DONE),
   and implement C-25's stale-row SLA in `scripts/ops/check-agent-ledger.mjs`.
2. **Queue unification:** AGENTS.md THE LOOP still routes agents to
   `docs/ops/hermes/BUILD-QUEUE-*.md` — two generations stale. Point it at
   `docs/data/LAUNCH_RUNBOOK.md` + `FLEET_DISPATCH.md` (+ this plan). Repurpose
   `docs/ops/MASTER_PLAN_INDEX.md` (near-copy of CANONICAL, not an index) into the
   real supersession index. Restore a live `LAUNCH_LEDGER.md` (START_HERE points at
   an archived-only file for the C1-C8 env block).
3. **Card-deck fixes:** renumber the SC1-SC10 collision (CARDS_SCANNERS vs
   CARDS_SHARE_CORE_WIRING define the same IDs; `line-archive-reader` exists as both
   scanners-SC3 and closing-line-CL6) before any fleet dispatch.
4. **Merges:** `hermes/l7-clv-forensics` (f87146bb — C-13 landed, merge is due);
   grok PRs #555→#556→#557 per FLEET_DISPATCH's sequence (union-resolve the barrel
   tri-conflict, one integration commit); the three Aug-26/27 hermes branches
   (`covariate-bus-pfeatures-frame-forecast`, `overnight-2026-08-27`,
   `sports-intel-orientation`) need ledger rows + an integration owner.
5. **Small opens:** C-19 label rename; C-27 quarantine note; C-18 S2S design doc;
   WO3 rate limits on the three unprotected `human/*` routes; platform-config
   phase-comment fix; OPERATOR.md cron cadence fix; CLAUDE.md Elite "real-time"
   copy (owner-approved); the trust scanners don't scan CLAUDE.md — agents copy
   claims from it, so fix the source.
6. **Uncovered domains** (critic): run the existing `audit-auth` skill over
   NextAuth/admin guards; trace Elite alert delivery end-to-end; verify the
   clearance-engine invariant (`checkClearance()` before every live extraction
   job); decide the workers/BullMQ story (CLAUDE.md claims Redis+BullMQ; prod runs
   on Vercel crons — document or retire).

## 8. Lane assignments (20K view)

| Lane | Owner | Queue (in order) |
|---|---|---|
| Console/env/DB (only hands that can) | **founder** | P1 P3 P4 P5 probes · Stripe cutover (§3) · new odds key + redeploy · scheduler decision · CRON_SECRET · R-1 R-2 · L-9 DB audit · C-62 recheck · F-9 review · C-59 MVE re-run · gate flips (§6) · counsel items |
| Grunt-work build seat | **hermes** | fetch fresh main FIRST (stale-clone correction) · K11 slot, then K1-K13 · LQ18 --prod · credit governor · lock guards + re-grade lane · close-source ladder · per-sport freshness · cron-matrix regen + --check wiring · H-M early-return · card-deck renumber · doc-drift batch |
| Review/integration/verification | **claude** | this plan · ledger hygiene + C-25 guard · queue unification · l7/grok-PR/hermes-branch merges · evaluatePhaseAdvance wiring · deploy-readiness extensions · audit-auth pass · verify every hermes deliverable against DoD before DONE |
| Dashboards | **browser** | R-3 confirm post-redeploy · R-4 TheRundown watch · Stripe webhook event-list verification · Vercel cron logs (P1) |

Ledger rules apply to every lane: claim before start, DONE needs a resolvable SHA,
UNPUSHED is not DONE, never edit a row you don't own.

## 9. Never-do list (unchanged law, restated so no lane forgets)

- No agent flips gates/env flags, touches `schema.prisma`/migrations, or runs
  migrations (AGENTS.md Laws 2/3/7). All flips and DB work are founder hands.
- No public "proven"/ROI/win-rate claims while Brier is RED and CLV integrity is
  open; the trust scanners + draft-only guard stay binding.
- Don't resurrect superseded branches (`rescue/intelligence-core-*`,
  `integration/proven-edge`, `gse/proven-*`); don't re-implement CLV settlement.
- Don't quote stale metrics (Brier/eligibility/settlement numbers are 17+ days
  old — remeasure, don't invent; test counts in START_HERE are stale, actuals in §0).
- Sportsbook CPA stays HARD_REFUSE; scraping stays rights-gated through the
  clearance engine; no evasion tooling, ever.
