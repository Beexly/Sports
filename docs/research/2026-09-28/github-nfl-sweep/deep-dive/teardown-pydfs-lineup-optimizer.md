# Teardown: DimaKudosh/pydfs-lineup-optimizer (v3.6.1, 449 stars, MIT)

Source: fresh shallow clone of `DimaKudosh/pydfs-lineup-optimizer` read at file level (`solvers/`, `lineup_optimizer.py`, `rules.py`, `stacks.py`, `exposure_strategy.py`, `fantasy_points_strategy.py`, `settings.py`, `sites/draftkings/classic/settings.py`, `statistics.py`, `utils.py`). Garrett's side read read-only at `~/workspace/vendor/Sports/apps/web/lib/fantasy/`. License: **MIT** (Copyright (c) 2015–2016 Kevin B. Knapp) — code reuse permitted with attribution, commercial use included.

## 1. Constraint model

Everything is a **mixed-integer linear program over binary player variables** — one binary variable per player (PuLP `LpBinary` / python-mip `BINARY`), fully data-driven from a settings class (`BaseSettings`: `budget`, `positions: List[LineupPosition]`, `max_from_one_team`, `min_teams`, `min_games`, `extra_rules`). DK NFL Classic: `budget=50000`, `min_games=2`, positions = QB, RB×2, WR×3, TE, FLEX(RB/WR/TE), DST (9 slots).

The rules engine (`rules.py`, ~28 rule classes, all subclass `OptimizerRule` with static-per-solve `apply()`, per-lineup `apply_for_iteration()`, `post_optimize()` bookkeeping) compiles to linear constraints:
- **Salary cap** (`LineupBudgetRule`): `Σ salaryᵢ·xᵢ ≤ 50000`. Optional **min salary** (`MinSalaryCapRule`): `Σ salaryᵢ·xᵢ ≥ min_cap` — GSE has no equivalent.
- **Flex slots** (`PositionsRule` + `get_positions_for_optimizer`): each distinct position tuple gets a `GTE` count = its own slot count **plus** the count of narrower slots whose eligibility intersects it. E.g. FLEX tuple `(RB,TE,WR)` gets `GTE 1 + (2 RB + 3 WR + 1 TE) = 7` over all FLEX-eligible players — together with the narrower constraints this guarantees a legal assignment exists without modeling the assignment itself. Multi-eligible players additionally generate combination-subset constraints (flattened powerset of position tuples) so multi-positional players can't be double-counted. Locked players with pinned positions are removed from both sides.
- **Final slot assignment is post-hoc, not in the MILP**: after solve, `_build_lineup` maps selected players to named slots with `link_players_with_positions` — a greedy pass for forced singletons, then brute-force **permutation search** to find a feasible assignment (raises if none). The MILP is a *relaxation*; feasibility is verified after the fact.
- **Team counts**: `MaxFromOneTeamRule` (`Σ teamᵢ ≤ cap`); `TotalTeamsRule`/`MinGamesRule` use **binary indicator variables** (`Σ players_team ≤ x_team·9`, `Σ players_team ≥ x_team`, then `Σ x_team ≥ min_teams`).
- **Ownership**: `ProjectedOwnershipRule` builds a single weighted constraint `Σ (ownᵢ − max)·xᵢ ≤ 0` (and mirrored min) — hard ownership caps as linear constraints, distinct from GSE's score-penalty approach.
- **Locks/excludes** (`LockedPlayersRule`): locked players forced `EQ n`; excluded players `EQ 0`. Late-swap reuses this machinery (`LateSwapRule` + `optimize_lineups`): unswappable players pinned `EQ 1`, remaining positions re-solved, game-started players excluded.
- **Site/sport extras**: e.g. `DraftKingsBaseballRosterRule` (≤5 hitters/team), `DraftKingsTiersRule` (exactly 1 per tier), `FanduelSingleGameMaxQBRule`, roster-spacing rules.

## 2. Optimization algorithm

