# Google Cloud Browser + Authenticated CLI Leverage & Optimization Playbook (`galaxysportsedge`)

- **Generated (UTC):** `2026-11-14T02:34:22.771413+00:00`
- **Browser Control Mode:** Owned headed Chrome instance (`playwright.sync_api`, isolated automation profile — zero cookie/session tampering on personal Chrome).

## 1. Live Browser Observations Across Google Cloud Documentation, Pricing & Console

| Slug | URL | Status | HTTP | Page Title | Key Browser-Extracted Pricing & Optimization Signals | Screenshot |
|---|---|---|---|---|---|---|
| `free_tier` | `https://docs.cloud.google.com/free/docs/free-cloud-features` | `OK_INSPECTED` | `200` | Free Google Cloud features and trial offer  /  Google Cloud Free Program  /  Google Cloud Documentation | Google Cloud Free Program; Google Cloud Free Trial; What to expect at Free Trial signup; During the Free Trial | `gcp_browser_free_tier.png` |
| `vertex_pricing` | `https://cloud.google.com/model-garden/pricing` | `OK_INSPECTED` | `200` | Agent Platform Pricing / Google Cloud | Context Cache Storage price for Explicit Caching; Provisioned Throughput; Flexible Savings Plans (FSPs) are spend-based committed use discounts that help you save money on your usage across eligible products on Google Cloud. For more information about how FSPs | `gcp_browser_vertex_pricing.png` |
| `gcs_storage_classes` | `https://docs.cloud.google.com/storage/docs/storage-classes` | `OK_INSPECTED` | `200` | Storage classes  /  Google Cloud Documentation | Perform batch operations on objects; Send batched requests; Caching in Cloud Storage FUSE; Use Cloud Logs with storage batch operations | `gcp_browser_gcs_storage_classes.png` |
| `cloud_run_pricing` | `https://cloud.google.com/run/pricing` | `OK_INSPECTED` | `200` | Cloud Run pricing / Google Cloud | Cloud Run charges you only for the resources you use, rounded up to the nearest 100 millisecond. Your total Cloud Run bill will be the sum of the resource usage in the pricing table after the free tier is applied.; When evaluating the pricing of Cloud Run, con | `gcp_browser_cloud_run_pricing.png` |
| `cloud_startup` | `https://cloud.google.com/startup` | `OK_INSPECTED` | `200` | Google for Startups Cloud Program / Google Cloud | GOOGLE FOR STARTUPS CLOUD PROGRAM; Run your startup on the same cloud trusted by nearly all generative AI unicorns. Accelerate your roadmap with a unified AI stack, dedicated technical support, and up to $350,000 in credits to keep your momentum moving forward | `gcp_browser_cloud_startup.png` |
| `cloud_console_welcome` | `https://accounts.google.com/v3/signin/identifier?continue=https://console.cloud.google.com/welcome?project%3Dgalaxysportsedge&followup=https://console.cloud.google.com/welcome?project%3Dgalaxysportsedge&osid=1&passive=1209600&service=cloudconsole&flowName=GlifWebSignIn&flowEntry=ServiceLogin&dsh=S1747879391:1794623658925451` | `AUTH_REQUIRED_IN_FRESH_PROFILE` | `200` | Google Cloud Platform | Fresh owned Chrome automation profile was redirected to Google Sign-In; no authentication or credential bypass attempted per security policy. Use chrome://inspect/#remote-debugging in signed-in Chrome PID 4144 if interactive console clicking is desired. | `gcp_browser_cloud_console_welcome.png` |

## 2. Live Authenticated `galaxysportsedge` Utilization Gap vs Available Credits (`$103.11` + Dec 6 `+$100`)

