# OSS Corpus Integration Registry (59 Sources, 2026-11-15)

Per `AGENTS.md` **INGEST-AND-LEARN** doctrine, all 59 user-supplied repositories and style guides are formally cataloged in [oss-corpus-registry.json](file:///C:/Users/Garrett/Sports-wt-triage/docs/data-sources/research/2026-11-15/oss-corpus-registry.json) with zero `SKIP` or `DEAD` classifications.

## Immediately Wired into v3 Engine & Storefront (`WIRED_V3`)

1. **Governance & Policy Enforcement:**
   - `google/cybernetic-agent-governance-engine` -> [publication-gate.ts](file:///C:/Users/Garrett/Sports-wt-triage/packages/governed/src/publication-gate.ts) (`mode: "ENFORCE"`) & [conjunction.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/gates/conjunction.py)
2. **Stage 1 Data & Beat Integrity:**
   - `google/magika` -> [feed_guard.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/ingestion/feed_guard.py)
   - `google/langextract` -> [beat_langextract.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/ingestion/beat_langextract.py)
   - `google/python-fire` -> [cli.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/cli.py)
   - `GoogleCloudPlatform/generative-ai` -> [matchup_prose.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/flows/matchup_prose.py)
3. **Observability, Checkpointing, Memory, Security & Storage:**
   - `Arize-ai/arize-skills` -> [arize_tracing.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/observability/arize_tracing.py)
   - `google/orbax` & `google/flatbuffers` -> [trajectory_checkpoint.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/storage/trajectory_checkpoint.py)
   - `AgentDB Memory Patterns` & `AgentDB Vector Search` -> [agentdb_store.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/memory/agentdb_store.py)
   - `googleapis/google-cloud-python` & `GoogleCloudPlatform/python-docs-samples` -> [gcp_warehouse.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/cloud/gcp_warehouse.py)
   - `google/osv.dev` -> [osv-polyglot-audit.mjs](file:///C:/Users/Garrett/Sports-wt-triage/scripts/ops/osv-polyglot-audit.mjs)
   - `localstack/localstack` -> [docker-compose.localstack.yml](file:///C:/Users/Garrett/Sports-wt-triage/docker-compose.localstack.yml) & [receipts_s3.py](file:///C:/Users/Garrett/Sports-wt-triage/src/gse_engine/storage/receipts_s3.py)
   - `rclone/rclone` -> [rclone-r2-offload.mjs](file:///C:/Users/Garrett/Sports-wt-triage/scripts/ops/rclone-r2-offload.mjs)
   - `bregman-arie/devops-exercises` & `antonitz/google-cloud-associate-cloud-engineer` -> [pregame-incident-and-recovery-runbook.md](file:///C:/Users/Garrett/Sports-wt-triage/docs/ops/runbooks/pregame-incident-and-recovery-runbook.md)
   - `leapwork/Github-action` & `leapwork/play-antigravity-plugin` -> [leapwork-and-osv.yml](file:///C:/Users/Garrett/Sports-wt-triage/docs/ops/ci-templates/leapwork-and-osv.yml)
4. **Engineering Standards (`google/styleguide` Suite):**
   - `pyguide.md`, `tsguide.md`, `jsguide.md`, `jsoncguide.md`, `Rguide.md`, and `swift` -> [CODING_STANDARDS.md](file:///C:/Users/Garrett/Sports-wt-triage/CODING_STANDARDS.md) & [pyproject.toml](file:///C:/Users/Garrett/Sports-wt-triage/pyproject.toml)

## Phase 3 Adapters & Evaluation Queue

All remaining sources (`orbax`, `XNNPACK`, `flatbuffers`, `leveldb`, `gvisor`, `ffn`, `three-live`, `filament-assets`, `mobly`, `LibreChat`, `AppFlowy`, `AFFiNE`, `Huly`, GCP SDKs, etc.) remain indexed as `PHASE_3_ADAPTER` or `UNTESTED_QUEUED_FOR_EVALUATION` in [oss-corpus-registry.json](file:///C:/Users/Garrett/Sports-wt-triage/docs/data-sources/research/2026-11-15/oss-corpus-registry.json).
