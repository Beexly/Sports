# GSE Rebuild Source Ledger - 2026-06-05

## Inputs Reviewed

- Claude rebuild prompt: `C:\Users\Garrett\.codex\attachments\0bb7bda2-4f49-4259-a4c6-d98cfdc62f00\pasted-text.txt`
- Competitor/reference recording: `C:\Users\Garrett\Videos\Screen Recordings\Screen Recording 2026-06-04 204048.zip`
- Current GSE recording: `C:\Users\Garrett\Videos\Screen Recordings\Screen Recording 2026-06-04 205110.zip`
- Extracted storyboards:
  - `C:\Users\Garrett\AppData\Local\Temp\gse-recording-storyboards\204048-storyboard-every-8s.jpg`
  - `C:\Users\Garrett\AppData\Local\Temp\gse-recording-storyboards\205110-storyboard-every-8s.jpg`

## Recording Coverage

- `204048`: 409.27 seconds, 2530x1380, 52 full-screen frames captured every 8 seconds.
- `205110`: 383.87 seconds, 2526x1326, 49 full-screen frames captured every 8 seconds.

## Requirements Extracted

- The public product has to orient a visitor in roughly 10 seconds: current board state, what data is live, what is blocked, and why the user should trust the math.
- Competitor-grade depth means dense tables and real feeds: projections, ADP/movers, last-5/last-10 hit rates, defense ranks, odds/edge context, salaries, ownership, DFS value bands, video/content libraries, track record, and clean navigation.
- GSE's actual moat should be transparency, not cinematic polish: public losses, calibration, model receipts, source readiness, and trend methodology.
- No public surface should present fictional players, fake projections, synthetic p-values, or invented picks as live product value.
- Scores24 and similar sites belong behind permission/legal gates unless a licensed or explicitly allowed integration exists.
- Media workflows can be valuable only as draft/review/export systems until publishing rights, source provenance, and posting paths are explicitly approved.

## Boundaries Preserved

- No production access.
- No DB writes, migrations, installs, commits, pushes, or deploys.
- No scraping or automated Scores24 interaction.
- No secret values printed.
- New visible row counts come from read-only nflverse release assets, not fabricated fixtures.

## Work Landed From This Evidence

- `/cockpit/media` became a Media Operating Room: read-only media command surface, explicit no-auto-publish/no-social/no-user-comms boundary, DB row count reported as `UNKNOWN` when local DB is unreachable.
- `/api/media/readiness` exposes the same media control plane as JSON.
- `player_stats_week` nflverse asset mapping was corrected from nonexistent seasonal files to the real merged `player_stats.csv.gz` release asset.
- `/trends` now shows a live nflverse readiness pull for the QB-age/RB-target-share trend plan:
  - 5/5 required feeds live.
  - 196,809 real source rows fetched read-only.
  - 0 joined trend observations.
  - Trend publication remains blocked until Player/PlayerGameStat-style persistence and joins exist.
- `/api/trends/nflverse-readiness` exposes the trend source readiness as JSON.
- `/nflverse` now renders a real Usage Pulse from nflverse release assets:
  - 134,470 source rows from `player_stats.csv.gz`.
  - Latest available player-stats season resolved to 2024 regular-season week 18.
  - 5,340 regular-season rows for 2024.
  - 24 top player opportunity rows and 16 QB-age context rows shown publicly.
  - `canPublishTrends` remains false; this is source inspection, not a pick or significant trend.
- `/api/nflverse/usage-pulse` exposes the same usage pulse as JSON.
- `/api/nflverse/qb-age-rb-trend` now computes the requested historical QB-age/RB-target-share cohort directly from real nflverse release assets:
  - `player_stats.csv.gz`: 134,470 player-stat rows.
  - `players.csv`: 25,042 player rows.
  - `games.csv`: 7,548 schedule rows.
  - 12,490 team-week observations used from 1999-2024.
  - QB age 34+ cohort: n=1,979, RB-target-share mean 17.6%, baseline 16.3%, relative lift +7.8%, p=3.58e-9.
  - `canPowerScoring=false`; this is a read-only research result until persisted, versioned, reviewed, and wired through scoring governance.
