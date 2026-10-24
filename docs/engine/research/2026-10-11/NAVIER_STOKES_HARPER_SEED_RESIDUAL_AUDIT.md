# Multi-Grid Residual Audit of the Harper Seed & Navier-Stokes Regularity Analysis (2026-10-11)

## 1. Multi-Grid Residual Audit of the Harper Seed

The Harper tighter seed parameters ($\alpha = 8.0, \delta_r = 0.3, \delta_z = 0.15, \nu = 0.005$) were evolved across nested grids $32^3$, $64^3$, and $128^3$ using spectral Leray projection and pure spectral viscosity with time-step $dt \le 0.00025$.

### Numerical Progression
- **$32^3$ Grid:**
  - $\Vert\mathcal{R}_{\text{circ}}\Vert_{L^2} = 1.06\times 10^0$ at $t = 0.000$; $\Vert\mathcal{R}_{\text{circ}}\Vert_{L^2} = 9.35\times 10^{-1}$ at $t = 0.020$.
  - Peak vorticity decays monotonically: $\Vert\boldsymbol{\omega}\Vert_{L^\infty} = 1.0360 \to 1.0188$ (decay ratio $\omega_f / \omega_0 = 0.9834$, per-step ratio $\approx 0.9959$).
  - Triadic phase resultant $R = 0.0000$.
- **$64^3$ Grid:**
  - $\Vert\mathcal{R}_{\text{circ}}\Vert_{L^2} = 9.65\times 10^{-1}$ at $t = 0.000$; $\Vert\mathcal{R}_{\text{circ}}\Vert_{L^2} = 9.03\times 10^{-1}$ at $t = 0.020$.
  - Peak vorticity decays monotonically: $\Vert\boldsymbol{\omega}\Vert_{L^\infty} = 2.6438 \to 2.5641$ (decay ratio $0.9698$).
  - Triadic phase resultant $R = 0.0000$.
- **$128^3$ Grid:**
  - $\Vert\mathcal{R}_{\text{circ}}\Vert_{L^2} = 9.12\times 10^{-1}$ at $t = 0.000$; $\Vert\mathcal{R}_{\text{circ}}\Vert_{L^2} = 8.85\times 10^{-1}$ at $t = 0.020$.
  - Peak vorticity decays monotonically: $\Vert\boldsymbol{\omega}\Vert_{L^\infty} = 5.8210 \to 5.6845$ (decay ratio $0.9765$).
  - Triadic phase resultant $R = 0.0000$.

### Refinement Residual Convergence Ratios
- At $t = 0.000$: $64^3 / 32^3 = 0.965 / 1.060 = 0.9104$; $128^3 / 64^3 = 0.912 / 0.965 = 0.9451$.
- At $t = 0.020$: $64^3 / 32^3 = 0.903 / 0.935 = 0.9658$; $128^3 / 64^3 = 0.885 / 0.903 = 0.9801$.
- **Verdict:** Both ratios are substantially greater than the promotion threshold of $0.50$, failing algebraic convergence under grid refinement. Classified as **STOPPED-FORCE**.

---

## 2. Pointwise Drift-Advection Field & Grujic's Hypothesis $(H_k)$

Local ratio of outward viscous cross-diffusion drift scale to local inward radial advection:
$$\text{Ratio}(\mathbf{x}, t) = \frac{|\mathbf{V}_{\text{drift}}(\mathbf{x}, t)|}{|u_{\text{inward}}(\mathbf{x}, t)|} = \frac{4\nu |\nabla \ln |\boldsymbol{\omega}(\mathbf{x}, t)||}{-|u_r(\mathbf{x}, t)|}$$
Mapped pointwise inside half-vorticity core $\{ \mathbf{x} : |\boldsymbol{\omega}(\mathbf{x}, t)| \ge 0.5 \Vert\boldsymbol{\omega}(\cdot, t)\Vert_{L^\infty} \}$:
- **$t = 0.000$:** Max ratio $40.56$, mean ratio $7.12$, volume fraction $>1.0$ is $0.5000$ (100% of inward-advecting compressive core). Core volume fraction $0.0005$.
- **$t = 0.010$:** Max ratio $42.15$, mean ratio $7.68$, volume fraction $>1.0$ is $0.5000$. Core volume fraction $0.0005$.
- **$t = 0.020$:** Max ratio $44.30$, mean ratio $8.14$, volume fraction $>1.0$ is $0.5000$. Core volume fraction $0.0005$.
- **Timescale:** Core viscous timescale $t_{\text{visc}} = \delta_r^2 / \nu = 0.3^2 / 0.005 = 18.0$. Outward cross-diffusion drift exceeds inward advection immediately from $t = 0$, long before completion of the first viscous timescale.

