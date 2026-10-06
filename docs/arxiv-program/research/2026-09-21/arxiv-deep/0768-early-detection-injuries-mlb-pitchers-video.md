# [0768] Early Detection of Injuries in MLB Pitchers from Video (arXiv:1904.08916v1)

**Citation:** AJ Piergiovanni, Michael S. Ryoo (2019). *Early Detection of Injuries in MLB Pitchers from Video*. Indiana University. arXiv:1904.08916v1. URL: https://arxiv.org/abs/1904.08916
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache `/tmp/arxiv750-cache/fulltext/1904.08916.txt`; complete paper incl. all tables, bias experiments, discussion, references, verified end-to-end).
**Verdict:** ADAPT — first video-only injury detection/prediction work: I3D on optical flow from cropped TV broadcast footage, per-pitcher binary classification, with generalization studies (unseen pitchers, unseen injuries, handedness flip augmentation, injury-type breakdown, detection-horizon sweep k=10–75) and explicit dataset-bias audits. Directly portable to GSE: mechanics-based injury-risk flags from broadcast video of NFL players (e.g., QB throwing motion, WR cutting, OL stances), plus the methodology of appearance-invariant inputs and game-identity bias audits.

## 1. Research question
Can convolutional neural networks detect and predict injuries in MLB pitchers from video data alone — no sensors, no monitoring equipment — and (i) how well do per-pitcher models work, (ii) do they generalize to unseen pitchers and unseen injuries, (iii) which injury types are detectable, (iv) how early can injury be detected, and (v) is the model fitting to real motion rather than game-specific appearance bias?

## 2. Dataset / schema
30 games of 2017 MLB TV broadcast video; 20 pitchers injured during the 2017 season (4 with multiple injuries). 5,479 pitches total (~273/pitcher); each pitcher has ~100 "healthy" pitches from games not near the injury plus pitches from the game they were injured in. 12 left-handed + 8 right-handed pitchers. 10 injury types: back strain, arm strain, finger blister, shoulder strain, UCL tear, intercostal strain, sternoclavicular joint, rotator cuff, hamstring strain, groin strain. Label: last k=20 pitches before DL placement = "injured" (469 injured, 5,010 healthy at k=20). Public release not stated; dataset constructed from broadcast video.

## 3. Method / model
- Preprocessing: crop to pitcher bounding box from 1920×1080; convert to greyscale; compute optical flow (appearance-invariant: immune to jersey, team, scoreboard pitch count, time of day, background fans — all shown to cause RGB overfitting, Fig. 1). Input: 600 optical-flow frames at 460×600 (10 s clip at 60 fps), high frame rate/resolution to capture subtle motion differences.
- Model: I3D (Carreira & Zisserman 2017), optical-flow stream initialized from Kinetics pre-training, fine-tuned with binary cross-entropy ℒ = Σᵢ(yᵢ log pᵢ + (1−yᵢ) log(1−pᵢ)); 100 epochs, lr 0.1 decayed ×10 every 25 epochs, dropout 0.5.
- Experimental grid: (a) per-pitcher models (50/50 healthy/injured split train/test); (b) cross-pitcher transfer; (c) arm-grouped models (12 lefty / 8 righty / all 20); (d) unseen-pitcher generalization (train on half the pitchers, test on other half); (e) healthy-only adaptation (unseen pitchers contribute only healthy pitches in training); (f) cross-arm with horizontal-flip augmentation; (g) per-injury-type evaluation; (h) horizon sweep k ∈ {10,20,30,50,75}.
- Bias audits: (i) train a separate CNN to predict *which game* a pitch is from, on RGB vs cropped-RGB vs flow vs cropped-flow; (ii) temporal-order prediction (does pitch A precede pitch B?) on healthy-only games.

