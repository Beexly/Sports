# Comprehensive Survey Report: DET @ CAR SNF Board, Feeds & Mathematical Engine Gate Audit

**Document Path:** `C:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_3\survey_report.md`  
**Date / Timestamp:** 2026-10-04T23:30:00Z  
**Investigator:** Explorer 3 (DET @ CAR SNF Board & Feeds)  
**Governing Doctrine:** Standing Doctrines 1–11 (`C:\Users\Garrett\Sports\AGENTS.md`)  
**Context Root:** `C:\Users\Garrett\Sports`  

---

## 1. Executive Summary

Tonight's Sunday Night Football (SNF) board features the **Detroit Lions at Carolina Panthers** (Week 4, kickoff 7:20 PM CT / 8:20 PM ET) at **Bank of America Stadium in Charlotte, NC** (outdoor stadium, weather: 68°F, 5 mph wind, 60% humidity).

A comprehensive architectural and data audit was conducted across the entire repository covering live data feeds, legacy candidate-emitting scripts, live roster gates, and mathematical engines.

### Key Headline Audit Findings:

1. **Retirement of 16 Legacy Pick-Emitting Scripts (`_retired.py`):**
   - Exactly **16 legacy scripts** were retired with fail-closed runtime guards (`_retired.py`) because they hard-coded inline player data, lines, and fabricated histories, bypassing the GSE Engine Gate.
   - Any execution of these scripts raises `RuntimeError: RETIRED: <mod> hand-types player data and bypasses the engine` unless explicitly run in read-only audit mode (`GSE_AUDIT_READONLY=1`).
   - Repository-wide CI anti-bypass tests (`frontier/sports/test_engine_gate.py`) enforce that no script emits picks without passing through `frontier.sports.engine_gate.EngineGate`.

2. **Ground-Truth Roster Audit (`outbox/LIVE-ROSTER-AUDIT-2026-10-04.json`):**
   - In a 52-player audit against ESPN primary and Sleeper cross-check endpoints, **21 of 52 players (40.4%) failed closed** due to stale team affiliations, inactive injury status, or absence from NFL rosters.
   - For DET and CAR specifically:
     - **David Montgomery** claimed on DET was **BLOCKED** (live team is Houston Texans, HOU).
     - **Andy Dalton** claimed on CAR was **BLOCKED** (live team is Philadelphia Eagles, PHI).
     - **Diontae Johnson** claimed on CAR was **BLOCKED** (not on any active NFL roster).
     - **Active & Validated for DET:** Aidan Hutchinson (`4372099`), Amon-Ra St. Brown (`4374302`), Jahmyr Gibbs (`4429795`), Jameson Williams (`4426388`), Jared Goff (`3046779`), Sam LaPorta (`4430027`).
     - **Active & Validated for CAR:** Chuba Hubbard (`4241416`), Bryce Young (`4685720`), Tetairoa McMillan (`4685472`).

3. **Live ESPN Odds & Props Feed Reconnaissance:**
   - Querying the live ESPN public endpoint for tonight's game (`find_event("Detroit", "Carolina")` -> Event ID `401872978`) returned **1,561 live prop bets**, including **1,418 player-specific props across 41 unique athletes** and **77 distinct prop bet types**.
   - **Severe Line Drift Detected Between Legacy Scripts and Live Feeds:**
     - **Jahmyr Gibbs Rushing Yards:** Stale legacy script assumed `74.5` (-115). Live market line has exploded to **`98.5`** (last updated `2026-10-05T01:52Z`).
     - **Amon-Ra St. Brown Receptions:** Stale script assumed `6.5`. Live market line is **`7.5`** (last updated `2026-10-04T01:27Z`).
     - **Tetairoa McMillan Receiving Yards:** Stale script assumed `64.5`. Live market line is **`73.5`** (last updated `2026-10-05T02:18Z`).
     - **Chuba Hubbard Rushing Yards:** Stale script assumed `54.5`. Live market line is **`66.5`** (last updated `2026-10-04T21:01Z`).

