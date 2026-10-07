# FiveThirtyEight ELO vs the closing line (2015–2017 overlap) — 2026-08

Data: data/fivethirtyeight/nfl_games.csv (16,810 games 1920–2017, game-level
elo_prob1) joined by date+teams to games_harness_rows.jsonl closing spread.

## Result

n = 1,320 matched regular-season non-neutral games where 538 had a played
result AND our harness has a closing spread.

- 538 ELO pick (>50% side) covered the close **48.33%** of the time —
  BELOW the 52.38% −110 breakeven and below coin-flip among decided games.
- Brier score of elo_prob1 against the home-cover outcome: **0.2928**
  (a fair-close baseline of p=0.5 scores 0.25; ELO is WORSE than naive
  half-half at predicting cover).

## Honest reading

FiveThirtyEight's famous NFL ELO was built to predict WINNERS, not covers.
Against the market's closing number it has no value — it would have lost
~4% per bet flat betting its picks at −110. This is consistent with
everything else we've found: public engines do not beat closes.

## Why it's still valuable

The dataset is a free game-level probability archive from a calibrated,
well-documented engine. Uses going forward:
1. Calibration reference for OUR model probs — verified: against WIN
   outcomes (their intended target) 538 ELO is excellently calibrated
   (Brier 0.2203, n=1,536; every decile observed ≈ predicted within ±3pp).
2. Elo trajectory as a FEATURE (not a price-beater): team-strength priors.
3. Methodology template (their forecast.py is open source).

Verdict: DEAD AS AN EDGE, ALIVE AS A REFERENCE/FEATURE SOURCE.
Calibration quality vs target choice matters: same engine, same games —
calibrated for wins, useless for covers.

## Feature-value check (orchestrator, same session)

Elo as a covariate rather than a price-beater:

| Design | n | Pearson r vs close residual |
|---|---|---|
| Prior-season final Elo diff → next-season cover margin | 434 | −0.015 |
| Same-season final Elo diff (updated through season t) → that season's cover margin | 420 | +0.279 |
| **Mid-season pre-game Elo diff (weekly replay, HFA included) → same-game cover margin** | 3,144 | **+0.042** |

The definitive test is the third row: a faithful weekly replay of their
forecast.py (K=20, HFA=65, 1/3 reversion) over 2002–2016 joined to our
closing lines. Mid-season Elo explains ~0.2% of cover-margin variance —
the close already contains everything Elo knows. This is the honest,
definitive version of the feature test; the +0.279 row was endogenous
(final ratings include the game being predicted).

Verdict: DEAD AS AN EDGE, ALIVE AS A REFERENCE/FEATURE SOURCE — but the
feature value is ≈ zero against closes. Kept for ensemble priors and as
the calibration reference. Replay script outputs in
data/fivethirtyeight/elo_replay_2002_2016.pkl.