- `/nflverse` now renders the historical cohort result and source boundary next to the live Usage Pulse.
- `/trends` now surfaces the same real cohort as a read-only research result while keeping the published-trend readiness gate blocked.
- `apps/web/__tests__/guardrails.test.ts` now gives filesystem guard scanners enough timeout under full Vitest load and reports timeout signals/errors instead of empty failure output.
- The public and operator source ledgers now consume a shared live evidence object:
  - `apps/web/lib/data-sources/live-evidence.ts` composes nflverse readiness, Usage Pulse, and QB-age cohort proof.
  - `/api/sources/catalog` includes `liveEvidence` with row counts, cohort observations, evidence routes, and explicit closed gates for database writes, scoring, and publication.
  - `/integrations` now shows `Live source proof`, including 134,470 player-stat rows, 12,490 cohort observations, +7.8% QB-age-34+ lift, and JSON evidence links.
  - `/cockpit/sources` now shows the same row proof and evidence routes for operators.
  - Source tables now show per-dataset proof where available and `UNKNOWN` where no live proof exists.
- `/api/nflverse/birthday-usage-trend` now tests birthday and career-milestone narratives directly against real nflverse rows:
  - `player_stats.csv.gz`: 134,470 player-stat rows.
  - `players.csv`: 25,042 player rows.
  - `games.csv`: 7,548 schedule rows.
  - 46,790 RB/WR/TE observations used after prior-four-game and minimum-usage gates.
  - 887 birthday-window observations.
  - 640 career-game 50/100/150+ milestone observations.
  - Birthday-window result: -0.09 opportunities versus field, p=0.575, conclusion `not-publishable`.
  - Career milestone result: -0.23 opportunities versus field, p=0.260, conclusion `not-publishable`.
  - `canPowerScoring=false`; the engine rejects weak angles instead of turning anecdotes into scoring inputs.
- `/nflverse` now renders a narrative-context myth-check panel and sensitivity table beside the accepted QB-age cohort.
- `/trends` now shows birthday and milestone boosts as rejected narratives, making the lab demonstrate both accepted and rejected research paths.
- `/integrations`, `/cockpit/sources`, and `/api/sources/catalog` now include birthday-window and career-milestone evidence counts, p-values, conclusions, and JSON route in the shared source proof.
- Airwave now has a read-only owned-intel intake validator:
  - `apps/web/lib/airwave/intake-readiness.ts` validates a configured local CSV/TSV at `AIRWAVE_TRANSCRIPT_FILE_PATH`.
  - `/api/airwave/intake-readiness` exposes contract coverage, row counts, rights holds, operator holds, and review-ready rows.
  - The API does not import rows, write the database, expose the local path, expose transcript text, expose internal source pointers, capture audio, or publish anything.
  - `/cockpit/airwave` now shows transcript intake status, UNKNOWN row counts when no local file is configured, contract columns, rights/operator holds, and the no-writer gate.
  - `/airwave` now shows public intake proof beside the illustrative ledger so the page admits when real transcript rows are absent.
  - `.env.example` and `docs/airwave-ledger.md` document `AIRWAVE_TRANSCRIPT_FILE_PATH` and the new intake-readiness route.
- `/fantasy` now has a real NFL usage backbone panel:
  - It reads the shared live source evidence object at request time, not during static generation.
  - It shows 134,470 nflverse player-stat rows, latest 2024 week 18 usage context, the accepted QB-age/RB-target-share research result, and the rejected birthday/milestone narrative checks.
  - It keeps projection-driven lineup, waiver, trade, DFS, and pick'em advice gated until real projections, ADP, salaries, ownership, and league-state feeds are connected.
  - `apps/web/__tests__/fantasy-real-data-surface.test.ts` locks this source-level contract.

## Validation Evidence

