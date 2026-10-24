# Athlete 3D pose from 2D video — full pipeline spec (AWS ML blog)

Source: AWS ML Blog, "Estimating 3D pose for athlete tracking using 2D videos and Amazon SageMaker
Studio". Generic athlete-tracking recipe, directly applicable to broadcast NFL frames where tracking
chips are absent.

## Pipeline as published
1. Video pulled from S3, extracted to PNG frames (`video_name + second_count + frame_count`).
2. **YOLOv3** (Pascal VOC pretrained) person detection -> bounding box per person per frame.
3. Frames + crops into **3DMPPE** (Moon et al.), a camera distance-aware top-down multi-person
   method with two stages: **RootNet** (camera-centred root coordinates) and **PoseNet** (relative
   3D pose in the crop).
4. 3D coordinates projected back to original image space via the bounding box.
5. Pretrained weights from Human36 (17 keypoints) and MuCo3D (21 keypoints); evaluation with
   **MPJPE** (mean per-joint position error, Euclidean, lower better), with explicit null-joint
   masking.
6. Keypoint dictionary follows **COCO's 17 joints** (nose, eyes, ears, shoulders, elbows, wrists,
   hips, knees, ankles) in fixed index order.

## Why it belongs in this KB
Tracking-frame features (10 Hz x/y/velocity/orientation) are the substrate for ghost-defender and
pressure models, but they only exist for chipped games and public releases. This is a concrete,
published path to derive pose + derived motion from video instead: YOLOv3 -> 3DMPPE -> MPJPE-graded
joints, with COCO indexing so joints are addressable.

## Gaps stated
- Camera calibration is the weak point (broadcast cuts, pan/zoom); the article assumes fixed
  viewpoints and does not solve re-identification across cuts.
- Monocular depth is noisy; MuCo3D/Human36 priors are not athletes in pads.

# Adjacent results this cycle
- **Roboflow universe (NFL dataset)** — Cloudflare-challenged from both curl and browser, and
  `api.roboflow.com` requires a free API key (401 `OAuthException`). Blocked pending a key, not
  solved.
- **3dmodelsworld NFL tag** — downloadable stadium/player/helmet/ball meshes (Arrowhead, AT&T,
  FedExField, Auburn), useful for spatial calibration work.
- **NeuroTrackerX** — product site only, no data endpoints found (Slater-hosted pages, no `/api`).
