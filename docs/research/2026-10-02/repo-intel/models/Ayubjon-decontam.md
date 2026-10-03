# Ayubjon/decontam — N-gram Contamination Detection CLI

**Repo:** https://github.com/Ayubjon/decontam · ⭐ 1 (verified 2026-10-02)

## 1. Vision
A zero-dependency CLI + library that detects benchmark/eval data contamination against a training corpus via n-gram overlap, flags leaks, and emits a *cleaned* dataset. The minimal, legible implementation of the decontamination idea (GPT-3-paper-style 13-gram overlap checks).

## 2. The Ask
- A training corpus and an eval set as text files; a chosen n-gram length; an overlap threshold.
- That's it — zero dependencies, runs anywhere.

## 3. Constraints
- **License:** MIT (verified). 1 star, 0 forks, single commit (2026-06-17), JavaScript — a hobby artifact, not maintained tooling. **Included for the pattern, not the package.**

## 4. GSE lens
- **The smallest possible reference for our contamination gate.** The whole method is: shingle both sets into n-grams, intersect, report and remove. GSE's version replaces text n-grams with *temporal identity keys*: (game_id, feature_window) pairs. The transferable discipline is the *output contract*: the tool doesn't just warn — it **emits a cleaned dataset** plus a leak report. Our year-split enforcement should do exactly this: input = candidate training frame, output = (cleaned frame, contamination report listing every dropped row and why). A gate that only warns gets ignored; a gate that produces the cleaned artifact gets used.
- **Honest scope note:** n-gram overlap is the wrong test for tabular sports data (two different games can share stat lines legitimately). Don't copy the metric; copy the gate position and the cleaned-output contract. The real check for us is temporal: does any training row's feature window or label touch the validation/live-check period.
- Pair with the NeMo Curator dossier: Curator is the production vehicle, decontam is the 50-line mental model.

## 5. Verdict
**REBUILD** — reimplement the detect→report→emit-cleaned gate with temporal identity keys for our year splits (MIT).

## 6. The 4 tricks
- Wiki: https://codewiki.google/Ayubjon/decontam
- Diagram: https://gitdiagram.com/Ayubjon/decontam
- Stars: https://star-history.com/#Ayubjon/decontam (1 ⭐)
- Code: https://github.dev/Ayubjon/decontam