- `npm.cmd run test --workspace=@sports/web`: PASS, 220 files / 2,586 tests.
- `npm.cmd run test --workspace=@sports/web -- __tests__/guardrails.test.ts`: PASS, 5 tests.
- `npm.cmd run typecheck --workspace=@sports/web`: PASS.
- `npm.cmd run test --workspace=@sports/web -- __tests__/airwave-intake-readiness.test.ts __tests__/airwave-intake-api.test.ts __tests__/airwave-control-surfaces.test.ts __tests__/airwave-readiness-api.test.ts`: PASS, 4 files / 10 tests.
- `npm.cmd run test --workspace=@sports/web -- __tests__/fantasy-real-data-surface.test.ts __tests__/data-first-public-surfaces.test.ts`: PASS, 2 files / 8 tests.
- `npm.cmd run lint --workspace=@sports/web`: PASS.
- `npm.cmd run lint:brand`: PASS, 19 files / 1,118 tests.
- Focused birthday/source proof tests: `npm.cmd run test --workspace=@sports/web -- __tests__/birthday-usage-trend.test.ts __tests__/source-live-evidence.test.ts __tests__/source-catalog-api.test.ts __tests__/data-first-public-surfaces.test.ts __tests__/cockpit-sources-page.test.ts`: PASS, 5 files / 14 tests.
- `npm.cmd run test --workspace=@sports/data-ingestion`: PASS, 11 files / 81 tests.
- `npm.cmd run typecheck --workspace=@sports/data-ingestion`: PASS.
- `npm.cmd run build --workspace=@sports/web`: PASS.
  - Build emitted local Prisma connection warnings for `localhost:5433`; no local DB was reachable, and the build still completed successfully.
- Local dev smoke on `http://127.0.0.1:3000`:
  - `/`: 200, contains `NFLverse` and `Real NFL rows`.
  - `/nflverse`: 200, contains `NFLverse`, `QB age 34+`, and `Real NFL rows`.
  - `/trends`: 200, contains `NFLverse` and `QB age 34+`.
  - `/cockpit/media`: 200, contains `Media Operating Room`.
  - `/api/nflverse/qb-age-rb-trend`: 200, success true, status live, observations used 12,490, trend count 3, scoring false.
  - `/api/nflverse/birthday-usage-trend`: 200, success true, status live, observations used 46,790, birthday-window observations 887, career-milestone observations 640, birthday p=0.5747, milestone p=0.2604, conclusion `not-publishable`, scoring false.
  - `/api/nflverse/usage-pulse`: 200, success true, status live, season 2024, week 18, source rows 134,470, player rows 24, QB-age rows 16, publish false.
  - `/api/trends/nflverse-readiness`: 200, success true, feeds 5/5, source rows 196,809, joined observations 0, publish false.
  - `/api/media/readiness`: 200, success true, 7 lanes, 0 ready, 4 founder-gated, public blog disabled.
- Rendered QA:
  - Browser plugin connected for DOM/console work, but screenshot/click calls timed out on the local tab; Playwright was used as screenshot/interaction fallback.
  - `/nflverse` desktop 1440x900: 200, title correct, no console errors/warnings, no framework overlay, no horizontal overflow, screenshot saved to `C:\Users\Garrett\AppData\Local\Temp\gse-rendered-qa-20260605\nflverse-desktop.png`.
  - `/trends` desktop 1440x900: 200, title correct, no console errors/warnings, no framework overlay, no horizontal overflow, screenshot saved to `C:\Users\Garrett\AppData\Local\Temp\gse-rendered-qa-20260605\trends-desktop.png`.
  - `/nflverse` mobile 390x844: 200, no console errors/warnings, no framework overlay, no horizontal overflow, screenshot saved to `C:\Users\Garrett\AppData\Local\Temp\gse-rendered-qa-20260605\nflverse-mobile.png`.
  - `/trends` mobile 390x844: 200, no console errors/warnings, no framework overlay, no horizontal overflow, screenshot saved to `C:\Users\Garrett\AppData\Local\Temp\gse-rendered-qa-20260605\trends-mobile.png`.
  - Interaction proof: `/nflverse` has exactly one `/api/nflverse/qb-age-rb-trend` source link; clicking it reaches the JSON route and shows `success`, `QB age 34+`, and `134470`.
- Source-ledger live smoke:
  - `/integrations`: 200, contains `Live source proof`, `134,470`, `12,490`, and `QB age 34+`.
  - `/cockpit/sources`: 200, contains `Live proof gates`, `134,470`, `12,490`, and `QB age 34+`.
  - `/api/sources/catalog`: 200, success true, `liveEvidence.status=live`, `usagePlayerStatsRows=134470`, `cohortObservations=12490`, `rowCountsIncluded=true`.
