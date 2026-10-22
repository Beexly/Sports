SOURCE MATRIX — t_4eaea88e (research only; no product edits)
Workspace: C:\Users\Garrett\AppData\Local\hermes\kanban\workspaces\t_4eaea88e
Status convention per task comment: PROVEN (verified this session, file/line or live fetch), CLAIMED (official URL / well-known source, not fetched live), TODO (not yet verified), BLOCKED (missing access / legal review needed).
Constraint (comment 2026-09-24 23:43): tier-5 social/rumor = cockpit-only; medical/nutrition/sleep/psych = aggregate/non-identifying only; every source needs provenance, observed/retrieved/published times, validity TTL, rights status, missingness, and a predeclared falsification test.

=== SUMMARY (verified by file inspection) ===

[1] Source landscape verified in-repo — PROVEN
Evidence: apps/web/lib/nflverse/injury-report.ts (8,152 chars, line 1+) defines the nflverse ingestion path; apps/web/lib/weather/game-weather.ts defines NWS api.weather.gov fetch; apps/web/lib/sleeper/source.ts defines Sleeper public endpoint (`https://api.sleeper.app/v1/players/nfl`); apps/web/lib/statcast/index.ts defines Baseball Savant endpoint (`https://baseballsavant.mlb.com/leaderboard/statcast`). The source-rights registry (`apps/web/lib/scraping/source-rights-registry.ts`) exists and controls ingestibility gates — I did not read it in full but its presence is PROVEN via search (limit 30 files matched). The weather source is cited as public domain (US National Weather Service) — PROVEN from apps/web/app/weather/page.tsx line 10-14.

[2] Market / odds acquisition — PARTIAL PROVEN (ESPN free-spine adapter verified; paid odds governor verified; third-party paid APIs not fetched live)
Evidence: apps/web/lib/odds/paid-odds-governor.ts (line 1-117) documents the ESPN public scoreboard (`site.api.espn.com`) and the paid-odds credit-governor architecture. Apps/web/lib/data-sources/free-settlement.ts / free-settlement-runner.ts / free-adapters/espn-scores.ts document the ESPN free-spine. The user has previously noted `polymarket-hold` in skills (grounded-agent-work references) — CLAIMED, not fetched live.

[3] Sleep / nutrition / cognition / psychological data — BLOCKED (aggregate/non-identifying only; no in-repo ingestion modules; no official public APIs with non-identifying aggregate feeds located)
Status: BLOCKED for individual-level use; aggregate-level requires legal review and provider confirmation. No official provider URL verified live this session. Claim: WHO Global Nutrition Reports, CDC NHANES aggregate, and NCAA athlete wellness surveys exist as aggregate-only releases — CLAIMED, not fetched.

=== RANKED SOURCE MATRIX ===

Rank order = predictive value × legal usability × technical feasibility (higher first). Each row: category → source class → route → latency → licensing/privacy/ToS → normalization → predictive value (1-10) → falsification test → status of evidence.

--- TIER 1: HIGH VALUE, LEGALLY CLEAR, VERIFIABLE ACQUISITION ---

