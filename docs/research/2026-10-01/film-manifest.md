# Film Corpus Manifest

Repeatable clip inventory for the GSE film program. Every clip listed here
has a measured baseline; new experiments must report against these numbers.

## Clip 1: Rice 34-yard reception (Week 3, Chiefs)

- **File:** `/tmp/replay-corpus/rice-34yd.mp4` (local), canonical copy TBD
- **Frames:** 660 @ 30fps (22.0s)
- **Scene:** ~22 people (11 offense, 11 defense, officials)
- **Source:** Authorized official broadcast replay

### Measured baselines

| Experiment | Date | Result |
|---|---|---|
| Pilot 1: YOLOv8n detection | 2026-10-01 | 110 frames @5fps, 8.9 det/frame, conf 0.68 |
| Pilot 1: naive IoU association | 2026-10-01 | 98 tracklets, median 1.0s, phantom speeds 100-275 mph |
| Pilot 1: 10fps retest | 2026-10-01 | 147 tracklets, median 0.8s |
| Pilot 2: ORB stabilization @5fps | 2026-10-01 | 104/110 pairs, median residual 0.48px, mean 0.52px |
| Pilot 2: ORB stabilization @30fps | 2026-10-01 | 658/660 pairs, median 0.67px, mean 0.71px |
| Pilot 2a: stabilized + CV association | 2026-10-01 | 97 tracklets, median 1.0s, max speed 18.9 mph |
| Pilot 2b: raw + BoT-SORT | 2026-10-01 | 175 IDs, median 17 frames, longest 268 |
| Pilot 2c: stabilized + BoT-SORT | 2026-10-01 | 33 IDs, median 14 frames, longest 124 |
| Space v2: live per-frame pipeline | 2026-10-01 | 62 IDs (110 frames @5fps), 109/110 stab ok |

**Note:** The 30fps stabilization was originally misreported as 0.97px median.
Corrected 2026-10-01: **0.67px median, 0.71px mean** (full distribution).

### Status
- [x] Detection baseline
- [x] Stabilization baseline
- [x] Association comparison
- [ ] Field homography (proper surveyed correspondences)
- [ ] Identity-switch ground truth
- [ ] Calibrated speed validation vs NGS

## Adding clips

1. Copy to `/tmp/replay-corpus/` (or canonical location)
2. Record: frames, fps, duration, scene estimate, source authorization
3. Run detection + stabilization baselines
4. Add row to this manifest
5. Never use unauthorized footage
