# PrizePicks payout tables [CONFIRMED] + margin-curve method (Minis 2026-10-10)
Source: community-maintained rules wiki citing prizepicks.com/help-center/payouts (official rates updated 2026-07-02).

## Power Play (all legs hit)
| legs | multiplier | implied slip 1/M | per-leg breakeven M^(-1/n) |
|---|---|---|---|
| 2 | 3x | 33.3% | 57.7% |
| 3 | 6x | 16.7% | 55.0% |
| 4 | 10x | 10.0% | 56.2% |
| 5 | 20x | 5.0% | 54.9% |
| 6 | 37.5x | 2.7% | 54.0% |

## Flex Play (partial credit)
| legs | all | 1 miss | 2 misses |
|---|---|---|---|
| 3 | 3x | 1x (push) | - |
| 4 | 6x | 1.5x | - |
| 5 | 10x | 2x | 0.4x |
| 6 | 25x | (t) | (t) |

Rules notes [CONFIRMED]: demon (harder line, More only, boosts mult up to 2000x on 6-leg) / goblin (easier line, More only, reduces mult). Tie/DNP/reboot revert one tier; 2-pick Power refund on DNP. Reboot = NFL full-game More leg, player exits 1H injured, no 2H return; Less grades normally.
ToS note [CONFIRMED]: PP ToS restricts automated access; no public API. Our reads = public board reads; keep volume polite; no accounts used (doctrine).

## Margin-curve method (the kill-shot spec)
1. Over-only PP lines vs our DK-reconstructed (mu_hat, sigma_hat) -> p_model = 1 - Phi((line-mu)/sigma).
2. Slip EV(n legs, mode) = prod(p_i)*M - 1 (Power) or sum over outcome tiers (Flex, independence approx).
3. Per-stat margin curve: EV vs number-of-legs using each stat's mean p at PP over-only depth (-0.85 sigma avg).
4. Compare per-leg breakeven (54-57.7%) vs our p at their posted over-only lines -> the pockets where prod(p)*M>1.
Correlation correction: same-game legs need our copula (margin_total_copula); product-of-legs overprices positive correlation (banned by doctrine) - use copula joint.
