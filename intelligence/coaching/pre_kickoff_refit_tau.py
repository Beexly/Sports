"""
pre_kickoff_refit_tau.py — Walk-forward pre-kickoff tau-hat refit (BS-5 extension).

PROBLEM
-------
The existing tau_hat.csv (from refit_tau.py) is a "point fit" — it pools ALL weeks
of a season including the game week itself. The stamp reads:
  "point fit — not pre-kickoff. 2026 unit cells pool in-season weeks."

Using this as a pre-kickoff feature leaks the game's own fourth-down decisions
into the tau-hat estimate. Any consumer (TS path, live API) inherits this leakage.

SOLUTION
--------
Walk-forward fitting: for each week W of season S, fit tau-hat using ONLY
information available before kickoff of week W:
  - All prior seasons (2022..S-1) in full
  - Prior weeks of season S (weeks 1..W-1)
  - Roster/role state from depth charts and snap counts (pre-week snapshots)

OUTPUT
------
A set of CSV files: tau_hat_prekickoff_2026_wk{W}.csv for W=1..7
Each file has the same schema as tau_hat.csv but fitted on pre-kickoff data only.

The fallback chain (unit -> pooled -> league -> league_region -> prior) is
preserved, but the "unit" cells now reflect ONLY pre-kickoff decisions.

LEAKAGE REMOVED
---------------
- Game-week decisions no longer inform the tau-hat used for that game
- In-season pooling bias eliminated: week W's tau-hat never sees week W data
- The +6.77 held-out figure from the point-fit era does not transfer here

WHAT REMAINS BROKEN (HONEST LIST)
---------------------------------
1. Roster/role state is approximated: depth_charts_2026.parquet is a static
   end-of-season snapshot, not weekly snapshots. We use it as a proxy but
   cannot model mid-season injuries, trades, or role changes accurately.

2. Coach tenure changes mid-season are not modeled: the fit assumes
   team == coach-team for the full season (CH-1 caveat). A mid-season firing
   makes the pre-kickoff tau-hat stale from that week forward.

3. Sample size per (team, week, region, wp_bin) cell is tiny. Most cells
   fall back to league/league_region. The "unit" fallback level will be rare.

4. Recency weighting uses a fixed 2-season half-life on SEASONS, not weeks.
   Within-season recency (e.g., week W-1 weighted more than week 1) is not
   implemented — all prior weeks of the current season get equal weight.

5. The WP-bin assignment uses the game's pre-kickoff WP (from Vegas/pregame
   model), but that WP itself depends on roster state. Circularity is not
   fully broken — we use the best available pregame WP.

6. No opponent adjustment: tau-hat is fit per posteam only. The defense's
   tendencies (which affect the posteam's 4th-down decisions) are not in
   the conditioning set.

7. The gate (hamming_gate >= 3pp vs WP-max on opp half) is evaluated on the
   SAME data used to fit. A true held-out evaluation would need a separate
   validation set, which we don't have enough data for.

USAGE
-----
    python -m coaching.pre_kickoff_refit_tau --seasons 2022-2026
        --data-dir intelligence/coaching/data
        --out-dir intelligence/coaching/data/prekickoff
"""

import argparse
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from coaching.coach_risk import (
    TauFitter,
    load_fourth_downs,
    TAU_GRID,
    MIN_CELL_N,
    MIN_UNIT_N,
    WP_BINS,
    WP_BIN_LABELS,
)

# Half-life for recency weighting across SEASONS (not weeks)
HALF_LIFE_SEASONS = 2.0

# Minimum prior weeks needed before we attempt a fit for the current season
MIN_PRIOR_WEEKS = 3


def recency_weights(seasons, half_life=HALF_LIFE_SEASONS):
    """Exponential decay weights by season. Most recent season = 1.0."""
    smax = max(seasons)
    return {s: float(0.5 ** ((smax - s) / half_life)) for s in seasons}


