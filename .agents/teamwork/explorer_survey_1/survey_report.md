# ARCHITECTURAL SURVEY REPORT: ENGINE GATE, ROSTER GATE, & GSE SIGNAL ENFORCEMENT

**Explorer**: Explorer 1 (Engine Gate & Roster Gate Architecture)  
**Date**: 2026-10-04  
**Target Repository**: `C:\Users\Garrett\Sports`  
**Governing Doctrine**: Standing Doctrines 1–12 in `AGENTS.md` (specifically Doctrine 5 / Law 9: Fail-Closed LCB, Doctrine 6: Zero-Tolerance Inactive Gate, and Doctrine 12: Mandatory Engine Gate & Live Roster Truth Floor)

---

## 1. Executive Summary & Problem Boundary

Prior to October 4, 2026, several analytical scripts in `frontier/sports` relied on inline hardcoded arrays or mock dictionaries of player props, lines, projections, and historical records. A forensic audit conducted against live league data revealed catastrophic drift: **21 out of 52 players (40.4%) carried invalid states**—including stale team affiliations (e.g. David Montgomery listed on DET instead of HOU; Andy Dalton on CAR instead of PHI; Stefon Diggs on HOU instead of WSH), unlisted players (Diontae Johnson), and ruled-out injured players (Saquon Barkley, Baker Mayfield).

To permanently eradicate this class of errors, the architecture was fortified with:
1. `intelligence/roster/live_roster_gate.py`: A dual-feed live roster gate (ESPN primary API cross-checked against Sleeper NFL player DB) that verifies identity, team affiliation, and active injury status fail-closed.
2. `frontier/sports/_retired.py`: A hard runtime kill-switch added to 16 legacy pick-emitting scripts, throwing `RuntimeError` immediately upon import unless explicit read-only audit mode (`GSE_AUDIT_READONLY=1`) is enabled.
3. `frontier/sports/engine_gate.py`: The single mandatory emission path implementing the **Unified 5-Gate Emission Standard (`ENGINE_GATE_V1`)**: G1 Live Roster, G2 Provenance & Freshness, G3 JEV Mandatory Arbitration, G4 Real Sample Lower Credible Bound (LCB), and G5 Provenance Stamping.
4. `frontier/sports/test_engine_gate.py`: Automated CI scanning using AST and regex inspection to guarantee zero inline player data and zero ungated pick emission across the codebase.

This survey establishes the complete architectural baseline, details the mathematical mechanics of each component, verifies live feed connectivity, and identifies the exact insertion points required to run candidate picks through the **GSE Signal Registry** (41 registered signals) and **Production Mathematical Engines** (Bayesian Robust Kelly, Vine Copula tail dependence, Higham nearest-PSD matrix repair, Poisson/CQR, EPA/SVI).

---

## 2. Gate Architecture Deep-Dive: The 5 Gates in `frontier/sports/engine_gate.py`

In `frontier/sports/engine_gate.py`, every candidate pick is represented by the `Candidate` dataclass:
```python
@dataclass
class Candidate:
    id: str
    player: str
    team: str
    market: str            # e.g. receptions, rushing_yards
    side: str              # OVER / UNDER
    line: Sourced
    odds: Sourced          # American odds (-110, +140)
    projection: Sourced
    history: Sourced       # list of actual per-game outcomes for this market
    context: str = ""
    is_team_market: bool = False
```
Evaluation occurs exclusively within `EngineGate.evaluate(cands: List[Candidate], state: str) -> List[EmittedPick]`. All gates fail **closed** (`status = "ABSTAIN"` unless all five gates succeed).

```
                      ┌──────────────────────────────────────┐
                      │          Candidate Ingestion         │
                      │  (id, player, team, market, Sourced) │
                      └──────────────────┬───────────────────┘
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │       G1: LIVE ROSTER GATE           │
                      │  ESPN + Sleeper active verification  │
                      └──────────┬───────────────────────────┘
                                 │ Pass (ok=True)
                                 ▼
                      ┌──────────────────────────────────────┐
                      │    G2: PROVENANCE & FRESHNESS        │
                      │ Sourced objects, age <= max_age_min  │
                      └──────────┬───────────────────────────┘
                                 │ Pass (ok=True)
                                 ▼
                      ┌──────────────────────────────────────┐
                      │      G3: JEV MANDATORY ARBITRATION   │
                      │ jev.cmd ask, CERTIFIED/CAUTION <=.70 │
                      └──────────┬───────────────────────────┘
                                 │ Pass (ok=True)
                                 ▼
                      ┌──────────────────────────────────────┐
                      │      G4: REAL EMPIRICAL LCB GATE     │
                      │ Wilson score 95% LCB, n >= 5, edge>0 │
                      └──────────┬───────────────────────────┘
                                 │ Pass (ok=True)
                                 ▼
                      ┌──────────────────────────────────────┐
                      │   G5: PROVENANCE STAMP & PUBLISH     │
                      │ EmittedPick, ENGINE_GATE_V1, status  │
                      └──────────────────────────────────────┘
```

