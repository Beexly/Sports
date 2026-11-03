# NEW ENGINE OFFICIAL LEDGER — Reconciled Post-MNF Settlement (CHI 34 @ SEA 17, Mon Nov 2, 2026)

**Final: Chicago Bears 34, Seattle Seahawks 17** (Q: CHI 7/6/7/14, SEA 0/9/0/8) — game final, no overtime.

## Reconciled Season Totals After MNF (`2026-11-02` / `2026-11-03`)

- **View 1 — Main-Lines-Only Base Card:** **`38-13-1 · 74.5% · +22.85 units`**
  - Pre-MNF Verified Base: `36-13-1 · +20.14u` (`16-5-0, +10.45u` entering Oct 29 + `14-6-1, +7.19u` TNF + `6-2-0, +2.50u` Sunday Main/Derivatives; superseded `31-11-0` cohort retracted into `superseded[]` per `ledger-truth-and-retraction-fix.md`)
  - MNF Game-Line Plays Added (Slots 2 & 5): `2-0-0 · +2.71u` (`+$13.54` at `$5.00/u`: CHI +3.0 `+$8.57` = `+1.714u`, CHI ML +142 `+$4.97` = `+0.994u`)
- **View 2 — Base Card + All 6 Real-Money MNF Tickets:** **`40-15-1 · 72.7% · +22.50 units`**
  - Pre-MNF Verified Base (`36-13-1 · +20.14u`) + Full 6-Ticket MNF Slip (`4-2-0 · +2.36u` / `+$11.81` net on `$40.00` staked = `8.00u`)
- **View 3 — All-In Combined Ledger (With Participation-Gated Props & SGPs):** **`47-19-1 · 71.2% · +24.92 units`**
  - Pre-MNF All-In (`43-17-1 · +22.56u`, including `7-4-0, +2.42u` Sunday route-gated props) + Full 6-Ticket MNF Slip (`4-2-0 · +2.36u`)
  - Season Gated Prop & SGP Overlay: `9-6-0 · +2.07u` (`7-4-0, +2.42u` Sunday + `2-2-0, -0.35u` MNF)

> **Forensic Correction Note (Superseding Commit `d5628b5`):** Commit `d5628b5` previously double-appended the retracted `31-11-0` (`+18.56u`) cohort and a duplicate read of the `16-5-0` (`+10.45u`) entering base cohort (`+47W - 16L - 0P`, `+29.01u`) onto the already-accumulated `36-13-1` (`+20.14u`) pre-MNF base, producing the inflated `85-29-1` (`+51.86u`) / `94-35-1` (`+53.93u`) numbers. Those 63 duplicate phantom bets have been permanently purged and guarded by `tests/test_ledger_truth.py`.

---

## Tonight's 6 Real-Money DraftKings Tickets (`$40.00` Staked = `8.00u` $\to$ `$51.81` Payout, `+$11.81` = `+2.362u`)

| Slot | Play | Stake (`$`) | Stake (`u`) | Result | Net (`$`) | Net (`u`) | Settling Stat & Forensic Note |
|---:|---|---:|---:|---|---:|---:|---|
| 1 | Kalif Raymond OVER 21.5 Receiving Yards (-110) | $10.00 | 2.00u | **LOSS** | -$10.00 | -2.000u | 2 rec, 14 rec yds; 39-yd backward-pass lateral screen scored as a rush (`1 rush, 39 yds`, `53` scrimmage yds). Now guarded by `recommend_scrimmage_over_receiving_prop`. |
| 2 | Chicago Bears +3.0 (-105) | $9.00 | 1.80u | **WIN** | +$8.57 | +1.714u | Bears won outright 34-17. |
| 3 | Sam Darnold OVER 4.5 Rushing Yards (-110) | $7.50 | 1.50u | **WIN** | +$6.82 | +1.364u | Darnold: 2 rush att, 20 rushing yards. |
| 4 | Rome Odunze OVER 2.5 Receptions (-110) | $6.00 | 1.20u | **WIN** | +$5.45 | +1.090u | Odunze: 4 rec on 6 targets, 87 receiving yards. |
| 5 | Chicago Bears Moneyline +142 | $3.50 | 0.70u | **WIN** | +$4.97 | +0.994u | Bears won outright 34-17. |
| 6 | 2-Leg SGP (+175): Raymond OVER 21.5 Rec Yds + Bears +3.0 | $4.00 | 0.80u | **LOSS** | -$4.00 | -0.800u | Bears +3.0 won; Raymond rec yds leg lost on lateral rush scoring rule. |
| **Total** | **6 Real-Money Tickets** | **$40.00** | **8.00u** | **`4-2-0`** | **+$11.81** | **+2.362u** | **Ending DraftKings Balance: `$51.81`** |
