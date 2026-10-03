# [0498] DIAMOND: An LLM-Driven Agent for Context-Aware Baseball Highlight Summarization (arXiv:2506.02351v1)

**Citation:** Jeonghun Kang, Soonmok Kwon (TVING), Joonseok Lee (Seoul National University), Byung-Hak Kim (CJ Corporation) (2026). *DIAMOND: An LLM-Driven Agent for Context-Aware Baseball Highlight Summarization*. arXiv:2506.02351v1. URL: https://arxiv.org/abs/2506.02351v1
**Ledger completed:** 2026-09-21. **Read:** full text (HTML text extract, 1,372 lines, including Appendices A–E).
**Verdict:** ADAPT — port the three-stage pipeline (Preparation: structured logs + sabermetrics → Decision: LLM contextual scoring with sliding-window context → Reflection: user-preference re-ranking) as GSE's automated key-moment selector for NFL content production, swapping baseball WPA/WE/LI for nflverse EPA/WPA/leverage.

## 1. Research question
Can an LLM-driven agent that combines sabermetric scoring (WE, WPA, Leverage Index) with LLM contextual reasoning over structured play-by-play logs select baseball highlights that are both statistically grounded and narratively coherent — beating WPA-only ranking and a commercial system (NAVER AI)?

## 2. Dataset / schema
5 KBO League games (20230616 Doosan–LG, 20230919 SSG–Hanwha, 20240925 Lotte–Kia, 20160409 Hanwha–NC, 20160825 SK–KT): 2 blowouts, 2 close games, 1 comeback. Inputs: structured play-by-play logs (timestamp, inning/half, result, runner state, outs, score differential) + precomputed WE/WPA/LI. Ground truth: manually annotated official broadcast highlights (68–99 plays/game, GT highlight length 7.5–13.5 min). Videos from Naver Sports / TVING. No public dataset release stated.

## 3. Method / model
Three stages. (1) Preparation: game-log standardization; sabermetrics from precomputed tables — WE(s)=W_s/N_s, WPA=WE_after−WE_before, LI=|ΔWE|/Avg(|ΔWE|); LLM contextual analysis per play with sliding window of 5 prior plays + WPA (Mistral-Large-Instruct-2411, 4×A100 via vLLM, temperature 0, top-p 0.1, 10k token limit, constrained prompting). (2) Decision: WPA transformed to 1–60 importance score (≥0.15 abs WPA + late/crucial = 40–60; 0.05–0.15 = 20–39; <0.05 = 1–19); LLM narrative adjustment +1 to +20 (strategic/momentum/visual significance); Leverage Index correction ΔR=R_WPA−R_LI — top rank-difference plays get up to +20 points decreasing 1/rank. (3) Reflection: user preferences (final-inning emphasis, player/thematic focus, comeback/walk-off boosting); top-K selection (K tuned per game, F1 peaks at K≈60). Appendices B.1–B.3 give full prompts.

## 4. Equations & assumptions
(1) WE(s)=W_s/N_s. (2) WPA=WE_after−WE_before. (3) LI=|WE_after−WE_before|/Avg(|WE_after−WE_before|). Scoring: 1–60 WPA bands; adjustment +1..+20; ΔR=R_WPA−R_LI with +20−(rank−1) bonus. Assumptions: WE tables from historical data are stationary; 5-play window captures narrative context; LLM low-temperature decoding is deterministic enough for scoring; top-K with K matched to commercial highlight length is a fair comparison; ground-truth broadcast highlights are the right target (they optimize entertainment, not information); F1 on play-ID overlap measures highlight quality.

## 5. Features / target
Inputs: structured play metadata + WE/WPA/LI + 5-play sliding context window. Target: binary play selection (top-K) matching broadcast ground-truth highlights. Horizon: post-game summarization (not real-time).

## 6. Validation design
5 games, stratified by narrative arc (blowout/close/comeback). Metrics: precision/recall/F1 on play-ID overlap vs ground truth; per-game-type breakdown; K swept 10–90 (peak ~60). Baselines: WPA-only ranking (K matched), NAVER AI commercial system (video-based, proprietary). Ablation: full DIAMOND vs −Reflection vs WPA-only. Qualitative: 3 TVING expert curators, paired preference on 5 criteria (ties=50%).

## 7. Numerical results / baselines
DIAMOND′ (overlapping games): P 0.814 / R 0.886 / F1 0.848. DIAMOND full: 0.748 / 0.846 / 0.793. WPA-only: 0.635 / 0.716 / 0.673. NAVER AI: 0.818 / 0.292 / 0.429 (high precision, misses 70% of key moments). Ablation: −Reflection 0.700 / 0.856 / 0.765 — Preparation+Decision stages give +9.2pp F1 over WPA-only; Reflection adds +2.8pp. Per game type: Blowout1 0.578, Blowout2 0.719, Close1 0.723, Close2 0.842, Comeback 0.680 (close games best; blowouts mixed). Experts preferred DIAMOND on narrative coherence 66.6%, scene diversity 66.6%, informativeness 66.6%, overall 66.6%; key-moment coverage 50/50.