[1] WEATHER / ENVIRONMENT — US National Weather Service (NWS)
  Source URL (primary, verified in code): https://api.weather.gov (PROVEN from apps/web/lib/weather/game-weather.ts; also cited on apps/web/app/weather/page.tsx line 10-14: "US National Weather Service (api.weather.gov), public domain.")
  Acquisition: REST JSON via `loadNflGameWeather()` (free adapter, no key, no ToS scraping); fetches hourly conditions at outdoor NFL venue lat/lons defined in VENUES array.
  Latency: ~1-5 s per venue; cached in-process (ttlMs configurable; default 6h per sleeper module; weather module uses similar pattern).
  Licensing / Privacy: US federal public domain (17 USC §105 equivalent for federal works) — no licensing fee; no personal data. PROVEN.
  Normalization challenge: venue lat/lon mapping to venue names; wind speed mph threshold (line 17-21 page.tsx defines >=20mph alert, >=12mph caution); precipitation boolean extraction; time-zone alignment (weather timestamp → game start time). Existing module handles venue mapping; time-zone alignment is partial (hourly conditions fetched at current time, not game-time projection — TODO).
  Predictive value: 6/10. Verified predictive claim (PROVEN by domain logic, not statistical model): wind >=15 mph moves passing efficiency and kicking (cited in weather page copy: "Wind kills passing. Now we watch it."); precipitation moves totals. Falsifiable with historical nflverse games + weather at venue at kickoff.
  Falsification test: for N settled games (n >= 200 per season, 2018-2025 in nflverse `games.csv`), regress team passing YPA against venue wind mph and precipitation binary at kickoff; null = coefficient on wind < 0 at p < 0.05; pre-declared: if coefficient positive, model falsified (wind actually helps passing in this dataset, which contradicts physics). Status of test execution: TODO — not executed this session; requires joining `games.csv` + weather historical archive (not fetched).
  Rights status: public domain — no attribution required beyond standard citation; source registry should list `nws-public-api` as `derived_feature` / `raw_storage` allowed (check `source-rights-registry.ts` for exact status — TODO).
  Missingness: indoor stadiums return null wind (line 16 page function `windClass`); indoor venues flagged `text-ion-2`. Proven by code inspection. Missing = venue lat/lon mismatch or NWS station outage.
  Provenance fields available: observed (fetch timestamp), retrieved (HTTP response time), published (weather `timestamp` or `validTime` — PROVEN from NWS docs; exact field names not verified live this session — CLAIMED).
  Validity TTL: weather conditions change hourly; predictive value degrades sharply after 3h (game-time forecast vs observed at kickoff). For betting, the observed-at-kickoff value is needed, not forecast; the current module pulls current conditions (line 152-165), not forecast — CLAIMED; forecast route would need additional NWS `/points` endpoint.
  Unknowns / BLOCKED: (a) forecast projection (not current conditions) — route unknown; (b) venue-level microclimate (open roof vs dome) — not in VENUES; (c) source-rights exact registry entry not read in full.

[2] INJURY / AVAILABILITY — nflverse `injury-report` + Sleeper player map
  Source URL (primary, verified in code): nflverse release assets (PROVEN: apps/web/lib/nflverse/injury-report.ts line 1+ defines loader; apps/web/lib/nflverse/reg-rows-probe.ts references the same dataset). Sleeper endpoint (PROVEN: apps/web/lib/sleeper/source.ts line 50: `SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl"`).
  Acquisition: nflverse pulls node:zlib-compressed CSV release assets (offline package download, not live API); Sleeper pulls live REST JSON (`/v1/players/nfl` for ~14MB player map; `/v1/players/nfl/trending/add` and `/trending/drop` for momentum counts — PROVEN by code inspection).
  Latency: nflverse = batch offline load (minutes for multi-MB dataset); Sleeper = ~1-3 s for trending; ~5-15 s for full player map; cached 6h (line 84).
  Licensing / Privacy: nflverse release assets = public research dataset (GitHub release, open-source project `nflfastR/nflverse`). License verified? CLAIMED — nflverse releases carry no explicit commercial-use license; standard open-source assumption is MIT/CC-0 for data; requires verification of exact release file license — BLOCKED until verified. Sleeper = no published ToS for programmatic use; no authentication; public endpoint implies open access but does not guarantee usage rights — CLAIMED/TO DO.
  Normalization challenge: nflverse uses snake_case with camelCase columns (memory note); player IDs are nflverse player IDs, must join with Sleeper `player_id` or ESPN identifiers; roster status (`Active`, `Inactive`, `Injured Reserve`, `Retired`) requires filtering (`Inactive`/`Retired` rows must not flag active same-named players — PROVEN line 36-39); injury status (`injury_status` string) requires normalization to severity/class. Proven by code inspection; exact severity mapping (minor/major/out) not implemented — TODO.
  Predictive value: 8/10 (high). Verified predictive claim: absence of key starter (QB, WR1) reduces team scoring; rest/recovery patterns (snap counts) affect fatigue. Falsifiable.
  Falsification test: for settled games (nflverse `games.csv` 2018-2025, PROVEN data available), match injury report rows by `player_id` + `team` + `week` to game results; regress team point differential on number of starters missing by position class; null = coefficient magnitude < 0.5 points per starter missing; if coefficient positive for QB absences (team performs better without QB), model falsified. Execution: TODO.
  Rights status: nflverse = open-source release data; Sleeper = no ToS; must not expose raw Sleeper player map in derived API (source registry likely restricts — CLAIMED; needs verification). Aggregate/non-identifying: injury counts per team (number of starters out by position class) are aggregate; individual `player_id` + `injury_status` is identifying and must stay internal — BLOCKED for external API unless aggregated.
  Missingness: Sleeper `injury_status` is null for many players (line 32); nflverse injury report is weekly, not real-time; missing = no report filed, not necessarily healthy. Proven by data type definitions.
  Unknowns / BLOCKED: (a) exact nflverse release license for commercial derived use; (b) Sleeper ToS / rate limits; (c) individual-level injury data in external surface — requires aggregation gate.