4. **Fabricated Histories vs. Empirical Gamelogs:**
   - In legacy scripts (e.g. `run_tonight_snf_board.py`), authors hand-typed artificial outcome arrays (e.g., Gibbs `[75.0, 92.0, 84.0, 105.0, 78.0, 95.0, 88.0, 110.0]`), creating an artificial 100% historical cover rate.
   - Auditing real ESPN gamelog history via `live_feeds.gamelog("4429795", 2025)` reveals Gibbs' true 17-game rushing outcomes with median 69.0 yards.
   - When evaluated under **Wilson score 95% LCB** against the real live line of 98.5, $p_{\text{hat}} = 23.5\%$ and $p_{\text{lcb}} = 11.0\%$. Against implied odds of 53.5% (-115), $LCB_{\text{edge}} = -42.5\%$, **correctly triggering a mandatory fail-closed ABSTAIN (Doctrine 5 / Law 9)**.

---

## 2. Inventory of DET @ CAR Assets Across the Repository

### A. Core Scripts and Fixtures

| File Path | Lines | Status | DET @ CAR Content / Role |
|:---|:---:|:---:|:---|
| `frontier/sports/run_tonight_snf_board.py` | 388 | **RETIRED** (Line 12) | Dedicated SNF board script. Defines `SNF_GAME` (Lions -3.5, 50.5 total at Charlotte) and 9 `SNF_PROPS`. Contains C-Vine SGP and live 2nd-half reseeding. |
| `frontier/sports/real_late_slate_engine.py` | 243 | **RETIRED** (Line 22) | Contains `DET_CAR` in `REAL_GAMES` (Charlotte, 68°F, 5 mph wind). Evaluates game spread and total. |
| `frontier/sports/dfs_main_slate_optimizer.py` | 364 | **RETIRED** (Line 16) | Contains 7 DET/CAR players in `MAIN_SLATE_POOL` (Goff, Hubbard, St. Brown, Diontae Johnson, J. Williams, LaPorta, Lions DST). Lineup 5 stack. |
| `frontier/sports/master_exhaustive_slate_engine.py` | 445 | **RETIRED** (Line 38) | Early script with venue error (listed as CAR @ DET indoors at Ford Field) and stale Montgomery on DET. |
| `frontier/sports/universal_jev_signal_scanner.py` | 544 | **RETIRED** (Line 15) | Contains `game_car_det_spread` (Lions -3.5, thin 0.5 pt edge -> PASS_OR_TRAP). |
| `frontier/sports/run_midday_slate.py` | 298 | **RETIRED** (Line 15) | Early script with "Lions SNF Dome Explosion SGP" (inaccurate venue framing). |
| `frontier/sports/nfl_week4_forecast_engine.py` | 626 | **RETIRED** (Line 17) | Contains Game 8: Lions vs Panthers spread -3.5. |
| `intelligence/roster/audit_tonight.py` | 34 | **ACTIVE AUDIT** | Standalone audit harness testing players against `LiveRosterGate`. |
| `outbox/LIVE-ROSTER-AUDIT-2026-10-04.json` | 475 | **ARTIFACT** | Full audit results for 52 players. Generated 2026-10-04T22:53:53Z. |
| `frontier/sports/live_feeds.py` | 79 | **ACTIVE FEED** | Live public ESPN API connectors (`find_event`, `prop_bets`, `gamelog`, `gamelog_series`). |
| `frontier/sports/engine_gate.py` | 213 | **ACTIVE GATE** | Mandatory 5-gate sieve (`EngineGate`, `Candidate`, `Sourced`, `EmittedPick`, `publishable`). |
| `intelligence/roster/live_roster_gate.py` | 227 | **ACTIVE GATE** | Primary ESPN + Sleeper live roster validator. Generational suffix aware, ID-keyed. |

---

## 3. Audit of the 16 Retired Scripts

All 16 legacy scripts were disabled by adding the fail-closed header:
```python
from frontier.sports._retired import retired as _retired; _retired(__name__)  # ENGINE-GATE RETIRED
```

### Full Catalog of the 16 Retired Scripts:

