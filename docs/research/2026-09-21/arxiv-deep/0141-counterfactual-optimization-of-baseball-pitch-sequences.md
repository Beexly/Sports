# [0141] Counterfactual Optimization of Baseball Pitch Sequences and Estimation of Its Impact on Season-Level Statistics (arXiv:2606.17345)

**Citation:** Takamido, R. & Nakamoto, H. (2026). *Counterfactual Optimization of Baseball Pitch Sequences and Estimation of Its Impact on Season-Level Statistics*. arXiv:2606.17345v1. URL: https://arxiv.org/abs/2606.17345
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, arXiv). Note: ar5iv HTML conversion failed (abstract only); equations in the PDF text extraction are partially garbled (math symbols rendered as `!`); equations below are reconstructed from the surrounding prose and flagged as uncertain where applicable.
**Verdict:** ADAPT — the paper's two-stage counterfactual-optimization framework (micro decision model → regression bridge to season-level stats) is a reusable pattern for NFL coaching-decision counterfactuals even though the baseball specifics do not transfer.

## 1. Research question
Does optimizing pitch selection (both the final "knockout" pitch and the immediately preceding "setup" pitch in a plate appearance) meaningfully improve a pitcher's season-level statistics, and how does the benefit depend on pitcher command? The authors ask counterfactual questions — "which pitch would this same pitcher, in this same game context, have minimized in-play probability on?" — and translate those per-pitch counterfactual gains into season-level K/9, ERA, and opponent slugging percentage changes. (Sections 1–2.2)

## 2. Dataset / schema
- **MLB Statcast pitch-level data, 2018–2025 regular seasons, excluding the shortened 2020 season**, downloaded via the Python package `pybaseball`. Public (Statcast is publicly downloadable).
- Screening: (1) pitchers meeting the minimum innings-pitched requirement per target season; (2) plate appearances ending after two strikes with either a swing-out or a ball put into play in fair territory.
- **100,669 samples (plate appearances) from 265 pitchers** (Section 2.3).
- Train/test: 84,182 samples from 2018–2024 for training; **16,487 samples from the 2025 season for testing**. Validation = 10% of training.
- Per-pitch features (7): horizontal plate location, vertical plate location, effective speed, release spin rate, spin axis, horizontal movement, vertical movement. Sequence = last 6 pitches (zero-padded if fewer); input pitch matrix is 6×7. Vertical location normalized by batter-specific strike zone; horizontal mirrored for left-handed batters.
- Context features (15): ball count, outs, inning, top/bottom indicator, baserunner indicators, score differential (batting-team perspective), times-through-order, plus batter's previous-season stats: K rate, HR rate, ISO, batting average, OPS. Batters with no prior-season stats: values set 10% worse than available-batter averages. Context input = 15×1.

## 3. Method / model
- **Transformer encoder** (Vaswani et al. 2017) as the base predictive model, chosen because a prior study (Kneita 2025) found the Transformer best for pitch-outcome prediction.
- Architecture (Section 2.4): two pathways. Pitch sequence (6×7) → linear projection → learnable positional embeddings → Transformer Encoder blocks (multi-head self-attention, feedforward network, residual connections, layer normalization) → masked mean pooling → dense layer. Context (15×1) → separate dense layer. Concatenated → final dense layer → **sigmoid output: predicted probability of in-play outcome (1) vs swing-out (0)** for the final pitch.
- Hyperparameters (selected by grid tuning, supplementary): embedding dim 256, 4 attention heads, feedforward dim 512, 2 encoder blocks, 64 units in dense layer after concatenation, 32 units in context pathway; LR 1e-4, batch size 512, up to 200 epochs, early stopping on validation AUC (patience 10); binary crossentropy loss, Adam optimizer.
- **Analysis 1 (final-pitch optimization):** for each of 52 test pitchers (min innings), replace the final pitch with every combination of that pitcher's available pitch types (pitcher-specific mean velocity/spin/movement from 2025 seasonal data) × a 6×6 location grid (horizontal: −0.708, −0.425, −0.142, 0.142, 0.425, 0.708 ft; vertical normalized 0.00–1.00 in 0.20 steps), holding the preceding sequence and context fixed. Pick the counterfactual minimizing predicted in-play probability. Aggregate the 6×6 grid into 2×2 areas (high outside, high inside, low inside, low outside) using averaging windows of size 3, 4, 5 (proxying pitcher command). Only samples with the original final pitch in the strike zone included: 8,981 samples.
- **Analysis 2 (setup-pitch optimization):** target = plate appearances where the pitch immediately before the final pitch was a ball (5,680 samples; treated as "setup pitches"). Replace the setup pitch with each available pitch type × ball-zone grid points (narrow window: 8 regions; wide window: 4 regions; Figure 4), holding the final pitch and rest of sequence fixed. Same model scores final-pitch outcome.
- **Season-level translation:** fit linear regressions from each pitcher's mean (adjusted) model output to actual K/9, ERA, oSLG; then estimate Δstatistic = g(mean optimized output) − g(mean original output).

