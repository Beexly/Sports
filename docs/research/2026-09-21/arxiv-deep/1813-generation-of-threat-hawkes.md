# Ledger 1813 — Generation of Threat: Crediting Football Players for Creating Dangerous Actions in an Unbiased Way

## 1. Citation and explicit full-text-read statement

- **arXiv:** 2304.05242
- **Title:** Generation of Threat: Crediting football players for creating dangerous actions in an unbiased way
- **Authors:** Ali Baouan, Sebastien Coustou (Parma Calcio 1913), Mathieu Lacome (Parma Calcio 1913), Sergio Pulido, Mathieu Rosenbaum
- **Full-text-read statement:** I read the complete paper full text (abstract, introduction contrasting Markovian xG/xT with history-dependent modeling, Hawkes process definitions with branching-matrix stability, 12-dimensional point-process construction with the 5 data-processing rules, immigration–birth representation and Proposition 2.1, the four GoT index definitions, MLE with exponential kernels including the non-concavity remark, the simulation study with horizon/accuracy table, Chelsea 2016–17 analysis with GoT table and standard errors, Ligue 1 2021–22 player ranking table, central-defender GoT ranking, and references) from the extracted text at `/tmp/wave4b-dfs2/txt/2304.05242.txt` (HTML saved to `/tmp/wave4b-dfs2/papers/2304.05242.html`). Raw paper text remains in `/tmp`; nothing was committed to the repo.

## 2. Research question

Who should be credited for a dangerous action — the shooter, the assister, or the defender whose pass started the move five touches earlier? Can Hawkes processes on ball-touch event streams attribute threat creation to players *through* interaction chains (not just the final action), in a way that surfaces undervalued contributors?

## 3. Method/model

- Build a **12-dimensional Hawkes process** per team: 11 dimensions = ball touches by the player in each formation position; 12th dimension = **threat events** (ball entering the danger area: box covering 50% of pitch width × 25% of length near the opponent goal).
- **Exponential kernels**; MLE per dimension-separable likelihood (Ogata), fixing a common decay β (Bonnet et al. 2022b) to tame non-concavity.
- Use the **immigration–birth representation**: each touch is an "individual" generating offspring touches/threats; the branching matrix Γ gives expected direct children; (I−Γ)⁻¹ gives expected total descendants (Proposition 2.1).
- **Four GoT indices:** GoTᵈⁱʳ (per touch, direct: Γ_{i→threat}); GoTⁱⁿᵈ (per touch, total via (I−Γ)⁻¹); GoT₉₀ (per 90 min, direct × expected touches); GoT₉₀ (per 90 min, leave-one-player-out: expected threats with vs. without the player).

## 4. Mathematics, equations, assumptions

- Intensity: λᵢ(t) = μᵢ + ΣⱼΣ_{tₖʲ<t} αᵢⱼ exp(−β(t−tₖʲ)); branching matrix Γᵢⱼ = αᵢⱼ/β; stability: spectral radius ρ(Γ) < 1.
- GoTᵈⁱʳᵢ = Γ_{threat,i}; GoTⁱⁿᵈᵢ = [(I−Γ)⁻¹]_{threat,i}; GoT₉₀,ᵢ = GoTᵈⁱʳᵢ × E[touchesᵢ]; GoT₉₀,ᵢ = E[threats] − E[threats | row/col i of (K, μ) zeroed].
- **Assumptions:** (a) exponential decay of influence (seconds-scale); (b) concatenation of games into one process is harmless given fast decay; (c) same formation cluster across games (4 formation clusters defined); (d) set-piece crosses excluded to avoid designated-taker bias; (e) opponent possession time compressed to ~12 s.

## 5. Dataset/schema

- **StatsPerform F24 event files**: Chelsea 2016–17 (13 games, stable 3-4-3 XI); Stade Rennais 2021–22 (appendix); **Ligue 1 2021–22** player ranking.
- Schema: timestamped ball touches per formation position + threat timestamps.

## 6. Features and target

- **Features:** ball-touch event histories per position.
- **Target:** threat-event intensity and its attribution to positions/players (GoT indices); simulation target = branching-matrix recovery accuracy.

## 7. Validation design