### Gate 1: Live Roster Verification (`G1`)
- **Mechanism**: Calls `self.roster.verify(c.player, c.team)` (or bypasses athlete verification if `c.is_team_market == True`).
- **Logic**: Confirms the athlete exists on the claimed team in ESPN's live roster endpoint, confirms agreement with Sleeper, checks injury designation is active, and extracts the official `espn_id`.
- **Fail-Closed Trigger**: If the player is unlisted, transferred/traded, injured (status in `BLOCKING_STATUS`), or if either feed errors out, `G1` returns `ok = False` with a descriptive reason.

### Gate 2: Provenance & Freshness Verification (`G2`)
- **Mechanism**: Evaluates each numeric field (`line`, `odds`, `projection`, `history`) via `_provenance(c)`.
- **Logic**:
  1. Verifies that every input is an instance of `Sourced(value, source, captured_at)`. Bare floats or untyped primitives are immediately rejected.
  2. Rejects any source belonging to `HAND_TYPED_SOURCES`: `{"", "manual", "hand", "inline", "hardcoded", "llm", "assumed", None}`.
  3. Computes age: `age_minutes = (self.now - captured_at).total_seconds() / 60.0`.
  4. Enforces strict freshness ceilings:
     - `line`: $\le 30$ minutes
     - `odds`: $\le 30$ minutes
     - `projection`: $\le 24 \times 60$ minutes (24 hours)
     - `history`: $\le 7 \times 24 \times 60$ minutes (7 days)
- **Fail-Closed Trigger**: Any un-sourced value, blacklisted source name, unparseable ISO timestamp, or exceeded age threshold blocks `G2`.

### Gate 3: JEV Mandatory Epistemic Arbitration (`G3`)
- **Mechanism**: Calls `self.jev(questions, state)` once per candidate batch via `subprocess.run(["jev.cmd", "ask"], ...)`.
- **Criteria**:
  - Submits structured criteria: `{"CERTIFIED": "evidence supports the side", "CAUTION": "mixed evidence", "TRAP_OR_PASS": "evidence against / trap"}`.
  - Evaluation rules:
    - `CERTIFIED` $\rightarrow$ `ok = True`
    - `CAUTION` with `confidence <= 0.70` $\rightarrow$ `ok = True`
    - `CAUTION` with `confidence > 0.70` $\rightarrow$ `ok = False`
    - `TRAP_OR_PASS` $\rightarrow$ `ok = False`
- **Fail-Closed Trigger**: If the JEV subprocess times out ($>30$s), returns a non-zero exit code, emits invalid JSON, returns an empty answer set, or fails to provide an answer for a specific item ID, `G3` fails closed for that candidate (or the entire batch).

### Gate 4: Real Empirical Sample Lower Credible Bound (`G4`)
- **Mechanism**: Wilson Score 95% one-sided lower credible bound calculated via `bootstrap_free_lcb(history, line, side, z=1.645)`.
- **Mathematical Formula**:
  Given sample size $n$ and empirical hits $k = \sum_{i=1}^n \mathbb{I}(x_i > \text{line})$ (for `OVER`):
  $$\hat{p} = \frac{k}{n}$$
  $$\text{denom} = 1 + \frac{z^2}{n}$$
  $$\text{centre} = \hat{p} + \frac{z^2}{2n}$$
  $$\text{margin} = z \sqrt{\frac{\hat{p}(1 - \hat{p})}{n} + \frac{z^2}{4n^2}}$$
  $$p_{\text{LCB}} = \max\left(0, \frac{\text{centre} - \text{margin}}{\text{denom}}\right)$$