- **Two MILP backends**, selected by `SOLVER_BACKEND` env var: **PuLP + bundled CBC** (`PULP_CBC_CMD(msg=False)`) is the default (`PuLP==2.4` pinned); **python-mip** (`mip==1.13.0`, also CBC underneath) is the alternative. No greedy/annealing/genetic — branch-and-bound via CBC in both cases. So both GSE and pydfs are branch-and-bound; the difference is off-the-shelf CBC (C++, with cuts) vs GSE's hand-rolled pure-TS B&B with per-position bounds.
- **Objective**: `maximize Σ fppgᵢ·xᵢ` — linear point-sum, same class GSE's `dfs-exact.ts` optimizes.
- **Multi-lineup = iterative re-solve, not k-best**: `optimize(n)` builds the base model once, then per iteration: `base_solver.copy()` (PuLP: `prob.copy()`; MIP: rebuild from stored var/constraint descriptors), `apply_for_iteration` adds exposure bans / unique-lineup exclusions / fresh objective coefficients, solve once, record. **n MILP solves for n lineups** — O(n) CBC invocations with Python overhead; no time limits, iteration caps, or gap tolerances exposed.
- **Objective-noise strategies** (the diversification dial):
  - `StandardFantasyPointsStrategy`: raw `fppg` (deterministic).
  - `RandomFantasyPointsStrategy(min_deviation=0.0, max_deviation=0.12)`: per-iteration `fppg·(1±U(0,0.12))`, random sign; per-player overrides; if `fppg_floor/fppg_ceil` set, draws `U(floor,ceil)` instead.
  - `ProgressiveFantasyPointsStrategy(scale=0.01)`: players unused in prior lineups get coefficient `fppg·(1+k·0.01)` compounding each iteration they're skipped; resets to base when used. Deterministic anti-duplication engine.

## 3. Correlation handling

Structural, hard-constraint stacking compiled into the MILP — **no covariance/factor model, no Monte Carlo**. Mechanism (`stacks.py` + `GenericStacksRule`):
- Each user stack (`TeamStack(size, for_teams, for_positions, spacing, max_exposure, max_exposure_per_team)`, `PositionsStack(positions, ...)`, `GameStack(size, max_exposure, min_from_team=1)`, raw `PlayersGroup`) is expanded per team into `PlayersGroup`s.
- For each group a **binary aux variable** `g` is created: `Σ players_in_group ≥ min_from_group·g` (and `≤ max_from_group` if set). Then **at least one group must fire**: `Σ g ≥ 1` per stack. So `TeamStack(size=3)` forces *every* lineup to contain a 3-man stack from *some* team — stacks are mandatory, not optional.
- **Bring-backs** via `depends_on`: aux var `t = Σ subgroup_players`, constrained `t ≥ depend_var·min_from_group` — *if* the depends-on player (e.g. opposing QB) is selected, *then* ≥k from the group must be selected (`strict_depend=True` also caps `t ≤ depend_var·max`). Clean MILP encoding of conditional correlation.
- `GameStack`: per game, nested groups = home ≥`min_from_team`, away ≥`min_from_team`, both combined ≥`size` — a forced game stack with bring-back.
- **Stack exposures**: groups carry `max_exposure`; the exposure strategy can force a saturated stack's aux contribution to zero on later iterations (its players `EQ 0` + its min relaxed to `min−1`).
- `RestrictPositionsForOpposingTeam` uses a big-M (`MULTIPLIER=1000`) trick to cap cross-team position pairings per game.

## 4. Exposure / diversification

Three cooperating layers, all enforced **inside the solver per iteration**:
1. **Per-player exposure** (`LockedPlayersRule.apply_for_iteration`): cap = `player.max_exposure` or global `optimize(n, max_exposure)`. `TotalExposureStrategy.is_reached_exposure`: ban (`EQ 0`) once `used/total_lineups ≥ max`. `AfterEachExposureStrategy` compares against `used/current_iteration`. Min-exposure (`MinExposureRule`): `need = round(min_exp·n)` with lookahead — computes forced inclusions from `remaining_lineups` so a min-exposure floor can't be silently abandoned mid-run.
2. **Per-team exposure** (`TeamsExposureRule`): same strategy pattern on team slot-counts.
3. **Uniqueness/spacing** (`UniqueLineupRule`): every prior lineup's player-set gets `Σ ≤ max_repeating_players` (default `total_players−1` — exact duplicates banned, near-duplicates allowed; `set_max_repeating_players` tightens).
4. **Ownership diversification**: `ProjectedOwnershipRule` hard-caps lineup-average ownership.

Contrast with GSE's `exposure-control.ts`: pydfs bakes policy into MILP constraints (provably enforced per solve); GSE computes external ban/lock sets with explicit infeasibility reporting.

## 5. Backtesting / validation — none

`tests/` is pure unit tests. The only post-run artifact is `Statistic.print_report()` — top teams/players exposure summary. **No historical backtest harness, no simulated field, no ROI/ITM measurement, no calibration check.** `example.py` generates lineups from a CSV and exports them; that's the whole loop.

## 6. Multi-sport generality

