# AGENTS.md — autonomous run contract

Auto-loaded by Grok Build, Codex, and Copilot at workspace root; Claude Code loads it through the `@AGENTS.md` import on line 1 of `CLAUDE.md`. Read this first, every session.

Repository rules live in `CLAUDE.md` and apply in full. This file governs how an
**unattended agent** works here.

---

## THE LOOP

**UPDATED 2026-08-20 — `handoff/LEDGER.md` and `docs/ops/hermes/CONTINUOUS.md`
below are FROZEN artifacts of an earlier session (last touched 2026-08-17/18).
They are not the live coordination system. Do not resume work from them.**

The live, multi-agent ledger — shared by Hermes, Copilot, the browser agent,
and Claude sessions — is **`docs/ops/AGENT_LEDGER.md`**. It is validated by
`scripts/ops/check-agent-ledger.mjs` (real exit code — never pipe it away) and
enforced in CI. Read its own "Rules" section before touching a row: claim
before starting, never edit a row you do not own, `DONE` requires a
resolvable commit SHA or `#PR`, `UNPUSHED` if you cannot push.

**UPDATED 2026-09-03 — `docs/ops/AGENT_LEDGER.md` is LIVE and current
(142 rows: 27 OPEN / 2 CLAIMED / 4 BLOCKED / 102 DONE / 6 CANCELLED, guard green).
LQ-tagged work is additionally tracked in `docs/data/FLEET_DISPATCH.md`.
Read both before claiming; a task already dispatched there is not free.**
**Verified-fixes note:** the C-64..C-70 dual-audit batch lives on
`claude/verified-fixes-2026-09-03` (draft PR #689) — check whether it merged
before re-fixing anything from that list. The ledger guard now also prints
SLA warnings: a CLAIMED row with no evidence or an OPEN row with evidence but
no owner will be called out on every guard run — resolve or re-own them.

**UPDATED 2026-09-06 (16:40 UTC): PROVEN IS NOT CLOSE. Calibration eligibility reads RED on
production and F-36's precondition cannot be met on current data. Do not wait for a publish
receipt and do not flip anything.** Measured read of
`/api/ops/public-surface-truth` `calibrationEligibility` at 16:38:22 UTC, generatedAt from the
surface itself: status RED, `consecutiveGreen` 0 of `streakRequired` 3, reasons
"Settlement not healthy" and "ECE 0.0524 > 0.05". The other three floors pass
(n 458 against 100, Brier 0.1926 against 0.22, Murphy reliability 0.0053 against 0.05), but
do not read that as three pieces of corroborating evidence: measured 17:09 UTC and derived in
`docs/ops/CALIBRATION_GATE_SCALE_2026-09-06.md`, the Brier floor is cleared by a constant
base-rate forecast with no skill at all (uncertainty alone is 0.2139 against the 0.22 floor)
and the Murphy reliability floor averages SQUARED per-bin gaps against the same literal 0.05,
so it permits a 22.4-point RMS gap where the ECE floor permits 5.0, a 4.47x difference in
strictness. Murphy reliability is still a real calibration constraint, just a far looser one:
ECE is the only floor that BINDS here, and it is the one that fails. CONFIRMED 19:08:42 UTC: the settlement reason HAS cleared and RED now reads
"ECE 0.0524 > 0.05" alone. overduePending is 0 of 2627 commenced picks and stalePendingPicks
is 0, so C-106 is DONE (the zero-sit lane voided the last two phantom-fixture picks through
the outbox at 19:07:18 UTC with rcaCode FIXTURE_NOT_FOUND; ledger row has the ids). n, Brier,
Murphy and ECE are unchanged at 458 / 0.1926 / 0.0053 / 0.0524, consecutiveGreen still 0 of 3.
ECE does not clear on its own, and nothing that has happened today moved it.

Two things this corrects in the record above. First, the 2026-09-05 19:05 UTC note that "all
four floors pass today" was measured on the receipt-only sample (n 115 after the soccer
exclusion, ECE 0.0440). C-110's single-book resolution has since grown the sample to n 458,
and on that fuller, more representative sample ECE reads 0.0524. That is not a regression: it
is the honest number emerging with more data, and it is the number the gate reads. Second,
the pooled figure flatters. Every individual model version measures WORSE than the pool:
v5.2.7 (the current one, n 245) ECE 0.1089, v5.2.6 (n 110) 0.0587, v5.1.0 (n 74) 0.0729,
v5.0.0 (n 29) 0.1531. State that carefully: what is MEASURED is that the pooled value sits
below every stratum it is built from. `expectedCalibrationError` stores weighted ABSOLUTE
per-bin gaps, so these numbers do not by themselves demonstrate that signed errors cancelled
across strata; that is a plausible mechanism, not an observed one, and proving it needs an
aligned per-bin decomposition nobody has run. The actionable part does not depend on the
mechanism: whatever produces it, 0.0524 is the pooled figure and the deployed v5.2.7 measures
0.1089 on its own 245 rows. Publishing a PROVEN claim off the pooled number while the version
actually serving traffic measures more than twice the floor is exactly the kind of thing this
product's premise forbids.