- **Enforcement Rules**:
  1. **Strict Sample Size Minimum**: Requires $n \ge 5$ observed real-game outcomes. If $n < 5$, `bootstrap_free_lcb` returns `None`, and `G4` fails closed (`insufficient sample (n < 5)`).
  2. **No Fixed Scalar Shortcuts**: As verified in `test_lcb_is_real_not_edge_times_point8`, $p_{\text{LCB}}$ adapts to actual empirical uncertainty rather than applying a heuristic multiplier (e.g. $\text{edge} \times 0.8$).
  3. **Law 9 / Standing Doctrine 5**:
     $$\text{implied} = \text{american\_to\_implied}(\text{odds})$$
     $$\text{edge} = (\hat{p} - \text{implied}) \times 100$$
     $$\text{lcb\_edge} = (p_{\text{LCB}} - \text{implied}) \times 100$$
     Gate passes if and only if:
     $$\text{lcb\_edge} > 0.0 \quad \text{AND} \quad \text{edge} \ge \text{min\_edge\_pct} \ (3.5\%)$$
- **Short-Circuit**: If any upstream gate (G1, G2, or G3) fails, G4 is skipped (`"skipped: upstream gate failed"`).

### Gate 5: Provenance Stamping & Publication Verification (`G5`)
- **Mechanism**: Returns an `EmittedPick` dataclass instance with `stamp = "ENGINE_GATE_V1"`, complete gate logs, and exact input provenance snapshots.
- **Publication Guard (`publishable(p)`)**:
  ```python
  def publishable(p: Any) -> bool:
      return (isinstance(p, EmittedPick) 
              and p.stamp == "ENGINE_GATE_V1" 
              and p.status == "PLAY"
              and bool(p.gates) 
              and all(g.ok for g in p.gates)
              and all(p.provenance.get(k) for k in ("line", "odds", "projection", "history")))
  ```
- **Invariant**: Raw dictionaries, unstamped objects, or picks where any gate failed cannot be published or consumed by downstream boards.

---

## 3. Live Roster Gate Deep-Dive: `intelligence/roster/live_roster_gate.py`

The live roster gate solves the root cause of stale data by querying official APIs in real time.

### Architecture & Data Ingestion
1. **Primary Feed (ESPN Public Core API)**:
   - Endpoint: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{team}/roster`
   - Ingests all 32 NFL teams (`NFL_TEAMS`).
   - Normalizes team aliases (`WAS` $\rightarrow$ `WSH`, `JAC` $\rightarrow$ `JAX`, `OAK` $\rightarrow$ `LV`, `SD` $\rightarrow$ `LAC`).
   - Parses athlete identity, position abbreviation, and explicit injury arrays (`a["injuries"][0]["status"]` and `a["status"]["type"]`).
2. **Cross-Check Feed (Sleeper NFL API)**:
   - Endpoint: `https://api.sleeper.app/v1/players/nfl`
   - Verifies that Sleeper agrees with ESPN on team affiliation and active status.
   - Handles Sleeper's tendency to drop generational suffixes by fallback matching on normalized base name + matching team + matching position.

### Identity Normalization & Suffix Preservation
The normalization function `norm_name(name: str)` implements a non-negotiable rule:
- Converts "Last, First" into "First Last".
- Removes punctuation, apostrophes, and extraneous whitespace.
- **CRITICAL**: Preserves identity-bearing generational suffixes (`jr`, `sr`, `ii`, `iii`, `iv`, `v`).
  - Example: `norm_name("Marvin Harrison Jr.")` = `"marvin harrison jr"`
  - Example: `norm_name("Marvin Harrison")` = `"marvin harrison"`
  - `norm_name("Marvin Harrison") != norm_name("Marvin Harrison Jr.")` prevents catastrophic collisions between retired father and active son.

### Fail-Closed Blocking Conditions
A candidate player is blocked (`v.ok = False`) if:
1. Claimed team roster is unavailable (`BLOCK: ESPN roster for {team} unavailable`).
2. Player is not found on any NFL roster (`BLOCK: not on any live NFL roster`).
3. Player is found on a different team (`BLOCK: stale roster -- live team is X, not Y`).
4. Multiple athletes on the same team share the exact same name (`BLOCK: ambiguous identity`).
5. ESPN status contains any member of `BLOCKING_STATUS`:
   `("out", "injured reserve", "ir", "doubtful", "suspended", "pup", "nfi", "reserve")`.
6. Sleeper feed is down (`BLOCK: Sleeper cross-check unavailable`).
7. Sleeper has no record of the athlete (`BLOCK: Sleeper cross-check has no record`).
8. Sleeper disagrees on team affiliation (`BLOCK: Sleeper disagrees on team (...)`).
9. Sleeper marks the athlete with a blocking injury status.

