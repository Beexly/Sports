# Navier–Stokes Laboratory Session — Complete Record

Date span: 2026-10-07 through 2026-11-05.  
Author of the runs: spectral sandbox plus a device-side solver. Every number is labeled by the object that produced it.  
A cartoon is not a field. A preprint is not a theorem. Do not claim the Millennium problem is solved. Do not treat a prescribed filament stack as a solution of Euler or Navier–Stokes.

---

## 0. Session intent

The session began with a demand to solve the Clay Millennium problem for the 3D Navier–Stokes equations, using any tools, agents, and unlimited computation, without being told it was impossible. The work evolved into a laboratory protocol: build and kill candidates, measure real fields, distinguish theorems from preprints, and refuse to invent numbers. The standing rule throughout was honesty about what was measured versus what was claimed.

---

## 1. The problem

Unforced 3D incompressible Navier–Stokes on \(\mathbb{R}^3\) or the torus, Clay alternatives (A)/(B), remains open as of the session date. Forced blowup is a different problem (C)/(D). OpenAI, 8 September 2026, targeted Fefferman alternatives (C)/(D): a smooth external force supplied 97.3% of the positive vorticity budget and intrinsic stretching 2.7%. Chen–Hou–Huang 2025 is a computer-assisted blowup for 2D Boussinesq and 3D axisymmetric Euler on a bounded domain. Neither is (A)/(B). The AIX Global August 2026 quantum claim is a Zenodo preprint and was not verified.

Beale–Kato–Majda (1984): in the class where the criterion applies, smooth data stay smooth on \([0,T]\) if and only if \(\int_0^T \|\omega\|_\infty\,dt < \infty\). That is the clock. Do not write that it is necessary but not sufficient. Constantin–Fefferman (Indiana Univ. Math. J. 42, 1993): a Lipschitz vorticity direction in the high-vorticity region is sufficient for regularity. It is geometric. It is not a weaker clock. The gap between them is real.

Clay statement (quoted in the second Deep Research report):
- (A): \(\nu>0\), \(n=3\), smooth divergence-free \(u^\circ\) with finite energy, \(f\equiv 0\), existence of smooth \(p,u\) on \(\mathbb{R}^3\times[0,\infty)\).
- (B): same on the torus \(\mathbb{R}^3/\mathbb{Z}^3\).
- (C)/(D): breakdown, force allowed.

---

## 2. The filament stack and the 922× factor (closed)

Stack \(A_j=(G/\lambda)^j\), \(k_j=\lambda^j\), \(\lambda=1.6\), \(G=4.5\). Discrete Biot–Savart sum:

\[
\sigma_n=\sum_{j<n}\frac{A_j}{(1-\lambda^{-(n-j)})^2}
\]

At layer 11:
- \(\sigma_{11}=259{,}573\)
- Local charge \(A/k=281.66\)
- Ratio \(=921.6\) (reported as 922× in early turns)
- Neighbor (one step out) = 84.84% of the sum, contribution 220,223
- Tail = 15.16%, contribution 39,350. Of that, 11.42 points are the layer two steps out. Layers more than three steps out are under 1.1%. The gift is the close geometric pile, not distant domination.

Algebra: ratio \(= k_{n-1}/(1-1/\lambda)^2 / 0.8484\), with gap factor 7.111 at \(\lambda=1.6\).

This is twelve lines of arithmetic. No velocity, so no \(\omega\), no BKM integral, no Prodi–Serrin norm, no pressure Hessian, no \(\xi\).

### Kelvin constraint
Kelvin’s circulation theorem fixes \(\Gamma_j=A_j/k_j^2\) on a material tube. Free \(A_j\) mints circulation. Under \(A=\Gamma_0 k^2\), strain and \(\nu k^2\) grow together and \(\sigma/k^2\) saturates near 3.34. The cascade bonus that opened the window \(\lambda^3<G<\lambda^{(\beta+4)/2}\) was paid for with minted circulation. The free ladder was a candidate for a different system.

### Cartoon campaign
About 120,000 cartoon configurations were scored. Local strain laws disagreed and left the corner empty. The nonlocal kernel opened it. Amplitude depletion closed it. Self-consistent alignment only renormalized the coupling. Sheet kernel plus shear-thinning viscosity won at \(N=64\) and reversed at \(N=256\): none-alignment died, and the self-consistent floor became binding. Carreau and power-law wins are modified equations, not Navier–Stokes. Unbounded Oldroyd arrested the ladder. Bounded FENE-P only slowed it.

