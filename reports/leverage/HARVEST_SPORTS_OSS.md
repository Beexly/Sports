# OSS Sports Intelligence Harvest
*Generated: 2026-06-19 | Analyst: Claude Sonnet 4.6*

## Overlap-Awareness: What GSE Already Has

Before the ranked list, here is what this codebase already contains so items below are flagged as GAP, PARTIAL, or OVERLAP:

| Capability | GSE file | Status |
|---|---|---|
| Shin devig | `packages/prediction-engine/src/shin-devig.ts` | EXISTS — skip pure devig libs |
| CLV tracking | `packages/prediction-engine/src/clv.ts` + `clv-capture.ts` | EXISTS — skip CLV trackers |
| Calibration (Brier, buckets, ECE) | `apps/web/lib/calibration/compute.ts` | EXISTS — skip generic calibration libs |
| Kelly criterion | `packages/prediction-engine/src/kelly.ts` | EXISTS — skip basic Kelly libs |
| Conviction tiers | `packages/prediction-engine/src/conviction-tier.ts` | EXISTS |
| Staking / bankroll | `packages/prediction-engine/src/bankroll.ts` | EXISTS |
| Elo ratings | `packages/prediction-engine/src/elo-ratings.ts` + `elo-estimator.ts` | EXISTS |
| Line movement | `apps/web/lib/market/line-movement.ts` + `line-snapshot.ts` | EXISTS |
| Poisson model | `packages/prediction-engine/src/poisson.ts` | EXISTS |
| Best-line / line shopping | `apps/web/lib/market/best-line.ts` + `load-line-shop-board.ts` | EXISTS |
| Odds API client | `packages/data-ingestion/src/odds-api-client.ts` | EXISTS |
| NFL PBP / EPA-adjacent | `apps/web/lib/nflverse/pbp.ts` + nflverse-source | EXISTS |
| Injury reports | `apps/web/lib/nflverse/injury-report.ts` | EXISTS |
| DFS / fantasy signals | `apps/web/lib/dfs/` | EXISTS |
| Consensus view | `packages/prediction-engine/src/consensus-view.ts` | EXISTS |

GSE has broad but deep core math. The genuine **gaps** are mostly in UI/visualization, ensemble modeling, advanced rating math, and tournament-specific tooling.

---

## TOP 10 COPY-NOW (Ranked by leverage / effort ratio)

### #1 — philihp/openskill.js
**Repo:** https://github.com/philihp/openskill.js  
**License:** MIT | **Stars:** 250 | **Maintained:** Active 2025  
**Language:** TypeScript (native npm package)  
**Gap it fills:** GSE has Elo in `elo-ratings.ts` but has no multi-team or TrueSkill-class model. OpenSkill supports 5 models (Plackett-Luce, Bradley-Terry full/partial, Thurstone-Mosteller full/partial), handles asymmetric team sizes, and exposes `predictWin()` / `predictDraw()` for match odds directly.  
**GSE surface:** `packages/prediction-engine/` — drop in as an alternative rating backend for multi-team sports (PGA Tour, NASCAR, MMA, March Madness). `predictWin()` produces head-to-head odds you can pipe straight into the pick engine.  
**Adopt-mode:** VENDOR (npm dep: `openskill`)  
**Effort:** 0.5 days to wire up; 2–3 days to backtest against historical results  
**Key insight:** `ordinal(rating)` = `μ - 3σ` gives a single sortable strength number; use as a pick confidence signal.

---