- **Simulation study:** synthetic 12-dim Hawkes processes over horizons 300–2,400 min; metrics: false-positive link rate, false-negative error, weighted MAPE of Γ.
- **Empirical:** Chelsea case study with Monte-Carlo standard errors (parametric bootstrap: simulate from fitted params, refit); face-validity checks (Hazard top, Kanté's box-to-box role recovered); Ligue 1 ranking sanity.

## 8. Exact results and baselines with numbers

Simulation accuracy vs. horizon:

| Horizon (min) | False positive | FN error | Rel. error |
|---|---|---|---|
| 300 | 3.1% | 0.0094 | 27.0% |
| 600 | 0.4% | 0.0063 | 18.6% |
| 1,200 | 0.0% | 0.0043 | 13.4% |
| 2,400 | 0.0% | 0.0030 | 9.5% |

→ **~600 minutes** suffices for reliable estimation.

Chelsea GoT₉₀ (SE): Hazard **14.2 (2.02)**; Moses 5.7 (1.47); Pedro 5.5 (1.22); Kanté 6.2 indirect (1.40) — ranked 4th, evidencing his danger-creation role beyond defense. GoTᵈⁱʳ per touch: Hazard **0.16 (0.020)**.

Ligue 1 2021–22 GoT₉₀ top-20 includes surprises: Berthomier **9.34** (10th), Moses Simon **8.79** (15th), Frédéric Guilbert **8.42** (18th) — a right-back ranking with attackers. CB ranking: Marquinhos **5.625 (0.805)** #1.

## 9. Code/data availability

- No public code URL was given in the extracted text.
- Data: StatsPerform F24 (proprietary).

## 10. Leakage and limitations

- Requires ≥ ~600 minutes of stable-XI, stable-formation data — restrictive for mid-season role changes.
- 90 minutes of *processed* time ≠ 90 match minutes (possession concatenation) — the per-90 indices need careful interpretation.
- Opponent quality not modeled; PSG defenders' GoT is inflated by team dominance (authors acknowledge).
- GoT₉₀'s leave-one-out is a model-based counterfactual, not an observed experiment.
- Remark 2.3: naively multiplying GoTⁱⁿᵈ by touches double-counts circuits — the paper's own formulas must be followed exactly.

## 11. GSE overlap

- This is GSE's **sequence-credit assignment** engine: the immigration–birth attribution is the principled way to credit NFL players for *generating* scoring opportunities through chains — e.g., a WR whose motion/decoy creates the coverage bust two plays before the TD, or an offensive lineman whose block springs the run that sets up play-action.
- Directly portable: 12th dimension = red-zone entry (or explosive play) instead of danger-area entry; positions = NFL personnel groupings.
- The 600-minute reliability threshold gives GSE a sample-size rule for when sequence-credit ratings are trustworthy.

## 12. Implementation specification

1. **Inputs:** GSE's NFL event data — ball-touch equivalents (targets, carries, key blocks if charted) per personnel slot + red-zone-entry/explosive-play timestamps.
2. **Process construction:** mirror the 5 rules (threat = red-zone entry; compress opponent possessions; exclude kneel-downs/set-piece analogs).
3. **Fit** 12-dim Hawkes with exponential kernels, common β, per-dimension MLE.
4. **Compute** the four GoT analogs per player; SEs via parametric bootstrap.
5. **Use:** sequence-credit features in fantasy projection models (especially for TEs/FBs/offensive role players whose box scores understate contribution); weekly "hidden threat generators" content for the DFS packet.

## 13. Reproducible test

- Replicate the simulation: 600-min horizon; require false-positive rate ≤ 1% and relative Γ error ≤ 20%.
- On GSE NFL data: require the top GoT₉₀ players to include known offensive engines (face validity) plus at least one non-box-score contributor in the top 20 (the "Guilbert test").

## 14. Numeric acceptance/rejection gate and improvement experiment

- **Gate (ADAPT):** simulation shows reliable estimation from 600 min (0.4% FP, 18.6% rel. error); Chelsea/Ligue 1 case studies recover both stars (Hazard 14.2) and hidden contributors (Guilbert 8.42, Kanté 4th). Accept as ADAPT (not ADOPT: proprietary data, team-strength confounding, processed-time interpretation caveats).
- **Improvement experiment:** add opponent-strength and game-state covariates to the baseline intensities μᵢ (marked Hawkes), and model the threat dimension with a position-varying danger-area definition. Success = CB/team-confounding reduced (PSG defenders' GoT drops toward the Aguerd/Omari tier) while Hazard-tier offensive rankings stay stable.

**Verdict:** ADAPT — Hawkes-process threat attribution through interaction chains with four GoT indices; adopt as GSE's sequence-credit engine for red-zone-entry/explosive-play generation (porting the 12th dimension to NFL), with opponent-adjusted baselines as the improvement path.