### Polylog schedule failure
The polylog schedule passed a kinematic gate at \(\nu\le 3.45\times 10^{-13}\) and failed as a drop-in for the Mocz stage map. Control \(\beta_2 x_{\mathrm{tar}}^2\to 1\). Swap at \(x_{\mathrm{prev}}=4\) gave 1.028. The stage hands back a \(1/x^2\) frame. Feeding \(\beta=1/\log(2+x)^2\) does not hand back a logarithmic child. At \(x_{\mathrm{prev}}=4\) the handed frame is about 30 times short of the polylog target, and the shortfall grows with \(x\). There is no one-line fix. A new stage geometry is a different experiment.

Factorial frequency growth died by viscosity at every fixed \(\nu\) tested. Polylog frequency growth died because the sheet-engine error \(k^{-1/4}\) stayed \(O(1)\).

The stack cannot compute BKM, Prodi–Serrin, the pressure Hessian, or \(\xi\). Stop deriving ratios on it.

---

## 3. Laboratory protocol tests (ordered)

Already computed inputs (do not rederive as open):
- Stack parameters above.
- Biot–Savart sum formula above.
- Layer-11 numbers above.
- Kelvin constraint above.
- Factorial and polylog deaths above.

Tests, in order, with pass/fail and stage of death:

1. Rebuild layer 11 with Kelvin enforced, \(A_j=\Gamma_0 k_j^2\). Recompute the sum, the ratio to \(A/k\), and whether \(\sigma>\nu k^2\) at \(\nu=10^{-2},10^{-6},10^{-15}\). Result: under Kelvin, \(\sigma/k^2\) saturates near 3.34. The ratio does not improve with depth. Strain and viscous damping grow together.

2. Zero the tail (neighbor only) and recompute. Then keep only the two-step tail. Report how much of the 922 the far layers were actually worth. Result: neighbor is 84.84%. Tail is 15.16%, mostly two steps out. Far layers are not the gift.

3. Alignment drain: multiply the sum by a direction factor that is only Lipschitz. Record the stage of death. Result: self-consistent alignment only renormalized the coupling. It did not open a new window.

4. If pmocz/euler-blowup-viz is available, run `sim/stage.py` on the paper scales, then change only \(\log k_j\) to \(\log\log(2+x)\). Fail if \(a_2/a\) leaves 1 or \(m\cdot M_v\) changes sign. Result: the stage map hands back a \(1/x^2\) frame. The polylog swap fails the fixed-point test. Residuals on the stage search were 0.086 / 0.033 / 0.012 in one parameterization. No one-line fix.

5. Stop when the next step needs a divergence-free field you do not have. That point was reached. The stack has no \(u\).

---

## 4. The field (what was actually run)

Truncated spectral Navier–Stokes on the 3-torus, vorticity form, Leray projected, no force term, 2/3 dealiasing.

### Taylor–Green calibration
\(32^3\), \(\nu=0.01\), \(t=0.75\): energy \(0.1250\to 0.1194\), enstrophy \(0.3750\to 0.3787\), maximum \(2.000\to 1.718\). Matches the closed baseline.

### 100 random draws
Energy in shells \(2\le|k|\le 4\), \(E=0.125\), seeds 101–200. Production at \(16^3\), \(\nu=0.025\), \(\mathrm{Re}=40\), \(T=0.76\). The 60 audit fails were rerun at \(32^3\), \(\nu=0.01\), \(\mathrm{Re}=100\).

| Verdict | Count |
|---|---|
| Audit pass at \(16^3\) | 40 |
| Of the 60, pass at \(32^3\) | 23 |
| Still fail at \(32^3\) | 37 |
| Combined audit pass | 64/100 |
| Rising maximum | 67, of which 8 were audit-clean (from `bkm_fits.json`, the \(16^3\)-only set) |
| \(I(0.76)\) | \([2.63,\,4.08]\), mean 3.25, all finite |
| Divergent-clock survivors | 0 |