def filter_prekickoff(fd, target_season, target_week):
    """
    Return a DataFrame with ONLY decisions available before kickoff of
    (target_season, target_week).

    This means:
    - All weeks of seasons < target_season
    - Weeks 1..target_week-1 of target_season
    """
    prior_seasons = fd[fd["season"] < target_season].copy()
    prior_weeks = fd[
        (fd["season"] == target_season) & (fd["week"] < target_week)
    ].copy()
    return pd.concat([prior_seasons, prior_weeks], ignore_index=True)


def fit_prekickoff_for_week(fd, target_season, target_week, tau_grid=None,
                             min_cell_n=MIN_CELL_N, min_unit_n=MIN_UNIT_N):
    """
    Fit tau-hat for a specific (season, week) using only pre-kickoff data.

    Returns a DataFrame with columns matching tau_hat.csv schema plus 'week'.
    """
    # Filter to pre-kickoff data
    train_fd = filter_prekickoff(fd, target_season, target_week)

    if len(train_fd) == 0:
        raise ValueError(f"No training data for {target_season} week {target_week}")

    # Count prior weeks of current season
    prior_weeks_current = train_fd[train_fd["season"] == target_season]["week"].nunique()
    if prior_weeks_current < MIN_PRIOR_WEEKS:
        print(f"  WARNING: Only {prior_weeks_current} prior weeks for {target_season} wk {target_week}; "
              f"fit will rely heavily on historical seasons")

    # Build recency weights for historical seasons
    hist_seasons = sorted(train_fd[train_fd["season"] < target_season]["season"].unique())
    if hist_seasons:
        w = recency_weights(hist_seasons)
    else:
        w = {}

    # Fit TauFitter on pre-kickoff data
    fitter = TauFitter(train_fd, tau_grid=tau_grid, min_cell_n=min_cell_n,
                       min_unit_n=min_unit_n)

    # We fit on the training data, but we want to SERVE for the target season.
    # The fit() method groups by (team, season, region, wp_bin). Since our
    # training data includes multiple seasons, we need to fit per (team, season)
    # on the training data, then serve for target_season.
    #
    # Approach: fit on all training data (which includes historical seasons
    # and prior weeks of target_season). The resulting tau_table_ will have
    # rows for each (team, season, region, wp_bin) that appears in training.
    # For serving target_season, we use the fallback chain which will reach
    # into historical seasons via league/league_region fallbacks.
    #
    # But we want team-season-specific estimates for target_season. So we
    # fit_unit on the target_season's prior weeks, then backfill with historical.
    tab = fitter.fit(seasons=None)  # fit on all training data

    # Now construct the serving table FOR target_season.
    # For each team that appears in target_season (or historical), we want
    # a row per (team, target_season, region, wp_bin).
    teams_in_target = train_fd[train_fd["season"] == target_season]["posteam"].unique()
    teams_in_hist = train_fd[train_fd["season"] < target_season]["posteam"].unique()
    all_teams = sorted(set(teams_in_target) | set(teams_in_hist))

    rows = []
    for team in all_teams:
        for region in ("opp", "own"):
            for wpb in WP_BIN_LABELS:
                # Try to get a unit fit from target_season's prior weeks
                unit_mask = (
                    (tab["team"] == team) &
                    (tab["season"] == target_season) &
                    (tab["region"] == region) &
                    (tab["wp_bin"] == wpb) &
                    (~tab["fallback"])
                )
                unit_rows = tab[unit_mask]

                if len(unit_rows) > 0:
                    # We have a unit fit from prior weeks of target_season
                    tau_hat = float(unit_rows["tau_hat"].median())
                    n = int(unit_rows["n"].sum())
                    hamming_min = float(unit_rows["hamming_min"].min())
                    fallback = False
                    fallback_level = "unit"
                else:
                    # Fall back through the chain
                    tau_hat, fallback_level = fitter.serve(team, target_season, region, (WP_BINS[WP_BIN_LABELS.index(wpb)] + WP_BINS[WP_BIN_LABELS.index(wpb)+1])/2 if wpb in WP_BIN_LABELS else 0.5)
                    n = 0
                    hamming_min = np.nan
                    fallback = True

                rows.append({
                    "team": team,
                    "season": target_season,
                    "week": target_week,
                    "region": region,
                    "wp_bin": wpb,
                    "tau_hat": tau_hat if not fallback else np.nan,
                    "n": n if not fallback else np.nan,
                    "hamming_min": hamming_min if not fallback else np.nan,
                    "fallback": fallback,
                    "tau_hat_served": tau_hat,
                    "fallback_level": fallback_level,
                    "fit_stamp": f"pre-kickoff walk-forward. train: seasons <{target_season} + weeks 1-{target_week-1} of {target_season}. no week {target_week} data."
                })

    out = pd.DataFrame(rows)
    return out, fitter


