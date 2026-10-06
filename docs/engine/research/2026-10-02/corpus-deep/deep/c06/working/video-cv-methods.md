# Video/CV extraction methods for trust-signal intake — deep research (c06)

**Analyst:** subagent (c06 slice analyst) · 2026-10-02
**Module focus:** pipeline that turns video (press conferences, viral clips, sideline footage) into structured trust signals ("QB frustrated with WR X", "coach praising rookie Y unprompted"), so no findable-pre-kickoff clip is ever absent from the pre-game sweep again.
**Method:** read c06-map + 8 assigned briefs in full; spot-verified 6 key numeric claims against read-only source files in `~/workspace/vendor/Sports/docs/` (reported below).

## The blunt summary first

**Almost nothing in this slice's video/CV corpus actually does trust-signal extraction.** Eight briefs and the in-slice CV notes are about *play* classification and *player/ball* tracking — detecting spearing tackles, tracking hockey players, classifying fencing actions, registering field geometry. The actual trust-signal task (press-conference / viral-clip analysis: speaker ID, affect, transcript alignment, clip triage) is a **speech + NLP + metadata** problem, not a computer-vision problem, and the corpus has **no** ASR, speaker-ID, transcript-alignment, or affect-classification methods in it at all. This is the largest honest finding of this report: the CV work in c06 serves the *film/tracking* lanes (watch loop, All-22 study, labeling factory), while the trust-signal intake needs a transcript-first pipeline that this slice does not describe.

---

## 1. Verified claims (with status)

| # | Claim | Number(s) | Source | Status |
|---|-------|-----------|--------|--------|
| 1 | ViViT-B + focal loss + Taguchi-L18 augmentation detects risky head-first tackles | risky recall **0.67**, risky F1 0.59 vs C3D baseline 0.583 (+8.4 pp, −9.9 pp safe recall); 733 clips, focal loss γ=1.6, α 0.6/0.4 | brief r02/0209, verified against `docs/arxiv-program/.../arxiv-deep/0209-*.md` L38–41 | **VERIFIED** |
| 2 | Fine-tuned VideoMAE beats pose-baseline on fine-grained actions | fencing **90%** (CI [0.8812, 0.9187]), boxing **83.25%**, vs pose baseline 64.8%; −5 pp on home (non-competition) video | brief r03/0379, verified against `docs/arxiv-program/.../arxiv-deep/0379-*.md` L47–48 | **VERIFIED** |
| 3 | Hockey tracking: homography footpoints + graph-MPN association | GT-detection regime: **IDsw 151 vs 1056**, IDF1 **95.1% vs 71.8%**; with real Faster R-CNN detections: IDsw **453 vs 431** (edge gone), IDF1 71.3% vs 62.9% (+8.4 pp); VIP-HTD cross-dataset IDF1 92.84%, 60 IDsw | brief r03/0389, verified against `docs/arxiv-program/.../arxiv-deep/0389-*.md` L51–55 | **VERIFIED** — including the regime caveat (see §4) |
| 4 | TOTNet occlusion-aware ball tracking | TTA full-occlusion RMSE **37.30 → 12.31 → 7.19** (OF variant), accuracy 0.63 → 0.74 → **0.80**; augmentation-alone ablation **hurts** (54.26 vs 29.57 baseline) | brief r03/0349, verified against `docs/arxiv-program/.../arxiv-deep/0349-*.md` L51, L55 | **VERIFIED** |
| 5 | Video-tracking spec (GSE build contract, SPEC not built) | RF-DETR Medium COCO **AP50:95 54.7**, 4.4ms latency; TransNetV2 shot F1 **77.9–96.2**; NCAA-vs-NFL template silent bias **3.58 yd**; QC gates: speed > **12.0 yd/s**, \|accel\| > 12.0 yd/s² flagged | brief d07, verified against `docs/engine/research/2026-09-26/2026-09-26-video-tracking-spec.md` L54, L89, L107, L119, L134, L206 | **VERIFIED** (spec text; not a measured result) |
| 6 | Sloan 2018 auto-tagged All-22 recipe | CART **86.5%** QB-position (3-class), **72.3%** on 29 formations from 500+ auto-tagged screenshots; tuned tree beat SVM/kNN on coordinate features | c06-map finding 20, verified against `docs/research/2026-10-01/cv-corpus/deep-dive-sloan2018.md` L26–27 | **VERIFIED** |

