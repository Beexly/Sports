# [2134] Chronos-2: From Univariate to Universal Forecasting (arXiv:2510.15821v1)

**Citation:** Abdul Fatir Ansari, Oleksandr Shchur, Jaris Küken, Andreas Auer, Boran Han, Pedro Mercado, Syama Sundar Rangapuram, Huibin Shen, Lorenzo Stella, Xiyuan Zhang, Mononito Goswami, Shubham Kapoor, Danielle C. Maddix, Pablo Guerron, Tony Hu, Junming Yin, Nick Erickson, Prateek Mutalik Desai, Hao Wang, Huzefa Rangwala, George Karypis, Yuyang Wang, Michael Bohlke-Schneider (2025). *Chronos-2: From Univariate to Universal Forecasting*. arXiv:2510.15821v1. URL: https://arxiv.org/abs/2510.15821
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `timeseries_foundation`.
**Verdict:** ADOPT — group attention over targets+covariates with a 21-quantile head, SOTA on three benchmarks with 0% leakage and 3.6s runtime, is the closest thing in this lane to a deployable GSE probabilistic forecaster; fine-tune on the sports pile and wire its quantiles into pricing.

## 1. Research question
Can a pretrained model handle univariate, multivariate, and covariate-informed forecasting in one zero-shot model — via in-context learning across grouped series — and beat existing TSFMs on all three?

## 2. Dataset / schema
- **Training:** synthetic datasets imposing diverse multivariate structures on univariate series + real pretraining data (Chronos lineage); heterogeneous batches mixing univariate, multivariate, and covariate-informed tasks.
- **Evaluation:** three benchmarks — **fev-bench** (multivariate + covariate-informed tasks), **GIFT-Eval**, **Chronos Benchmark II**; energy and retail case studies. Public benchmarks.

## 3. Method / model
- **Group attention:** a transformer layer that aggregates information across series in the same *group* at each patch index; a group = related series (few-shot), variates of a multivariate series, or targets+covariates. Group IDs → 2D attention mask; no positional embeddings within the group layer (series have no natural order).
- **Pipeline:** robust scaling → time-index + mask meta-features → non-overlapping patches → alternating time-attention and group-attention layers.
- **Quantile head:** direct multi-step forecast Ẑ ∈ ℝ^{H×D×|Q|} over **21 quantiles Q = {0.01, 0.05, 0.1, …, 0.9, 0.95, 0.99}** — extreme quantiles (0.01/0.99) for tail risk, anomaly detection, risk-aware forecasting.
- **Training:** quantile regression loss (Eq. 4); two stages — pretrain at context 2048, then extend to **8192** with more output patches (long seasonalities, long horizons without heuristics).
- **Model:** base 120M parameters evaluated in the paper.

## 4. Equations & assumptions
- Quantile loss: L = Σ_{q∈Q} [q·max(z−ẑ^q,0) + (1−q)·max(ẑ^q−z,0)], averaged over steps/items, computed on target dims only (covariate/missing entries excluded).
- Group mask: attention allowed iff group_id[i] == group_id[j]; future-input observation mask W tells the model the task setup (univariate vs. covariate-informed).
- Assumptions: robust scaling handles outliers; group attention's O(G²) cost is manageable for small groups (a game's targets+covariates ≈ 10–20 series — fine); 21-quantile grid approximates the full distribution; synthetic multivariate structure transfers to real covariate relationships.

## 5. Features / target
Input: groups of series — targets, past-only covariates, future-known covariates — with role annotations. Target: 21-quantile joint forecast over horizon × target dims. Native multivariate probabilistic.

## 6. Validation design
fev-bench (avg win rate + skill score vs. scaled quantile loss, median runtime, leakage %, failures), GIFT-Eval, Chronos Benchmark II; baselines: TiRex, TimesFM-2.5, Toto-1.0, COSMIC, Moirai-2.0, Chronos-Bolt, TabPFN-TS, Sundial, statistical ensemble, AutoARIMA/ETS/Theta, naive variants. Leakage % explicitly measured per model.