## 4. Equations & assumptions
⚠️ Equations garbled in PDF text extraction; reconstructed from prose — **treat as uncertain in exact notation**. (Section 2.1)
- Eq. (1): predicted in-play probability for pitch *p* — ŷ = f̂(x_p, c), where x_p = pitch feature vector, c = contextual vector, f̂ = trained ML model. Smaller output = higher swing-out likelihood.
- Eq. (2): optimal counterfactual pitch — p* = argmin over p′ ∈ P (feasible alternatives under the same condition) of f̂(x_{p′}, c).
- Eq. (3): season-level statistic estimate — ŝ = g(Θ), where Θ = set of a pitcher's model outputs, g = linear regression function.
- Eq. (4): expected improvement — Δs = ŝ* − ŝ = g(Θ*) − g(Θ).
- Eq. (5) (Section 2.6, also partly garbled): q̂_{x,z} = p̂_{x,z} + λ · SLG_{x,z}, where p̂ = model output for original final pitch at location (x,z), SLG = mean slugging percentage at that location (from 2018–2024 data, computed separately per velocity band × 40 location areas: 36 strike-zone + 4 ball-zone areas), **λ = 1.25** — chosen by scanning λ from 0.0 to 2.0 in 0.25 steps to maximize the sum of absolute correlations across the three season statistics.
- Velocity bands (tertile boundaries of training-data velocity distribution): high >92.5 mph, medium 86.7–92.5 mph, low <86.7 mph.
- Stated assumptions: (1) pitchers' seasonal statistics can be estimated as a function g of their mean model outputs (linearity); (2) replacing a single pitch holds all else fixed (no batter adaptation); (3) ball pitches preceding the final pitch can be treated as intentional "setup pitches"; (4) pitch command proxied by window sizes 3/4/5 on the location grid; (5) plate appearances ending in non-target final pitches (e.g., ball) contribute constant outputs before/after optimization in the season mean — pitchers with more strike-pitch-ending PAs benefit more.

## 5. Features / target
- Inputs: 6-pitch × 7-feature pitch sequence matrix + 15-dim context vector (see Section 2 above).
- **Target:** binary — 1 = final pitch results in a ball put into play in fair territory; 0 = swinging strikeout ("swing out"), for putaway pitches after two strikes. Prediction horizon: the current plate appearance's final pitch.
- Secondary targets for the season-level regressions: K/9, ERA, opponent SLG.

## 6. Validation design
- Time-ordered split: train 2018–2024 (excluding 2020), test 2025 season. Validation = random 10% of train (not time-ordered — minor flaw noted; leakage from within-season learning possible but target is 2025 so train/test is clean).
- Optimal classification threshold chosen by maximizing validation F1 over 0.01–0.99; threshold = **0.43**.
- Test metrics: accuracy, precision, recall, F1, ROC AUC.
- No comparison against simpler baselines (no logistic regression / prior-art comparison reported on the same task — limitation).
- Counterfactual analysis is evaluated via the same model (no ground-truth validation of counterfactual claims — inherent limitation, acknowledged in Discussion).

## 7. Numerical results / baselines
- Base model test performance (2025 season, 16,487 samples; threshold 0.43): **accuracy 0.756, precision 0.755, recall 0.879, F1 0.812, ROC AUC 0.811**.
- Confusion matrix (Table 2): actual in-play — 3,774 predicted in-play, 2,827 predicted swing-out; actual swing-out — 1,194 predicted in-play, 8,692 predicted swing-out.
- Hyperparameter tuning (supplementary, Table S2): best of 8 candidate models was Model 6 (256/4/512/2 blocks/64) with validation AUC **0.808** (candidates ranged 0.801–0.808).
- Pitcher-level mean adjusted-output ↔ season-stat correlations (n = 52): **K/9 r = −0.788; oSLG r = 0.491; ERA r = 0.466** (Figure 5).
- Expected season-stat improvements from final-pitch optimization (window sizes 3, 4, 5): **K/9: +3.54 / +1.80 / +1.26; ERA: −1.28 / −0.65 / −0.45; oSLG: −0.06 / −0.03 / −0.02**.
- Expected improvements from setup-pitch optimization (narrow, wide windows): **K/9: +1.23 / +1.10; ERA: −0.44 / −0.40; oSLG: −0.02 / −0.02**.
- Standard deviations of the 52 target pitchers' season stats: **1.48 (K/9), 0.90 (ERA), 0.04 (oSLG)** — the paper argues improvements are large relative to these spreads.
- Optimized final-pitch type frequencies (Table 3): four-seam 3,063→1,868; sinker 1,399→112; changeup 1,105→2,047; slider 989→1,720; sweeper 758→963; curveball 595→821; cutter 452→611; splitfinger 334→486; knuckle curve 232→183; slurve 27→4; slow curve 7→166.
- Setup-pitch combo shifts (Tables 4–6): "both changed" 2,441→2,847; "neither changed" 1,088→576; middle-velocity setup combos (middle–fast 542→909, middle–slow 420→715) up; LO–LO 1,090→732; HI–LO 386→832.