- Final post-build smoke on `http://127.0.0.1:3000`:
  - `/`: 200, contains `Real NFL rows` and `Trend Lab`.
  - `/nflverse`: 200, contains `Real NFL rows`, `QB age 34+`, and `Trend Lab`.
  - `/trends`: 200, contains `QB age 34+` and `Trend Lab`.
  - `/integrations`: 200, contains `QB age 34+`, `Live source proof`, and `Source control`.
  - `/cockpit/sources`: 200, contains `QB age 34+` and `Live proof gates`.
  - `/api/nflverse/qb-age-rb-trend`: 200, success true, status live, observations 12,490, cohort n 1,979, lift +7.8%, scoring false.
  - `/api/nflverse/birthday-usage-trend`: 200, success true, status live, observations 46,790, birthday-window n 887, career-milestone n 640, birthday p=0.5747, milestone p=0.2604, conclusion `not-publishable`, scoring false.
  - `/api/nflverse/usage-pulse`: 200, success true, status live, season 2024, week 18, rows 134,470, publish false.
  - `/api/sources/catalog`: 200, success true, evidence live, rows 134,470, observations 12,490, birthday conclusion `not-publishable`, career-milestone observations 640.
- Post-build dev-server note: running `next build` while the old dev server was live temporarily caused a local-only mixed `.next` chunk error on `localhost:3000`; restarting the local dev server cleared it. Production build itself passed.
- Airwave intake post-build smoke on `http://127.0.0.1:3000`:
  - `/airwave`: 200, contains `Transcript intake proof`, `Intake JSON`, `Rows: UNKNOWN`, and `writes rows: false`.
  - `/cockpit/airwave`: 200, contains `Transcript intake validator`, `Intake JSON`, `Missing required`, and `Writes rows`.
  - `/api/airwave/intake-readiness`: 200, success true, status `not-configured`, rows `UNKNOWN`, writes false, publishes false.
  - `/api/airwave/readiness`: 200, contains `AIRWAVE_TRANSCRIPT_FILE_PATH` and `transcript-spreadsheet`.
- Fantasy evidence post-build smoke on `http://127.0.0.1:3000`:
  - `/fantasy`: 200, contains `Real NFL usage backbone`, `134,470`, `not-publishable`, and `Source JSON`.
  - `/api/sources/catalog`: 200, contains `careerMilestone50Observations` and `birthdayUsageConclusion`.
- Source-ledger rendered QA:
  - `/integrations` desktop 1440x900 and mobile 390x844: no console errors/warnings, no framework overlay, no horizontal overflow.
  - `/cockpit/sources` desktop 1440x900 and mobile 390x844: no console errors/warnings, no framework overlay, no horizontal overflow.
  - Screenshots saved under `C:\Users\Garrett\AppData\Local\Temp\gse-source-ledger-qa-20260605\`.
- Narrative myth-check rendered QA:
  - In-app Browser DOM/console check for `/nflverse`: title correct, narrative panel present, JSON link present, no console errors/warnings.
  - In-app Browser screenshot API still timed out on `Page.captureScreenshot`; Playwright was used as the screenshot fallback.
  - `/nflverse`, `/trends`, `/integrations`, and authenticated `/cockpit/sources` desktop/mobile checks: no missing HTML markers, no console errors/warnings, no framework overlay, no horizontal overflow.
  - Scrolled birthday-section screenshots saved under `C:\Users\Garrett\AppData\Local\Temp\gse-birthday-myth-qa-20260605\`.
  - Final milestone-section screenshots saved under `C:\Users\Garrett\AppData\Local\Temp\gse-narrative-myth-qa-20260605\`.
- Airwave intake rendered QA:
  - `/airwave` desktop 1440x900 and mobile 390x844: no missing markers, no console errors/warnings, no framework overlay, no horizontal overflow.
  - `/cockpit/airwave` desktop 1440x900 and mobile 390x844: no missing markers, no console errors/warnings, no framework overlay, no horizontal overflow.
  - Screenshots saved under `C:\Users\Garrett\AppData\Local\Temp\gse-airwave-intake-qa-20260605-final\`.
- Fantasy evidence rendered QA:
  - `/fantasy` desktop 1440x900 and mobile 390x844: no missing markers, no console errors/warnings, no framework overlay, no horizontal overflow.
  - Screenshots saved under `C:\Users\Garrett\AppData\Local\Temp\gse-fantasy-evidence-qa-20260605\`.

## Fantasy Competitive Baseline Addendum

- `/fantasy/baseline` now maps the LineStar and Fantasy Guru / Elite Sports baseline as explicit product-floor coverage, not as a fake live-data claim:
  - Source references: `https://www.linestarapp.com/` and `https://www.fantasyguru.com/product/vip-all-access`.
  - The baseline matrix covers 16 modules: daily dashboard, projections, rankings/cheatsheets, DFS optimizer, multi-lineup manager, ownership, value plays, locks/fades/exposures, social sentiment, breaking news/injuries, props EV, live scoring/status, analysis/strategy, odds/markets, community/support, and multi-sport.
  - Truth statuses are separated into live proof, CSV-import-ready, gated data, content-ready, and manual-community so the page does not imply optimizer/projection/ownership/props feeds are live before they are wired.
  - Current summary in the UI: 1 live-proof module, 3 CSV-import-ready modules, 9 gated-data modules, 2 content-ready modules, and 1 manual-community module.
