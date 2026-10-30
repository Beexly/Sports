# Week 8 Morning Brief — Post-Upgrade

Generated: 2026-10-30 | Engine: GSE v5.3.0 / 5-Stage JEV
Seal hash: `a293ee26ed6f1350...` | tau=0.42 | All overlays active

## 2x2 QB Vulnerability Matrix — Week 8 Impact

| Matchup | Away QB Shift | Home QB Shift | Key Read |
|---------|---------------|---------------|----------|
| BAL @ BUF | Jackson +0.020 | Allen +0.012 | BUF early-down edge |
| TEN @ CIN | Ward -0.004 | Flacco +0.005 | CIN early-down edge |
| ARI @ DAL | Murray +0.019 | Prescott +0.015 | DAL early-down edge |
| MIN @ DET | McCarthy +0.007 | Goff +0.151 | DET early-down edge |
| LV @ NYJ | Smith +0.002 | Fields -0.004 | NYJ early-down edge |
| CLE @ PIT | Watson -0.002 | Rodgers +0.035 | PIT early-down edge |
| ATL @ TB | Cousins -0.006 | Mayfield +0.016 | ATL early-down edge |
| IND @ JAX | Jones -0.017 | Lawrence -0.001 | JAX early-down edge |
| LAC @ LA | Herbert -0.013 | Stafford -0.002 | LA early-down edge |
| KC @ DEN | Mahomes +0.025 | Nix +0.005 | KC early-down edge |
| NE @ MIA | Maye +0.006 | Tagovailoa +0.007 | NE early-down edge |
| PHI @ WAS | Hurts -0.033 | Daniels +0.001 | WAS early-down edge |
| CHI @ SEA | Williams -0.026 | Darnold +0.012 | CHI early-down edge |

## Simulated Median Outputs (5,000 sims)

| Matchup | Median Total | Median Spread (Home) | Pace | Shootout P(>=51) | Stall P(<=37) |
|---------|-------------|---------------------|------|-----------------|--------------|
| BAL @ BUF | 54.47 | +0.84 | 26.67s | 0.356 | 0.314 |
| TEN @ CIN | 45.15 | +6.02 | 26.87s | 0.187 | 0.508 |
| ARI @ DAL | 41.75 | +1.28 | 26.47s | 0.147 | 0.565 |
| MIN @ DET | 52.07 | +7.46 | 26.67s | 0.319 | 0.347 |
| LV @ NYJ | 42.38 | -2.16 | 27.27s | 0.131 | 0.592 |
| CLE @ PIT | 45.58 | +4.64 | 26.87s | 0.194 | 0.493 |
| ATL @ TB | 46.41 | +2.5 | 26.28s | 0.216 | 0.467 |
| IND @ JAX | 45.11 | +0.15 | 26.28s | 0.165 | 0.536 |
| LAC @ LA | 46.1 | +6.68 | 27.48s | 0.217 | 0.467 |
| KC @ DEN | 51.16 | -4.4 | 27.27s | 0.284 | 0.383 |
| NE @ MIA | 41.35 | +0.94 | 27.07s | 0.117 | 0.618 |
| PHI @ WAS | 50.05 | +3.31 | 26.28s | 0.273 | 0.396 |
| CHI @ SEA | 46.65 | +3.29 | 26.09s | 0.221 | 0.457 |

## PBP Structural Overlays (All 5 Active)

1. **Rush Decay**: off_rush_epa < -0.15 → run yards ×0.78, RB1 share −8pts. GB (−0.291) qualifies.
2. **RZ TD Haircut**: rz_td_pct < 0.25 → go-for-it ×0.85, FG make +0.05. CAR (0.2143), GB (0.1481) qualify.
3. **IDP Tackle-Funnel**: def_blitz_rate > 30 → +0.15 expected tackles for off-ball LBs.
4. **Sack Tandem Gate**: def_sack > 4.5 AND off_sack_allowed > 5.5 → press weight 0.25→0.40.
5. **2H Clock-Bleed**: leading ≥7 in Q3-Q4, trend_delta < −0.10 → +1.5s bleed; > +0.03 → −1.0s.

## Official Ledger Record

New Engine: **31-11 (73.8%) · +18.56 Units · +66.8% ROI**
(16-5 entering TNF CAR@GB is owner-attested, not ledger-verified)
