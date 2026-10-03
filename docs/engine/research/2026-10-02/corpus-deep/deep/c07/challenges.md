# c07 challenges — adversarial review of the deep pass (2026-10-02)

What could be wrong with the deep pass's conclusions. Each challenge is
specific: what would falsify it, and what it would take to check.

---

## C1. Single-season fragility (0290)

The calibration-vs-accuracy ROI gap (+34.69% vs −35.17%) is one season
(2018/19) under a confounded selection paradigm. **Falsifier:** the gap
collapses or reverses on 2019–2025. **Check:** re-run the selection horse race
on 5+ seasons before wiring selection on calibration.

## C2. The decorrelation port is not the paper (0174)

The XENT decorrelation loss is the brief's ADAPT port; the paper is MSE*-based.
**Falsifier:** the port's γ=0.4 optimum doesn't transfer to the paper's loss,
or the profit figure depends on port-specific tuning. **Check:** re-derive from
the paper's equation before citing 1.74 ± 0.14 as a paper result.

## C3. SHAPEffects "win" is meaningless in absolute terms (2185)

12.61 vs 13.39–13.41 with R² = −0.99 even for the winner. **Falsifier:**
anyone treating the win as usable fit. **Check:** none needed — the caveat is
the conclusion. Do not build on SHAPEffects.

## C4. 1461's numbers are self-contradictory (confirmed)

Internal numeric inconsistency in the MOVDA brief. **Resolution:** steal the
equation, never the numbers. Any system built on 1461's numerics inherits the
contradiction.

## C5. The governor evidence is one episode (1628)

M(k)'s 5%-vs-22.5% drawdown at ~12% wealth cost is single-TSLA-episode.
**Falsifier:** the governor overfits that episode's volatility regime.
**Check:** multi-asset, multi-regime backtest before wiring M(k) as the
drawdown control.

## C6. Precision-weighting regret is worst-case (1160)

0.0225 vs 0.0625 is adversarial/worst-case regret; Conjecture 3 is unproven.
**Falsifier:** average-case regret gap is much smaller. **Check:** label it
worst-case in every downstream use; do not size on it.

## C7. TAE is diagnostic, not prescriptive (0602)

θ = −0.62 describes; it does not prescribe which edges decay or how to haircut
them. **Falsifier:** treating the HPD as a sizing input. **Check:** keep it as
a monitoring statistic until a prescriptive decay model is validated.

## C8. Open contradictions must not be laundered into claims

- Calibration n=392/0.0639 vs n=458/0.0524: unresolved, cite neither.
- BDB 2026 license: unresolved, default posture is no BDB data.
- arXiv:2512.18858: rejected, four internal contradictions — a REJECT never
  counts and is never quietly revived.

## C9. The deep pass inflated three numbers

0643 momentum figures, the +0.41 rest figure, and the DYNAMO "0270" attribution
do not appear in their cited briefs (see verified-claims.md §2). **Standing
rule:** any downstream build that touches these must re-source from the brief
first. Inflated numbers compound — one bad input poisons every system built on
it.