| Resource Surface | Current Live State (`gcloud` / `bq` Authenticated) | Optimization Opportunity & Always Free / Credit Leverage |
|---|---|---|
| **Cloud Run Services & Jobs** | `0` services, `0` jobs (`run.googleapis.com` ENABLED) | Move weekly `--week auto` pipeline & cron monitors onto Always Free quota (`2M` req + `180K` vCPU-s/mo) with `$0` idle cost. |
| **BigQuery Dataset (`galaxysportsedge:gse_data`)** | Created in `US`, **`0` tables hydrated** | Use `10 GB` storage + `1 TB/mo` queries Always Free for CLV picks, OOF bins, and sovereign primitives catalog. |
| **Artifact Registry (`us-central1/.../gse`)** | Repository `gse` (`DOCKER`) exists, **`0` images pushed** | Push slim container image for `--week auto` Cloud Run Jobs & Deep Learning Container GPU bursts. |
| **Vertex AI Batch & Endpoints** | `0` endpoints, `0` batch prediction jobs (`aiplatform.googleapis.com` ENABLED) | Shift Shard A (`8,412` local docs) off paid OpenRouter cash to **Vertex AI Flex/Batch (`Gemini 3.8 Flash` `$0.375/1M` input / `$0.0375/1M` cached input through Dec 31 2026; `Gemini 4 Hydrogen` `$0.75/1M` batch / `$0.0375/1M` cache read; cache write `$0` pre-Jan 12 2027; `5,000` free Search Grounding queries/mo)** against `$103.11` GCP credit via ADC. |
| **Cloud Scheduler / Workflows / PubSub / Secret Manager** | `0` jobs, `0` workflows, `0` topics, `0` secrets | Replace C-376 GitHub Actions 30s timeout watchdog (`Workflows`: `5,000` internal steps + `2,000` HTTP calls/mo free; `Secret Manager`: `6` active secret versions + `10,000` ops/mo free; `Pub/Sub`: `10 GiB`/mo free; `Cloud Build`: `2,500` build-min/mo free). |
| **GCS Buckets (`4.81 GiB` Total)** | `galaxysportsedge-gse-pages` (`2.04 GiB`, `public_access_prevention=inherited`, 7d soft delete) | Switch `gse-pages` to `public_access_prevention=enforced`, attach lifecycle Nearline/Archive rules on stale shards, and run `storagebatchoperations` + Vision OCR (`1,000` free pages/mo). |
| **Compute Quotas (`us-central1` GPU vs `e2` CPU)** | `CPUS_ALL_REGIONS = 32/32` (100% full on `gse-foundry-gcp-01..04`); `NVIDIA_L4_GPUS = 0/1` | Wait for Shard B completion (`PENDING=0`), stop the 4 CPU VMs, then unlock `1x NVIDIA L4` (`24GB` VRAM) GPU burst runs with GCS FUSE mount and zero local disk duplication. |

## 3. Top 6 Concrete GCP Intelligence & Wiring Plays (`GCP-LEV-01` .. `GCP-LEV-06`)

> **Active Mission Doctrine (Garrett):** We are NOT aiming to beat the book right now — we are feeding deep intelligence and reasoning across the entire corpus/film/situational stack and wiring every signal end-to-end (`research -> wire -> weight -> calibrate -> test -> polish`).

### GCP-LEV-01 — Cloud Vision (`vision.googleapis.com`) + Storage Batch Operations (`storagebatchoperations.googleapis.com`) OCR Rescue & GCS Hardening (`P0_INTELLIGENCE_OCR_RESCUE_AND_GCS_HARDENING`)
- **Live Measurement:** `45` `INSUFFICIENT_OCR` PDFs (`41` VM + `4` local) remain unrescued into Mind primitives while `gs://galaxysportsedge-gse-pages` holds `2.04 GiB` of page renders with `public_access_prevention=inherited` and 7-day soft delete.
- **Intelligence & Wiring Action:** Run Vision `DOCUMENT_TEXT_DETECTION` inside the `1,000` units/month Always Free tier + Storage Batch Operations over `gs://galaxysportsedge-gse-pages/pages/` to convert blocked PDFs into sovereign primitives and reasoning traces; set `public_access_prevention=enforced` on `gse-pages` and attach Nearline/Coldline/Archive (`30d`/`90d`/`365d`) lifecycle rules.

### GCP-LEV-02 — Cloud Video Intelligence (`videointelligence.googleapis.com`) + `gemini-omni-1.2-flash` All-22 Film Wiring (`P0_FILM_TENDENCY_EXTRACTION_AND_MULTIMODAL_WIRING`)
- **Live Measurement:** `12` All-22 `.mp4` videos in `G:\My Drive\GSE-Ultra-30TB-Vault\nfl-film-room-2026` are not yet segmented into per-snap clips or wired into coaching tendency inputs.
- **Intelligence & Wiring Action:** Use Video Intelligence `SHOT_CHANGE_DETECTION` + `TEXT_DETECTION` (`1,000` minutes/month Always Free) to split All-22 film into snap-level clips and wire keyframe extraction via `gemini-omni-1.2-flash` into `intelligence/coaching/*`; reuse Text-to-Speech (`1M` WaveNet / `4M` Standard chars/mo free) for internal audio briefs.

