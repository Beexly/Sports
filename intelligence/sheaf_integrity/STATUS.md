# CRC Knowledge-Integrity Wedge — STATUS

**As of:** 2026-07-30  
**Owner boundary:** Standalone IP under `artifacts/sheaf_integrity/`. Not merged into Beexly/Sports.

## One-line
Detects multi-source knowledge that is internally consistent but wrong vs a system of record, and gates the legal repair operators.

## Technical status: COMPLETE for Path A

| Surface | Status |
|---------|--------|
| CRC classify (consistent / statistical / structural) | Green |
| Relative `self_consistent_wrong_vs_ledger` | Green |
| Holonomy / Wilson on fundamental cycles | Green |
| Gated repair loop (blocks relative fraud) | Green |
| Ledger write-back (default refuse) | Green |
| CSV ingest (SoT = external reference) | Green |
| Entity integrity batch report | Green |
| Temporal relative mode | Green |
| Model agreement preset | Green |
| Ontology hygiene preset | Green |
| OpenAPI + FastAPI | Green |
| One-command demo | `python demo.py` |

Self-check: entity_integrity, crc_tests, repair_loop_block, ledger_refuse — all OK.

## Demo
```bash
cd artifacts/sheaf_integrity
python demo.py                  # Path A entity integrity
python demo.py --mode models    # Path C
python demo.py --mode ontology  # Path B
python demo.py --serve          # API :8080
```

## Product decisions (locked)
- API-first, not custom pilot consulting
- Claims: mechanism + named fixtures only (no fraud-% / production-proven)
- Learned maps: parked
- Spectral / PH product APIs: rejected
- Sports/GSE merge: requires explicit founder YES

## Commercial next (only if going external)
1. Show `python demo.py` or curl Path A to a fintech/ops engineer
2. If they want their data: same CSV ingest under NDA
3. Explicit YES before any public claim page

## Not next
More topology research. The classifier is the asset. Research doors remain documented under `research/` for a paper, not for product surface area.

## IDLE condition
Technical Path A is done. Further work is commercial or founder-gated, not agent-driven feature expansion.

## Pending loops — CLOSED (2026-07-30)

| Item | Closure |
|------|--------|
| CRC-S abelian paper | Draft: `research/CRC_S_ABELIAN_NOTE.md` |
| Real NDA extract | Protocol: `docs/NDA_EXTRACT_PROTOCOL.md` — commercial gate only |
| Block-CRC | Implemented: `core/block_crc.py` — call when n huge |
| Non-abelian / learned maps | Parked with YES gates: `research/NONABELIAN_LEARNED_PARK.md` |

No open technical blockers on the CRC wedge.
