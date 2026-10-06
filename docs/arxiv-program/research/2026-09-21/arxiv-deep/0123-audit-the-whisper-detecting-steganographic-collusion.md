# [0123] Audit the Whisper: Detecting Steganographic Collusion in Multi-Agent LLMs (arXiv:2510.04303)

**Citation:** Om Tailor (2025). *Audit the Whisper: Detecting Steganographic Collusion in Multi-Agent LLMs*. arXiv:2510.04303v2. URL: https://arxiv.org/abs/2510.04303v2
**Ledger completed:** 2026-09-21. **Read:** full text via ar5iv HTML.
**Verdict:** REJECT — no GSE application (GSE runs no multi-agent LLM deployment doing pricing, auctions, or peer review), and the paper's central theoretical construction (reciprocal-p-value "e-values") is mathematically unsupported, which undermines its headline FPR guarantees.

## 1. Research question
Can steganographic collusion between LLM agents — e.g., agents secretly coordinating in auctions, pricing, or peer review — be detected post hoc from transcripts alone, with a rigorous false-positive-rate (FPR) guarantee? The paper proposes a battery of statistical detectors plus a "martingale union" construction and reports ColludeBench-v0, an empirical benchmark with 200 honest and 200 colluding runs per scenario (600 audited transcripts).

## 2. Dataset / schema
ColludeBench-v0: three scenarios (pricing, auctions, peer review), 200 honest + 200 colluding runs per scenario, 600 audited transcripts total. The paper also claims 10,000 honest audits per scenario with zero false alarms and an FPR upper bound of 5.1×10⁻⁴. Supporting artifact paths are asserted in the text but not independently substantiated within the paper itself ("Not stated in paper" — no public URL confirmed for the benchmark data).

## 3. Method / model
Five detectors: (1) cross-run mutual information (MI) between agent messages across independent runs; (2) permutation invariance (invariance of transcripts under permutation of agent identities); (3) watermark variance (variance of detected watermark signals); (4) acceptance bias (systematic bias toward accepting messages from specific co-agents); (5) welfare shift (shift in aggregate welfare/surplus between honest and colluding regimes). Multiple-testing corrections: Bonferroni union, Holm step-down, Westfall–Young resampling, and a "martingale union" where per-run p-values are converted to E_t = 1/max(p_t, 10⁻¹²) and the product is asserted to be an e-value supermartingale enabling optional stopping (Section 4, Lemma 2).

## 4. Equations & assumptions
Key constructions as stated (transcribed from ar5iv HTML; notation verified against surrounding text):
- Per-run evidence: E_t = 1 / max(p_t, 10⁻¹²).
- Wealth process: M_t = Π_{s≤t} E_s, asserted (Lemma 2) to be a non-negative supermartingale under the null, giving optional-stopping validity for sequential auditing.
- Multiple testing: Bonferroni union rejection at level α/k; Holm and Westfall–Young step-down procedures.
- Detector statistics: cross-run MI estimated between message embeddings of agent pairs; permutation-invariance p-value from label-shuffling null; watermark variance as Var(ŵ) over transcript segments; acceptance bias as deviation of acceptance rate from exchangeability null; welfare shift as Δ(consumer surplus).

**CRITICAL — this is not a transcription issue:** the claim that E_t = 1/max(p_t, 10⁻¹²) is an e-value (E₀[E_t] ≤ 1 under the null) is mathematically unsupported. Reciprocal p-values are not generally valid e-values (a genuine e-value must satisfy E₀[E] ≤ 1; the reciprocal of a uniform p-value has infinite expectation). The construction only works under additional conditions on p_t that the paper does not establish. This undermines Lemma 2 and all optional-stopping / sequential-audit claims built on it. Flagged here as a **mathematical defect in the paper**, not an equation-transcription uncertainty.
- Second questionable claim: the paper asserts that replacing an analytic threshold with the minimum of the analytic and an empirical threshold "can only reduce Type I error." Lowering a rejection threshold generally *increases* rejections; the minimum of two thresholds is the lower one, so the claim's direction is suspect and no proof is given.

Assumptions stated: honest transcripts are exchangeable across runs; watermarks survive the agents' channels; colluding agents' messages carry detectable statistical dependence.

