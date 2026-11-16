# OSS Corpus Integration Registry (87 Unique Sources / 88 Submitted URLs, 2026-11-15 to 2026-11-16)

Per `AGENTS.md` **INGEST-AND-LEARN** doctrine, all 87 unique user-supplied repositories and style guides (88 total submitted URLs, with `freeCodeCamp/freeCodeCamp` submitted twice in Wave 3) are formally cataloged in [oss-corpus-registry.json](file:///C:/Users/Garrett/Sports-wt-triage/docs/data-sources/research/2026-11-15/oss-corpus-registry.json) with zero `SKIP` or `DEAD` classifications.

## Wired into v3.0-v3.3 Engine & Storefront (`WIRED_V3`)

1. **Governance, Agent Topology, Budget, Routines & Consensus:**
   - `google/cybernetic-agent-governance-engine` -> [publication-gate.ts](file:///C:/Users/Garrett/Sports-wt-triage/packages/governed/src/publication-gate.ts) (`mode: "ENFORCE"`) & [cage_policy.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/gates/cage_policy.py)
   - `serenakeyitan/agent-org-chart`, `zts212653/clowder-ai` & `paperclipai/paperclip` -> [agent_org_roster.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/governance/agent_org_roster.py) (`cli org-status`)
   - `milind-soni/OpenMausBot`, `elie222/rakazo`, `anomalyco/opencode`, `Shubhamsaboo/awesome-llm-apps`, `google-labs-code/stitch-skills` -> [teammate_routines.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/governance/teammate_routines.py)
   - `NVIDIA/SkillEvaluator` -> [skill_evaluator.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/observability/skill_evaluator.py) (`cli eval-skills`)
2. **Stage 1 Data, Vision/Geofence, Knowledge Graph, Recency, Beat Integrity & Memory:**
   - `google/magika` -> [feed_guard.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/ingestion/feed_guard.py)
   - `google/langextract` -> [beat_langextract.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/ingestion/beat_langextract.py)
   - `zjunlp/DeepKE` -> [deepke_triples.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/ingestion/deepke_triples.py) (`cli extract-triples`)
   - `mvanhorn/last30days-skill` -> [recency_last30days.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/ingestion/recency_last30days.py)
   - `opencv/opencv`, `google/ffn`, `google/open-location-code-swift` -> [vision_and_geofence.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/ingestion/vision_and_geofence.py)
   - `ranxianglei/billion-context` -> [billion_context.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/memory/billion_context.py) (`cli compact-context`)
   - `AgentDB Memory Patterns` & `AgentDB Vector Search` -> [agentdb_store.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/memory/agentdb_store.py)
   - `google/python-fire` -> [cli.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/cli.py)
   - `GoogleCloudPlatform/generative-ai` -> [matchup_prose.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/flows/matchup_prose.py)
3. **Portfolio Kelly, Calibration & Attention Compute (`src/gse_engine/compute`):**
   - `skfolio/skfolio` -> [skfolio_allocator.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/compute/skfolio_allocator.py) (`cli portfolio-kelly`, R&D-only until `CALIBRATION_ADJUSTMENTS_ENABLED`)
   - `tensorflow/tensorflow`, `facebookresearch/xformers`, `ggml-org/ggml`, `google/XNNPACK` -> [neural_calibration_and_attention.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/compute/neural_calibration_and_attention.py)
4. **Web Visualization, Streaming Protocol, Offline Sync & Browser Telemetry (`apps/web`):**
   - `ag-ui-protocol/ag-ui` -> [protocol.ts](file:///C:/Users/Garrett/Sports-wt-triage/apps/web/lib/ag-ui/protocol.ts)
   - `dream-num/univer` -> [univer-dfs-workbook.ts](file:///C:/Users/Garrett/Sports-wt-triage/apps/web/lib/viz/univer-dfs-workbook.ts)
   - `d3/d3` -> [d3-calibration-curves.ts](file:///C:/Users/Garrett/Sports-wt-triage/apps/web/lib/viz/d3-calibration-curves.ts)
   - `hoodiehq/hoodie`, `HKUDS/DeepTutor`, `docmost/docmost`, `freeCodeCamp/freeCodeCamp` -> [slate-sync-and-trace-forest.ts](file:///C:/Users/Garrett/Sports-wt-triage/apps/web/lib/offline-and-pedagogy/slate-sync-and-trace-forest.ts)
   - `ChromeDevTools/chrome-devtools-mcp` -> [cdp-storefront-smoke.mjs](file:///C:/Users/Garrett/Sports-wt-triage/scripts/ops/cdp-storefront-smoke.mjs)
5. **Observability, Caching, Sandbox, Checkpointing, Security & Storage:**
   - `Arize-ai/arize-skills` -> [arize_tracing.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/observability/arize_tracing.py)
   - `google/orbax` & `google/flatbuffers` -> [trajectory_checkpoint.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/storage/trajectory_checkpoint.py)
   - `sohutv/cachecloud`, `google/leveldb`, `google/flatbuffers`, `google/gvisor` -> [cache_and_sandbox_governor.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/storage/cache_and_sandbox_governor.py)
   - `googleapis/google-cloud-python` & `GoogleCloudPlatform/python-docs-samples` -> [gcp_warehouse.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/cloud/gcp_warehouse.py)
   - `google/osv.dev` -> [osv-polyglot-audit.mjs](file:///C:/Users/Garrett/Sports-wt-triage/scripts/ops/osv-polyglot-audit.mjs)
   - `localstack/localstack` -> [docker-compose.localstack.yml](file:///C:/Users/Garrett/Sports-wt-triage/docker-compose.localstack.yml) & [receipts_s3.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/storage/receipts_s3.py)
   - `rclone/rclone` -> [rclone-r2-offload.mjs](file:///C:/Users/Garrett/Sports-wt-triage/scripts/ops/rclone-r2-offload.mjs)
   - `bregman-arie/devops-exercises` & `antonitz/google-cloud-associate-cloud-engineer` -> [pregame-incident-and-recovery-runbook.md](file:///C:/Users/Garrett/Sports-wt-triage/docs/ops/runbooks/pregame-incident-and-recovery-runbook.md)
   - `leapwork/Github-action` & `leapwork/play-antigravity-plugin` -> [leapwork-and-osv.yml](file:///C:/Users/Garrett/Sports-wt-triage/docs/ops/ci-templates/leapwork-and-osv.yml)
6. **Engineering Standards (`google/styleguide` Suite):**
   - `pyguide.md`, `tsguide.md`, `jsguide.md`, `jsoncguide.md`, `Rguide.md`, and `swift` -> [CODING_STANDARDS.md](file:///C:/Users/Garrett/Sports-wt-triage/CODING_STANDARDS.md) & [pyproject.toml](file:///C:/Users/Garrett/Sports-wt-triage/pyproject.toml)

## Phase 3 Adapters & Evaluation Queue

All remaining specialized/platform sources (`dsh-Go`, `Imagination-Studio`, `LibreChat`, `AppFlowy`, `AFFiNE`, `Huly`, `Jenkins-plugin`, `Azure-DevOps-plugin`, `three-live`, `filament-assets`, `mobly`, GCP Go/Java/Ruby SDKs, etc.) remain indexed as `PHASE_3_ADAPTER` or `UNTESTED_QUEUED_FOR_EVALUATION` in [oss-corpus-registry.json](file:///C:/Users/Garrett/Sports-wt-triage/docs/data-sources/research/2026-11-15/oss-corpus-registry.json).