## 8. Code / data availability
Data: game videos/highlights linked in Appendix C (Naver Sports, TVING, YouTube) — not a downloadable dataset. Code: not stated/released. LLM prompts fully specified in Appendix B (reproducible); sabermetric formulas in Appendix A.

## 9. Leakage & limitations
- n=5 games — every headline number (F1 0.848, +9.2pp ablation) rests on five KBO games; no confidence intervals, no significance tests; the "42.9% → 84.8%" abstract claim compares DIAMOND′ (overlapping-game subset) against NAVER on a different K-matching basis.
- Ground truth = broadcast highlights, which are entertainment products — optimizing F1 against them trains the system to mimic TV producers, not to find analytically important plays; circular when "narrative coherence" is both method and metric.
- User study n=3, all TVING employees (the authors' employer) — conflict of interest unaddressed; 66.6% = 2 of 3.
- K tuned per game to match NAVER's video length, then F1 peaks at K=60 — K-selection is post-hoc; a deployed system needs K fixed a priori.
- No fine-tuning; general-purpose Mistral with prompt constraints — hallucination risk acknowledged but unmeasured; scoring bands (1–60, +1..+20, LI bonus) are hand-set heuristics, not learned.
- Post-game only; real-time explicitly out of scope.

## 10. GSE overlap
New capability for the corpus. The map has extensive predictive modeling but nothing on automated content production — no highlight/key-moment selection, no LLM narrative pipeline, no post-game recap automation. GSE is a content operation (@GalaxySportsHQ posts, weekly packets, video scripts): selecting the 8–12 key plays of an NFL game with narrative coherence is currently manual work. The paper's modular design (swap WPA→EPA/WPA, swap prompts) makes the transfer explicit — the authors themselves name the extension pattern. This is a content-tooling ADAPT, not a modeling ADAPT, and should be evaluated on production cost/quality, not predictive metrics.

## 11. GSE implementation spec
(1) Preparation: nflverse pbp → structured play records (quarter, clock, down/distance, score differential, EPA, WPA — nflverse computes wp/wpa; leverage = |ΔWP|/avg|ΔWP| per the paper's LI formula). (2) Decision: importance score from |WPA| bands (recalibrate thresholds to NFL: e.g., |WPA|≥0.08 = high-impact given NFL's ~11% per-play WP swings are rarer than baseball's); LLM (cheap instruction model, temp 0) with 5-prior-play window writes 1–2 sentence narrative justification + strategic adjustment (+1..+10 scaled); LI-correction for high-leverage/low-WPA plays (4th-down stops, goal-line stands). (3) Reflection: GSE preferences — primetime/close-game weighting, star-player focus, upset/comeback theming for X content; top-K (K≈10–12 plays for a recap thread). (4) Output: ranked play list with narrative blurbs → feeds directly into GSE's recap-post and video-script pipeline. Effort: 3–5 days; LLM cost trivial at ~150 plays/game × short prompts.

## 12. Reproducible test
Dataset: 20 NFL games from 2024 (stratified: blowouts/close/comebacks, mirroring the paper) with ground truth = official NFL highlight packages (play lists). Baselines: WPA-only top-K and a naive "top EPA plays" selector. Metrics: precision/recall/F1 vs ground truth (the paper's Table 1 analogue) + blinded human preference (GSE-side reviewer, not the builder) on narrative coherence. Must show: DIAMOND-analogue beats WPA-only on F1 by ≥5pp and wins blinded preference ≥60% — otherwise the LLM layer is decoration over WPA ranking and GSE ships the WPA-only selector.

## 13. Acceptance / rejection gate
ADOPT as a GSE content tool if the NFL port beats WPA-only selection on F1 (≥5pp) and blinded narrative preference (≥60%) on the 20-game test — it then becomes the automated first pass for weekly recap content and clip selection, with human final cut. REJECT the LLM stages if no gain — ship the WPA+LI selector alone (the paper's own ablation shows the statistical stages carry most of the +9.2pp; the LLM's marginal value is unproven at n=5). Either way, do not use it for anything predictive — it selects entertaining plays, not informative ones, and the paper never claims otherwise.

## 14. Improvement experiment
Replace the paper's hand-set scoring heuristics (1–60 bands, +1..+20 LLM adjustments, LI rank bonus) with a learned ranker: train a small model on (play features, LLM narrative embedding) → human preference labels from GSE's own recap-selection history, optimizing pairwise ranking loss against the broadcast ground truth. Hypothesis: learned weights will down-weight the paper's LI rank-bonus heuristic (which double-counts leverage already in WPA) and up-weight narrative-continuity features (the 5-play window), beating the heuristic scorer on F1 — directly testing whether DIAMOND's gains come from its architecture or its hand-tuned constants.
