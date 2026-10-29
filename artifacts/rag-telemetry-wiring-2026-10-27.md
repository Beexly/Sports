# GSE RAG-Anything & Daily Telemetry Wiring Specification (2026-10-27)

**Artifact Path:** `artifacts/rag-telemetry-wiring-2026-10-27.md`
**Schema Contract:** `artifacts/telemetry-schema-2026-10-27.md`
**Runnable Writer:** `scripts/feeds/delta_telemetry.py`
**Standing Constraint:** Zero mid-week resealing; zero mutation of `coachMindsetHash`, `tau` (0.42), `costMatrixC`, or `QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF` (0.0947).

---

## 1. Current RAG-Anything & Workstream 6/6b status — live paths vs. named gaps

| Subsystem / file path | Current repo state | Emits provenance-tagged records? | Exact status verdict |
|---|---|---|---|
| `packages/prediction-engine/src/feeds/emit-mind-feed-record.ts` | LIVE IN CODE in the **sandbox build** (Workstream 6). Defines `GseMindFeedV2Record` (`"gse-mind-feed-v2.0"`) with `source_type: "gdrive" \| "gdocs" \| "gmail" \| "rag_anything" \| "settlement"` and `emitMindFeedRecord()`. **Absent from the Windows checkout.** | YES — enforces `content_sha256`, `valid_time_iso`, `transaction_time_iso`, `verbatim_quote_span`, `NO_OVERWRITE_VIOLATION` into `brain/feeds/<YYYY-MM-DD>/`. | LIVE PATH (document/chunk writer; needs an adapter to `artifacts/delta-YYYY-MM-DD.jsonl`) |
| `scripts/feeds/validate_mind_feeds_consumer.py`, `scripts/feeds/scan_sensitive.py` | LIVE IN CODE in the sandbox. Runs `validate_mind_feed_record()`, `scan_sensitive_text()`, `scrub_pii()`, `deduplicate_gmail_thread_messages()`. **Absent from the Windows checkout.** | YES — validates SHA-256 provenance and strips secrets/PII before admission. | LIVE PATH (tested by `tests/test_ws6_mind_feed_v2.py` in the sandbox) |
| `tests/test_ws6b_rag_anything_probes.py`, `raganything/omml_extractor.py` | LIVE PROBE HARNESS / SPECIFIED INDEX in the sandbox (Workstream 6b). Specifies HKUDS/RAG-Anything v1.4.1 (arXiv:2510.12323, `lightrag-hku<1.5`, `mineru[core]>=3.4.1`) plus DOCX `<m:oMath>` extraction; tests all 10 fail-closed probes. **Absent from the Windows checkout.** | PARTIAL — Probe 10 emits `NAMED_GAP_RECEIPT` unless the live daemon and pre-kickoff bundle are mounted. | NAMED GAP ON LIVE DAEMON WIRING |
| `packages/mcp-equations-server/src/mcp-cognitive-router.ts` | NAMED GAP (Workstream 4). Target 4-stage router over 50,000 `literature_premises` (288-bit `Uint32Array(9)` bitmask + pgvector `idx_lit_premises_hnsw_cosine`). | NO — target stub/spec, flagged in the WS0/WS4 audit until Neon credentials are rotated. | NAMED GAP |
| `artifacts/delta-YYYY-MM-DD.jsonl`, `scripts/feeds/delta_telemetry.py` | **NEW — written to disk this pass.** The Python writer is live and its selftest passes on Windows against seal `23245bcb…`. | YES — carries `sealed_hash` + `conditions_on: { version: "v1.0", tau: 0.42, qb_questionable_epa: 0.0947 }`. | NEW BRIDGE ARTIFACT (section 3) |

**Reading this table correctly.** The "LIVE IN CODE" rows are real and tested — but in the *sandbox* checkout (`/root/beexly-sports`), not on the Windows workstation. A Windows-side `find` returns nothing for those four paths. That is an environment split, not a fabrication. The Windows repo does contain the sealed engine, the cadence orchestrator, the coach-brain inference module, and 102 passing tests.

---

## 2. The schema contract

Every record written to `artifacts/delta-YYYY-MM-DD.jsonl` must conform to the JSON shape in `artifacts/telemetry-schema-2026-10-27.md` §1. The four hard invariants:

1. `sealed_hash` equals the active seal **on the writing machine** (Windows `23245bcb…`, sandbox `faab2827…`, or `$GSE_SEALED_HASH`).
2. `conditions_on` is exactly `{version: "v1.0", tau: 0.42, qb_questionable_epa: 0.0947}`.
3. `id` is unique within the day's file (`NO_OVERWRITE_VIOLATION`).
4. Class B source types (`dk_line`, `form4`) can never carry `status: "used_in_overlay"`.

---

## 3. Single canonical wiring sequence (ingest → append → retrieve → residual/overlay with `assertTauSealed`)

