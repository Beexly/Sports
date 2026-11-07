# WAREHOUSE REGISTRY DEDUP — EXECUTED (Motif, 2026-11-07)

Executes WAREHOUSE-REGISTRY-DEDUP-SPEC-2026-11-07.md against intelligence/data/warehouse/ingestion_registry.jsonl at HEAD (c0c721cc8). Deliverable pushed alongside this note: intelligence/data/warehouse/ingestion_registry_deduped.jsonl (NEW file; the original registry is untouched as the audit trail).

**Result: 21 rows → 11 rows; naive sum 158,607 → unique total 79,297** (the spec's assertion value, hit exactly under its rule).

Per-source structure (all verified in the execution):
- 9 sources appear as exact duplicate groups under (canonical_id, sha256): ESPN ×3 (14 records each), and Kalshi (200), NFLverse PBP historical (49,492), NFLverse roster (3,216), NFLverse schedules (7,548), NFLverse weekly stats (5,597), NWS (FAIL 0), Polymarket (1,000), Sleeper (12,229) — ×2 each.
- Open-Meteo is the one split group: two DISTINCT sha256 — one FAIL/0 row and one PASS/1 row. The spec's key keeps both (they are different ingests, not duplicates), which is exactly where the fleet's 79,298-vs-79,297 ambiguity came from: summing distinct canonical sources gives 79,296 + Open-Meteo counted once; the (canonical_id+sha256) rule counts both Open-Meteo rows (0 + 1) and lands on 79,297. Both arithmetics are now documented; the deduped file follows the spec.
- Kept-row rule applied: latest ingested_at_utc per group, PASS preferred on ties.

**What this does NOT fix:** the deduped registry's norm_parquet paths still point at C:\Users\Garrett\… — the normalized data itself is not in the repo (STAGE1B-BOUNDARY, WAVE-TARGET-CENSUS). The registry is now safe to sum; the data landing remains Wave 6 work.