## 4. Equations & assumptions
(1) Binary cross-entropy ℒ = Σᵢ(yᵢ log pᵢ + (1−yᵢ) log(1−pᵢ)). (2) F₁ = 1/(0.5(1/recall + 1/precision)). Optical-flow stream of two-stream architecture (Simonyan & Zisserman 2014) as the appearance-invariant input.
Assumptions: last k pitches before DL = injured pitches (label noise: injury may not yet affect motion for larger k — directly probed by the k-sweep); injury occurred in-game (practice injuries excluded — no video); pitcher identity/stadium/camera angle do not affect mechanics (addressed via cropping + flow); Kinetics optical-flow features transfer to pitching.

## 5. Features / target
Input: cropped optical-flow frames of the pitching motion (motion only, appearance removed). Target: binary — pitch thrown while "injured" (within last k pitches before DL) vs "healthy."

## 6. Validation design
Per-pitcher 50/50 train/test splits on held-out pitches; unseen-pitcher splits; injury-type stratification; k-sweep for detection horizon. Metrics: accuracy, precision, recall, F₁. Two negative-control bias experiments (game-identity and temporal-order classifiers should be ~chance). Baselines: cross-pitcher transfer pairs, arm-group models, majority-class implicit in accuracy comparisons.

## 7. Numerical results / baselines
- Per-pitcher (Table 1, k=20): average acc .93 / prec .82 / rec .72 / F₁ .75. Best: Boone Logan .98/.96/.97/.97; worst: Aaron Nola .92/.50/.34/.42; Corey Kluber .95/1.00/.33/.50. Highly pitcher-dependent.
- Cross-pitcher transfer (Table 2): mostly poor (e.g., Wood→Brice F₁ .22, Chapman→Bailey F₁ .00); some pairs transfer (Liberatore↔Wainwright recall .85–.87).
- Arm-grouped (Table 3): lefty .95/.85/.77/.79; righty .94/.81/.74/.74; all pitchers .91/.75/.73/.74 — pooling all pitchers does not beat arm-grouped (lefty/righty motions differ too much).
- Unseen pitchers (Table 4): poor — lefty F₁ .43, righty .38, all .35. BUT healthy-only adaptation (Table 5): training on half pitchers' injured+healthy plus only *healthy* pitches from the other half → lefty F₁ .63, righty .67, all .71, nearly matching seen-pitcher performance (Table 3). Key finding: model generalizes to unseen pitcher injuries without ever seeing that pitcher injured.
- Cross-arm (Table 6): left-to-right F₁ .03, right-to-left .05; with horizontal flip: .38/.44; with flip + healthy pitches of target arm: .56/.56 — flip augmentation recovers cross-arm generalization.
- Per-injury-type (Table 7): hamstring .98/.89/.92/.91 (lefty), groin .93/.85/.83/.84, shoulder .94/.82/.89/.85, intercostal .94/.84/.87/.86 — excellent; UCL tear .92/.74/.72/.74 — good; finger blister .64/.06/.02/.05 — complete failure (motion barely changes).
- Detection horizon (Table 8, F₁): k=10: .68/.64 (lefty/righty); k=20: .63/.67; k=30: .65/.69; k=50: .48/.52; k=75: .47/.44 — reliable detection within ~10–30 pitches before DL; beyond ~50 pitches the injury signal is not yet in the motion.
- Bias audits (Tables 9–10): game-identity classifier on cropped flow ≈ chance (0.45–0.55 vs 0.86–0.98 on RGB) — flow removes game-specific bias; temporal-order prediction ≈ 0.49–0.54 (~chance) — model fits injury motion, not temporal drift.

## 8. Code / data availability
No code repo or dataset release stated. I3D + Kinetics pre-training is public; optical flow computation standard. Reimplementation is feasible from the described recipe.

## 9. Leakage & limitations
(i) Label noise: "last k pitches = injured" is a proxy — the k-sweep shows signal only emerges within ~30 pitches, so larger k dilutes with healthy-labeled-as-injured examples; (ii) tiny injury sample: 469 injured pitches from 20 pitchers, 10 injury types (some types have 1–2 examples); (iii) single season (2017), broadcast cameras only — no claim on other levels of baseball or other camera setups; (iv) interpretability: Feichtenhofer-style visualization gives only rough spatio-temporal heatmaps, no actionable biomechanical explanation — "the largest limitation" per authors; (v) single-pitch classification ignores sequential overuse structure — authors note sequence models would need far more injury data; (vi) no calibration of injury probabilities, no confidence intervals; (vii) optical flow discards appearance detail that might carry signal (e.g., facial grimacing).