### #2 — Hicruben/world-cup-2026-prediction-model
**Repo:** https://github.com/Hicruben/world-cup-2026-prediction-model  
**License:** MIT | **Stars:** 55 | **Maintained:** Active 2026  
**Language:** JavaScript (no external deps, ~300 LOC per module)  
**Gap it fills:** GSE has Poisson (`poisson.ts`) and Elo but lacks the **Dixon-Coles correction** (fixes Poisson's undercount of low-score draws: 0-0, 1-1) and has no **Monte Carlo tournament simulator**.  
**Specific files to copy:**  
- `elo.mjs` — team Elo with recency weighting, produces win/draw/loss probs  
- `backtest.mjs` — RPS, log-loss, Brier score out-of-sample validation loop (partial OVERLAP with calibration/compute.ts, but the validation harness is cleaner)  
- `predict.mjs` — Dixon-Coles bivariate Poisson over Elo → scoreline matrix → 3-way probs  
- `track-record.mjs` — live pick ledger with running Brier  
**GSE surface:** `packages/prediction-engine/` — adds Dixon-Coles module; Monte Carlo feeds a "championship odds" widget for tournament sports.  
**Adopt-mode:** COPY-NOW TS-native (trivially ported from .mjs to .ts)  
**Effort:** 1 day port + 1 day backtest integration  

---

### #3 — Drarig29/brackets-viewer.js + brackets-manager.js ecosystem
**Repo:** https://github.com/Drarig29/brackets-viewer.js  
**License:** MIT | **Stars:** 228 | **Maintained:** Active 2026  
**Language:** TypeScript, framework-agnostic vanilla JS output  
**Gap it fills:** GSE has no playoff bracket / elimination bracket visualization at all. This ecosystem covers single elimination, double elimination, and round-robin formats with live updates and click handlers.  
**Companion libs (all MIT):**  
- `brackets-model` (23 stars) — the shared TypeScript types  
- `brackets-manager.js` — storage-agnostic bracket state machine (JSON, SQL, Redis)  
- `brackets-viewer.js` — pure display layer, CSS-theme-able  
**GSE surface:** A "Playoff Tracker" page for NFL wildcard, NBA playoffs, MLB. The manager feeds Prisma; the viewer renders in a Next.js route. Clickable games link to GSE's game-analysis pages.  
**Adopt-mode:** VENDOR (three npm packages: `brackets-viewer`, `brackets-manager`, `brackets-model`)  
**Effort:** 2 days: install pkgs + build a Next.js page + CSS skin to match GSE brand  
**Novel angle:** Connect `brackets-manager` to game settlement events so the bracket updates live when results arrive.

---

### #4 — sbachinin/bracketry
**Repo:** https://github.com/sbachinin/bracketry  
**License:** MIT | **Stars:** 40 | **Maintained:** 2024-2025  
**Language:** TypeScript, 48 KB bundle (12 KB gzip), includes TS definitions  
**Gap it fills:** Simpler alternative to the Drarig29 ecosystem; better for one-shot single-elimination bracket renders (March Madness, World Cup knockout). Highlights a team's path through the bracket on click — a GSE differentiator.  
**GSE surface:** "Bracket" tab on tournament game pages, "My Bracket" feature where subscribers lock in predictions.  
**Adopt-mode:** VENDOR (npm: `bracketry`)  
**Effort:** 1 day  
**Choose over #3 when:** You need a lightweight client-side bracket with zero state management; use #3 when you need admin-editable bracket state in the database.

---

### #5 — pseudo-r/Public-ESPN-API
**Repo:** https://github.com/pseudo-r/Public-ESPN-API  
**License:** MIT | **Stars:** 576 | **Maintained:** Active 2026  
**Language:** Documentation + Django wrapper (endpoints are keyless REST)  
**Gap it fills:** GSE uses The Odds API for odds and nflverse for NFL play-by-play, but has **no keyless source for win probability mid-game, live game state, QBR, or Power Index** across 17 sports / 139 leagues.  
**Specific endpoints for GSE:**  
- `events/{id}/competitions/{id}/probabilities` — live win probability per play  
- `/injuries` — live injury feed across all 17 sports  
- Power Index, QBR, game predictor data endpoints  
- Standings, roster, schedule — all keyless  
**GSE surface:** `packages/data-ingestion/` — a new `espn-live-client.ts` adapter. Feed live WP to a real-time scoreboard widget; feed QBR/Power Index as additional signal features for the prediction engine.  
**Adopt-mode:** COPY-NOW TS-native (read the docs, write the TypeScript client yourself — pure REST, no lib needed)  
**Effort:** 1 day to build the adapter; endpoints are undocumented/unofficial, so add a circuit-breaker wrapper.  
**Caution:** ESPN has ToS; treat as `approved_public_logged_off` (facts only, log off, no credentials).

---

### #6 — realworkagent/openthomas
**Repo:** https://github.com/realworkagent/openthomas  
**License:** MIT | **Stars:** 361 | **Maintained:** Active 2026  
**Language:** TypeScript (81%) + JavaScript (18%)  
**Gap it fills:** GSE has individual Elo, Poisson, and market-read modules but has no **Bayesian blend** that weights the statistical model against implied market probabilities. OpenThomas implements `p = (1−λ)·model_prior + λ·market_prior` in a clean TS function.  
**Specific patterns to extract:**  
- Bayesian blending function: `blendPriors(modelProb, marketProb, lambda = 0.3)`  
- Append-only calibration ledger (every forecast stored with metadata for Brier analysis)  
- 10-bucket calibration curve builder from the ledger  
- Dry-run position-sizing trace for auditing picks without trading  
**GSE surface:** `packages/prediction-engine/src/probability-calibration.ts` already exists — extend it with the Bayesian blend. The calibration ledger pattern fits `packages/prediction-engine/src/proof-of-record.ts`.  
**Adopt-mode:** COPY-NOW TS-native (extract the 3–4 pure functions, discard the Polymarket integration)  
**Effort:** 0.5 days  
**Overlap note:** GSE's `consensus-view.ts` does something adjacent; validate before copying to avoid duplication.

---

### #7 — machina-sports/sports-skills (betting module)
**Repo:** https://github.com/machina-sports/sports-skills  
**License:** MIT | **Stars:** 152 | **Maintained:** Active 2026  
**Language:** Python (primary), but the betting math is pure-compute and trivial to re-implement in TS  
**Gap it fills:** The betting skill contains a complete **line movement classification algorithm** (sharp action vs. steam move detection) based on probability shift magnitude and direction. GSE has `line-movement.ts` for tracking but no classification logic.  
**Algorithm to port (from SKILL.md):**  
```
line_movement(open_odds, close_odds):
  prob_shift = implied_prob(close) - implied_prob(open)
  classify: |shift| > 0.03 → "sharp"; |shift| > 0.06 → "steam"; else "noise"
  return { prob_shift, classification, direction }
```  
**Also worth extracting:** `find_arbitrage()` with ROI% and stake allocation formula (two-leg and three-leg cases) — GSE may want this for a "live arb alert" feature even if it doesn't run a book.  
**GSE surface:** `apps/web/lib/market/line-movement.ts` — add a `classifyMovement()` export.  
**Adopt-mode:** COPY-NOW TS-native (30-line port)  
**Effort:** 2 hours  

---

### #8 — 26worldcup/26worldcup.github.io
**Repo:** https://github.com/26worldcup/26worldcup.github.io  
**License:** MIT | **Stars:** 16 | **Maintained:** Active 2026  
**Language:** React 19 + TypeScript + Vite, SVG throughout, no backend  
**Gap it fills:** A working **React + TypeScript implementation of:** (a) group standing tables with correct tiebreakers and colour-coding, (b) knockout bracket with auto-advancement, (c) Elo-based match probability + tournament simulation UI, (d) PWA offline-first architecture for sports pages.  
**Specific patterns to study/copy:**  
- FIFA-tiebreaker group table component (generalizes to NBA/NHL conference standings)  
- Filterable schedule grid (by team, stage, venue) — directly adoptable as GSE's "Schedule" view  
- Match probability display from Elo — pairs with GSE's existing elo-estimator  
- SVG-only approach — zero chart library dependency  
**GSE surface:** Frontend `apps/web/` — schedule grids, group/conference standings pages, "Today's Games" dashboard widget.  
**Adopt-mode:** COPY-NOW TS-native (lift individual components; it's already React + TS)  
**Effort:** 3 days for full standings + schedule components  

---

### #9 — 1player/oddslib
**Repo:** https://github.com/1player/oddslib  
**License:** MIT | **Stars:** 33 | **Maintained:** Archived (stable)  
**Language:** JavaScript (trivially typed)  
**Gap it fills:** GSE's data-ingestion layer converts American ↔ implied prob but there is no single canonical utility covering all 7 formats: American, Decimal, Fractional, Hong Kong, Malay, Indonesian, Implied Probability. Multi-format display matters for international users and for rendering sharp-money data from overseas books.  
**API:** `oddslib.from('american', -110).to('decimal')` — simple chained converter with precision and percentage options.  
**GSE surface:** `packages/types/` or a new `packages/odds-utils/` — expose as shared utility; consume in the UI layer for "Show odds as: American / Decimal / Fractional" toggle.  
**Adopt-mode:** COPY-NOW TS-native (400-line lib; typed in 20 minutes)  
**Effort:** 0.5 days  
**Overlap note:** GSE has `shin-devig.ts` (handles devig from American pairs) but no general multi-format converter.

---

### #10 — moodysalem/react-tournament-bracket
**Repo:** https://github.com/moodysalem/react-tournament-bracket  
**License:** MIT | **Stars:** 284 | **Maintained:** Moderate (2023)  
**Language:** TypeScript 100%  
**Gap it fills:** Second bracket option — passes a cyclical game graph to `<Bracket game={game}/>` and auto-discovers the whole bracket. Simpler API than Drarig29 if all you need is read-only rendering from a final-game object.  
**GSE surface:** "Pick bracket" prediction widget where users pick winners through a bracket structure; renders the result of the Monte Carlo simulator (#2 above).  
**Adopt-mode:** VENDOR (npm: `react-tournament-bracket`)  
**Effort:** 1 day  
**Note:** Has known mouse-highlighting inconsistency; tests incomplete. If this is a blocker, prefer Bracketry (#4).

---

## Items 11–35: Extended Inventory

### 11 — Drarig29/double-elimination (TypeScript)
**Repo:** https://github.com/Drarig29/double-elimination  
**License:** MIT | **Stars:** 4 | **Language:** TypeScript  
**Feature:** Standalone TypeScript lib for double elimination bracket seeding and advancement logic with automatic seeding.  
**GSE surface:** Prediction-engine bracket simulator for formats that use double-elim (e.g. esports, some DFS contests).  
**Adopt-mode:** VENDOR  
**Effort:** 0.5 days  

### 12 — Drarig29/brackets-manager.js
**Repo:** https://github.com/Drarig29/brackets-manager.js  
**License:** MIT | **Stars:** ~50 | **Language:** TypeScript  
**Feature:** Storage-agnostic bracket state machine — JSON/in-memory/SQL adapters. The Prisma adapter makes it a natural fit for GSE's PostgreSQL backend.  
**GSE surface:** Back-end bracket management in `apps/web/api/` for a tournament-tracker feature.  
**Adopt-mode:** VENDOR  
**Effort:** 1 day (write Prisma adapter or use in-memory for read-only bracket display)  

### 13 — cookpete/soccer-predictor (JavaScript npm)
**Repo:** https://github.com/cookpete/soccer-predictor  
**License:** Not explicitly stated in README (needs verification) | **Stars:** 29  
**Feature:** JS library that takes historical results, outputs per-match win/draw/loss probabilities, over/under 2.5 goals, BTTS via Poisson. The cleanest JS Poisson implementation found — `calculateProbabilities(team1, team2)` returns a full score matrix `scores[x][y]`.  
**GSE surface:** Soccer-specific enhancement to `packages/prediction-engine/src/poisson.ts` — add scoreline matrix output.  
**Adopt-mode:** PARK (verify license first; if MIT → COPY-NOW)  
**Effort:** 0.5 days to port to TypeScript and test against existing GSE Poisson  
**Overlap note:** GSE has `poisson.ts` — verify what this adds before copying.  

### 14 — nflverse/nflfastR (R)
**Repo:** https://github.com/nflverse/nflfastR  
**License:** MIT | **Stars:** 528 | **Language:** R  
**Feature:** Production-grade NFL Expected Points (EP), Win Probability (WP w/ and w/o spread), Completion Probability (CP), xYAC models. The model coefficients from `fastrmodels` package are MIT-licensed and published as plain numeric weights — these can be ported to TypeScript without R.  
**GSE surface:** `apps/web/lib/nflverse/pbp.ts` already consumes nflverse data — extract the WP model coefficients and implement the XGBoost inference in TS (or call a lightweight Python sidecar).  
**Adopt-mode:** PARK (port the coefficient files; inference loop is ~50 lines of TS)  
**Effort:** 3–5 days (coefficient extraction + TS inference + validation)  
**Note:** GSE already has `pbp.ts` and nflverse integration. This fills the specific gap of **in-process WP inference** without an API round-trip.

### 15 — greerreNFL/nfl_cover_probability (Python)
**Repo:** https://github.com/greerreNFL/nfl_cover_probability  
**License:** Not stated (needs verification) | **Stars:** 14 | **Language:** Python  
**Feature:** Extends nflfastR's WP model to predict **cover probability** in real time (probability of covering the pre-game spread given current game state). Uses 14 features including `spread_line_differential`. 74% accuracy.  
**GSE surface:** Real-time "Will this cover?" indicator on game pages — a genuine differentiator. Feeds GSE's confidence score when live games are streaming.  
**Adopt-mode:** PARK (verify license → port XGBoost weights to TS; or keep as Python microservice)  
**Effort:** 3 days (port + deploy)

### 16 — openthomas Bayesian ledger (already #6 above, but separating out the calibration ledger pattern)
The append-only forecast ledger from `openthomas` deserves its own entry because it is the core pattern for GSE's public calibration track record page. Every pick stored as `{ id, forecast, metadata, timestamp }` with Brier-score-per-pick computed at settlement.  
**Adopt-mode:** COPY-NOW TS-native  
**Effort:** 1 day (already PARTIAL in GSE's `proof-of-record.ts` — validate overlap)

### 17 — hollance/reliability-diagrams (Python/Jupyter)
**Repo:** https://github.com/hollance/reliability-diagrams  
**License:** MIT | **Stars:** 169 | **Language:** Python/Jupyter  
**Feature:** Reliability diagram visualization (calibration plot): bins predictions into 10 confidence intervals, plots observed win rate vs predicted, computes ECE. The _algorithm_ (ECE computation + bin assignments) is 40 lines of math — trivially ported to TS.  
**GSE surface:** The public-facing calibration chart on GSE's track record page. Currently GSE has `calibration/compute.ts` for the math and `calibration/report.ts` for the report, but no interactive visual. Port the binning algo + render with Recharts or D3.  
**Adopt-mode:** COPY-NOW TS-native (port the math; build the React chart component)  
**Effort:** 1 day (math port: 2 hours; Recharts component: 4 hours)

### 18 — 26worldcup PWA / offline schedule (already #8, separating the architecture pattern)
The React 19 + Vite PWA offline-first architecture from the World Cup repo is worth adopting specifically for GSE's "Today's Games" view — a static page that should load instantly even on poor mobile connections at a sports venue.  
**Adopt-mode:** COPY-NOW TS-native (copy service worker + cache strategy from the PWA config)  
**Effort:** 0.5 days

### 19 — ianalloway/kelly-js
**Repo:** https://github.com/ianalloway/kelly-js  
**License:** MIT | **Stars:** 1 | **Language:** TypeScript, zero deps, tree-shakeable  
**Feature:** `simulateGrowth()` — runs 2000 independent betting paths via Monte Carlo to show realistic bankroll variance distributions. Also `lineShop()` which ranks odds across books and quantifies savings. GSE has `kelly.ts` but no Monte Carlo variance visualizer.  
**GSE surface:** "Bankroll Simulator" feature — show a subscriber that at their current Kelly fraction and edge, the 5th/50th/95th percentile bankroll paths look like X after 100 bets.  
**Adopt-mode:** COPY-NOW TS-native  
**Effort:** 0.5 days (extract `simulateGrowth` and `lineShop`)  
**Overlap:** `kelly.ts` EXISTS in GSE — only extract the Monte Carlo simulator and line-shopper.

### 20 — ashhhlynn/optimize-fantasy-football
**Repo:** https://github.com/ashhhlynn/optimize-fantasy-football  
**License:** MIT | **Stars:** 4 | **Language:** JavaScript/React  
**Feature:** DFS lineup optimizer using `lp-solver.js` (linear programming) under position and salary constraints. Player locking from a queue. Integrates DraftKings and Sleeper APIs.  
**GSE surface:** `apps/web/lib/dfs/` — GSE already has DFS signals; this adds the LP optimization layer so users can generate optimal lineups from those signals. Would pair with `apps/web/lib/studio/templates/fantasy-angle.ts`.  
**Adopt-mode:** COPY-NOW TS-native (port to TS; `lp-solver.js` has TS types)  
**Effort:** 2 days (port optimizer + build lineup builder UI)  
**Note:** More sophisticated than the existing DFS signal files; genuine capability gap.

### 21 — DimaKudosh/pydfs-lineup-optimizer (Python)
**Repo:** https://github.com/DimaKudosh/pydfs-lineup-optimizer  
**License:** MIT | **Stars:** 443 | **Language:** Python  
**Feature:** The gold standard DFS optimizer — supports DraftKings, FanDuel, FantasyDraft, Yahoo, multiple sports, multi-lineup generation, exposure caps, player stacking constraints, "Late Swap" functionality. Far more complete than #20.  
**GSE surface:** Could be deployed as a Python microservice called from Next.js API routes. Alternatively, extract the LP formulation and constraint logic as a reference for a TypeScript port.  
**Adopt-mode:** VENDOR (run as a sidecar Python service)  
**Effort:** 3 days (service wrapper + API route)

### 22 — philihp/openskill.js — multi-team `predictWin()` use case (already #1, separate sport use case)
Beyond rating updates, `predictWin([teamA], [teamB], [teamC])` returns relative win odds across N teams simultaneously. Apply to golf (field-wide win probability), NASCAR (30+ car races), college basketball tournament seeds.  
**Novel angle:** Build a "tournament odds board" widget: show all 64 teams ranked by OpenSkill `ordinal()` before March Madness, updated after each round.  
**Effort:** 0.5 days incremental once #1 is implemented.

### 23 — visuals: nswamy14/visual-heatmap (TypeScript/WebGL)
**Repo:** https://github.com/nswamy14/visual-heatmap  
**License:** BSD-3-Clause | **Stars:** 90 | **Language:** TypeScript + WebGL  
**Feature:** High-performance WebGL heatmap rendering for 500K+ data points. Background image overlay (use a pitch SVG as the background).  
**GSE surface:** "Field Position Heatmap" — plot where a team's explosive plays originate, where they give up yards, QB target locations. A premium visual available to Elite tier.  
**Adopt-mode:** VENDOR (npm: `visual-heatmap`)  
**Effort:** 2 days (pitch SVG background + data pipeline from nflverse PBP)  
**Note:** BSD-3 is permissive — fully usable commercially.

### 24 — chanzer0/MLB-DFS-Tools
**Repo:** https://github.com/chanzer0/MLB-DFS-Tools  
**License:** MIT | **Stars:** ~300 | **Language:** Python  
**Feature:** MLB DFS optimizer + GPP contest simulator. The contest simulator is the novel element — simulates thousands of contests to find optimal lineup exposure given a field of opponents.  
**GSE surface:** GPP lineup diversification for MLB — generate not just optimal lineups but an *optimal portfolio* of lineups for different contest sizes.  
**Adopt-mode:** PARK (Python; extract the GPP simulation algorithm for TS port)  
**Effort:** 4 days (port GPP simulator to TS)

### 25 — Bayesian/Elo-MMR ensemble models (EbTech/Elo-MMR)
**Repo:** https://github.com/EbTech/Elo-MMR  
**License:** MIT | **Stars:** ~200 | **Language:** Rust  
**Feature:** Multiplayer Elo-MMR with implementations of Elo, Glicko, TrueSkill, and the novel Elo-MMR algorithm that is more robust to one-sided contests. The paper and algorithm are MIT.  
**GSE surface:** Reference implementation for improving the GSE Elo estimator — specifically the variance (σ) tracking and the "contest robustness" properties that prevent a single blowout from swamping the rating.  
**Adopt-mode:** PARK (Rust; port the algorithm from the paper, not the code)  
**Effort:** 2 days algorithm study + 2 days TS implementation

### 26 — epl-prediction-lab (SHA-256 pre-commitment)
**Repo:** https://github.com/tuantqse90/epl-prediction-lab  
**License:** Unlicensed (read-only / learn from) | **Stars:** 0  
**Feature:** The SHA-256 commitment pattern — predictions are hashed and published before the game, proving the pick was not post-dated. Also: temperature scaling (T parameter per league to calibrate logits) and live recomputation from remaining game time + current score.  
**GSE surface:** Apply the SHA-256 commitment hash to GSE picks at publication time — posts the hash to a public log (could be a public Postgres view or GitHub Gist) so GSE's calibration track record is cryptographically non-repudiable. Directly strengthens the "Proven" tier marketing story.  
**Adopt-mode:** COPY-NOW TS-native (the hashing pattern is 5 lines of Node crypto; the concept is the value)  
**Effort:** 0.5 days  
**Note:** License is "unlicensed" — this is learn/reference only; re-implement the pattern independently.

### 27 — machina-sports/sports-skills — keyless ESPN endpoints coverage map
Beyond the betting math (#7), the sports-skills repo documents how to hit ESPN's public CDN endpoints (scores, live WP, play-by-play) with zero API key across NFL, NBA, MLB, NHL, WNBA, College FB/BB — with SKILL.md-format prompts already written.  
**GSE surface:** Source documentation for `packages/data-ingestion/` — complement to #5 (pseudo-r/Public-ESPN-API). The skill prompts can inform GSE's ingestion job logic for live score refresh.  
**Adopt-mode:** COPY-NOW TS-native (use as reference spec, write the TS client)  
**Effort:** 0.5 days incremental on top of #5  

### 28 — itsjustlogan/bet-your-arb (Vue/TypeScript)
**Repo:** https://github.com/itsjustlogan/bet-your-arb  
**License:** MIT (verify) | **Stars:** ~10 | **Language:** Vue + TypeScript  
**Feature:** Arbitrage opportunity identifier and stake calculator. Two-leg and multi-leg arb with optimal stake allocation given total bankroll.  
**GSE surface:** "Arbitrage Alert" widget in the premium tier — when line-shopping data from The Odds API shows a cross-book arb, surface it to Elite subscribers.  
**Adopt-mode:** COPY-NOW TS-native (extract the pure arb math functions; discard Vue UI)  
**Effort:** 0.5 days  
**Overlap:** The machina-sports betting skill has `find_arbitrage()` — may cover this already.

### 29 — bartczernicki/Simulation-SportsChampionships (.NET/Blazor)
**Repo:** https://github.com/bartczernicki/Simulation-SportsChampionships  
**License:** MIT | **Stars:** ~20 | **Language:** C#/Blazor  
**Feature:** Monte Carlo championship probability simulation with playoff seeding rules for NFL, NBA, MLB. The _algorithm_ (simulate-a-season loop with seeding rules) is language-agnostic.  
**GSE surface:** "Season Simulator" page — enter current standings + remaining schedule, run 10K simulations, output each team's playoff probability. Differentiates from picks by providing season-long probabilistic narratives.  
**Adopt-mode:** PARK (port the simulation loop to TS; the C# is straightforward to translate)  
**Effort:** 3–4 days

### 30 — moodysalem/react-tournament-bracket — "My Bracket" prediction game
Beyond rendering (#10), the cyclical graph model (each game knows its next game) enables a **bracket prediction contest**: lock in picks before the tournament, auto-advance wins, score users by round.  
**GSE surface:** A free-to-play subscriber engagement feature — "Fill Out Your Bracket" for March Madness or NFL playoffs. Free tier gets access; Elite gets confidence-weighted auto-suggestions from the GSE model.  
**Effort:** 2 days incremental on top of #10

### 31 — oddslib (1player/oddslib) — International odds display toggle
Covered in #9 above, but the specific novel angle is a **user-preference odds format setting** (American default → Decimal/Fractional for UK/EU/AU users). GSE's internationalization roadmap benefits directly.  
**GSE surface:** User settings page + persistent preference in `users` table.  
**Effort:** 0.5 days (the conversion lib is <1 day; the UI toggle is another 0.5)

### 32 — visual-heatmap shot chart / defensive zone chart
Covered in #23 above. Specific novel feature: **Defensive zone chart** — show which zones of the field a defense is weakest in (yards-after-contact by zone, targets allowed by field quadrant). Differentiates GSE from picks-only sites by providing context visuals.  
**GSE surface:** "Film Room" view for Elite subscribers.  
**Effort:** 2 days incremental on top of #23

### 33 — GPT-style "pick reasoning trail" (pattern from openthomas calibration ledger)
Not a repo itself but a pattern: every GSE pick already has `factorKeys` in `calibration/compute.ts`. Materialize these as a human-readable **"Why we like this pick"** trail — factor name, direction, weight — rendered as a collapsible card on the pick page.  
**GSE surface:** Pick detail page — currently confidence score and tier are shown; add the factor trail for Pro+ tier.  
**Effort:** 1 day (the data already exists; it's a UI task)

### 34 — ianalloway/kelly-js bankroll dashboard
`bankrollStats()` computes ROI, drawdown, win%, avg odds, profit/unit across a bet history array. GSE already tracks pick settlements; feeding them through `bankrollStats()` gives a **subscriber performance dashboard** ("Your ROI this season: +3.2 units").  
**GSE surface:** Subscriber account page — personalized performance stats.  
**Effort:** 1 day (extract the `bankrollStats` function; build the UI card)

### 35 — AhmedHazem02/fifa-world-cup-2026-prediction-agent (TypeScript, 75 stars)
**Repo:** https://github.com/AhmedHazem02/fifa-world-cup-2026-prediction-agent  
**License:** Verify (appears MIT, high activity)  
**Feature:** An agent that orchestrates match outcome prediction using multiple data signals and surfaces them in a structured format. The agent-loop pattern — fetch → score → rank → publish — mirrors GSE's worker architecture.  
**GSE surface:** Blueprint for a GSE "Daily Picks Agent" that auto-generates a ranked slate each morning. Currently GSE workers do this; study this repo for edge-case handling and output structure.  
**Adopt-mode:** PARK (study architecture; do not copy wholesale)  
**Effort:** 0.5 days study

---

## Genuinely Novel Differentiating Features (not in any OSS repo — build from scratch)

These ideas emerged from the harvest and have no OSS precedent to copy from:

1. **Prediction commitment chain:** SHA-256 hash of each pick (from #26 pattern) posted to a public GitHub Gist or append-only public Postgres view before game start. Any subscriber can independently verify GSE never backdated a pick. Strong credibility signal for the "PROVEN" pricing tier milestone.

2. **Live cover-probability overlay on game scoreboard:** Combine the ESPN live WP endpoint (#5) with the cover probability model (#15) to show "P(cover) = 67%" updating live during a game — a feature no major free product offers.

3. **Bayesian market-vs-model blend slider:** Let Elite subscribers adjust the λ parameter (from #6 — openthomas Bayesian blend) themselves: "Trust model 100%" vs "Trust market 100%" vs "50/50 blend." Renders how confidence scores shift as λ moves. Unique educational + engagement tool.

4. **"Ticket heat" bracket tracker:** After each round of a bracket, calculate what percentage of GSE's subscriber picks survive (based on #10/#3 bracket components). Show a heat map of which teams still-alive picks are concentrated in. Pure engagement feature.

5. **Kelly fraction auto-tuner:** Using the Monte Carlo simulator (#19 `simulateGrowth`), GSE could show each subscriber their personalized *optimal Kelly fraction* based on their actual historical pick accuracy and ROI — not a generic 0.25x recommendation.

---

## License Quick-Reference

| Repo | License | PARK/SKIP risk |
|---|---|---|
| philihp/openskill.js | MIT | Clear |
| Hicruben/world-cup-2026-prediction-model | MIT | Clear |
| Drarig29/brackets-viewer.js | MIT | Clear |
| sbachinin/bracketry | MIT | Clear |
| pseudo-r/Public-ESPN-API | MIT | ToS risk on ESPN data |
| realworkagent/openthomas | MIT | Clear |
| machina-sports/sports-skills | MIT | Clear |
| 26worldcup/26worldcup.github.io | MIT (code) | Clear |
| 1player/oddslib | MIT | Clear (archived) |
| moodysalem/react-tournament-bracket | MIT | Clear |
| Drarig29/double-elimination | MIT | Clear |
| cookpete/soccer-predictor | Unverified | PARK until confirmed |
| nflverse/nflfastR | MIT | Clear (port coefficients) |
| greerreNFL/nfl_cover_probability | Unverified | PARK until confirmed |
| hollance/reliability-diagrams | MIT | Clear |
| ianalloway/kelly-js | MIT | Clear |
| ashhhlynn/optimize-fantasy-football | MIT | Clear |
| DimaKudosh/pydfs-lineup-optimizer | MIT | Clear |
| nswamy14/visual-heatmap | BSD-3-Clause | Clear (commercial ok) |
| chanzer0/MLB-DFS-Tools | MIT | Clear |
| EbTech/Elo-MMR | MIT | Clear (port from paper) |
| tuantqse90/epl-prediction-lab | Unlicensed | Reference only; re-implement |
| animafps/glicko2.ts | GPL-3.0 | **SKIP — copyleft** |
| g-loot/react-tournament-brackets | LGPL-2.1 | **SKIP — copyleft** |
| AlgoETS/Sport-Arbitrage | MIT | Clear |

**SKIPPED for license reasons:**
- `animafps/glicko2.ts` — GPL-3.0 (copyleft, infects GSE codebase)
- `@g-loot/react-tournament-brackets` — LGPL-2.1 (use MIT alternatives: Bracketry, brackets-viewer.js, or react-tournament-bracket)
- `DimaKudosh/pydfs-lineup-optimizer` is MIT but GPL dependencies in some modes — verify at vendoring time

---

## Effort Summary

| Priority | Repo | Adopt-mode | Days |
|---|---|---|---|
| #1 | philihp/openskill.js | npm dep | 0.5 + 2 |
| #2 | Hicruben/world-cup-2026-prediction-model | Port to TS | 2 |
| #3 | Drarig29 bracket ecosystem | npm deps | 2 |
| #4 | sbachinin/bracketry | npm dep | 1 |
| #5 | pseudo-r/Public-ESPN-API | Write TS client | 1 |
| #6 | realworkagent/openthomas | Port 4 functions | 0.5 |
| #7 | machina-sports betting skill | Port algorithm | 0.25 |
| #8 | 26worldcup/26worldcup.github.io | Lift components | 3 |
| #9 | 1player/oddslib | Port to TS | 0.5 |
| #10 | moodysalem/react-tournament-bracket | npm dep | 1 |
| 11–35 | Extended inventory | Various | 15–25 |
| **Total Top 10** | | | **~14 days** |