Very general. The constraint engine is 100% data-driven: a new sport/site = a `BaseSettings` subclass (budget, position list, team/game minimums, extra rules) + a CSV importer, registered in `SitesRegistry`. Shipped: **DraftKings classic × 13 sports** (NFL, NBA, WNBA, NHL, MLB, golf, soccer, CFL, CFB, MMA, NASCAR, tennis, CS:GO), plus DK captain/tiers/single-game, FanDuel classic + single-game, Yahoo, Fanball, FantasyDraft.

## Point-by-point vs GSE (`apps/web/lib/fantasy/`)

| Dimension | pydfs-lineup-optimizer | GSE | Ahead |
|---|---|---|---|
| Core solver | MILP via CBC (PuLP default, python-mip alt) | Custom pure-TS branch-and-bound, per-position admissible bounds, `NODE_CAP=5M` | Rough parity, different trade — CBC is industrial (cuts, presolve) but needs a native binary; GSE runs anywhere dependency-free |
| Multi-lineup | n sequential MILP re-solves with per-iteration bans + objective noise; per-solve optimal under evolving constraints | Exact `kBest` (provable top-K) → `diversePool` (kBest×factor + min-spacing filter) | GSE on provability/ranking; pydfs on integrated exposure enforcement |
| Stacking | Hard MILP constraints: mandatory stacks, conditional bring-backs, per-stack exposure caps | `dfs-correlation.ts`: position-aware Monte-Carlo factor model scoring lineups by top-quintile ceiling EV + ownership leverage + dup risk | GSE by a mile — covariance-aware EV scoring vs structural must-haves (complementary, not substitutes) |
| Exposure | Per-player min/max + per-team caps + per-stack caps as solver constraints; Total vs AfterEach strategies; min-exposure lookahead | `exposure-control.ts`: external policy governor (ban/lock sets, min-spacing, infeasibility reports, honesty rules) | pydfs on enforcement integration; GSE on honesty/feasibility reporting |
| Field/ROI sim | Nothing | `payout-sim.ts`: portfolio ranked vs simulated field, pay tables, ROI distribution + ITM | GSE, uncontested |
| Ownership | Hard linear cap (`ProjectedOwnershipRule`) | Score penalty (`ownWeight`) + dup-risk proxy | pydfs on hard enforcement; GSE softer but EV-integrated |
| Late swap | `optimize_lineups` + `LateSwapRule` | `lateSwap` + slot-pinning (`fixed` array) | Parity |
| Min salary floor | `MinSalaryCapRule` | Not present | pydfs |
| Diversification | Random ±12% noise, floor/ceil bands, progressive 1%-compounding unused-player boost, uniqueness constraint | Deterministic k-best + spacing filter; no objective noise | Different philosophies; pydfs's noise is the standard GPP-mass-lineup approach GSE lacks |
| Multi-sport | 13 sports × 6 sites, data-driven settings + importers | NFL-focused; NBA/showdown partial | pydfs |
| Validation | Unit tests only; exposure summary | `payout-sim` + optimality tests + edge/validation modules | GSE |

**Where pydfs is ahead:** (1) battle-tested multi-sport/site generality — data-driven settings + CSV importer architecture; (2) objective-noise diversification (random ±12%, floor/ceil bands, progressive boost) for 150-lineup GPP pools; (3) per-stack exposure caps and hard ownership caps as solver constraints; (4) conditional bring-back encoding (`depends_on`/`strict_depend`); (5) min-salary rule.
**Where GSE is ahead:** (1) `payout-sim.ts` ROI-vs-field — pydfs has zero simulation or backtesting; (2) correlation factor model with ceiling-EV scoring vs hard structural stacks; (3) provable exact k-best + dependency-free pure-TS solver; (4) exposure honesty/infeasibility reporting.

## Benchmark implications for the coding agent

The fair comparison is per-lineup solve quality + pool-level portfolio metrics (exposure distribution, stack rate, salary usage, ownership, uniqueness) on the same slate — pydfs's `optimize(n)` vs GSE's `diversePool`/`kBest` pipeline. Note pydfs's stacks are *mandatory* (every lineup contains a full stack) while GSE's correlation *scores* correlation — comparing raw projected points flatters point-sum; the meaningful contest is simulated ROI, which only GSE implements. Also note pydfs's final slot assignment is a post-hoc permutation search, not part of the MILP — a corner where feasibility can theoretically fail post-solve. No time-limit/gap parameters exist, so cap wall-clock externally when comparing speed. Multi-lineup generation is O(n) full MILP solves — expect it to be slow for 150-lineup pools relative to GSE's single k-best run; that's an architectural difference worth measuring, not a bug.