## 7. Numerical results / baselines
fev-bench (Table 3; win rate / skill / runtime / leakage / failures):
- **Chronos-2: 90.7% / 47.3 / 3.6s / 0% / 0** — top on win rate and skill, zero leakage, zero failures.
- TiRex 80.8/42.6/1.4s/1%/0; TimesFM-2.5 75.9/42.3/16.9s/8%/0; Toto-1.0 66.6/40.7/90.7s/8%/0; COSMIC 65.6/39.0/34.4s/0%/0; Moirai-2.0 61.1/39.3/2.5s/**28%**/0; Chronos-Bolt 60.3/38.9/1.0s/0%/0.
- Read: Chronos-2 leads by ~10 pts of win rate over the next best; Moirai-2.0's 28% leakage disqualifies its score; TimesFM-2.5/Toto carry 8% leakage. SOTA on all three benchmarks; covariate tasks won "by a wide margin."

## 8. Code / data availability
AWS Chronos lineage — weights and code via the authors' release (verify at implementation; Chronos GitHub/Hugging Face org). Benchmarks public (fev-bench, GIFT-Eval, Chronos Benchmark II).

## 9. Leakage & limitations
- The paper's own leakage column is a strength (0% for Chronos-2) but an indictment of the field: competitors' scores are inflated — GSE must apply the same leakage auditing to its own evaluations (cf. 2133).
- 120M params, 3.6s median runtime per task — fine for batch, heavy for real-time per-game refresh across hundreds of props.
- Group attention is O(G²) in group size; scaling to full player-prop groups (dozens of players × stats) needs group-size discipline.
- Synthetic multivariate pretraining structures may not match sports covariate relationships (weather→total is not like promo→retail) — fine-tuning on real sports groups required.
- 21 quantiles ≠ full distribution; key-number discreteness still unmodeled (cf. 2126's improvement experiment).

## 10. GSE overlap
No Chronos-2/TSFM in the GSE corpus. This is the multivariate, covariate-native, leakage-clean flagship of the lane — it subsumes the univariate Chronos (2123) story and the covariate problem (2127) in one model. GSE's engine has no joint spread/total/prop distribution; Chronos-2's group mechanism (one group = one game: margin + total + QB/RB/WR stat targets + weather/rest/injury covariates) is the architecture for consistent cross-market pricing.

## 11. GSE implementation spec
1. **Group design:** one group per game = targets (margin, total, key player stat lines) + past covariates (rolling EPA, line history) + future-known covariates (weather forecast, rest, travel, dome, starters). Roles annotated per the paper's scheme.
2. **Fine-tune:** Chronos-2-base (120M) on NFL/NCAA game groups 2002–2024 with SFF init (2130), expanding seasonal windows; quantile loss as in Eq. 4.
3. **Serving:** batch inference per game → 21-quantile joint distributions → consistent spread/total/prop pricing from one model (no cross-model disagreement); 3.6s/task × ~16 games ≈ 1 min per slate — acceptable for batch, optimize for live.
4. **Calibration:** empirical coverage of the 21-quantile grid on holdout; conformal adjustment (Mimo lane) as a post-hoc layer if needed.
Effort: 3–5 engineer-weeks (group pipeline + fine-tune + pricing integration).

## 12. Reproducible test
Dataset: NFL 2015–2024 game groups (targets + covariates as above). Test: 2022–2024 walk-forward; forecast margin + total + 3 player stat lines jointly, horizon 1 game. Metric: mean scaled quantile loss (win rate vs. seasonal naive per fev-bench) + CRPS per target; must beat independent univariate fine-tuned models (2123/2126) on joint skill. Baselines: Chronos-2 zero-shot, Moirai fine-tuned, GSE engine. Leakage audit: the paper's leakage-% methodology applied to GSE's own pipeline — any feature with post-kickoff information = fail.

## 13. Acceptance / rejection gate
ADOPT for joint game pricing if fine-tuned Chronos-2 beats the best univariate-per-target baseline on joint scaled-quantile-loss skill over 2022–2024 AND its 80%/95% interval coverage is within ±4 pts of nominal on every target; ADAPT further (group redesign, longer fine-tune) if it wins on skill but misses coverage on any target; REJECT for live pricing if joint skill ≤ independent baselines (grouping adds nothing) or any leakage-audit flag fires. Zero-shot weights alone are never sufficient evidence (familiarity caveat, 2133).

## 14. Improvement experiment
Cross-game groups: the paper's groups are within-task series; test *cross-game* groups — all games in a slate as one group with shared week-effects (weather systems, referee crews, market sentiment) via group attention, forecasting the full slate jointly. Hypothesis: slate-level group attention captures correlated week effects (e.g., a windy Sunday suppressing totals league-wide) that per-game groups miss — measurable as improved total-CRPS on high-weather-variance weeks specifically.