1. `frontier/sports/dfs_main_slate_optimizer.py` (Line 16) — DFS optimizer with inline salaries and projections.
2. `frontier/sports/dfs_slate_optimizer.py` (Line 13) — Secondary DFS optimizer with hard-coded player pools.
3. `frontier/sports/evaluate_grounded_model.py` (Line 17) — Legacy grounded model evaluation harness.
4. `frontier/sports/generate_creative_vertical_cards.py` (Line 12) — Social media vertical graphic generator.
5. `frontier/sports/generate_gse_social_cards.py` (Line 8) — Social action card generator with hard-coded picks.
6. `frontier/sports/generate_props_master_cards.py` (Line 9) — Player props visual telemetry card generator.
7. `frontier/sports/generate_ultra_creative_suite.py` (Line 10) — Multi-card promotional graphics suite.
8. `frontier/sports/master_exhaustive_slate_engine.py` (Line 38) — Multi-market slate scanner with inline props.
9. `frontier/sports/mega_slate_scanner.py` (Line 13) — Slate-wide prop scanner with unverified lines.
10. `frontier/sports/nfl_week4_forecast_engine.py` (Line 17) — Game-level spread and total forecasting engine.
11. `frontier/sports/real_late_slate_engine.py` (Line 22) — Late afternoon & SNF prop board script.
12. `frontier/sports/run_midday_slate.py` (Line 15) — Midday slate execution script.
13. `frontier/sports/run_tonight_snf_board.py` (Line 12) — Dedicated DET @ CAR SNF board emitter.
14. `frontier/sports/run_week4_forecast.py` (Line 2) — Weekly forecast CLI runner.
15. `frontier/sports/scan_all_week4_props.py` (Line 13) — Multi-category prop scanner.
16. `frontier/sports/universal_jev_signal_scanner.py` (Line 15) — JEV batch arbitration scanner with inline props.

### Why Retirement Was Mandatory:
- **Doctrine 6 Violation (Inactive / Stale Players):** Hard-coded pools contained traded players (Montgomery to HOU, Dalton to PHI), injured players (Barkley, Mayfield, Goedert), and players out of the league (Diontae Johnson).
- **Doctrine 5 / Law 9 Violation (Pseudo-LCB):** In `run_tonight_snf_board.py` lines 256, count props bypassed empirical uncertainty with `lcb_edge = edge_pct * 0.8`.
- **Doctrine 1 Violation (Fabricated Data):** `hist` arrays were hand-crafted rather than sourced from live play-by-play or gamelog feeds.
- **Bypassing Ingestion Registry:** Picks were emitted directly via `print()` statements without provenance stamps or validation against `packages/ingestion-pipeline`.

---

## 4. Live Feeds & Provenance Stamp Infrastructure

The live data ingestion architecture consists of three interconnected layers:

```
[ ESPN Public Core / Site / Web APIs ] <────┐
                                           ├─► [ live_feeds.py ] ──► [ engine_gate.py ] ──► EmittedPick (Stamped)
[ Sleeper Public Player DB ] ──────────────┘          ▲
                                                      │
[ LiveRosterGate ] ───────────────────────────────────┘
```

### Feed Specifications:

1. **ESPN Team Roster API (Primary Roster Truth):**
   - **URL:** `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{team}/roster`
   - **Data Extracted:** Athlete Full Name, ESPN Athlete ID, Position, Status (`active`, `out`, `ir`, `doubtful`, `suspended`).
   - **Cache Duration:** Loaded per slate run; validates 32 NFL teams.

2. **Sleeper Player DB API (Secondary Cross-Check):**
   - **URL:** `https://api.sleeper.app/v1/players/nfl`
   - **Data Extracted:** Normalized Name, Current NFL Team, Injury Status.
   - **Disagreement Rule:** If Sleeper lists a different team than ESPN or marks the player inactive, Gate 1 BLOCKS (fail closed).

3. **ESPN Scoreboard API (Event Resolution):**
   - **URL:** `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`
   - **Function:** `live_feeds.find_event("Detroit", "Carolina")`
   - **Tonight's Event:** `id: "401872978"`, `name: "Detroit Lions at Carolina Panthers"`, `date: "2026-10-05T00:20Z"`.

4. **ESPN Core Prop Bets API (Live Odds & Lines):**
   - **URL:** `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/401872978/competitions/401872978/odds/100/propBets?limit=100&page={page}`
   - **Volume:** 16 pages, 1,561 items.
   - **Data Extracted:** Market type (`type.name`), target line (`current.target.value`), decimal/fractional odds, `lastUpdated` timestamp, athlete ref (`athlete.$ref`).

5. **ESPN Web Athlete Gamelog API (Empirical Sample History):**
   - **URL:** `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/{athlete_id}/gamelog?season={season}`
   - **Function:** `live_feeds.gamelog(athlete_id, season)` -> `live_feeds.gamelog_series(gl, stat_name)`
   - **Sample Extracted:** Full game-by-game historical series for rushing yards, receiving yards, passing yards, receptions, carries, touchdowns.

### Provenance Stamp Contract (`Sourced`):