### Unit Test Verification (`intelligence/roster/test_live_roster_gate.py`)
The offline test suite contains 11 deterministic test cases:
1. `test_valid_player_passes`: Jahmyr Gibbs on DET passes with ESPN ID `"1"`.
2. `test_stale_team_blocked_montgomery`: David Montgomery on DET is blocked (live team is HOU).
3. `test_not_in_league_blocked_diontae`: Diontae Johnson on CAR is blocked (not on roster).
4. `test_inactive_blocked`: Saquon Barkley on PHI is blocked (status `"Out"`).
5. `test_last_first_order_resolves_and_still_blocks_inactive`: `"Barkley, Saquon"` correctly resolves and blocks.
6. `test_suffix_is_identity_no_false_block`: Marvin Harrison Jr. on ARI passes.
7. `test_suffix_missing_does_not_resolve_to_junior`: Marvin Harrison (Sr.) does NOT resolve to Jr. and blocks.
8. `test_sleeper_disagreement_blocks`: Chuba Hubbard (ESPN CAR vs Sleeper DET) triggers cross-check block.
9. `test_espn_feed_failure_fails_closed`: Network/HTTP error fails closed.
10. `test_sleeper_failure_fails_closed`: Sleeper outage fails closed.
11. `test_empty_report_does_not_pass`: Empty player batch report has `passed = False`.

All 11 tests pass with 100% compliance.

---

## 4. Enforcement & CI Anti-Bypass Scanning: `frontier/sports/test_engine_gate.py`

`frontier/sports/test_engine_gate.py` acts as both the functional test suite for `EngineGate` and the repo-wide CI gatekeeper.

### Test Suite Structure
The file contains 14 tests:
- Gate logic unit tests:
  - `test_clean_candidate_plays_and_is_publishable`
  - `test_stale_roster_abstains`
  - `test_jev_error_abstains`
  - `test_jev_empty_abstains`
  - `test_jev_trap_abstains`
  - `test_hand_typed_input_abstains`
  - `test_stale_feed_abstains`
  - `test_no_sample_abstains`
  - `test_lcb_is_real_not_edge_times_point8`
  - `test_unstamped_dict_not_publishable`
- Anti-bypass scanning tests:
  - `test_repo_has_no_gate_bypass`
  - `test_enforcement_catches_planted_inline_roster`
  - `test_enforcement_catches_planted_ungated_emitter`
  - `test_retired_script_refuses_to_run`

### Static Code Scanning Mechanics
The `violations()` function scans all `.py` files in `frontier/sports` and `intelligence` (excluding `test_*` and `__pycache__`):
1. **Retired Exemption Gate**: If `"ENGINE-GATE RETIRED"` is present in the source, the script is known to be deactivated and skipped from inline data scanning.
2. **Inline Data Regex**:
   `INLINE = re.compile(r'"(player|name)"\s*:\s*"[A-Z][a-z]+[ .\-]')`
   Detects hardcoded player dictionaries or arrays.
3. **Ungated Emitter Regex**:
   Detects un-gated publication attempts:
   `re.search(r"print\(.*(PLAY|Verdict|SOVEREIGN|recommend)", src)`
   Any match in a file lacking `"engine_gate"` (outside `engine_gate.py` and `audit_tonight.py`) immediately fails CI.

---

## 5. Legacy Pick Script Lockdown: Protection of `_retired.py`

### The Kill-Switch Architecture (`frontier/sports/_retired.py`)
```python
def retired(mod: str) -> None:
    if os.environ.get("GSE_AUDIT_READONLY") == "1":
        return
    raise RuntimeError(
        f"RETIRED: {mod} hand-types player data and bypasses the engine. "
        "All picks must go through frontier.sports.engine_gate.EngineGate."
    )
```

### Protected Scripts Inventory (16 Total)
Every one of the following 16 scripts begins with:
`from frontier.sports._retired import retired as _retired; _retired(__name__)  # ENGINE-GATE RETIRED`