Additionally cross-read (not in the assigned 8, used for transfer context): the GSE live watch-loop spec (`docs/research/2026-10-01/cv-live-watch-loop.md`), CV corpus dataset-licenses (`dataset-licenses.md`) and top-kernels (`top-kernels.md`) — all verified to exist and read, not exhaustively number-verified.

---

## 2. Transfer assessment (play-CV → trust-signal CV)

Scored per source on: does any technique transfer to press-conference / viral-clip / sideline-footage analysis for trust-signal extraction?

| Source | Verdict on transfer | What transfers, what doesn't |
|--------|---------------------|------------------------------|
| **0209 (ViViT rare-event classifier)** | WEAK, INFERENCE | The *rare-event classification pattern* (focal loss + post-split augmentation + untouched validation folds) is genuinely the right template if GSE ever trains "signal-worthy clip" classifiers — viral trust signals are rare positives, same class-imbalance math. But the paper classifies *visual actions*, not speech content; nothing about transcripts. Hard dependency: FPOC (event center) is manually marked — the method is **not end-to-end** and cannot run on raw clips without a localization front end. |
| **0379 (FACTS VideoMAE)** | WEAK, INFERENCE | Honest caution number: −5 pp accuracy on home (non-competition) video = exactly the viral-clip regime (phone footage, bad lighting, compression) where video models degrade. The brief's best transferable idea is audio-visual fusion (cited TCN+audio 90% on fencing via blade-contact sounds): **for press conferences, audio is the primary signal and video is secondary** — any "affect from video frames" ambition is backwards without the audio track. Raw-video-beats-pose (90% vs 64.8%) suggests don't bother with pose estimation for clips. |
| **0389 (hockey tracking)** | NONE for trust signals | This is a watch-loop/tracking-lane method, period. Homography footpoints and identity tracking solve "where is each player" — irrelevant to "what did the QB say about the WR." Its honest lesson for the trust lane: report numbers in the *real* regime (with detections, 453 vs 431 IDsw — the headline 10× IDsw improvement **evaporates**; see §4). |
| **0349 (TOTNet)** | NEGLIGIBLE | Ball-tracking in racket sports; no transfer to press conferences. The only abstractly portable idea is encoding annotation uncertainty explicitly (Gaussian targets for occluded frames) — applicable to *any* trust-signal labeling where annotators disagree, which will be most of it. |
| **0369 (combat physics pose)** | NONE | Requires calibrated multi-camera rigs; NFL broadcast cameras aren't calibrated; 2 bodies ≠ 22 players; zero football footage. No transfer path to press conferences at all. |
| **0359 (tennis labeling factory)** | METHODOLOGICAL ONLY, INFERENCE | The tennis content doesn't transfer, but the *factory pattern* (taxonomy → annotation tool → auto-labeling stack → human-in-the-loop confirmation; "fork CVAT, don't rebuild") is the right blueprint for a trust-signal labeling operation on press-conference clips: entity-mention tags, claim-type tags, quote-worthiness scores, all human-verified. Its honest warning transfers too: transfer-learned CNNs beat from-scratch GCNs on tiny data — same will hold for any trust-signal classifier; don't train from scratch. |
| **0309 (HAR opinion piece)** | NONE | REJECT per brief: no methods, metrics, equations, or experiments. |
| **d07 video-tracking spec** | INFRASTRUCTURE ONLY | The most buildable in-slice artifact, but it's a *film* pipeline (shots → detection → tracking → homography → kinematics). For trust-signal intake, what transfers is the **pipeline discipline**, not the geometry: deterministic frame selection, shot segmentation, fail-loud QC gates, byte-identical runs, run manifests with sha256. These should govern any clip-ingestion pipeline. Note the spec is **SPEC, not built** (brief is explicit); don't cite it as deployed capability. |
| **c06-map finding 20 (Sloan 2018)** | METHODOLOGICAL ONLY | "Tuned simple model beats fancy model on small coordinate datasets" (CART 86.5%) — transfers as a doctrine: trust-signal pilots will start with tiny labeled sets; use trees/logistic regression, not transformers, at that scale. |

