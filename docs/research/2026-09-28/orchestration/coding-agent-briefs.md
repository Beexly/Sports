# Coding-Agent Briefs — evidence, not instructions (2026-09-28)

Per Garrett's order: these briefs carry **what we found, with citations** — file paths, commit SHAs, endpoints verified live, what we could not verify, and the open questions. Nothing here tells you how to build, architect, or sequence the work. The repo's own rules (AGENTS.md, CONTRIBUTING.md, SECURITY.md) govern how you work.

Each brief names a genuine dependency only where it is a fact about the world (e.g. rankings need a projection source to exist). License facts are included because they are legal facts, not style choices.

## A. DFS salary imports — DraftKings verified live; FanDuel login-gated

**What we found (verified live 2026-09-28):**
- DK draftables endpoint works with no auth: `GET https://api.draftkings.com/draftgroups/v1/draftgroups/{draftGroupId}/draftables?format=json` — HTTP 200.
- Slate discovery: `GET https://api.draftkings.com/draftgroups/v1/` (HTTP 200, ~867KB, 126 draft groups; filter `contestType.sport == "NFL"`, `contestType.gameType == "SalaryCap"`, `draftGroupState == "Upcoming"`), or legacy lobby `GET https://www.draftkings.com/lobby/getcontests?sport=NFL` (each contest's `dg` = draftGroupId).
- This week's NFL Classic main slate: draftGroupId `154078`, starts `2026-10-04T17:00:00Z`, 1,135 draftables → **619 unique players**, 12 games. (Contest `196151357` "$2.75M Fantasy Football Millionaire" resolves to the same draftGroupId via `GET /contests/v1/contests/{contestId}?format=json` → `contestDetail.draftGroupId`.)
- Per-player fields observed: `salary`, `position` (QB/RB/WR/TE/DST), `rosterSlotId` (slot map 66=QB, 67=RB, 68=WR, 69=TE, 70=FLEX, 71=DST — FLEX rows duplicate the same `playerId`, dedup key is `playerId`/`playerDkId`), `teamAbbreviation`, `displayName`/`firstName`/`lastName`/`shortName`, `playerId`/`playerDkId`/`draftableId`, `status`/`newsStatus` (injury flags), `isDisabled`, `isSwappable`, `competition` (name like "LAC @ SEA" + startTime), top-level `competitions[]` with home/away teams (opponent derivation), `draftStatAttributes` (id 90 = DK's own avg-points/game; id -2 = rank vs position), `playerAttributes` (e.g. ByeWeek).
- **Not provided by DK:** projections, floor/ceiling, ownership. Matches the repo's `DfsPlayer` contract in `apps/web/lib/fantasy/dfs-slate.ts` (`{ id, name, pos, team, opp, salary, proj, floor, ceiling, own, ... }`, `SALARY_CAP = 50000`) — the salary side is covered, the projection/ownership side is not.
- Client fact: plain curl/requests gets **Akamai 403**; Chrome TLS impersonation (verified with `curl_cffi` + `impersonate="chrome131"` + `Origin/Referer: https://www.draftkings.com`) gets 200. No rate-limit headers observed on responses; no documented public rate limit.
- FanDuel: no public no-login salary endpoint. Their GraphQL requires a logged-in session (`x-auth-token` + `authorization`). One pipeline (sfaizi24/tnc-model-2025) scrapes FD via Playwright GraphQL interception — documented as fragile. The established precedent is manual CSV download from a logged-in contest page.
- Existing optimizer precedent: DimaKudosh/pydfs-lineup-optimizer is **CSV-only — zero API fetch code** (grep-verified, no `api.draftkings` references). Its importers: `pydfs_lineup_optimizer/sites/draftkings/classic/importer.py` (columns `ID, Name, Position, TeamAbbrev, Salary, AvgPointsPerGame, Game Info`), `pydfs_lineup_optimizer/sites/fanduel/classic/importer.py` (columns `Id, First Name, Last Name, Position, Team, Salary, FPPG, Injury Indicator, Game`). BenBrostoff/draftfast likewise reads downloaded salary CSVs plus a separate projections CSV.

**ToS facts:**
- DK Terms of Use (dknetwork.draftkings.com/terms-of-use/) bans intercepting/mining/collecting content by automated means on paper.
- Enforcement precedent found: DK's 2016 cease-and-desist against SuperLobby — for scraping/republishing lobby data, not for anonymous reads.
- The earlier "DK push-feed websocket ToS concern" claim could **not** be verified from a primary source in this pass.
- Repo standing-rule conflict: `apps/web/lib/integrations/dfs.ts` + `providers.ts:36` say the live slate must come from a contracted provider, "never the forbidden DraftKings hidden endpoint." The verified DK path conflicts with that rule — decision #2 in the decision log, Garrett's call.

**Open questions:** which salary-refresh cadence survives Akamai long-term; whether Garrett revises the standing rule (a) or keeps DK as research/backup input only (b).
**Source doc:** `salary-import-lanes.md` (full field tables, endpoint inventory, ToS section).

## B. CLV history — found in Garrett's own Neon database

**What we found (from the documented 2026-09-24/25 read-only pull, `docs/data-sources/research/2026-09-24/live-database-intelligence-report.md` — no live query was run for this):**
- Table `odds`: **8,083,183 rows**, 2.0 GB — timestamped per-book price time series (`bookmaker`, `market`, prices, `fetchedAt`).
- Table `odds_line_snapshots`: **2,213,952 rows**, 535 MB — phase-classified snapshots (`phase` = OPEN | INTERIM | CLOSE; `book`, `market` incl. `player_*` props, `side`, `price`, `line`, `capturedAt`, `source`).
- Table `opening_lines`: 4,923 rows — openers (`spread`, `total`, `homePrice`, `awayPrice`, `firstSeenAt`).
- Table `picks`: ~4,030 rows with per-pick CLV columns (`clvLockLine`, `clvLockPrice`, `clvCloseLine`, `clvClosePrice`, `clvKind`, `clvValue`, `clvVerdict`, `clvCapturedAt`, `clvGradedAt`, `bookDisagreementAtLock`) — 2,189 CLV-graded rows, avg CLV **−0.193**, zero positive.
- Code facts: writer `packages/ingestion-pipeline/src/line-archive.ts` (OPEN = first snapshot per game/market, else INTERIM; gated on `LINE_ARCHIVE_ENABLED=true`); `markClosingSnapshots` re-tags last pre-kickoff snapshot per (market, book, side) as CLOSE; math in `apps/web/lib/tracker/clv.ts` (pure computeSpreadClv/computeTotalClv/computeMoneylineClv), `packages/prediction-engine/src/clv-harness.ts`, `packages/prediction-engine/src/clv-decomposition.ts` (OLS information-vs-liquidity; honesty rule — never label residual "sharp/public money"; `market-memory.ts`'s `sharpSplitSourced` gate), `scripts/ops/regrade-against-book-lines.ts`. Books tracked: fanduel, draftkings, betmgm, caesars, pointsbetus, bovada, mybookieag (+ Kalshi/Polymarket/Novig/ProphetX in `us_ex`).
- **Known gap:** snapshot writer silently broke **2026-08-22 → ~mid-Sept 2026** (wrong Prisma filter shape swallowed by a catch returning `{persisted: 0}`) — three weeks of missing CLOSE data. Freshness monitor `apps/web/lib/ops/odds-line-archive-freshness.ts` exists but wires to no alert channel.
- **Backfill evidence:** OddsPapi `/historical-odds` is free/unmetered per repo docs (NFL sportId 14); Pinnacle NFL game lines only, no props. `fetchPinnacleLineMovement` (packages/data-ingestion/src/odds-provider-adapter.ts, 37 tests) does the backfill. Terms: internal analytics only, no resell; `certifiableForLiveGate=FALSE` pending Garrett's legal read. Garrett's Odds API account (under baxley.garrett@gmail.com, 20K credits/mo) is active — he said 2026-09-28 to use it for backfills and will buy another month if a lane needs it.
- Also checked and found nothing material: gse-competitive-intel (56 CLV hits — playbooks/specs only, no data), ~/workspace notes (strategy notes only, zero CSV/JSON line files). `game_signals` (5,142 rows) is schedule-only, not lines.

**What we could NOT verify:** exact current coverage (min/max dates, per-sport, per-book counts) — no `DATABASE_URL` was available; needs a fresh transient read grant from Garrett.
**Open questions:** `LINE_ARCHIVE_ENABLED=true` in prod? legal read on OddsPapi terms (#4); who wires the freshness alert.
**Source doc:** `clv-hunt-report.md`.

## C. Adjustment layer v1 + player signals — the spec exists, the code does not

**What we found:**
- Spec: `docs/research/2026-09-27/total-signal-wiring-spec.md` (Beexly/Sports branch `motif/total-signal-wiring-2026-09-27`, commit `b031328`) — taxonomy v1 (OL injuries, secondary injuries, pass-rush, depth chart, weather, Vegas/script, off-field intake); rule shape TRIGGER→AFFECTED→DIRECTION→MAGNITUDE→LOG; magnitudes are backtest calibration tasks, not constants.
- Fact: the player-signals table is **empty (0 rows)**; `game_signals` has 5,142 rows; **no adjustment layer exists** — Garrett's backup-LT and hurt-safety/corner examples have zero code behind them.
- Dependency fact (from Garrett's standing build order): projection source lock comes first; the adjustment layer consumes projections.

**Open questions:** projection source (Garrett's call, gates everything); magnitude calibration is a backtest task per the spec.
**Source doc:** the total-signal wiring spec itself.

## D. NGS feed — creation plan; HARD internal-only doctrine from Garrett

**Standing rule (Garrett, 2026-09-28 — not a suggestion):** NGS data and metric names **never appear on the website or any public surface — not even a little.** No NGS data in articles, rankings, visualizations, API responses, or public discussion — not values, not metric names, not "powered by NGS-style tracking." The posture: NGS is reasoning fuel only — the engine learns from it the way a person studies film and forms their own judgment; nothing commercial touches their data. His words on weighting: NGS signals are "extremely, extremely valuable" — their own calibrated weight, calibrated like every other signal family. Violations are integrity failures.

**What we found (evidence for the build):**
- Ranked source options: (1) `asonty/ngs_highlights` TSVs (2017–2019, highlight plays, full NGS column set incl. x/y/s/o/dir/event — dead time before line set and post-TD celebration included, loader must trim); (2) nflverse NGS aggregates (`ngs_{passing,receiving,rushing}`, CC-BY-4.0, player-week grain — calibration anchors only, never frames); (3) scrape via the nfl-ngs-raw method — probe-first, build only if live; (4) broadcast-CV reimplementing `cv-movement-primitive.ts` math — no counsel clearance for broadcast extraction; (5) licensed feed (SkillCorner low-to-mid five figures/yr estimate, Genius Sports six-to-seven figures, SIS DataHub Pro $99.99/mo as charting adjunct) — Garrett's money only.
- Negative findings (do not chase): nflverse publishes NO per-frame tracking; the public `nextgenstats.nfl.com/api` may be dead (moved behind NFL+ Premium per a 2026-09-04 SportsDataverse commit); nfl-ngs-raw only gets tracking for highlight plays; BDB 2026 dataset is CC BY-NC 4.0 — never a training input, and even benchmark use needs its license-vs-playbook-destruction-terms discrepancy resolved.
- Method adoption: the four nfl-ngs-raw doctrines (raw-first, validity-by-content, pace-between-attempts, empty-envelope sentinel; plus finality-from-schedule, failed≠absent, atomic writes) — method only, no code copied. Target schema: 23 entities/frame at 10 Hz, §2 of the plan. Storage: raw frames as per-play Parquet in the lake; Postgres gets derived per-play features only. Milestones M0–M6 with loader/physics/validation gates (calibration gates ECE < 0.15 yd, coverage ± 5 pp).
- Existing fence pattern: `apps/web/lib/fences/no-raw-ngs-fence.ts` — the doctrine's CI fence extends it.

**Source doc:** `ngs-feed-creation-plan.md` (includes §0.A doctrine, ranked sources, target schema, validation protocol, milestones).

## E. Movement lane — spec'd and scaffolded, nothing trained

**What we found:**
- Spec: `docs/engine/research/2026-09-26/2026-09-26-movement-module-spec.md` (on `main`) — synthesizes NFL Big Data Bowl 2026 winner takeaways (Takoi: ball–runner–defender relational modeling; Mifune: speed + prediction confidence outputs for physics-smooth trajectories). Leaderboard reference band RMSE 0.518–0.540 yards. Key takeaways: predict deltas + speed/uncertainty (not raw coords); ball-landing conditioning ~20% feature importance; relational 22-player modeling beats per-player sequences; physics-informed losses; horizontal flip augmentation; ensemble + TTA. ML work in Python/PyTorch; the TS engine consumes it.
- Code exists: `packages/prediction-engine/src/tracking/cv-movement-primitive.ts` (~9k chars, V3) — `FramePoint`/`Tracklet`/`MovementMetric` contracts, camera motion estimation via optical flow, homography from yardlines (pixels → field meters), per-player speed/distance. Its own header: math + data contract foundation; **no detector weights**.
- Fact: nothing is trained or live. The plan states movement training needs the feed's M2/M4 milestones before learning (dependency fact from the plan, not a command).
- Constraint: BDB 2026 data is CC BY-NC 4.0 — the spec carries this as a hard constraint; train on GSE's own NGS data.

**Source doc:** the movement module spec; `ngs-feed-creation-plan.md` for the feed dependency.

## F. License facts (legal facts, not style)

**What a license means, plainly:**
- **MIT / Apache-2.0:** free to use, copy, modify, sell, keep private — keep the copyright notice. Green light for the commercial product.
- **CC-BY-4.0:** usable with attribution in the specified format.
- **LGPL:** may be used as an unmodified dependency (not copied into the tree).
- **No license:** all rights reserved — learn the method from reading, never copy code.
- **GPL-3.0 / AGPL-3.0 code:** study only — methods and facts are learnable, zero code ported, no line-by-line translation. AGPL's network clause makes it the dangerous one for a web product. Clean-room discipline: design doc first, implement from the doc, provenance headers. These are engineering-verdict-level findings — not legal advice.

**Per-item verdicts from the research (Beexly/Sports sweep branches):**
| Item | License | Verdict |
|---|---|---|
| DimaKudosh/pydfs-lineup-optimizer | MIT | Usable with attribution |
| ryanpmcintire/nfl_py3 | MIT | Usable with attribution (its weak-signal registry schema is the notable piece; note: its "Bayesian team model" is actually prior-weighted PageRank + ridge per the teardown) |
| mattleonard16/nflalgorithm | MIT | Usable with attribution (0–100 confidence tiers) |
| ebhattad/nfl-mcp | MIT | Usable with attribution (20 MCP tools over nflverse data — pattern for agent access) |
| jlattanzi4/nfl-survivor-optimizer | MIT | Usable with attribution (contains a full CRN field simulator with small-pool variance) |
| agentscope-ai/DojoZero | MIT | Usable with attribution — infrastructure only (event-sourced DataHub, JSONL replay, agent wire protocol); its prediction layer is persona-prompted vibe bets with no model |
| dgrifka/nfl_simulator | MIT | Usable with attribution (deserve-to-win math: OLS → 40k-draw posterior sampling → DTW%; reproducibility protocol with per-game seeding) |
| cbratkovics/fantasy-football-ai | MIT | Usable with attribution (dbt pipeline + as-of features + per-position RF/XGBoost + decision policies) |
| georgedouzas/sports-betting | MIT | Usable with attribution |
| chmoses98/nfl-edge-finder | No license | Method only (parlay pricing on 40,000 shared simulation draws) |
| mtsilverstein/Megatron | No license | Method only (quantile transformer for floor/ceiling) |
| sportsdataverse/nfl-ngs-raw | No license | Method only (the four doctrines; scrape→reshape pipeline shape) |
| Twoos123/draftkings-live-odds | No license | Method only (DK push feed → SSE architecture) |
| sumedhk0/PanopticPigskin | AGPL-3.0 | Method only, full stop (broadcast camera calibration; never port code) |
| dynastyprocess/data | GPL-3.0 | Facts extractable into our own schema; never vendor their files |
| nflverse-pfr | GPL-3.0 | Study only; get data from nflverse-data (CC-BY-4.0) instead |
| nflverse play-by-play data | CC-BY-4.0 | Usable with attribution |
| espn-fantasy-football-api (npm) | LGPL | Unmodified npm dependency only, if adopted |

**What we could NOT verify:** the remaining GPL boundary questions are judgment calls — flagged as decision items where they gate work.
**Source docs:** `gpl-verdicts.md` (per-item), `gpl-explainer.md` (plain-language full guide).

## G. Method references for the DFS/optimizer work (evidence)

**What we found (all read at the code level in the sweep teardowns):**
- **pydfs-lineup-optimizer** (MIT): binary-var MILP over CBC, iterative re-solve multi-lineup (not k-best), mandatory hard-constraint stacking with conditional bring-backs, solver-integrated exposure. Zero simulation/backtesting. Where GSE's `apps/web/lib/fantasy/` leads: payout-sim, correlation-EV scoring, provable k-best. Where pydfs leads: objective-noise diversification, hard ownership caps, min-salary rule, multi-sport generality. Teardown includes a benchmark spec.
- **nfl-edge-finder** (no license): parlay pricing on 40,000 shared simulation draws (CRN discipline) — the comparison point for the repo's payout-sim correlation layer.
- **Megatron** (no license): quantile transformer for fantasy floor/ceiling, per-season checkpoints.
- **nfl-survivor-optimizer** (MIT): log p − λ·log field-survival objective, Hungarian assignment, hidden full CRN field simulator.
- **Twoos123/draftkings-live-odds** (no license): DK push feed → SSE at ~0.2s latency — architecture reference for the live-slate gap. Commercial-use ToS note from the earlier sweep: treat as unverified pending a primary source.
- **DojoZero** (MIT): infra worth studying (event-sourced DataHub, JSONL replay as backtest substrate, external-agent wire protocol, auto-scheduling, 180s LLM throttle); prediction layer is theater.
- **dgrifka/nfl_simulator** (MIT, pushed 2026-09-23): the most rigorous public NFL-model doc set found — 75 research docs, deserve-to-win methodology. The portable piece per the teardown is the reproducibility protocol (pre-registered gates, pin-checked weight artifacts, per-game sha256 seeding, calibration firewall: process metrics ≠ forecast features).

**Source docs:** `docs/research/2026-09-28/github-nfl-sweep/deep-dive/teardown-pydfs-lineup-optimizer.md`, `teardown-dojzero.md`, `teardown-nfl-simulator-method.md`, `keeper-deep-passes.md` (branches `motif/github-nfl-sweep-2026-09-28` @ `7617c9d` and `motif/github-nfl-sweep-deep-dive-2026-09-28` @ `6cd7155`, both verified on the remote).

## H. Rankings program — scope and the public benchmark evidence

**What Garrett ordered:** rest-of-season rankings, week-by-week rankings, positional rankings (QB/RB/WR/TE), weeks 4 through the fantasy playoffs. Single projection core — the research doc carries a standing constraint: no rankings-specific projection fork (a divergence between the engine's pick and the published ranking for the same player/week is a bug). Weekly immutable snapshots `{season, week, product, generated_at, input_hashes, model_version}`; post-publish corrections as new snapshots with changelog entries, never in-place edits. Confidence tiers on the 9.2 Hold floor. On "hand-graded every play": the doc decomposes FantasyPoints' edge into an automatable play-tagging pipeline (personnel/formation/coverage/route/blitz tags over legally available film, automated QC, low-confidence tags as the review queue) vs. what genuinely needs human review (ambiguous shells, the QC queue, edge-case adjudication feeding back as training labels). Cost honesty carried: no "hand-graded" claim until humans actually graded.

**Dependency facts:** rankings consume the engine — they cannot honestly exist before (1) the projection source is locked (Garrett's call, the master gate), and (2) the adjustment layer v1 + populated player signals exist. Off-field intake folds in as it clears backtest.

**Public benchmarks — researched 2026-09-28 (this replaces the killed head-to-head scoreboard):**
- **FantasyPros accuracy rankings** (fantasypros.com/nfl/accuracy/): the canonical analyst benchmark — 150+ experts scored on rankings-vs-actuals, worst week dropped. 2025 in-season winner Justin Boone (Yahoo); 2024 Tyler Orginski; Nathan Jahnke (PFF) most accurate in-season six straight seasons. Draft accuracy: fantasypros.com/2026/07/2025s-most-accurate-fantasy-football-draft-rankings/ (3-year rolling: Jody Smith–Draft Sharks #1).
- **FFA MAE study** (fantasyfootballanalytics.net/2024/12/which-fantasy-football-projections-are-most-accurate.html): projection-level MAE, 2019–2023, startable pool (top-20 QB/TE, top-50 RB/WR). Per-position leaders rotate yearly (FFToday, CBS, FantasySharks, NumberFire); the FFA simple average is consistently near the top — consensus beats nearly every individual source.
- **FSTA awards**: industry "most accurate projections" awards (e.g. Sean Koerner 4x per public bios).

**Evidence on the FantasyPoints radio claim:**
- For: their own page (fantasypoints.com/nfl/projections) claims **"#1 DFS Fantasy Projections"** — 2025 season, DraftKings, "weekly correlation testing across 18 regular-season main slates"; their newsletter cites 0.71 CORREL, "#1 among the top 5 biggest DFS sites, after finishing 2nd-best last year" (newsletter.fantasypoints.com/p/early-bird-discount-2026). Supporting color: they hand-chart every snap; Milly Maker subscriber wins 2023–2025; FSWA nominations.
- Against: competitors are anonymized ("Comp. 1–3"), the full methodology is unpublished, and **no independent benchmark tracks FantasyPoints** — FantasyPros' analyst leaderboards and the FFA MAE studies do not include them. The claim is DFS-projection *correlation* on DK slates — a different measurement from what FantasyPros scores (analyst ranking accuracy) and from what FFA scores (projection MAE). Self-reported correlation against unnamed competitors is not independently verifiable from public data.

**Internal accuracy tracking:** MAE/RMSE/Spearman vs. actuals per position per week, auto-scored after games finalize, confidence intervals on differences, misses recorded honestly — the internal record. The public benchmarks above are the arena.
**Open questions:** which leaderboard(s) GSE appears on (#15); human-review staffing and cost (#16); K/DEF in v1.
**Source doc:** `rankings-program.md` (§4 is the benchmark evidence).

## Standing facts (not instructions)

- Repo rules (AGENTS.md, CONTRIBUTING.md, SECURITY.md) govern how you work and land work.
- The vendor checkout at `~/workspace/vendor/Sports` has forbidden local-only commits at its HEAD (`fd289d1d4`, `2253f3e48`) — read there, never push from it.
- Never touch `gse-grok-build-sandbox`.
- Nothing posts to @GalaxySportsHQ, no money touched, no accounts created, no spending — without Garrett's explicit word.
- NGS internal-only doctrine (Garrett, 2026-09-28) is a standing rule — see brief D.
- Nothing counts until it's on the remote (Garrett's rule): branch + commit SHA verified via API for every landing.
