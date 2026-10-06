# [1115] X-VARS: Introducing Explainability in Football Refereeing with Multi-Modal Large Language Models (arXiv:2404.06332v1)

**Citation:** Jan Held, Hani Itani, Anthony Cioppa, Silvio Giancola, Bernard Ghanem, Marc Van Droogenbroeck (2024). *X-VARS: Introducing Explainability in Football Refereeing with Multi-Modal Large Language Models*. arXiv:2404.06332v1. URL: https://arxiv.org/abs/2404.06332
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, text extracted with pdftotext; dataset, architecture, equations, two-stage training, human study, ablations, limitations read).
**Verdict:** ADAPT — the "inject model predictions as text into a fine-tuned VLM" pattern for grounded explanations ports directly to GSE's show-your-work pick narratives; the soccer-refereeing task itself does not.

## 1. Research question
Can a multi-modal large language model produce **referee-quality natural-language explanations** for foul decisions in soccer — i.e., not just classify foul/no-foul, but explain *why* in the language a professional referee would use? The paper builds SoccerNet-XFoul and X-VARS, a Video-ChatGPT/Vicuna-based VLM fine-tuned to narrate officiating decisions.

## 2. Dataset / schema
- **SoccerNet-XFoul** (new): **10,000 clips**, **22,000+ QA triplets**, annotated by **70+ experienced referees**; ~**1.5 answers per question/action**; **540,000+ words** total, mean nearly **25 words/answer**.
- Schema per item: video clip + question about the action + referee-written explanation + foul/severity labels.
- Access: built on SoccerNet (public); the XFoul explanation annotations' release status — paper describes the dataset; treat redistribution as request/verify.

## 3. Method / model
- Vision: fine-tuned **CLIP ViT-L/14**; temporal pooling + spatial pooling of frame features, linear projection into Vicuna/Video-ChatGPT token embedding space.
- Key trick: the foul/severity **predictions of the classifier are injected as text** into the LLM prompt, so the explanation is conditioned on (grounded in) the model's own decision.
- **Two-stage training:** Stage 1 — fine-tune CLIP 14 epochs, LR 5×10⁻⁶, batch 64, 16 frames at 224p (~9 hours on a V100). Stage 2 — QLoRA fine-tune of the LLM (1% of layers), 3 epochs, LR 2×10⁻⁴, batch 32 (~2 hours on two A100 40GB).

## 4. Equations & assumptions
- No novel equations stated; the paper presents the architecture schematically. Training uses standard objectives: CLIP contrastive pre-training objective in stage 1 and standard next-token cross-entropy (QLoRA) in stage 2. Assumptions: (a) pooled CLIP features projected linearly suffice to ground the LLM; (b) conditioning explanations on injected classifier predictions yields faithful (not merely plausible) text; (c) referee-written answers are the right gold standard.

## 5. Features / target
- Inputs: video clip (+ question) and injected foul/severity prediction text. Targets: (a) free-text referee-style explanation; (b) foul/severity classification (severity/foul accuracy reported).

## 6. Validation design
- Classification: severity/foul accuracy vs CLIP-only baseline and prior SOTA.
- Explanation quality: **human study — 20 referees × 20 clips**, rating explanations (scale implied 1–5); X-VARS vs human-written explanations.
- Agreement diagnostic: how often X-VARS' text agrees with the injected CLIP prediction.

## 7. Numerical results / baselines
- Human study: human-written explanations mean **4.0**; X-VARS **3.8**; X-VARS rated **higher than the human in 46%** of comparisons.
- Severity/foul classification accuracy: CLIP-only **0.52** → X-VARS **0.62**; paper claims **19% above prior SOTA**.
- X-VARS agreed with the injected CLIP predictions in only **76%** of cases (the LLM overrides its own classifier's input nearly 1 in 4 times).
- Paper explicitly acknowledges **hallucination** as a limitation.

## 8. Code / data availability
- None stated in paper (no code or data URL noted in the extracted text).

## 9. Leakage & limitations
- **Faithfulness gap:** explanations are conditioned on injected predictions, but 24% disagreement means the text is not a reliable readout of the decision — the core "explainability" claim is weakened by the paper's own diagnostic. (b) Human study is small (20 refs × 20 clips) and uses mean ratings where X-VARS still trails humans. (c) Hallucination acknowledged — dangerous in an officiating context, and equally dangerous for betting picks. (d) Soccer-foul domain; nothing NFL-specific. (e) No code — reimplementation from description only.

## 10. GSE overlap
- No refereeing/officiating or explanation-generation ledger exists in `arxiv-deep/` (checked). The existing-research map's ML brief covers "frontier-model techniques" and "interpretable models" as commissioned topics with results pending — this paper is a concrete **new capability** (prediction-grounded LLM narration) that fits both, not a duplicate.

## 11. GSE implementation spec
- **GSE "show your work" cards:** for each published pick, inject the engine's structured outputs (win prob, spread, key edges, top features) as text into a fine-tuned LLM prompt, generating a 3–5 sentence analyst-style rationale.
- **Data:** GSE's historical posted picks + the analyst-written rationales (X post history, weekly packets) as the explanation corpus; engine probabilities as the injected grounding.
- **Training:** QLoRA fine-tune of an open LLM (same 1%-of-layers recipe as the paper) on (structured prediction → rationale) pairs; add a multi-task classification head so the model also predicts the pick, enabling the same agreement diagnostic (target: >90% agreement, vs the paper's 76%).
- **Serving:** batch generation at pick-publication time; human review before posting (fits the existing approve-desk gate).
- **Effort:** ~2 engineer-weeks + GPU fine-tune time.

## 12. Reproducible test
- Dataset: 200 historical GSE posted picks with analyst rationales. Protocol: blind A/B — 5 raters (Garrett + 4) score model vs human rationales 1–5 on correctness/grounding. Baseline: human-written rationales. Also compute prediction–text agreement rate (paper's 76% diagnostic).

## 13. Acceptance / rejection gate
- **Adopt** if blind mean rating ≥ human mean − 0.3 AND prediction–text agreement ≥ 90% (fixing the paper's faithfulness gap is the point); **reject** otherwise — a fluent but unfaithful narrator is worse than no narrator for a picks business.

## 14. Improvement experiment
- Add a **structured consistency loss**: penalize the model when its generated text contradicts the injected numbers (extract numbers from generated text with regex/NER and compare to inputs). The paper has no such constraint — it is the obvious fix for the 76%-agreement problem and directly targets the hallucination limitation the authors admit.