1. `frontier/sports/dfs_main_slate_optimizer.py`
2. `frontier/sports/dfs_slate_optimizer.py`
3. `frontier/sports/evaluate_grounded_model.py`
4. `frontier/sports/generate_creative_vertical_cards.py`
5. `frontier/sports/generate_gse_social_cards.py`
6. `frontier/sports/generate_props_master_cards.py`
7. `frontier/sports/generate_ultra_creative_suite.py`
8. `frontier/sports/master_exhaustive_slate_engine.py`
9. `frontier/sports/mega_slate_scanner.py`
10. `frontier/sports/nfl_week4_forecast_engine.py`
11. `frontier/sports/real_late_slate_engine.py`
12. `frontier/sports/run_midday_slate.py`
13. `frontier/sports/run_tonight_snf_board.py`
14. `frontier/sports/run_week4_forecast.py`
15. `frontier/sports/scan_all_week4_props.py`
16. `frontier/sports/universal_jev_signal_scanner.py`

### Live Roster Audit Findings
When `intelligence/roster/audit_tonight.py` audited the player pool from these legacy scripts against live ESPN and Sleeper feeds under `GSE_AUDIT_READONLY=1`, the findings preserved in `outbox/LIVE-ROSTER-AUDIT-2026-10-04.json` proved:
- **52 players evaluated**: 31 passed, **21 blocked (40.4% error rate)**.
- Stale roster examples:
  - `A.J. Brown` claimed PHI $\rightarrow$ Live team is NE.
  - `Andy Dalton` claimed CAR $\rightarrow$ Live team is PHI.
  - `Stefon Diggs` claimed HOU $\rightarrow$ Live team is WSH.
  - `Wan'Dale Robinson` claimed NYG $\rightarrow$ Live team is TEN.
  - `David Montgomery` claimed DET $\rightarrow$ Live team is HOU.
- Injured inactive examples:
  - `Baker Mayfield` claimed TB $\rightarrow$ Official status: `"out"`.
  - `Saquon Barkley` claimed PHI $\rightarrow$ Official status: `"out"`.

---

## 6. Architectural Insertion Points: GSE Signal Registry & Real Mathematical Engines

To elevate `EngineGate` from a basic pass/fail gate to the full quantitative engine mandated by Standing Doctrines 1–12, candidate picks must be routed through the real GSE Signal Registry and mathematical engines.

### 6.1 Overview of Quantitative Assets

#### A. GSE Signal Registry (`packages/ingestion-pipeline/src/`)
Defined in `signal-registry-definitions.ts` and `signal-registry-extensions.ts`, exported via `SIGNAL_REGISTRY` (41 active signals total):
1. **19 Core Signals**:
   - `prefetched_exchange`: Caller-supplied / exchange fair value ($w=1.00$)
   - `kalshi_live`: Live Kalshi exchange market probabilities ($w=0.30$)
   - `espn_power_index`: ESPN FPI model predictions ($w=0.18$)
   - `club_elo`: ClubElo ratings conversion ($w=0.18$)
   - `rate_model`: Dixon-Coles & Poisson bivariate goal models ($w=0.16$)
   - `skellam_cover`: Skellam margin distribution cover probability ($w=0.16$)
   - `mlb_standings`: Pythagorean expectation / run differential ($w=0.14$)
   - `chronological_elo`: Dynamic time-decay Elo ratings ($w=0.20$)
   - `polymarket_gamma`: Prediction market order-book density ($w=0.12$)
   - `nfl_epa_opponent_adjusted`: Opponent-adjusted EPA/play ($w=0.22$)
   - `nfl_wind_elasticity`: Wind speed pass elasticity multiplier ($w=0.15$)
   - `nfl_coaching_tendencies`: PROE & neutral pace coaching factors ($w=0.14$)
   - `nfl_injury_trajectory`: Multi-week injury recovery decay ($w=0.18$)
   - `nfl_redzone_te_leverage`: Red-zone TE target funnel leverage ($w=0.12$)
   - `nfl_offensive_line_trench`: Pressure rate over expected & adjusted sack rate ($w=0.20$)
   - `nfl_referee_crew_tendencies`: Penalty rate & home-whistle bias ($w=0.10$)
   - `nfl_circadian_travel_fatigue`: Body-clock circadian shift for cross-country travel ($w=0.10$)
   - `nfl_contract_milestones`: Contract incentive threshold chases ($w=0.08$)
   - `nfl_wr1_out_redistribution`: Alpha target funnel when WR1 is out ($w=0.14$)