By sport, only ONE stratum has the sample to support a conclusion. MLB n 365 ECE 0.0501, hit
0.649 against meanP 0.648: essentially calibrated, and it carries the pooled figure. The other
two are small-sample and illustrative only: NCAAF n 65 ECE 0.1123, NFL n 28 ECE 0.267. Do not
read a direction off those. An ECE spread across ten confidence bins at n 28 puts roughly three
picks in a bin, so both the magnitude and the sign are dominated by sampling noise; an earlier
draft of this note called the two football books "under-confident, the safer direction to be
wrong in" and that inference is not supported by n 28 (cubic, PR #715). Anyone acting on this
should treat MLB as the measurement and treat NCAAF and NFL as too thin to steer by until they
have real rows. No agent should touch thresholds, floors or the engine to move any of this:
law 9 forbids weakening the guard, and the engine is frozen under MODEL_VERSION. The levers are
more settled rows and a real calibration pass, both founder-gated.

**UPDATED 2026-09-06 (05:00 UTC): tonight's build is on `claude/sports-prediction-launch-rtiexc`
(four code commits `b4885f214`, `3359e072a`, `23a0a3a0f`, `f06be6b31`; typecheck 0, lint 0,
guardrails 26/26, five adversarial reviews approved).** C-109 credit governor DONE, C-110
single-book market p DONE (basis `market_anchored_v2`, one streak reset on the 08:40 UTC run
by design), C-111 fixture guard DONE, FE-05/10/15 DONE, C-107 display half landed (the
IMPLEMENTED flip and MODEL_VERSION v5.2.8 wait for the first clean NFL Sunday, 2026-09-13).
C-106 zero-sit lane is CODE-COMPLETE and flips to DONE when the truth surface reads
overduePending 0 and stalePendingPicks 0 after the first settle cycle post-deploy. Hermes:
merge `origin/main` after this lands; your work is C-104 (WP-27), nothing in this batch.
The open founder acceptance: the public calibration claim was reworded to "The calibration we
measure ourselves on is ..." because the /calibration chart still buckets by confidence
(`apps/web/lib/calibration/compute.ts`, `BUCKETS` and `bucketFor()`); accept it or open a row
to re-scope that chart.**

**UPDATED 2026-09-06 (03:30 UTC): F-15 is DONE and #709 is merged as `c3d955c2c`.** The
browser agent rotated the 20K key, set `THE_ODDS_API_KEY` in Vercel Production and redeployed
(Ready 02:37:12 UTC); no 402 after the rollover, dashboard usage 0 to 112 credits in 21
minutes, `oddsInserting` back to 242 rows a cycle. Three findings, all in plan section 3f and
ledger C-109..C-111: (1) **credit cliff**: at the observed rate the 20K plan exhausts around
2026-09-08, at the schedule-implied rate around 2026-09-11 (NFL Week 1 kickoff); `settle-picks`
runs five times an hour (the :20 cron plus the autonomy cycle) and the paid scores spend
guard logs "not justified" then proceeds; **C-109 is coder priority 1, ship before
2026-09-08 00:00 UTC.** (2) **The 16 overdue picks are two cohorts and neither self-heals**:
10 MLB spreads on city-only game rows refused every cycle as `SCORE_MISMATCH_CROSS_PATH`
(void lane, C-106, priority 2) and 6 NCAAF picks on phantom fixtures absent from ESPN's
2026 schedule, which the signal slate generated on yesterday (C-111, priority 3).
(3) **Calibration**: n 223, ECE 0.0553, bootstrap CI 0.0365 to 0.1142; the soccer exclusion
works (120 excluded); more real rows is the lever (C-110 single-book recompute, priority 4).
Floors, bins and streak unchanged. Coder order: C-109, C-106, C-111, C-110, C-107,
FE-05/10/15. Hermes: `hermes/finish-line-2026-09-05` (tip `0dd81273f`) lacks `main`, merge
`origin/main` first (merge-tree clean); the Odds API shell steps it proposed (key via
`vc env get` or `vc env set`, key in a curl URL) are forbidden and moot; its Week 1 work is
C-104 (WP-27, OPEN, unowned); its auxiliary reviewer model has a 32K context, below the 64K
it needs. Browser agent: scripts A, C, E done; B (alerting) and D (checkout) skipped by
founder decision; the two public flips remain for a later prompt.**

**UPDATED 2026-09-06 (02:15 UTC): PR #707 is MERGED to `main` as `cff3e72d7` and deployed
(the truth surface reports that SHA). Score 60 of 100; the measured path to 100 with owners
is plan section 3e. Founder instruction: no human step where a machine can do it; console
steps go to the Claude browser agent via the scripts in 3e. Coder priorities, in order:
WP-29 (C-106, stale picks automated), C-107 (display label and claim, IMPLEMENTED flip,
MODEL_VERSION v5.2.8), FE-05/FE-10/FE-15 copy. The calibration streak runs on its schedule
and the publish receipt is automatic at streak three; the public flips are two Vercel
variables (`PERFORMANCE_STATS_ENABLED`, `PRICING_PHASE=PROVEN`) after that receipt AND
C-107 are live. Hermes merges `origin/main` before opening its PR.**

