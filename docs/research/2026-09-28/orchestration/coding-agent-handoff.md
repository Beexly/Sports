# GSE Coding-Agent Handoff — Evidence Base (2026-09-28)

This is the single file Garrett forwards to his coding agent. It carries **everything the research found, with citations** — endpoints, table counts, license facts, code references — and nothing else. No build instructions, no architecture directives, no process rules. How you work is governed by the repo's own rules (AGENTS.md, CONTRIBUTING.md, SECURITY.md). Garrett's standing rules are stated where they are facts about his operation, and labeled as such.

## Research provenance

All research below was conducted 2026-09-27 → 2026-09-28 and landed on the Beexly/Sports remote:

| Research | Branch | Commit | Location |
|---|---|---|---|
| GitHub NFL sweep (1,000 repos, 29 keepers) | `motif/github-nfl-sweep-2026-09-28` | `7617c9d4ec507fc54a6431d01eb10bde220c6a1b` | `docs/research/2026-09-28/github-nfl-sweep/` |
| Deep dive (1,094 repos, 30 more keepers, 4 teardowns, keeper deep passes) | `motif/github-nfl-sweep-deep-dive-2026-09-28` | `6cd715525de98a24c946ac71c720b5a9e337ed41` | `docs/research/2026-09-28/github-nfl-sweep/deep-dive/` |
| Orchestration v1 (4 research lanes) | `motif/orchestration-2026-09-28` | `cccefab3041dee9a584674c9fb0a989828f8e964` | `docs/research/2026-09-28/orchestration/` |
| Orchestration v2 (rankings, NGS doctrine, GPL explainer) | `motif/orchestration-v2-2026-09-28` | `2da983f433da932a1460b5017c256efa9f5faed2` | same dir |
| This handoff (v3, evidence-only rework) | `motif/orchestration-v3-2026-09-28` | *(this branch)* | same dir |

All branches verified on the remote via the GitHub API. Per Garrett's rule, nothing counts until it's on the remote — these are.

Key prior specs this work composes with: `docs/research/2026-09-27/total-signal-wiring-spec.md` (branch `motif/total-signal-wiring-2026-09-27`, commit `b031328`); `docs/engine/research/2026-09-26/2026-09-26-movement-module-spec.md`; `packages/prediction-engine/src/tracking/cv-movement-primitive.ts`.

---

## 1. DFS salary imports — DraftKings verified live, FanDuel login-gated

