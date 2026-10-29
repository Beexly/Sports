# WS6 / WS6b — Sandbox-Only Status Record (2026-10-27)

**Artifact:** `artifacts/WS6-6B-SANDBOX-ONLY-STATUS-2026-10-27.md`
**Purpose:** correct the record. Multiple documents describe the Workstream 6 / 6b document-feed machinery as "live." On the Windows canonical checkout, it is absent. This artifact states exactly what is where so no future session repeats the error.

---

## Verified state on Windows (`C:/Users/Garrett/Sports` @ `c75d2707c`)

Every path below was checked with `find` / `git ls-files` during the 2026-10-27 consolidation pass. **All returned zero hits.**

| Path named in the plan | Windows result |
|---|---|
| `packages/prediction-engine/src/feeds/emit-mind-feed-record.ts` | **ABSENT** — `packages/prediction-engine/src/feeds/` does not exist |
| `scripts/feeds/validate_mind_feeds_consumer.py` | **ABSENT** |
| `scripts/feeds/scan_sensitive.py` | **ABSENT** |
| `tests/test_ws6_mind_feed_v2.py` | **ABSENT** |
| `tests/test_ws6b_rag_anything_probes.py` | **ABSENT** |
| `raganything/omml_extractor.py` | **ABSENT** — no `raganything/` directory |
| `brain/feeds/<YYYY-MM-DD>/*.jsonl` | **ABSENT** |

Grep for `emitMindFeedRecord|mind_feed|MIND_FEED` across Windows `.ts`/`.py`/`.md` returned six hits. **CORRECTION (verified 2026-10-27 19:52 CT): this is not "prose only." The emitter is fully implemented.**

| Hit | What it actually is |
|---|---|
| `docs/ops/DEEP_REVIEW_2026-10-22.md` | prose |
| `docs/ops/STREAM_15_STATUS_2026-10-22.md` | prose |
| `packages/prediction-engine/src/index.ts:5718` | barrel export of the real function |
| `packages/prediction-engine/src/nfl/master-situational-reasoning-aggregator.ts:412` | **FULL IMPLEMENTATION** |
| `packages/prediction-engine/src/__tests__/morning-zero-overlook-stream14.test.ts:355` | asserts the `14E:emitMindFeedRecord` marker |
| `scripts/ops/verify_p1_14_canonical_inputs.ts:26,61` | calls the real function |

The implementation at `master-situational-reasoning-aggregator.ts:412` is a single-writer JSONL
append: it scrubs the payload via `scrubSensitive()` **before** serialization, hashes the scrubbed
payload so a rerun is byte-identical apart from `computedAt`, returns
`{ feedPath, lineBytes, inputHash, streamId, scrubbed }`, and explicitly never touches
`brain/mind.jsonl`.

**So the emission capability exists on Windows — it was relocated into a different module, not
lost.** The named sandbox path `src/feeds/emit-mind-feed-record.ts` is absent; the function is not.
What is genuinely absent on Windows: the Python consumer validator, the WS6b RAG-Anything probes,
the WS6 v2 test, and the OMML extractor. See §"What is Actually Missing" below.

---

## What exists on Windows instead

`scripts/feeds/` **was created this session** and now contains one real file:

| File | Status |
|---|---|
| `scripts/feeds/delta_telemetry.py` | **NEW — written 2026-10-27, selftest PASS** |

This is the delta writer/retriever described in `artifacts/rag-telemetry-wiring-2026-10-27.md`. It is **not** the WS6 document feed. It is the downstream consumer that the WS6 feed would have fed.

---

## The honest architecture picture

```
SANDBOX (unreachable from Windows)          WINDOWS (canonical this cycle)
─────────────────────────────────          ───────────────────────────────
emit-mind-feed-record.ts  ─┐               (gap — adapter owed)
validate_mind_feeds_consumer.py │
scan_sensitive.py         ├─► brain/feeds/  ──X──►  artifacts/delta-*.jsonl
test_ws6_mind_feed_v2.py  │      <date>/*.jsonl         ▲
raganything/omml_extractor.py ┘                          │
                                              scripts/feeds/delta_telemetry.py
                                                         │
                                              candidates/sealed-center.json
                                              (seal 23245bcb…, tau 0.42)
```

The Windows side has the seal and the consumer. The sandbox has the producer. **The adapter between them does not exist on either machine as far as this session can verify.**

---

## What this record changes

1. **"WS6/6b is live" is not true on Windows.** It is live in the sandbox build. Any status doc saying otherwise is describing a different machine.
2. **`delta_telemetry.py` is real and tested on Windows.** That part of the pipeline works.
3. **The adapter is the actual gap.** Not the modules — the one-way field mapping from `gse-mind-feed-v2.0` records to the delta schema. Spec is in `artifacts/rag-telemetry-wiring-2026-10-27.md` §5.

---

## Decision required (not made autonomously)

Port WS6/6b to Windows, or formally abandon it and keep the delta writer as the sole ingestion path. Both are defensible:

- **Port:** preserves the bi-temporal provenance and PII scrubbing the sandbox build already implements.
- **Abandon:** the delta writer already enforces the seal, the frozen conditions, and the Class A/B separation; the WS6 layer adds document-level provenance that may not be needed if the delta log is the only consumer.

**This is a product decision, not an engineering one.** It is left open.