- `/fantasy` now links the baseline map from the hero and from the gated-tool reality panel.
- Global nav and mobile nav now expose the fantasy baseline map.
- Baseline implementation files:
  - `apps/web/lib/fantasy/competitive-baseline.ts`
  - `apps/web/app/fantasy/baseline/page.tsx`
  - `apps/web/__tests__/fantasy-competitive-baseline.test.ts`

## Final Baseline Validation Evidence

- `npm.cmd run test --workspace=@sports/web -- __tests__/fantasy-competitive-baseline.test.ts __tests__/fantasy-real-data-surface.test.ts __tests__/critical-routes-shape.test.ts`: PASS, 3 files / 38 tests.
- `npm.cmd run typecheck --workspace=@sports/web`: PASS.
- `npm.cmd run lint --workspace=@sports/web`: PASS.
- `npm.cmd run test --workspace=@sports/web`: PASS, 221 files / 2,596 tests.
  - Expected local Prisma warnings remained for `localhost:5433`; the tests passed and no local DB writes were performed.
- `npm.cmd run lint:brand`: PASS, 19 files / 1,122 tests.
- `npm.cmd run build --workspace=@sports/web`: PASS.
  - Build emitted local Prisma connection warnings for `localhost:5433`; no local DB was reachable, and the build still completed successfully.
- `/fantasy/baseline` rendered QA:
  - Desktop 1440x900 and mobile 390x844: status 200, no missing markers, no console errors/warnings, no framework overlay, no horizontal overflow.
  - Screenshots saved under `C:\Users\Garrett\AppData\Local\Temp\gse-fantasy-baseline-qa-20260605\`.
- Final local smoke on `http://127.0.0.1:3000` after clearing stale `.next` chunks and restarting the dev server:
  - `/fantasy`: 200, contains `Real NFL usage backbone`, `Baseline map`, and `LineStar / Elite baseline`.
  - `/fantasy/baseline`: 200, contains `LineStar plus Elite Sports is the floor`, `DFS lineup optimizer`, `Projected ownership`, `Props AI`, `Fantasy Guru / Elite Sports`, and `gated data`.
  - `/api/sources/catalog`: 200, success true, `liveEvidence.status=live`, usage player-stat rows 134,470, cohort observations 12,490, birthday conclusion `not-publishable`.
  - `/api/airwave/intake-readiness`: 200, success true, status `not-configured`, rows `UNKNOWN`, writes false, publishes false.

## Production Lab Addendum (Claude wave, 2026-06-05)

Goal from the master brief: close LineStar "❌ Missing" gaps with REAL data, not stubs — specifically last-5/last-10 form and positional defense ranks. No production access, DB writes, migrations, or live keys touched. Read-only nflverse only.