2. **22 Extended Signals (`signal-registry-extensions.ts`)**:
   - `nfl_turnover_luck`: Fumble recovery variance vs skill ($w=0.12$)
   - `nfl_short_week_road_deficit`: Thursday night / short-week road rest deficit ($w=0.11$)
   - `nfl_turf_surface_fatigue`: FieldTurf vs natural grass soft-tissue fatigue ($w=0.09$)
   - `nfl_qb_receiver_continuity`: Multi-year QB-WR target synchrony ($w=0.14$)
   - `nfl_penalty_differential_momentum`: Net drive-extending penalty differential ($w=0.10$)
   - `nfl_backup_qb_target_distribution`: Checkdown / low-aDOT funnel under backup QB ($w=0.13$)
   - `nfl_man_zone_receiver_archetype`: Slot separator vs deep boundary against primary coverage scheme ($w=0.16$)
   - `nfl_qb_twp_regression`: Turnover-worthy play regression to interception mean ($w=0.12$)
   - `nfl_high_altitude_fatigue_decay`: Denver altitude fourth-quarter fatigue ($w=0.08$)
   - `nfl_linear_wind_pass_impact`: Deep pass completion decay above 15 mph ($w=0.14$)
   - `nfl_temperature_precipitation_decay`: Sub-freezing handling and fumbling rates ($w=0.10$)
   - `nfl_rookie_breakout_cohort`: Post-bye rookie snap share surge ($w=0.11$)
   - `nfl_negative_binomial_redzone_td`: Overdispersed red-zone TD conversion ($w=0.15$)
   - `nfl_red_zone_opportunity_conversion`: EPA inside 20-yard line ($w=0.13$)
   - `nfl_bye_week_defensive_installation`: Post-bye defensive scheme wrinkles ($w=0.09$)
   - `nfl_age_conditioned_rest`: Aging veteran performance on extended rest ($w=0.10$)
   - `nfl_fourth_down_coaching_aggressiveness`: Going for it on 4th vs cowardly punts ($w=0.12$)
   - `nfl_lopez_second_and_ten_tendency`: Passing on 2nd-and-10 run tendencies ($w=0.11$)
   - `nfl_primetime_target_concentration`: Target funneling to stars in nationally televised games ($w=0.12$)
   - `nfl_early_down_proe_momentum`: Pass Rate Over Expected on 1st and 2nd down ($w=0.14$)
   - `nfl_red_zone_personnel_grouping`: 12-personnel vs 11-personnel red zone efficiency ($w=0.11$)
   - `nfl_two_minute_hurry_up_efficiency`: Two-minute drill pace and completion rate ($w=0.13$)

#### B. Production Mathematical Engines
1. **Bayesian Distributionally Robust Kelly (`bayesian_robust_kelly_engine.py` / `packages/prediction-engine/src/robust-kelly.ts`)**:
   - Beta-Binomial conjugate update: $\text{Beta}(\alpha + k, \beta + (n-k))$
   - Cornish-Fisher quantile expansion for lower credible bound $p_{\text{LCB}}$
   - Coefficient of Variation penalty: $\kappa = \frac{1}{1 + \gamma \cdot \text{CV}^2}$
   - Robust quarter-Kelly fraction: $f^* = \frac{1}{4} \cdot \kappa \cdot \max\left(0, \frac{b \cdot p_{\text{LCB}} - (1 - p_{\text{LCB}})}{b}\right)$
   - Drawdown ruin probability via Browne's stochastic control formula.
2. **Higham Nearest-PSD Matrix Repair & Safe Cholesky (`matrix_repair.py`)**:
   - Eigenvalue projection: replaces $\lambda_i < \epsilon$ with $\epsilon = 10^{-6}$, rescales diagonal to $1.0$.
   - Prevents `LinAlgError: Matrix is not positive definite` in multivariate simulations and copulas.
3. **Vine Copula Parlay Engine (`vine_copula_parlay_engine.py`)**:
   - Pair copula families: Clayton (lower-tail dependence), Gumbel (upper-tail shootout dependence), Frank (symmetric), Gaussian.
   - Exact $h$-function conditional distributions for $C$-Vine and $D$-Vine decomposition.
   - Enforces Fréchet-Hoeffding multi-dimensional bounds: $\max(0, \sum u_i - d + 1) \le C(u) \le \min(u_i)$.
4. **Adaptive Conformal Inference & CQR (`adaptive_conformal_engine.py`)**:
   - Online DtACI: dynamically tunes miscoverage rate $\alpha_t$ under non-exchangeable distribution drift.
   - Jackknife+ distribution-free predictive intervals with exact $1 - 2\alpha$ coverage guarantee.
   - Tweedie empirical-Bayes shrinkage (ECAP) mitigating selection bias on extreme lines.
