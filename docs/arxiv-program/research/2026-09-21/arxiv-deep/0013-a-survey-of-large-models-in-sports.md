# [0013] A Survey of Large Models in Sports (arXiv:2608.14377)

**Citation:** Yichen Xu, Jianzhe Ma, Chuhan Wang, Zhonghao Cao, Liangyu Chen, Wenxuan Wang, Qin Jin (2026). *A Survey of Large Models in Sports*. arXiv:2608.14377v1. URL: https://arxiv.org/abs/2608.14377
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv HTML v1), all 2921 lines — abstract, §1 introduction, §2 applications (19 tasks, 6 stakeholder groups), Table 1 cross-task performance summary, §3 datasets + Table 2 sports-understanding benchmarks, §4 challenges + future directions, §5 conclusion, limitations, references, Appendix A (selection methodology), Appendix B (per-task reviews), Appendix C + Tables 3–6 (dataset inventories).
**Verdict:** REJECT as a model-building source — a taxonomy-and-inventory survey with no novel method, model, or reproducible experiment to adopt. Kept only as a reference map (Tables 1–5) for locating LLM-in-sports benchmarks and datasets. For GSE the concrete takeaway is the field's quantitative consensus: zero-shot video-LLMs fail in sports without domain adaptation/fine-tuning, and expert-annotated sports labels are a documented 6%-bottleneck.

## 1. Research question
Not a modeling study — a systematic survey (241 core papers, Jan 2020–Jul 2025) mapping how large models (LLMs/MLLMs) are applied across 6 stakeholder groups (athletes/trainers, coaches/educators, referees, fans/social media, researchers, industry) and 19 sports tasks, plus the dataset landscape and deployment barriers.

## 2. Dataset / schema
The survey's corpus: ~2,200 candidate records screened via iterative forward/backward snowballing (Google Scholar "cited by" filtered with a Boolean string) from 3 seed surveys, PRISMA-2020 compliant, inclusion window Jan 1 2020 – Jul 31 2025, English, full-length works only → final 241 papers (Appendix A). Dataset inventory (§3/Appendix C): task-specific datasets summarized in Tables 3–4 (name, sports, modalities, method, large model, best performance, open-source link); sports-understanding benchmarks in Table 2 (e.g., SportQA 70,592 QA; SPORTU 1,701 videos/12,948 QA; Sports-QA 5,967 videos/94,073 QA) and general video-understanding datasets with sports content in Table 5. Distribution analysis (Figure 3): soccer leads with 74 datasets; referee datasets 2% of stakeholder data; expert annotation 6% in general datasets vs 41% in specialized sports benchmarks; 21.5% discriminative vs 78.5% generative paradigms. GSE-relevant AF (American football) coverage is thin: AF appears in BIG-bench sports subtask, QASports, SPORTU-text/video, Sports-QA — all broad-coverage, none NFL-specific.

## 3. Method / model
No method proposed; survey methodology (Appendix A): start-set of 3 seed surveys, iterative forward/backward snowballing until theoretical saturation, Boolean filtering in the forward pass, four-dimension inclusion/exclusion (topic, publication type, time window, language). Taxonomy: 6 stakeholder groups × 19 tasks. Cross-paper performance comparison in Table 1 (per-task best-reported results by method class).

## 4. Equations & assumptions
No equations — a literature survey; §4–5 are qualitative. Key assumptions stated as limitations (p. Limitations): English-language bias; coverage imbalance toward soccer/basketball reflects in the field, not just the survey; rapid field evolution means staleness risk (cutoff Oct 4 2025 search, Jul 31 2025 inclusion); task overlaps cross-referenced by primary focus. There is nothing mathematical to verify; all numbers below are reported-benchmark figures quoted from the cited primary papers.

