# c06 Verified Claims — Deep Research Consolidation

**Slice:** c06 (300 briefs) · **Date:** 2026-10-02 · **Coordinator:** c06 Phase 2+
**Method:** 6 analyst subagents, each reading assigned briefs fully and spot-verifying headline numbers against read-only source docs in `~/workspace/vendor/Sports/docs/`. Working papers: `deep/c06/working/`.
**Convention:** VERIFIED (checked against source) / VERIFIED-AS-TRANSCRIBED (present in source, not independently recomputed) / UNVERIFIED (no denominators/computation) / INFERENCE (analyst extrapolation, marked).

---

## 1. QB-behavior / trust-concentration claims

| # | Claim | Status | Evidence |
|---|---|---|---|
| 1.1 | Old-QB RB dump rate: 20.9% vs 18.2% RB target share (34+ vs <34), z=8.0, p=1.3e-15, n=4,936 team-weeks 2016–2024, concentrated 37+ | **VERIFIED AS REPORTED** (math sound; use as cohort prior, NOT an individual rule) | Source `docs/nflverse-data-catalog.md:48–54`; script `scripts/analytics/qb-age-rb-target-share.mjs` reviewed: Welch test textbook-correct, aggregation sound. Hand-checks: P(|Z|>8)≈1.24e-15 ✓; (20.9−18.2)/18.2=14.8% vs stated 14.7% (rounding noise, INFERENCE). **Flag:** regular-season ceiling is 4,736 team-weeks, so n=4,936 implies postseason included (INFERENCE) — confirm via re-run before production use. Script gaps: starter-by-most-attempts misattributes injury-relief weeks; no team/scheme fixed effects; age-34 cutoff looks post-hoc. |
| 1.2 | Goedert 18.8% targets-per-route with Brown on vs 27.1% off; 40.9% of PHI inside-the-10 targets 2025 | **VERIFIED AS TRANSCRIBED**, small-n | Present verbatim in `docs/dfs/research/2026-09-13/deep/stack-players-2026-09-13.md:65` (USA Today attribution). Same file flags without-Brown samples as "2-4 games with inconsistent definitions" — 27.1% has SE ≈ ±8–10pp. The **delta construct** (absence-driven concentration) is durable; the 8.3pp number is not a parameter. |
| 1.3 | Keenum career positional split ≈ league average (WR 59.6/TE 20.4/RB 20.0 vs league 59.3/20.9/19.7, n=2,270 targets); no checkdown spike in layoff-return games | **VERIFIED AS COMPUTED** | `docs/fantasy/research/2026-09-24/keenum-target-splits.md` (nflverse PBP 2013–2023). **Out-of-slice find: no c06 brief exists for it** — unmapped intelligence. Strongest empirical support for "safety blanket is a person, not a position"; single-game blankets (Thompson 23%, N. Brown 32%) carry the file's own "suggestive, not predictive" caveat. |
| 1.4 | Target-concentration (HHI) methodology in c06 | **CONFIRMED ABSENT** | Grep over all 300 c06 briefs: exactly 1 HHI hit (`c00/0983`, basketball scoring concentration, unrelated). Repo Herfindahl uses are market-side. Rodgers HHI 0.141/0.112 figures live in other slices (c01/c05), not c06. |
| 1.5 | Coverage-conditional tendencies (Ward 84% first-read unpressured; Geno→Wilson 44% vs man / 33% when blitzed; Lock→JSN 41% on blitz; Maye "terrible vs cover-6") | **UNVERIFIED host assertions** | Confirmed present in `docs/dfs/research/2026-09-25/week3-multi-episode-transcripts.md:63–65,88`, but that file is an intake read of a 14,794-unit podcast docx: no denominators, no n (one hard n=19 blitz attempts is tiny), denominators mixed (per-route vs per-target), Maye's is qualitative. Demote to hypothesis seeds. The coverage×situation **construct** is sound; these **values** are not evidence. |

**Buildable from nflverse pbp (exact fields):** M1 target HHI `Σ share_i²` (fields: `passer_player_id`, `receiver_player_id`, `pass_attempt==1`, exclude spikes/aborted/sacks) + EffN=1/HHI; M2 situational deltas (3rd down / red zone / trailing 4Q via `down`, `redzone`, `yardline_100`, `qtr`, `score_differential`); M3 absence-driven deltas (game-grain from pbp; route-grain needs charting). **Not pbp-computable:** first-read rate, coverage-conditional shares (need FTN/Fantasy Points/PFF charting). Naming discipline: the measurable object is *target concentration*; "trust" is the interpretation (INFERENCE).

---

## 2. Video/CV method claims