Draw 40’s log fit claims \(T=4.76\), six times outside a five-point window. Not a candidate. Two-grid means on draws 0–4 are 2.951 and 3.366, both finite. Stretching-deleted decay ends at 2.803. On draws 0–9, \(\nu=0.025\) gives 3.007 with 2/10 rising and \(\nu=0.05\) gives 2.685 with none rising. Less viscosity, more growth, no finite blowup time. Viscous transients.

The 37 remaining audit fails survived stage-consistent spectral loop advection. The chronicle attributes them to the 2/3 rule: a \(k=4\) product reaches \(k=8\), and \(16^3\) keeps modes only below 5.33. Measured: a \(k=4\) product on \(16^3\) drops 38% of its power; the same product on \(32^3\) drops none. A fail that survives \(32^3\) is later spectral fill. The dropped tail is an effective force. A pass is not Kelvin’s theorem. Hou and Li 2007: the sharp cutoff oscillates globally, and a 36th-order smooth filter keeps about 12–15% more modes per direction. That filter was named and later implemented; see Section 6.

### 10,000 one-step Taylor–Green census
\(16^3\), \(T=0.2\), Reynolds number 20 to 2000, amplitudes 0.5 to 2, swirls 0 to 0.5. Zero NaN. 8,500 under-resolved. 7,700 rising maxima, every one swirled. 2,000 unswirled runs, zero rising. Largest rise 6.6%. This window cannot see the dissipation peak near \(t=7\)–\(9\).

### Device constraints observed
Thermal throttling on the device (~190 s/step sustained on \(32^3\)). Production draws were switched to \(16^3\) at Re=40. Record cadence bug (`s % 10` vs `RECORD_AT`) was found and fixed. Early log lines that print `SURVIVED` with a BKM integral near 0.2 (draws 0–10, omega 6–26, BKM 0.10–0.39) are short windows, not divergent clocks. The later headline is the one that counts.

### Reconciled open set
The handoff’s “eight” came from `bkm_fits.json` (the \(16^3\)-only pass set). The true current set from `bkm_100_final.json` is **32 audit-clean and rising draws**. Seeds are 101 + draw index. Draws 155 and 188 (indices 54 and 87) are real seeds that pass and rise. They were temporarily excluded only because a fabricated table used those numbers. They belong in the set. The open set is the 32. The coding agent (GLM 5.3 Flash via OpenRouter, workspace `/var/minis/workspace/euler-sandbox`) flagged the discrepancy and was writing `bkm_eight.py` to continue them. That continuation had not returned results by the end of the recorded session.

---

## 5. Phase entropy and the resultant \(R\)

Three numbers, not interchangeable.

- \(S_{\mathrm{spec}}=-\sum p_k\log p_k\): Shannon entropy of modal power. Silent on phase.
- \(S_{\mathrm{phase}}\): Shannon entropy of a 16-bin histogram of \(\theta_k=\arg(\hat u_k+\hat v_k+\hat w_k)\), weighted by \(p_k\). Ceiling \(\log 16=2.773\). A histogram forgets bin order.
- \(R=\bigl|\sum p_k e^{i\theta_k}\bigr|\): mean resultant length, the first Fourier coefficient of the circular distribution. \(R=1\) is one common phase. \(R=0\) is cancellation.

Control on one shell, same power (from `phase_entropy.py`):

| Assignment | \(S_{\mathrm{spec}}\) | \(S_{\mathrm{phase}}\) | \(R\) |
|---|---|---|---|
| One locked phase | 5.312 | 0.114 | 0.952 |
| Two opposed halves | 5.312 | 0.662 | 0.250 |
| Random phases | 5.312 | 2.737 | 0.007 |

Spectral entropy cannot see the difference. Phase entropy compresses the opposed case toward the locked one. \(R\) separates them. Opposed phases do not feed one straining direction.

Taylor–Green, \(16^3\), \(\nu=0.025\):

