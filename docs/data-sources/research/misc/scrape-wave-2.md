# Scrape wave 2 — what to pull next

Run these through the same Firecrawl prompt as wave 1
(`docs/research/competitor-scrape-2026-09-12.md` has the prompt and the
wave-1 results). Prioritized by what the factor engine and projections
table are actually waiting on.

## Tier 1 — the factor engine is blocked on these

1. **https://baseballsavant.mlb.com/statcast_leaderboard** (batters, 2025)
   Pull the full table: every column, every player row. We need
   barrel%, hard-hit%, EV50, LA SwSp%, exit velo avg, distance avg
   per player. This is the `underlying` factor input for every MLB pick.

2. **https://baseballsavant.mlb.com/leaderboard/statcast** (pitchers, 2025)
   Same, plus spin rate, whiff%, chase%. This is the pitcher-side
   `underlying` input.

3. **https://www.fangraphs.com/projections.aspx**
   ATC, THE BAT, Steamer, ZiPS — the model families and their weights.
   We need the projection numbers per player to compare against ours.

4. **https://propfinder.app/nfl** (logged in)
   The sign-in gate blocked wave 1. We need the cheatsheets: TD,
   rushing, redzone, line, coverage matchup data. This is the
   `matchupSplit` factor input.

5. **https://prizepicks.com/** or **https://underdogfantasy.com/**
   Public pick percentages per prop. The over/under split the founder
   wants for the `consensus` factor (5,000-over / 3,700-under).

## Tier 2 — makes the optimizer and props board real

6. **https://www.linestarapp.com/Props** (logged in)
   The actual Recent Form numbers (L5, L10, Season, Last LG) and
   Matchup+ Imp values. Wave 1 got the column names; we need the data.

7. **https://www.linestarapp.com/Ownership** (logged in)
   Proj Own % vs Actual Own % per player. The `pOwn%` column and the
   `Own Diff` leverage signal.

8. **https://www.sabersim.com/dfs/draftkings** ($7/7-day trial)
   The lineup rules builder and contest sim controls. How they
   structure exposure, team stacks, game stacks.

9. **https://www.oddsshopper.com/**
   Portfolio EV method. How they do custom devigging.

10. **https://rbsdm.com/stats/**
    EPA, Weighted EPA, garbage-time WP filter. The NFL efficiency
    backbone.

## Tier 3 — calibration and methodology

11. **https://scikit-learn.org/stable/modules/calibration.html**
    Already partially captured. Pull the full page: Platt, isotonic,
    temperature scaling, reliability diagram code.

12. **https://arxiv.org/abs/2210.16315** (grouping loss)
    Full paper. We need the partitioning algorithm to compute the
    grouping-loss diagnostic.

13. **https://github.com/aperezlebel/beyond_calibration**
    The reference implementation. `src/partitioning.py` — the
    `cluster_evaluate` function.

14. **https://baseballsavant.mlb.com/statcast_search**
    Pitch-level data. Spin rate, release point, movement per pitch.
    The deepest Statcast layer.

## Tier 4 — competitive intel

15. **https://www.rotogrinders.com/** (logged in)
    LineupHQ optimizer internals, SimLabs, THE BAT projections.

16. **https://www.fantasylabs.com/**
    Player Models, Trends, Contest Ownership.

17. **https://www.actionnetwork.com/**
    How they present edge, +EV, and public betting splits.

18. **https://www.bettingpros.com/**
    Consensus picks, expert picks, and how they aggregate.

## Do NOT scrape

- Sportsbook sites for display prices without a license
- Fantasy sites that prohibit scraping (check source-rights-registry.ts first)
- Anything that would put a real book's quotes into a paid SaaS without rights

## What each scrape unlocks

| Scrape | Unlocks |
|---|---|
| Statcast batters | MLB `underlying` factor (barrel%, hard-hit%, EV50) |
| Statcast pitchers | MLB pitcher `underlying` (spin, whiff, chase) |
| Fangraphs projections | Cross-model comparison vs our projections |
| PropFinder NFL | `matchupSplit` factor (zone vs man, box counts) |
| PrizePicks/Underdog | `consensus` factor (over/under split) |
| LineStar Props data | L5/L10 form + Matchup+ Imp in the projections table |
| LineStar Ownership | Real pOwn% and Own Diff leverage |
| SaberSim | Contest sim and stack rules structure |
| OddsShopper | Custom devigging method |
| RBSDM | NFL EPA backbone |
| grouping loss paper | The diagnostic that says whether RES=0 is "no signal" or "collapsed signal" |
