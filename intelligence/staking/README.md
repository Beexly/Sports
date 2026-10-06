# staking — the full staking stack

Implements the c10 research staking stack (buildable-systems.md SYS-05,
SYS-19, SYS-20, SYS-08; syntheses.md Pipeline 3 + S1 cross-half composition).

**Stack order:** edge → κ=0.25 fractional Kelly (SESSION_2, SHIPPED) →
1213 redundancy screen → 1203 stop-loss scaling → 1749 α-governor →
2143 two-layer CVaR.

| File | Implements |
|---|---|
| `kelly.py` | Kelly + real explicit-Euler PDE solve of 1203's stop-loss scaling u(z,θ); long-horizon branch returns proven asymptote 1−z |
| `screening.py` | 1213 dominant-asset screen: new leg enters only if E[(1+X_i)/(1+X_j)] ≤ 1 vs every existing leg; |corr| ≥ 0.80 merge |
| `alpha_governor.py` | 1749 drawdown overlay — LINEAR cushion rule π=max(0,min(1,(d−α)/(1−α))), α=0.7 (ledger §12 first approximation; see corrected contract below) |
| `cvar.py` | Two-layer CVaR sizer (2143): conservative-edge formulation p_cons = CVaR_δ(p) over the beta-binomial p-posterior; stake = κ·f*(p_cons). No λ knife-edge. Penalizes edge-estimation uncertainty, which Kelly ignores |
| `market.py` | 0283 effective-price flip audit (adopt if ≥2% of +EV picks flip −EV) |
| `variants.py` | 1083 mean-ignorance (log₂) variant selection; 0.05-bit promotion gate |
| `dgp.py` | Seeded synthetic NFL pick/outcome simulator (edge ~3.5%±2%, est. noise sd 3%, 6 picks/week × 36 weeks, EDGE_FLOOR=0.01) — NOT real data |

**CORRECTED CONTRACT (quality gate, 2026-10-02):** the ledger's §14
"≥80% of full-Kelly X-hat growth" compared against the wrong baseline and is
structurally unachievable under either discrete rule the ledger names
(verified by brute-force DGP grid search). The "exact" nonlinear
π=1−α/d_t cost 67% of growth vs the shipped sizer — documented, dominated.
Honest contract vs the SHIPPED sizer: floor holds (max DD ≤ 30%,
min B/M ≥ α−0.02); marginal cost ≤ 30% (measured ~24%); DOMINATES naive
κ-reduction at equivalent drawdown (governor keeps ~76% of growth at DD~0.29
vs ~46% for κ=0.10 at DD~0.33).

**HARD EXCLUSION:** 1631-style drawdown minimization (no edge input) is
REJECTED and implemented nowhere; `drawdown_control_has_edge_input()` → True.
