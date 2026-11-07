# STAGE 1A RECEIPT — RECONCILED (Motif, 2026-11-07)

Source: data/engine/connected_workflow_dossier_jax_bal_week9.json → stage1a_coaching_mind_and_schemes (schema gse_stage1a_coaching_mind_and_scheme_receipt_v2), checked against the current HEAD tree (c0c721cc8).

**The "38 coaching layers" name vs the receipt's own count:** the workflow function is named run_stage1a_all_38_coaching_and_scheme_layers, but the receipt it produced reports coaching_modules_total = 52 and coaching_modules_imported_and_verified = 52. The name is stale by 14 — the stage outgrew its title (same direction as the situational matrix's "80 rules" evaluating 87).

**Registry composition (52 entries):** 50 carry imported: true; 2 — emit_last_game and walkforward_tau — are verified by the function's own documented exception path (AST parse + precomputed trace artifacts, because they are top-level batch scripts without a __main__ guard). Zero entries are unimported. The receipt's "imported_and_verified 52" is accurate under the function's stated rules, with the AST pair disclosed in the code itself.

**Tree drift:** intelligence/coaching/ holds 57 non-init .py files at HEAD vs the receipt's 52 (Nov 5). Five modules were added after the run — a receipt is a snapshot of its run date, not a live census; the +5 is growth, not a contradiction. (Anyone re-running Stage 1A today should expect 57, subject to the same two-script exception.)

**Receipt-chain spot check:** stage1a.parent_stage0_receipt_sha256 = 6f8db9d1… and stage1b.parent_stage1a_receipt_sha256 chains from stage1a's own receipt hash — the lineage fields are populated and cross-referenced inside the dossier (full hash-chain verification across all five stages not attempted here; the Stage 1B function enforces the 1A↔0 link at runtime by construction, verified by read in STAGE1B-BOUNDARY).

Net: Stage 1A's receipt is honest — its only defect is the stale "38" in the function name, which understates what it does.
