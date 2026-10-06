# RyanLiu112/GenPRM — Generative Process Reward Models (AAAI 2026)

**Repo:** https://github.com/RyanLiu112/GenPRM · ⭐ 105 (verified 2026-10-02)

## 1. Vision
Scale *test-time compute* of process reward models via generative reasoning: instead of a PRM that outputs a single scalar per reasoning step, GenPRM generates reasoning *about* the step's correctness — a generative verifier. Paper: "GenPRM: Scaling Test-Time Compute of Process Reward Models via Generative Reasoning" (AAAI 2026).

## 2. The Ask
- Step-labeled reasoning data (correct/incorrect step annotations) to train the PRM.
- Inference budget: the whole point is spending more compute at verification time.
- Familiarity with the PRM literature (this builds on the "Let's Verify Step by Step" lineage).

## 3. Constraints
- **License:** MIT (verified). Small repo (105 ⭐, 3 forks), pushed 2025-11-08 — research code, not a framework; expect rough edges.
- LLM-specific; the idea transfers, the code doesn't.

## 4. GSE lens
- **Generative verification > scalar scoring for our reasoning layer.** A scalar "reasoning quality: 0.73" is unactionable; a generative verifier that says *which step* of the explanation fails (wrong signal cited? arithmetic error? contradicts the calibration row?) gives us something we can train on and debug. This maps directly to improving the honest-INVALID behavior: the verifier should check each reasoning step against wired signals and the calibration state.
- **Test-time compute scaling is a GSE-relevant lever.** We can't always retrain; spending more inference on verification (generate K candidate explanations, generatively verify each, pick the best-verified) is a training-free quality gain — a "verify twice" mechanism for reasoning outputs.
- Small/early: treat as an idea source, validate the paper's claims before building on them.

## 5. Verdict
**REBUILD** — adopt the generative-verifier idea for reasoning QC; reimplement against our signal/calibration schema (MIT).

## 6. The 4 tricks
- Wiki: https://codewiki.google/RyanLiu112/GenPRM
- Diagram: https://gitdiagram.com/RyanLiu112/GenPRM
- Stars: https://star-history.com/#RyanLiu112/GenPRM (105 ⭐)
- Code: https://github.dev/RyanLiu112/GenPRM
