# [0529] DashArena: Benchmarking LLMs on Interactive Analytic Dashboard Generation (arXiv:2608.10567v1)

**Citation:** Xiaotong Wang, Dazhen Deng (2026). *DashArena: Benchmarking LLMs on Interactive Analytic Dashboard Generation*. arXiv:2608.10567v1. URL: https://arxiv.org/abs/2608.10567v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 48168 chars).
**Verdict:** REJECT — an LLM code-generation benchmark for analytic dashboards; no math, model, or dataset transfers to NFL team-rating prediction.

## 1. Research question
How can open-ended, task-grounded generation of interactive analytic dashboards by LLMs be benchmarked? The paper argues neither static appearance nor execution-only checks capture analytical support and interaction quality, and proposes DashArena: candidates generate both a dashboard and a replayable interaction trajectory; a browser executor replays the trajectory into reproducible evidence, and a VLM judge compares candidates pairwise, with Bradley–Terry aggregation into a leaderboard.

## 2. Dataset / schema
Tasks seeded from Tableau Public crawled dashboards (sorted by popularity); required artifacts per entry: metadata, page screenshots, workbook XML files (dashboard structure + interaction actions), and tabular data. After filtering (complete artifacts, ≥2 usable views, non-tutorial, analytical), deduplicated by underlying-data similarity → 234 tasks spanning 14 topic clusters. Evaluation split: 120 held-out tasks for the main leaderboard. Human calibration set: 100 stratified candidate pairs (75 model–model, 25 human–model) across 50 tasks. Judge-training: 300 teacher-labeled pairs from 114 tasks (255 train / 45 held-out judge-test, augmented 2× to 510 SFT examples by A/B swapping). Public release promised; original Tableau assets remain under creator rights/platform terms. No sports or NFL data whatsoever.

## 3. Method / model
Protocol: (1) task derivation — Claude Opus 4.6 reads reference pages + schema + workbook interactions and writes a natural-language task brief (analytical intent, not reproduction). (2) Two-turn candidate generation — model returns one complete HTML dashboard (ECharts, stable data-test-id attributes), then authors a JSON interaction trajectory (ordered steps: action type, target, natural-language intent, expected visual change; supports setting/typing/clicking controls, clicking chart marks, brushing, tab switching). (3) Playwright executor validates the JSON, loads Chromium, replays each action with fixed delays, records action errors and changed-component signatures (control values/checked states, text content, chart container text/visibility/geometry). Report two deterministic validity measures: renderable (loads cleanly, non-blank screenshot) and replayable (renderable + schema-valid trajectory, all actions execute, screenshots captured). (4) VLM pairwise judge takes task + schema + screenshots + execution reports → structured A/B/tie preference with rationale. (5) DashJudge-8B distilled from Claude Opus 4.6 teacher: Qwen3-VL-8B-Instruct, LoRA rank 16, scale 32, dropout 0.05, lr 1e-4, batch 8, cosine schedule, 2 epochs, ~50 min on one 80 GB A100. (6) Bradley–Terry aggregation over directional comparisons → leaderboard scaled 1000 + 400·θ, task-bootstrap 95% CIs.

## 4. Equations & assumptions
The only equation stated is the Bradley–Terry pairwise model: P(i≻j) = σ(θᵢ − θⱼ) (logistic link). All BT theory is inherited from Bradley and Terry (1952); no new mathematics is derived. Assumptions: (i) generator-authored trajectories are treated as executable documentation — model declares actions/expectations, executor verifies, judge assesses; (ii) trajectory analytical value/coverage is judged, not just execution success; (iii) human Tableau baseline's author-trajectory is protocol-valid (hand-verified schema-valid), not programmatically replayed against Tableau.

## 5. Features / target
Inputs to judge: task instructions, dataset schema, page-level screenshots, trajectory execution reports. Candidate input: task document + data schema. Target: pairwise preference (A better / B better / tie) per candidate pair on the same task. No predictive modeling of any outcome variable.

## 6. Validation design
Judge validation: 6 independent annotators, 100 stratified pairs, 3 annotations each → 99 evaluable pairs (Fleiss κ = 0.384 among annotators; 2.7% of annotations chose tie; 52 unanimous pairs). Leaderboard: 3,325 directional comparisons on 120 held-out tasks after filtering incomplete evidence/invalid outputs. Robustness: BT vs Thurstone–Mosteller (Gaussian link) vs average-win-rate aggregation (identical 8-model order); task-equal and topic-equal weighting; leave-one-topic-out (τ ≥ 0.857 vs full ranking); task-subsampling stability (mean τ = 0.810 at 25 tasks, 0.867 at 50, 0.945 at 100; top model/top-three recovered 100% of 300 100-task samples). No train/test split concerns for models themselves — it is an evaluation benchmark, not a learned predictor.