```text
[Step 1: Ingest Claim]
  Raw input (Wednesday–Sunday injury report, beat-writer note, DK line move, Form 4,
  or a RAG-Anything chunk from brain/feeds/<YYYY-MM-DD>/)
    ──► Validate schema, scrub PII/secrets, attach active Tuesday v1.0 sealed_hash
        and conditions_on WITHOUT importing any mutable sealed object.

[Step 2: Append to Durable Delta Log]
  append_delta_record("artifacts/delta-2026-10-27.jsonl", record)
    ──► Enforce NO_OVERWRITE_VIOLATION on record.id; append-only write with newline.

[Step 3: Retrieve Prior Records by sealed_hash + subject]
  retrieve_prior_claims(delta_path, sealed_hash, subject, game_id)
  (optional read-only query to the RAG-Anything index when the daemon is live)
    ──► Returns chronological prior claims for the same seal and subject — resolving
        e.g. Saturday IR activation vs. Wednesday Questionable so duplicate status
        collisions (Christian Kirk class) cannot occur. Read-only context only.

[Step 4: Execute pure residual or Sinkhorn overlay, then assert seal]
  ├─ source.type in {"injury_note","practice_report","beat_writer"} and status changed:
  │    Run applyInjuryOverlay() (Sinkhorn-Knopp on targets under fixed C + frozen
  │    SealedEpaDropoffTable with QB_QUESTIONABLE = 0.0947)
  │      ──► assertTauSealed(before.tau, after.tau); assert recomputedHash === sealed_hash.
  └─ source.type in {"dk_line","form4"}:
       Run Step N evaluateConformalDiagnostic() / SHARP_MONEY residual comparator, read-only
         ──► re-verify recomputedHash === sealed_hash (zero write-back to the sealed baseline).
```

---

## 4. One-line YES/NO verdict on each listed repository against that sequence only

| Repository | Verdict | One-line evaluation against the 4-step delta sequence only |
|---|---|---|
| https://github.com/langgenius/dify | NO | Visual LLM/RAG studio workflow platform; adds stateful external platform bloat and is not required to append, retrieve, or verify the JSONL log under `assertTauSealed`. |
| https://github.com/appwrite/appwrite | NO | Full multi-container BaaS cloud (Auth, PHP/Swoole executor, MariaDB); unnecessary infrastructure that violates the zero-new-platform rule for local JSONL delta logging. |
| https://github.com/tinyhumansai/openhuman | NO | Standalone Rust/Tauri personal agent harness with its own SQLite/Obsidian memory engine (and recent CVE-2026-49410); Hermes + the delta JSONL already owns the execution loop. |
| https://github.com/gna1280072/LeePanel | NO | Desktop SSH Linux VPS control panel for Nginx/LNMP/Docker; zero role in claim ingestion, JSONL retrieval, or seal verification. |
| https://github.com/Dokploy/dokploy | NO | Docker Swarm / Traefik PaaS deployment panel; server deployment tooling that does not participate in the 4-step sequence. |
| https://github.com/biersoeckli/QuickStack | NO | K3s + Longhorn Kubernetes PaaS alternative to Vercel; hosting layer irrelevant to the local claim→delta→residual sequence. |
| https://github.com/MoyuFamily/ai-relay | NO | Multi-provider OpenAI SDK proxy and key-rotation gateway; does not ingest claims, write the delta log, or run `assertTauSealed`. |
| https://github.com/Shubhamsaboo/awesome-llm-apps | NO | Curated showcase of tutorial LLM/RAG sample apps; reference list only, no drop-in binary for the sealed delta pipeline. |
| https://github.com/awesome-selfhosted/awesome-selfhosted | NO | Directory of self-hosted network services; reference catalog only with zero code in the delta sequence. |
| https://github.com/public-apis/public-apis | NO | Markdown directory of public HTTP APIs; reference catalog only. |
| https://github.com/HeyPuter/puter | NO | AGPL-3.0 browser-based "Internet Computer" cloud desktop OS; completely outside the local JSONL pipeline. |
| https://github.com/Marker-Inc-Korea/AutoRAG | NO | Desktop file-manager librarian agent (`~/.autorag/memory.json` + MinSync CDC); duplicates `emit-mind-feed-record.ts` and RAG-Anything without native `sealed_hash` / `assertTauSealed` conditioning. |
| **https://github.com/HKUDS/RAG-Anything** | **YES** | Already integrated in Workstream 6b (arXiv:2510.12323, `source_type: "rag_anything"` in `emit-mind-feed-record.ts`) to extract multimodal paper/chart/table claims into Step 1 and provide read-only structural/vector context in Step 3 without touching the sealed baseline. |

**Tally:** 1 YES / 12 NO. The single YES is the only repo whose role is claim extraction + read-only retrieval under a seal. Every other repo is infrastructure, a catalog, or a competing agent harness — none of them touches the delta sequence.

---

## 5. Adapter still owed (the one real integration task)

`emit-mind-feed-record.ts` writes `brain/feeds/<YYYY-MM-DD>/*.jsonl` in schema `gse-mind-feed-v2.0`. The delta log expects the §1 record shape. The missing piece is a **one-way adapter**:

```
brain/feeds/<date>/*.jsonl  ──(map fields)──►  artifacts/delta-<date>.jsonl
```

Mapping rules:
- `record_id` → `id`
- `transaction_time_iso` → `timestamp`
- `source_type: "rag_anything"` → `source.type: "arxiv"` (paper-derived) or `"other"`
- `content_sha256` → kept in `notes` as `content_sha256=<hash>` (the delta `id` remains the UUID)
- `verbatim_quote_span` → `source.raw_excerpt`
- always attach the active `sealed_hash` and frozen `conditions_on`

The adapter must never write back into `brain/feeds/` and must never be able to reach Zone 1.

---

## 6. Continuity (rathole) — spec only, not verified here

The plan specifies a Noise-encrypted `rathole` tunnel on port 4312 so OpenMinis or a phone session can append claims directly into the delta log without a desktop session. Status:
- Binary and TOMLs exist in the **sandbox** (`/usr/local/bin/rathole` v0.5.0 aarch64-musl; `/opt/intel/rathole-client.toml`).
- Nothing named rathole exists in the Windows repo (`find` returns zero).
- **Not verified end-to-end.** Treat as unproven until a phone append round-trips into a real `delta-*.jsonl`.