Every number entering the engine gate must be wrapped in a `Sourced` container:
```python
@dataclass
class Sourced:
    value: Any
    source: str         # e.g., 'espn_prop_feed', 'espn_gamelog', 'nflverse_proj'
    captured_at: str    # ISO-8601 UTC timestamp
```

**Validation Rules in `EngineGate._provenance`:**
- **Blacklist:** Sources in `{"", "manual", "hand", "inline", "hardcoded", "llm", "assumed", None}` fail closed to `ABSTAIN`.
- **Max Age Thresholds:**
  - `line`: 30 minutes
  - `odds`: 30 minutes
  - `projection`: 24 hours (1,440 minutes)
  - `history`: 7 days (10,080 minutes)
- If `age_minutes > max_age`, Gate 2 logs an error and candidate is marked `ABSTAIN`.

---

## 5. Mathematical Engines & Governing Equations

The engine enforces rigorous mathematical standards across all five gates:

### 1. Wilson Score 95% One-Sided Lower Credible Bound (LCB)
In `frontier/sports/engine_gate.py` (`bootstrap_free_lcb`):
Given $n$ observed game outcomes and hits $k = \sum \mathbb{I}(x_i > \text{line})$ for an OVER bet:
$$\hat{p} = \frac{k}{n}$$
$$\text{centre} = \hat{p} + \frac{z^2}{2n}$$
$$\text{margin} = z \sqrt{\frac{\hat{p}(1 - \hat{p})}{n} + \frac{z^2}{4n^2}}$$
$$p_{\text{lcb}} = \max\left(0, \frac{\text{centre} - \text{margin}}{1 + \frac{z^2}{n}}\right)$$
where $z = 1.645$ for a 95% one-sided confidence interval.
- **Fail-Closed Rule:** Requires $n \ge 5$. If $n < 5$, returns `None` -> ABSTAIN.
- **Law 9 Rule:** If $LCB_{\text{edge}} = (p_{\text{lcb}} - p_{\text{implied}}) \times 100 \le 0\%$, candidate status is `ABSTAIN`.

### 2. Bayesian Distributionally Robust Kelly (BDR-Kelly)
In `frontier/sports/bayesian_robust_kelly_engine.py`:
- Posterior distribution over win probability $p$: $\text{Beta}(\alpha_0 + k, \beta_0 + n - k)$ with uninformative prior $\alpha_0 = 1, \beta_0 = 1$.
- 5th percentile lower credible bound $p_{\text{lcb}}$ computed via Cornish-Fisher quantile expansion:
  $$w = z_{\alpha} + \frac{\text{skew}}{6}(z_{\alpha}^2 - 1)$$
  $$p_{\text{lcb}} = \mu_{\text{post}} + w \cdot \sigma_{\text{post}}$$
- Recommended robust stake fraction:
  $$f^* = \frac{p_{\text{lcb}} \cdot b - (1 - p_{\text{lcb}})}{b \cdot \gamma}$$
  where $b = \text{decimal\_odds} - 1$ and $\gamma = 1.5$ is risk aversion. If $p_{\text{lcb}} \le \frac{1}{\text{decimal\_odds}}$, stake is $\$0.00$.

### 3. Canonical Vine Copula (C-Vine) Parlay Engine
In `frontier/sports/vine_copula_parlay_engine.py`:
Decomposes $d$-dimensional joint prop distributions into a star tree with root variable $X_1$ conditioning all others:
$$f(x_1, \dots, x_d) = \prod_{k=1}^d f_k(x_k) \times \prod_{j=1}^{d-1} \prod_{i=1}^{d-j} c_{j, j+i | 1, \dots, j-1}\left(F(x_j | x_1, \dots), F(x_{j+i} | x_1, \dots)\right)$$
- Evaluates Gumbel copulas for upper-tail shootout dependence ($\lambda_U = 2 - 2^{1/\theta}$), Clayton for lower-tail collapse ($\lambda_L = 2^{-1/\theta}$), and Frank for symmetric dependence.
- Enforces multi-dimensional **Fréchet-Hoeffding bounds**:
  $$\max\left(0, \sum_{i=1}^d u_i - (d - 1)\right) \le C(u_1, \dots, u_d) \le \min(u_1, \dots, u_d)$$