- New lib `apps/web/lib/nflverse/player-lab.ts`: computes, from the real `player_stats.csv.gz` weekly release asset, per-position (RB/WR/TE) season leaders, last-5 recent-form splits (with `last5PprDelta` = recent minus season pace), real floor/ceiling distribution (`boomRate` = share of games >= 20 PPR, `bustRate` = share <= 10 PPR, best/worst game — historical fact, not a projected range), and positional defense-allowed ranks (PPR + opportunity allowed per game, ranked across qualifying defenses). `canPublishProjections` hard-locked `false`; source failure returns an explicit empty state, never fabricated production.
- New route `apps/web/app/api/nflverse/player-lab/route.ts` (`force-dynamic`) exposes the lab as JSON.
- New page `apps/web/app/players/page.tsx` (`force-dynamic`): Bloomberg-density leader tables with color-coded recent-form deltas + defense-rank tables, honest boundary + source-error states, source URLs. Linked from Intelligence nav, mobile nav, and the page itself (Usage Pulse / Baseline map).
- New tests `apps/web/__tests__/player-lab.test.ts` (3): offline injected-fetcher unit (season leaders order, last-5 delta sign, defense-rank ordering), empty-state boundary, and API no-fabrication contract.

### Validation Evidence (Production Lab)
- `npm run typecheck --workspace=@sports/web`: PASS.
- `npm run lint --workspace=@sports/web`: PASS.
- `npm run test --workspace=@sports/web -- __tests__/player-lab.test.ts`: PASS, 1 file / 3 tests.
- `npm run test --workspace=@sports/web`: PASS, 222 files / 2,606 tests (new page auto-covered by per-file brand/policy scanners).
- Live dev smoke on `http://127.0.0.1:3000`:
  - `/api/nflverse/player-lab`: 200, success true, status `live`, season 2024 through week 18, sourceRows 134,470, `canPublishProjections=false`, 30/30/30 leaders. Cross-checked against reality: WR1 Ja'Marr Chase (23.7 PPR/g, last-5 26.1, Δ +2.4), RB1 Saquon Barkley (22.2 PPR/g), softest WR defense MIN (40.4 PPR/g allowed) across 32 defenses.
  - `/players`: 200, ~336 KB, contains `Production Lab`, all three position tables, `Softest matchups`, real player names, `Boundary`, `JSON lab`; no framework error overlay.

## Legal Data-Ingestion Framework + Next Gen Stats (Claude overnight wave, 2026-06-05)

Founder directive: be the most intelligent site; ingest much more data; figure out the legal *structure* for pulling data and build it; no fabricated data. Recon (3 agents) established the legal matrix and the real nflverse layout. No money spent, no prod/keys/DB-migrations touched.

### Structure — legal source registry (governance layer)
- New `packages/data-ingestion/src/source-registry.ts`: every external source declared with real license/ToS, commercial-use flag, attribution, rate limit, and a `LegalVerdict`. `assertIngestible(id)` throws for forbidden/paid sources, so ingestion code physically cannot wire a non-cleared feed. `attributionFor(id)` carries the credit line.
  - Cleared: nflverse (CC-BY-4.0, attribute), the-odds-api (licensed), sleeper (public, attribute).
  - Refused/gated: open-meteo (paid for commercial), espn-hidden-api (ToU bars commercial+automated), pro-football-reference (scraping forbidden), nfelo (no license).
- New `/api/legal/sources` (JSON) + `/data` public page ("how we source data, legally" — cleared vs refused, with reasons) + reusable `<Attribution>` component (renders CC-BY credit; added to /players and NGS). Nav + mobile nav wired.
- Tests: `source-registry.test.ts` (7, package) + `legal-sources.test.ts` (1, web).