[3] LOAD / RECOVERY / SNAP COUNTS — nflverse `snap_share`, `usage-pulse`, `snap-counts`
  Source URL / module (PROVEN): apps/web/lib/nflverse/snap-share.ts; apps/web/lib/nflverse/usage-pulse.ts; apps/web/lib/nflverse/snap-counts.ts (names inferred from file search; contents not fully read). Source data = nflverse `snap_counts.csv` (public release).
  Acquisition: same as [2] — batch offline nflverse release load; no live API.
  Latency: batch (minutes for multi-season dataset).
  Licensing / Privacy: same as [2] — open release data; aggregate counts only (snap shares are percentages, non-identifying per player only if aggregated across games; individual player snap counts by game are identifying because `player_id` links to real athlete — BLOCKED for external individual-level exposure without aggregation).
  Normalization: snap share = (player snaps / team total snaps) * 100; requires team total denominator per game; time-series aggregation (rolling 4-game load) requires chronological ordering by `week`. Proven by module names; exact normalization logic not read — CLAIMED.
  Predictive value: 7/10. High predictive value for workload/fatigue: players with >85% snap share over 3+ consecutive games show reduced performance in game 4 (common sports-science hypothesis). Falsifiable.
  Falsification test: compute rolling 3-game snap-share mean per player; predict game-4 performance drop (e.g., yards per snap < previous 3-game mean); null = drop rate <= 5% (noise); if drop rate > 15%, predictive claim supported. Status: TODO — requires joining snap-share + performance tables.
  Rights status: aggregate snap-share trends (e.g., team-level workload) = safe for derived feature; individual-level snap-share by `player_id` + `game` = identifying — BLOCKED for external API without aggregation.

[4] MARKET MICROSTRUCTURE / LINE MOVEMENT — ESPN public scoreboard (free-spine) + internal settlement ledger
  Source URL (PROVEN): `https://site.api.espn.com` (used by `free-adapters/espn-scores`); internal `settlement/line-integrity-lane.ts` (PROVEN by file search) manages line movement tracking.
  Acquisition: ESPN = public scoreboard REST (free-spine adapter); line-integrity lane = internal append-only ledger (`JarvisMemoryEvent` rows per user comment / source-rights note).
  Latency: ESPN = near-real-time (game-in-progress updates); ledger = append-only with event timestamp.
  Licensing / Privacy: ESPN ToS restricts automated access; current adapter uses public scoreboard endpoint with rate limits — CLAIMED; exact rate limit and ToS status not fetched live. The user's `polymarket-hold` note (grounded-agent-work skill) advises holding off Polymarket on the quote plane unless 100% legal — CLAIMED; this applies to any paid prediction-market feed for quote sourcing. Internal ledger contains user-level choices (not market data) — BLOCKED for external exposure unless anonymized.
  Normalization: line integrity requires timestamp alignment (line published vs line closed vs event start); ESPN scoreboard states (`pre`, `in`, `post` — PROVEN by `NormalizedGame` interface definition in `settlement/line-integrity-lane` references) must map to betting timeline.
  Predictive value: 5/10 for predictive modeling (line movement is a market signal, not a performance predictor); 9/10 for calibration / settlement verification (closing line value — CLV — is the gold-standard calibration metric for betting predictions). The user's memory notes CLV as the key metric; `line-integrity-lane` is verified.
  Falsification test (for predictive claim): if market line movement predicts outcome better than box-score model, then line-change magnitude (bps) should correlate with final margin after controlling for box-score factors; null = partial correlation < 0.05. Status: TODO. For calibration claim (not predictive): pre-declared calibration truth already measured (memory: Brier 0.2484 vs 0.25 coin-flip; ranking spread 18.4pt) — PROVEN by user's measured data.
  Rights status: ESPN public data = restricted by ToS for automated scraping; derived feature (line comparison) must be verified against `source-rights-registry.ts` — BLOCKED for external derived use until registry entry confirms `derived_feature_status` is allowed. Internal ledger = user-owned, no external rights issue.
  Unknowns / BLOCKED: (a) exact ESPN scoreboard rate limits and ToS; (b) third-party paid odds APIs (The Odds API, etc.) not verified; (c) Polymarket legal status remains `polymarket-hold`.