| \(t\) | \(\|\omega\|_\infty\) | \(\|\nabla\xi\|_\infty\) | \(D\) | \(S_{\mathrm{spec}}\) | \(S_{\mathrm{phase}}\) | \(R\) |
|---|---|---|---|---|---|---|
| 0.0 | 2.000 | 1.233 | 0.000 | 2.079 | 1.733 | 0.000 |
| 0.2 | 1.951 | 1.265 | −0.087 | 2.096 | 1.737 | 0.249 |
| 0.4 | 1.871 | 1.316 | −0.107 | 2.133 | 1.744 | 0.248 |
| 0.6 | 1.766 | 1.392 | −0.024 | 2.180 | 1.757 | 0.245 |
| 0.8 | 1.648 | 2.042 | 0.091 | 2.236 | 1.769 | 0.242 |
| 1.0 | 1.524 | 2.865 | 0.158 | 2.297 | 1.637 | 0.215 |

\(R\) rises from 0 to 0.249 and slips to 0.215. It never approaches the locked control. The maximum falls by 0.48 while direction curvature more than doubles. A rougher direction with a decaying maximum is not a Beale–Kato–Majda divergence. Constantin–Fefferman would care if \(\|\nabla\xi\|_\infty\) blew up while the maximum was still growing. Here the maximum is already decaying, and the phases are not locking.

An escape in this frame is all four at once: \(\|\omega\|_\infty\) still rising, \(\|\nabla\xi\|_\infty\) rising, \(S_{\mathrm{phase}}\) falling, \(R\) rising toward the locked control, dealias residual logged as a force. None of the runs in this folder have shown it.

The code that produces these tables is `phase_entropy.py`. The controls are in `r_controls()`.

---

## 6. Hou–Li filter

Hou and Li, *Journal of Computational Physics* 226 (2007), replace Orszag’s sharp mask with a smooth filter along each axis:

\[
\rho(k_j)=\exp\bigl[-36\,(2|k_j|/N)^{36}\bigr],
\]

and take the product over \(x\), \(y\), and \(z\). The sharp rule keeps \(|k_i|<N/3\), so a product of retained modes can land past the cutoff and be set to zero. That missing stress is an effective force. The smooth filter stays near 1 through most of the band and falls only at the grid boundary.

On \(16^3\) the sharp set has 1,331 modes. This implementation of the Hou–Li product kept 3,375 modes above \(10^{-3}\).

A shell at \(k_0=2\) dropped nothing under either filter. A shell at \(k_0=4\) dropped 2.8% under the sharp mask and nothing under Hou–Li. That is not the earlier 38% figure, which came from a different \(k=4\) product. Neither number should be copied onto the device seeds.

Proxy shells 200–207 (not the device 32), energy in \(k=2\)–\(4\), \(E=0.125\), \(\nu=0.025\), to \(t=1.2\):

| Seed | Sharp peak | Sharp \(t_{\mathrm{peak}}\) | Sharp end | Hou–Li peak | Hou–Li end |
|---|---|---|---|---|---|
| 200 | 4.827 | 0.00 | 3.361 | 4.827 | 3.385 |
| 201 | 4.461 | 0.00 | 3.555 | 4.461 | 3.267 |
| 202 | 4.776 | 0.00 | 2.969 | 4.776 | 3.316 |
| 203 | 4.376 | 0.00 | 3.098 | 4.376 | 3.239 |
| 204 | 4.640 | 0.12 | 3.105 | 4.657 | 3.223 |
| 205 | 4.201 | 0.00 | 3.526 | 4.201 | 3.771 |
| 206 | 3.989 | 0.00 | 3.139 | 3.989 | 2.943 |
| 207 | 4.008 | 0.16 | 3.356 | 4.023 | 3.289 |

Six peaked at \(t=0\). Two rose a few percent and turned by \(t=0.16\). The filter did not change the verdict. A proxy that never rose past the first steps is not a continuation of a draw that was still rising at \(t=0.76\).

---

## 7. Other criteria and papers examined