### Ingestion — NFL Next Gen Stats (tracking data no box score has)
- New `apps/web/lib/nflverse/next-gen-stats.ts` (reads through `assertIngestible("nflverse")`): receiver separation/cushion/YAC-over-expected, QB CPOE/time-to-throw/aggressiveness, RB rush-yards-over-expected. Uses the NON-seasonal combined `ngs_{receiving,passing,rushing}.csv.gz` files (the per-season `ngs_2024_*` assets are broken 8-row upstream stubs — verified by row count, not just header) and resolves the latest season present. `canPublishProjections=false`, honest empty state.
- New `/api/nflverse/next-gen-stats` + `/players/nextgen` page (three dense leader tables, color-coded deltas, attribution). Cross-linked from Production Lab + nav.
- Tests: `next-gen-stats.test.ts` (3, offline fixtures: season-aggregate-only, threshold + sort correctness, API no-fabrication).

### Validation Evidence (this wave)
- `npm run typecheck --workspace=@sports/web`: PASS. `npm run lint --workspace=@sports/web`: PASS.
- `npm run test --workspace=@sports/data-ingestion`: PASS, 12 files / 88 tests (registry added).
- `npm run test --workspace=@sports/web`: PASS, 223 files / 2,615 tests (Wave 1); re-run after NGS covers the new suites.
- Live dev smoke on `http://127.0.0.1:3000`:
  - `/api/legal/sources`: cleared 3 (nflverse, the-odds-api, sleeper), blocked 4 (open-meteo, espn-hidden-api, pro-football-reference, nfelo).
  - `/data`: 200, renders cleared vs refused, CC-BY-4.0, doctrine.
  - `/api/nflverse/next-gen-stats`: 200, status live, season 2025, 26,723 source rows, 25/25/25 leaders, canPublishProjections=false. Cross-checked: separation leader Luther Burden (4.63yd), CPOE leader Drake Maye (+9.14%), RYOE/att leader Rhamondre Stevenson (1.36).
  - `/players/nextgen`: 200, all three tables, real names, `Data via nflverse` attribution, no error overlay.
- Diagnostic note: confirmed curl/node both fetch large nflverse gz fully (player_stats = 134,471 rows); the NGS per-season 2024 stub (651 bytes / 8 rows) is an upstream data issue, routed around via the combined files.

## Edge Signals — buy-low / sell-high data fusion (Claude overnight wave, 2026-06-05)

The "intelligent + creative" centerpiece: fuse two real datasets into an insight nobody else publishes the math on. Realizes the registry's own `ngs-separation-buy-low` backlog item. Read-only, no fabricated data, `canPublishPicks=false`.

- New `apps/web/lib/nflverse/edge-signals.ts` (ingests through `assertIngestible("nflverse")`): joins NGS receiving (separation, YAC-over-expected, share of intended air yards) with player_stats production (PPR/game, target share) by `gsis_id` for the resolved season; standardizes underlying-signal z vs production z across the qualified pool; `gap = underlyingZ - productionZ` → buy-low (gap ≥ 0.75) / sell-high (≤ -0.75) / aligned.
- New `/api/nflverse/edge-signals` + `/players/edge` page (buy-low and sell-high tables with the full z-score math shown; honest "research lens, not a pick" boundary; attribution). Cross-linked from Production Lab / NGS + nav.
- Tests: `edge-signals.test.ts` (3, offline fixtures proving buy-low/sell-high classification + empty state + API no-pick).

### Validation Evidence (Edge Signals)
- `npm run typecheck --workspace=@sports/web`: PASS.
- `npm run test --workspace=@sports/web -- __tests__/edge-signals.test.ts`: PASS, 3 tests.
- Live dev smoke `/api/nflverse/edge-signals`: 200, status live, season 2024, 129 qualified WR/TE, 20 buy-low / 20 sell-high, canPublishPicks=false. Top buy-low Marvin Mims (5.21yd separation, 8.1 PPR/g, gap +2.33); top sell-high Ja'Marr Chase (production far above separation signal, gap -2.23) — the method's logic shown openly, not hidden.
- `/players/edge`: 200 (clean dev restart), all tables + real names + attribution, no error.

### Dev-server note
Running `next build` against a live `next dev` corrupts the dev server's middleware chunk ("Cannot find the middleware module"), which 500s pages (middleware) while API routes (excluded) still 200. Not a code defect — clears on dev restart. Build and dev should not share `.next` simultaneously.

## Injury Report — availability ingestion (Claude overnight wave, 2026-06-05)