## 7. Numerical results / baselines
- Judge reliability (Table 2, human agreement on 99 pairs): base Qwen3-VL-8B-Instruct 70.7% (κ=0.419); proprietary teacher Claude Opus 4.6 78.8% (κ=0.590); DashJudge-8B 79.8% (κ=0.600). Teacher-test held-out accuracy: 88.9% on 45 pairs.
- Interaction-evidence ablation (Table 3): task+screenshots only 71.7% (κ=0.441) vs +interaction evidence 79.8% (κ=0.600) — +8.1 points, +0.159 κ.
- Deterministic rules alone: full lexicographic rule reaches 42.4% (κ=0.095); renderability/replayability alone ties on 89 of 99 pairs (8.1% agreement).
- Trajectory audit (100 candidates): 99.8% valid trajectory targets; per-page control coverage 80.8% (CI 75.0–86.3); 96.0% all pages visited; authored-control downstream response 90.1% vs unauthored 86.0%; 841 authored steps → 97.3% attributable evidence; 93.3% agree with declared intent, 6.7% expose candidate/trajectory errors.
- Leaderboard: GPT-5.5 first (CI overlaps human baseline); human baseline and GLM-5.2 next with overlapping uncertainty; Claude Opus 4.6, DeepSeek V4 Pro, Gemini 3.5 Flash, Kimi K2.7 Code middle tier; Grok 4.3 last.
- Deterministic reliability (Table 5): no model exceeds 86% render rate or 74% replay rate. GPT-5.5: 85.8%/73.3%; Claude Opus 4.6: 82.5%/72.5%; GLM-5.2: 74.2%/54.2% (high preference rank, low functional reliability).
- Failure audit (100 candidates, 86 tasks): of 70 signal-enriched, 95.7% contain a confirmed model-attributed defect (26.9% construction/runtime, 25.4% interaction fulfillment, 22.4% data computation/binding, 16.4% presentation, 9.0% analytical fulfillment); 21 of 30 execution-clean candidates still contain defects deterministic checks cannot detect.
- DashJudge-8B data scaling (Table 7): 64 pairs recover most gains (76.8%); 255 pairs → 79.8%, κ=0.600, mirror consistency 93.9%. A/B swap augmentation mainly removes positional sensitivity (mirror consistency 93.9% vs 83.8% without).
- Judge cross-check: Gemini 3.1 Pro Preview agrees with Claude teacher on 81.6% of labels; rankings Kendall τ=0.857, 26 of 28 model-pair orders preserved.

## 8. Code / data availability
DashJudge-8B weights released (open-weight). Benchmark code/datasets/task documents and anonymized human baselines described as released; no explicit repo URL stated in the paper text. Original Tableau Public assets: provenance/attribution preserved, redistribution subject to creator rights and platform terms.

## 9. Leakage & limitations
Tableau Public skews toward showcase visualizations, not operational dashboards — platform bias limits generalization. Model-authored trajectories restrict evidence to the submitted walkthrough; latent numerical/data errors can hide. Budget limited generation to single-conversation, model-only generation (no iterative coding-agent harnesses like Codex/Claude Code). Human baseline trajectory hand-authored by an author, not executed against Tableau — protocol-valid but not behaviorally equivalent. Nothing NFL-adjacent: data domains are Tableau Public miscellany (14 topic clusters, unspecified); no sports topics listed. For GSE purposes, the entire transfer path is absent — no outcome variable, no predictive method, no dataset of predictions, no team-rating content. The paper's own limitation: annotator diversity small (6 annotators), preference is aggregate under one pairwise label, no distributional modeling.

## 10. GSE overlap
None. The existing-research map (corpus, Drive dossiers, Gmail threads) covers team ratings, calibration, market microstructure, NGS/tracking, DFS, dashboards only as public-content edges. Garrett's corpus has no LLM dashboard-generation work; nothing duplicates this paper — it is simply orthogonal to GSE's prediction stack. The only remotely tangential connection is the Bradley–Terry aggregation, but BT ratings are already inventoried in Garrett's corpus (Massey/Sagarin/Colley, TrueSkill mentions; BT in the 26-metric catalog) and this paper adds nothing to BT methodology itself (it uses it as a vanilla aggregator).

## 11. GSE implementation spec
No GSE implementation is warranted (REJECT). The only conceivable borrowing is the replayable-trajectory evaluation protocol for GSE's internal web surfaces — e.g., model-authored usage walkthroughs for the GSE web app before releases — but that is a QA workflow idea, not a sports-edge model, and would cost a full Playwright harness for negligible product value.

## 12. Reproducible test
Not applicable (REJECT). A mechanical test would be to run the released DashJudge-8B on a GSE dashboard task to sanity-check judge transferability, but it tests judge quality, not NFL edge — no acceptance gate on it produces GSE value.

## 13. Acceptance / rejection gate
REJECT confirmed. No numeric gate is set because there is no team-rating prediction target in the paper; any test would measure dashboard-judge quality, not GSE prediction edge.

## 14. Improvement experiment
If any transfer were forced: evaluate whether the trajectory-as-executable-documentation protocol could generate regression-tested acceptance walkthroughs for the GSE web app (sports-web) — model writes a Playwright trajectory per feature, executor replays on each deploy. Value is QA speed, not prediction edge, and it belongs to Hermes's build lane, not the arXiv program.
