# [0322] eSkiTB: A Synthetic Event-based Dataset for Tracking Skiers (arXiv:2601.06647v1)

**Citation:** Krishna Vinod, Joseph Raj, Vishal, Kaustav Chanda, Prithvi Jai Ramesh, Yezhou Yang, Bharatesh Chakravarthi (2026). *eSkiTB: A Synthetic Event-based Dataset for Tracking Skiers*. arXiv:2601.06647v1. Accepted at WACV 2026 Workshop on Computer Vision for Winter Sports. URL: https://arxiv.org/abs/2601.06647v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 546 lines).
**Verdict:** REJECT — a skiing event-camera (neuromorphic sensor) tracking benchmark with no transfer path to GSE: GSE consumes NFL broadcast footage and NGS tracking data, not event-camera hardware or synthetic skiing streams, and the sport, sensor modality, and task have no NFL analog.

## 1. Research question
Can event-based (neuromorphic) vision robustly track high-speed skiers in cluttered broadcast footage, and can we build a controlled benchmark that fairly compares event vs RGB sensing? The authors introduce eSkiTB — synthetic event streams generated from the SkiTB ski-broadcast dataset under a strict iso-informational constraint (no neural frame interpolation) — and benchmark a spiking transformer (SDTrack) against an RGB transformer (STARK).

## 2. Dataset / schema
eSkiTB: 300 video sequences (~235 minutes) of competitive skiing derived from SkiTB, converted to synthetic event streams at 1280×720 via the v2e simulator. Three disciplines: alpine skiing (AL), freestyle skiing (FS), ski jumping (JP); 98 unique locations worldwide; 10 weather categories (clear/glare to heavy snow, fog, rain); day and night events; multiple camera viewpoints with scale variation and occlusions. Splits: 240 train / 30 validation / 30 test sequences. Event storage: HDF5, tuples (t, x, y, p) with t in microseconds, p ∈ {0,1} polarity. Annotations: single class 'Skier', bounding boxes [x, y, w, h] in absolute 1280×720 pixels, top-left origin; frame-aligned plus dense interpolated labels at 1 ms (1000 Hz) via cubic spline. v2e configuration: contrast thresholds Cpos = Cneg = 0.2; leak rate τleak = 0.01 Hz; photoreceptor cutoff f3dB = 300 Hz; photon shot noise 0.001 Hz; photoreceptor exposure mode. Dataset statistics: sequence lengths 275–3,582 frames (avg 1,176); target bbox area 0.001%–100% of image (mean 4.99%, typically <4%); mean event rate > 10×10⁶ events/s, 95th percentile 1.58 Meps; event density peaks during take-off (~20% of sequence). High-clutter stress subset: 9 multi-camera test sequences with ≥50% background clutter or partial-occlusion annotations. Release: dataset and code at https://github.com/eventbasedvision/eSkiTB.

## 3. Method / model
(a) **Iso-informational conversion**: raw 25–60 Hz RGB frames fed directly into v2e with neural interpolation (SuperSloMo-style) deliberately disabled — deterministic, photometrically faithful conversion; every event corresponds to a real observed photometric change. This makes the benchmark a conservative lower bound (micro-dynamics < ~40 ms are linearized away).
(b) **Trackers (architectural parity: both transformers)**: STARK (RGB transformer, appearance cues, spatial attention, template updates) in three variants — generic, fine-tuned, ski-specific (results reproduced from SkiTB); SDTrack (spiking transformer for asynchronous events, global trajectory prompt for object permanence). Because current SNNs are limited to small tensors, the 1280×720 stream is discretized into 128×128×T voxel grids for evaluation.
(c) **SDTrack fine-tuning**: GIoU + L1 + location losses; AdamW, lr 1×10⁻⁴, weight decay 1×10⁻⁴, batch size 2, single NVIDIA RTX 4090; checkpoint at epoch 20 (validation metrics peaked; training loss kept falling — early stopped against overfitting).
(d) **Evaluation**: one-pass evaluation (OPE) per SkiTB protocol — initialize with first ground-truth box of each multi-camera sequence, run once without resets; per-sequence means of mean IoU, Precision@20 px, Success@0.5 IoU on the 30-sequence test split.

## 4. Equations & assumptions
The only stated equation is the dense-label interpolation:

(1) b(t) = Spline(t; {b_k, t_k}) — dense bounding-box label at time t via cubic spline over keyframe boxes/annotations; chosen over linear interpolation to preserve C² continuity of the ballistic trajectory (physically mandated by aerodynamic drag/lift on the jumper).

Simulator parameters stated (see §2): Cpos = Cneg = 0.2, τleak = 0.01 Hz, f3dB = 300 Hz, shot noise 0.001 Hz. No equations stated for the trackers (cited architectures) or the loss combination.

Stated assumptions: (a) v2e with disabled interpolation produces photometrically faithful events (sim-to-real gap acknowledged as future work); (b) cubic-spline interpolation respects true ballistic motion; (c) comparing two transformer architectures isolates modality effects (architectural parity assumption); (d) static overlays produce zero events (true for fixed image-plane graphics); (e) voxel-grid discretization preserves enough temporal contrast for tracking.

## 5. Features / target
Input: event streams (t, x, y, polarity) discretized to 128×128×T voxel grids for SDTrack; RGB frames for STARK. Target: skier bounding box [x, y, w, h] per timestamp (dense 1 ms labels); metrics mean IoU, Precision@20 px, Success@0.5.