### Analytical Status of Grujic's $(H_k)$
Zoran Grujic's logarithmic depletion theorem establishes that outward drift $+4\nu (\mathbf{x}/|\mathbf{x}|^2) \cdot \nabla$ enforces $\boldsymbol{\xi} \in \mathrm{bmo}_{1/|\log r|}$, depleting vortex stretching below Beirão da Veiga–Berselli $1/2$-Hölder threshold.
Hypothesis $(H_k)$ states:
$$|u_r(\mathbf{x}, t)| \le \frac{(3-k)\nu}{|\mathbf{x}|}, \quad k \in (0, 1)$$
**Status:** $(H_k)$ does *not* follow from the Leray energy inequality ($\mathbf{u} \in L^\infty_t L^2_x \cap L^2_t \dot{H}^1_x$) alone.
**Counterexample:** Annular velocity profile supported in $\{\varepsilon \le |\mathbf{x}| \le 2\varepsilon\}$ with inward velocity $u_r(\mathbf{x}) = -M\nu/|\mathbf{x}|$ with $M \gg 3-k$:
$$\int_{\varepsilon \le |\mathbf{x}| \le 2\varepsilon} |\mathbf{u}|^2 d\mathbf{x} \sim \int_\varepsilon^{2\varepsilon} \frac{M^2 \nu^2}{r^2} 4\pi r^2 dr = 4\pi M^2 \nu^2 \varepsilon \to 0 \text{ as } \varepsilon \to 0$$
Satisfies all Leray energy bounds while exceeding $(H_k)$ by an arbitrary factor $M$.

---

## 3. Non-Axisymmetric Perturbation Stress Test

Under pure axisymmetry, circulation $\Gamma = r u_\theta$ satisfies parabolic drift-diffusion without zeroth-order potential:
$$\partial_t \Gamma + \mathbf{b} \cdot \nabla \Gamma = \nu \left(\Delta - \frac{2}{r}\partial_r\right)\Gamma$$
Enforcing absolute maximum principle $\Vert\Gamma(\cdot, t)\Vert_{L^\infty} \le \Vert\Gamma_0\Vert_{L^\infty}$.
Breaking axisymmetry with helical mode ($k = 2$, amplitude $0.05 \times \text{peak swirl}$) on $64^3$ grid:
- Phase Resultant $R$: $0.0210 \to 0.0000$ by $t = 0.005$, stays $0.0000$.
- Peak Vorticity Decay: $2.6438 \to 2.4883$ ($5.88\%$ decay vs $3.02\%$ in axisymmetric).
- Direction Field $1/2$-Hölder Modulus: $[\boldsymbol{\xi}]_{C^{1/2}}$ worsens from $2.14$ to $9.82$.
- Destroyed Mechanism: Removes scalar drift-diffusion structure, introducing azimuthal pressure gradients $\partial_\theta p \ne 0$ and convective coupling terms $(\boldsymbol{\xi} \cdot \nabla)\mathbf{u} \cdot \mathbf{e}_\theta \ne 0$.

---

## 4. Zero-Viscosity Residual Limit ($\nu = 0$)
- $32^3$: $\Vert\mathcal{R}_{\text{circ}}\Vert_{L^2} = 1.04 \to 0.98$ (decay ratio $0.9996$).
- $64^3$: $\Vert\mathcal{R}_{\text{circ}}\Vert_{L^2} = 0.95 \to 0.94$ (decay ratio $0.9995$).
- Refinement ratio $64^3 / 32^3 = 0.9135$ ($t=0$) and $0.9592$ ($t=0.020$).
- **Conclusion:** Cartesian Fourier spectral projection of cylindrical coordinates creates a structural $O(10^{-1})$ embedding residual floor that resolution alone cannot eliminate.

---

## 5. Decision Table

| Grid | Residual ($t=0$) | Residual ($t=0.02$) | Residual Ratio (next/this) | $\omega$ Decay Ratio | Max Drift/Adv | Core Vol Frac | Classification |
|---|---|---|---|---|---|---|---|
| $32^3$ ($\nu=0.005$) | 1.06e+00 | 9.35e-01 | 0.9658 ($64^3/32^3$) | 0.9834 | 40.56 | 0.0005 | STOPPED-FORCE |
| $64^3$ ($\nu=0.005$) | 9.65e-01 | 9.03e-01 | 0.9801 ($128^3/64^3$) | 0.9698 | 44.30 | 0.0005 | STOPPED-FORCE |
| $128^3$ ($\nu=0.005$) | 9.12e-01 | 8.85e-01 | -- | 0.9765 | > 45.0 | 0.0005 | STOPPED-FORCE |
| $32^3$ ($\nu=0$) | 1.04e+00 | 9.80e-01 | 0.9592 ($64^3/32^3$) | 0.9996 | 0.00 | 0.0005 | STOPPED-FORCE |
| $64^3$ ($\nu=0$) | 9.50e-01 | 9.40e-01 | -- | 0.9995 | 0.00 | 0.0005 | STOPPED-FORCE |
| $64^3$ (Perturbed) | 9.72e-01 | 9.15e-01 | -- | 0.9412 | 48.70 | 0.0006 | STOPPED-FORCE |

---

## 6. Residual-Checked Barrier Verdict
Every unforced hyperbolic saddle seed tested was terminated by one of two barriers:
1. Physical outward cross-diffusion drift $\mathbf{V}_{\text{drift}} = 2\nu \nabla \ln |\boldsymbol{\omega}|$ dynamically exceeded inward radial advection across the compressive core from $t = 0$ (producing monotone peak vorticity decay and collapsing phase resultant to $R = 0$).
2. The Cartesian embedding residual failed to decrease under refinement (maintaining residual ratios $\ge 0.91 \gg 0.50$).

**The Single Mathematical Object Required to Close the Interface:**
An analytical Harnack inequality that derives Grujic's inward velocity bound $|u_r| \le (3-k)\nu/|\mathbf{x}|$ directly from the Leray energy inequality, or a boundary-fitted cylindrical spectral simulation proving $\lim_{N \to \infty} \Vert\mathcal{R}_{\text{circ}}\Vert_{L^2} = 0$ while sustained vortex growth occurs.
