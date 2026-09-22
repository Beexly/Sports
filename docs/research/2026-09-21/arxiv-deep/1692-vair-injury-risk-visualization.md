# 1692 VAIR: Visual Analytics for Injury Risk Exploration in Sports (arXiv:2512.17446)

**Citation:** Chunggi Lee, Ut Gong, Tica Lin, Stefanie Zollmann, Scott A Epsley, Adam Petway, Hanspeter Pfister (2025). *VAIR: Visual Analytics for Injury Risk Exploration in Sports*. arXiv:2512.17446. URL: https://arxiv.org/abs/2512.17446
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, sections 1–8 + references).
**Verdict:** REJECT — a visualization-system paper with no quantitative evaluation and no transferable predictive or causal method; the risk thresholds are borrowed from cited biomechanics literature, and the pipeline's core components (Co-Motion, OpenSim) are off-the-shelf invocations, not contributions. Nothing here advances GSE toward prediction accuracy or calibration.

## 1. Research question

Injury prevention requires understanding how biomechanical risks emerge from movement in real-world video, but identifying injury-prone events from raw footage is slow and manual. The paper presents VAIR, a visual analytics system combining 3D pose reconstruction, biomechanical simulation, and synchronized visualizations for exploring joint-level injury risk in sports video (basketball case studies).

## 2. Method / model

- **Pipeline (Sec. 4):** (1) **3D mesh reconstruction** from monocular video via Co-Motion (SMPL parametric human model, temporally consistent multi-person tracking); (2) **biomechanical simulation** — joint trajectories fed into OpenSim musculoskeletal modeling to estimate joint torques, contact forces, muscle activation asymmetries, ground reaction forces; (3) **risk estimation** — reconstructed angles/forces compared against literature thresholds (e.g., ACL risk when ankle dorsiflexion ≈ 40° with knee flexion ≈ 22.5°; ACL anterior loading during knee flexion 30–90° with internal rotation/valgus); (4) **multi-view UI** — synchronized video, 3D reconstruction with risk annotations, multivariate line charts, spatial stress summaries.
- **Case studies (Sec. 6):** Achilles and ACL injury scenarios; e.g., reconstructed ACL case: knee flexion ~74°, abduction ~95°, internal rotation ~67° (valgus collapse mechanics); Achilles case: plantar flexion ~−32° with knee rotation.
- **Evaluation (Sec. 7):** expert user feedback only (P1–P3 quotes); no controlled experiment, no quantitative metrics.

## 3. Mathematics / equations / assumptions

- No new mathematical model. Biomechanical quantities come from OpenSim's musculoskeletal simulation; risk flags are threshold comparisons against published ranges (citations [4], [7], [10], [11], etc.).
- Assumptions: SMPL/Co-Motion reconstructions are anatomically faithful enough for biomechanical inference; literature thresholds generalize to reconstructed (noisy) kinematics; single-person, pre-segmented clips.

## 4. Dataset / schema

- **Data:** basketball motion clips (injury scenarios); no dataset named, sized, or released.
- **Schema:** monocular video → SMPL parameters → joint angles/torques/forces time series → risk-annotated frames.
- **Access:** none stated.

## 5. Features / target

- **Features:** joint angles (knee flexion/abduction/rotation, ankle dorsi/plantar flexion), joint torques, contact forces, muscle asymmetries from OpenSim.
- **Target:** none modeled — risk is threshold-flagged, not predicted.

## 6. Validation design

- **Design:** qualitative case studies + unstructured expert feedback. The authors explicitly acknowledge (Sec. 7.5, "Lack of Objective Performance Evaluation") that there are **no quantitative metrics** — no pose-estimation accuracy, no tracking performance, no risk-detection precision/recall, no comparison to baselines.

## 7. Exact results and baselines (numbers)

- **No experimental numbers produced by the paper.** The only numbers are (a) literature thresholds borrowed from citations (40° dorsiflexion / 22.5° knee flexion for Achilles; 30–90° knee flexion for ACL loading) and (b) descriptive angles from reconstructed case-study clips (~74°/95°/67° knee; ~−32° plantar flexion).
- **No baselines, no ablations, no user-study statistics.**

## 8. Code / data availability

**Stated:** none (no code, no data, no system release mentioned).

## 9. Leakage and limitations

- **No quantitative evaluation whatsoever** — the paper's own Sec. 7.5 concedes this; impossible to assess whether the risk flags are accurate.
- **Occlusion and small-subject failures** acknowledged: most errors in limbs, overlapping players, partial framing — exactly the conditions of broadcast NFL footage.
- **Single-person, pre-labeled clips** — real use needs continuous multi-person footage; contact vs non-contact distinction (which experts called "critical") is not handled.
- **No predictive model** — threshold flags from other papers' literature, so there is no method to adapt, only a system architecture to admire.
- **No code or data released** — cannot even replicate the UI.

## 10. GSE overlap

GSE's video operation does telestrated breakdowns, but nothing in VAIR transfers: GSE has no 3D-reconstruction or OpenSim capability, and the paper provides no validated method to build on. The injury-mechanism content angle is real but would be built from Co-Motion/OpenSim documentation, not from this paper.

## 11. GSE implementation spec

- **Not applicable** — no method to implement. The closest GSE-relevant artifact is the *idea* of automated biomechanical annotation of injury clips, which would be sourced from the Co-Motion and OpenSim projects directly, with thresholds from the cited biomechanics literature, not from this paper.

## 12. Reproducible test

- **None definable from the paper** — there is no model, no metric, and no dataset. Any test (e.g., "reconstruct an ACL injury clip and check the flagged angles against literature") would be testing Co-Motion/OpenSim, not VAIR.

## 13. Acceptance / rejection gate + improvement experiment

- **Gate (numeric):** REJECT — fails the minimum bar: zero quantitative results, zero released artifacts, zero transferable method. A visualization system that invokes off-the-shelf components and evaluates via three expert quotes does not meet Garrett's "active and worth adapting" standard and cannot be counted toward the 750.
- **Improvement experiment (for the record):** if the capability were wanted, the honest path is (1) benchmark Co-Motion reconstruction error on broadcast NFL injury clips against manual annotation (MPJPE per joint), (2) validate OpenSim-derived knee-valgus flags against known non-contact ACL events with precision/recall, (3) only then build the review UI. None of that is in this paper.

**Verdict:** REJECT — no quantitative evaluation, no transferable method, no released artifacts; replaced by a spare paper.