## 5. Features / target
N/A — no model. The surveyed task×metric grid (Table 1) spans: action spotting/recognition (Acc, F1, mAP), action quality assessment (Spearman's ρ, mAP), tactics/strategies (Acc, DnC-10, Macro F1), game/player performance prediction (Acc, RMSE, F1), refereeing (Likert scores, Acc), commentary generation (CIDEr, METEOR, ROUGE-L, BARTScore), highlight generation (F1, mAP), news generation (ROUGE-L, CS-F1), narratives (ROUGE-L, LLM scores), public opinion (F1, Acc), models/systems (Acc, precision).

## 6. Validation design
N/A — no experiment. The survey's own validity apparatus: PRISMA reporting standards, seed-based snowballing, saturation criterion, documented exclusion filters, and citation-by-section linkage (each reference lists where it is cited).

## 7. Numerical results / baselines
Reported highlights (Table 1 and Tables 3–4, quoting the survey's cited primary results):
- Action recognition: Tennis7 93.80% Acc; ActionAtlas (56 sports) 42.95 ± 2.91% Acc with GPT-4o (fine-grained hard); UCI-HAR fitness 92.30% Acc (GPT-4).
- Commentary: MatchVoice CIDEr 42.00 on SN-Caption-test-align (Llama 3 fine-tuned); VC-NBA-2022 CIDEr 150.70; zero-shot Video-LLaMA CIDEr 3.44 (Zhang et al. 2023) — the paper's canonical "zero-shot near-failure" example; Baughman et al. golf commentary ROUGE-L 99.12 (fine-tuned Llama 2 7B); LiveCC 40.08 Win Rate on 49 sports.
- Tactics: TacticalGPT 50.00% Acc (soccer tactical decisions, GPT-NeoX-20B); SportGen (basketball) 98.41 DnC-10; TacticExpert 83.33 Macro F1.
- Performance prediction: handball outcome RMSE 5.20 (Mistral-7B); badminton RallyTemPose 54.30% Acc (BERT); cricket F1 86.30 (GPT-4o mini); basketball in-context social-media 64.90% Acc.
- Refereeing: X-VARS foul-decision rationale 3.80/5.00 Likert (Video-ChatGPT).
- News/table-to-text: Tree-of-Report 54.92 CS-F1 (RotoWire basketball), 93.94 (badminton ShuttleSet+).
- Opinion: ABSA soccer sentiment 80.00 F1 (RoBERTa).
- Understanding benchmarks: SportQA 70,592 QA (3 difficulty levels); Sports-QA 94,073 QA across 5,967 videos; QASports ~1.5M QA (auto-annotated).
The survey's recurring quantitative theme: domain-adapted/fine-tuned models decisively beat zero-shot general models within each task.

## 8. Code / data availability
Tables 3–5 mark open-source links per dataset (✓ with github/huggingface links) — the survey is itself the availability map. The paper proposes no code. Many entries are marked ✗ (closed/custom datasets).

## 9. Leakage & limitations
As a synthesis, not an experiment: cross-dataset numbers are not comparable (different splits, tasks, metrics); "best performance" is cherry-picked per paper; generative-task metrics (CIDEr, LLM-judged scores) have weak calibration. The survey's stated gaps apply: English-only, sport-coverage skew, pre-/post-cutoff staleness. Nothing to leak.

## 10. GSE overlap
Indirect but real: GSE's standing gap list names "text/news" as a thin lane. The survey's quantitative consensus (fine-tuned commentary/news generation works; zero-shot fails) is relevant background if GSE ever builds automated recap/pick-writeup generation. The §B per-task reviews also catalog NFL-adjacent modeling families already covered in GSE research (prediction, tactics). No duplication — but the AF/NFL-specific cell of the map is near-empty, which confirms GSE is ahead of the LLM sports literature on football analytics rather than behind it.

## 11. GSE implementation spec
No build. Recommended passive use: keep the survey's Tables 3–5 as a dataset pointer list if GSE ever needs video/text understanding components (e.g., play-by-play-to-narrative generation for content automation). No engineering action.

## 12. Reproducible test
N/A — no model. The only testable claim: zero-shot general video-LLMs underperform domain-adapted ones on sports commentary (CIDEr 3.44 vs 38–42). Not worth running in the lab; the field consensus is the evidence.

## 13. Acceptance / rejection gate
REJECT decided: survey with no adoptable method or model. The one thing worth retaining is the reference pointer — the open-source dataset links in Tables 3–5 — which requires no action until a generative-content lane is opened.

## 14. Improvement experiment
The survey's own future-direction §4.2 lists what the field should run next: trustworthy sport AI (RLHF debiasing), streaming/low-latency inference (KV-cache, Mamba), knowledge grounding/RAG with tool use (live databases, rule engines), in-the-wild latency-aware benchmarks, edge deployment (quantization, distillation). For GSE, the improvement path is not experimental but observational: re-run the AF-coverage inventory in 2027 — the field moves fast, and NFL-specific LLM work may materialize (the current map is soccer/basketball-saturated, NFL-sparse).
