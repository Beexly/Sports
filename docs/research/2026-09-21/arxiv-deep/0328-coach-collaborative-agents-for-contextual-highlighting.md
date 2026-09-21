# [0328] COACH: Collaborative Agents for Contextual Highlighting — A Multi-Agent Framework for Sports Video Analysis (arXiv:2512.01853v2)

**Citation:** Tsz-To Wong, Ching-Chun Huang, Hong-Han Shuai (2026). *COACH: Collaborative Agents for Contextual Highlighting: A Multi-Agent Framework for Sports Video Analysis*. arXiv:2512.01853v2 (AAAI 2026). URL: https://arxiv.org/abs/2512.01853v2 — Project: https://aiden1020.github.io/COACH-project-page/
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 417 lines).
**Verdict:** ADAPT — the sport (badminton) and its stroke taxonomy do not transfer, but the architecture pattern (shared backbone + Structured CoT Tuning for role-specialized agents + intent-routed SOP orchestration + oppositional Critic verification) ports directly to **GSE's NFL broadcast-video content pipeline**: automated play localization, fact-checked recap/summary generation, and video QA over game footage. This is a new capability — nothing like it exists in the repo.

## 1. Research question
Can a reconfigurable multi-agent system replace monolithic end-to-end video models for sports video understanding, solving three failures of the end-to-end paradigm: (1) high redundant cost (one model per task), (2) single-temporal-scale lock-in, (3) opaque reasoning? The authors propose COACH — Orchestrator/Grounder/Critic agents on one shared backbone, coordinated by pre-defined collaboration policies (SOPs) — and validate it on badminton rally QA and match summarization.

## 2. Dataset / schema
**COACH-Data**: built from 22 badminton matches, ~19,000 human-annotated strokes (sourced from ShuttleSet). Two sub-tasks: (a) Video-based QA — stroke annotations → dense captions → teacher LLM (gpt-oss-120b) generates complex tactical questions + step-by-step CoT answers, constrained by human-authored (Question, CoT, Answer) few-shot exemplars (skills tested: action classification, action counting, temporal localization, summarization/analysis); (b) Knowledge-based QA — crawled badminton corpus (BWF statutes, BadmintonBible, Wikipedia) → teacher-LLM (Q,A) pairs. No dataset/code release URL given in the text (project page exists).

## 3. Method / model
(a) **Shared backbone**: Flan-T5-XL (LLM) + TC-CLIP-B/16 video encoder + Q-Former vision-language alignment; captioning-task alignment; fully supervised training 2 epochs, lr 2e-5, batch 16. One model serves all agents via multi-GPU parallelism (batch summarization + concurrent QA). (b) **Structured CoT Tuning** for role specialization without weight separation: role-specific instruction prefixes ("You are a Grounder Agent…") + distinct CoT templates per role — Orchestrator: conditional-routing strategist (text query → single-step answer; video query → multi-step visual reasoning; summarization → decompose into sub-queries for the Grounder); Grounder: rigid "Observe → Report" temporal localizer (must return empty set when no evidence — hallucination guard); Critic: oppositional "Analyze Assertion → Compare Evidence → Adjudicate Verdict" fact-checker (reasons backward: "is this claim true?"). (c) **Intent-driven orchestration**: policies are pre-defined SOPs, not online planners — Orchestrator classifies query intent → selects plan. Two SOPs: Analytical Rally QA (Orchestrator → Retriever → Critic → synthesis) and Generative Video Summarization (Orchestrator plans structure → Grounder batch-localizes events → Critic verifies → Orchestrator writes narrative script → Media Composition tool assembles video).

## 4. Equations & assumptions
No formal equations — the paper is architectural. Operative assumptions: (a) role conflict in a shared backbone can be suppressed by instruction conditioning + distinct CoT templates (validated empirically in Table 3); (b) fixed SOPs give stability/reproducibility superior to online planning (asserted, not ablated against a planner); (c) the Critic's backward-reasoning template is sufficient for factual verification; (d) chunking long video + batch Grounder inference preserves fine-grained understanding (their workaround for hour-long matches); (e) ROUGE-L/EM/F1 over generated text fairly measures the system.