## 6. Validation design
Fixed 240/30/30 sequence split; test split held out strictly. OPE protocol, no resets. Baselines: generic STARK (off-the-shelf), fine-tuned STARK, ski-specific STARK (from SkiTB), pretrained SDTrack (no fine-tuning, IoU 0.312 — demonstrates the domain gap). Analyses: discipline-conditioned (AL/FS/JP), attribute-conditioned (low-resolution, low-resolution + fast motion, high-clutter 9-sequence stress split), qualitative drift comparison. No cross-dataset generalization test; no hybrid RGB+event fusion baseline (deliberately excluded to isolate the modality).

## 7. Numerical results / baselines
All numbers quoted from the paper (Table 3 and text; paper's claims):
- Overall test (OPE): STARK generic 0.512 IoU / 0.567 Precision@20px / 0.568 Success@0.5; STARK fine-tuned 0.795 / 0.847 / 0.904; STARK ski-specific 0.829 / 0.887 / 0.935; SDTrack pretrained 0.312 / 0.354 / 0.418; **SDTrack fine-tuned 0.711 / 0.720 / 0.873** (abstract: mean IoU 0.711).
- Fine-tuning gain for SDTrack: +0.399 IoU over pretrained. Fine-tuned event tracker beats generic RGB STARK by +19.9 IoU points.
- High-clutter split (9 sequences): SDTrack 0.685 IoU / 0.694 precision / 0.860 success — gains of +20.0 IoU, +15.2 precision, +33.8 success points over generic STARK (abstract: 0.685 IoU, +20.0 over RGB). Ski-optimized STARK still leads on this split (0.833 IoU for STARKski); gap narrows to ~10 IoU points.
- Discipline splits: JP — SDTrack 0.974 / 0.982 / 0.998 (+5.9 IoU over STARKski, +35.6 over generic STARK); AL — 0.762 vs 0.815 (STARKft); FS — 0.569 vs 0.728 (STARKft), attributed to 128×128 voxel quantization aliasing at high angular velocity/small scale.
- Attribute analysis: extreme low-resolution sequences — SDTrack IoU > 0.72 vs RGB STARK 0.47–0.59; low-resolution + fast-motion freestyle clips remain hard for both modalities.

## 8. Code / data availability
Dataset, conversion pipeline, and evaluation code to be released at https://github.com/eventbasedvision/eSkiTB. No raw-code link verified in the paper text beyond the stated URL.

## 9. Leakage & limitations
- **Sim-to-real gap**: all events are v2e-simulated; real event-camera validation is future work (logistically blocked by drone-flight bans at competitions). Synthetic events may flatter the modality.
- **Temporal quantization**: source RGB at 25–60 Hz with interpolation disabled means micro-dynamics (<40 ms) are smoothed out — conservative lower bound per the authors, but also a fidelity ceiling.
- **Resolution bottleneck**: 128×128 voxel grids (SNN compute limits) act as a low-pass filter; directly blamed for the freestyle collapse (0.569 IoU) and small-target aliasing. The dataset's 1280×720 fidelity is unused by the benchmarked tracker.
- **RGB still wins when optimized**: ski-specific STARK beats fine-tuned SDTrack overall (0.829 vs 0.711) and on the clutter split (0.833 vs 0.685) — the "event advantage" is relative to the *generic* RGB baseline, not the domain-tuned one.
- **No fusion baseline**: hybrid RGB+event (the likely production choice) deliberately excluded.
- **Single sport, single task**: skiing bounding-box tracking; no evidence the clutter-robustness generalizes to other sports or to tasks like pose estimation.
- NFL external validity: none — neuromorphic sensing is a hardware modality GSE does not and will not use; skiing has no NFL analog; broadcast-overlap clutter in NFL footage is a real problem but GSE's video work is highlight clipping, not athlete tracking.

## 10. GSE overlap
Existing map coverage: the tracking_ngs lane covers NGS metric taxonomy and the NGS-replacement spec (reproducing tracking metrics from public data); the 15-area ML brief includes multimodal fusion. **No event-camera / neuromorphic sensing work exists anywhere in the corpus**, and GSE has no hardware-sensing lane — NGS tracking data arrives pre-computed from the league. The paper's conceptual point (motion/temporal-contrast vs appearance for tracking under broadcast clutter) is adjacent to GSE's broadcast-video highlight work, but GSE does not do athlete tracking from video at all. **Verdict: no overlap, no transfer path** — REJECT.

## 11. GSE implementation spec
None recommended — REJECT. The closest conceivable (and not recommended) port would be motion-based player segmentation from NFL broadcast footage using frame-differencing as a poor-man's temporal contrast for highlight-clip detection, but GSE's video operation is fair-use clip editing, not computer-vision tracking, and the paper's hardware-dependent results do not transfer to software frame-differencing.

## 12. Reproducible test
Not applicable — REJECT. (If a future GSE video-tracking lane ever opens, the test would be: replicate the iso-informational conversion protocol on NFL broadcast clips and compare an event-simulated tracker vs STARK on receiver tracking under score-bug overlays; no such lane exists today.)

## 13. Acceptance / rejection gate
**Reject** — the paper is read in full and rejected on domain grounds: neuromorphic sensing hardware and synthetic skiing data have no path into GSE's NFL analytics or content operation. Revisit only if GSE ever builds a video-based player-tracking product, at which point the iso-informational benchmarking protocol (§3.2) is the portable methodological contribution.

## 14. Improvement experiment
Beyond the paper (for the computer-vision community, not GSE): close the sim-to-real gap by collecting a small paired real-event-camera + RGB dataset at a non-competition training venue (sidestepping the drone-flight ban), then measure how much of the +20 IoU clutter advantage survives on real sensor noise; and test a hybrid RGB+event fusion tracker, which the paper deliberately excluded but which is the realistic deployment choice — the marginal value of events *given* RGB is the number that actually matters for product decisions.