## 8. Code / data availability
**Code:** https://github.com/takamido/Pitch_sequence_analysis (stated in Data availability statement and Section 2.2). Data: MLB Statcast via `pybaseball` (publicly downloadable). Supplementary hyperparameter tables included in the paper.

## 9. Leakage & limitations
- **Counterfactuals are unvalidated by ground truth** — all gains are measured inside the model's own predictions (a form of model-based fantasy). The authors explicitly flag that estimated effects may be overestimated.
- **No batter adaptation:** optimized strategies concentrate on a few pitch type/location combos (Table 3, Figure 7); batters learning the strategy would erode gains (Bock 2015 predictability finding). Authors acknowledge.
- Window size 3 (best command assumption) shows the largest gains; authors note this may reflect **pitch command improvements, not sequencing** — confounding between the two.
- Optimization only maximizes strikeout; real pitchers also want ground balls/contact management — **single-objective limitation** (authors note).
- Test pitcher-level regressions are fit on **n = 52 pitchers** — small sample for the season-level bridge; correlation → causal translation is fragile.
- Plate appearances ending with balls as final pitches are included at constant outputs — pitchers with more strike-pitch-ending PAs mechanically benefit more.
- Assumption that all preceding balls are "setup pitches" is questionable (many are unintentional misses).
- MLB-only; generalizability to other leagues/levels untested. External validity to NFL: nil at the baseball level; the *framework* (Section 11) is the transferable piece.

## 10. GSE overlap
- Checked against `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. No duplicate: no existing GSE work does pitch-sequence or MLB Statcast modeling. Causal inference is an open lane — the 2026-09-18 ML research brief lists "causal inference" as a commissioned area with **results not yet in repo**, so this paper's framework is additive, not duplicative.
- Related but distinct: FineCausal (2503.23911, already read) is soccer-causal; Garrett's own CEPT lane ("Baxley Causal E-Process Theory", WIP) is Garrett's theory — this paper does not duplicate it and should not be merged with it, only cited as adjacent prior art if CEPT touches counterfactual estimation.
- The two-stage bridge pattern (micro decision model → season-level regression translation) has no existing GSE implementation and is a candidate to port (see 11).

## 11. GSE implementation spec
Transferable pattern: **micro counterfactual optimization → macro stat regression bridge**, applied to NFL coaching decisions.
1. **Data:** nflverse play-by-play (4th-down decision sample) or charting; no tracking needed.
2. **Base model:** gradient-boosted or transformer model predicting drive outcome / WP given pre-play state + decision (go-for-it vs kick/punt), using existing 4th-down features (nfl4th conventions, yardline, score diff, time).
3. **Counterfactual step:** for each historical 4th-down decision, swap the decision and re-score the model holding context fixed; aggregate per-coach/season mean outputs.
4. **Bridge:** regress per-coach season win totals / EPA-per-drive on mean model outputs; estimate Δwins if the coach had made optimal decisions (mirrors Eq. 3–4).
5. **Effort:** ~1 week of engineering reusing the gse-lab metric pipeline; no new data procurement. Caveat: same unvalidated-counterfactual weakness as the paper — present estimates as upper bounds, not promises.

## 12. Reproducible test
- Dataset: nflverse pbp 2020–2025 4th-down plays.
- Baseline: actual coach decisions' predicted WP via a trained per-play model.
- Metric: correlation between per-coach mean model-output gap (optimal vs actual) and coach season EPA/drive; acceptance requires the regression slope to be significant (p<0.05) on a held-out season window (e.g., 2025 coaches).
- Time window: train decisions model 2020–2024, counterfactual-evaluate 2025 season only.

## 13. Acceptance / rejection gate
ADAPT the framework if, on the nflverse 4th-down test: (a) the per-coach optimal-vs-actual output gap correlates with season EPA/drive at |r| ≥ 0.5 on the held-out 2025 window, and (b) the estimated Δwin upper bound is stable across two adjacent held-out windows (2024, 2025). Reject the port otherwise — the paper's own caveats (model-based fantasy, no adaptation) likely bind harder in the NFL.

## 14. Improvement experiment
Run a **multi-objective** version of the paper's Analysis 1 for NFL 4th downs: instead of maximizing one outcome (paper maximizes strikeout), optimize a weighted objective of win probability, EPA, and coverage-risk (bankroll-aware) simultaneously, and compare the single-objective optimum against the Pareto frontier. This tests whether the paper's headline gains survive when the decision-maker has competing objectives — the exact critique the authors raise about pitchers not always aiming for strikeouts — and yields decision-dependent "optimal" play calls usable in GSE's game-plan cards.
