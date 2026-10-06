Plan:
1. Vendor `backtesters.py`, `datapartition.py`, `emp_confidence_int.py` from `facebookresearch/Kats` into `gse-ml-service/app/backtest/kats/`. Include MIT license headers. Done.
2. Build the harness in `gse-ml-service/app/backtest/harness.py`.
   - Season-aware partition configurations for NFL, NBA, MLB, NHL, soccer. Folds must not span an offseason.
   - Point-in-time discipline validator: "Any regressor used in a fold must have been knowable at the forecast origin. Build a validation check that rejects partitions violating this."
   - Modeling embargoes (e.g., no bets after lineup lock) using `window_frac` gap between train and test in `RollingOriginDataParition`.
3. Unit tests in `gse-ml-service/app/tests/test_backtest.py`:
   - (a) no lookahead in a multi-season series.
   - (b) deliberately leaky partition is rejected by the validator.
   - (c) empirical intervals calibrate on a synthetic series.
4. Open PR.