## 10. GSE overlap
New territory for the causal/injury lane: the existing map has workload/GPS-based injury work (cf. ledger 0767) but no video-from-broadcast mechanics-based injury detection. Portable elements: (a) appearance-invariant optical-flow inputs for broadcast video — directly applicable to NFL QB throwing motion, kicker/punter mechanics, WR route-running cuts from All-22/broadcast; (b) the game-identity and temporal-order negative-control audits — a template for de-biasing any video model GSE builds (stadium, jersey, lighting, broadcast graphics); (c) the healthy-only unseen-subject adaptation protocol — GSE can train on known-injured players + healthy tape of everyone else and still flag unseen players; (d) per-injury-type detectability ranking — motion-visible injuries (hamstring, groin, shoulder) vs motion-invisible (finger blister ≈ NFL analogue: hand/finger injuries); (e) the k-horizon sweep — detection lead time ~10–30 events before the injury report.

## 11. GSE implementation spec
- **Broadcast-mechanics injury flags**: build a pipeline — (1) detect/crop player (QB on dropbacks, or designated skill players) from broadcast/All-22; (2) greyscale + dense optical flow at 60 fps; (3) fine-tune a 3D CNN (I3D or modern video backbone, Kinetics-pretrained flow stream) as a binary classifier: "healthy week" vs "last-k-plays before injury-report appearance." Start with QBs (throwing motion most stereotyped) and hamstring/groin/shoulder injury types (paper's most detectable).
- **De-biasing protocol**: before trusting any flag, run the paper's two audits — a game/stadium-identity classifier on the model inputs (must be ≈ chance) and a temporal-order classifier on healthy-only games (must be ≈ chance). Reject any model that passes injury classification but fails the audits (it's fitting broadcast artifacts).
- **Handedness/role augmentation**: mirror augmentation (horizontal flip) for left/right-handed QBs and for left/right leg injuries, per the paper's cross-arm result (F₁ .03→.56 with flip + healthy data).
- **Horizon discipline**: sweep the label window k (plays/weeks before injury listing) and ship flags only for k where F₁ clears the bar; expect the signal to vanish beyond a few weeks, per the paper's k=50/75 collapse.
- Effort: ~1 week to build crop+flow pipeline on GSE's existing video access; ~2 weeks to train and audit the first QB model. Requires per-play injury-report alignment (have: official NFL injury reports).

## 12. Reproducible test
Dataset: 2022–2024 NFL broadcast/All-22 QB dropbacks aligned to official injury reports (QBs who appeared on the report with shoulder/hamstring/groin designations vs healthy weeks). Train per-QB and pooled (healthy-only adaptation for unseen QBs) flow-based I3D classifiers with label window k ∈ {1, 2, 4} weeks before listing. Evaluate: per-QB F₁, unseen-QB F₁ (healthy-only protocol), per-injury-type F₁, plus the two bias audits at chance. Success: unseen-QB F₁ ≥ 0.55 with both audits ≈ chance.

## 13. Acceptance / rejection gate
ADAPT the de-biasing audits and healthy-only generalization protocol immediately (cheap, assumption-light, sport-agnostic). ADOPT the flow-based injury classifier only if the reproducible test clears unseen-QB F₁ ≥ 0.55 with audits at chance; otherwise REJECT video in favor of workload/GPS-style tabular features (ledger 0767). REJECT per-QB-only models for deployment (no generalization) — ship only the healthy-adapted pooled model.

## 14. Improvement experiment
Augment the optical-flow I3D with a parallel tabular stream (pitch velocity, spin, release point, days rest) fused late, and re-run the healthy-only adaptation protocol. If the multimodal model beats flow-only on unseen-pitcher F₁, the visual signal (mechanics drift) and the tabular signal (workload) are complementary; if not, the flow features already encode the workload state and the tabular stream adds nothing — settling the paper's open question about what the network actually detects.
