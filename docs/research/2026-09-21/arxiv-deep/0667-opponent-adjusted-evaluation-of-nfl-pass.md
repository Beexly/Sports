# [0667] Opponent-Adjusted Evaluation of NFL Pass Blocking and Pass Rushing Performance (arXiv:2604.01491v1)

**Citation:** Jonathan Pipping-Gamón, Maximilian Gebauer, Victoria Lee, Kenny Watts, Abraham J. Wyner (2026). *Opponent-Adjusted Evaluation of NFL Pass Blocking and Pass Rushing Performance*. arXiv:2604.01491v1. URL: https://arxiv.org/abs/2604.01491v1
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache, `/tmp/arxiv750-cache/fulltext/2604.01491.txt`; all 5 sections + Appendix A in full).
**Verdict:** ADAPT — opponent-adjusted blocker/rusher ratings are a genuinely new GSE capability (not duplicative of STRAIN/PBWR, which lack opponent adjustment), but the predictive gains over strong matchup baselines are tiny (0.24–1.21% relative log-loss) and the data source (proprietary Hudl) is not available to GSE; the honest move is to reimplement the severity-weighted BT on NGS Big Data Bowl tracking data.

## 1. Research question
Can ridge-regularized Bradley-Terry paired-comparison models produce opponent-adjusted, interpretable player-level ratings for NFL offensive linemen (blockers) and defensive pass rushers (rushers) from tracking data, jointly estimated in one interaction-level framework, with a double-team help indicator as a matchup covariate? And does outcome severity (loss/win/hit/sack) add ranking value over a binary win/loss target?

## 2. Dataset / schema
- Source: 2021 NFL regular-season player-tracking data at 10 Hz provided by **Hudl** (proprietary; not public).
- Analysis sample: **153,138 blocker–rusher interactions** across **33,283 pass plays** in **266 games**; 620 rushers, 348 blockers; double-team rate 42.7%.
- Construction: unit of analysis is a blocker–rusher interaction defined from tracking engagement labels; dropbacks retained (forward-pass or sack event); per frame, Euclidean distance between QB and each player; double-team indicator = 1 when multiple blockers assigned to the same rusher in overlapping windows.
- Schema: interaction rows with rusher id, blocker id, double-team indicator, win_target (rusher closer to QB than blocker within 2.5 s of snap), severity_outcome ∈ {loss, win, hit, sack} with severity priority sack > hit > win > loss. Observed frequencies: loss 0.730, win 0.253, hit 0.0109, sack 0.0063.
- Access: proprietary Hudl data — **not replicable by GSE**; nearest public substitute is the NFL Big Data Bowl tracking releases / nflverse (which lacks engagement labels).

## 3. Method / model
- **Win/loss ridge BT:** logit P(Y_t=1) = α + r_{i(t)} − b_{j(t)} + δD_t, Y_t=1 = rusher win under the 2.5 s distance rule; estimated by ridge-penalized logistic regression, argmin_θ {−ℓ(θ) + λ‖θ‖²₂}, λ chosen by CV on a log-spaced grid (λ_min = 1.31×10⁻⁴ for win, 1.17×10⁻⁴ for severity).
- **Severity ridge BT:** multinomial over {loss, win, hit, sack} with η_{t,c} = α_c + r_{i(t),c} − b_{j(t),c} + δ_c D_t; loss is the reference class. Post-fit, class probabilities convert to expected severity via EPA-anchored weights: w(loss)=0, w(win)=0.10, w(hit)=0.20, w(sack)=1.00 (derived from w(o) = (EPA_no-pressure − EPA_o)/(EPA_no-pressure − EPA_sack) using published EPA benchmarks: no pressure 0.233, hurry-only 0.019, hit-only −0.161, sack −1.856).
- Uncertainty: end-to-end game-level bootstrap (B=1000, refit with fixed λ); weekly path bootstrap (B=100) over 18 cumulative checkpoints for trajectory ribbons.

