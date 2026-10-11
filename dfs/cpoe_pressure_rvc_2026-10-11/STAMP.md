# RVC STAMP: CPOE x Pressure Cells -> Next-Week ATS
**Date:** 2026-10-11T12:52:00Z
**Stamp:** INFRASTRUCTURE PASS
**Result:** REFUSE
**Label:** DIAGNOSTIC (all)

## What was tested
Within each pressure bin, does QB-week CPOE predict next-week ATS residual
beyond the close? 94 next-week pairs from 128 QB-weeks x 130 team-week ATS.

## Cell results (OLS next_ats ~ cpoe; Bonferroni alpha 0.0125 over 4 bins)

| Bin | n | slope | t | p | r | HO MSE naive | HO MSE sig | Beats naive |
|-----|---|-------|---|---|---|--------------|------------|-------------|
| (0,3] | 5 | — | — | — | — | — | — | refused: n<10 |
| (3,6] | 28 | +0.222 | +0.79 | 0.436 | +0.15 | 111.85 | 117.88 | NO |
| (6,9] | 28 | -0.182 | -0.64 | 0.530 | -0.12 | 138.79 | 141.40 | NO |
| (9,100] | 33 | -0.369 | -1.28 | 0.210 | -0.22 | 148.12 | 131.78 | YES (n=13) |

## Heavy-pressure hypothesis
CONFIRMED descriptively: (9,100] bin mean CPOE = +1.47 (n=45) on full 128 QB-weeks.
REFUSED predictively: does not transfer to next-week ATS. Slope p=0.21, not significant.

## Diagnostic threads (not passes)
- (9,100] held-out beats naive (131.78 < 148.12) but n_test=13 is underpowered.

## Reopen condition
Frozen 2026 weeks 6+ ATS outcomes; re-run with n>=20/bin; pre-registered (9,100]
cell reaching paired t>=1.96 after Bonferroni.

## Provenance
- dfs/cpoe_x_pressure_2026.csv (55db5eae)
- dfs/team_week_ats_2026.csv (4dbe54be)
- Prior pooled refusal: dfs/CPOE_PRESSURE_NEXT_ATS.json (d9917b24)