5. **Shootout Velocity Index (SVI) Engine (`shootout_velocity_engine.py`)**:
   - Bilateral Playoff Leverage Index (harmonic mean of playoff deltas).
   - Scrimmage clock expansion mechanics (incomplete pass clock stoppages freeze game clock for 5.5s, expanding plays by $+25\%$ to $+35\%$).
   - Bivariate Hawkes self-exciting process modeling cross-drive tempo feedback.
6. **NFL Expected Points & Win Probability (`nfl_ep_wp_engine.py`)**:
   - Canonical 7-state multinomial logit (Touchdown, Field Goal, Safety, No Score, Opp Safety, Opp Field Goal, Opp Touchdown).
   - Real-time EP and EPA evaluation based on yard line, down, distance, and half time remaining.

---

### 6.2 The Four Architectural Insertion Points

```
                                 [Live Ingestion / ESPN Feeds]
                                                │
                                                ▼
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │ INSERTION POINT 1: SIGNAL REGISTRY CONTEXTUAL HARNESS                                  │
  │ • Evaluate game context via runSignalRegistry(ctx)                                     │
  │ • Compute SVI (shootout_velocity_engine), EPA (nfl_ep_wp_engine), Weather (elasticity) │
  │ • Populate Candidate: projection carries composite model value + signal metadata       │
  └─────────────────────────────────────────────┬──────────────────────────────────────────┘
                                                │
                                                ▼
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │ INSERTION POINT 2: ROSTER & PROVENANCE VALIDATION (G1 & G2)                            │
  │ • LiveRosterGate.verify(player, team): resolves stable ESPN ID, checks injuries        │
  │ • Provenance verification: ensure line, odds, projection, history are Sourced (<30m)   │
  └─────────────────────────────────────────────┬──────────────────────────────────────────┘
                                                │
                                                ▼
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │ INSERTION POINT 3: MATHEMATICAL SYNTHESIS & CALIBRATION (G4)                           │
  │ • Conformal Quantile Regression (CQR / Jackknife+) produces distribution-free bounds   │
  │ • Bayesian Distributionally Robust Kelly computes p_lcb, kappa penalty, and f*         │
  │ • Vine Copula & Higham Matrix Repair evaluate correlation for parlays & SGPs           │
  │ • Law 9 Enforcement: require p_lcb > implied_prob and edge >= 3.5%                     │
  └─────────────────────────────────────────────┬──────────────────────────────────────────┘
                                                │
                                                ▼
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │ INSERTION POINT 4: COMPREHENSIVE PROVENANCE STAMPING (G5)                              │
  │ • EmittedPick stamped with ENGINE_GATE_V1                                              │
  │ • Stamped payload carries signal breakdown, math engine diagnostics, and audit trail   │
  │ • publishable() gate verifies full pass prior to publication                           │
  └────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Insertion Point 1: Upstream Signal Registry Contextual Harness
- **Location**: Pre-candidate formation (where lines, odds, and game context are assembled).
- **Action**:
  - Run `runSignalRegistry` across the matchup context (`sportKey: "americanfootball_nfl"`, `homeTeam`, `awayTeam`, spread, total, kickoff time, environment variables).
  - Call `ShootoutVelocityEngine.compute_game_script_urgency` to produce the game's SVI, pass funnel scores, and expected play volume multipliers.
  - Call `NFLExpectedPointsEngine` to calibrate baseline offensive and defensive EPA.
  - The resulting projection passed into `Candidate(projection=Sourced(val, "gse_signal_blend", now))` is not an unverified scalar, but the calibrated output of the independent signal blend.

#### Insertion Point 2: Roster Identity & GSIS Resolution (`G1` & `G2`)
- **Location**: Inside `EngineGate._provenance` and `LiveRosterGate.verify`.
- **Action**:
  - Crosswalk athlete identity from ESPN ID (`espn_id`) to official GSIS ID (`00-XXXXXXX`) using `intelligence/roster/gsis_inactive_gate.py`.
  - Attach the canonical ID to `Candidate.id`, establishing persistent identity across slates, box scores, and model updates.

#### Insertion Point 3: Mathematical Engine Synthesis (`G4`)
- **Location**: Inside `EngineGate.evaluate` at Gate 4.
- **Action**:
  - Enhance `G4` beyond the basic Wilson empirical lower bound by integrating `BayesianRobustKellyEngine` and `AdaptiveConformalInference`:
    ```python
    # 1. Conformal prediction interval
    cqr_interval = JackknifePlusPredictor.compute_interval(loo_preds, loo_resids, alpha=0.10)
    
    # 2. Bayesian Robust Kelly with Knightian uncertainty
    kelly_alloc = BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(
        asset_name=c.player,
        decimal_odds=american_to_decimal(c.odds.value),
        model_mean_p=c.projection.value,
        sample_hits=hits,
        sample_trials=len(hist),
        bankroll=10000.0,
        risk_aversion_gamma=1.5
    )
    
    # 3. Fail-Closed Law 9 check
    ok = (kelly_alloc.status in ("APPROVED", "SHRUNK_UNCERTAINTY") 
          and kelly_alloc.lcb_edge_pct > 0.0 
          and kelly_alloc.nominal_edge_pct >= self.min_edge)
    ```
  - For multi-leg entries or SGPs, run `VineCopulaParlayEngine` with `safe_cholesky(matrix_repair.nearest_positive_definite(corr_matrix))` to evaluate joint survival probabilities under upper/lower tail dependence.

#### Insertion Point 4: Comprehensive Provenance Stamping (`G5`)
- **Location**: `EmittedPick` generation and publication serialization.
- **Action**:
  - Ensure the `EmittedPick.provenance` payload contains:
    - Active GSE Signal snapshot (`sources`, `weights`, `breakdown`)
    - SVI and EPA game context ratings
    - Bayesian Kelly diagnostics (`lcb_p`, `robust_fraction_pct`, `ruin_probability_at_50pct_dd`)
    - Full timestamps and raw feed URLs.

---

## 7. Live Feed Verification: Detroit Lions at Carolina Panthers (DET @ CAR)

To prove that the live pipeline functions with official external feeds without relying on mock data, we performed a direct live audit of tonight's game:

1. **ESPN Live Scoreboard Feed**:
   - Query: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`
   - Result:
     - Event ID: `401872978`
     - Matchup: `Detroit Lions at Carolina Panthers`
     - Status: Successfully resolved.