## 5. Features / target
Inputs: badminton match video + text queries. Agent I/O: Grounder outputs stroke-index sets (e.g. "[stroke 3, stroke 7]"); Critic outputs verdicts on claims; Orchestrator outputs answers, sub-queries, narrative scripts. Evaluation targets: exact-match action class/count, stroke-level F1 temporal localization, NQA (negative-query accuracy), ROUGE-L summarization/knowledge answers.

## 6. Validation design
(a) Main comparison: COACH (w/ Critic) vs Gemini 2.5 Pro generalist on Rally QA (Table 1) and on chunked Scalable Temporal Grounding (Table 2 — the fair-comparison design, since Gemini can't ingest hour-long video). (b) Ablations: w/o Critic (Table 1); Orchestrator-pattern vs Grounder-pattern on the *same backbone weights* (Table 3 — isolates the CoT template effect). (c) Metrics: EM (factual), stroke-level F1/precision/recall (localization), NQA (hallucination robustness on absent-event queries), ROUGE-L (generative). Parsing scripts extract core answers from generated text.

## 7. Numerical results / baselines
All numbers quoted from the paper (paper's claims):
- **Rally QA (Table 1)** — COACH w/ Critic vs Gemini 2.5 Pro: Action Classification EM 85.60% vs 24.20% (+61.4); Action Count 79.20% vs 37.60%; Summarisation ROUGE-L 33.56 vs 23.55; Temporal Localization Hit@1 76.66% vs 18.12%, EM 63.97% vs 7.04%, F1 76.21% vs 13.73% (+62.5); Knowledge QA ROUGE-L 27.40 vs 29.76 — **Gemini wins** (attributed to larger pre-trained textual priors, isolating COACH's gains to architecture, not scale).
- **Ablation w/o Critic**: Action Classification 85.60% → 82.20% (−3.4); F1 76.21% → 73.63%; confirms the verification step.
- **Temporal Grounding (Table 2)** — Grounder vs Gemini: F1 84.77% vs 24.82%; NQA 91.80% vs 21.23%; precision 86.95% vs 27.49%.
- **Role-pattern ablation (Table 3, same weights)**: Grounder pattern beats Orchestrator pattern — F1 84.77% vs 75.95% (+8.82); NQA 91.80% vs 85.50% (+6.3) — validates Structured CoT Tuning as the specialization mechanism.

## 8. Code / data availability
Project page listed; no code/dataset URL in the text. Training data partly synthetic (teacher-LLM generated). Reproducibility depends on ShuttleSet (public) + reimplementation.

## 9. Leakage & limitations
- **Single sport**: badminton only; cross-sport transfer of the tuned roles untested (authors' own limitation #1).
- **Fixed SOPs**: stability by design, but cannot handle novel task structures outside QA/localization (limitation #2) — an NFL deployment needs new SOPs authored per content format.
- **Summarization evaluated on localization metrics only** (F1/EM); narrative coherence, interestingness, and factual quality of generated summaries never human-evaluated (limitation #3) — the headline "generative" claim is the least validated part.
- **Baseline asymmetry**: Gemini 2.5 Pro evaluated on chunks for grounding (their design choice) — reasonable but not a like-for-like system comparison.
- **Knowledge QA loss** shows the shared Flan-T5-XL backbone is the ceiling for text-only reasoning; the framework doesn't fix backbone scale.
- GSE's standing video rule (real footage only, never AI slideshow) constrains the Media Composition step: it must assemble *real* broadcast clips, which is compatible with the paper's design (it localizes real segments) but rules out generative fill.

## 10. GSE overlap
Existing-research-map check: GSE runs a human-driven broadcast-video content operation (clip scripts, telestration, commentary-led edits, voice rules in ops/x-copy-rules.md). The repo contains **no automated video-understanding lane** — no play-localization model, no video QA, no fact-checking agent for scripts, no highlight-grounding system. The engine side is numbers (tracking, EPA, odds), not pixels. **Verdict: new capability** — the COACH pattern (localize → verify → narrate over real footage) is the first credible architecture in the sweep for automating the *video* half of the content operation, and the Critic agent directly addresses GSE's standing trust-no-unverifiable-claims standard by fact-checking stat claims in generated scripts against visual/box-score evidence.

## 11. GSE implementation spec
Build **GSE-COACH** for the NFL content pipeline:
- **Backbone**: shared VLM (open — e.g. a LLaVA-Video-class model; Flan-T5-XL-era is dated, use a 2026-era video LLM) + NFL-tuned video encoder.
- **Roles via Structured CoT Tuning** (same mechanism as the paper): Grounder = "Observe → Report" play/event localizer over broadcast footage (outputs time ranges + play IDs); Critic = "Analyze Assertion → Compare Evidence → Adjudicate Verdict" fact-checker that cross-references script claims against nflverse/NGS box-score data and the video evidence; Orchestrator = intent router (recap vs film-breakdown vs prop-receipt video).
- **SOPs** (author per format): (1) Game-recap pipeline — Grounder batch-localizes scoring/explosive plays → Critic verifies yard lines/scores vs play-by-play → Orchestrator drafts commentary script in GSE voice → Media Composition assembles real broadcast clips (telestration-ready); (2) Prop-receipt pipeline — given a posted pick, localize the deciding plays and generate the "how it hit" video; (3) Film-room QA — analyst asks "show me every cover-3 bust" → grounded clip reel.
- **Training data**: nflverse play-by-play as the ShuttleSet analog (structured annotations are free); synthesize (Q, CoT, A) with a teacher LLM exactly as the paper does.
- **Effort**: 3–4 engineer-weeks for a Grounder MVP on one content format; Critic fact-checking against play-by-play is the highest-value, lowest-risk first slice.

## 12. Reproducible test
Dataset: 2024 NFL season broadcast footage (3 games, licensed or fair-use transformative clips per the standing video rule) + nflverse play-by-play as ground truth. Protocol: run the Grounder on full-game video with queries like "all explosive plays (15+ yards)" and "all turnovers"; score temporal F1 against play-by-play timestamps (the paper's Table 2 design). Metric: stroke-level→play-level F1; baseline to beat: a generalist VLM (Gemini-class) on the same chunked queries. Then run the Critic on 50 generated script claims and measure claim-verification precision against box-score truth. Adopt the video half only if Grounder F1 ≥ 0.75; adopt the Critic if claim-verification precision ≥ 0.90.

## 13. Acceptance / rejection gate
**Adopt** if, on the 3-game test, (a) Grounder play-level F1 ≥ 0.75 vs the generalist baseline (replicating the paper's specialist advantage in the NFL domain), AND (b) the Critic catches ≥ 90% of deliberately injected false stat claims in draft scripts (precision on claim verification) — that is the trust-no-claims payoff. **Reject** if the Grounder can't beat a generalist VLM (then just prompt the generalist — no framework needed) or if broadcast-video domain shift (cuts, replays, graphics overlays) collapses localization — the paper's continuous-play badminton footage is far cleaner than NFL broadcasts.

## 14. Improvement experiment
Beyond the paper: (a) fix its weakest validation — run a **human evaluation of generated recap narratives** (coherence, factuality, GSE-voice fit scored by the 9.2 floor rubric) instead of localization-only metrics; (b) add a **replay-aware Grounder**: NFL broadcasts replay the same play 3–4 times — teach the Grounder a "deduplicate to live-play instance" step (badminton has no replays; this is the NFL-specific failure mode the paper never faces); (c) close the loop the authors left open — a **press-release SOP**: Orchestrator → Grounder → Critic → long-form tactical report for coaches/bettors, turning the video pipeline into a written-research asset for the repo's docs/research corpus.