| # | Claim | Status | Evidence |
|---|---|---|---|
| 2.1 | ViViT-B + focal loss + Taguchi-L18: risky-tackle recall 0.67, F1 0.59 (vs C3D 0.583) | **VERIFIED** | `docs/arxiv-program/.../arxiv-deep/0209-*.md:38–41`. Caveat: FPOC hand-marked (not end-to-end); 1-in-3 risky events missed. |
| 2.2 | VideoMAE fine-tuned: fencing 90% (CI [0.8812,0.9187]) vs pose baseline 64.8%; −5pp on home video | **VERIFIED** | `docs/arxiv-program/.../arxiv-deep/0379-*.md:47–48`. ~960 test clips, splits unstated; −5pp on uncontrolled video = the viral-clip regime. |
| 2.3 | Hockey tracking homography+MPN: IDsw 151 vs 1056 (GT detections), IDF1 95.1% vs 71.8% | **VERIFIED with regime caveat** | `docs/arxiv-program/.../arxiv-deep/0389-*.md:51–55`. With real Faster R-CNN detections the IDsw edge **reverses** (453 vs 431). Headline is ground-truth-regime only. |
| 2.4 | TOTNet occlusion-aware ball tracking: RMSE 37.30→12.31; augmentation-alone hurts (54.26 vs 29.57) | **VERIFIED** | `docs/arxiv-program/.../arxiv-deep/0349-*.md:51,55`. Racket-sport regime; not football-portable as evidence. |
| 2.5 | GSE video-tracking spec: RF-DETR AP50:95 54.7; TransNetV2 shot F1 77.9–96.2; 3.58-yd template bias; QC gates 12.0 yd/s | **VERIFIED (spec text, NOT measured)** | `docs/engine/research/2026-09-26/2026-09-26-video-tracking-spec.md`. Spec is a contract, not built capability. Internal inconsistency flagged: watch-loop spec says "YOLO detector" while license posture rules Ultralytics YOLO AGPL lab-only, names RF-DETR shippable. |
| 2.6 | Sloan 2018: CART 86.5% QB-position, 72.3% on 29 formations, 500+ auto-tagged All-22 screenshots | **VERIFIED** | `docs/research/2026-10-01/cv-corpus/deep-dive-sloan2018.md:26–27`. Doctrine transfer: tuned simple models beat fancy ones on tiny labeled sets. |

**Structural finding (the blunt headline):** zero ASR, zero speaker ID, zero transcript alignment, zero affect/sentiment methods anywhere in c06's video corpus. All 8 video briefs are *play* classification/tracking. Trust-signal extraction from press conferences/viral clips is a **speech+NLP+metadata** problem; the corpus's CV work serves the film/tracking lanes. The Rodgers–Metcalf miss was a **discovery/triage failure** (findable clip, no sweep) — no video transformer in this slice would have fixed it. Correct architecture: **transcript-first pipeline**, CV in three supporting roles only (shot segmentation, speaker-presence confirmation, dedupe).

---

## 3. News/social method claims

| # | Claim | Status | Evidence |
|---|---|---|---|
| 3.1 | LEAP: ECE 0.1840→0.0876; Brier 0.4806→0.3157 (−16.5 macro-avg); prior ablation 0.6427 vs 0.6512 (prior load-bearing) | **VERIFIED** | Grep-confirmed in `docs/arxiv-program/.../arxiv-deep/0440-*.md`. Mechanism: P(θ\|E)∝P₀(θ)∏Pᵢ(eᵢ\|θ); τ_post=τ0+ηΣτᵢ; wᵢ∈[0.05,1.5]; >4σ outlier rejection; LOO Δⱼ audit. Ledger already specifies the NFL port (2024–2025, Grok briefs + injury reports as evidence, engine prob as prior; ADOPT: Brier ≥0.010 AND ECE ≥25%). **Numbers do not transfer** (validated on forecasting tasks, not NFL); the **mechanism** ports. |
| 3.2 | Kampakis Twitter-predicts-football: RF 65.6%±4.33%, κ=0.25±0.093 (1.98M tweets, ~90 EPL matches) | **VERIFIED, with the ledger's own limitations** | `docs/arxiv-program/.../arxiv-deep/0841-*.md`. Chi-square feature selection likely outside CV loop (optimistic bias); no time-ordered split; **never tested against odds**; 2014 Twitter ≠ 2026 X. Ledger's NFL port spec: ADOPT only if κ beats stats-only by ≥0.03 with the market as baseline; REJECT if sentiment adds nothing once lines are included. |
| 3.3 | NFL fandom emotional arcs: winner/loser sentiment 6.14/6.09→5.86/5.80→6.12/5.77 | **VERIFIED, descriptive only** | `docs/arxiv-program/.../arxiv-deep/1119-*.md`. Zero predictive validation; lexicon sentiment fails on sarcasm. |
| 3.4 | Sentiment completeness: grep over 300 briefs → 3 files (0841, 1119, 1522-false-positive) | **VERIFIED** | Nothing in the social-sentiment lane was missed. |
| 3.5 | BoRaEM per-source reliability (0530): joint item-rating + source-reliability EM | **VERIFIED with caveats** | Real-data gains over plain BT tiny (+0.20%); optimizes rank not calibrated probabilities; β clip to [0,1]. |

