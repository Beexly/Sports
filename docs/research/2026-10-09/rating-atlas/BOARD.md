# Rating-atlas board — mark here

For Garrett and every agent. Research branch only: `research/rating-atlas-2026-10-09-packet`. `main` is not this board. Production scoring is not this board.

A box is checked only when the command printed, or the file on this branch contains the fix. A pasted claim is not a check.

## Closed

- [x] Team-total sign. `mu = -listed`. Listed −3 on 48.5 is home 25.75 / away 22.75. `team_total_sign.py`, `engine_math.team_total_split`.
- [x] `ci()` replacement written. `ci_fix.py`. Mean-CI stays in the function only under the name `ci_of_mean`, marked do not cite. Report is the 2.5/97.5 of the draws. Sigma and tau are percentiles of the standard deviations, not sqrt of a variance mean-CI.
- [x] Shin −110/−110 recovers z = 0.0476, fair 0.50/0.50.
- [x] Glicko-2 is period-parallel. 1464.05 / 151.52 / 0.05999 against paper 1464.06. Match to rounding. Sequential is the wrong update. Sigma does not go to 2.
- [x] Teaser at 46.8% is +114, not −114.
- [x] +1.74 is the 0 mph intercept, not the average miss.
- [x] Home-field point estimate ~1.6. Interval [1.54, 1.59] is retired.

## Open — next accuracy work

- [x] `FULL_STACK_DELIVERY.md` rewritten on this branch (2026-10-10): `ci()` is now `ci_of_mean` marked do-not-cite; printed Gibbs intervals come from `draws_interval` (2.5/97.5 of draws).
- [x] Part 5 sigma row corrected: point ~13.4, ladder stays 13.45; the mean-CI band is retired in the table row itself.
- [x] Kalman docstring corrected: draws interval [1.01, 2.18] cited; mean-CI retired; production 0.025 EPA/play untouched.
- [x] Weather intercept row corrected: +1.74 is the 0 mph / 70 F baseline, not the average miss, not an addend.
- [x] Manifest corrected: Glicko-2 canonical to rounding, 1464.05 vs paper 1464.06.
- [ ] Wind −0.197 not re-fit. `games.jsonl` has no wind column.
- [ ] EPL showdown not re-run here. `research.db` is not in this checkout.
- [ ] No market in the 2025 weeks 1–6 backtest. 55.8%, Brier 0.2868 → 0.2464 after T = 7.512. Overconfident. Not a 100% engine.
- [ ] Closing line is still ahead of the EPL model (1.047 vs 0.966). Beating it is the accuracy work, not another rating.

## Rule

A metric does not emit a pick. The pick carries the market, the residual against the close, and a situational fact the close does not already contain.

- [x] Idle step called from glicko2.py for zero-game players
- [x] CFB_MODEL_DECISION.md landed. College is a separate model. Not started.
- [ ] v7 paste still has old ci(). Delivery file not rewritten.
- [ ] Market still missing from the 2025 weeks 1-6 backtest
- [x] Kill ledger current. Do not rebuild a killed row.