## 5. Features / target
Input features: multi-agent transcripts (message embeddings, acceptance decisions, watermark signals, surplus outcomes). Target: binary — colluding vs honest run. Reported operating point: TPR at FPR = 10⁻³ (Table 1). Prediction horizon: per-audit (single transcript batch); the martingale union claims an anytime-valid sequential guarantee.

## 6. Validation design
200 honest + 200 colluding runs per scenario; detector ROC/PR computed on the 600-transcript pool. Additional claim: 10,000 honest audits/scenario with zero false alarms (supporting runs asserted, not shown). Hosted-model claim: Gemini/Groq endpoints, consumer surplus honest 79.3±0.2 vs colluding 0. No train/test split described for the detectors themselves (they are classical statistics, not trained models); no cross-scenario generalization test (detectors evaluated within the scenarios they were presumably designed on).

## 7. Numerical results / baselines
Table 1 (exact, as reported): cross_run_mi ROC AUC 0.819, PR AUC 0.652, TPR@1e-3 0.598, FPR 0.001; acceptance_bias TPR 1.000, FPR 0.000; Bonferroni union TPR@1e-3 0.889; Holm/Westfall–Young TPR@1e-3 0.556; martingale union TPR@1e-3 0.667. FPR upper bound claimed: 5.1×10⁻⁴ (derived from the defective e-value construction — see §9). Hosted-model surplus claim: honest 79.3±0.2 vs colluding 0. Baselines: "anonymized" reference methods — the paper does not name real competing detectors ("Not stated in paper").

## 8. Code / data availability
"Not stated in paper" — no repository URL or data link given in the text; ColludeBench-v0 artifact paths are asserted internally but not independently verifiable from the paper. References include anonymized baselines and some unusual/future-looking claims (see §9).

## 9. Leakage & limitations
Adversarial read: (a) the e-value construction is mathematically invalid as stated (reciprocal p-values are not e-values), so Lemma 2, the 5.1×10⁻⁴ FPR bound, and the optional-stopping claims are unsupported; (b) the "minimum of two thresholds can only reduce Type I error" claim is backwards as stated; (c) perfect scores (acceptance_bias TPR 1.000, FPR 0.000) on 200/200 runs with no held-out test suggest possible overfitting to the authors' own simulated colluders; (d) baselines are anonymized, so no real comparison is possible; (e) references contain anonymized citations and unusual claims, consistent with a draft that has not passed real peer review; (f) zero NFL/GSE overlap — GSE has no multi-agent LLM system that prices, auctions, or reviews anything.

## 10. GSE overlap
From existing-research-map.md: no prior collusion-detection or multi-agent-audit research in the corpus. The closest thematic neighbor is the 2026-09-18 competitive-intel dossier set (310 dossiers on competitor accounts) — but that is OSINT collection, not agent collusion detection. No duplication. No GSE application either: nothing in GSE's stack involves coordinating LLM agents where steganographic collusion is a threat.

## 11. GSE implementation spec
No implementation. REJECT — do not port any part of this. If GSE ever deploys multiple cooperating analyst agents (e.g., per-game write-up agents with shared prompts), revisit §14's experiment design, but there is no such system today.

## 12. Reproducible test
Not applicable — no GSE test is warranted. The paper's own claims cannot be reproduced without the (unreleased) ColludeBench-v0 artifacts.

## 13. Acceptance / rejection gate
REJECT for GSE adoption: (i) zero application surface in the GSE stack, and (ii) the core FPR guarantee rests on an invalid e-value construction. A future revisit gate: only if a named, released benchmark with valid (e.g., conformal or calibrated) sequential guarantees appears.

## 14. Improvement experiment
One follow-up (for the paper's own research program, not GSE): replace the reciprocal-p-value construction with a genuinely valid e-value (e.g., e_t = p_t^{-κ}·Γ-calibration or a likelihood-ratio e-process under an explicit collusion alternative), re-derive the supermartingale claim, and re-run the 10,000-audit honest calibration to report an empirical FPR with a Clopper–Pearson bound. Dataset: ColludeBench-v0 (requires release). Metric: empirical FPR at nominal α = 10⁻³ with 95% upper bound. Gate: valid construction passes; the current one cannot.
