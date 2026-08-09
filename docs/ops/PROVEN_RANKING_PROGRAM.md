# PROVEN ranking program (north star)

```
Measure Res by sport|market
  → drop/pause dead groups
  → selective publish (thresholds)
  → market-relative features when lines exist
  → re-score holdout Res/AUC/Brier/ECE
  → only then maps + AUTO_PUBLISH
```

## Selective thresholds (start points)
| | Rule | Effect |
|--|------|--------|
| Confidence | \|p−0.5\| ≥ δ (0.08–0.15) | Drop coin-flips |
| Edge | \|p−p_mkt\| ≥ e (0.03–0.05) when lines | Align CLV story |
| Group allowlist | Res_g ≥ ρ or n_g ≥ n_min | Kill dead leagues |

`SELECTIVE_PUBLISH_ENABLED` default **OFF**. Offline sweep → `selective-publish-sweep` in holdout report.

## Next single engine change
Ship group pause list + confidence δ filter on generate-drafts (flagged), re-run resolution-by-group after one slate cycle.
