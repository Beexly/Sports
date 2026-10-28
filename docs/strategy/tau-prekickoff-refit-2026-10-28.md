# Pre-Kickoff Tau-Hat Refit — 2026-10-28

## Summary

Built a walk-forward pre-kickoff refit that produces `tau_hat_prekickoff_2026_wk{W}.csv` for weeks 1–7. Each file is fitted **only on data available before kickoff** of that week:

- **Week W** trains on: all of 2022–2025 + weeks 1..W-1 of 2026
- **Week 1** trains on: only 2022–2025 (no 2026 data exists pre-kickoff)

Output directory: `intelligence/coaching/data/prekickoff/`

---

## Method

### Walk-Forward Fitting Loop

For each week W of the target season (2026):

1. **Filter training data** to decisions strictly before kickoff of week W:
   ```python
   train_fd = fd[
       (fd["season"] < 2026) |                    # all prior seasons
       ((fd["season"] == 2026) & (fd["week"] < W))  # prior weeks of 2026
   ]
   ```

2. **Fit `TauFitter`** on this pre-kickoff data (same inverse-optimization
   over empirical next-state value distributions as the point fit).

3. **Serve for target season** using the existing fallback chain:
   `unit (prior weeks of 2026) → pooled → league → league_region → prior (0.5)`
   
   The "unit" level now reflects **only prior weeks of the current season**,
   never the current week.

4. **Write weekly table** with schema matching `tau_hat.csv` plus a `week`
   column and an honest `fit_stamp`.

### Recency Weighting

Historical seasons (2022–2025) are weighted with exponential decay:
- Half-life: 2 seasons (fixed, same as `refit_tau.py`)
- 2025 weight = 1.0, 2024 = 0.71, 2023 = 0.50, 2022 = 0.35

**Within-season recency is NOT modeled** — weeks 1..W-1 of 2026 get equal
weight. This is a known limitation (see "What Remains Broken").

### Gate Evaluation (Sanity Check)

For each week W ≥ 2, the gate runs on the **training data itself** (prior
weeks, opponent half only):

| Week | Prior 4th Downs (opp) | Tau Acc | WP-Max Acc | Delta | Pass (≥3pp) |
|------|----------------------|---------|------------|-------|-------------|
| 2    | 94                   | 0.436   | 0.362      | +7.4pp | ✅ |
| 3    | 202                  | 0.441   | 0.267      | +17.3pp | ✅ |
| 4    | 311                  | 0.444   | 0.283      | +16.1pp | ✅ |
| 5    | 423                  | 0.418   | 0.286      | +13.2pp | ✅ |
| 6    | 536                  | 0.489   | 0.282      | +20.7pp | ✅ |
| 7    | 647                  | 0.417   | 0.323      | +9.4pp | ✅ |

The tau-hat rule consistently beats WP-max on opponent-half decisions
even when evaluated on the training data. **This is not a held-out test** —
see "What Remains Broken" #7.

---

## Leakage Removed

| Leakage Source | Point Fit (Old) | Pre-Kickoff (New) |
|----------------|-----------------|-------------------|
| Game-week 4th-down decisions | Included in fit | **Excluded** — week W never sees week W data |
| In-season pooling | All weeks 1–7 pooled | **Walk-forward** — week W sees only 1..W-1 |
| Future weeks | N/A (single table) | **Impossible** — each week has its own table |
| Stamp honesty | "point fit — not pre-kickoff" | "pre-kickoff walk-forward. train: seasons <2026 + weeks 1-(W-1) of 2026. no week W data." |

**The +6.77 held-out figure from the point-fit era does not transfer.**
That figure measured a point fit on held-out games *within the same pooled
season*. The pre-kickoff tables are a fundamentally different estimator:
they trade sample size (no current-week data) for causal validity (no
leakage). Any downstream consumer must re-validate.

---

## Output Files

```
intelligence/coaching/data/prekickoff/
├── tau_hat_prekickoff_2026_wk1.csv   # 320 rows, train: 2022–2025 only
├── tau_hat_prekickoff_2026_wk2.csv   # 320 rows, train: 2022–2025 + wk 1
├── tau_hat_prekickoff_2026_wk3.csv   # 320 rows, train: 2022–2025 + wk 1–2
├── tau_hat_prekickoff_2026_wk4.csv   # 320 rows, train: 2022–2025 + wk 1–3
├── tau_hat_prekickoff_2026_wk5.csv   # 320 rows, train: 2022–2025 + wk 1–4
├── tau_hat_prekickoff_2026_wk6.csv   # 320 rows, train: 2022–2025 + wk 1–5
└── tau_hat_prekickoff_2026_wk7.csv   # 320 rows, train: 2022–2025 + wk 1–6
```

