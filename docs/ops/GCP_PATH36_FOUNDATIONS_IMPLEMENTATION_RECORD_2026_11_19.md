# GSE / GSI -- Path 36 Foundations Implementation Record (2026-11-19)

**Date:** 2026-11-19 (status verified Nov 19, 04:12 UTC / Nov 18, 10:12 PM CT)  
**Account:** Garrett Baxley (`baxley.garrett@gmail.com`) -- `1,977` points  
**Status Rule:** **Path 36 is NOT 100% complete.** It is blocked at **`0 TOTAL CREDITS`** on the Starter plan, and Course 4 (`87%`) cannot reach `100%` because Lab `640821` (`[DEPRECATED] Clean and Transform Data with Alteryx Designer Cloud`) is unavailable on Google's side.

---

## 1. Blocker -- 0 Lab Credits (Founder Decision Needed)

- **Subscriptions State:** Starter plan, **`0 TOTAL CREDITS`** (`$0.01` 35-credit Starter pack purchased Nov 18, 2026 2:03 PM; renewal date blank; last 4 credits spent on `GSP207`, `GSP097`, `GSP119`, `GSP154`; purchased credits expire Dec 23, 2026).
- **Blocked Until Credits Restored:** All 4 skill badges (`0%`), retries of `GSP192`/`GSP207`/`GSP215`, "Claim credential" button (`DISABLED`), and queued Paths `420 -> 419 -> 4525` (`0%`, NOT STARTED).
- **Founder Options (No purchase made autonomously):**
  - **Option A (Recommended by browser run):** Pro 7-day free trial (`$29/month` after trial; unlimited labs during trial to finish Path 36 retries/badges plus Paths `420/419/4525`).
  - **Option B:** Another `$0.01` 35-credit Starter pack (unlikely to finish Path 36 redos + 4 skill badges / Challenge Labs alone, ~30-40 credits needed).
  - **Option C:** Wait for monthly refresh (not reliable because renewal date is blank).
- **Resume Order Once Credits Restored:** Redo `GSP192` + `GSP207` (1 credit each) -> decide on `GSP215` (5 credits / ~1 hr) -> 4 Skill Badges in path order -> Paths `420 -> 419 -> 4525`.

---

## 2. Verified Course & Lab Record (`1,977` Points)

| Course / Activity | Verified Status | Exact Labs & Gotchas |
|---|---|---|
| **Course 1 -- Cloud Computing Fundamentals** | **100%** | `GSP282` (A Tour of Google Cloud Hands-on Labs, `100/100`), `GSP002` (Getting Started with Cloud Shell and gcloud, `50/50`), `GSP001` (Create a Virtual Machine, `40/40`), `GSP067` (App Engine: Qwik Start - Python, `50/50`, App Engine Standard `python312` + `Flask==3.1.0`), `GSP080` (Deploy a Cloud Run Function via the Command Line, `100/100`, Gen2 Pub/Sub trigger `cf-demo`), `GSP100` (Deploy an Application to GKE, `100/100`, 3-node `e2-medium`). |
| **Course 2 -- Infrastructure in Google Cloud** | **100%** | `GSP074` (Manage Cloud Storage with the Google Cloud CLI, `100/100`), `GSP151` (Create and Connect to Cloud SQL for MySQL Resources, `100/100`), `GSP294` (Explore APIs in Google Cloud, `100/100`, Storage JSON API + `gcloud auth print-access-token`), `GSP094` (Publish and Subscribe to Messages in Pub/Sub Using Python, `100/100`), `GSP499` (Authenticate Users with Identity-Aware Proxy, `100/100`, Cloud Run ES256 JWT audience + spoof test proving raw headers forgeable), `GSP064` (Manage Access Control with IAM, `100/100`, group roles + CEL `hasOnly([...])` guardrail). |
| **Course 3 -- Networking & Security in Google Cloud** | **96%** | `GSP211` (`100/100`, custom VPC `managementnet` + `privatenet`), `GSP213` (`100/100`, tagged firewall `--action=ALLOW`, `networkAdmin` vs `securityAdmin` delete check), `GSP089` (`100/100`, Ops Agent `2.73.0`, Uptime check, Alert policy teardown risk, Dashboard), `GSP215` (`95/100`, `EXTERNAL_MANAGED` ALB across `us-east4`/`us-east1` + Cloud Armor `deny-403` blocking `105,779` siege requests; Task 3 forwarding-rule check flaked 3x despite live LB IP). |
| **Course 4 -- Data, ML, and AI in Google Cloud** | **87%** (**Cannot reach 100%**) | `GSP103` (`100/100`, Dataproc SparkPi console), `GSP104` (`100/100`, Dataproc CLI), `GSP192` (`80/100` -- lab defect: missing `taxirides-realtime` topic + student lacks `pubsub.topics.create`), `GSP207` (`50/100` -- omitted CLI flags + `us-west1` `n1` capacity exhaustion + `constraints/gcp.resourceLocations` block on `us-east1`), Lab `640821` `[DEPRECATED] Clean and Transform Data with Alteryx Designer Cloud` (**currently unavailable** -- blocks C4 `100%`), Module 10 `100%`: `GSP097` (Natural Language API `100/100`), `GSP119` (Speech-to-Text API `100/100`, strip `keyString:` prefix), `GSP154` (Video Intelligence API `100/100`). |
| **Skill Badges (x4) & Paths 420 / 419 / 4525** | **0% (NOT STARTED)** | Blocked until lab credits are restored (`0 TOTAL CREDITS`). |

---

