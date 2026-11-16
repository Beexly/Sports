# GSE Week 10 Remaining Slate Full Engine Master Packet

- **Mode**: `t90m-adjust`
- **Target**: `all-remaining`
- **Window**: `sun_late`
- **Generated**: `2026-11-16T19:46:05.866199+00:00`
- **Timing Telemetry**: `0.029s`
- **SLA Badge**: **`<180s T-90m SLA ACHIEVED`**
- **Inactives Diff Count**: `0` (Fast diff applied: `True`)

## Orchestrated Games (3)
- `SEA@LV`
- `LAR@ARI`
- `SF@DAL`

## Stage Execution Statuses
- **Stage 0 (Live Truth)**: `VERIFIED_EXISTING`
- **Stage 2 (TS/Neon Grounding)**: `VERIFIED_STANDBY`
- **Stage 4 (360° Boards)**: `VERIFIED_STANDBY`
- **Stage 3/4/5 (Connected Simulation)**: `FAST_DIFF_ZERO_INACTIVE_CHANGES_REUSED`
- **Stage 6 (DFS Packets)**: `VERIFIED_STANDBY`
- **Stage 6 (Lineup Doctor)**: `VERIFIED_STANDBY`

## Manifest Paths
- Stage 0 Truth: `C:\Users\Garrett\Sports-wt-triage\data\engine\week10_unified_stage0_truth.json`
- Stage 2 TS Overlay: `C:\Users\Garrett\Sports-wt-triage\scripts\ops\run_live_game_ts_overlay_and_grounding.ts`
- Stage 4 Boards: `C:\Users\Garrett\Sports-wt-triage\scripts\ops\build_game_boards_360.py`
- Stage 6 DFS: `C:\Users\Garrett\Sports-wt-triage\scripts\dfs\build_weekly_dfs_packets.py`
