# [1699] Influence of a Humidor on the Aerodynamics of Baseballs (arXiv:0712.0380)

**Citation:** Meyer, E. R. & Bohn, J. L. (2008). *Influence of a Humidor on the Aerodynamics of Baseballs*. arXiv:0712.0380. URL: https://arxiv.org/abs/0712.0380
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, Sections I–V + references, ~40k chars).
**Verdict**: ADAPT
ADAPT — one sentence: the air-density/drag/lift trajectory physics and the pre/post-intervention difference analysis (Coors Field before/after humidor vs NL baseline) are directly adaptable to NFL altitude/weather kicking models and venue-environment effect estimation, but the measured numbers are baseball-specific (humidity-driven ball mass/diameter changes, curveball break) and cannot be ported as coefficients to a football.

## 1. Research question
Does storing baseballs in a humidity-controlled environment (the Coors Field humidor at 70°F / 50% RH, in use since 2002) materially change the ball's aerodynamics — and hence pitched-ball break and batted-ball distance — relative to balls stored in Denver's dry ambient air (~30% RH)? The authors measure humidity-driven changes in ball diameter and mass, then run trajectory simulations with drag and lift forces to isolate the aerodynamic effect, separate from the already-known coefficient-of-restitution (elasticity) effect studied by Kagan.

## 2. Dataset / schema
- Experiment: 15 MLB baseballs (5 each) stored in airtight containers at 32%, 56%, 74% RH (saturated salt solutions; ±1% RH stability), ~70°F; mass to ±0.1 g, diameter via height gauge to ±0.013 in, 5 orientations per ball; weekly measurements; saturation timescale ~2 weeks.
- Observational (Table 1): Coors Field team stats 7 seasons before humidor (BH) vs 5 seasons after (AH), compared against full-NL averages in the same windows: Rockies ERA, NL ERA at Coors, NL avg ERA, HR/team-game, runs/team-game, avg fly-ball distance (from Baseball-Reference and InsideTheBook).
- Aerodynamic literature: drag-crisis data from Frohlich, Achenbach, Sawicki–Hubbard–Stronge (1996 Olympics), Nathan et al.; lift data from SHS and Nathan.

## 3. Method / model
Two-part: (a) controlled experiment measuring fractional diameter d/d_dry and mass m/m_dry vs RH with linear fits; (b) numerical trajectory integration of the point-mass flight equation **v̇ = −g + (D + L)/m**, restricted to a vertical plane with rotation axis orthogonal to it, using four alternative drag-coefficient profiles (Eq. 3, a double-tanh fit with 7 parameters subject to 2 constraints) and the SHS/Nathan lift model (Eq. 8, piecewise linear in spin parameter S). Two scenarios simulated: curveball break (horizontal launch, 72–88 mph, release 6.25 ft height / 53.5 ft from plate) and batted-ball range (optimally struck ball, 35–45 m/s exit at 24.3°). Separately, Kagan's coefficient-of-restitution measurements are folded in for the net effect on batted distance.

## 4. Equations & assumptions
- Drag: **D** = −½ρ C_D A v² **v̂** (Eq. 1); Reynolds number ℛ = vd/ν (Eq. 2); C_D(ℛ) = a + b·tanh((ℛ−ℛ_d)/Δ_d) + c·tanh((ℛ_u−ℛ)/Δ_u) (Eq. 3).
- Lift: **L** = −½ρ C_L A v² **v̂**×**ω̂**_b (Eq. 6); spin parameter S = rω_b/v (Eq. 7); C_L = 1.5S for S<0.1, = 0.09+0.6S for S>0.1 (Eq. 8).
- Flight ODE: **v̇** = −**g** + (**D**+**L**)/m (Eq. 9).
- Lift-acceleration decomposition: Δa_L/a_L^s = ΔC_L/C_L^s + ΔA/A^s − Δm/m^s = 3Δd/d^s − Δm/m^s (Eqs. 11–12); drag analogue: Δa_D/a_D^s = ΔC_D/C_D^s + ΔA/A^s − Δm/m^s (Eq. 14).
- Denver atmosphere: ρ = 0.91809 kg/m³ (vs 1.0793 kg/m³ sea level) at 70°F; ν = 2.095×10⁻⁵ m²/s (vs 1.8263×10⁻⁵ at sea level).
- Assumptions: 2D planar motion; seam-orientation effects ignored; "standard" ball = 9.125 in circumference, 5.125 oz; collision handled via Kagan/Nathan–Cross bat-ball model with same swing for dry vs humid balls; drag-crisis curves are approximate fits shifted for Denver air.

## 5. Features / target
Features: storage RH (30% dry vs 50% humidified), ball diameter/mass changes, initial velocity/spin, air density (Denver vs sea level). Targets: (a) Δy = y^s − y^d, relative curveball arrival height (break) at the plate; (b) Δx = x^s − x^d, relative batted-ball range.

## 6. Validation design
Not ML — physics study. Experimental validation: linear fits of d/d_dry and m/m_dry vs RH from 3 humidity levels × 5 balls (reported with saturation curves). Trajectory validation: robustness across four drag profiles (smooth, Frohlich sand-roughened, SHS, Nathan); qualitative consistency with observed Coors Field fly-ball distance change. Observational check: BH vs AH Coors stats vs NL-wide control.