## 3. Repository Implementation Mapping (Section 6 Priority Backlog `1..17`)

Every high-ROI build item from Sections 3-6 is implemented strictly within GSE's scale-to-zero, free-first, Neon/Vercel-anchored constraints:

1. **#1 Pub/Sub + Cloud Run Functions Gen 2 (`GSP080`, `GSP094`):**
   - `packages/ops/src/google-cloud-event-contracts.ts` (`GCP_FREE_TIER_PUBSUB_TOPICS`: `gse-odds-ticks`, `gse-injury-wire`, `gse-intake-dlq`; `createStatelessEventHandler` + DLQ routing)
   - `packages/ops/src/gcp-path36-runtime.ts` (`PubSubCloudEvent`, `decodePubSubCloudEventJson`, `createCloudRunPubSubFunctionHandler`, `buildCloudRunGen2PubSubDeploySpec` encoding `nodejs22`, `minInstances: 0`, `tolerateExistingTopic`, `retryWithoutExplicitGen2OnEventarc403`)
2. **#2 BigQuery Analytics Warehouse + BigQuery ML SQL (`Module 9`, `GSP192`):**
   - `src/gse_engine/cloud/gcp_warehouse.py` (`GSE_CALIBRATION_DATASET = "gse_calibration"`, `GcpWarehouseAdapter` `1 GiB` dry-run byte ceiling, `validate_partitioned_calibration_sql`, `build_time_partitioned_table_ddl`, `build_bqml_logistic_model_sql`, `build_bqml_evaluate_sql`, `build_bqml_predict_sql`)
3. **#3 Pre-Built ML APIs into Nova (`GSP097`, `GSP119`, `GSP154`):**
   - `apps/web/lib/nova/gcp-prebuilt-ml-enrichment.ts` (`sanitizeGcloudApiKeyString`, `analyzeNovaArticleEntities` <= `5,000` units/mo, `transcribePublicPresserAudio` <= `60` min/mo with fail-closed SiriusXM halt, `annotatePermittedHighlightVideo` + `pollVideoAnnotationOperation` <= `1,000` min/mo with broadcast-redistribution halt)
4. **#4 Cloud Monitoring + Ops Agent + Alert Teardown Guard (`GSP089`):**
   - `packages/ops/src/gcp-path36-runtime.ts` (`OPS_AGENT_MIN_VERSION = "2.73.0"`, `GCP_PATH36_MONITORING_METRICS`, `validateMonitoringAlertPolicy` requiring `teardownAfterTest` or explicit owner/teardown trigger on email alerts)
   - `docs/ops/GCP_OBSERVABILITY_L10_AND_IAM_IAP_L6_L7_BASELINE_2026_11.md`
5. **#5 Streaming Dataflow `PubSub_to_BigQuery` Guard (`GSP192`):**
   - `src/gse_engine/cloud/gcp_path36_stack.py` (`validate_pubsub_to_bigquery_dataflow_launch` enforcing pre-provisioned topic, `roles/pubsub.subscriber`, and time-partitioned target table)
6. **#6 Agent Platform AutoML Tabular Gate (`Module 10`):**
   - `src/gse_engine/cloud/gcp_path36_stack.py` (`validate_automl_tabular_launch` fail-closed until `bqml_sql_baseline_completed` AND explicit Garrett approval for paid node-hours)
7. **#7 IAP + Cryptographic ES256 JWT Guard (`GSP499`):**
   - `apps/web/lib/auth/iap-jwt-guard.ts` (`buildCloudRunIapAudience`, `buildBackendServiceIapAudience`, `verifyIapRequestHeaders` strictly rejecting unsigned `X-Goog-Authenticated-User-Email` spoof headers)
8. **#8 & #9 VPC, `EXTERNAL_MANAGED` ALB + Cloud Armor & IAM CEL Guardrails (`GSP064`, `GSP211`, `GSP213`, `GSP215`):**
   - `packages/ops/src/gcp-path36-runtime.ts` (`GOOGLE_LB_HEALTH_CHECK_CIDRS`, `validateExternalManagedLbAndArmorConfig`, `buildCloudArmorDenyIpExpression`, `validateIamLeastPrivilegeBinding`, `PATH36_CEL_GUARDRAIL_EXPRESSION`)
9. **#10 Cloud Storage JSON API & OAuth2 Token Hygiene (`GSP074`, `GSP294`):**
   - `packages/ops/src/gcp-path36-runtime.ts` (`validateInShellOAuthBearerToken`, `buildGcsJsonApiBucketCreateRequest`, `buildGcsJsonApiMediaUploadRequest`) + `src/gse_engine/cloud/gcp_warehouse.py` (`upload_artifact` SHA-256)
10. **#14 Apache Beam Python `DataflowRunner` Builder (`GSP207`):**
    - `src/gse_engine/cloud/gcp_path36_stack.py` (`build_beam_dataflow_command` on `python:3.12` + `apache-beam[gcp]==2.67.0` with all 6 required CLI flags, org-policy region check, and stockout defense)
11. **#11, #12, #13, #15, #16, #17 & Deprecated Dataprep `640821` Deferral Locks:**
    - `PATH36_DEFERRAL_LOCKS` in `src/gse_engine/cloud/gcp_path36_stack.py` keeps Cloud SQL MySQL (`Neon` is SoT), Dataproc Spark, GKE (`Cloud Run` scale-to-zero), Custom Workbench training, full Terraform rollout, hybrid VPN/Interconnect, and deprecated Alteryx Dataprep (`640821`) strictly deferred/halted.
