# Phase 0 Survey Report: Requirement R1 (Mandatory 200+ Engine Gates & L1–L5 Reasoning Filter)

**Subagent**: `explorer_survey_gate_reasoning`  
**Working Directory**: `C:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_gate_reasoning\`  
**Date**: 2026-10-12  
**Parent Agent**: `4b4ec98b-b9df-4eda-bc9a-7faeca182fee`

---

## 1. Observation

### 1.1 Live Roster Gate (`intelligence/roster/live_roster_gate.py` & `test_live_roster_gate.py`)
- **Primary & Cross-Check Feeds**:
  - `intelligence/roster/live_roster_gate.py:30-31`:
    ```python
    ESPN_ROSTER = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{team}/roster"
    SLEEPER_PLAYERS = "https://api.sleeper.app/v1/players/nfl"
    ```
  - Suffix-aware identity preservation: Lines 58-67 `norm_name(name)` cleans punctuation and orders `"Last, First" -> "First Last"`, but line 55 regex `_SUFFIX = re.compile(r"\b(jr|sr|ii|iii|iv|v)\b\.?", re.I)` keeps suffixes attached so `"Marvin Harrison"` != `"Marvin Harrison Jr."`. Downstream ID keying resolves and returns `espn_id`.
  - Inactives & Blocking Statuses: Line 39 declares:
    ```python
    BLOCKING_STATUS = ("out", "injured reserve", "ir", "doubtful", "suspended", "pup", "nfi", "reserve")
    ```
    Lines 179-181 verify ESPN injury status and roster status; lines 202-205 verify Sleeper `injury_status`.
  - Stale Roster & Team Disagreement: Lines 168-173 detect when a player is on a different live team (`BLOCK: stale roster -- live team is {hits[0].team}, not {team}`, e.g., Montgomery on DET -> HOU). Lines 197-200 check Sleeper team disagreement (`BLOCK: Sleeper disagrees on team`).
  - Fail-Closed Implementation:
    - If ESPN fetch fails for a team: line 140 catches exception into `feed_errors`; line 161 checks `if team not in self._espn: v.reason = f"BLOCK: ESPN roster for {team} unavailable (fail closed)"`.
    - If Sleeper fetch fails: line 183 checks `if any(e.startswith("Sleeper") for e in self.feed_errors): v.reason = "BLOCK: Sleeper cross-check unavailable (fail closed)"`.
    - Empty player list: line 214 `passed = all(v.ok for v in verdicts) and bool(verdicts)`. An empty query fails closed (`passed = False`).
  - Depth Chart Observation: `live_roster_gate.py` extracts position string (`abbreviation`), but does **not** evaluate depth chart hierarchy/rankings. Depth charts are sourced from `intelligence/coaching/ol_provider.py:42` (`depth_charts_2026.parquet`).
  - Test Suite Status: `python -m pytest intelligence/roster/test_live_roster_gate.py` executes **11 passed in 0.03s** (11/11 tests passing).

---

### 1.2 5 Frontier Engine Gates & Conjunction Gate

- **5 Gates in `frontier/sports/engine_gate.py`**:
  1. **G1 Live Roster Gate** (lines 198-204): Calls `self.roster.verify(c.player, c.team)` unless `c.is_team_market`. Any fail-closed rejection stops the candidate.
  2. **G2 Provenance & Freshness** (lines 162-180, 206): Requires inputs to be `Sourced(value, source, captured_at)`. Rejects `HAND_TYPED_SOURCES = {"", "manual", "hand", "inline", "hardcoded", "llm", "assumed", None}`. Enforces max age in minutes (`line`: 30, `odds`: 30, `projection`: 1440, `history`: 10080).
  3. **G-Sig Signal Registry Validation** (lines 209-228): Validates candidate against 47 signals via `SignalContext` and `run_signal_blend`. Enforces `len(SIGNAL_REGISTRY) == 47`.
  4. **G3 JEV Epistemic Arbitration** (lines 229-237): Runs batch JEV query via `default_jev` (`jev.cmd ask`). Requires `CERTIFIED` or `CAUTION` with `conf <= 0.70`. Any timeout, error, empty answer, or `TRAP_OR_PASS` forces candidate to ABSTAIN.
  5. **G4 Real Empirical LCB & Math Synthesis** (lines 238-335): Wilson 95% one-sided LCB on empirical outcomes (`bootstrap_free_lcb`), Bayesian Robust Kelly allocation (`BayesianRobustKellyEngine`), SVI (`ShootoutVelocityEngine`), and EPA baseline (`NFLExpectedPointsEngine`). Requires:
     `wilson_ok = (lcb_edge > 0.0)`, `edge_ok = (edge >= self.min_edge)`, `bdr_ok = (bdr_alloc.status in ("APPROVED", "SHRUNK_UNCERTAINTY") and bdr_alloc.lcb_edge_pct > 0.0)`.
  6. **G5 Stamp & Publishable Guard** (lines 416-426):
     ```python
     def publishable(p: Any) -> bool:
         return (isinstance(p, EmittedPick)
                 and p.stamp == "ENGINE_GATE_V1"
                 and p.status == "PLAY"
                 and bool(p.gates)
                 and all(g.ok for g in p.gates)
                 and all(p.provenance.get(k) for k in ("line", "odds", "projection", "history"))
                 and p.signal_diagnostics is not None
                 and p.bayesian_kelly is not None)
     ```
  7. **Parlay & Copula Gate** (lines 357-414 `evaluate_parlay`): Evaluates multi-leg parlay/SGP using Higham nearest-PSD repair (`nearest_positive_definite`, `safe_cholesky`), Canonical Vine Copula simulation (`VineCopulaParlayEngine`), and Fréchet bounds compliance (`copula_res.frechet_compliant`).

- **Inspection of `independentEdge.decision == "PASS"` Filter**:
  - **Signal Path** (`packages/ingestion-pipeline/src/generate-signal-slate.ts:691-698`):
    ```typescript
    const passVeto = independentEdge.decision === "PASS";
    const publicationVeto = stalenessVeto || passVeto;
    ```
    Line 913: On pick creation, `isPublished: gates.canExposePublicPicks && !publicationVeto`.
    **Vulnerability/Hole**: On pick update (lines 875-877):
    ```typescript
    const publicationUpdate = gates.canExposePublicPicks ? {} : { isPublished: false };
    ```
    If `publicationVeto` is true on an existing pick, `publicationUpdate` is `{}` — it fails to revoke `isPublished`!
  - **Book Path** (`packages/prediction-engine/src/scoring.ts:815, 1456`):
    ```typescript
    // Line 815 & 1456:
    if (pricesWorseThanMarket(independentEdgeRaw)) return null;
    ```
    And `packages/types/src/index.ts:145-149`:
    ```typescript
    export function pricesWorseThanMarket(edge: IndependentEdgeSummary | null): boolean {
      if (!edge) return false;
      if (!Number.isFinite(edge.expectedClv)) return false;
      return edge.expectedClv < 0;
    }
    ```
    **Critical Leak**: `pricesWorseThanMarket` ONLY checks `expectedClv < 0`. It does NOT check `decision === "PASS"`. In `packages/prediction-engine/src/edge-engine.ts:258-262`, when `agreement === "CONTRADICTS"`, `agreementFactor = 0`, so `shrunkEdge = 0`, `expectedClv = 0`, and `decision = "PASS"`. Because `expectedClv` is 0 (not < 0), `pricesWorseThanMarket` returns `false`, and `scoring.ts` proceeds to publish the pick! This is the exact specimen called out in AGENTS.md (Steelers ML -285 published at conf 50 with `decision: "PASS"`).
  - **Display Suppression** (`apps/web/lib/picks/adverse-edge-suppression.ts:82-84`):
    ```typescript
    export function isAdverseEdgeRow(row: AdverseEdgeRow): boolean {
      return pricesWorseThanMarket(readIndependentEdge(row.factorBreakdown));
    }
    ```
    Also relies exclusively on `pricesWorseThanMarket`, leaving zero suppression for `decision === "PASS"` where `expectedClv == 0`.

- **Agreement >= 2 & Solo-Source Edge Shrinking**:
  - In `packages/prediction-engine/src/edge-engine.ts:247-262`:
    - `agreement === "CONFIRMS"` (>=2 estimators agree with edge direction): `agreementFactor = 1.0`, conviction bonus +15.
    - `agreement === "SOLO"` (exactly 1 estimator): `agreementFactor = 0.6` (shrunk by 40%), conviction penalty -5.
    - `agreement === "SPLIT"` (>=2 estimators, none opposing, some neutral): `agreementFactor = 0.5`, conviction penalty -8.
    - `agreement === "CONTRADICTS"` (any independent estimator opposes the edge): `agreementFactor = 0.0`, forced `decision = "PASS"`.

- **Signal Registry Cataloguing**:
  - `packages/ingestion-pipeline/src/signal-registry-definitions.ts`: Declares 19 base signals (odds, schedule, weather, injuries, ratings, power index).
  - `packages/ingestion-pipeline/src/signal-registry-extensions.ts`: Declares 22 extended situational/efficiency signals (all marked `DARK: no point-in-time producer on the mint path`).
  - Total catalogued signals across the TypeScript registry: 47 signals across 8 families (`MARKET`, `EFFICIENCY`, `TRENCHES`, `LUCK`, `SITUATIONAL`, `NARRATIVE`, `MICROCLIMATE`, `MARKET_MICROSTRUCTURE`).

---

### 1.3 L1–L5 Reasoning Trace Engine (`intelligence/reasoning/`)

- **Package Architecture & Contracts**:
  - `intelligence/reasoning/enums.py`:
    - `ReasoningDepth`: L1, L2, L3, L4, L5.
    - `Exposure`: `NONE`, `ANALYSIS`, `PUBLISHED_PICK`, `CARD`. Line 96: `requires_l5() -> bool: return self in (self.PUBLISHED_PICK, self.CARD)`.
    - `TRACKS` (lines 102-108): `('qb_behavior', 'coaching_scheme', 'offensive_line', 'trust_signals', 'scheme_matchup')`.
    - `ChecklistVerdict`: `CLEAR`, `NOTHING_MATERIAL`, `DATA_GAP`, `CONFLICT`, `UNCHECKED`.
  - `intelligence/reasoning/checklist.py`:
    - Line 80: `if trace.depth.is_at_least(ReasoningDepth.L3) and unchecked: return ChecklistResult(valid=False, invalid_reason="UNCHECKED track(s) at {depth}: {unchecked}. Analysis is INVALID at L3+. Halt — do not downgrade silently.")`. Zero UNCHECKED tracks permitted at L3+.
    - Line 112: `depth_contract_ok(depth, exposure)`: enforces `if exposure.requires_l5(): return depth == ReasoningDepth.L5`.
  - `intelligence/reasoning/levels.py`:
    - Line 85: `HIERARCHY_ORDER = ['offensive_line', 'coaching_scheme', 'scheme_matchup', 'qb_behavior', 'trust_signals']`.
    - Lines 94-105: `check_hierarchy(trace)` verifies `order.index("offensive_line") < order.index("coaching_scheme") < order.index("qb_behavior")`.
    - Lines 166-169: `run_l5_synthesis` asserts `if not check_hierarchy(trace): raise ValueError("L5 synthesis hierarchy violated: OL → scheme → QB order broken")`.
    - Lines 170-199: Inspects `_adv.killed_legs(report)` and `report.breaking_conditions_met`. If breaking conditions are met or killed legs exist, emits `REJECT`. Only when all adversary breaking conditions evaluate to `False` does it state `Thesis survived L4 adversary (no breaking condition met)`.
  - `intelligence/reasoning/adversary.py`:
    - Lines 365-371: Evaluates breaking conditions against `trace.observed_values`.
    - Lines 401-408: Theses with met breaking conditions get `verdict = "KILL"` and their legs are extracted via `killed_legs(report)`.
  - `intelligence/reasoning/engine.py`:
    - Lines 80-83, 126-130: `_effective_floor` raises any `PUBLISHED_PICK` or `CARD` request to `ReasoningDepth.L5`.
    - Lines 223-227: `_finalize` raises `ContractViolation` if `not _chk.depth_contract_ok(trace.depth, trace.exposure)`.
  - **Unit & E2E Test Verification**:
    - `python -m pytest intelligence/tests/test_reasoning_engine.py`: **11 passed in 0.19s**.
    - `python -m pytest intelligence/tests/test_reasoning_units.py intelligence/tests/e2e/test_reasoning_trace_e2e.py`: **62 passed in 0.30s**.
    - Total: **73/73 tests passing** in `intelligence/reasoning` test suites!

---

### 1.4 Mathematical & Statistical Rigor

- **Wilson Score Lower Confidence Bound (LCB)**:
  - `frontier/sports/engine_gate.py:124-138` (`bootstrap_free_lcb`):
    Analytical one-sided Wilson 95% interval on observed historical outcomes. Fails closed with `None` if $n < 5$. Centre $= (p + z^2/(2n))/(1 + z^2/n)$, Margin $= (z\sqrt{p(1-p)/n + z^2/(4n^2)})/(1 + z^2/n)$.
  - `packages/prediction-engine/src/model-limitations.ts:41` (`wilsonInterval`): Analytical Wilson score implementation in TypeScript.
- **Bayesian Distributionally Robust Kelly (BDR-Kelly)**:
  - `packages/prediction-engine/src/robust-kelly.ts:414` (`robustKellyFraction`):
    Constructs Beta credible set $Beta(p \cdot n + 1, (1-p) \cdot n + 1)$ with Laplace pseudo-counts under Knightian parameter uncertainty; computes lower quantile $p_{\text{worst}} = Q(\alpha; a, b)$ using regularized incomplete beta continued fractions (`betai`) and Lanczos `gammaLn`; stakes via $f^* = (p_{\text{worst}}(b+1) - 1)/b$.
  - `intelligence/staking/kelly.py`: Solves the nonlinear PDE $\frac{\partial u}{\partial \theta} = u^2 z^2 \frac{\partial^2 u}{\partial z^2}$ via explicit Euler to determine stop-loss Kelly scaling $u(z, \theta)$. Passes 24/24 tests (`pytest intelligence/staking/`).
- **Copula Tail Dependence & C-Vine Simulation**:
  - `intelligence/sgp/sgp_copula_engine.py`:
    Implements Gaussian, Student-t (symmetric tail), and Clayton copulas ($\lambda_L = 2^{-1/\theta}, \lambda_U = 0$, modeling joint downside collapse); Monte Carlo joint evaluation over marginal distributions. Passes 32/32 tests (`pytest intelligence/sgp/`).
- **Higham Nearest-PSD Repair**:
  - `intelligence/sgp/sgp_copula_engine.py:96-150` (`nearest_psd_higham`):
    Implements Higham (1988) alternating Dykstra projection onto the PSD cone (clipping negative eigenvalues to 0) with Frobenius-norm convergence tolerance.
- **Poisson, Skellam, & Dixon-Coles Distributions**:
  - `packages/prediction-engine/src/poisson.ts`, `skellam.ts`, `dixon-coles.ts`:
    Implements discrete Poisson PMF/CDF, Skellam difference distribution for low-scoring match cover, and bivariate Dixon-Coles correlation adjustment with $\tau(x, y, \lambda, \mu, \rho)$.
  - `intelligence/props/prop_discrepancy_engine.py`:
    Discrete distribution models for NFL player props. Passes 59/59 tests (`pytest intelligence/props/`).
  - `intelligence/physics/`:
    Physics-informed kinematic distributions. Passes 19/19 tests (`pytest intelligence/physics/`).

---

### 1.5 Missing Files & Broken Import Analysis

When attempting to run `python -m pytest frontier/sports/test_engine_gate.py`:
```
ModuleNotFoundError: No module named 'frontier.sports.shootout_velocity_engine'
```
Investigation of Git history reveals:
- Git commit `b711f4c81598090f5b94e04e689c0ecdef60ddc5` (`feat(frontier): mirror frontier/sports engines...`) exists on branches `opencode/grok-espn-odds-first-20261008` and `docs/surf-21-round`.
- In commit `b711f4c8`, Git tree `c351aa8081e5a33297351a20c5654e531be1a676` contains **50 Python engine files** in `frontier/sports/`, including:
  `bayesian_robust_kelly_engine.py`, `shootout_velocity_engine.py`, `nfl_ep_wp_engine.py`, `matrix_repair.py`, `vine_copula_parlay_engine.py`, `stadium_microclimate_engine.py`, `player_props_intelligence_engine.py`, `adaptive_conformal_engine.py`, `test_bayesian_robust_kelly_engine.py`, `test_vine_copula_parlay_engine.py`, `test_matrix_repair.py`.
- **The current working branch `fix/galaxy-odds-first-2026-10-08` lacks these 50 files**. They exist only as compiled `.pyc` artifacts in `frontier/sports/__pycache__/`.
- As a result, `frontier/sports/engine_gate.py`, `frontier/sports/signal_registry.py`, `frontier/sports/test_engine_gate.py`, `frontier/sports/test_mathematical_engines.py`, and `frontier/sports/test_signal_registry_parity.py` fail immediately upon collection with `ModuleNotFoundError`.

---

## 2. Logic Chain

1. **Premise 1 (Roster Integrity)**:
   Per AGENTS.md Doctrine 6 / Law 9, every emitted pick, prop, or parlay must fail-closed if the player is not verified as active on the claimed team.
   `intelligence/roster/live_roster_gate.py` satisfies this by querying ESPN primary and Sleeper cross-check, checking 8 blocking injury/roster states, canonicalizing teams, enforcing generational suffixes, and failing closed if feeds fail or results are empty. (Observed in Section 1.1; 11/11 tests pass).

2. **Premise 2 (Gate Stack & PASS Filtering)**:
   Per AGENTS.md 2026-09-13 and R1 requirements: "If `independentEdge.decision == "PASS"`, never publish regardless of path."
   In Section 1.2, we observed:
   - `generate-signal-slate.ts:691` enforces `passVeto` on CREATE, but lines 875-877 do not update `isPublished: false` on UPDATE if `canExposePublicPicks` is true.
   - `packages/prediction-engine/src/scoring.ts:815, 1456` checks `pricesWorseThanMarket(independentEdgeRaw)` (`expectedClv < 0`), but never checks `independentEdge.decision === "PASS"`.
   - `apps/web/lib/picks/adverse-edge-suppression.ts:83` also checks only `pricesWorseThanMarket`.
   Therefore, any pick where independent estimators contradict bookmakers (`agreement = "CONTRADICTS"`) or where edge is within noise (`expectedClv == 0.0`) results in `decision = "PASS"`, but evades suppression across book-path minting, slate updating, and web display.

3. **Premise 3 (Reasoning Trace Rigor)**:
   Requirement R1 specifies:
   - Trace depth must be L5 for any card/pick.
   - L4 adversary breaking conditions must evaluate to False.
   - 5-track checklist (`qb_behavior`, `coaching_scheme`, `offensive_line`, `trust_signals`, `scheme_matchup`) must have zero UNCHECKED tracks.
   - Hierarchy order strictly enforced: OL -> Coaching -> QB.
   In Section 1.3, we observed that `intelligence/reasoning/` already implements all four criteria with strict assertions and exceptions (`Exposure.requires_l5()`, `ChecklistResult.valid`, `validate_checklist`, `HIERARCHY_ORDER`, `check_hierarchy`, and `_adv.killed_legs`), backed by 73/73 passing tests.
   However, `intelligence/reasoning/` is completely unwired from the live pick publication pipeline (`engine_gate.py` and `process-sport.ts`).

4. **Premise 4 (Mathematical Engines & Missing Frontier Files)**:
   The mathematical foundations (Wilson LCB, Bayesian Robust Kelly, Copula tail modeling, Higham PSD repair, Poisson/Skellam/Dixon-Coles) are implemented and verified in TypeScript (`packages/prediction-engine`) and Python (`intelligence/sgp`, `intelligence/staking`, `intelligence/props`).
   However, `frontier/sports/engine_gate.py` imports them from `frontier.sports.*` modules that were committed in commit `b711f4c8` on `opencode/grok-espn-odds-first-20261008`, but are missing from the current branch `fix/galaxy-odds-first-2026-10-08`.

---

## 3. Caveats

1. **Branch Discrepancy**: This survey was conducted on branch `fix/galaxy-odds-first-2026-10-08`. The 50 missing frontier Python files exist in commit `b711f4c81598090f5b94e04e689c0ecdef60ddc5` on branch `opencode/grok-espn-odds-first-20261008`. Merging or cherry-picking that commit will restore those modules.
2. **Read-Only Scope**: In adherence to explorer archetype and Teamwork protocol, zero modifications were made to source files or tests outside `.agents/teamwork/explorer_survey_gate_reasoning/`.
3. **Live Network Feeds**: Live roster tests in `intelligence/roster/test_live_roster_gate.py` were run offline using mocks as designed. Running `audit_tonight.py` with live network requires open internet access to `site.api.espn.com` and `api.sleeper.app`.
4. **Prisma DB Runtime**: Live pick updates against PostgreSQL/Neon depend on database connectivity; code inspections were verified statically and through unit tests.

---

## 4. Conclusion

Requirement R1 has robust, mathematically grounded components already developed across the repository, but suffers from **three critical integration gaps** that must be resolved prior to deployment:

1. **Branch Gap (Missing 50 Frontier Python Files)**:
   `frontier/sports/engine_gate.py`, `test_engine_gate.py`, and `test_mathematical_engines.py` fail immediately with `ModuleNotFoundError` because 50 Python modules in `frontier/sports/` (commit `b711f4c8` on `opencode/grok-espn-odds-first-20261008`) are not merged into the active branch.
2. **The `decision == "PASS"` Enforcement Hole**:
   In `packages/prediction-engine/src/scoring.ts` (lines 815 and 1456), `pricesWorseThanMarket(independentEdgeRaw)` only filters `expectedClv < 0`, allowing `decision === "PASS"` picks to be published. Furthermore, `generate-signal-slate.ts` line 875 does not revoke `isPublished` on update, and `adverse-edge-suppression.ts` line 83 does not suppress `decision === "PASS"`.
3. **Reasoning Engine Unwired from Emission**:
   The L1–L5 reasoning trace engine in `intelligence/reasoning/` is fully functional and passes all 73 tests with strict hierarchy (OL -> Coaching -> QB) and zero UNCHECKED tracks, but it is not called during candidate emission in `engine_gate.py` or `process-sport.ts`. Every published pick must carry a verified L5 trace ID.

---

## 5. Verification Method

To independently verify these findings, execute the following commands in `C:\Users\Garrett\Sports`:

1. **Verify Live Roster Gate Passing (11/11)**:
   ```powershell
   python -m pytest intelligence/roster/test_live_roster_gate.py
   ```
   *Expected output*: `11 passed in 0.03s`.

2. **Verify Reasoning Engine Passing (73/73)**:
   ```powershell
   python -m pytest intelligence/tests/test_reasoning_engine.py intelligence/tests/test_reasoning_units.py intelligence/tests/e2e/test_reasoning_trace_e2e.py
   ```
   *Expected output*: `73 passed in 0.50s`.

3. **Verify Intelligence Math Suites (Props 59, SGP 32, Staking 24, Physics 19)**:
   ```powershell
   python -m pytest intelligence/props/ intelligence/sgp/ intelligence/staking/ intelligence/physics/
   ```
   *Expected output*: `134 passed`.

4. **Verify Missing Frontier Engine Files & ImportError**:
   ```powershell
   python -m pytest frontier/sports/test_engine_gate.py
   ```
   *Expected output*: `ModuleNotFoundError: No module named 'frontier.sports.shootout_velocity_engine'`.

5. **Verify Commit `b711f4c8` Presence in Git History**:
   ```powershell
   git ls-tree c351aa8081e5a33297351a20c5654e531be1a676
   ```
   *Expected output*: 50 files listed, including `shootout_velocity_engine.py`, `bayesian_robust_kelly_engine.py`, `vine_copula_parlay_engine.py`, `matrix_repair.py`.

6. **Verify `independentEdge.decision === "PASS"` Hole in `scoring.ts`**:
   Inspect `packages/prediction-engine/src/scoring.ts` lines 814-815 and 1455-1456:
   ```typescript
   if (pricesWorseThanMarket(independentEdgeRaw)) return null;
   ```
   And `packages/types/src/index.ts` lines 145-149:
   ```typescript
   export function pricesWorseThanMarket(edge: IndependentEdgeSummary | null): boolean {
     if (!edge) return false;
     if (!Number.isFinite(edge.expectedClv)) return false;
     return edge.expectedClv < 0;
   }
   ```
   *Confirm*: Neither checks `edge.decision === "PASS"`.