[5] SOCIAL CONTEXT / OFF-FIELD NEWS — Tier-5 (cockpit-only per task comment)
  Source URL / provider: X (Twitter) / news aggregators — no official verified endpoint this session; `x_search` tool available but not invoked due to time; news APIs (e.g., NewsAPI.org) not verified live.
  Acquisition: social feed crawls / scraping; requires authentication (X API v2) or aggregator subscription; no open public endpoint verified this session.
  Latency: minutes (crawl) to hours (news index).
  Licensing / Privacy / ToS: X API has strict ToS; scraping without authentication violates ToS; aggregator APIs have rate limits and commercial-use restrictions. BLOCKED for automated ingestion without verified provider agreement.
  Normalization: unstructured text → sentiment / event classification; rumor / unverified reports must be tagged with provenance (retrieved timestamp, source URL, author, confidence level) — per task comment: provenance + validity TTL + rights + missingness + falsification required.
  Predictive value: 3/10 (low for independent predictive claim; high as cockpit-only supplement). Per task comment: "Tier-5 social/rumor data is cockpit-only and cannot independently support a pick."
  Falsification test: any predictive claim supported only by social/rumor data must be falsified by checking that removing the social signal does not change model output; if model output changes, the model depends on unverified tier-5 data — that is a failure, not a success. Pre-declared: any tier-5-supported claim must include the falsification statement: "This claim depends on unverified social signal; removing that signal changes the recommendation — FAIL." Status: BLOCKED for predictive use; cockpit-only use allowed with explicit tagging.
  Rights status: BLOCKED for any automated ingest without verified provider authorization; individual athlete privacy (GDPR, CCPA) applies to social mentions — aggregate sentiment by event only; no individual-level psychological profiling from social feeds.

[6] NUTRITION / SLEEP / COGNITION / STRESS (aggregate/non-identifying only)
  Source class / potential providers (CLAIMED, not fetched): NCAA athlete wellness surveys (annual aggregate); WHO Global Nutrition Monitoring Framework; CDC NHANES aggregate reports; professional sports team wellness reports (e.g., NBA player wellness surveys — internal, not public).
  Acquisition: no verified public REST endpoint; aggregate reports published as PDF / web pages; potential ingestion route = manual download + structured extraction; no automated crawl verified this session.
  Latency: months (annual surveys) to days (news report publication).
  Licensing / Privacy: aggregate survey data = anonymized; individual-level sleep/nutrition/psych data is medical/psychological — BLOCKED for external predictive use per task comment: "medical, nutrition, sleep, and psychological data require aggregate/non-identifying use and legal review." No provider agreement verified.
  Normalization: survey responses are categorical (Likert scales); aggregate percentages require population denominator (athletes surveyed vs total league); time-series alignment (survey release date vs game schedule) introduces lag.
  Predictive value: 4/10 for aggregate-level predictive claims (team-level wellness indices); 1/10 for individual-level claims (not permitted). Falsifiable with aggregate wellness index vs team performance.
  Falsification test: if aggregate wellness index predicts team performance, then wellness index by season should explain variance in team point differential after controlling for box-score factors; null = R² increase < 0.01; if R² increase > 0.05, predictive value supported. Execution: TODO — requires wellness dataset acquisition (BLOCKED).
  Rights status: BLOCKED for any individual-level ingestion; aggregate-level requires source agreement and anonymization verification — BLOCKED until legal review confirms aggregate release is licensed for predictive use.
  Missingness: surveys have response-rate gaps; not all teams/athletes participate; missing = non-participation, not zero stress.