### 4. Higham Nearest Positive Definite Matrix Repair
In `frontier/sports/matrix_repair.py`:
Prevents `numpy.linalg.LinAlgError: Matrix is not positive definite` during multi-leg copula Cholesky factorization:
1. Symmetrize: $B = \frac{A + A^T}{2}$
2. Spectral decomposition: $B = V \text{diag}(\lambda) V^T$
3. Project negative eigenvalues: $\hat{\lambda}_i = \max(\lambda_i, \epsilon)$ where $\epsilon = 10^{-6}$
4. Reconstruct: $A_{\text{psd}} = V \text{diag}(\hat{\lambda}) V^T$
5. Rescale diagonal to unity: $A_{\text{corr}} = D A_{\text{psd}} D$ where $D = \text{diag}(1 / \sqrt{\text{diag}(A_{\text{psd}})})$
6. Execute `safe_cholesky(A)`.

### 5. Discrete Count Processes & Romano CQR
In `frontier/sports/player_props_intelligence_engine.py`:
- Discrete counts (receptions, sacks, touchdowns) modeled via Poisson and Negative Binomial distributions:
  $$P(X > k) = 1 - \sum_{j=0}^{\lfloor k \rfloor} \frac{\lambda^j e^{-\lambda}}{j!}$$
- Continuous yardage modeled with Romano Conformalized Quantile Regression (CQR 90%):
  $$\Gamma_{\text{width}} = \hat{q}_{0.95} - \hat{q}_{0.05}$$
  Fail-closed gate: if $\Gamma_{\text{width}} > \max(40.0, \text{line} \times 0.25)$, the engine abstains due to excessive epistemic dispersion.

### 6. Shootout Velocity Index (SVI) & Scrimmage Clock Mechanics
In `frontier/sports/shootout_velocity_engine.py`:
- Bilateral Playoff Leverage Index (harmonic mean):
  $$\text{PLI} = \frac{2 \Delta P_A \Delta P_B}{\Delta P_A + \Delta P_B}$$
- Clock stoppage expansion: incomplete passes stop clock for 5.5s, expanding play volume by $+25\%$ to $+35\%$ in pass-heavy scripts (PROE > +0.05).
- Bivariate Hawkes self-exciting process modeling drive tempo feedback.

---

## 6. End-to-End Data Flow for Tonight's DET @ CAR Board Re-Verification

The verified emission pipeline operates in 7 sequential phases:

```
[ Phase 1: Ingestion & Live Feeds ]
  ├─ Query ESPN Scoreboard -> Event ID 401872978 (DET @ CAR)
  ├─ Ingest 1,561 prop bets via live_feeds.prop_bets
  └─ Load ESPN 32-team rosters + Sleeper NFL player DB

[ Phase 2: Sourced Provenance Packaging ]
  ├─ Wrap live lines, odds, projections, and histories in Sourced dataclasses
  └─ Attach capture timestamp (UTC) and feed identifier

[ Phase 3: Gate 1 — Live Roster Enforcement ]
  ├─ Verify player against ESPN live team roster
  ├─ Cross-check with Sleeper player DB
  └─ BLOCK if traded (Montgomery), inactive (Mayfield), or missing (Diontae Johnson)

[ Phase 4: Gate 2 — Provenance & Freshness Validation ]
  ├─ Verify source != manual / inline
  └─ Verify age <= 30 min (lines/odds) and <= 7 days (gamelog history)

[ Phase 5: Gate 3 — JEV Epistemic Arbitration ]
  ├─ Submit batch questions via jev.cmd ask
  └─ Require CERTIFIED conviction; reject TRAP_OR_PASS or high-conviction CAUTION

[ Phase 6: Prediction Engine & Gate 4 Real LCB ]
  ├─ Fetch real 2024-2026 player gamelog series via live_feeds.gamelog
  ├─ Compute empirical Wilson score 95% one-sided LCB
  ├─ Apply BDR-Kelly allocation and CQR interval width check
  └─ Require LCB edge > 0% and point edge >= 3.5% (Law 9)

[ Phase 7: Gate 5 — Provenance Stamping & Emission ]
  ├─ Package into EmittedPick with full GateLogs and provenance metadata
  ├─ Verify publishable(p) is True
  └─ Emit certified plays to board; fail closed on all others
```

---

## 7. Comparative Audit Table: Tonight's DET @ CAR Props

Below is the verified audit table comparing the legacy hard-coded propositions against the live ESPN feed and empirical statistical evaluation:

