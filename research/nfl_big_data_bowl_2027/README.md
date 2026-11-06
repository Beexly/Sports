# NFL Big Data Bowl 2027 — Open Track ($45,000 Prize Pool)

- **Competition:** NFL Big Data Bowl 2027 — Open Track (`$45,000` Open Track of `$100,000` total pool)
- **Deadline:** January 6, 2027
- **Format:** Reproducible Python/Kaggle Notebook + $\le 2,000$-word technical manuscript
- **Entity:** `GALAXY SPORTS NETWORK LLC` — Galaxy Sports Edge (GSE) & Galaxy Sports Institute (GSI)
- **Canonical Ledger ID:** `prog-060` in `data/ops/funding_inventory_2026_11_06.json`

## Technical Thesis

1. **Pre-Snap Offensive Motion Kinematic Impulse ($I_{\text{motion}}$) & Shannon Entropy ($H_{\text{motion}}$):**
   Integrates 10Hz Next Gen Stats tracking vectors from `line_set` through `ball_snap` to quantify horizontal leverage displacement and defender pursuit lag.
2. **Post-Snap Defensive Shell Disguise Divergence ($D_{\text{KL}}(P_{\text{post}} \parallel P_{\text{pre}})$):**
   Quantifies late safety rotation from two-high shells (`Cover-2` / `Quarters`) into single-high lurk/robber or simulated pressure (`Cover-1` / `Cover-3` / `Cover-0`) within $1.5\text{ s}$ post-snap.
3. **Kinematic Braking Efficiency ($\text{BRK+}$) & Kinetic Translation Deficit ($\text{KTD}$):**
   Bridges pre-draft Combine split kinematics with in-game route-break deceleration and separation creation.
4. **Finite-Sample Barber Weighted Conformal Intervals:**
   Produces distribution-free $90\%$ prediction intervals $[L_\alpha, U_\alpha]$ for play-level Expected Points Added ($\Delta\text{EPA}_{\text{disguise}}$).

## Execution

```bash
python research/nfl_big_data_bowl_2027/open_track_pre_snap_motion_and_coverage_disguise.py
```
