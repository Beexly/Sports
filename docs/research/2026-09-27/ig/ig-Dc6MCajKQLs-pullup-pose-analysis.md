# IG-Dc6MCajKQLs — "Pull Up Analysis": 33-point pose grading + velocity-loss fatigue model

- Source: https://www.instagram.com/reel/Dc6MCajKQLs/ (@dyeallpies, posted 2026-09-05; 7,269 likes, 121 comments at read time)
- Fetched: 2026-09-27 via instagram-cli; caption is fully described in the post data (no guesswork needed).

## What it is

"Pull Up Analysis by Fable and DyeAllPies": a single pull-up set filmed on a doorway bar, run through a **33-point body-pose model** with a **second, independent tracker double-checking the rep count** (both agreed: 10). Every rep was graded on range of motion, eccentric (lowering) control, bottom lock-out, hip sway, pull speed, and left/right symmetry, plus derived work (J), peak power (W), rough energy cost (kcal), and an effort score. Key quantitative outputs: 92/100 efficiency score, ~414 J per rep, 350 W best pull, pull speed −46% rep 3→10, rep 10 costing 1.7× the effort of rep 3 for the same work. Asymmetry found: left elbow ~16° more bent than right at the top (camera angle acknowledged as confound).

## How it works (method summary)

1. Pose estimation (33 keypoints) over video frames + a redundant independent tracker as a verification channel.
2. Per-rep segmentation, then graded kinematic metrics per rep: ROM, eccentric control, lock-out, sway, speed, symmetry.
3. Biomechanics layer: work/power/energy from height/weight (188 cm, 79 kg) — a rough model, labeled as such.
4. **Velocity-loss fatigue model**: whole-set speed decay mapped to metabolic fatigue, citing Sánchez-Medina & González-Badillo (2011, Med Sci Sports Exerc) — velocity loss tracks fatigue and doesn't recover between reps.
5. Body-outline heatmap from Robust Video Matting (Lin et al. 2022) weighted by EMG literature (Youdas et al. 2010; Dickie et al. 2017).

## Exact GSE fit (verified repo paths)

- **Movement/trajectory lane methodology reference.** `gse-ml-service/app/models/movement.py` (branch `origin/hermes/wip-e1-movement-2026-09-26`) predicts per-player displacement from NGS frames. The pull-up video's *pipeline architecture* — detector → keypoints → per-segment graded metrics → derived biomechanics — is the template shape GSE needs for turning raw tracking frames into player-kinematic features. It does not plug in directly; the method pattern transfers.
- **Dual-tracker verification** (two independent trackers must agree on rep count) is a QC pattern worth copying for any GSE video pipeline before features enter `packages/feature-store` — the movement module already pins dangerous conventions by test; this is the same instinct.
- **Velocity-loss ≈ effort/fatigue signal:** the total-signal doctrine demands ingest-everything, including physiological signals (`docs/research/2026-09-27/total-signal-wiring-spec.md` adjustment layer). In-game fatigue proxies (e.g. late-game speed decay on NGS tracking) are a legitimate signal class; this video is a worked example of how to derive one from velocity decay.
- **Does NOT fit:** the DFS optimizer (`apps/web/lib/fantasy/dfs-exact.ts` and friends) — pull-up biomechanics have no line into salary/projection math.

## Concrete application sketch for GSE

Re-derive the pattern on NGS-schema data: from per-frame tracking, compute per-play kinematic summaries (route speed decay from rep 1→last, hip-sway equivalent = lateral oscillation, asymmetry = directional balance) and register them in the feature store with lineage; test predictive lift on next-play displacement error in the movement head. License-clean only. No pull-up code is reused — the pattern is reimplemented independently (standing re-implementation rule).

## Gaps / limits

- Pull-ups ≠ football: the domain transfer is the risk; nothing in this video validates for NFL movement.
- Camera-angle confound acknowledged by the creator — same hazard applies to broadcast footage; NGS canonicalization (`x' = 120 − x`, play direction) exists precisely for this.
- Energy-cost numbers are rough-model outputs, not measurements; do not treat them as ground truth.
