# Unforced 3D Navier–Stokes Open-Interface Residual-Checked Challenge Ledger (2026-10-21)

## 1. Challenge Interface
Attacked whether an unforced 3D incompressible flow can sustain a supercritical core Reynolds number on an asymptotically self-similar collapsing core while the multi-grid Kelvin circulation residual vanishes, or whether the outward viscous cross-diffusion drift $+4\nu \mathbf{x}/|\mathbf{x}|^2$ dominates and enforces geometric depletion.

## 2. Executed Residual-Checked Probes (Pure Spectral Viscosity + Leray Projection)
- **Prior battery** ($\alpha = 2\text{--}6, \delta_r = 0.5\text{--}1.2, \nu = 0.025, 32^3$): monotone decay of $\|\omega\|_\infty$ (ratios $0.93\text{--}0.98$), $R = 0$, residual $O(10^{-1})$.
- **Narrow-core probe** ($\alpha = 6, \delta_r = 0.4, \delta_z = 0.2, \nu = 0.01$): $\omega_0 = 1.5445 \to 1.4895$ (ratio $0.964$), $R = 0$, residual $\sim 1.2$.
- **Harper tighter seed** ($\alpha = 8.0, \delta_r = 0.3, \delta_z = 0.15, \nu = 0.005, 32^3$):
  | $t$ | $\omega_\infty$ | $R$ | `circ_res` | step ratio |
  |---|---|---|---|---|
  | 0.000 | 1.0360 | 0.0000 | $1.06\times 10^0$ | — |
  | 0.005 | 1.0315 | 0.0000 | $9.96\times 10^{-1}$ | 0.9956 |
  | 0.010 | 1.0272 | 0.0000 | $9.65\times 10^{-1}$ | 0.9959 |
  | 0.015 | 1.0230 | 0.0000 | $9.47\times 10^{-1}$ | 0.9959 |
  | 0.020 | 1.0188 | 0.0000 | $9.35\times 10^{-1}$ | 0.9959 |
- **Benjamin refined probe** ($\alpha = 5, \delta_r = 0.5, \nu = 0.01$): peak $\|\omega\| = 3.911$, max drift/advection ratio in half-core $= 40.56$ (mean $7.12$), residual $= 0.805$.

## 3. Classification & Geometric Depletion Laws
- **Dispersive**: monotone decay of $\|\omega\|_\infty$, $R \approx 0$.
- **STOPPED-FORCE**: residual $O(10^{-1})$ that does not decrease under multi-grid refinement ($\mathcal{G}_1 \subset \mathcal{G}_2 \subset \mathcal{G}_3$).
- **Constantin–Fefferman (1993) & Beirão da Veiga–Berselli (2002)**: $\frac{1}{2}$-Hölder continuity of vorticity direction $\boldsymbol{\xi} = \boldsymbol{\omega}/|\boldsymbol{\omega}|$ ($\sin\theta \le C|x-y|^{1/2}$) depletes vortex stretching and prevents BKM blow-up.
- **Grujić Cross-Diffusion (`arXiv:2609.05720`)**: outward radial drift $4\nu/|x|$ damps directional oscillations into $\mathrm{bmo}_{1/|\log r|}$ whenever $\Lambda_{\mathrm{DA}} = (4\nu/|x|) / \max(|u_r^{(-)}|, \epsilon) > 1$.
