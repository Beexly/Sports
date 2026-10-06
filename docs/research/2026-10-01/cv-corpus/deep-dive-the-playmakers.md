# Deep-Dive: github.com/ruidazeng/the-playmakers — license resolution + training recipe

**Source:** https://github.com/ruidazeng/the-playmakers
**What was read / checked (2026-10-01):**
- Full README.md (323 lines) via raw.githubusercontent.com.
- GitHub REST API: repo metadata (`license: null`), branch list (single branch `main`), root file listing, full commit history (5 commits), per-commit file changes.
- `requirements.txt` via raw.githubusercontent.
- Author's public repo list (36 repos) with license fields, to check for a pattern.
- The linked Roboflow dataset page https://universe.roboflow.com/cs-1430/wr-finder (HTML scrape): explicit **License: CC BY 4.0**, 443 images, 3 versions, 8 classes, hosted model mAP@50 90.2% / Precision 87.5% / Recall 82.7%.
- No LICENSE file in any branch (only one branch exists); no license ever added/removed in commit history (first commit was "copy", then README/poster/results commits, then a 2025-12-11 refactor that *renamed/removed* dataset zips but touched no license).
**License:** see verdict below — this file is the evidence record.
**Confidence:** HIGH — every fact below is from a fetched artifact.

---

## 1. THE LICENSE CONTRADICTION — RESOLVED

| Evidence | Finding |
|---|---|
| README line 16 | `[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)` — the badge **hyperlinks to a `LICENSE` file** |
| Root file listing (branch `main`) | `.gitignore, Final Poster.pptx, Final Report.pdf, Final Report, README.md, Templates, WR, requirements.txt` — **no LICENSE file** |
| GitHub API `license` field | `null` |
| Commit history (all 5) | `930b931b copy` → `56ea9135 Update README.md` → `e713580b Added confusion matrix...` → `7af0302d Put authors upfront` → `86265031 refactor: reorganize project structure` — **no commit ever added, removed, or modified a LICENSE file** |
| Author's other repos | Mixed practice: Bugu-Sport MIT, open-unlearning MIT, security-research Apache-2.0, math2820l GPL-3.0, Triangular-Arbitrage AGPL-3.0, theZoo NOASSERTION, several `None` — the author **does** attach licenses when they intend to; absence here reads as omission, not stealth |
| README `(LICENSE)` link | Dead link — a 404 badge link, not a grant |

**Conclusion:** the MIT badge is an aspirational/broken badge; there is no license text and therefore **no license grant** for the repo's code, notebooks, PDFs, or PPTX. The contradiction resolves as: *claimed MIT in badge, actually unlicensed*.

### FINAL VERDICT: **RESEARCH-ONLY** for the repo contents
- ✅ MAY: read the README/report for method intel (this file does exactly that); cite the project.
- ❌ MAY NOT: copy notebooks/scripts (`WR/scripts/filter_field.py`, `WRYOLOCUSTOM.ipynb`), reuse `Final Report.pdf` figures/text, or treat the code as MIT-licensed. Under the 2026-09-28 INGEST-AND-LEARN doctrine, unlicensed material is learn-only.
- ⚠️ This is **not** DO-NOT-TOUCH: there is no viral/copyleft license attached, no obfuscation, and the method intel is legitimately published by the authors. RESEARCH-ONLY is the correct middle verdict.

### Separate verdict for the DATASET (cs-1430/wr-finder on Roboflow): **USABLE**
- The dataset is a distinct artifact hosted by Roboflow with an **explicit "License: CC BY 4.0"** on its page (verified in the fetched HTML: `Task: Object Detection License: CC BY 4.0`).
- **USABLE with attribution** — CC BY 4.0 permits commercial/adapted use with credit to "CS 1430 / wr-finder" and a link to the license.
- Download requires a Roboflow account + API key (`rf = Roboflow(api_key=...)`, `workspace("cs-1430").project("wr-finder").version(3)` per the README recipe) — that's Roboflow's standard gate, not a license problem.
- One caveat to record: image count discrepancy — README claims **503** images; the Roboflow page shows **443 images / 3 versions** (the 2025-12-11 refactor removed the repo's own zips, so Roboflow is now the only copy; version 3 is what the README's download recipe references).

---

## 2. TRAINING RECIPE (for the detector-v2 comparison)