**UPDATED 2026-09-05 (18:20 UTC) by the launch session on `claude/sports-prediction-launch-rtiexc`
(PR #707, since merged). Read `docs/ops/LAUNCH_FINISH_LINE_2026-09-05.md` before claiming
anything: section 3b holds eleven decisions the founder delegated in-session, section 4 the
founder-only actions, section 5 every dispatchable work package (WP-1..26, FE, FAN, NFL, OPS,
TCI, SEC) with entry files and acceptance commands. Ledger rows C-80..C-103 and F-14..F-33.**

- **F-15 DONE 2026-09-06 02:37 UTC (browser agent).** The account was never unpaid: the 20K
  plan is Active ($30 a month, next invoice Sep 22) and the HTTP 402 "payment circuit open"
  since 2026-09-03 20:20 UTC was a stale production key. The key was rotated, set in Vercel
  Production and the redeploy reset the process-local breaker. Book odds flow again. The
  open risk is now spend, not access: C-109 (plan 3f item 1). Nobody pastes a key anywhere.
- **Second book root cause (2026-09-05 production logs, verbatim):** every refresh cycle,
  all four in-season sports log `rundown empty (2d): HTTP 429 rate_limited`. TheRundown is
  the registered commercial-use fallback (`packages/data-ingestion/src/source-registry.ts`
  id `therundown`, free 20k data-points/day) and it alone satisfies `MIN_BOOKMAKERS = 2`;
  our own cadence (refresh-odds every 15 min plus board-fill 4x/h, 4 sports, 2 dates, no
  cooldown after a 429) exhausts its daily quota early and it 429s for the rest of the day.
  ESPN public (`espn_public`) is one book (DraftKings via ESPN, verified live for NFL, CFB,
  MLB, MLS), so no picks can be book-priced without a second cleared source.
- **The completely free two-book board is already designed in this repo (WP-27, ledger
  C-104). Founder position, verbatim from the Hermes brief on PR #680: "we are the provider
  (Galaxy Sports API). Not Rundown. Not The Odds API."** Book 1 is ESPN inline odds through
  `GalaxySportsApiOddsProvider` (PR #680 branch `hermes/galaxy-keyless-odds`, de-vig
  formula, 8s timeouts, registry entry `galaxy-espn-inline`). Book 2 is Kalshi exchange
  quotes as a real bookmaker (`galaxy-kalshi-book.ts` on that branch) fed through the
  PredExon catalog (`packages/data-ingestion/src/predexon-client.ts` on main, verdict
  use-with-caution, free key the founder already holds, `PREDEXON_INGEST` default OFF),
  which is the legal route around Kalshi Dev Agreement section 3. Kalshi lists
  `KXNFLSPREAD` and `KXNFLTOTAL` (`kalshi-series.ts`), so NFL spreads and totals are
  reachable, not only moneylines. Nothing on main consumes PredExon yet: that wiring plus
  re-landing the #680 core is the work. TheRundown is at most a bridge (WP-26), not the
  product path.
- Decisions already taken (do not re-open): the keyless Galaxy Sports API becomes primary
  with Kalshi via PredExon as the second book (WP-27); v5.2.8 YES sequenced after the first clean NFL Sunday; stale
  published picks are UNPUBLISHED via `npm run ops:stale-picks:unpublish -- --execute`
  (owner-run); ESPN Power Index is gated fail-closed (`ESPN_POWERINDEX_LICENSED` unset);
  `hermes/settlement-token-fix` is superseded by `6880f18` (do not merge it); Vercel cron
  is the primary scheduler; `/picks` is the product surface; the `/fantasy` age gate stays.
- **Coordination with `hermes/finish-line-2026-09-05` (verified against the remote 2026-09-05
  18:55 UTC):** that branch is stacked on top of the #707 branch at `6a9c092f7` and merges
  cleanly with the #707 tip (`git merge-tree` reports no conflict). SEC-01 (`fe42773bd`) and
  SEC-02 (`96ab46d27`) are on the remote; ledger C-102 is owned by hermes (CLAIMED), do not
  edit that row from another branch. **Update 2026-09-06 00:10 UTC (verified against the
  remote):** the Hermes tip is `5fa7c88d0`; SEC-03 (`dbb49850b`, `7bc9508d5`, `8014c67c8`)
  plus its repair (`3efb1634d`, the half-applied `contests/enter` edit is finished), SEC-04
  (`30b238e12`) and SEC-05 (`e60f887a9`) are on the remote. It also carries C-108
  (`99ff4d545`, an OpenRouter free lane for the Claude API router), which edits
  `.env.example`: law 2 freezes any `.env*` for agents, so the founder accepts that hunk
  explicitly or Hermes moves the variable documentation to `docs/ops/OPERATOR.md` section 5.
  `git merge-tree` of the Hermes tip against the #707 tip (`0fb97ab36`) is still clean.
  Landing order unchanged: #707 first, then Hermes merges
  `origin/claude/sports-prediction-launch-rtiexc` (WP-27, the calibration pass `fbc3784c7`)
  into its branch before opening its own PR.
- **PROVEN is days away, not weeks (measured on production 2026-09-05 19:05 UTC, read-only
  SQL):** on settled MONEYLINE picks that carry a receipt, the market-anchored probability
  reads n 150, Brier 0.1692, Murphy REL 0.0050, ECE 0.0552 (ten bins). Excluding soccer
  two-way moneylines (wrong by construction on a three-way market; the engine already refuses
  to publish them), the same sample reads n 115, Brier 0.1444, ECE 0.0440, Murphy REL 0.0044:
  **all four floors pass today.** Founder approved the source switch and cron triggering at
  19:20 UTC. 610 more settled moneyline picks have no
  receipt but their publish-time market probability is recomputable from the append-only odds
  table with zero writes (WP-28, C-105). The eligibility streak is three consecutive green
  runs of a six-hourly cron. Shipped in `fbc3784c7` on the #707 branch: the
  measurement side of WP-1, WP-28 and the drift alert (receipt-first scoring, MONEYLINE-only
  pooled floors, basis-aware streak). Receipts carry a mean-implied proportional de-vig, not
  Shin-median; the proposal wording now says so. Remaining: C-107 (display label and claim
  copy, then the IMPLEMENTED flip and MODEL_VERSION v5.2.8),
  restore the book-priced flow, streak, founder flips `calibrationPublished` and the PROVEN
  pricing phase (F-36). Plan section 3c.
- **No pick ever sits (founder policy 2026-09-05):** graded, voided with an RCA reason through
  the settlement outbox lane, or unpublished. WP-29 (C-106) automates it; the owner tool
  handles today's 20 stale rows once.
- Settlement CRITICAL (36 overdue) root causes are fixed on the PR branch, not on main:
  ESPN `limit=1000` truncation, matcher containment on 2-3 letter abbreviations and bare
  club tokens, overdue-only runner slice, backfill date order. Do not re-fix them; land #707.

**UPDATED 2026-09-06 — External repo leverage audit complete; nothing installed.**
Two rounds independently fact-checked (license fetched raw, real commit history, not
star counts) a set of MCP/RAG/code-graph/agent-memory repos for GSE/GSN fit. Full detail:
`docs/ai/airwave/GSE_GSN_REPO_LEVERAGE_AUDIT_2026-09.md`. Nothing was installed, no schema
changed, no account created — every item needs the founder personally, per Law 2 (frozen
`package-lock.json`/`packages/db/prisma/**`), Law 7/8 (no autonomous package installs), or
because it needs an external account an agent can't create. A same-session attempt to add
`@playwright/mcp` to `.mcp.json` was denied by this session's own tool permissions, not by
AGENTS.md — confirming even the lowest-risk item on the list needs a human hand on it.
Founder-only next actions, fastest-value first: (1) add `@playwright/mcp` to `.mcp.json`
for supervised console-step 2FA/SSO (never for unattended autonomous browsing — still
gated by the clearance-engine rule same as any extraction); (2) Helicone free-tier signup
+ Claude-API proxy URL swap (LLM cost tracing, zero new dependency); (3) approve
`npm install @orama/orama` (local search — the single most-requested item across the prior
audit's own domains). Do not approve mem0 AND mcp-memory-service together — two competing
agent-memory stores is a regression, not a leverage gain. **Round 3 landed same-day**:
a broader, six-area exploratory sweep (same doc, new section) — highlights: the
TheRundown 429 incident has a free, no-new-vendor fix (a Redis daily-quota counter GSE
already has the connection for); a real CC-BY-4.0 nflverse-equivalent exists for
NBA/NHL (`sportsdataverse-data`) and a real negative finding for soccer (`worldfootballR`
archived, no replacement); visual-regression testing for the ~30-route cockpit needs
zero new dependencies (Playwright's built-in `toHaveScreenshot`); and `NVIDIA/openshell`
could make this file's own frozen-path/no-install/no-gate-flip laws machine-enforced
instead of honor-system. Nothing in Round 3 was installed either — same founder-only
posture as Round 2. **Round 4 added a design reference, not a repo**: a founder-shared
bitemporal memory-repair pattern that is now the strongest available citation for the
Airwave `claim-consistency-check.ts` work (supersedes NanoIndex) and directly targets
the dormant `Entity`/`EntityEdge`/`Signal` schema — see the doc for the open question
it raises about `Signal.capturedAt` semantics before that gets wired up.
**Round 5 (same day): eleven of Round 1-2's repos re-verified at the source-code level**
(cloned fresh, exact files/lines cited, not README/license-level like Rounds 1-2) —
several prior recommendations are corrected, not just deepened. Highlights: Helicone
should run in **Async** logging mode, not the proxy-URL-swap Round 2 recommended (Helicone's
own docs mark Proxy mode as on the critical path — an outage there fails live Claude calls
outright); Langfuse's SDK is a different repo (`langfuse-js`) with a different package name
(`@langfuse/otel`, not `langfuse`) after a full OTel-based rewrite; **cut `Stevenic/vectra`
entirely** (no cross-process concurrency control — a real lost-update race, not just "less
durable" than Postgres); Orama's "sub-2KB" tagline is false (measured 63-77KB) and it has no
ANN index at all, fine for small static corpora, wrong for growing semantic search where
Neon's own pgvector is the better fit; `mem0` is usable only as retrieval plumbing behind
GSE's own `write-gate.ts` (every mutating call commits synchronously, no pending state);
`pg_bitemporal`'s real design is a shadow-table + stored-procedure API, not triggers, and
its portability to `EntityEdge` needs real rework for the compound `cuid` key; the
`typescript-language-server` MCP bridge is now sized (~300-600 lines, days not weeks), with
the real risk being silent under-reporting on this repo's own 24-tsconfig-file shape, not
the wire protocol. Full detail and citations in the doc's Round 5 section. `@ast-grep/cli`'s
deep dive **stalled** (~2h50m hung on an `npx` registry install in this sandbox, stopped
rather than left running) and was not completed — Round 2's original finding (BLOCKED, new
dependency, `allowScripts` needed) stands, un-re-verified at the source level. See the doc's
addendum. **Round 7: 12 deep-code-dives on the Round 6 sweep, two consequential findings.**
(1) GSE already built a complete, tested `henrygd-ncaa` adapter with dual-source consensus
checking — it's fail-closed pending one `source-rights-registry.ts` entry
(`GSE-SEC-050`), not missing. The dive fetched NCAA.com's live ToS directly and found
explicit commercial-use restriction language on "statistics, updated scores" — the correct
classification is `permission_required`, matching Kalshi/ClubElo/scores24.live precedent, not
`approved_public_logged_off`. Not added to the registry autonomously (a legal/compliance
call), but the exact entry is fully drafted in the doc. (2) GSE's three real ESPN client files
(`espn-schedule-seed.ts`/`espn-results-client.ts`/`espn-odds-client.ts`) never call
`assertIngestible()` at all — confirmed by grep — so `source-registry.ts`'s `espn-hidden-api:
forbidden` verdict (with a passing test asserting it throws) has zero effect on the ESPN
traffic GSE actually generates; production runs under the other, more permissive registry's
posture unchecked. One document disagrees with the running code, not just with the other
document — a founder/legal item, independent of Round 6's original registry-disagreement
flag. Also confirmed GSE's own prediction/calibration engine is ahead of every betting-math
repo checked (Shin devig, robust Kelly, PAV/IVAP/CVAP, purged-embargoed walk-forward, real
timing CLV) — no gap, a reassurance. One idea was concrete enough to build:
`apps/web/lib/market/shop-advantage.ts`, a pure "shop vs. edge" probability-delta function,
deliberately left unwired pending a product decision on placement/wording. Full detail in
the doc's Round 7 section. **Round 6 (founder-sourced, live-tested): 14 more repos.** Real finding independent
of any repo: GSE's own two rights registries disagree on ESPN's status
(`packages/data-ingestion/src/source-registry.ts`'s `espn-hidden-api` = forbidden vs.
`apps/web/lib/scraping/source-rights-registry.ts`'s `espn-public-api` = approved,
`commercial_display_allowed: false`) — worth a founder/legal look. `ParlayAPI`'s keyless
endpoints were called live, not read from the README: the real one (`/v1/widget/odds`) is
genuinely live NFL data but h2h-only at 60 req/hour (too thin for GSE's cadence); the
similarly-named `/v1/sandbox/...` endpoint returns equally plausible-looking data that its own
docs say is synthetic — a real trap if integrated from the README alone. `sofascore.com`
returned a verified HTTP 403 on a plain robots.txt fetch (real anti-bot control, not a guess);
`api-football.com` stayed unverified after three independent attempts, reported honestly as
open rather than guessed. `multiplex-invertsoap119/polymarket-sports-arbitrage-bot` is
excluded outright, not just deprioritized — it touches Polymarket, which
`.claude/skills/polymarket-hold/SKILL.md` puts under a counsel compliance hold. Nine of
fourteen repos (course material, meetup demos, near-empty repos) got a second, closer look per
founder instruction and still had no realistic adoption angle — verified, not assumed. Full
detail in the doc's Round 6 section.

**Round 8 (same day): 13 sports-specific external repos** (MCP servers, ESPN/odds clients,
Kalshi tooling, betting math, fantasy platforms) — all cloned and read at the source level, all
live-data claims tested directly. Highlights: `Backspace-me/sportscore-mcp` is a vendor SEO
vehicle requiring a mandatory unwaivable attribution badge, not neutral OSS — treat as
`permission_required`, not free; `pseudo-r/Public-ESPN-API`'s live-tested endpoints confirm
GSE's own ESPN odds parsing hits the right shape and document the same free pattern already
live for NHL/tennis/UFC/F1, sports GSE doesn't yet ingest; `sportsdataverse/sportsdataverse-js`
does **not** solve the NCAA rights problem (it scrapes NCAA.com directly under a different
wrapper, and its NCAA endpoint 404s in production today) — the real unlock, if any, is the
separately-licensed `sportsdataverse-data` (CC-BY-4.0) dataset, untouched by this library;
`machina-sports/sports-skills` and `TexasCoding/kalshi-python-sdk` corroborate WP-27's premise
(Kalshi market-data is genuinely keyless, `KXNFLSPREAD`/`KXNFLTOTAL` are real live series) and
surface two edge cases to check against the unmerged `galaxy-kalshi-book.ts` branch: one
contract per strike line, not one line-and-price pair, and four distinct expiration timestamps
that can diverge; `jdguggs10/flaim` is a mature, production Yahoo OAuth2 reference (token
refresh-lease/cooldown/app-fingerprint logic worth adapting; its plaintext token storage is
not); and `x402-fpl-api` confirms x402 (a real, Stripe-backed Linux Foundation payment
protocol) is genuinely implemented in-repo, worth the founder's awareness for a future
"Galaxy Sports API" monetization surface, not a build-now item. Full detail in the doc's
Round 8 section.

**Round 9 (same day): the same lens turned inward — 8 parallel read-only audits of GSE's own
codebase**, not external repos, per founder instruction to find what to add/what's missing/
what to polish. Three findings stand out. (1) A full calibration-regression detector
(`calibration-monitor.ts`/`regression-detector.ts`, Brier/RES baseline comparison) is built and
unit-tested but its DB-backed data feed (`calibration-regression-snapshot.ts`) has zero callers
in any cron route — a live regression today raises no alert anywhere; the math is done, only
the wiring is missing. (2) GSE already has a real, working Sleeper league sync
(`sleeper-sync.ts`) and a real, working League Twin visualization
(`fantasy/league-twin.ts`) with a tested live-data seam already built — but the synced roster
is never passed into the Twin, so `/fantasy/league-twin` shows illustrative sample players even
after a user connects their real league; a projections join is the remaining gap, not a stub.
(3) `workers/content-publishing` has zero callers anywhere (confirmed by grep) despite CLAUDE.md
calling it "hard-gated" — the real draft pipeline bypasses it entirely — and the fully-built
weekly transparency-recap draft template appears to generate a `DRAFT` row every week that
nobody has ever reviewed into publication. Also found: two dead/duplicate systems needing a
founder look — `.claude/skills/clearance/` and `clearance-registry/` are duplicate skills that
have already drifted out of sync (the same failure mode as the code-level rights registries,
now in the skills docs describing them), and `packages/partner-stack` contains a second,
competing Stripe-tier resolver with placeholder price IDs that would violate rule 3 if anyone
ever imported it believing it authoritative. Four of the seven packages CLAUDE.md calls
dormant (`epistemic-twin`, `quote-plane`, `governed`, `crypto`) are corrected in the doc as
actually live in production; `genesis-kernel` is confirmed *deliberately* unwired by its own
CI-enforced structural tests, not neglected. Nothing built autonomously this round — every item
is either purely additive tooling for the owning domain agent or a founder-decision item. Full
detail in the doc's Round 9 section.

**Round 10 (same day): new categories — play-by-play/win-probability models, betting exchanges,
injury data, distribution.** Most directly actionable round yet; three small, single-adapter
tasks are now scoped needing only a free API-key signup, no schema change, no founder rights
call beyond that. (1) `nflverse/nflverse-data`'s compiled play-by-play releases (win probability,
EPA) are **CC-BY-4.0 licensed**, confirmed by reading the full license text — attribution-only,
no non-commercial clause — and live-tested as real 2025-season data pulled via a plain HTTP GET.
A thin adapter here gives GSE a genuine third probability signal (alongside the factor model and
market-implied probability) for the internal drift/QA gap Round 7 already flagged. (2) CFBD's
own REST API — the same `cfbd` source `cost-policy.ts` already references — already returns
pre-computed EPA (`ppa`) and win probability as JSON, confirmed by reading `cfbfastR`'s source
(a thin wrapper around those exact endpoints) and live-testing the API directly; the CFB
equivalent may need only a thin adapter, not new licensing. (3) MLB's official Stats API
(`statsapi.mlb.com/api/v1/transactions`) is live, keyless, and directly portable into an injury
adapter — GSE ships zero player-availability signal for MLB/NBA/NHL/MLS today. NBA's official
injury-PDF source is equally clean rights-wise but unreachable from this sandbox (Akamai
mitigation, not a rights problem); `balldontlie.io`'s injury endpoint is confirmed paid-gated
and Big Balls Data's NBA/NHL feed is confirmed dead by its own current docs — both ruled out with
direct evidence, not assumed. Two non-buildable-now findings, still useful: ProphetX and Novig
are real, CFTC-verified (via CFTC.gov's own filings) sports exchanges, but both gate API access
behind an approval/sales process, not a fit for the free-first board today. And one genuinely
different lever — a Discord bot posting GSE's Free-tier daily teaser, sketched against a real,
validated precedent (a comparable bot, BettorEdge, confirmed live in 1,100+ servers running the
same free-picks-plus-leaderboard shape) — a founder marketing decision, not built. Full detail
in the doc's Round 10 section.

**Round 11 (2026-09-06/07): GSE's own dev-process pain point — 10 multi-agent coding-
orchestration repos.** Headline finding: **GSE's own ledger (claim in the same git commit) is
already more rigorous than most of what's out there.** `code-conductor`'s "atomic" claiming is
actually an unlocked race (contradicting its own docs), and its install path suffered a real
supply-chain compromise in March 2026; Podiom and `taskq` both lack a compare-and-swap guarantee
GSE's git-push atomicity gets for free; `deepseek-ai/deepseek-harness` (verified real) is the one
genuine exception, with a revision-CAS primitive worth borrowing as a guard-script idea (reject a
merge introducing two `CLAIMED` owners in one diff hunk). `mission-control` is a real, substantial
project (1,577 tests run directly, genuinely heterogeneous 5-runtime dispatch) but its review gate
is one LLM judging another's output via string-matched verdict parsing — named as a real risk if
that pattern were ever applied to anything touching settlement/entitlements/PROVEN-gate decisions.
`agentjj` and `Agent-Git` (agent-native VCS tools) are both honest negatives: agentjj's own latest
commit is a post-mortem admitting its core model breaks under exactly GSE's shape (parallel
writers, single-writer working copy); Agent-Git never touches git at all. `gitagent-protocol`
requires files GSE doesn't have to even count as conformant — low priority, revisit later; its one
real transferable idea is a lightweight schema/validator for `.claude/agents/*.md` frontmatter.
Nothing installed, no repo recommended as a dependency. Full detail in the doc's Round 11 section.

**Round 12 (2026-09-07): creative-fit pass on founder-sourced items, integrate where real.**
One thing actually built and shipped: `apps/web/lib/fantasy/td-equity.ts` — three pure, tested
functions (goal-line QB "vulture" risk, touchdown scoring-distance profile, defensive red-zone
soft spot) replacing three LLM prompt templates that were circulating as "AI fantasy analyst"
prompts for the same three real, quantifiable questions — deliberately unwired pending real
play-by-play (the Round 10 nflverse/CFBD path). Two real repos researched deeply, not buildable
without a founder-approved new dependency: `claude-faceless-shorts-creator`'s Remotion track is
genuinely 100%-code-rendered (verified in the actual composition source) and could turn the
already-built-but-never-published weekly transparency-recap draft into a short, auditable video —
its other two tracks are generative-AI content and must never be adopted; `CopilotKit/openbot`'s
"decide before, record after" audit gate is real and load-bearing but solves a harder problem than
GSE's actual one-agent scripted-playbook need — the pattern itself (log the decision before
acting) is buildable today with zero new dependencies. A final set, researched for genuine
leverage rather than written off: Appsmith's Community Edition is verified genuinely free
(Apache-2.0, self-hosted, no user cap) — real, low-cost leverage for the "no unified ops-health
view" gap this audit has now flagged twice independently, though it needs new self-hosted infra;
Google's TimesFM-3 required a correction the marketing clip didn't carry — its code is Apache-2.0
but its **pretrained weights are Non-Commercial-licensed** (verified from the model's own LICENSE
file), so a revenue company cannot run it even for internal QA without breaching the license; the
Perplexity/NVIDIA local-orchestrator hardware product isn't adoptable (GSE runs no local GPU
hardware) but is real outside validation that GSE's already-planned local-cheap/cloud-frontier
routing work (C-108) is the right direction. Full detail in the doc's Round 12 section.

**Round 13 (2026-09-07): synthesis pass — connecting Round 11-12's findings into GSE's own
systems, not more repo research.** Biggest correction: Round 10 was WRONG that nflverse-data
needs new ingestion — `packages/data-ingestion/src/nflverse-source.ts` is already a complete,
registered adapter (`commercialUse: true`), and `apps/web/lib/intelligence/scoring-zone.ts` is
already a LIVE production module pulling real nflverse play-by-play for red-zone/goal-line
opportunity share, gated through `assertIngestible("nflverse")`. Verified directly by reading
the file: fully wiring `td-equity.ts` to it is real, precisely scoped work (needs a
`passer_player_id` column for QB detection, TD tracking beyond the red-zone-only filter, and a
`defteam`-side aggregation the module doesn't do today) touching a deliberately
OOM-hardened parsing path — not a new external source, but not a five-minute edit either; both
"blocked on ingestion" and "trivial" would have been wrong framings. Four previously-isolated
Round 11 tool verdicts (Podiom, taskq, dsh-goal, code-conductor) are now one phased "ledger
companion" design: a gitignored SQLite mirror of `AGENT_LEDGER.md` with a revision/CAS column,
synced via the ledger guard's own already-tested `parseLedger()`, optionally exposed as a local
MCP server for atomic claim attempts — Phase 0 needs **zero new dependency** (`node:sqlite`
live-verified working on this environment's Node version), Phase 1 (the MCP server) needs one
new package, a real Law 7 founder call. mission-control's routing pattern (separate from its
already-flagged-risky review gate) is filed as a trigger condition — not urgent for today's four
fixed agent identities, genuinely worth building the moment a fifth (e.g., a rights-registry
agent) is added. Three previously-scattered findings (the unwired regression detector, nflverse
as a scoped third calibration signal, nflverse's own publish-a-reproducible-history credibility
strategy) are now one 3-phase plan directly serving the live PROVEN-gate push, Phase 1 being one
function call connecting two already-built, already-tested pieces before the flip. Sharpest
single finding: GSE's settlement pipeline already has its own full "decide before, record after"
discipline (`SettlementObservation`/`SettlementAnomaly`/`SettlementDecisionEvent` — insert-only,
independent-corroboration-before-promotion, revisioned decision log) sitting right next to the
pick-generation side's already-public `/verify` system, with confirmed zero callers outside
internal ops — the exact patterns this audit found valuable in *external* tools already exist
inside GSE, unused and unseen by any customer. Full detail in the doc's Round 13 section.

```
1. git fetch origin; open docs/ops/AGENT_LEDGER.md at the latest branch tip
2. Also check docs/ops/hermes/BUILD-QUEUE-*.md (latest date) if present —
   it is the current build task list when one has been issued
3. First unclaimed row you can do -> claim it (Owner + Status: CLAIMED) in
   the SAME commit that begins the work
4. Do exactly that task, nothing else
5. Run its Definition of Done / the repo guards (see WORKING RULES)
6. Mark DONE (with a real SHA) or BLOCKED (with the exact error), one line
7. Commit; push only if explicitly told to for this session — otherwise
   stay UNPUSHED and say so
8. Go to 1
```

Never ask what to do next — the ledger knows. The owner is asleep or busy.
The ledger is how you talk to them, and to every other agent working here.

---

## THE LAWS

Breaking one discards the run.

1. **NEVER `git push` unless the owner said so for this session.** Default is
   commit locally, the owner reviews and pushes. If the owner has explicitly
   told you to push tonight, push only to the branch named, never to `main`
   directly unless that too was explicit.
2. **NEVER modify:** `packages/db/prisma/schema.prisma` · `packages/db/prisma/migrations/**` ·
   `.github/workflows/**` · `scripts/guardrails/**` · `.claude/**` · any `.env*` ·
   `package-lock.json` · `.gitignore` · `.githooks/**` · `apps/web/lib/ai-control-plane/**`
3. **NEVER flip a gate or env flag** — `PUBLIC_PICKS`, `STATS_PUBLIC`, `LIVE_BOARD`,
   `PERFORMANCE_STATS`, any other. Never edit code so a gate resolves differently.
   Never run a cron with a real secret. Never search for credentials. These gates are
   the honesty boundary; opening one publishes an unearned claim.
4. **NEVER write a claim you did not observe.** Every report line traces to a command
   you ran and output you saw. Not run → write `NOT RUN`. Failed → paste the error.
   An honest gap is a contribution; an invented fact is sabotage.
5. **NEVER mark DONE** unless the Definition of Done commands actually passed.
6. **NEVER `git commit --no-verify`.**
7. **NEVER install a package, run a migration, or touch a database.** (Bare
   `npm install` is fine — it is setup, and it still works normally.)
   **Supply-chain controls, added 2026-08-16 — do not disable them.** `.npmrc`
   sets `strict-allow-scripts=true` and `min-release-age=7`. Install scripts run
   only for the version-pinned packages approved in `package.json`'s
   `allowScripts`; anything else HARD FAILS instead of silently running code on
   a machine that holds live production credentials.
   - If an install fails with an unapproved-script error, that is the control
     working. **Do NOT delete `.npmrc`, do NOT set `ignore-scripts`, and do NOT
     run `npm install-scripts approve` to make it pass.** Mark the task BLOCKED
     and report which package wanted to run code.
   - A version bump of an already-approved package also requires re-approval by
     design (the allow-list is pinned per version). Same rule: report, don't
     approve.
8. **NEVER fabricate product data** — no mock picks, sample odds, placeholder win
   rates, invented benchmarks. Anywhere.
9. **NEVER weaken a guard to make a test pass.** Never delete a phrase from a
   forbidden-copy list, never loosen an assertion's intent, never change a guardrail's
   threshold. If a guard is red, either the code is wrong or the guard needs *narrower*
   context — never less power.

---

## WORKING RULES

- **Two attempts per task.** Then revert, mark `BLOCKED` with the exact error text,
  move on. Never a third. A BLOCKED task with an honest error is a success.
- **One task = one commit.** Stage by name — never `git add -A` or `git add .`.
  Tag every message `[hermes-<task-id>]`.
- **Verify block before every code commit:**
  ```bash
  npm run typecheck                              # exit 0 (real exit code — never pipe it away)
  npm run lint                                   # exit 0
  npx vitest run <this task's test file>         # green
  ```
- TypeScript is strict. Never `any`, `as any`, `@ts-ignore`, `@ts-expect-error`.
- Update the ledger the moment a status changes. Never batch it.

---

## DECISION BUDGET

Per task: **3 file reads · 2 command runs · ONE conclusion · then act.**

If you catch yourself writing *"actually"*, *"wait"*, *"let me reconsider"*, or
*"let me think about this differently"* — **stop. You already have your answer.**
Execute it. If it is wrong, the Definition of Done catches it and you get one retry.
That is what two strikes are for. Never re-derive a conclusion you already reached.

**PRECEDENT FIRST** on any test repair — before analysing anything:
```bash
git grep -l "<the symbol or module the test needs>" -- "*.test.ts"
```
If another test already mocks it, copy that pattern. That is both the answer and the
evidence, in one step.

---

## CONTEXT HYGIENE — this is what keeps you alive

You will be cut off when your context fills. That is expected and survivable, because
the ledger holds your state. Make each session last longer:

- Do not re-read a file you already read this session.
- Do not re-read `CONTINUOUS.md` in full — jump to the section you need.
- Do not summarise your progress unless you are about to be cut off.
- Do not restate a root cause already written in the ledger.
- Ledger evidence is **one line**, not a paragraph.
- After each commit, forget that task completely. It is recorded. Move on.

---

## THE STANDARD

Every commit must be one the owner can read in two minutes and keep or drop with total
confidence. Every report line must trace to output you actually saw. Every uncertainty
must be written down rather than papered over.

This product's entire premise is that it does not lie about its own performance. One
invented number makes every other number suspect.

**Work continuously. Record everything. Invent nothing. Push nothing.**

---