Availability is the top non-market driver of outcomes. Read-only from the nflverse `injuries` release (CC-BY-4.0).

- New `apps/web/lib/nflverse/injury-report.ts` (via `assertIngestible("nflverse")`): per-season injuries CSV (verified real: injuries_2024 6,264 rows, injuries_2025 6,069; no non-seasonal combined — 404), name-keyed parse so the 2025 extra `season_type` column is handled; resolves latest week, classifies Out/Doubtful/Questionable, sorts by severity, keeps designations + practice notes, drops no-status/no-practice rows. Season fallback one year.
- New `/api/nflverse/injuries` + `/players/injuries` page (severity-colored designations table + Out/Doubtful/Questionable counts, attribution). Nav wired.
- Tests: `injury-report.test.ts` (3, offline: latest-week filter + severity sort + exclusion rules; empty state; API).

### Validation Evidence (Injury Report)
- typecheck PASS; lint PASS; web 226 files / 2,644 tests; production build PASS.
- Live dev smoke `/api/nflverse/injuries`: 200, status live, season 2025, week 22, 6,068 rows, counts out 1 / questionable 3, real names (Joshua Farmer Out, Harold Landry III Questionable). `/players/injuries`: 200, clean.

## Sleeper Market Signal — second provider (Claude wave, 2026-06-06)

Proves the legal ingestion framework generalizes beyond nflverse to a different PROVIDER and data type (JSON, not CSV): live fantasy add/drop crowd sentiment.

- New `apps/web/lib/sleeper/market-signal.ts` (ingests through `assertIngestible("sleeper")`, carries `attributionFor("sleeper")`): fetches Sleeper `/v1/players/nfl/trending/{add,drop}` (small) + `/v1/players/nfl` (the ~14.6MB player map, 12,197 players) and joins trending sleeper-ids → names/team/pos/injury. `cache: "no-store"` on fetches (keeps the 14MB map out of Next's data cache) + in-process caches (trending 30m, player map 6h per Sleeper's guidance). `canPublishPicks=false`; honest empty state.
- New `/api/sleeper/market-signal` + `/players/market` page (rising/falling tables, injury flags, attribution). Nav wired.
- Tests: `sleeper-market-signal.test.ts` (3, offline JSON fixtures: join + unknown-id filtering + attribution; empty state; API).

### Validation Evidence (Sleeper)
- typecheck PASS; web focused 3 tests PASS.
- Live dev smoke `/api/sleeper/market-signal`: 200, status live, lookback 24h, pool 12,197, 25 adds / 25 drops, attribution "Trending player data via Sleeper.", canPublishPicks=false. Top add Malik Davis (DAL) 18,468; top drop Darren Waller (FA) 5,436. `/players/market`: 200, clean, real names + attribution.
- Recon caught the path/shape: trending returns `[{player_id,count}]` (sleeper ids), joined via the player map (full_name/team/position/injury_status).

## Snap Share — workload primitive (Claude wave, 2026-06-06)

The cleanest leading usage signal: share of team offensive snaps. Read-only nflverse `snap_counts` (CC-BY-4.0); no join needed (file carries player names directly).

- New `apps/web/lib/nflverse/snap-share.ts` (via `assertIngestible("nflverse")`): per-season snap_counts CSV (verified real: 2025 26,613 / 2024 26,616 rows; `offense_pct` is a 0-1 fraction — Kincaid 0.84), aggregates REG offense-snap games per `pfr_player_id`, ranks RB/WR/TE by avg snap share (min 4 games). Season fallback; honest empty state.
- New `/api/nflverse/snap-share` + `/players/snaps` page (per-position snap leaders, attribution). Nav wired.
- Tests: `snap-share.test.ts` (3, offline: REG-only + min-games + non-offense exclusion; empty state; API).

### Validation Evidence (Snap Share)
- typecheck PASS; web focused 3 tests PASS.
- Live dev smoke `/api/nflverse/snap-share`: 200, status live, season 2025, 26,612 rows, 40/40/40 leaders, canPublishProjections=false. Top WR Tre Tucker (LV) 94.8% over 17g; top RB Christian McCaffrey 83.1%. `/players/snaps`: 200, clean.