- **Project:** Brown University CS 1430 (Computer Vision) final project, 2024. Authors: John Michael Slezak, Atif Khan, Chenhao Lu, Ruida Zeng. TA mentor Joel Manasseh; Prof. Srinath Sridhar.
- **Task:** classify NFL player positions from **pre-snap formations** using YOLOv8 — the explicit insight is that players look identical, so the model learns from **spatial context/positioning**, not appearance.
- **Data:** 503 annotated images from the 2024 Super Bowl (LVIII) + AFC/NFC championship games; 8 classes — Corner Back (0), Fullback (1), Linebacker (2), Quarterback (3), Running Back (4), Safety (5), Tight End (6), Wide Receiver (7).
- **Model:** **YOLOv8** (ultralytics ≥ 8.0.196), single-pass detection, grid-based localization with NMS; primary training notebook `WR/notebooks/WRYOLOCUSTOM.ipynb` = "YOLOv8 with Roboflow" (a YOLOv5 50-epoch alternative also exists).
- **Reported results:** **mAP@0.5 = 0.759**, **F1 = 0.62 @ conf 0.229**; best class WR **94.2% precision**, Corner Back 88.5%, Safety 87.9%.
- **Known limitation (authors' own):** the experimental color-matching approach (LAB color space, jersey colors, formation width) is *"sensitive to lighting, logos, end zones"* — consistent with our corpus finding that jersey-color ID breaks under sunlight/shadow variance.
- **Roboflow hosted-model numbers (for the record, not our target):** mAP@50 **90.2%**, Precision 87.5%, Recall 82.7% — differs from the README's 0.759; likely a different version/split; treat as unverified marketing-page metric, cite only the README's numbers as the authors' claim.

---

## 3. GSE APPLICATION — gap (a) detector recall on piles/ground players

1. **Closest public analog to our 57-frame hand-labeled set.** Their 503-image, 8-class position detector (0.759 mAP@0.5) is the nearest scale reference for what small-data NFL detection achieves — it sets the bar for our detector-v2 eval: if our v2 trained on {57 ours + 443 CC-BY position images} can't clear ~0.75 mAP@0.5 on a held-out split, the bottleneck is labeling budget, not architecture.
2. **Label-design kernel (independent convergence):** both this project and the MDPI paper land on **8 coarse position classes** as the workable granularity for small data (12→8 coarsening in the MDPI paper). For a future position-aware detector head, use these 8 classes — do not invent a finer taxonomy on 57+443 images.
3. **Pre-snap formation context matters:** their model succeeds because pre-snap formation geometry is learnable — relevant to our tendency layer, and a reminder that our detector's person-class can eventually sprout a position head from formation context.

---

## 4. IMPLEMENTATION SPEC

**Target files:**
- New experiment script (not a repo source file yet): `packages/prediction-engine/src/tracking/detector-v2-experiment.md` documenting the eval, plus results in `docs/research/2026-10-01/cv-corpus/`.
- Reuses `Detector` interface in `cv-detector-contract.ts`.

**Protocol (detector-v2 comparison, using only USABLE-licensed data):**
```
1. Pull cs-1430/wr-finder v3 via Roboflow API (CC BY 4.0; attribution recorded in the experiment doc).
2. Merge with our 57 hand-labeled frames (person boxes → WR/CB/Safety/... where labelable, else a 9th 'player' class for person-only boxes; keep the 8-class taxonomy for the position subset).
3. Train two candidates with identical splits:
   - A: YOLOv8n fine-tune (same family as current production file detector)
   - B: Faster-RCNN ResNet50-FPN (two-stage; the AWS-SageMaker-blog hypothesis says it wins on small/occluded objects)
4. Eval on a held-out split with the 5-axis stratification from deep-dive-aws-sagemaker.md.
5. DECISION RULE: promote B only if it beats A by >= 5 points of recall in the worst-3 occlusion cells AND measured FPS stays within the file-detector budget; otherwise stay one-stage and spend the budget on more labels.
```

**Test assertions with expected values** (eval-harness test, new `detector-v2-harness.test.ts`):
1. Fixture: 8 boxes across two classes; mock detector returns 6 TP / 1 FP / 2 FN → assert `recall === 0.75`, `precision === 6/7 ≈ 0.8571` (tol 1e-9), `mAP@0.5` computed by the standard 11-point interpolation equals the hand-computed value (assert with a precomputed fixture — write the fixture, compute by hand, pin it).
2. License gate test: a test that reads a `DATASET_LICENSES.json` sidecar and **fails if any training dataset in the eval config lacks an explicit license entry** — the process fix for this whole incident. Expected: with `wr-finder: "CC BY 4.0"` present → passes; with entry removed → fails with message matching `/no license recorded/`.
3. Stratified report test: the harness emits per-class AND per-occlusion-cell recall; assert cells exist for `high-occlusion` with `n >= 0`.

**Done/verified criteria:** eval harness green; experiment doc records {dataset versions, splits, seeds, per-stratum table, FPS, verdict}; attribution line for wr-finder CC BY 4.0 present; **zero files copied from the-playmakers repo** (verified by grep for its distinctive strings, e.g. `WR Finder.v1i`, in the diff).

---

## 5. IMPROVEMENT PATH
1. **Now:** pull wr-finder v3 (CC BY 4.0) as the position-class augmentation source; run the v2 comparison.
2. **Next:** if position-head recall on pile frames stays weak, add the Public-Domain Roboflow helmet set's Blurred/Difficult/Partial positives (see deep-dive-roboflow-helmet.md) — helmet boxes are a proxy for "person present in a pile" and cost nothing to license.
3. **Later / optional:** email the authors (via GitHub Issues, as their README invites) asking for an explicit LICENSE file — if they add MIT, the notebooks become USABLE; until then, RESEARCH-ONLY stands. Record any reply in this file.

---

## 6. EVIDENCE / CONFIDENCE
- **Confidence: HIGH.** License evidence is from the GitHub API and raw file fetches (deterministic); training-recipe numbers are the authors' own README claims (cited, not independently validated — the weights/zips were removed from the repo, so we cannot re-run their eval).
- The one inferred item — "absence reads as omission, not stealth" — is marked as a reading of evidence, not a license grant. It does not change the verdict.