- **Prodi–Serrin / LPS**: \(2/p+3/q\le 1\), \(q>3\). Escauriaza–Seregin–Šverák (2003) closed the \(L^\infty_t L^3_x\) endpoint. Silent on direction.
- **Kozono–Taniuchi**: BMO norm of \(\omega\) or \(u\) can replace \(L^\infty\) in some criteria. Examined; not a replacement for the clock.
- **arXiv:2605.26087v1**: checked by browse. It is the DiscoverPhysics benchmark (LM agents infer hidden laws in 2D N-body worlds). Not a Navier–Stokes theorem. The link was a mismatch.
- **Buaria, Lawson, Wilczek** (Science Advances 2024, eado1969): anti-twist on an isolated vortex. Mechanism paper. Not a regularity theorem. The anti-twist is inviscid in their account.
- **Lei, Ren, Tian** (arXiv:2501.08976): if vorticity directions are confined to a double cone in high-vorticity regions, the solution is regular. Near a singularity the directions cannot miss every great circle. Corollary 1.5 was verified against the paper’s HTML.
- **Grujić** (arXiv:2607.08866, arXiv:2609.05720): direction equation is harmonic-map heat flow into the sphere, plus transport, cross-diffusion, and tangential strain. Strain enters only through \(P_\xi^\perp S\xi\), which vanishes when \(\xi\) is any strain eigenvector. Inflow condition \((H_k)\): inward radial velocity at the core below \((3-k)\nu/|x|\). Derived under local axial symmetry. A hypothesis, not a theorem. The Section 7 symmetry sentence in the Deep Research report was their extraction.
- **Giga–Miura**: uniform continuity of \(\xi\) is sufficient under a Type-I hypothesis \(\|u\|_\infty\le C(T-t)^{-1/2}\).
- **Kerr** (Phys. Fluids A 1993): antiparallel tubes, predicted singularity near \(T=18.7\). Hou and Li reran at higher resolution: growth no faster than doubly exponential, predicted time passed, integral not divergent.
- **Tao** (J. Amer. Math. Soc. 29, 2016): averaged Navier–Stokes can blow up. A proof of (A) must use the structure of the true nonlinearity.
- **Buckmaster–Vicol** (Ann. of Math. 189, 2019): nonuniqueness of weak solutions. Not a blowup of smooth data.
- **Chen–Hou–Huang** (2025): computer-assisted blowup for 2D Boussinesq and 3D axisymmetric Euler on a bounded domain. Not unforced NS.
- **Cardona, Miranda, Peralta-Salas, Presas** (PNAS 2021): Turing-complete Euler flows. Not a proof that the Clay statement is independent of ZFC.

Not opened as proofs, and not to be upgraded: Topological Lock, Emeris fractal-cascade claims, Pound adversarial \(10^{12}\) enstrophy, AIX quantum claim, Hall finite-CKN lemma, OCR finiteness lemma, a Gribov mass gap derived from Navier–Stokes, any Lean file said to reduce the Clay problem to one axiom.

---

## 8. Deep Research interactions

### Mechanics (researched)
Gemini Deep Research seeds a plan from the prompt. The plan is the execution graph. Google’s guidance is to keep the seed short and put specificity in Edit plan, before Start research. A typical run browses 30–60 pages and writes. It pads by restating the prompt. It cannot drop a source mid-run. It cannot evolve our fields. Citations degrade as the report lengthens. Deep Research Max exists for longer runs. The maximum extraction is a short seed plus a replacement plan of required openings with a URL and page/equation on every row.

### First report (audited and rejected in part)
Invented an eight-row continuation table (draws 104, 112, 127, 143, 155, 171, 188, 194) with turnover times and “closed at turnover.” Those runs were not executed. The first displayed BKM statement was reversed (existence iff the integral diverges). Circulation residual column (0.741, 0.183, etc.) was not computed. The obstruction paragraph overclaimed that phase incoherence on a short box proves no singularity exists. The classification frame (Chen–Hou–Huang is Euler/Boussinesq, forced is C/D, Buaria is a mechanism paper) was correct and kept.

### Second report (after plan-edit brief)
Kept the Clay split and quoted the problem statement. Stated BKM in the correct direction. Adopted the reconciled count of 32. Put 155 and 188 back. Marked the ladder as laboratory arithmetic. Did not invent a Taylor–Green table or a drop percentage. Lei–Ren–Tian Corollary 1.5 and the Grujić abstract were consistent with the papers. The Section 7 symmetry sentence was their extraction.

The last paragraph still overclaimed: “any highly stretched vortex inevitably flattens and the integral cannot diverge.” That is a mechanism story (what Hou–Li saw on Kerr’s data, what the short boxes did). It is not a theorem. Tao’s averaged equation blows up precisely because a generic quadratic term does not have that cancellation. If the cancellation were proved for the true term, that would be Clay (A). It has not been proved.

