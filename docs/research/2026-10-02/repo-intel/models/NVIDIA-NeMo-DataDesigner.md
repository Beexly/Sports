# NVIDIA-NeMo/DataDesigner — Synthetic Data Generation from Scratch or Seed

**Repo:** https://github.com/NVIDIA-NeMo/DataDesigner · ⭐ 2,298 (verified 2026-10-02)

## 1. Vision
Generate high-quality synthetic data from scratch or from seed data: agentic pipelines (LLM agents + tools + MCP) that design, generate, and validate synthetic datasets — covering data augmentation, tool-use traces, and multimodal data. NVIDIA's 2025-vintage answer to "we don't have enough of the right data."

## 2. The Ask
- An LLM to drive generation (agentic loop), plus validators that check the synthetic data meets spec.
- Seed data helps enormously; from-scratch generation needs strong task specs.
- GPU for the driving model; the output is datasets, not models.

## 3. Constraints
- **License:** Apache-2.0 (verified). Created 2025-10-16, pushed 2026-10-02 — new and actively developed (54 open issues).
- Synthetic-data quality is only as good as the validator; garbage-in-garbage-out applies with interest.

## 4. GSE lens
- **Edge-case scenario generation is the transferable use.** GSE's walk-forward training set (2022–2026 W1–4) is thin on rare regimes: rookie-QB breakouts, mid-season coaching changes, weather extremes, key-injury cascades. DataDesigner's pattern — seed with real games, agentically generate plausible variants, *validate* against physical/statistical plausibility — is how you widen the training distribution without leaking the future. The validator is the critical piece: every synthetic game must be checkable against known football constraints (roster rules, score distributions).
- **Honest labeling rule:** synthetic games must be tagged as synthetic in the corpus and never allowed into the validation window. This is the same contamination discipline as the LLM world — synthetic data is training-only augmentation, and any synthetic record that touches 2025 or 2026-W1–4 invalidates the fit.
- Watch, don't build on yet: the repo is months old; the agentic-generation pattern is worth tracking as it matures.

## 5. Verdict
**REBUILD** — adopt the seed→generate→validate pattern for rare-regime augmentation; reimplement with football-plausibility validators (Apache-2.0).

## 6. The 4 tricks
- Wiki: https://codewiki.google/NVIDIA-NeMo/DataDesigner
- Diagram: https://gitdiagram.com/NVIDIA-NeMo/DataDesigner
- Stars: https://star-history.com/#NVIDIA-NeMo/DataDesigner (2,298 ⭐)
- Code: https://github.dev/NVIDIA-NeMo/DataDesigner
