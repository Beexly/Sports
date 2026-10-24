---
Recipe: backtest rows from NGS harness. knownAtWeek = prior-season end (18*season-offset). modelProb = normalize(yacAboveExpected, [-2,2]→[0.01,0.99]). marketProb = 0.5 (honest self-baseline). outcome = 1 if next-season mean > season median else 0.