## 4. Equations & assumptions
- Interaction distance: d_{p,t} = sqrt((x_{p,t} − x_{QB,t})² + (y_{p,t} − y_{QB,t})²).
- Binary: logit P(Y_t=1) = α + r_{i(t)} − b_{j(t)} + δD_t.
- Ridge objective: argmin_θ {−ℓ(θ) + λ‖θ‖²₂}.
- Multinomial: P(C_t=c) = exp(η_{t,c}) / Σ_{c′} exp(η_{t,c′}).
- Severity weight: w(o) = (EPA_{no pressure} − EPA_o) / (EPA_{no pressure} − EPA_{sack}).
- Matchup baselines: smoothed player frequencies with prior strength m=25 (win) / m=50 (severity); logit-average combination: p̂_ij^match = logit⁻¹((logit(p̃_i^(R)) + logit(p̃_j^(B)))/2).
- Rank AUC: Mann–Whitney form AUC = (1/(n₊n₋)) Σ_{i:y_i=1} Σ_{j:y_j=0} [1{s_i>s_j} + ½·1{s_i=s_j}].
- Enrichment@K = precision@K / (n₊/n).
- Stated assumptions: engagement labels correctly identify matchups; distance rule approximates functional pressure; severity hierarchy is a valid ordinal scale; double-team indicator captures help structure; unseen players default to global rates.

## 5. Features / target
- Features: player identities (620 rushers, 348 blockers as fixed effects), double-team indicator. (Effectively a pure paired-comparison model; no situational covariates like down/distance/QB.)
- Targets: (1) binary win_target — rusher becomes closer to QB than the blocker within 2.5 s; (2) severity_outcome — most severe realized label among sack > hit > win > loss.

## 6. Validation design
- Deterministic ordered 80/20 split (sorted by game_id, play_id, event_game_index): train 122,510, test 30,628. Time-respecting (no shuffle).
- Baselines: global (train-set marginal rate) and matchup (smoothed player-specific training frequencies, logit-averaged, m ∈ {10,25,50,100} sensitivity check). None condition on the double-team indicator.
- Metric: log-loss (binary) / multiclass cross-entropy (severity), with game-level bootstrap 95% CIs on the improvement.
- External: rank AUC + enrichment@K against 2021 AP All-Pro selections (first team and first+second team), benchmarked against task-matched raw baselines (empirical win rate / empirical severity EV).

## 7. Numerical results / baselines
- Holdout log-loss (Table 1): Win/Global: model 0.5568 vs baseline 0.5636, improvement 0.0068, 95% CI [0.0047, 0.0093]. Win/Matchup: 0.5568 vs 0.5582, improvement 0.0014, CI [0.0005, 0.0024]. Severity/Global: 0.6319 vs 0.6395, improvement 0.0077, CI [0.0049, 0.0106]. Severity/Matchup: 0.6319 vs 0.6333, improvement 0.0015, CI [−0.0000, 0.0031] (overlaps zero — directional only).
- Abstract-reported relative reductions: ~0.24% to 1.21%. Prior-strength sensitivity (Table 5): win improvements 0.0014–0.0019, severity 0.0015–0.0020 log-loss units across m ∈ {10,25,50,100}.
- All-Pro validation (Tables 2–3): severity model leads AUC in 3 of 4 role/accolade slices; largest ΔAUC = +0.150 (severity blocker, first+second team: 0.877 vs 0.727); enrichment@K improvements non-negative in every slice, largest for severity.
- Leaderboards (Table 4, min 200 interactions): severity rushers — Robert Quinn 0.543, T.J. Watt 0.531, Myles Garrett 0.493, Nick Bosa 0.430, Jaelan Phillips 0.429; severity blockers — Joe Thuney 0.258, Corey Linsley 0.255, Tytus Howard 0.250, Dion Dawkins 0.215, Halapoulivaati Vaitai 0.207.