### What Deep Research correctly concluded
The laboratory, in its current state of executing track one via numerical grid integration, cannot reach Clay (A) or (B). A finite integral on a discrete grid is neither a proof of global existence nor a proof of breakdown.

---

## 9. Track one and track two

**Track one** is the 32 audit-clean rising draws from `bkm_100_final.json`. Continue each to the first turnover or to \(t=5\), whichever comes first. On every record log \(\|\omega\|_\infty\), the running integral, dealias-tail power, \(R\), \(\|\nabla\xi\|_\infty\) on \(|\omega|>\tfrac12\|\omega\|_\infty\), production \(D\), and the circulation residual. A turnover closes the seed. A maximum still rising at \(t=5\) with \(R\) climbing and the residual small is the only object worth a second grid and a smooth filter. Either verdict is an audit of a box. It is not a proof and not a counterexample. An early `SURVIVED` line with an integral near 0.2 is a short window.

**Track two** is the only track that can touch Clay. Either derive Grujić’s inflow bound \((H_k)\) without axial symmetry, or exhibit smooth data whose direction leaves every cone and every Lipschitz bound while \(\int\|\omega\|_\infty\,dt\) is still finite, and then say what it would take to continue that field. A spectral ensemble is track one. Another thousand random seeds is the same path as Kerr. The only recent method that closed a relative of this problem is the Chen–Hou–Huang computer-assisted profile on a reduced equation with a boundary. Doing that method on the unforced equation, and failing in public when the profile will not close, is a different path.

---

## 10. What is closed

- The filament stack. Under Kelvin it saturates. A cartoon has no velocity.
- The free ladder as a candidate for a different system. It minted circulation.
- The 922× ratio as a statement about a fluid solution. It is arithmetic.
- The polylog schedule as a drop-in for the Mocz stage map.
- The claim that a short spectral box decides regularity or blowup.
- The fabricated eight-seed continuation table from the first Deep Research note.
- The reversed BKM display from that note.
- The claim that phase incoherence on Taylor–Green proves no singularity exists.
- The claim that \((H_k)\) is a theorem. It is a hypothesis under local axial symmetry.
- arXiv:2605.26087v1 as a Navier–Stokes result. It is DiscoverPhysics.

---

## 11. What remains open

- The 32 audit-clean rising draws. They have not been continued to turnover or \(t=5\) with the joint diagnostic logged. That is the unfinished experiment. The device agent was writing the runner when the screenshots were taken.
- Whether the equations propagate a direction condition (Constantin–Fefferman, double cone, VMO, or \((H_k)\) without symmetry). That is track two. It has not been started as an analytic object.
- A computer-assisted self-similar profile for the unforced equation. Not attempted.
- The Section 7 symmetry sentence in the Grujić extraction. Not opened here.

---

## 12. Files produced in this session

- `phase_entropy.py` — computes \(S_{\mathrm{spec}}\), \(S_{\mathrm{phase}}\), \(R\), direction curvature, production \(D\). Includes the locked/opposed/random control.
- `deep-research-handoff.md` — laboratory state for a Deep Research agent, with the \(R\) section.
- `deep-research-plan.md` — eight work packages with papers to open, kills, and deliverables.
- `agent-handoff-eight-seeds.md` — handoff for the device agent. The count was later reconciled to 32.
- `deep-research-prompt.md` — seed plus replacement plan for Gemini Deep Research. Updated to the reconciled 32.
- `navier-stokes-session-full.md` — this file.

---

## 13. Standing rules (enforced throughout)

Do not add a force and report an unforced result. Do not prescribe filament amplitudes. Do not mint circulation. Do not treat Carreau, Oldroyd, or a hyperdissipative term as Navier–Stokes. Do not cite a Zenodo preprint or an unverified quantum claim as a theorem. Do not fit a blowup time on a window that has not turned over. Do not exclude a real seed because a fabricated table used its number. Do not conclude from a short box that no singularity exists. A row without a URL and a page or equation is not a row. A claim that was not opened is UNCHECKED. Do not reverse the Beale–Kato–Majda clock. Do not call \((H_k)\) a theorem. Do not treat Chen–Hou–Huang or a forced construction as progress on (A)/(B) without the distinction.

The next number that matters is the device agent’s 32 rows. Until those exist, there is nothing to call a path.

