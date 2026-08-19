# L-17 path-geometry (final edge experiment)

Reused the L-15 `hermes_ro` extract (2026-08-19T17:54:49Z). Entry = last snapshot with hours-to-start in (1, 3]. Features use only snapshots strictly before that entry. 210 MLB totals games had the entry plus at least 10 pre-entry snapshots. `espn_public` excluded.

**Verdict: STOP. The edge program ends on this corpus.** Totals grouped-CV Spearman r = 0.091 (n = 203 games, p = 0.19, R² = −0.049). The pre-registered rule is r ≥ 0.15 continue, r < 0.10 stop, no appeal.

| Feature | Decimation gate | Median statistic | Pass | Univariate r vs CLV |
|---|---|---|---|---|
| realized variation | median(RV_dec / RV_full) ≥ 0.5 | 0.895 | yes | −0.192 |
| increment ρ₁ | median abs shift ≤ 0.2 | 0.146 | yes | −0.045 |
| sign-change rate | median abs shift ≤ 0.2 | 0.133 | yes | −0.055 |
| dispersion half-life | median relative shift ≤ 0.5 | 0.194 | yes | −0.109 |
| cross-sectional skew | median abs shift ≤ 0.5 | 0.068 | yes | +0.043 |
| staleness fraction | median abs shift ≤ 0.2 | 0.150 | yes | −0.052 |
| Ridge (all six, alpha=1, GroupKFold 5 by game) | — | — | — | **r = 0.091, R² = −0.049** |

All six features survived decimation (they are not 19-minute cadence noise). The model still does not predict realized CLV. Mean CLV is −0.00045 (sd 0.010). Univariate RV at r = −0.192 is one of six looks, not a pre-registered claim, and was not used to change the decision.

Moneyline r = −0.047, R² = −0.072 — also stop. Spreads r = 0.209 with R² = −0.074: rank correlation without variance explained, and not the pre-registered primary market. Same quarantine as C-41. Do not continue on spreads.

No booster. No second experiment on this corpus.