**Schema** (12 columns):
- `team`, `season` (always 2026), `week`, `region`, `wp_bin`
- `tau_hat`, `n`, `hamming_min`, `fallback` — the unit fit (NaN if fallback)
- `tau_hat_served` — the served value after fallback chain
- `fallback_level` — one of `unit`, `pooled`, `league`, `league_region`, `prior`
- `fit_stamp` — honest provenance string

**Current fallback distribution (all weeks identical):**
- `league`: 224 rows (70%)
- `league_region`: 96 rows (30%)
- `unit` / `pooled`: 0 rows

No team-season-region-WP cell in 2026 prior weeks reaches `MIN_UNIT_N=25`
decisions, so **all served values are league/league_region fallbacks**.
The fitter's gate still passes because the league-level tau-hat (median
across historical units) beats WP-max on opponent half.

---

## What Remains Broken (Honest List)

1. **Roster/role state is static, not weekly**  
   `depth_charts_2026.parquet` and `snap_counts_2026.parquet` are
   end-of-season snapshots. We cannot model mid-season injuries, trades,
   or role changes. The tau-hat assumes the team's 4th-down tendency is
   stable across the season.

2. **Mid-season coach firings not modeled**  
   The fit assumes `team == coach-team` for the full season (CH-1 caveat).
   A firing makes the pre-kickoff tau-hat stale from that week forward.

3. **Sample size per cell is tiny → no unit fits**  
   `MIN_UNIT_N=25` decisions per (team, season, region, wp_bin) cell.
   Even by week 7, prior weeks yield ~650 opponent-half 4th downs total
   across 32 teams → ~20 per team, spread over 5 WP bins → ~4 per cell.
   **All cells fall back to league/league_region.** Team-specific signal
   is not recoverable at this granularity with 7 weeks of data.

4. **No within-season recency weighting**  
   Weeks 1..W-1 of 2026 are weighted equally. Week W-1 (most relevant)
   gets the same weight as week 1. Fix would require week-level half-life
   and enough data to support it — neither exists yet.

5. **Pregame WP circularity**  
   The WP bin uses the pregame Vegas/pregame-model WP, which itself
   depends on roster state. The tau-hat fit does not condition on the
   same roster features that the WP model uses. Circularity is reduced
   but not eliminated.

6. **No opponent adjustment**  
   Tau-hat is fit per *posteam* only. The defense's tendencies (which
   affect the posteam's 4th-down decisions) are not in the conditioning
   set. A team facing elite pass rushes will show different 4th-down
   behavior that the fit attributes to the offense's tau.

7. **Gate evaluated on training data, not held-out**  
   The ≥3pp gate runs on the same prior weeks used to fit. A true
   held-out evaluation would need a separate validation set (e.g., week
   W-1 held out, fit on 1..W-2), but we don't have enough data for that.

8. **Week 1 has zero current-season data**  
   Week 1's table is identical to a 2022–2025 historical fit. It contains
   no 2026 information at all. This is correct (no leakage) but means
   week 1 predictions are purely historical.

---

## Integration Path

The existing `tau_wire.py` and `api.py` consume `tau_hat.csv` (the point-fit
table). To use the pre-kickoff tables:

1. **Do not overwrite `tau_hat.csv`** — keep it as the point-fit artifact
   for diagnostic/historical comparison.

2. **Wire the weekly selector** in `tau_wire.py` or a new provider:
   ```python
   def get_prekickoff_tau_hat(team, season, week, region, wp):
       path = f"prekickoff/tau_hat_prekickoff_{season}_wk{week}.csv"
       # load, serve, return tau_hat + fallback_level + stamp
   ```

3. **Update the stamp** in `tau_wire.py` only after the pre-kickoff path
   is validated end-to-end and the TS consumer is wired.

4. **Retire the point-fit stamp** when the live path consumes the
   walk-forward tables. The old stamp ("point fit — not pre-kickoff...") is
   the correct description of `tau_hat.csv`; the new stamp belongs on the
   weekly files.

---

## Refit Script

`intelligence/coaching/pre_kickoff_refit_tau.py`

```bash
python -m intelligence.coaching.pre_kickoff_refit_tau \
    --seasons 2022-2026 \
    --data-dir intelligence/coaching/data \
    --out-dir intelligence/coaching/data/prekickoff
```

Run time: ~22 minutes on this machine (single-threaded, 5 seasons × 7 weeks).