2. **ESPN Core Prop Bets Feed**:
   - Query: `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/401872978/competitions/401872978/odds/100/propBets`
   - Result:
     - Total live prop bets available: **1,561 props**
     - Exemplar Prop 0:
       - Athlete `$ref`: `.../seasons/2026/athletes/3046779` (Jared Goff)
       - Market: `Total Passing Yards (incl. overtime)`
       - Target line: `260.5` yards
       - Last updated: `2026-10-05T02:16Z`
3. **Player Gamelog Series Resolution**:
   - Query: `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/{id}/gamelog?season=2026`
   - Resolves actual game-by-game rushing, passing, and receiving statistics directly from official box scores, satisfying the $n \ge 5$ empirical requirement for G4 without manual entry.

---

## 8. Summary of Findings & Verification Status

| Component | Status | Verification Evidence |
|---|---|---|
| **Live Roster Gate** (`live_roster_gate.py`) | **VERIFIED PASS** | 11/11 tests pass in `test_live_roster_gate.py`. Dual-source ESPN+Sleeper, suffix-aware, fail-closed on inactives/stale teams. |
| **Engine Gate Core** (`engine_gate.py`) | **VERIFIED PASS** | 14/14 tests pass in `test_engine_gate.py`. Enforces G1–G5, Wilson empirical LCB, JEV mandatory, stamping. |
| **Repo-Wide Anti-Bypass Scanning** | **VERIFIED PASS** | Static AST/regex scan checks `frontier/sports` and `intelligence`. Catches planted inline rosters and ungated emitters. |
| **Retired Scripts Lockdown** (`_retired.py`) | **VERIFIED PASS** | All 16 legacy pick scripts carry runtime kill switches. `test_retired_script_refuses_to_run` verifies fail-closed execution. |
| **Mathematical Engines Test Suite** | **VERIFIED PASS** | 98/98 unit tests pass across `frontier/sports` and `intelligence/roster` (Kelly, Vine Copula, Matrix Repair, Kinematics, Discrete Margin, Climate). |
| **TypeScript Signal Registry** | **VERIFIED PASS** | Vitest passes on `signal-registry.test.ts` (prediction-engine) and `signal-registry-migration.test.ts` (ingestion-pipeline). |
| **Live ESPN Data Feeds** | **VERIFIED PASS** | Scoreboard event `401872978` (DET@CAR) and 1,561 prop bets fetched live with official timestamps. |

The foundation is solid, secure, and ready for full end-to-end integration.
