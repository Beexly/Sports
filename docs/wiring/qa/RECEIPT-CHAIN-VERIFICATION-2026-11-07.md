# DOSSIER RECEIPT CHAIN — CRYPTOGRAPHICALLY VERIFIED (Motif, 2026-11-07)

Target: data/engine/connected_workflow_dossier_jax_bal_week9.json — cryptographic_receipt_chain (6 stage hashes).

**Method:** the producing code's own hash function, read from scripts/ops/gse_connected_game_workflow.py: _sha256_obj(obj) = sha256 over json.dumps(_sanitize_json(obj), sort_keys=True, default=str, allow_nan=False); each stage's hash is assigned AFTER the stage dict is complete (e.g. line 1934: stage1b["stage1b_receipt_sha256"] = _sha256_obj(stage1b)), i.e. over the stage content excluding the hash field itself. Motif re-implemented the sanitize step (NaN/Infinity stringification per the module's _sanitize_json) and recomputed all six from the dossier's stage sections.

**Result: 6 of 6 MATCH.**
- stage0 6f8db9d1… ✓ (recomputed identical)
- stage1a e65c645a… ✓
- stage1b 131928bf… ✓
- stage2 b80bb6b7… ✓
- stage3_4 c822250d… ✓
- stage5 2aea426c… ✓

**Parent linkage:** each stage's parent_*_receipt_sha256 equals the previous stage's hash (1A→0, 1B→1A, 2→1B, 3_4→2, 5→3_4), and the dossier's top-level chain repeats the same six values. The chain is internally consistent AND content-binding: any edit to a stage section after hashing would break its recomputation. (Two naive conventions — compact separators, hash-included — fail; the match requires the producer's exact convention, which is the correct standard for verification.)

**Scope honesty:** this verifies the dossier is a faithful, untampered record of the Nov 5 run's stage outputs as produced. It does not rehabilitate the claims inside those outputs that tonight's other notes qualify (the Stage 1B headline total; the 62-23-1 panel printed in the workflow's own markdown renderer at lines ~4900s). A sealed envelope does not make the letter true — but the envelope is genuinely sealed, and that is what this note certifies.