- **DK salary endpoint, verified live 2026-09-28, no auth:** `GET https://api.draftkings.com/draftgroups/v1/draftgroups/{draftGroupId}/draftables?format=json` → HTTP 200.
- Slate discovery: `GET https://api.draftkings.com/draftgroups/v1/` (~867KB, 126 draft groups; filter NFL / SalaryCap / Upcoming) or `GET https://www.draftkings.com/lobby/getcontests?sport=NFL` (contest `dg` field = draftGroupId). Contest `196151357` resolves to draftGroupId **`154078`** (this week's NFL Classic main slate, starts 2026-10-04T17:00:00Z, 1,135 draftables → **619 unique players**, 12 games).
- Per-player fields: `salary`, `position`, `rosterSlotId` (66=QB, 67=RB, 68=WR, 69=TE, 70=FLEX, 71=DST; FLEX rows duplicate `playerId` — dedup on `playerId`), `teamAbbreviation`, names, `status`/`newsStatus` (injury flags), `isDisabled`, `competition` (game + kickoff), top-level `competitions[]` (home/away teams), `draftStatAttributes` (id 90 = DK avg-points/game), `playerAttributes` (ByeWeek).
- **Not from DK:** projections, floor/ceiling, ownership. Repo contract `apps/web/lib/fantasy/dfs-slate.ts`: `DfsPlayer { id, name, pos, team, opp, salary, proj, floor, ceiling, own, ... }`, `SALARY_CAP = 50000`.
- **Client fact:** plain HTTP clients get Akamai 403; Chrome TLS impersonation verified working (curl_cffi `chrome131` + `Origin/Referer: https://www.draftkings.com`). No rate-limit headers observed.
- **FanDuel:** no public endpoint; GraphQL requires a logged-in session. Manual CSV download is the established precedent.
- **Optimizer precedent:** pydfs-lineup-optimizer (DimaKudosh) is CSV-only — zero API fetch code (grep-verified); draftfast likewise. Importer column shapes documented in `salary-import-lanes.md` §3.
- **ToS facts:** DK's written terms ban automated collection on paper; the only enforcement precedent found is the 2016 SuperLobby C&D (republishing lobby data). Anonymous read-only salary pulls are the industry standard; logged-in actions are the risk surface. The "DK push-feed ToS" claim could not be verified from a primary source.
- **Conflict fact:** repo standing rule (`dfs.ts`, `providers.ts:36`) says the live slate must come from a contracted provider, "never the forbidden DraftKings hidden endpoint." The verified DK path conflicts with it — Garrett's decision #2.

## 2. CLV history — found in Garrett's own Neon database

- From the documented 2026-09-24/25 read-only pull (not a fresh query): `odds` **8,083,183 rows** (timestamped per-book prices), `odds_line_snapshots` **2,213,952 rows** (phase OPEN/INTERIM/CLOSE), `opening_lines` 4,923 rows, `picks` with per-pick CLV columns (2,189 CLV-graded rows, avg CLV **−0.193**).
- Books: fanduel, draftkings, betmgm, caesars, pointsbetus, bovada, mybookieag (+ Kalshi/Polymarket/Novig/ProphetX in `us_ex`). Cadence: daily `refresh-odds` cron.
- **Known gap:** 2026-08-22 → ~mid-Sept (snapshot writer silently failed); freshness monitor `apps/web/lib/ops/odds-line-archive-freshness.ts` wires to no alert channel.
- Code: `packages/ingestion-pipeline/src/line-archive.ts` (writer, `LINE_ARCHIVE_ENABLED` gate), `markClosingSnapshots` (last pre-kickoff per market/book/side = CLOSE), `apps/web/lib/tracker/clv.ts`, `packages/prediction-engine/src/clv-harness.ts`, `packages/prediction-engine/src/clv-decomposition.ts` (honesty rule: never label residual "sharp/public money"; `sharpSplitSourced` gate), `scripts/ops/regrade-against-book-lines.ts`.
- **Backfill evidence:** OddsPapi `/historical-odds` is free/unmetered (NFL sportId 14, Pinnacle game lines, no props); `fetchPinnacleLineMovement` in `packages/data-ingestion/src/odds-provider-adapter.ts` (37 tests). Terms: internal analytics only. Garrett's Odds API account is active (20K credits/mo); he'll buy another month if a lane needs it.
- **Could not verify:** exact current coverage — no `DATABASE_URL` was available for a fresh query; needs a transient read grant from Garrett.
- Checked and empty: gse-competitive-intel (playbooks only, no data), workspace notes (zero CSV/JSON line files), `game_signals` (schedule-only).

## 3. NGS — Garrett's standing doctrine (HARD) + the creation evidence

**The doctrine (his words, 2026-09-28):** NGS data and metric names never appear on the website or any public surface — not even a little. The engine learns from NGS the way a person studies film and forms their own judgment; nothing commercial touches their data. NGS signals are "extremely, extremely valuable" — their own calibrated weight, calibrated like every other signal family. The fence pattern exists: `apps/web/lib/fences/no-raw-ngs-fence.ts` — extend it as a CI gate over NGS field/metric identifiers.

**Source evidence, ranked:** (1) `asonty/ngs_highlights` TSVs (2017–2019 highlight plays; full NGS columns x/y/s/o/dir/event; dead time included — trim at load). (2) nflverse NGS aggregates (`ngs_{passing,receiving,rushing}`, CC-BY-4.0, player-week grain — calibration anchors, never frames). (3) Scrape via nfl-ngs-raw method — probe first; if dead, the fallback needs Garrett's NFL+ token. (4) Broadcast-CV reimplementing `cv-movement-primitive.ts` — no counsel clearance for broadcast extraction. (5) Licensed feed — SkillCorner (low-to-mid five figures/yr estimate), Genius Sports (six-to-seven figures), SIS DataHub Pro $99.99/mo (charting adjunct) — his money only.
**Negative findings:** nflverse has no per-frame tracking; public NGS API may be dead (behind NFL+ Premium per 2026-09-04 SportsDataverse commit); nfl-ngs-raw is highlight-plays only; BDB 2026 is CC BY-NC 4.0 — never a training input.
**Schema/plan evidence:** 23 entities/frame at 10 Hz; raw frames as per-play Parquet in the lake, Postgres gets derived features only; nfl-ngs-raw's four doctrines (raw-first, validity-by-content, pace-between-attempts, empty-envelope sentinel) adopted as method; milestones M0–M6 with loader/physics/calibration gates (ECE < 0.15 yd, coverage ± 5 pp).

## 4. License facts

- **MIT / Apache-2.0:** use freely, commercially, privately — keep the copyright notice.
- **CC-BY-4.0:** usable with attribution (format in `gpl-verdicts.md` §7).
- **LGPL:** usable as an unmodified dependency only.
- **No license:** all rights reserved — method learning only, never copied code.
- **GPL-3.0 / AGPL-3.0 code:** study only — zero code ported, no line-by-line translation; clean-room (design doc first, implement from the doc, provenance headers). AGPL's network clause is the web-product risk. (Engineering findings — not legal advice. Full guide: `gpl-explainer.md`.)

Per-item verdicts: pydfs-lineup-optimizer MIT ✓ · ryanpmcintire/nfl_py3 MIT ✓ (weak-signal registry; note: actually prior-weighted PageRank + ridge) · nflalgorithm MIT ✓ (confidence tiers) · ebhattad/nfl-mcp MIT ✓ (20 MCP tools) · nfl-survivor-optimizer MIT ✓ (CRN field simulator) · DojoZero MIT ✓ (infra only; predictions are theater) · dgrifka/nfl_simulator MIT ✓ (deserve-to-win math + reproducibility protocol) · cbratkovics/fantasy-football-ai MIT ✓ · georgedouzas/sports-betting MIT ✓ · nflverse play-by-play CC-BY-4.0 ✓ · espn-fantasy-football-api LGPL (unmodified dep) · nfl-edge-finder no-license (method) · Megatron no-license (method) · nfl-ngs-raw no-license (method) · draftkings-live-odds no-license (method) · PanopticPigskin AGPL (method only, full stop) · dynastyprocess/data GPL (facts only, never vendor files) · nflverse-pfr GPL (study only; use nflverse-data).

## 5. Movement lane state

- Spec `docs/engine/research/2026-09-26/2026-09-26-movement-module-spec.md`: BDB 2026 winner takeaways (relational 22-player modeling; deltas + speed + uncertainty; ball-landing conditioning ~20% importance; physics-informed losses; flip augmentation; ensemble + TTA). Reference RMSE band 0.518–0.540 yd. Python/PyTorch; TS engine consumes.
- `packages/prediction-engine/src/tracking/cv-movement-primitive.ts` (~9k chars, V3): contracts + optical-flow camera motion + yardline homography + speed/distance math. **No detector weights.**
- Fact: nothing trained; the plan states training needs feed milestones M2/M4.
- Constraint: BDB 2026 CC BY-NC 4.0 — never a training input (its benchmark use also has an unresolved license discrepancy noted in the plan).

## 6. DFS optimizer method references (code-level teardowns)

- **pydfs-lineup-optimizer** (MIT): MILP/CBC, iterative re-solve, hard-constraint stacking + bring-backs, solver-integrated exposure, zero sim/backtest. GSE leads: payout-sim, correlation-EV, provable k-best. pydfs leads: objective-noise diversification, hard ownership caps, min-salary rule. Benchmark spec in the teardown.
- **nfl-edge-finder** (no license): parlay pricing on 40,000 shared simulation draws — comparison point for payout-sim correlation.
- **nfl-survivor-optimizer** (MIT): log p − λ·log field-survival, Hungarian assignment, hidden CRN field simulator.
- **Twoos123/draftkings-live-odds** (no license): DK push feed → SSE ~0.2s — architecture reference for the live-slate gap.
- **dgrifka/nfl_simulator** (MIT): 75 research docs; deserve-to-win math extracted; the portable piece is the reproducibility protocol (pre-registered gates, per-game sha256 seeding, calibration firewall).

## 7. Rankings program — scope + benchmark evidence

- **Scope ordered by Garrett:** rest-of-season, week-by-week, positional (QB/RB/WR/TE), weeks 4 through the fantasy playoffs. Single projection core (no rankings-specific fork). Immutable weekly snapshots `{season, week, product, generated_at, input_hashes, model_version}`; corrections as new snapshots with changelogs. Confidence tiers on the 9.2 Hold floor. "Hand-graded every play" decomposed: automatable play-tagging pipeline vs. genuine human-review needs (ambiguous shells, QC queue, adjudication as training labels); no "hand-graded" claim until humans graded.
- **Dependency facts:** cannot honestly exist before (1) the projection source is locked (Garrett's call), (2) the adjustment layer v1 + populated player signals exist. Off-field intake folds in as it clears backtest.
- **Public benchmarks (researched 2026-09-28):** FantasyPros accuracy rankings (fantasypros.com/nfl/accuracy/ — 150+ analysts; 2025 in-season winner Justin Boone/Yahoo; Jahnke six straight seasons); FantasyPros 2025 draft accuracy (fantasypros.com/2026/07/2025s-most-accurate-fantasy-football-draft-rankings/); FFA MAE study 2019–2023 (fantasyfootballanalytics.net/2024/12/which-fantasy-football-projections-are-most-accurate.html — consensus beats individuals); FSTA awards.
- **On the FantasyPoints radio claim:** their page claims "#1 DFS Fantasy Projections" — 2025, DraftKings, weekly correlation across 18 main slates (fantasypoints.com/nfl/projections); newsletter cites 0.71 CORREL "#1 among the top 5 biggest DFS sites" (newsletter.fantasypoints.com/p/early-bird-discount-2026). Against: competitors anonymized, methodology unpublished, **no independent benchmark tracks them** — self-reported correlation against unnamed competitors is not independently verifiable. Their measurement (DFS correlation) differs from FantasyPros (ranking accuracy) and FFA (projection MAE).
- Internal accuracy tracking: MAE/RMSE/Spearman vs. actuals, confidence intervals, misses recorded — the internal record.

## 8. What the research could not verify / honest gaps

- Exact current CLV coverage (needs a fresh Neon read grant).
- FanDuel salary path beyond manual CSV (login-gated).
- The "DK push-feed ToS" claim (no primary source found).
- Live DK ownership (needs the provider lane or a licensed feed).
- Official injury truth (the build is scrape + typed-LLM extraction).
- The remaining GPL boundary judgment calls.

## 9. Decisions that need Garrett (his words only)

1. Projection source lock (master gate). 2. DK salary path vs. the repo's standing rule. 3. Any spending (SkillCorner, Genius, SIS, GPU, human charting review). 4. OddsPapi legal read for the backfill. 5. **Neon `neondb_owner` password rotation — still owed** (recoverable from public git history). 6. Fresh Neon read grant. 7. NFL+ token if the NGS probe is dead. 8. NFL/DK/FD ToS risk tolerance. 9. FantasyPros ToS review if DynastyProcess ECR becomes load-bearing. 10. Detector buy-vs-build. 11. Which public benchmark arena(s) the rankings appear on. 12. Human-review staffing for the charting queue. 13. K/DEF in rankings v1.

---

*Research only. No code written. No credentials in this document. Repo rules govern the build.*
