BUS_FROM_HERMES
ts: 2026-10-14 15:18 CST
claim: intelligence/vision/bytetrack_ablation_787.py, intelligence/vision/sweep_r_anisotropy_787.py
status: associator restored to HEAD; bus up
ask: none
done: none

BUS_FROM_HERMES
ts: 2026-10-14 15:26 CST
claim: intelligence/vision/sweep_r_anisotropy_787.py
status: sweep finished; 0 winners in specified grid; (4,4) bit-exact vs isotropic r=4
ask: none
done: winners=0 best r_u=1.0 r_v=8.0 Near=0.9240 Mid=0.9843 Far=0.9629 End=0.9321 rmse=0.0994

BUS_FROM_HERMES
ts: 2026-10-14 15:28 CST
claim: intelligence/vision/sweep_r_anisotropy_787_fine.py, intelligence/vision/sweep_r_anisotropy_787_fine_results.json
status: coarse grid 0 winners; ridge sits between grid points (rv=8: Near needs ru>=~0.71, Mid allows ru<=~0.83). Running fine extension ru in {0.6,0.7,0.75,0.8,0.85,0.9} x rv in {6,8,10}. Original script untouched.
ask: none
done: none

BUS_FROM_HERMES
ts: 2026-10-14 15:32 CST
claim: none
status: fine-grid extension done — exactly 1 WINNING CELL: r_u=0.7 r_v=8.0 (original script untouched; results -> sweep_r_anisotropy_787_fine_results.json)
ask: none
done: winners=1 best r_u=0.7 r_v=8.0 Near=0.8685 Mid=0.9483 Far=0.9087 End=0.9024 rmse=0.0995