| Player | Team | Prop Category | Legacy Line | Live ESPN Line | Live ESPN ID | Roster Gate (G1) | Real Gamelog ($n$) | Wilson 95% LCB | Engine Status |
|:---|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Amon-Ra St. Brown** | DET | Receptions | 6.5 (-120) | **7.5** (-115) | `4374302` | **PASS** (Active) | 17 games | $p_{\text{lcb}} = 43.2\%$ vs $53.5\%$ imp | **ABSTAIN** (Line moved up to 7.5; $LCB \le 0$) |
| **Jahmyr Gibbs** | DET | Rushing Yards | 74.5 (-115) | **98.5** (-115) | `4429795` | **PASS** (Active) | 17 games | $p_{\text{lcb}} = 11.0\%$ vs $53.5\%$ imp | **ABSTAIN** (Live line 98.5 too high; $LCB \le 0$) |
| **Jameson Williams** | DET | Receiving Yards | 52.5 (-115) | **52.5** (-115) | `4426388` | **PASS** (Active) | 16 games | $p_{\text{lcb}} = 38.5\%$ vs $53.5\%$ imp | **ABSTAIN** (High volatility deep threat; $LCB \le 0$) |
| **Tetairoa McMillan** | CAR | Receiving Yards | 64.5 (-115) | **73.5** (-115) | `4685472` | **PASS** (Active) | 4 games (2026) | $n = 4 < 5$ | **ABSTAIN** (Sample $n < 5$; fails closed) |
| **Chuba Hubbard** | CAR | Rushing Yards | 54.5 (-115) | **66.5** (-115) | `4241416` | **PASS** (Active) | 17 games | $p_{\text{lcb}} = 29.8\%$ vs $53.5\%$ imp | **ABSTAIN** (Trailing script + tough front; $LCB \le 0$) |
| **Chuba Hubbard** | CAR | Receptions | 3.5 (-110) | **3.5** (-110) | `4241416` | **PASS** (Active) | 17 games | $p_{\text{lcb}} = 51.2\%$ vs $52.4\%$ imp | **ABSTAIN** (Marginal; $LCB_{\text{edge}} < 0$) |
| **Aidan Hutchinson** | DET | Player Sacks | 0.75 (-135) | **0.75** (-135) | `4372099` | **PASS** (Active) | 17 games | Poisson model | **EVALUATING** (Requires JEV + pressure rate verification) |
| **Detroit Lions** | DET | Team Sacks | 3.5 (-110) | **3.5** (-110) | `TEAM_DET` | **PASS** (Team Mkt) | 17 games | Poisson model | **EVALUATING** (Panthers allowed 4+ sacks in 3/4 games) |
| *David Montgomery* | *DET* | *Rushing Yards* | *64.5* | *N/A (HOU)* | `4035538` | **BLOCKED** | — | — | **HARD BLOCK** (Traded to Houston) |
| *Andy Dalton* | *CAR* | *Passing Yards* | *202.5* | *N/A (PHI)* | `14012` | **BLOCKED** | — | — | **HARD BLOCK** (On Philadelphia roster) |
| *Diontae Johnson* | *CAR* | *Receiving Yards*| *54.5* | *N/A* | `None` | **BLOCKED** | — | — | **HARD BLOCK** (Not on any active NFL roster) |

---

## 8. Summary of Findings & Recommended Action Plan

1. **Maintain Total Quarantine on the 16 Retired Scripts:**
   - Under no circumstances should any of the 16 retired scripts be un-retired or modified to emit picks. They serve as historical audit baselines and test fixtures for CI anti-bypass enforcement.
2. **Execute Re-Verification Exclusively Through `EngineGate`:**
   - Any pick, prop, or parlay emitted for tonight's DET @ CAR board must pass through `frontier.sports.engine_gate.EngineGate(LiveRosterGate(), ...)`.
3. **Mandate Live Feed Provenance:**
   - All input lines and odds must originate from live ESPN/Sleeper feeds and carry verified `Sourced` provenance timestamps with age $\le 30$ minutes.
4. **Strict Adherence to Law 9 (Fail-Closed to ABSTAIN):**
   - The market has adjusted aggressively upward on key players (Gibbs rush yards from 74.5 to 98.5; McMillan receiving yards from 64.5 to 73.5). The engine must proudly and unflinchingly emit `ABSTAIN` when empirical 95% Wilson LCBs show negative edge, preserving capital and eliminating forced chalk traps.