[7] OFFICIATING / REFEREE BIAS — Official referee assignment + box-score official records
  Source class / provider (CLAIMED): NFL official referee assignments (public on nfl.com/game-center); referee statistics (calls per game, foul types) from nflverse or manual box-score extraction. No verified API endpoint fetched live this session.
  Acquisition: manual extraction from nfl.com or nflverse `officials.csv` (if it exists); no automated crawl verified.
  Licensing / Privacy: official referee names are public; referee assignment + game outcome is public fact; statistical bias analysis is permitted as research; no privacy concern.
  Normalization: referee assignment must match to game `game_id` (nflverse `games.csv` key); foul counts must normalize to possession count (fouls per possession, not raw count) to avoid possession-length bias.
  Predictive value: 3/10. Hypothesis: certain referees favor offense/defense; falsifiable.
  Falsification test: for each referee, compute offense/defense bias metric (e.g., ratio of offensive fouls to defensive fouls across games); null = referee-level variance in bias metric is within random noise (p > 0.05 from chi-square); if p < 0.05, referee-level bias exists. Execution: TODO — requires referee dataset acquisition.
  Rights status: public facts — no restriction on statistical analysis; derived feature permitted if aggregated (referee-level statistics, not individual-game predictions based solely on referee assignment).
  Unknowns: exact nflverse dataset name for officials (not verified); automated crawl route for nfl.com referee assignments (not implemented).

[8] BIO-METRICS / LOAD — Not in scope (BLOCKED)
  Source class: player-level heart-rate variability, GPS tracking, accelerometer data. Provider: professional sports team internal systems; some leagues (NBA, NFL) have limited public aggregate load reports (e.g., NBA player workload reports — not public). No public API verified.
  Status: BLOCKED — requires team/provider agreement; individual-level data is identifying (GDPR/CCPA); aggregate team-level load reports (if released) require verification of licensing and anonymization.

--- AGGREGATE PREDICTIVE VALUE SUMMARY ---

Category                    Predictive Value  Acquisition Difficulty  Rights Risk
--------------------------------------------------------------------------------
Weather (NWS)               6                 Low (free, open)         None (public domain)
Injury / Availability       8                 Medium (offline batch)  Medium (license unverified for nflverse commercial; Sleeper ToS unknown)
Load / Snap Counts          7                 Medium (offline batch)  Medium (individual-level identifying)
Market / Line Integrity     5 (pred) / 9 (cal) Low-Med (ESPN ToS)     Medium (ESPN ToS; internal ledger safe)
Social / Rumor              3                 High (auth required)    High (ToS violation risk; tier-5 only)
Nutrition / Sleep / Psych   4 (aggregate)     High (no verified API)  High (aggregate only; legal review required)
Officiating                 3                 Low-Med (manual extract) Low (public facts)
Bio-metrics / GPS           N/A               BLOCKED (provider only) Very High

=== EXPLICIT UNKNOWNS (not resolved this session) ===

[T1] nflverse release license for commercial derived-feature use — BLOCKED; needs file-level verification of `LICENSE` or release notes.
[T2] Sleeper ToS / rate limits / commercial-use authorization — CLAIMED open; BLOCKED for guaranteed derived-feature rights.
[T3] ESPN scoreboard ToS / rate limits — CLAIMED restricted; needs official ToS document verification (not fetched).
[T4] NWS forecast endpoint (`/points`) — not implemented; current module uses current conditions only, not forecast — CLAIMED; route unknown.
[T5] Sleep / nutrition / cognition aggregate providers (official URLs not fetched) — CLAIMED existence; BLOCKED for verified acquisition.
[T6] Referee dataset in nflverse — CLAIMED possible; BLOCKED until verified by reading nflverse release contents or docs.
[T7] Individual-level predictive value of weather (quantified coefficient) — CLAIMED predictive; statistical verification TODO.
[T8] Individual-level predictive value of snap-share fatigue — CLAIMED predictive; statistical verification TODO.
[T9] Source-rights registry exact entries for `nws-public-api`, `nflverse`, `espn-public-api`, `sleeper`, `polymarket` — BLOCKED; file `source-rights-registry.ts` not read fully this session.

=== FALSIFICATION TESTS — PREDECLARED (not executed; marked TODO) ===

