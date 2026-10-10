# CFB PROP PRICING — DK's engine reconstructed + calibration vs empirical reality
**2026-10-10 · dk_cfb_prop_fits.json (266 player fits) · dk_vs_empirical_calibration.json**

## The reconstruction (DK nash leagueSubcategory API, league 87637 = College Football)

| subcategory | market | players fit | σ median | mean R² |
|---|---|---|---|---|
| 16569 | pass yards | 45 | **74.8** | (ladder fits, n≥14 rungs) |
| 16570 | rush yards | 142 | **33.0** | 0.974 |
| 16571 | rec yards | 79 | **32.5** | 0.964 |

Method: DK prices each player as a band ladder ("150+","160+",…) with American odds AND
`trueOdds` (their own implied decimal). Probit regression of invnorm(1/trueOdds) on the
threshold recovers **DK's implied (μ̂, σ̂) per player per market** — their entire pricing
posture, extracted from public prices. NFL reference: pass σ 70.9 — CFB runs ~74.8
(same engine, small college bump); rush 33.0 vs NFL 41.7 (college usage concentration);
rec 32.5 vs NFL 37.7.

## The nobody-has-it layer: DK vs empirical calibration

Cross-referenced against CFBD player-game distributions (3,907 player-games, 2024–26):

- **DK σ / empirical σ: median 0.94** — DK's CFB prop σ runs ~6% TIGHTER than the
  players' realized yardage distributions.
- **DK μ̂ vs empirical season mean: +37.8 ±29.6 (n=6 QB matches)** — DK's ladders center
  ABOVE season-to-date averages (projection premium: opponent adjustment, usage
  projection, or systematic over-round on overs — needs weekly cadence n to separate).
- Position-level Gaussian-vs-empirical divergences (from cfb_prop_sigmas.json):
  **RB rush 49.5 over: empirical 23.3% vs Gaussian 32.6% (−9.3 pts!)**,
  WR/TE rec 49.5: −6.6 pts, 99.5 tails: +3.0 pts both — the smooth-Gaussian ladder
  overprices the common unders and underprices the 100+ tails.

## Why this is the edge surface

1. CFB props are priced with the same smooth-Gaussian machinery as NFL props, but the
   empirical distributions are FATTER and more usage-concentrated.
2. The σ-ratio (0.94) says DK is confident; the fat empirical tails say the 99.5+
   overs and the 49.5 unders are structurally mispriced AT THE POSITION LEVEL.
3. Per-player μ̂ gaps vs CFBD season stats = a live projection-vs-reality tracker.
   Weekly harvest → calibration drift → the CLV test decides (doctrine rule 9).

## Next steps (pre-registered)

- Weekly harvest cadence (same three subcategory ids — 16569/16570/16571, league 87637)
  → per-player time series of DK μ̂/σ̂ drift.
- Match-rate fix: raise the empirical per-player cutoff in cfb_prop_sigmas to n≥4 and
  include 2026-only tables (2026 starters are the tradable universe).
- Convert divergences to EV: needs DK's displayed odds on BOTH sides (the ladder gives
  over-only here; the primary O/U markets carry the under side) — same harvest, different
  wagerType filter.
- Kill test: position-level divergence persistence out-of-sample (2026 weeks 7+ vs the
  2024-25 fitted divergences), through the walk-forward gate.

*Doctrine: diagnostic until gated. No production. The close (and now DK's own ladder
posture) is the prior — our job is the calibration gap, measured weekly.*