---

## 14. Earlier sandbox instruments (ns_sandbox/, 4 October 2026)

These files predate the main session and live in `ns_sandbox/`. None is a proof. They are reduced instruments: a stage ladder, a stress test, and a one-stage hyperbolic picture. Every design in them hits two of the three constraints and misses one.

The three constraints a design has to hit together, with no residual force:

\[
\sum_n \Delta t_n < \infty, \qquad
\sigma_n > \nu k_n^2, \qquad
\sum_n e_n < \infty.
\]

### Inventory

| File | What it is |
|---|---|
| `00_INDEX.md` | Index and the three-constraint statement |
| `01_cascade_sandbox.md` / `cascade_sandbox.py` / `cascade_sandbox.png` | Outer layer strains inner layer. Inviscid vs viscous vs retuned |
| `02_stress_cascade.md` / `stress_cascade.py` / `stress_cascade.png` | Same ladder plus BKM integral, energy summability, flatness, tornado budget |
| `03_hyperbolic_strain.md` / `hyperbolic_strain.png` | One stage: stretch one axis, compress the other |
| `04_local_stretch.md` | Self-stretching vs compression. Pressure omitted |
| `05_tilt_stretch.md` / `05_tilt_stretch.py` | Tornado budget: tilt a seed, then stretch it |
| `kill_test_polylog.py` | Polylog schedule kill test |
| `lab_tests_123.py` | Laboratory tests 1–3 |
| `middle_scan.py` | Middle-layer scan |
| `sandbox_report.txt` | Cascade sandbox output |
| `stress_report.txt` | Stress cascade output |

### Cascade sandbox output (`sandbox_report.txt`)

| Run | Stages | \(t\) sum | Killed at | Max amp | Energy end |
|---|---|---|---|---|---|
| Inviscid | 15 | 20.79 | — | \(3.28\times 10^4\) | 1.14 |
| Viscous, same | 2 | 8.66 | 3 | 4.00 | 1.14 |
| Viscous, retuned | 15 | 1.91 | — | \(8.08\times 10^{17}\) | \(3.35\times 10^{20}\) |

### Stress cascade output (`stress_report.txt`)

| Run | Stages | \(t\) sum | Killed | BKM integral | Energy sum | \(A_{\max}\) |
|---|---|---|---|---|---|---|
| Inviscid | 17 | 23.57 | — | \(2.73\times 10^5\) | 1.14 | \(1.31\times 10^5\) |
| Viscous | 2 | 8.66 | 3 | 23.4 | 1.14 | 4.00 |
| Retuned | 13 | 1.91 | — | \(1.00\times 10^4\) | \(6.17\times 10^{17}\) | \(3.31\times 10^{15}\) |
| Energy-aware | 1 | 0.12 | 2 | 0.085 | 1.00 | 1.00 |

Flatness scans (p = 0.2, 0.5, 1.0, 2.0, 4.0): none blew. All ran to \(t=5\) with \(A_{\mathrm{end}}\) between 0.40 and 4.76.

The inviscid ladder completes many stages and the BKM integral grows large, but there is no viscosity. The viscous ladder dies by stage 2–3. The retuned viscous ladder completes stages but the energy and amplitude explode, which is the minted-circulation problem in another form. The energy-aware run dies immediately. These are the same closed door as Section 2, recorded earlier and in more detail.

---

## 15. Complete file inventory of this workspace

| Path | Role |
|---|---|
| `navier-stokes-session-full.md` | This record |
| `phase_entropy.py` | Joint diagnostic: \(S_{\mathrm{spec}}\), \(S_{\mathrm{phase}}\), \(R\), \(\|\nabla\xi\|_\infty\), \(D\) |
| `deep-research-handoff.md` | Laboratory state handed to Deep Research |
| `deep-research-plan.md` | Eight work packages with kills and deliverables |
| `deep-research-prompt.md` | Seed plus replacement plan for Gemini Deep Research |
| `agent-handoff-eight-seeds.md` | Handoff for the device agent (count later reconciled to 32) |
| `ns_sandbox/` | Earlier reduced instruments, 4 October 2026 (see Section 14) |
| `browsed_files/` | Cached page text from a browse during the session |

Nothing else was produced. The 32-seed continuation was not returned.