## 8. Code / data availability
Code: https://github.com/WhartonSABI/nfl-elo (stated). Data: Hudl proprietary — no public access.

## 9. Leakage & limitations
- Ordered split is clean; no lookahead in the model. But the matchup baseline's logit-average construction is arbitrary (equal weighting of rusher and blocker terms) — a better baseline could shrink the already-tiny BT gain.
- The 2.5 s distance rule is a proxy, not functional pressure; QB time-to-throw, play design, and coverage are unmodeled; chip help / slide structure only coarsely captured by one indicator.
- Severity weights are anchored to external EPA benchmarks and then rounded to one decimal (0.10/0.20/1.00) — scalar summaries inherit that arbitrariness.
- External validation uses tiny positive sets (K = 5–14); the authors themselves call it "face validation."
- No teammate effects, role specialization, or position-family hierarchy (authors propose hierarchical shrinkage as future work).
- 2021-only data; no test of year-to-year rating stability — the quantity that matters for GSE use.

## 10. GSE overlap
- Existing-research map: STRAIN (2305.10262) already read; pressure rate, PBWR (ESPN), get-off, quick pressure <2.5 s are inventoried in the NGS 27-family taxonomy; nothing in the repo does opponent-adjusted OL/DL ratings. The 2026-09-19 Hermes opp-adj-EPA work is team-level, not player-level trench ratings. **Not duplicative — new capability.**
- NGS is Garrett's top priority lane; opponent-adjusted pressure metrics would feed GSE's QB/dropback EPA projections.

## 11. GSE implementation spec
1. Data: NFL Big Data Bowl tracking (pass-rush week, e.g. 2023/2024/2025 releases); reconstruct blocker–rusher engagement windows from pass-block/pas-rush event annotations; replicate the 2.5 s distance win rule and the loss/win/hit/sack severity coding (sacks/hits from play events).
2. Model: ridge-regularized multinomial BT in Python (sklearn + custom, or PyTorch); double-team/chip indicator from assignment of multiple blockers; λ via grouped CV by game-week (forward-walk, not random folds).
3. Outputs: weekly opponent-adjusted rusher/blocker severity ratings with bootstrap ribbons; feed as matchup features into GSE's dropback-EPA and sack-probability submodels.
4. Effort: 3–4 days for data pipeline (engagement windowing is the hard part), 1–2 days modeling.

## 12. Reproducible test
Dataset: 2023 Big Data Bowl pass-rush tracking week + 2024 weekly NGS-derived pressure data. Protocol: forward-walk by season — fit severity BT on season t, predict season t+1 interaction outcomes. Metrics: multiclass log-loss vs (a) global baseline, (b) smoothed raw win-rate baseline; and Spearman correlation of rusher ratings between consecutive seasons (stability check). Baseline to beat: ≥ 0.5% relative log-loss reduction over the matchup baseline AND season-to-season rating Spearman ≥ 0.50.

## 13. Acceptance / rejection gate
ADAPT (proceed to pilot) only if on the Big Data Bowl replication the severity BT beats the smoothed-frequency matchup baseline by ≥ 0.5% relative log-loss AND rusher ratings correlate ≥ 0.50 across seasons. REJECT as a production input if the log-loss gain is ≤ 0.2% (within the paper's noise band) or ratings are unstable across seasons — in that case the public NGS pressure rate + sack rate suffice and the BT layer adds nothing.

## 14. Improvement experiment
Hierarchical shrinkage over position families (edge vs interior, LT/RT/guard/center) with multi-season pooling, exactly the authors' stated next step; plus a QB time-to-throw interaction term on the win rule (pressure that arrives before the QB's average release is functionally different), and a down/distance-aware severity weight (sacks on 3rd down worth more than EPA-average). Test whether hierarchical pooling raises cross-season rating stability above the 0.50 gate.