**The domain gap, stated plainly:** press-conference and viral-clip trust signals are carried by **speech, text, and metadata** (who said what, about whom, with what tone, when). No source in this slice performs ASR, speaker identification, transcript alignment, sentiment/affect scoring, or entity-claim extraction. The video/CV methods answer "what happened physically" — the trust lane needs "what was said and by whom." **INFERENCE:** the correct architecture is a transcript-first pipeline (ASR → speaker diarization/ID → NLP claim extraction → structured signal record) with CV playing only three supporting roles: (a) shot/segment boundaries for clip triage, (b) face-on-screen speaker confirmation, (c) thumbnail/duplicate detection. None of the in-slice methods were built for (a)–(c) either, though shot segmentation (d07 S1) and identity tracking (0389) are the nearest neighbors.

**External corroboration from the corpus that speech > video:** the c06 map's strongest trust-signal-adjacent findings are all *transcript-derived* — coverage-conditional QB tendencies from episode transcripts (d06), the Rodgers/WR trust-circle read — not vision-derived. The corpus itself votes transcript-first.

---

## 3. Buildable primitives (ranked)

Assumed stack: Python stdlib + numpy + pandas + sklearn. Anything needing torch/transformers is flagged **needs-dep**. These are primitives for a pluggable-extractor framework (`extractors/` with a common `(clip) -> List[Signal]` interface), not a single monolith.

### P1 — Structured signal record + conflict resolver (pandas) — build first
The one primitive that is 100% within scope and has zero dependencies. Defines the contract every other extractor feeds:
- Record: `(clip_id, source_url, posted_ts, speaker, entity, claim_type, stance, quote_text, source_reliability, extractor_name, extractor_version, extractor_conf)`.
- Resolver: dedupe near-identical quotes (normalized-text Jaccard, sklearn `TfidfVectorizer` + cosine), rank conflicting extractions by source reliability tier, emit a single canonical row with provenance list.
- Honest limit: garbage-in-garbage-out — this primitive is only as good as the extractors feeding it; its value is that it makes downstream trust-signal consumption auditable.

### P2 — Clip ingest + dedupe + shot segmentation (stdlib + numpy) — buildable today
- Deterministic frame sampling (`keep_idx = round(i * src_fps / target_fps)`, from the d07 spec — VERIFIED L54 pattern), perceptual dedupe via 64-bit dHash on downsampled frames (stdlib/numpy, no torch).
- Shot boundaries by frame-difference histogram change (numpy) — honest downgrade from the spec's TransNetV2 (MIT, **needs-dep**: torch), with the documented caveat that frame-diff misses dissolves/wipes (the spec's contaminant list).
- Metadata harvest: post timestamp, uploader, duration, title/description text — this is where the Rodgers-video-miss is actually fixed: a scheduled sweep keyed on *entities* (roster names) and *time windows* (pre-kickoff), not on video content.
- QC: same fail-loud doctrine as the d07 spec (NULL, never silent garbage).

### P3 — Transcript quote-miner (stdlib + sklearn) — the real trust-signal engine
Operates on transcript text (from an external ASR source or platform captions — ASR itself is **needs-dep**; the miner assumes text input):
- Entity mention extraction against a roster/coach name list (exact + fuzzy match); per-entity mention counts and co-occurrence windows.
- Stance heuristics: first-person criticism patterns ("I don't like", "needs to", "he's not"), praise patterns ("unprompted praise" = positive entity mention outside a direct question about them), negation/hedge lexicons; sklearn logistic on hand-labeled (quote, signal-worthy) pairs once the labeling factory (see §2, 0359 pattern) exists.
- Quote extraction: sentence windows around entity mentions with stance scores; emit the raw quote so a human can judge, never just the score.
- Honest limit: lexicon heuristics are brittle on sarcasm and coded coach-speak (the most information-dense kind); this is a triage tool for human review, not a publish-ready classifier. INFERENCE: no corpus source validates these lexicons — they must be built and calibrated on real press-conference transcripts.

