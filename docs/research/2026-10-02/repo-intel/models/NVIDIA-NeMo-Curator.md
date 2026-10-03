# NVIDIA-NeMo/Curator — Scalable Data Curation Toolkit (Dedup, Filter, Decontaminate)

**Repo:** https://github.com/NVIDIA-NeMo/Curator · ⭐ 1,791 (verified 2026-10-02)

## 1. Vision
GPU-accelerated, large-scale data curation for LLM training: quality filtering, exact + fuzzy (MinHash LSH) deduplication, PII redaction, and *decontamination* against eval benchmarks — the production-grade version of the datatrove/dolma pattern, built to run on thousands of GPUs.

## 2. The Ask
- NVIDIA GPUs for the accelerated paths (CPU fallback exists for many modules).
- Your raw corpus + eval/benchmark sets to decontaminate against.
- Pipeline config: which filters, dedup thresholds, and decontamination n-gram lengths.

## 3. Constraints
- **License:** Apache-2.0 (verified). Pushed 2026-10-02, actively maintained (301 open issues).
- GPU-centric; the decontamination *method* (n-gram overlap vs eval sets) is what transfers even without their stack.

## 4. GSE lens
- **Decontamination is our walk-forward enforcement, mechanized.** Curator's decontamination module checks training documents against eval sets via n-gram overlap and removes matches. GSE's exact analog: every training record (2022–24) checked against the validation window (2025) and live-check window (2026 W1–4) for *temporal* overlap — not n-grams but game-identity and feature-window overlap (a feature computed over "last 4 games" for a Week 5 2025 game reaches back into 2024; that's fine — but a 2024 training row whose label or features incorporate 2025 information is contamination). Their module is the template for an automated gate: **no fit runs unless the decontamination check passes and logs its report.** This hardens "contaminated fits are discarded" from a rule into a pipeline stage.
- **Fuzzy dedup at GPU scale** covers the multi-source merge problem: same game described differently across nflverse/Sleeper/books feeds. Their MinHash LSH approach is directly applicable to play/game record dedup.
- **Curation-as-logged-pipeline:** every stage emits stats. Our calibration-on-wire rows should be accompanied by curation stats per signal — provenance you can audit, matching the standing verification rule (claims arrive with receipts).

## 5. Verdict
**ADOPT** — adopt the decontamination-gate pattern (and the library where it fits) as the automated enforcer of our year-split discipline (Apache-2.0).

## 6. The 4 tricks
- Wiki: https://codewiki.google/NVIDIA-NeMo/Curator
- Diagram: https://gitdiagram.com/NVIDIA-NeMo/Curator
- Stars: https://star-history.com/#NVIDIA-NeMo/Curator (1,791 ⭐)
- Code: https://github.dev/NVIDIA-NeMo/Curator
