# Fantasy & DFS Source Plan

*Fact classes: `fantasy_market` + `dfs`. Unlocks Fantasy Absorption Half-Life, Manager DNA, Trade
MRI, Waiver Leverage, Scarcity Curvature, League Economy, DFS Leverage Lab, Contest Reflexivity.*

## Required facts

**Fantasy market:** platform_projection · analyst_rank · adp · bestball_adp · roster_pct ·
start_pct · add_drop_velocity · waiver_claim · faab_bid · trade_offer · league_settings.

**DFS:** dfs_salary · dfs_slate · position_eligibility · ownership_projection · actual_ownership ·
late_swap · field_duplication · contest_payout.

These are GSE's **strongest documented gap** — the platform reads markets well but is thin on
player/team statistics and fantasy-surface ingestion. The Fantasy Twin and DFS Lab run on clearly
labeled illustrative data until these arrive.

## Source ladder

1. **Sleeper** (FREE_CAUTION, ADD_ADAPTER) — the first fantasy platform adapter. Free, read-only,
   no token; stay under ~1000 calls/min. Gives league sync, roster %, add/drop velocity, transactions
   → Manager DNA and League Economy.
2. **Yahoo Fantasy** (FREE_CAUTION, ADD_ADAPTER) — first official user-auth league sync (OAuth).
   **Consented user data only** — the Manager DNA / League Economy modules refuse non-consented data.
3. **SportsDataIO / FantasyData** (PAID_REQUIRED, PAID_EVALUATION) — the first serious paid step:
   licensed DFS salary/slate, projections, ADP, player news. The Acquisition Governor ranks these
   **ahead of odds providers** for a DFS salary-lag or fantasy-projection-absorption target.
4. **FantasyPros / RotoWire** (PAID_EVALUATION) — consensus projections/ADP/ranks and news timing,
   if commercially licensed.
5. **ESPN Fantasy / Underdog ADP** (RIGHTS_REVIEW) — user-auth or rights-review only; no unofficial
   ingestion.

## The edge thesis

Betting markets help *detect* truth; fantasy markets reveal how *slowly* platforms, analysts,
salaries, ownership, and draft rooms absorb it. The most valuable fantasy facts are therefore the
**timestamped lagging surfaces** — DFS salary set before a role shock, ownership that overcorrects
on news, ranks that move late. Each is scored by the Data Leverage Field: a fact matters only if it
changes a waiver/lineup/trade/DFS decision per unit cost.

## Privacy

League-specific modules (Manager DNA, League Economy Simulator) operate **only** on explicitly
provided, consented league history. The mesh never scrapes private league data.
