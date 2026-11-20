# Stream 15W: Causal Rest, Dynamic HFA Decay, Cold-Weather & Market Efficiency Audit (2026-11-20)

## Scope & Cleared CC-BY-4.0 Data Source
- **Schedules & Closing Lines:** `data/nflverse/schedules_games_through_2026_w10.parquet` (`REG` games across `2012–2026`, evaluated causally strictly out-of-sample on `2021–2026` (`n = 1,509` games) trained on exponentially decayed (`0.78^age`) prior 6-season windows with Ridge penalty).

## Walk-Forward OOS Evaluation (`eval_seasons = 2021..2026`, `n = 1,509` Games)

| Model / Benchmark | Margin MSE | Home Win Brier | ATS Residual MSE vs `spread_line` | Verdict |
|---|---:|---:|---:|---|
| Zero-HFA / Coin-Flip Baseline | `203.0417` | `0.250000` | `158.2820` | Baseline |
| Naive Legacy `2.5pt` HFA | `200.1847` | `0.250889` | — | Overstates modern HFA |
| Stream 15W Causal Ridge (`~1.62pt` HFA + Rest + Div + Cold) | **`199.4822`** | **`0.248757`** | `158.6382` | **Structural HFA Promoted (`+0.15` sched resilience) / ATS Override NULL (`0.0`)** |

## Structural Lessons & Two-Layer Alignment
- NFL Home-Field Advantage structurally declined from `2.0879` pts (`2012–2019`, `56.59%` home win rate) to `1.7443` pts (`2020–2025`, `53.25%` home win rate), making naive legacy `2.5–3.0pt` rules worse than `0.50` coin flips on Brier (`0.250889 > 0.250000`).
- **Two-Layer Integrity:** Because closing lines (`ats_mse_zero_override = 158.2820 < 158.6382`) already price routine HFA, rest differential, and outdoor cold temperature cleanly, `stream_15w_*_ats_null_override` stays strictly at **`0.0`** weight (`beats_closing_spread = False`).
