# Watch Pipeline Migration Spec — HF Space → Alibaba Cloud (2026-10-14, Motif recon)

Garrett's decision (2026-10-14): move `Beexly/gse-watch-pipeline` off Hugging Face. Recon only — nothing created, nothing purchased.

## What the pipeline actually is
Six files, last modified 2026-10-01. `python:3.11-slim` + FastAPI + uvicorn on port 7860. YOLOv8n weights (~6 MB) baked into the image at build. Endpoints: `GET /health` (open; Vercel scheduler warm-pings it every 3 min in game windows) and `POST /process-frame` (multipart JPEG ≤2 MB, ~720p; fields game_id/ts/fps/burst/homography; returns detections, tracklets, derived metrics as JSON).

- Compute: ORB/RANSAC stabilization → YOLOv8n + BoT-SORT tracking (per-game) → homography projection → metrics. Frames downscaled to 640 px, person class only, conf 0.35.
- GPU: exactly one consumer — ultralytics `model.track()`. Auto-uses CUDA when present, silently falls back to CPU when not. Documented escape hatch: `GSE_TRACKER=bytetrack` for CPU-only hosts (unproven at 5 fps burst).
- State: 100% in-process memory (per-game tracker dict, 6 h idle eviction). Exactly 1 worker / 1 replica, never shard. Any restart wipes live track state (true on HF today too).
- Storage: none. No persistent volume, frames never stored. The Space makes ZERO outbound calls and never touches Neon — the Windows watcher relays JSON to Vercel `/api/ops/watch-ingest`, which persists it.
- Env vars (names only): `SPACE_API_TOKEN` (required; Bearer auth on /process-frame; fail-closed 503 unset / 401 wrong), `GSE_TRACKER` (optional).
- Scope note: the Sports `intelligence/vision/` package on the #1156 branch is a SEPARATE spec-only state-estimator layer — not the Space's code, not part of this migration.

## Recommended target
**Alibaba ECS GPU instance, start/stop around game windows** — `ecs.gn6i-c4g1.xlarge` (4 vCPU / 15 GiB / 1× T4, the t4-small twin), PAYG, in a US region (`us-west-1` recommended after a live stock check; `us-east-1` alternative). Image built unchanged from the Space Dockerfile, pushed to ACR (Personal Edition = free). Stable Elastic IP survives stop/start, so the watcher + Vercel endpoints change exactly once.

Autoscale replacement: the existing cron's ESPN game-window logic carries over verbatim; only the two HF calls swap — status check → `DescribeInstances`, set-hardware → `StartInstance` / `StopInstance` with **StoppedMode = StopCharging** (compute billing halts, disk persists), driven by the aliyun CLI/OpenAPI with a scoped RAM AccessKey. New failure mode to surface loudly: StartInstance stock-out rejections.

Rejected: ECI serverless containers (per-window cold pull of a ~6–8 GB CUDA image + endpoint churn without a ~$16/mo ALB) and Function Compute GPU (execution model fights the single-process stateful contract).

## Cost model (rough; verify in-console at provisioning)
| | HF status quo | Alibaba ECS start/stop |
|---|---|---|
| Idle | cpu-basic $0 | ~$3–5/mo (disk + EIP while stopped) |
| GPU hour | t4-small $0.40/h | gn6i PAYG ~$0.7–1.0/h |
| GPU month (~65 h) | ~$26/mo | ~$45–65/mo |
| Total | ~$26/mo IF it could be paid | ~$50–70/mo |

Honest read: Alibaba is ~2× HF per GPU hour, and nothing about GPU hosting is perpetually free anywhere (new-account trial credits expire and effectively exclude GPU SKUs). What the premium buys: postpaid billing with no pre-paid balance wall (the Oct 12 HTTP 402 failure mode disappears) and no stuck-paused state. Optimization to test during burn-in: the CPU/bytetrack fallback on cheap spec-billing (~$0.17/h → ~$11/mo of windows) — if it holds 5 fps, most of the GPU line item evaporates, since YOLOv8n is tiny and the T4 is oversized for it.

## Garrett's taps (only his)
1. Alibaba Cloud (international) account: sign-up + identity verification + payment method on file.
2. RAM automation user + AccessKey (ECS start/stop/describe on this one instance), handed over via Secure Vault.
3. `SPACE_API_TOKEN`: re-enter the current value on the new host, or approve rotation (rotation also requires updating the Windows watcher config).
4. Region pick (recommend us-west-1) + approval of the one-time endpoint change (Windows watcher + Vercel scheduler).

## Cutover sequence
1. Taps above. 2. Clone Space repo, build unchanged, push to ACR. 3. Provision instance (GPU-ready image, EIP, security group = port 7860 only), run container with `--gpus all`, `--restart always`. 4. Verify BEFORE traffic: /health ok with model loaded; replay recorded frames via test_app.py against both hosts, diff detections/tracklets; confirm GPU actually engaged (inference ms); confirm the first real stop produces a stopped-billing line. 5. One full game in shadow (watcher on Alibaba, HF warm as fallback). 6. Switch watcher + Vercel warm-ping URLs; swap the autoscale cron to the ECS version. 7. Pause HF Space; keep repo as cold spare one week; then delete the Space.

## What breaks if cut over before verification
- Token mismatch → /process-frame fails closed; watch.* data silently dark for that game.
- Driver/CUDA mismatch → silent CPU fallback; 5 fps bursts fall behind, tracklets fragment — looks "up," produces garbage.
- Mid-game switch/restart → tracker state wipes; track IDs reset for the rest of the game. Cut over only between games.
- Missed endpoint update → frames/pings keep going to the dead HF domain.
- Stop-mode misconfiguration → "stopped" instance in KeepCharging mode bills ~$600/mo idle. The single most expensive checkbox in the migration — verify the first stopped bill before trusting the cron.
