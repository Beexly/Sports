# Manifest provenance

Every committed data file gets a manifest beside it: source, producer, sha256, bytes, row count or cell count, date range, license, and whether the fit is point-in-time.

No manifest means the file is a fixture, even if a test is green.

Reference: intelligence/coaching/data/tau_hat.manifest.json. The served table and the held-out gate are different objects. The manifest says so. Do not cite the served table as having been validated at the held-out number.

nflverse inputs are CC-BY-4.0. TimesFM 3.0 outputs are Non-Commercial and must not appear in a commercial manifest as if they were nflverse.

---

<!-- Appended Formal Specification (2026-11-13 Drive Bundle) -->

# Doctrine 03: Claim-Matrix & Bi-Temporal Manifest Provenance (`manifest-provenance`)

**Status:** Controlling Fleet & Engine Doctrine (`CODEOWNERS` Enforced)  
**Repositories:** [Beexly/Sports](https://github.com/Beexly/Sports) · [Beexly/agent-bus](https://github.com/Beexly/agent-bus)  
**Governing Blueprints:** [GSE Continuous Learning Architecture Plan](https://docs.google.com/document/d/1cO6VC1DguIJsF0z9aKZWEEy2STSv974TdcNsZQhi4s8/edit?usp=drivesdk&ouid=117370885799080207136) · [Comprehensive Architecture Audit: Multi-Agent Fleet Orchestration, Verification Doctrine, and Quantitative Reasoning Systems](https://docs.google.com/document/d/1g5Jml0FyTS-zaJrLuVHWBQ-KvgAJod5YXqTi04w0lS8/edit?usp=drivesdk&ouid=117370885799080207136) · [SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md](https://docs.google.com/document/d/1LOLbE4mksn5cKV4g1xBaQvmmQkOvDRVjrAPpoPVkhI8/edit?usp=drivesdk&ouid=117370885799080207136)

## 1. Core Mandate

Every quantitative model module, mid-week delta overlay, storefront game-environment card, and settled pick across Galaxy Sports Edge ([galaxysportsedge.com](https://www.galaxysportsedge.com)) and the Galaxy Science Institute must carry an unbroken, cryptographically verifiable **6-Link Claim-Matrix Provenance Chain**:

$$\text{research} \longrightarrow \text{equation} \longrightarrow \text{code} \longrightarrow \text{test} \longrightarrow \text{real\_data\_manifest} \longrightarrow \text{receipt}$$

No claim, weight update, or pick may be published or appended to `brain/mind.jsonl` if any link in the chain is missing, points to synthetic mock fixtures instead of a SHA-256 verified real data manifest, or lacks bi-temporal validity metadata.

## 2. Six-Stage Claim-Matrix Specification

| Link # | Stage Key | Required Artifact Fields | Fail-Closed Verification Check |
| :--- | :--- | :--- | :--- |
| **1** | `research` | Verified peer-reviewed DOI / arXiv ID (e.g., Sandholtz et al. [arXiv:2309.00756](https://arxiv.org/abs/2309.00756), Schmitzer [arXiv:1610.06519](https://arxiv.org/abs/1610.06519), Zweiger et al. [arXiv:2506.10943](https://arxiv.org/abs/2506.10943), Rasmussen et al. [arXiv:2501.13956](https://arxiv.org/abs/2501.13956)), verbatim quote span `{start, end}` | Cross-checked against `PAPER-CATALOG.md` and 4-layer citation registry ([AutoResearchClaw](https://github.com/aiming-lab/AutoResearchClaw)); rejects fabricated IDs. |
| **2** | `equation` | Canonical `equation_id`, domain tier (`1..6`), 288-bit `Uint32Array(9)` context bitmask (`req` / `forbid`), output clamp `[y_min, y_max]` | Grammar-constrained AST tuple ([XGrammar](https://arxiv.org/abs/2411.15100)); generic heuristics without paper math are quarantined as `GENERIC_BASELINE_STUB`. |
| **3** | `code` | Exact repository path, function symbol, and Git tree/blob SHA-256 | Verified non-empty AST implementation body matching the mathematical operator. |
| **4** | `test` | Deterministic test target ID, pass count, exit code `0`, and execution log digest | Must execute against real manifest schemas rather than hardcoded synthetic pass stubs ([Comprehensive Architecture Audit](https://docs.google.com/document/d/1g5Jml0FyTS-zaJrLuVHWBQ-KvgAJod5YXqTi04w0lS8/edit?usp=drivesdk&ouid=117370885799080207136)). |
| **5** | `real_data_manifest` | Physical dataset URI (e.g., `2026_roster_canonical.parquet`, `injuries_2026.csv`, `ftn_charting_2026.parquet`), row count, SHA-256 digest, `is_synthetic: false` | Enforces Stage 0 Merkle lock (`assertStage0Lock`) and rejects fixture-only calibration (`is_synthetic == true` raises `ManifestProvenanceError`). |
| **6** | `receipt` | Content-addressed SHA-256 `entry_sha256`, `prev_entry_sha256`, OpenTimestamps pre-kickoff proof (`< T-5m`), and `PairedAuditReceipt` | Anchors immutable audit trail in `outbox/receipts-*` and `brain/mind.jsonl` via single-writer `MindGuardian`. |

## 3. Bi-Temporal & Source-Tier Governance

1. **Bi-Temporal Conditioning (`gse-mind-feed-v2.0` & `artifacts/delta-YYYY-MM-DD.jsonl`):** Every ingested event records both **valid time** ($t_{\text{valid}}$, when the physical injury, practice snap, or transaction occurred) and **transaction time** ($t_{\text{tx}}$, when the source published and GSE ingested the claim), conditioned on the frozen Tuesday `04:00 CT` `sealed_hash` (`85b5cd3303c540492b23019d913aabd9179945a72c490579124e6e57dcad68b8`) and `conditions_on: {"version": "v1.0", "tau": 0.42, "qb_questionable_epa": 0.0947}` ([GSE Continuous Learning Plan](https://docs.google.com/document/d/1cO6VC1DguIJsF0z9aKZWEEy2STSv974TdcNsZQhi4s8/edit?usp=drivesdk&ouid=117370885799080207136)).
2. **Entity-State Reduction (`AS OF` Queries):** Following the temporal knowledge graph semantics of [Graphiti (`arXiv:2501.13956`)](https://github.com/getzep/graphiti), newer higher-tier transactions (e.g., Saturday official IR activation, Tier 1, `confidence = 1.0`) supersede earlier lower-tier observations without overwriting append-only JSONL history (`NO_OVERWRITE_VIOLATION`), preventing duplicate player-state collisions.
3. **Six-Tier Source Firewall ([SPORTS_OS Master Plan](https://docs.google.com/document/d/1LOLbE4mksn5cKV4g1xBaQvmmQkOvDRVjrAPpoPVkhI8/edit?usp=drivesdk&ouid=117370885799080207136)):**
   - **Tiers 1–3** (Official NFL logs, licensed tracking/stats feeds, verified beat writers & WhisperX-diarized `SiriusXM` Ch 87 coaching pressers): Eligible for Zone 2 Sinkhorn availability overlays when `confidence >= 0.75`.
   - **Tier 4** (DraftKings/Pinnacle line moves, SEC EDGAR Form 4 filings via [edgartools](https://github.com/dgunning/edgartools)): Strictly routed to Zone 3 (Class B Step N residual diagnostics); zero write-back to Zone 1 or Zone 2.
   - **Tiers 5–6** (Reddit/forum chatter, unverified scraper/AI summaries): Watchlist or rejected; **never** admitted as factual provenance.
