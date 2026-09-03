# Decisions — final launch pass, 2026-09-02

Branch `claude/final-launch` (on top of PR #684). Every decision below names the
evidence it rests on (a file read, a command run, or a production database read
made 2026-09-02 between 21:30 and 23:00 UTC) and the tripwire that keeps it true.
Nothing here opens an honesty gate or lowers a floor.

## D1. Settlement grades free-first; the paid Odds API pass is a supplement

**Evidence.** From 2026-08-24 15:05 UTC the production Odds API key was rejected
(provider snapshots switch to TheRundown two minutes later); the settle-picks
cron ran the paid branch alone and threw every hour, so 92 picks sat overdue for
9 days while ESPN had every final (`PICKS_STATE_2026-09-02.md` § 5). PR #684 added a
per-sport free fallback inside the paid branch; that still made the free grader
conditional on the paid branch's failure shape.

**Decision.** Order the graders by cost-to-fail, not by key presence. Every cycle:
free pass (ESPN finals + registered consensus, `runFreePathSettlement`) →
paid `settleSport` only if a key is present and `?path=free` was not sent →
stale backfill → slate-commitment freeze → outbox drain. A failing supplement
never turns the cycle red: `ok` reflects the free pass; `paidSupplement.failedSports`
and `advisories[]` carry the failure; Sentry gets `paid:supplement-failed`. The paid
pass was kept, not deleted: it is PENDING-scoped, costs nothing when the key is
absent, and covers a final ESPN never posts. Removing the key is now hygiene, not a fix.

**Tripwires.** `apps/web/__tests__/settle-picks-free-first.test.ts` (7 cases:
ordering, dead key, throwing provider, no key, `?path=free`, `?sport=`, red only
when the free pass fails); `settlement-sla-contract.test.ts` (hourly cron in both
manifests, grace 6h = backfill window, cap ≥ 200, free call precedes paid in
source); `settlement-path-select.test.ts`; agent-eval fixture
`settlement-path-selection` rewritten (`free-first-always`, `paid-is-a-supplement`).

## D2. Calibration floors stay at Brier ≤ 0.22 / ECE ≤ 0.05; nothing is published

**Evidence (production read, 1,663 graded WIN/LOSS picks).**

| | Value |
|---|---|
| Overall Brier (all graded) | 0.2727 |
| Murphy uncertainty (base rate 52.6%) | 0.2493 |
| Reliability term | 0.0288 |
| Resolution term | 0.0054 |
| Brier after a *perfect* recalibration (uncertainty − resolution) | ≈ 0.244 |
| Best single version (v5.2.7, n = 353) | 0.2489 |
| Metrics artifact used by the gate (n = 981) | 0.2430, ECE 0.0513 |

A calibration map can remove the reliability term; it cannot create resolution.
The floor of 0.22 needs resolution ≈ 0.03, six times what the model has. So the
gap to GREEN is a *model* gap, and the only way to make the gate GREEN today
would be to lower it, which is the one thing the product promises never to do.

**Considered and rejected.** Re-expressing the gate as a Brier skill score
against the closing line is statistically cleaner (an absolute floor conflates
sport difficulty with model skill: MLB moneylines rarely beat 0.24 even from the
market's own prices), but on the 123 MLB moneyline picks that have a stored
closing price the model's Brier is 0.2227 against a raw-market 0.2343 (vig
included, so the market is flattered downward by ≈ 0.006): encouraging, n far too
small, and the CLV beat-close rate on the same picks is 6.5%. Not enough to
justify moving the goalposts four days before launch. Revisit after Week 4 with
≥ 500 picks carrying closing prices.

**Decision.** Keep the floors. Keep PERFORMANCE_STATS, LIVE_BOARD, PUBLISH_LEDGER
closed. Publish the honest state ("collecting") and add the tail monitor (D3).

## D3. The ≥ 80 confidence tail is inverted; monitor it, do not ship it as probability

**Evidence.** Confidence buckets 80–99 (n = 144) won 33–47%; the 100 bucket
(n = 8) won 87.5%. Most of the tail is v5.0.0/v5.1.0 spread and total picks
(114 of 152), but the current versions still emit it: v5.2.6 + v5.2.7 have 38
graded picks at ≥ 80 with 14 wins (36.8%). A tail that claims 82–96% and wins
under half is not miscalibrated, it is anti-predictive: an isotonic map would
turn "85" into "37", which is the honest number and also a signal that the score
should have picked the other side.

**Decision.** No MODEL_VERSION change this week (the freeze guard and the
proposal process exist for exactly this; four days is not enough to rehearse a
tail fix offline). Instead: `apps/web/lib/calibration/confidence-tail.ts`
computes the tail summary (n, win rate, claimed rate, Brier, by version, verdict
`insufficient | inverted | overconfident | calibrated`) from graded picks; the ops
truth surface publishes it as `confidenceTail`; `npm run launch:ready` shows WARN
while it is inverted. The finding is the first item for the next calibration
proposal (`docs/calibration-proposals/`), with a confidence ceiling or per-market
shrinkage as candidate fixes to be validated on held-out data first.

**Tripwire.** `apps/web/__tests__/confidence-tail.test.ts` reproduces the
production buckets and asserts the `inverted` verdict, the sample floor (30) and
the loader's query shape.

## D4. CFB totals: degrade with a clear signal, do not estimate a line

**Evidence.** The zero-key "signal slate" is moneyline-only by construction
(`packages/ingestion-pipeline/src/generate-signal-slate.ts`, literal
`pickType: "MONEYLINE"`); ESPN's public odds do carry an over/under for college
football (`espn-odds-client.ts` parses `overUnder` → `totals`) but as a single
bookmaker, which the scorer rejects (`MIN_BOOKMAKERS = 2` in
`packages/prediction-engine/src/constants.ts`); the refresh-odds cron skips
`refreshOdds()` entirely when both keys are absent. Today TheRundown is live, so
CFB totals are produced (50 pending on Week 2). The gap only opens if both odds
feeds fail on a Saturday.

**Decision.** A totals *pick* needs a real market line; inventing one from team
scoring rates would violate rule 1 (no fake data). Lowering `MIN_BOOKMAKERS` to
accept a single free book changes the scorer four days out and is not
rehearsed. So the board degrades visibly instead of silently:
`apps/web/lib/board/market-coverage.ts` reports per-sport market coverage for
the next 72 hours (games, picks per market, `covered | none | no_games`) and a
`degraded[]` list with the named cause; the ops truth surface publishes
`marketCoverage`; the launch checker turns WARN on any `sport:market` with games
and zero picks. Post-launch path: accept `espn_public` as a scoring source at a
reduced confidence in a rehearsed MODEL_VERSION bump, and let the refresh-odds
cron reach the ESPN tertiary path when both keys are absent.

**Tripwire.** `apps/web/__tests__/market-coverage.test.ts` (CFB-with-no-TOTAL
flagged with the MIN_BOOKMAKERS cause; covered; no_games never degraded; unknown
pick types ignored; loader query shape).

## D5. Duplicate game rows: alias, never re-point picks

**Evidence.** Each real game exists up to three times (Odds API hash id,
TheRundown hex id with city-only names, two ESPN id formats): MLB 284, MLS 75,
NFL 48, NCAAF 45 duplicate groups, picks on all variants. `picks` carries
`@@unique([gameId, pickType])`, so re-pointing picks to one canonical row would
collide whenever two variants carry the same market.

**Decision.** Merge = mark, not move. `Game.mergedIntoGameId` (new, nullable
self-reference) turns a duplicate into an alias tombstone: it keeps its picks
and settlement history (the free grader matches by team + date, so alias picks
still grade), child rows without unique collisions are re-pointed, colliding
rows are reported, and ingestion follows the alias to the canonical row so an
old external id never recreates a twin. The merge tool
(`npm run ops:merge-games`, dry-run by default, `--execute` to apply, plan
written to stdout and a JSON file) reports PENDING pick conflicts across
variants (same market, agreeing or disagreeing sides) without touching them; the
de-duplication of *published pending* duplicates is the owner's call and is
listed in the handoff. Sequencing: the merge runs only after the deploy that
carries the alias-aware ingestion, otherwise the next odds refresh recreates
the rows. Never before Week 1 settles.

**Known limit, on purpose.** The grouper reuses the ingestion identity rules
unchanged, including `AMBIGUOUS_CITY_TOKENS`: a TheRundown row whose team is a
bare shared city ("Los Angeles", "New York", "Chicago", …) is *not* auto-grouped,
because the same token names two teams. Those rows stay as they are and need a
manual merge; weakening the token list to catch them would re-open the wrong-team
grading bug the matcher was just fixed for. When the exact-external-id fast path
lands on an alias whose chain is broken or deeper than 3 hops it throws (the
module's existing "DB errors propagate to the caller's fallback" contract)
rather than silently writing on the tombstone.

**Tripwires.** `packages/ingestion-pipeline` game-identity tests (alias
following, canonical never an alias, 9 new cases; 264 tests green);
`apps/web/__tests__/game-merge-plan.test.ts` (15 cases on the real four-variant
fixture, conflict listed); `apps/web/__tests__/forward-migrations-agree-with-schema.test.ts`
(schema and migration name the same column, index and FK).

## D6. CI replays the migration history, blocking

**Evidence.** Since the 2026-09-02 squash `prisma migrate deploy` applies the
idempotent baseline from empty and is a no-op on a schema-bearing database
(verified on a disposable Postgres 16 in PR #684). The replay step was still
`continue-on-error: true` followed by `db push` only because
`.github/workflows/**` was Edit-denied for agent sessions.

**Decision.** Apply the patch that was written out in OPERATOR_TASKS →
BASELINE-MIG under the owner authority granted for this session: the replay is
blocking and is followed by `prisma migrate diff --from-url … --exit-code`, so a
schema change without a migration (or a migration that drifts from the schema)
fails CI. `db push` is gone from CI; the test database is built the way
production is. `.claude/rules/prisma.md` rule 5 and OPERATOR_TASKS are updated to
match.

## D7. Week 1 hot path: one index, one page fix, no new caching

**Evidence (audit).** `/api/(.*)` already carries `Cache-Control: no-store,
max-age=0` in both `vercel.json` copies; every picks/odds/calibration page and
route is `force-dynamic` and returns through `jsonNoStore`, except
`app/performance/page.tsx` (reads settled picks, was cacheable) — fixed. The
proof ledger's deliberate `public, max-age=300` (append-only, viewer-independent
hash chain) is left as designed. Compression is Next's default. The public board
query (`isPublished`, `isBootstrap`, `generatedAt` range) had no covering index.

**Decision.** `@@index([isPublished, isBootstrap, generatedAt])` on `picks`
(migration `20260902231000_week1_hot_path_indexes`, `CREATE INDEX IF NOT
EXISTS`). Nothing else: the tables are small (2.6k picks) and every other hot
shape was already covered.

## D9. Automated review findings on PR #684 (Devin, cubic): what was fixed, what was not

Bot findings are bug reports. Each one was verified against the code before acting.

**Fixed on this branch.**

| Finding | Fix | Tripwire |
|---|---|---|
| Baseline seed rows used `ON CONFLICT DO UPDATE`: the first production deploy would have overwritten operator-tuned Claude API budgets (Devin, red) | All three seed blocks are `DO NOTHING`; the baseline had never been applied outside CI and disposable clusters, so editing it before merge is legitimate | Production-like replay (db push + 53 recorded names + tuned rows) keeps 999/777, inserts the missing default, drift clean (`scratchpad/pgsim-prodlike-budgets.mjs`) |
| settle-picks `ok` while nothing graded (Devin, red) | A cycle with overdue picks that grades and holds nothing is `starved`: `ok:false`, advisory, Sentry `starved-cycle`; holds count as work | `settle-picks-free-first.test.ts` (+2) |
| `nearestCandidates` on a date-only timestamp picked the earlier doubleheader game (cubic P1) | Date-only `gameDateIso` keeps every candidate; the guard holds | `free-settlement-doubleheader.test.ts` (+1) |
| City-only ambiguity counted another date's same-city team (cubic P2) | Finals and scoreboard rows restricted to the pick's ±2-day window before the check; rows without a start time are kept (fail closed) | existing abbr/doubleheader suites |
| Stale-pick policy read `generatedAt`, which refresh never updates; live v5.2.7 picks created in May (317 refreshed today) would have been dropped from the conviction gate (cubic P1) | `freshPickWhere`/`stalePickWhere` read `dataFreshnessAt`, falling back to `generatedAt` only when null; truth surface uses the same predicate. Verified in production: the 18 v5.0.0 picks were last refreshed 2026-06-16, so the count is unchanged | board and truth suites |
| CLV rate and split counts published on a public endpoint while the CLV policy said not publishable (cubic P1) | `clvPosture` carries counts and rate only when `canExposeClv`; the ladder still receives the rate internally; launch checker prints the gated state | truth suites |
| henrygd clearance asked only `derived_analytics` while the runner stores finals (cubic P1) | Intents are `storage` + `derived_analytics` | scraping-clearance suite |
| Backfill window was an independent `6` (cubic P2) | Imports `SETTLEMENT_DEFAULT_GRACE_HOURS` | `settlement-sla-contract.test.ts` |
| MLB doubleheader could merge into a lone existing row inside the 18h twin window (cubic P1) | `commenceMatchMsFor`: 2h for baseball, 18h otherwise, in both the pure matcher and the DB window | `game-identity.test.ts` (+4) |
| Bare "Manchester" prefix-matched a lone Manchester City row (cubic P1) | Added to `AMBIGUOUS_CITY_TOKENS` | same |
| settle-sport ignored an `externalId` resolution created between two lookups (cubic P2) | Any resolution reloads the game by id | ingestion suite |
| Launch checker: probe crash read as WARN; UNVERIFIED repo items folded into PASS (cubic P2 ×2) | Crash without a verdict is FAIL; UNVERIFIED items are a WARN with their count | `node --check`, manual run |
| SANDBOX-NET reported verified with `failIfUnavailable:false` (cubic P2) | Requires `failIfUnavailable === true`; today it reports the honest fallback state | `npm run ops:tasks` |
| Empty phrase list built a match-everything regex (cubic P2) | Never-match regex for an empty list | brand suites |
| Docs/commands: polish-view vitest from the workspace; /debug allowed-tools; grok-delegate policy contradiction; founder checklist checked on an observation; VAPID "configured" wording (cubic P2 ×5) | Corrected as suggested; the public-picks box is unchecked again until founder YES + `FORCE_NO_BET_IF_STALE` confirmed | n/a |
| Brand: spaced/singular "AI generated pick" variants passed some scanners (cubic P1) | Two variants added to the shared vocabulary, four `TrustClaim` entries added, `scanForBannedPhrases()` now also runs the shared positioning matcher, and the CI trust gate's hand-maintained list carries the spaced singular | `trust-claims.test.ts` (+7), brand lint 3,713 |
| nflverse: a labelled-season fetch returning `ok` with zero rows skipped the floor retry (cubic P1); backfill-player-data's default range had no floor retry (cubic P2) | Zero rows on a scheduled run is treated as unpublished and retries the completed floor (clearance-denied excluded); backfill-player-data's bare default targets the labelled season with a reported `floorFallback` (explicit ranges unchanged; the route is not on the cron schedule, so this only changes manual runs) | route suites (+9) |
| Merge planner could chain a doubleheader through union-find even with the 2h window | Clusters whose kickoff span exceeds the sport window are refused as a whole and reported (`refusedGroups`), never merged | `game-merge-plan.test.ts` (+2) |
| Agent bash guard: quoted `$(…)` bypass, interpreter writes to protected paths, `env --` wrapper, `>` boundary, `refs/heads/main` refspec, `$VAR/.env` (cubic P0/P1 ×6) | Delegated in this session on a copy (the path is agent-denied), landed by the owner-authorised copy step; results in the final report | guard selftest |

**Not fixed, with reasons.**

- Concurrent feeds creating the same new game (check-then-write race in
  `resolveCanonicalGame`; Devin, cubic): real but narrow (crons run at different
  minutes; the merge tool now exists for any residue). Fix is an advisory lock or
  a canonical identity key, a design change for after Week 1.
- "LA Clippers" vs "Los Angeles Lakers" alias normalisation in the city guard: NBA
  is out of season; noted for the alias table.
- `MIN_BOOKMAKERS` / ESPN single-book scoring, seed-games per-event scans,
  backfill re-fetching free scores on the free path: performance or scoring
  changes, not launch-week fixes; traffic is a handful of ESPN calls per hour.
- backfill-team-efficiency floor fallback on any source error: the labelled error
  text is reported in the response, so a transient failure is visible; a 404-only
  rule needs the source's error shape.
- Prisma migrate commands under `ask` rather than `deny` in settings: the rule
  (`.claude/rules/prisma.md` § 9) is "interactive sessions ask"; unattended runs are
  forbidden by AGENTS.md law 7. Kept.
- SessionStart `npm ci` hook: `.npmrc` `strict-allow-scripts` limits lifecycle scripts
  to the pinned allow-list; kept.
- Compliance-scanner rule overlap producing duplicate reports: cosmetic; deduping
  rules risks narrowing coverage. Kept.

## D8. Gates that stay closed, and why that is the launch-ready state

PERFORMANCE_STATS, LIVE_BOARD, PUBLISH_LEDGER, CALIBRATION_ADJUSTMENTS remain
off: D2 shows the sample does not clear the floors and D3 shows why the tail
must not be shown as probability. PUBLIC_PICKS stays on (observed on, serving the
board). "Launch-ready" for this product means every number it *does* show is
real and every number it does *not* show has a visible reason. Both are now
observable on `/api/ops/public-surface-truth` and `npm run launch:ready`.

## D10. Second gap review (the pasted critique): each claim checked against the code first

The owner pasted a nine-item critique ("3 gaps, 2 under-leverages, 4 polishes").
Rule 4 of AGENTS.md applies to critiques too: nothing was changed on the strength
of a claim until the claim was read against the tree. Five of the nine were false
in this checkout; four were real and are closed below.

| Claim | Checked | Outcome |
|---|---|---|
| "agent:eval asserts the settle cron at `0 */3 * * *`" | `scripts/agent-eval/fixtures/settlement-path.json:22` asserts `20 * * * *`; `apps/web/vercel.json:22` schedules `20 * * * *` | False. Already agree (fixture rewritten in d0d4be0c4). No change |
| "`FORCE_NO_BET_IF_STALE` is not actually enforced" | `apps/web/lib/board/passes.ts:94` and `board/state.ts:207` short-circuit on `gates.forceNoBetIfStale`; `public-freshness-gate.ts`, `operating-kernel.ts:259`, the picks routes and `readiness.ts` read the same flag (`platform-config.ts:175`, default false) | False as stated. The real gap was observability: nothing reported the flag's live value, so the gate runbook's "pair it with public picks" rested on memory. `gates.forceNoBetIfStale` is now on `/api/ops/public-surface-truth`; `launch:ready` WARNs when picks are public and the switch is off |
| "Board should use `stale-while-revalidate=60`" | `.claude/rules/nextjs-caching.md` § 3: entitlement-dependent output is never cached; the board is tier-filtered and a cached tier bleed is a paywall bypass (rule 3) | Declined. Documented here so it is not re-proposed |
| "Guard selftest is not wired into guardrails" | `scripts/guardrails/run-all.mjs:60` runs `agent-bash-guard.mjs --selftest` | False. No change |
| "Sandbox is declared but disabled" | `.claude/settings.json:222` `enabled: true`, `:223` `failIfUnavailable: false`, allowlist present | False; it is enabled and fails open. The honest row is SANDBOX-NET in `docs/ops/OPERATOR_TASKS.md`: verify on a machine with bubblewrap/seatbelt, then flip `failIfUnavailable` to true (settings are owner-frozen, AGENTS.md law 2) |
| "Runbook split between the launch-day doc and the runbook script" | Both exist by design: `LAUNCH_DAY_RUNBOOK.md` is the ten-minute sequence, `npm run ops:runbook` is the command list; each links the other | Kept. The runbook's merge item wording refreshed (it still said no npm alias existed; `ops:merge-games` exists) |
| "Confidence tail is on the truth endpoint but not in the cockpit" | `apps/web/app/cockpit/calibration/page.tsx` had no tail or coverage section | True. Added two read-only sections (`data-testid="confidence-tail"`, `"market-coverage"`) driven by the same loaders as the truth surface; a DB failure renders an "unavailable" line, never a number |
| "The merge tool prints the plan but does not save it" | `scripts/ops/merge-duplicate-games.ts` wrote JSON only after `--execute` | True. Dry run now writes `scripts/ops/out/merge-duplicate-games-plan-<ts>.json` (plan, pick conflicts, refused groups, child-table previews) and prints the path; `out/` is already git-ignored |
| "Brand lint should run pre-commit" | The pre-commit hook runs only the staged secret scan | True. The agent bash guard refused the write into the hooks directory (`hooks-dir-write`: the guard working). Hook text and verification steps are in `docs/ops/OPERATOR_TASKS.md` § "Pre-commit brand gate" (PRE-COMMIT-BRAND) for the owner to install by hand |

Tripwires: `npm run typecheck` (22 workspaces) exit 0, `npm run lint` exit 0,
cockpit/wiring/route-shape suites 66/66, monitor suites 11/11, `node --check`
on both scripts, `npm run ops:runbook` prints the refreshed merge item,
`npm run lint:brand` exit 0, `npm run guardrails` 26/26.

## D11. Devin's second review (PR #685, 2026-09-03 00:22 UTC): three findings, all real

| Finding | Verified against | Fix | Tripwire |
|---|---|---|---|
| Market coverage counted any published PENDING pick, so a bootstrap or seed pick the board hides could turn a market "covered" | `board/state.ts:280` relation predicate and `load-gate-slate.ts:580` both require `isPublished`, `isBootstrap: false` (and no seed row in production) | `loadMarketCoverage` uses the board predicate: published, non-bootstrap, `modelVersion <> "v5.0.0-seed"` (unconditional) | `market-coverage.test.ts` asserts the full predicate |
| The confidence-tail summary, served on a public endpoint, read every graded pick including bootstrap, unpublished and seed rows | `public-performance-policy.ts:317-343` and `calibration/report.ts:40` define the public population as published, non-bootstrap, not seed | `loadConfidenceTail` reads that population. Production re-read 2026-09-03 (read-only): the ≥80 tail is 152 picks, 61 wins (40%), mean claimed 86%, with 0 bootstrap, 0 unpublished and 0 seed rows in it, so today's verdict is unchanged; the filter is protective | `confidence-tail.test.ts` asserts the full predicate |
| A settle cycle in which only the 6h stale backfill graded overdue picks reported `starved` (ok:false, Sentry) because `totalSettled` counted only the free and paid passes | `settle-picks/route.ts:185-186`; the backfill lane grades exactly the overdue population | `backfillSettled` (0 when the backfill result is error-shaped) joins the total and the starvation decision; `picksSettled` in the response includes it | `settle-picks-free-first.test.ts` (+1): free and paid settle nothing, backfill settles 2, cycle is ok and not starved |
| Follow-up (Devin, third pass): with backfill settlements in the total, a `?sport=` cycle could count another sport's backfill as its own work and hide starvation, because the backfill lane ignored the scope | `route.ts:86-99` scopes the free and paid passes by `requestedSport`; `settle-backfill.ts` had no sport input | `backfillStaleSettlement` takes `sportKey`; the query adds `game.sport.key` when given; the route passes `requestedSport`, so all three lanes share one scope | `settle-backfill.test.ts` (+1) asserts the scoped and unscoped where clauses; `settle-picks-free-first.test.ts` (+1) asserts the scoped and unscoped calls |

## D12. cubic's review of PR #685 (2026-09-03 00:43 UTC): 39 threads, verified one by one

cubic posted 39 findings on the ready-for-review head. Each was read against the
code before acting. Outcome: 34 fixed on this branch (10 in code, 24 in
documentation, rules, command and skill allowlists), 2 answered with evidence
and left as is, 2 answered as a documented policy exception, 1 turned into an
owner task because the agent permission surface denies the file.

**Code (each with a tripwire).**

| Finding | Verified | Fix |
|---|---|---|
| `launch:ready` passed every HTTP 503 from `/api/picks`, including the stale-data gate and backend failures | `getJson` returns the body; `bootstrapGateResponse` carries `reason: "bootstrap" \| "feature_gate"`, `staleDataGateResponse` carries `reason: "stale_data"` | Body-aware verdict: bootstrap or feature gate PASS, stale-data gate FAIL (the kill switch darkened the surface), any other 503 FAIL |
| Merge plan reported pick conflicts only between an alias and the canonical; two aliases each holding a pending pick on one market with no canonical pick went unreported although both survive the merge | `findPickConflicts` looked up `canonicalPicks` only | Reference pick per market is the canonical's or the first alias pick seen; `referenceGameId`/`referenceIsCanonical` added; the script prints which. `game-merge-plan.test.ts` (+1) |
| A second feed row for a contest already claimed this cycle fell through to upsert-by-externalId, which could write onto a merged alias tombstone | `process-sport.ts` `claimedTwinIds` branch | The row is skipped with a warn; the existing twin-claim test now asserts the skip instead of the fall-through |
| Any labelled-season source error (5xx, timeout) was treated as "unpublished" and retried the floor into a green run | `nflverse-source.ts` throws `nflverse fetch failed (<status>) for <url>`, so 404 is distinguishable | `lib/ingestion/unpublished-season.ts`: 404 or ok-with-zero-rows only; both cron routes use it. Route tests (+2) |
| `toComparableFromEspn` published a bare `YYYY-MM-DD` as `startIso` (Date.parse accepts it), so the nearest-kickoff matcher would trust midnight | `free-settlement.ts:301` keeps every candidate only when a candidate lacks a parseable `startIso` | `startIso` requires a clock component. `ncaa-consensus.test.ts` (+1) |
| The confidence-tail monitor read bootstrap and unpublished picks | Same as Devin's finding | Already fixed in 429224c2c |
| `smoke-prod.sh`: 19 routes at a 12s ceiling can exceed the 5-minute job | arithmetic | 8s ceiling with the budget stated |
| `guardrails:chain` skipped three guards and short-circuited | `package.json:145` | Points at `scripts/guardrails/run-all.mjs` |
| The generated cron matrix was stale after the health-alert cron | `node scripts/ops/cron-matrix-from-vercel.mjs` changed the file | Regenerated (22 crons) |
| `positioning.md` bans "AI-generated" but the vocabulary carried only the pick-specific variants | vocab file | Generic phrase added; `trust-gate` then caught `README.md:84`, a real usage in the env-var table, reworded |

**Documentation, rules and allowlists (verified by the delegated pass; every
claim held).** `prisma.md` rule 4 documents the `MIGRATE_GATE_ALLOW_UNVERIFIED`
break-glass; `api-gating.md` describes `feature-gates.ts` as display state and
`gateApi` as the place errors become a FREE denial; `scraping.md` says plainly
that the ingestion packages carry no clearance gate of their own;
`path-to-70.md` requires the learning-eligible WIN/LOSS export and a
time-ordered hold-out; `settlement-free-path` smoke uses `?path=free`;
`CURRENT_STATE`, `FOUNDER_ONLY_CHECKLIST` and `OPERATOR_TASKS` (HENRYGD-REG
needs storage rights) corrected; twelve command, skill and agent allowlists
narrowed to read-only verification commands or widened by exactly the
read-only command their checklist needs (no mutating command was
pre-approved anywhere).

**Answered, not changed.** The Week 1 index migration: `picks` is 2,584 rows
and 7.9 MB in production, and `CREATE INDEX CONCURRENTLY` cannot run inside
`prisma migrate deploy`'s transaction (the repo's own test forbids it). The two
".claude/** must not change" threads: the owner's session instruction
authorised every file; `.claude/settings.json` itself was not touched.

**Owner task.** `.mcp.json`'s lowercase `vercel` server key produces
`mcp__vercel__*` tool names that the `mcp__Vercel__*` confirmation rules in
`.claude/settings.json` do not match. The agent permission surface denies
writing `.mcp.json`, so the rename is MCP-VERCEL-KEY in
`docs/ops/OPERATOR_TASKS.md`.

## D13. cubic's third pass (a573e6bbd, 2026-09-03 01:05 UTC): 38 threads

Same rule: each claim read against the code first.

**The one that mattered most.** The external watchdog compared
`.schedulerLiveness.status` with `"ok"`. The vocabulary is `healthy | degraded
| dead | unknown` (`apps/web/lib/ops/scheduler-liveness.ts`); `"ok"` was never
a member, so the poll failed on every run and, once the webhook secret is set,
would have paged every 30 minutes. The repo already knew: the workflow contract
test carried the literal as a pinned known-bad entry with the one-line fix
written in a comment. Fixed under the session's owner authorisation: healthy
passes, degraded warns, anything else pages; a non-200 or invalid-JSON response
now reaches the paging block instead of aborting before it; the webhook POST
uses `--fail`. The known-bad pin is deleted, so the contract test now enforces
the fix.

**Fixed in code.**

| Finding | Fix | Tripwire |
|---|---|---|
| `persistFreeScores` could overwrite a recorded final (a paid-settled game with `resultFetched` still false matches the revisit query) with a different ESPN score | In-memory SCORE_MISMATCH guard mirroring the runner's, plus a conditional `updateMany` where clause so a concurrent finalisation is not clobbered either | `free-score-persist-guard.test.ts` |
| A `?sport=` cycle compared its scoped settlements against the global overdue count and could be flagged starved by another sport's backlog | `loadSettlementHealth` takes `sportKey`; the route passes the cycle's scope | `settlement-health.test.ts` (+1), `settle-picks-free-first.test.ts` |
| Backfill cap saturation was invisible | `capReached` on the backfill result (in the cron response) | `settle-backfill.test.ts` |
| Market coverage counted alias tombstones and stale or hidden picks | Canonical games only (`mergedIntoGameId: null`) and `freshPickWhere` on the picks | `market-coverage.test.ts` |
| Cockpit rendered a coverage table from stub data in demo mode | Both monitors render "unavailable" in stub mode, as the truth surface does | cockpit suites |
| Confidence tail mixed markets without saying so | `byMarket` split added; the headline is scored exactly as `calibration/report.ts` scores the calibration sample, so it stays comparable with the floors | `confidence-tail.test.ts` (+2) |
| Merge tool: malformed `--sport`/`--limit` widened silently to every sport; `--limit` left stale counts; scores could be assembled from two aliases; later aliases graded against the pre-fill canonical | Strict option parsing that aborts before any read; counts recomputed after truncation; the score pair is copied only as a pair from a FINAL alias and carries the status; aliases graded against the effective canonical | `tsc`, dry run |
| Owner runbook: an unused constant and a header claiming OPERATOR.md is parsed; SANDBOX-NET verified by the wrong command; the webhook set/unset ignored the GitHub secret; the kill-switch check accepted any value; Elite alert verification ran locally; the stale-pick item hardcoded a snapshot and mis-stated the predicate | All seven corrected; the kill-switch check reads `gates.forceNoBetIfStale == true` from the truth surface | `node --check`, `npm run ops:runbook` |
| Report inconsistencies: 37% vs 40% for the same 152-pick tail, 3,711 vs the final brand-lint count | Corrected to the observed 61/152 and the final-head count, with the correction stated | brand lint |

**Answered, left as is.** Aggregating the tail in the database (152 rows today
in a 2,584-row table; revisit at 100×); learning-eligibility on the tail (the
monitor deliberately scores what customers saw, the learning gate is a separate
population); per-group merge transactions (each group is atomic and a rerun
skips merged aliases, which is the resumable contract; one transaction across
hundreds of groups would hold locks for the whole run); the dry-run collision
preview (per alias by design, the execution report is the record); backfill
pagination (88 overdue today against a cap of 200; `capReached` now shows
saturation, and pagination lands if it ever reads true); the identity race
(D9); the `npm ci` SessionStart hook and `git diff --output` (settings are
owner-frozen; the guard now classifies `--output` targets, see the guard row).

**Guard.** Seven bypasses in the agent bash guard (escaped executable names,
`env -S`, wrapper option arity, path-prefixed executables behind wrappers,
ANSI-C quoting, attached `xargs` options, protected paths behind
`$CLAUDE_PROJECT_DIR`/`$PWD`) plus `git --output` targets: hardened on a copy
with new selftest cases and installed through the same owner-authorised step
as the earlier hardening; results in the final report.
