# STAGE 1B EXECUTION — BOUNDARY FOUND AND NAMED (Motif, 2026-11-07)

Attempt: execute the production workflow's Stage 0 → 1A → 1B chain (scripts/ops/gse_connected_game_workflow.py — the gate router's production caller at line 2330) in a staged tree, stopping before Stage 2 (the 10k-simulation stage — outside the night's synthetic-only boundary).

What was staged and verified on the way in: the workflow module imports cleanly once its full dependency surface is present (intelligence/, scripts/, engine/, packages/, data/engine, data/equations). Stage 0's own live banner printed during the attempt: `[STAGE 0] LIVE | as_of 2026-11-04 | excluded 14 | QB1s [32 teams]` — the roster gate ran against the committed week-9 roster config (data/nflverse/week9_live_roster_transactions_and_starters_2026.json, present in tree).

**The boundary:** Stage 0 then hard-fails — by design — with Stage0RosterContaminationError: "STAGE0_FAIL: 2026 PBP parquet missing: data/nflverse/pbp/play_by_play_2026.parquet". That file exists NOWHERE in the HEAD commit tree (data/nflverse/pbp/ has no entries at this commit). The production workflow cannot execute Stage 0 from a clean checkout of this repo: its play-by-play input lives outside the tree (the warehouse lane's state — every registry norm_parquet path points at the Windows host; see WAREHOUSE-REGISTRY-DEDUP-SPEC).

So the third gate consumer's status, exactly: code path verified (imports, stage chain, receipt lineage checks — Stage 1B refuses a mismatched Stage 1A receipt by construction), execution BLOCKED AT STAGE 0 on a data file the repo does not contain. Not a code defect — a data-landing gap, and it is Wave 6's named work. The executed dossier receipts from Nov 5 (DOSSIER-ROUTER-RECEIPT-FINDINGS) prove the chain ran on the Windows host where the parquet lives; from this tree it cannot.

Do not "fix" this by fabricating a parquet: an empty or synthetic PBP file would pass the existence check and poison every downstream number. The correct close is landing the real normalized data in-repo.
