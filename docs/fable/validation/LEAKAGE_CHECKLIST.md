# Leakage Checklist

Check:
- no future injury/status data in training window
- no post-market movement in market-open features
- no settlement result in feature derivation
- no source freshness from after prediction time
- no same-game target leakage
- no player/team ids used as memorization shortcuts without holdout