### P4 — Affect-proximity proxies from transcript + audio metadata (stdlib + numpy)
- Transcript-derived: response length (word count per answer), question-to-answer latency (from caption timestamps), hedge-word density, repetition rate, refusal/redirect phrases ("we're focused on", "next question").
- Audio-derived (needs-dep for real acoustic features): energy/pause features from the audio track would go here; without torch, only container-level metadata (duration, silence gaps from a simple amplitude threshold on decoded PCM — numpy, if you decode audio outside the stdlib constraint).
- Honest limit: these are *proxies* for affect, not affect measurement. The 0379 lesson (−5 pp on uncontrolled video) applies doubly here: genuine multimodal affect classification is a research project; ship the proxies as triage features with provenance, never as trust scores.

### P5 — Visual speaker-presence confirmation (numpy; full version needs-dep)
- Cheap buildable piece: per-shot dominant-face presence (which face crops persist across a shot boundary) to attach "speaker on camera" flags to transcript segments — supports P3's quote attribution.
- Honest limit: actual face recognition / speaker ID is **needs-dep** (embeddings model) and privacy-sensitive (faces are biometric identifiers — needs a policy decision before build, consistent with the corpus's personal-identifier protections). Ship "face present / not present" via skin-tone-region heuristics only as a crude v0, or defer.

**Dependency summary:** P1 and P3 (text side) and P2 (frames/metadata side) are fully buildable on stdlib+numpy+pandas+sklearn. P4's acoustic half, P5's recognition half, ASR, and any transformer-based classifier are **needs-dep** (torch/transformers). The framework should be designed so text extractors run without any GPU dependency — the trust-signal pipeline must not wait on the CV stack.

---

## 4. Challenges / overstatements

1. **The corpus's video work answers the wrong question.** Eight briefs, hundreds of pages, zero ASR, zero speaker ID, zero transcript alignment, zero sentiment. Anyone claiming "the CV corpus covers trust-signal intake" is inflating — it covers *film intelligence* (tracking, classification, labeling). The Rodgers/Metcalf miss was a *discovery and triage* failure (findable clip, no sweep), and no video transformer in this slice would have fixed it. The fix is a scheduled entity-keyed sweep (P2) plus transcript mining (P3) — neither is CV.
2. **0389's headline number is regime-inflated.** The brief and source both confirm: the 10× IDsw reduction (1056 → 151) and 95.1% vs 71.8% IDF1 are in the **ground-truth-detections regime** — no detector noise. With real Faster R-CNN detections the IDsw edge *reverses* (453 vs 431). The paper leads with the flattering regime; the honest number for any GSE build decision is the with-detections one. Adopt IDF1-gain claims only from the real-detection regime.
3. **0379's 90% rests on thin ice.** ~960 fencing test clips, split ratios unstated, no bout-level de-duplication stated (near-duplicate frames may inflate), ambiguous annotations systematically excluded (selection bias), and −5 pp on home video — the viral-clip regime. Fine as a recipe reference; not evidence that fine-grained video classification works on uncontrolled social-media clips.
4. **0209's 0.67 recall with manual event centers.** FPOC (first point of contact) is hand-marked per clip — the method cannot run on raw video as presented, and 1-in-3 risky events are still missed. The brief's adoption gate (recall ≥ 0.65 on ≥300 NFL clips with *automated* localization) is the honest bar; the paper's number is not directly portable.
5. **The d07 spec is a contract, not a capability.** Thorough, license-clean, well-gated — and explicitly **not built**. Cite its numbers (RF-DETR 54.7, TransNetV2 77.9–96.2, 3.58-yd bias) as spec commitments and external benchmarks, not as GSE measurements. Related internal inconsistency: the live watch-loop spec says "YOLO detector" while the d07 license posture rules Ultralytics YOLO AGPL as lab-only and names RF-DETR as the shippable detector — flag for reconciliation before any build.
6. **0359's "fine-tuned CNNs beat GCNs" is an n=1 lesson** on ~2,055 tennis events with human-solved temporal localization (annotators marked hitting moments). Don't generalize beyond "on tiny labeled data, transfer-learned simple models win."
7. **TOTNet's NFL occlusion regime doesn't exist.** Racket-sport ball occlusion (briefly hidden behind a player) ≠ football's (ball hidden by bodies for whole plays, 22 players, moving camera). The brief is honest about this; anyone citing TOTNet numbers as football-tracking evidence is overstating.
8. **Legal/license traps are the binding constraint, not the math.** Per verified corpus notes: NFL is the most aggressive enforcer (standing video rule, AGENTS.md 2026-09-15); broadcast-footage processing needs legal clearance (0389 gate); Roboflow Universe terms unverified (lab-only); NFL Impact Detection competition terms UNVERIFIED (research-only); NGS data/methodology is internal-only per HARD doctrine. A trust-signal pipeline that ingests broadcast or platform video must clear these *before* the math matters.
9. **The watch loop is a ToS gray zone by its own admission.** The spec is explicit: screen-capturing his own licensed viewing for private analysis, mimicking normal viewing patterns, "risk is nonzero and owned, not hidden." That's an honest posture — but the RedZone/OCR game-ID piece is v1.5, not v1, and "no human in the loop" means any capture failure degrades silently into flagged-but-empty windows. For trust-signal intake, a missed window is exactly the Rodgers/Metcalf failure mode recurring.

---

## 5. Open gaps

1. **The entire speech pipeline is unmapped in-slice.** No ASR evaluation, no diarization, no speaker ID, no transcript alignment, no quote/sentiment extraction methods anywhere in c06. This is the actual core of trust-signal extraction and the corpus has nothing to lean on — needs a dedicated research pass (or a new slice) before any build beyond P1–P3.
2. **No viral-clip discovery mechanism.** The IG sweep in-corpus is manual (Garrett). There is no automated entity-keyed, time-windowed clip discovery spec — P2 above is a sketch, not a validated design. The Rodgers miss was a *sweep-coverage* failure; coverage needs its own spec (sources, cadence, entity list, deduplication against prior sweeps).
3. **Speaker ID / face recognition: no method, no policy.** P5's real version needs both a technical lane (embeddings, diarization fusion) and a policy decision (biometric identifiers, consent, storage) — neither exists in-slice.
4. **Affect from video is asserted nowhere with evidence.** The only affect-relevant numbers are proxies; genuine multimodal affect classification on press conferences is absent. Treat any future claim here as research-grade until a labeled press-conference dataset exists — the labeling-factory pattern (§2, 0359) is how you'd build that dataset.
5. **Calibration of trust signals is unaddressed.** The slice's calibration language (Brier/ECE, map top-20) is all about *probabilities of game outcomes*. Trust signals ("QB frustrated") need their own calibration: precision of the extractor on human-labeled press clips, false-positive cost when a signal moves a line. No in-slice method defines this — P3's human-in-the-loop triage is the interim posture.
6. **Cross-shot identity for sideline footage.** 0389's tracking is per-clip; the d07 spec explicitly scopes v1 to "no cross-shot re-identification." Sideline-footage trust signals (who is talking to whom on the sideline) need cross-shot identity — unmapped, and the 0389 lesson (headline numbers collapse under real detections) says to budget for it honestly.
7. **Provenance and auditability of signals.** P1 defines the record, but nothing in-slice addresses how a trust signal's provenance (which extractor, which version, which quote, which human verified) flows into the engine's signal-agreement machinery — the r19 defect (990 rows labeled CONFIRMS by source-counting, not direction comparison) is the cautionary tale: a trust-signal lane without provenance discipline will produce another agreement-field lie.

---

*Every number above carries its source; every extrapolation is marked INFERENCE. Unverified items are labeled as such; nothing here is inflated beyond what the briefs and verified source files state.*