### GCP-LEV-03 — Vertex AI Batch (`aiplatform.googleapis.com`) + Context Caching + Post-Shard-B `NVIDIA_L4` GPU Cutover (`P0_ZERO_CASH_MIND_EXTRACTION_BATCH_AND_GPU_CUTOVER`)
- **Live Measurement:** `0` Vertex AI batch prediction jobs or endpoints running on `galaxysportsedge` despite `$103.11` available credit (`$100.00` Nov 6 + `$3.11` Oct 17) and `$100.00` renewing Dec 6; `4` `e2-standard-8` VMs occupy `CPUS_ALL_REGIONS 32/32` until Shard B drains `PENDING=0`.
- **Intelligence & Wiring Action:** Route remaining Shard A (`8,412` `PENDING` local docs) through keyless ADC Vertex AI Batch + Explicit Context Caching (`Gemini 3.8 Flash` `$0.375/1M` input / `$0.0375/1M` cached input through Dec 31, 2026; `Gemini 4 Hydrogen` `$0.75/1M` input / `$0.0375/1M` cache read with `$0` cache write pre-Jan 12, 2027) billed to the `$103.11` GCP credit pool; after Shard B drains and VMs stop, burst on `1x NVIDIA_L4_GPUS` (`24GB` VRAM) via Deep Learning Containers + GCS FUSE mount.

### GCP-LEV-04 — Populate BigQuery Warehouse `galaxysportsedge:gse_data` (`P1_BIGQUERY_INTELLIGENCE_WAREHOUSE_HYDRATION`)
- **Live Measurement:** Dataset `galaxysportsedge:gse_data` exists in `US` multi-region with `0` tables hydrated.
- **Intelligence & Wiring Action:** Load Shard A/B sovereign primitives, reasoning traces, FTN/nflverse PBP coaching tendencies, OOF telemetry, and cross-equation coupling tables inside the `10 GiB` active storage + `1 TiB/mo` query Always Free tier so Mind and Engine layers read one governed warehouse.

### GCP-LEV-05 — Serverlessly Wire Sequenced `--week auto` Pipeline via Cloud Run Jobs + Scheduler + Workflows (`P1_SERVERLESS_SEQUENCED_WIRING_AND_WATCHDOG`)
- **Live Measurement:** `0` Cloud Run services/jobs, `0` Artifact Registry Docker images (`gse`), `0` Cloud Scheduler jobs, `0` Workflows, and `0` Secret Manager secrets exist while GitHub workflow `C-376` External Watchdog times out after `30s`.
- **Intelligence & Wiring Action:** Containerize `run_permanent_sequenced_weekly_pipeline.py --week auto` into `us-central1-docker.pkg.dev/galaxysportsedge/gse` and run Tue/Wed-Fri/Sun-T-85m gates inside Cloud Run Jobs (`2M` req + `180K` vCPU-s + `360K` GiB-s/mo Always Free) triggered by Cloud Scheduler (`3` free jobs) + Workflows (`5,000` internal steps/mo free) with Secret Manager (`6` active versions free).

### GCP-LEV-06 — Wire Enterprise Knowledge Graph + Natural Language + Gemini Search Grounding + 4-Branch GCP Shard B (`P1_ENTITY_KNOWLEDGE_GRAPH_GROUNDING_AND_ROUTER_WIRING`)
- **Live Measurement:** Roster/team swaps (`Greg Dortch BUF`, `Kendrick Bourne ARI`, `Kyler Murray MIN`) and coach-presser sentiment deltas relied on manual/CSV syncs instead of automated entity graph + grounded signal wiring into trainer-ready Mind feeds.
- **Intelligence & Wiring Action:** Wire Enterprise Knowledge Graph canonical entity reconciliation + Cloud Natural Language (`5,000` units/mo Always Free) presser-delta extraction + Gemini Search Grounding (`5,000` free queries/mo, uncharged grounding input tokens) + 4-branch GCP Shard B unpacker outputs into trainer-ready Mind feeds and the 288-bit cognitive router across all 6 situational families.

## 4. Direct Signed-In Cloud Console Interactive Attachment (Optional 1-Click Step)

- Why our browser stopped at Sign-In on `console.cloud.google.com`: per browser security policy, we launched a clean owned Chrome profile and did not tamper with personal Chrome cookies or bypass Google authentication.
- If you want interactive clicking inside your already signed-in Console billing/startup-credit tabs in Chrome: open `chrome://inspect/#remote-debugging` in Chrome, check **Enable remote debugging**, and approve the local attachment prompt.