## 7. Numerical results / baselines
- Humidity response (linear fits): diameter +0.012% per %RH → **+0.24%** from 30%→50% RH; mass **+0.08% per %RH → +1.6%** for 30%→50% RH; ball density **+0.9%**. RH-driven size change is *smaller* than the variation already allowed by MLB rules.
- Aerodynamics alone: drier ball breaks **more** (Δy > 0 at all pitch speeds), by at most **0.25 in**; fractional lift acceleration Δa_L/a_L^s ≈ **−0.88%** (dry breaks more because mass loss dominates area loss).
- Batted balls (aerodynamics only): humidified ball travels ~**2 ft farther** (Δa_D/a_D^s ≈ −1.12%, mass effect wins over area).
- Net with restitution (Kagan: −6 ft per 20% RH increase): humidified ball travels **~3–4 ft less** overall (Fig. 7; not exactly additive due to nonlinearity).
- Coors Field BH→AH (Table 1): HR/team-game 1.59→1.26 (**−0.33**), runs/team-game 6.94→5.87 (**−1.07**), avg fly-ball distance 323→318 ft (**−5 ft**), Rockies ERA 6.14→5.34 (−0.80); NL-wide changes ≈ 0 in all categories.
- Grip channel: only **+0.9% extra spin** (Δω/ω^s) on humidified balls would be needed to overcome the aerodynamic break deficit — offered as the likely real mechanism.

## 8. Code / data availability
None stated (no code, no data release).

## 9. Leakage & limitations
- Baseball-specific: drag-crisis curves, C_L(S) relation, and RH mass/diameter response all measured on baseballs; nothing here transfers numerically to a tumbling NFL football.
- 2D planar trajectories; seam orientation ignored; prevailing Denver winds (Chambers et al.) not modeled — authors flag this as needed future work.
- Drag-crisis profiles are approximate fits from disparate sources, shifted for Denver air; SHS vs Nathan disagree on crisis magnitude, and the batted-range result is sensitive to the profile choice near 40 m/s.
- Observational Table 1 is explicitly non-causal: roster quality, 2001 strike-zone enlargement, and other confounders can't be separated; NL-wide averages used as control.
- Net ~4 ft effect is small relative to natural ball-to-ball variation (Fig. 2: allowed rulebook variation exceeds the RH effect).

## 10. GSE overlap
New capability, not duplicate. Per the existing research map, GSE has **no verified travel/altitude coefficient** — only an inventory mention of wind/weather. This paper's Eq. 9 trajectory framework (drag ∝ ρAv²/m) is the physics template for a Denver-altitude kicking model (FG/punt distance), and its BH-vs-AH-vs-league difference design is the template for estimating venue environment effects (e.g., pre/post rule or surface changes) with a league control. Complements ledger 1578 (soccer-ball altitude aerodynamics) with the observational difference-in-differences half that 1578 lacked. No overlap with GSE's barometric-pressure totals benchmark.

## 11. GSE implementation spec
- Module `weather/kick_physics.py` in the Sports repo: implement flight ODE (Eq. 9) for an NFL football as a tumbling spheroid; drag-only (C_L ≈ 0 for end-over-end kicks, Magnus small) with C_D from football wind-tunnel literature; ρ from stadium altitude + game-time temp/pressure (same ideal-gas inputs as 1578's Eqs. 10–11).
- Use the paper's key structural insight: the fractional-acceleration decomposition (Eq. 12/14 form) — for kicks, Δa_D/a_D = Δρ/ρ + ΔA/A − Δm/m — to get a closed-form altitude distance modifier without full simulation: Denver ρ ≈ 0.92 vs 1.08 kg/m³ sea level ≈ **15% less drag acceleration** on the ball.
- Second deliverable: `weather/venue_effects.py` implementing the Table-1 design — for any venue change (surface, roof, altitude move), compute before/after team stat deltas vs league-wide deltas in matched windows, with year-to-year variance as the uncertainty (paper's stated method).
- Effort: ~3 days (ODE solver + calibration on nflverse punt hang-time/distance; venue-effect harness).

## 12. Reproducible test
Dataset: nflverse 2020–2025 FG attempts (distance, make/miss, stadium) + punt distances, with stadium altitude and game-time temp/pressure. Baseline: logistic FG make model on distance only. Test: add paper-style ρ-based effective-distance adjustment (kick at altitude/temp → sea-level-equivalent distance via the 15% drag-acceleration scaling). Metric: log-loss on 2024–2025 holdout. Apply the venue-effect estimator to Denver home games: expected sign = positive distance premium, magnitude consistent with ~15% drag reduction.

## 13. Acceptance / rejection gate
ADOPT the altitude feature if the ρ-adjusted model improves log-loss by ≥ 0.002 on the 2024–2025 holdout AND the Denver coefficient is directionally correct (distance premium) — this would be GSE's first verified altitude coefficient. REJECT if no improvement: football-shape drag or weather-API noise likely swamps the physics.

## 14. Improvement experiment
Extend the paper's two missing pieces the authors themselves flag: (a) add a spatially varying wind field inside the stadium bowl (wind shielding by stands) to the ODE, validating against actual FG miss direction data (left/right/upright hits) from charting — tests whether bowl geometry explains residual kicking variance beyond air density; (b) run the venue-effect estimator on dome→outdoor and turf→grass transitions across the league to build a venue adjustment table for totals. If wind-shielding explains residual FG variance, GSE gets a stadium-specific kicking edge nobody models.

**Verdict:** ADAPT — the drag/lift trajectory framework and the before-after-vs-league venue-effect design are directly portable to NFL altitude kicking and venue environment modeling, but all measured coefficients are baseball-specific and must be re-estimated for a football.
