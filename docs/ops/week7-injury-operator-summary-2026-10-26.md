# Week-7 Injury Operator — Execution Summary (2026-10-26)

**Slate:** 13 games · **Games with injury flags:** 13
**Seal:** 2026-W44 · `faab2827c4e9b8a1d2f3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5` · merkle `23245bcbba04f1470c5b0f60b83358c6af44c2b20c70e244d8b7a1a0eb686e8b`
**Candidate:** `C:/Users/Garrett/Sports/candidates/2026-10-25-week7-candidate.json`
**Candidate hash after write:** `921d6d038a3e20508b9d752432334206bd4ed4d4697b313214e3d9cd738f28af`

## Games processed

| Game | Flags | Mass loss | Residual before | Residual after | Hash unchanged |
|---|---|---|---|---|---|
| PIT @ NO | 2 | 0.153 | 1.0 | 0.847 | True |
| SF @ ATL | 6 | 0.153 | 1.0 | 0.847 | True |
| CLE @ TEN | 2 | 0.153 | 1.0 | 0.847 | True |
| IND @ MIN | 4 | 0.153 | 1.0 | 0.847 | True |
| MIA @ NYJ | 3 | 0.153 | 1.0 | 0.847 | True |
| TB @ CAR | 5 | 0.153 | 1.0 | 0.847 | True |
| CIN @ BAL | 2 | 0.153 | 1.0 | 0.847 | True |
| NYG @ HOU | 5 | 0.153 | 1.0 | 0.847 | True |
| DEN @ ARI | 2 | 0.153 | 1.0 | 0.847 | True |
| GB @ DET | 2 | 0.153 | 1.0 | 0.847 | True |
| LAR @ LV | 1 | 0.153 | 1.0 | 0.847 | True |
| KC @ SEA | 2 | 0.153 | 1.0 | 0.847 | True |
| DAL @ PHI | 2 | 0.153 | 1.0 | 0.847 | True |

## Residual deltas

- Per-game mass loss: **0.153** (identical template across games).
- Sum of mass deltas: **1.989**.
- Conformal game-level residuals (model total − devigged external total) are unchanged: the operator moves execution weights, not the model total.

## Execution-weight confirmation

- `injury_realloc` performed Sinkhorn reallocation under the sealed cost matrix, then the sealed EPA dropoff.
- Only `feasible_shares` / `effective_shares` / `normalized_shares` moved. `tau`, the coach mindset hash, the cost matrix, and the EPA table were not touched.
- `hash_unchanged: true` on all 13 games; candidate parent hash stayed `faab2827c4e9b8a1d2f3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5`.

## KC@SEA proxy re-emission

- `injury_mass_loss`: 0.153
- `residual_before` / `residual_after`: 1.0 → 0.847
- `hash_unchanged`: True

## Constraints honored

- No rating re-fit. No `recoverTau` call. No `ENABLED` flag flipped.
- No push, no PR. Branch `engine/public-baseline-2026-10-24` stays dirty.
- Steam latency and CLV out of scope.

**SEAL STATUS:** LOCKED — `faab2827…` unchanged