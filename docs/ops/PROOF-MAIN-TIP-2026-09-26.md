# PROOF: origin/main tip and ancestry (2026-09-26)

Run this and believe it. Do not re-litigate SHAs.

```
git fetch origin main
git rev-parse origin/main
# => 63653b2f29832a6a6978d645081a023c98bdb3fb

git merge-base --is-ancestor b73520085 origin/main && echo YES
git merge-base --is-ancestor 660299b8f origin/main && echo YES
git merge-base --is-ancestor fd73e0ce8 origin/main && echo YES
# all three: YES — they are ancestors of the tip, not the tip

git log --oneline -12 origin/main
```

## Lineage (top = tip)

| SHA | Author lane | Note |
|---|---|---|
| 63653b2f2 | wiring session | ownership correction + assign dfs+nfl |
| 51333c552 | wiring session | HANDOFF-WIRING-2026-09-26.md |
| d4280364e | wiring session | symreg/conformal/promotion/kernel/certificate residue bridge |
| 999db2b3d | wiring session | bayesian-residue bridge |
| aca60a620 | wiring session | metalearning residue |
| 4d0e32924 | wiring session | rl-residue bridge |
| 259aecede .. e75ac2fd9 | wiring session | type red lines, window-hash, promotion barrel |
| **b73520085** | **parallel session** | **NGS measurement + ladder/boost — LANDED** |
| **660299b8f** | **parallel session** | **asof-store leak wall + placebo — LANDED** |
| **fd73e0ce8** | **parallel session** | **V5 submission + V7 feature-recipe — LANDED** |
| d667351f9 | wiring session | symreg residue |

Dead pre-rebase SHAs: `1d0576590`, `a7b5e1267`. Do not wait on them. Do not list #7/#8/#3-5/NGS/ladder as open.

## Ownership (authoritative)

- Parallel session (idle): **dfs + nfl scoring batch** — dominance-pruning, ip-portfolio, value-tier, tournament-variance, cluster-salary-screen, payout-framework, block-poisson, generalized-poisson, luck-neutralized-epa, parsimonious-season
- Wiring session: T31 physical-context (weather air-density-fg + ball-physics + decision-calibrated-weather, honesty shinFairForSide, calibration-blend, inplay safe-lead). Do not collide.

If your `git log origin/main` tip is still `b73520085` after `git fetch origin main`, your remote-tracking ref is stale — fetch again or check the remote URL.
