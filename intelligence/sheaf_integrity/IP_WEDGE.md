# CRC / Knowledge-Integrity API — IP Wedge

**Status:** Standalone IP. **Do not merge into GSE / Beexly Sports product theater.**

## One-line
A consistency engine that detects when multi-source knowledge is *internally clean but wrong vs a system of record*, and labels the repair class.

## What it is
- Library + OpenAPI: `/v1/consistency`, `/v1/propose`
- CSV ingest: `core/ingest_multisource.py` (SoT = external reference, not a graph node)
- Outputs: `repair_class`, `holonomy_flag`, relative status vs ledger
- Relative CRC catch: **self_consistent_wrong_vs_ledger**

## What it is not
- Not a sports model, odds engine, or JARVIS feature
- Not a full AML suite
- Not a GraphRAG replacement — integrity gate *under* retrieval
- Not QEC / pure math product

## Evidence
| Bench | Result |
|-------|--------|
| Penrose structural | repair_class=structural, holonomy |
| Synthetic fraud rings | self_consistent_wrong_vs_ledger |
| Scaled diluted (20% bad) | still flags |
| Temporal windows | FPR 0.0 / detection 1.0 |
| Realistic KYC fixture | Alice fraud / Bob clean / Carol noise |
| **Public-schema CSV extract** | **E001 self_consistent_wrong_vs_ledger; E002 aligned; E003 statistical** |

## Decisions (not deferred) — see DECISIONS.md
| Topic | Decision |
|-------|----------|
| Real extract | Schema-real public CSVs now; real PII only under NDA if buyer requires |
| Pilot vs API | **API-first** (curl fixture). Pilot = delivery mode after API interest, not the business |
| External claims | Mechanism + named-fixture methodology only. No fraud-% / production-proven |

## Still needs founder only for commercial
- Explicit YES to publish one-pager or talk to a buyer
- NDA extract if buyer insists (same ingest path)

Technical wedge is unblocked. No merge into Beexly/Sports without YES.