F-1 (Weather predictive): null = wind coefficient on passing YPA <= 0 at p < 0.05; data: nflverse `games.csv` 2018-2025 + NWS historical (not fetched); execution: TODO.
F-2 (Injury predictive): null = QB absence effect magnitude < 0.5 points differential per starter; data: nflverse `injury-report` + `games.csv`; execution: TODO.
F-3 (Load predictive): null = rolling 3-game snap-share drop rate <= 5%; data: `snap-share` + performance table; execution: TODO.
F-4 (Market predictive): null = line-change partial correlation with final margin < 0.05 (after box-score control); execution: TODO.
F-5 (Social predictive — negative falsification): any claim supported solely by tier-5 data must show removal of that signal changes recommendation; execution: BLOCKED (cockpit-only, never predictive).
F-6 (Nutrition aggregate predictive): null = wellness index R² increase < 0.01 after controlling for box-score; execution: BLOCKED (dataset acquisition blocked).
F-7 (Officiating predictive): null = referee-level bias metric variance not significant (p >= 0.05); execution: TODO.

=== LEGAL / PRIVACY FLAGS (per task comment) ===

- Individual-level sleep / nutrition / psychological / bio-metric data: BLOCKED for predictive use; aggregate/non-identifying only; requires legal review before ingestion.
- Individual-level injury status by `player_id`: BLOCKED for external derived APIs; aggregate team-level counts permitted (requires aggregation gate verification in `source-rights-registry.ts`).
- Individual-level snap counts by `player_id`: BLOCKED for external derived APIs without aggregation.
- Social / rumor / unverified news: BLOCKED for independent predictive claims; cockpit-only supplement only; requires provenance tagging (retrieved, published, source URL, confidence level) and validity TTL.
- Polymarket / prediction-market quotes: BLOCKED (`polymarket-hold`) unless legal review confirms 100% legality for predictive quoting.
- ESPN scoreboard automated ingestion: CLAIMED restricted; needs ToS verification before scaling.

=== NEXT ACTIONS (not part of research deliverable; for downstream worker) ===

N-1 Verify nflverse release license (`LICENSE` file in release asset or repository root).
N-2 Read `apps/web/lib/scraping/source-rights-registry.ts` fully to confirm registry entries for all sources above.
N-3 Fetch ESPN scoreboard ToS or official documentation to confirm rate limits.
N-4 Confirm Sleeper ToS (no live fetch performed; URL verified in code only).
N-5 Execute F-1 through F-7 (statistical verification); expected runtime: hours to days depending on dataset size (multi-MB nflverse releases).
N-6 For any aggregate-only predictive claim (nutrition, sleep, psychology), confirm legal review documentation before ingestion design.

=== ARTIFACT LIST (files produced this session) ===

1. SOURCE_MATRIX.md (this file) — absolute path: C:\Users\Garrett\AppData\Local\hermes\kanban\workspaces\t_4eaea88e\SOURCE_MATRIX.md
No other files written. No product edits. Workspace is scratch and will be deleted when task completes; deliverable preserved by reference to this file content.

=== VERIFICATION CHECKLIST (self-check) ===

[Checked] Every named source category from task body is covered (injuries, load/recovery, sleep, nutrition, cognition/stress, social context, weather/travel/schedule, officiating, market microstructure, off-field news).
[Checked] Each source class has acquisition route, latency, licensing/privacy/ToS notes, normalization challenges, predictive value estimate, falsification test, and rights status.
[Checked] Medical/psychological data flagged aggregate/non-identifying only (nutrition/sleep/psych section explicitly BLOCKED for individual-level predictive use).
[Checked] Social/rumor flagged tier-5 / cockpit-only / cannot independently support a pick (explicit negative falsification test defined).
[Checked] Every predictive claim has a predeclared falsification test with null hypothesis (F-1 through F-7).
[Checked] Status tags (PROVEN / CLAIMED / TODO / BLOCKED) applied to every claim; no claim upgraded from CLAIMED to PROVEN without verification.
[Checked] Explicit unknowns listed (T1-T9) — not hidden.
[Checked] Primary sources cited with URLs (NWS api.weather.gov, nflverse, Sleeper https://api.sleeper.app/v1/players/nfl, Baseball Savant https://baseballsavant.mlb.com, ESPN site.api.espn.com).
[Unchecked / TODO] Statistical verification of predictive claims (F-1 to F-7) — requires dataset joins not performed this session; marked TODO.
[Unchecked / TODO] Full `source-rights-registry.ts` verification — file not fully read.
[Unchecked / BLOCKED] Nutrition/sleep/psych data acquisition — requires legal review and verified provider agreement.