**Key conceptual distinction (verified across corpus):** expert-model disagreement (the 6 registry accounts) ≠ fan sentiment (0841/1119). Treating Waldman/Fortgang items with a sentiment classifier is a category error; treating bulk fan tweets with per-item likelihood elicitation is a cost error.

---

## 4. Calibration / compose-chain claims

All headline numbers verified at line level against arxiv-deep ledgers and GSE ops docs — **zero fabricated numbers found**:

| Claim | Number | Status |
|---|---|---|
| Market beats structural model (0670) | RPS 0.1905 vs 0.1972; ŵ=0.000 boundary; paired ΔRPS +0.0067 [0.0046,0.0088]; n=2,660 | VERIFIED (`0670:35`). One sport/model — the portable asset is the ŵ benchmark **protocol**. |
| Spread→win map (1614) | LD~N(−0.009, 13.588), n=2,560; p=7: 0.697 vs 0.689 actual; P(\|move\|>1)≈0.20 | VERIFIED (`1614:37`). Paper's own 53.5% vs Table-1 50.8% self-contradiction is real (dead-edge exhibit). |
| Partial Kelly (1755) | s_t=s_{t−1}+ε(s*_t−s_{t−1}) beats intermittent at both fee levels | VERIFIED. Vig-as-fee mapping is the ledger's INFERENCE, not a paper claim. |
| Margin-as-gate (1784) | top-two margin 10% @ 29.0% vs 13.3%; ceiling min(1,p/c) | VERIFIED. Engine mapping ("model−market prob") is an **analogy**, not the paper's quantity — the brief's walk-forward gate must not be skipped. |
| Conformal defect (0450) | 19% of m=10 calibration sets <85% conditional coverage | VERIFIED. Source adds "illustrative, not a universal constant" (`:49`) — the map drops this caveat. |
| Bridge bar | Brier 0.2237 vs spread-bucket 0.2120, 285 sealed games | VERIFIED (`bridge-fit:5,7`). Honestly reported as a loss. |
| Calibration-selected vs accuracy-selected (1079) | +34.69% vs −35.17% ROI, eighth-Kelly, NBA | VERIFIED (`1079:16`). Single NBA season; NFL gate (≥2 seasons) correctly demanding. |
| Net pressure (situational-edges) | r=+0.24135 walk-forward, n=250 | VERIFIED (`:7`). Single 2025 season; mild winner's-curse on the selected signal. |
| RES verdict | Brier 0.275 = REL 0.026 − RES 0.002 + UNC 0.250 | VERIFIED (`MURPHY:6–8`). **Scope correction:** RES=0.002 comes from ONE file, repeated across ~12 ops docs, not independently re-measured. The phenomenon (no discrimination) is independently corroborated 3 ways (AUC 0.4965 on 13,646 picks; ≥80 tail inverted 43.7% vs 86.2%; 27-season band inversion). Applies to **engine-native** probabilities, not the market-anchored display (Brier 0.1444–0.1692, REL 0.0044). |

**Real vs invented gates:** none invented by the brief layer — every numeric gate sits in the arxiv-deep ledgers' "Acceptance/rejection gate" sections. Critical disclosure: these are the **ledger author's authored decision rules** (one reader's engineering authority), not peer-reviewed claims. Weakest: 1169 combine step has no numeric threshold (qualitative only); situational/NGS entry bars (0.03, 0.08) are author-set knobs.

**Calibration discipline for new signals (extracted from the slice's actual guidance):** 0670 ŵ-vs-close protocol first → sealed bridge bar → walk-forward entry gates → resolution-before-recalibration → never lower floors → ECE-selection bake-off → margin gating after feasibility arithmetic → γ=0.5 correction discipline → conditional-coverage audits for small windows → fee-aware sizing last → market-prob display.

---

## 5. Structural gaps confirmed

1. **No trust-signal calibration doctrine** — the slice's calibration language is all about game-outcome probabilities; trust-signal extractor precision has no in-slice method (interim posture: human-in-the-loop triage).
2. **No live X feed** — X direct fetch blocked from this environment; mirrors already 403ing (registry known-gaps #1–2). The #1 hard block for the intake lane.
3. **No viral-clip discovery mechanism** — the IG sweep in-corpus is manual (Garrett). No automated entity-keyed, time-windowed discovery spec.
4. **No speaker-ID method or biometric policy** — neither the technical lane nor the policy decision exists in-slice.
5. **Entity-graph and signal-ledger are proposals, not implementations** — schema-bearing, no working code (BLOCK-2 tracked).
6. **180-QB metrics table (2026-10-01)** could not be located by filename in vendor docs — verify location before claiming it as the HHI vehicle.
7. **Postseason inclusion in the old-QB script** unconfirmed (INFERENCE from n > regular-season ceiling).