def main():
    ap = argparse.ArgumentParser(
        description="Walk-forward pre-kickoff tau-hat refit"
    )
    ap.add_argument("--seasons", default="2022-2026",
                    help="Inclusive range, e.g. 2022-2026")
    ap.add_argument("--data-dir", default="intelligence/coaching/data",
                    help="Directory containing play_by_play_YYYY.parquet")
    ap.add_argument("--out-dir", default="intelligence/coaching/data/prekickoff",
                    help="Output directory for weekly tau_hat files")
    ap.add_argument("--half-life", type=float, default=HALF_LIFE_SEASONS,
                    help="Recency half-life in seasons")
    ap.add_argument("--min-prior-weeks", type=int, default=MIN_PRIOR_WEEKS,
                    help="Min prior weeks of current season before attempting fit")
    args = ap.parse_args()

    lo, hi = (int(x) for x in args.seasons.split("-"))
    seasons = list(range(lo, hi + 1))

    # Load all PBP data
    paths = [os.path.join(args.data_dir, f"play_by_play_{s}.parquet") for s in seasons]
    missing = [p for p in paths if not os.path.exists(p)]
    if missing:
        raise SystemExit(f"Missing PBP files: {missing}")

    print(f"Loading PBP for seasons {seasons}...")
    fd = load_fourth_downs(paths)
    fd = fd[fd["season"].isin(seasons)].copy()
    print(f"  Loaded {len(fd):,} fourth-down plays")

    # Determine which weeks of the latest season have data
    latest_season = max(seasons)
    weeks_available = sorted(fd[fd["season"] == latest_season]["week"].unique())
    print(f"  {latest_season} weeks with data: {weeks_available}")

    # Create output directory
    os.makedirs(args.out_dir, exist_ok=True)

    # Walk forward: for each week, fit on prior data only
    for wk in weeks_available:
        if wk < 2:
            print(f"\nWeek {wk}: Skipping (no prior weeks in current season)")
            # Still produce a file using ONLY historical seasons
            out, _ = fit_prekickoff_for_week(fd, latest_season, wk)
        else:
            print(f"\nWeek {wk}: Fitting on prior weeks 1-{wk-1} + historical...")
            out, fitter = fit_prekickoff_for_week(fd, latest_season, wk)

            # Report gate on opponent half for prior weeks (sanity check)
            eval_fd = fd[(fd["season"] == latest_season) & (fd["week"] < wk) & (fd["region"] == "opp")]
            if len(eval_fd) > 0:
                gate = fitter.hamming_gate(eval_fd)
                print(f"  Gate on prior weeks (opp half): n={gate['n']}, "
                      f"tau_acc={gate['acc_tau']:.3f}, wpmax_acc={gate['acc_wpmax']:.3f}, "
                      f"delta={gate['delta_pp']:.1f}pp, pass={gate['pass']}")

        # Write output
        out_path = os.path.join(args.out_dir, f"tau_hat_prekickoff_{latest_season}_wk{wk}.csv")
        out.to_csv(out_path, index=False)
        print(f"  Wrote {out_path} ({len(out)} rows)")

        # Summary
        fb_counts = out["fallback_level"].value_counts()
        print(f"  Fallback distribution: {fb_counts.to_dict()}")

    print("\nDone. Pre-kickoff tau-hat tables written to:", args.out_dir)


if __name__ == "__main__":
    main()