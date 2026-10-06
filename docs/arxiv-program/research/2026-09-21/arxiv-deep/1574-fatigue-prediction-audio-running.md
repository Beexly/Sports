# [1574] Fatigue Prediction in Outdoor Running Conditions using Audio Data (arXiv:2205.04343)

**Citation:** Andreas Triantafyllopoulos, Sandra Ottl, Alexander Gebhard, Esther Rituerto-González, Mirko Jaumann, Steffen Hüttner, Valerie Dieter, Patrick Schneeweiß, Inga Krauß, Maurice Gerczuk, Shahin Amiriparian, Björn W. Schuller (Univ. of Augsburg / Univ. Hospital Tübingen, 2022). *Fatigue Prediction in Outdoor Running Conditions using Audio Data*. arXiv:2205.04343 (© 2022 IEEE). URL: https://arxiv.org/abs/2205.04343
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** REJECT

Requires a body-worn audio modality GSE cannot obtain for football players, validates with subject-dependent splits (the identity-bias flaw this batch's own 1573 paper identifies as invalidating), reaches only CCC 0.287, and offers no portable method beyond generic transfer learning — nothing here is active and worth adapting for GSE.

## 1. Research question
Overuse injuries strike 29–79% of runners yearly and are linked to fatigue-induced changes in running mechanics. Can self-reported fatigue (Borg RPE, 6–20) be modeled from smartphone audio recorded on the runner's arm in realistic outdoor conditions — a more accessible sensor than IMUs or wearables?

## 2. Dataset / schema
KIRun (new): 48 runners (21M/27F, ages 21–60), 185 sessions (1–5 per subject, ~45 min each) across Germany; modalities: audio (smartphone on armband, 16 kHz/16-bit stereo→mono, 5 phone models), heart rate, knee/foot biomechanical sensors — but only audio is analyzed. Labels: spoken RPE (6–20), wellbeing (−5–5), surface, elicited every 3–5 min via app; assumed constant over ±15 s windows → 15 h of labeled audio from 133 h raw. Ethics approved (Univ. Hospital Tübingen), registered DRKS00025380. Splits: 56/23/21% train/dev/test, subject-DEPENDENT (sessions from the same runners appear in train and test).

## 3. Method / model
CNN14 (Kong et al., VGG-style: 6×2 conv blocks, 3×3 kernels, max-pool, dropout 0.2, temporal mean+max pooling, 2 linear layers) on 30 s log-Mel spectrograms (64 bins, 32 ms window, 10 ms hop). Two variants: random init vs AudioSet-pretrained weights (last layer replaced). Trained 50 epochs, batch 24, SGD lr 0.001 + Nesterov 0.9 + wd 0.0001, CCC loss (standard for self-reported auditory regression labels), best epoch on dev.

## 4. Equations & assumptions
- Loss: concordance correlation coefficient (CCC) between predicted and reported RPE.
- Metrics: MAE, CCC.
- Assumptions: RPE constant over the ±15 s window around each spoken answer; footstep energy (0–100 Hz bursts) and breathing energy (~2000 Hz) are the fatigue carriers (Fig. 1 shows this qualitatively); subject-dependent splits are acceptable (they are not — see §9).

## 5. Features / target
Features: log-Mel spectrogram of 30 s armband audio. Target: Borg RPE (6–20), single label per segment.

## 6. Validation design
Subject-dependent train/dev/test splits (56/23/21%); best-epoch selection on dev; test MAE/CCC. Fairness stratification by age×sex; per-individual MAE analysis. No subject-independent (LOSO) evaluation; no comparison against an IMU baseline on the same KIRun data (only cites external IMU work, MAE 2.03, Opdebeeck et al. 2018).

## 7. Numerical results / baselines
CNN14-pretrained: MAE 2.35, CCC 0.287; CNN14-random: MAE 3.48, CCC 0.208. Fairness: age 51–60 worst MAE despite good representation; 41–50 (most underrepresented) among the best; sex performance roughly equal; pretrained flips some age×sex orderings vs random init (underspecification side-effect, D'Amour et al. 2020). Individual test-runner MAEs reach up to ~5.0 vs global 2.35 — heavy individual variation, personalization suggested. No like-for-like baseline on KIRun; external IMU reference: MAE 2.03 (better, but harder-to-acquire sensors).

## 8. Code / data availability
No code or dataset link given in the paper (KIRun not released here); pretrained CNN14 weights are public (Kong's audioset_tagging_cnn). Not reproducible end-to-end from the paper alone.

## 9. Leakage & limitations
Subject-dependent splits are the decisive flaw: sessions from the same runner appear in train and test, so the model can learn runner identity (voice, gait acoustics, device) rather than fatigue — exactly the "identity bias" that 1573 (SkiC-LSTM, same batch) cites Tello et al. 2024 to reject as inflating performance. Headline MAE 2.35 is therefore optimistic; CCC 0.287 indicates weak rank correlation. Label constancy over ±15 s is unverified. Only audio analyzed despite multimodal collection. 2022 paper; no follow-up personalization results included.

## 10. GSE overlap
Topical (fatigue→injury) but no overlap in actionable assets: GSE has no body-worn audio from players and no product surface for runner fatigue; the transferable pieces (AudioSet transfer learning, CCC loss for self-reports, age×sex fairness stratification) are generic ML practice, not paper-specific. The paper's own lesson — subject-dependent splits inflate results — is already captured more rigorously by 1573's LOSO protocol in this batch.

## 11. GSE implementation spec
None viable: the method requires armband audio from the athletes being monitored, which is unavailable for NFL players in games and practices GSE can access. No NGS or public-football data analogue exists for the input modality. The "cheap proxy beats expensive sensor" moral does not transfer without a concrete cheap signal for football internal load, which the paper does not provide.

## 12. Reproducible test
Not applicable — KIRun is not released and no code is linked, so the headline MAE 2.35 cannot be independently reproduced. The one checkable claim (CNN14-pretrained > random on any audio-RPE data) is generic transfer learning, not a paper-specific result worth GSE engineering time.

## 13. Acceptance / rejection gate
Rejected on four independent grounds, any one sufficient: (a) input modality (runner-worn audio) is unobtainable in GSE's football context; (b) subject-dependent validation inflates the headline result via identity bias — the flaw 1573 was ADAPTed partly for diagnosing; (c) CCC 0.287 shows the signal is weak even under the inflated protocol; (d) nothing portable remains after removing generic transfer learning. Requires replacement.

## 14. Improvement experiment
Were the modality available, the honest next experiment is the one the authors defer: LOSO evaluation (per 1573's protocol) + personalized heads per runner, testing whether individual MAE ≤ 2.0 is achievable — i.e., whether the global 2.35 survives de-identified validation. For GSE this paper's role is cautionary: apply its failure mode (subject-dependent splits) as a negative test when auditing GSE's own workload models.
