# RUNNING LOG — live session work log (append-only)
**Rule: every work session appends here + pushes to the bus. Newest last.**

---

## 2026-10-10 — full sprint day

### [07:30] DOCTRINE — 19 rules converted to code
- doctrine.py + doctrine_selfcheck.py: 19/19 PASS (Warehouse asof, Anchor source-lock, HonestyGate sha-frozen manifest, KillLedger hash-chained append-only, FeatureRegistry roles, ADPGuard, CollegeGuard by key+value, Shin devig dispatcher, LatencyTracker, CLVLedger, FounderGate 3-green)
- Bus commit e3fd5f9d8

### [08:00] CFB ENGINE + BOOK ANATOMY + METHODOLOGY
- CFBD away-perspective spread decoded; CFB params fit: σ 15.15 / total σ 15.81 / HFA 4.32
- Colley point-in-time; gate cfb_gate_2026_w6: close CRPS 7.6174 (wk-6), 8.3314 (full holdout)
- Book anatomy 4 seasons: DK 4.19% engineered hold, ESPN Bet 4.24%, Bovada 4.52%, WH-NJ sharpest 8.335
- Fav-longshot tax: ~3.0 fav vs 1.2 dog; Kalshi fee curve + 1¢ seed walls measured live
- Key clusters: |3|+|7| = 18.6% of CFB games; blowout tax 31+ = +2.84; bias regime wk-by-wk
- Deep context: bye DEAD in CFB (+0.01), first-year coach PRICED, travel>1000mi t=1.92
- Bus 97176f72b

### [10:00] PARALLEL LANES — PPA + pump + NFL weather + recruiting
- PPA walk-forward: k=5.55; frozen gate REFUSED by 0.026; POOLED 2026 WIN −0.0432 (t=1.83) — near-signal
- Flow pump LIVE: 5,190 stamped rows (CFBD+Kalshi+Pinnacle), first-mover diff verified
- NFL weather FIXED: 549 outdoor games, wind15+ −5.41 total, rain −1.31, cold −2.36
- Recruiting capital: PRICED by close (slope −0.08/100 gap, t≈−0.5) — honest null
- Bus 20c182d97

### [11:00] MODEL CARD v1 + feeds
- MODEL_CARD_v1.json: fit 2023-25 → holdout 2026 (283 games), CRPS 8.3314 the bar
- Alt-line correction: residual Gaussian to <0.6% pooled; 31+ tax +3.08 real; σ invariant
- Feeds live: injuries 800 rows stamped, weather 60 stadium forecasts
- Bus 311bcadda

### [12:00] DK CFB PROP ENGINE — reconstructed + cloned
- League 87637, subcats 16569/16570/16571; 266 player (μ̂,σ̂) fits: pass 74.8 / rush 33.0 / rec 32.5
- Calibration gap: DK σ/empirical = 0.94; RB 49.5 over −9.3pts divergence; μ̂ premium +37.8
- Empirical σ tables: 3,907 player-games (QB 132.7/111.5, RB 32.2/38.4, WR/TE 29.6/30.8)
- Engine cloned with empirical inputs → cfb_prop_edge_sheet.csv
- Bus b0e820210

### [13:00] PBP TENDENCIES + REGISTRY
- 126,362 plays: aggression (Vandy .889 vs Wyoming .000), tempo, penalties, halftime adjusters (USC/Miami −12.0 front-runner), success rates
- Prop engine clone (empirical ladder math) + edge sheet
- Bus bd6348e7c

### [14:00] SESSION REPORT + BASELINE DIRECTIVE
- SESSION_REPORT_2026-10-10.md pushed (6ba96347c)
- USER DIRECTIVE LOCKED: baseline first — every metric under the sun before frontier builds
- BASELINE_AUDIT.md pushed (eef528cad); 3 ingestion lanes fired

### [15:00] BASELINE INGESTION — items 1-4 of the 20-item build order
- **NFL pbp MOTHER LODE**: nflverse-data/releases/pbp CSVs 2023-2026 (143k plays) — WRONG URLs cost one subagent (repo shell ≠ releases); correct path found via API
- Team efficiency tables ×4 seasons (EPA/play, dropback/rush EPA, success, air/att, CPOE, WPA, pass rate) + quarter fatigue curves — top: 2023 SF +.174, 2024 BAL +.218, 2025 NE +.159, 2026 SF +.291
- **CFB drives**: 91,387 drives (2024-26) → points/drive, yards/drive, plays/drive, start-ytg, sec/drive — 2026 top PPD: Miami 4.29, Toledo 4.15, USC 4.05
- **CFB team game logs**: 2023-26 → season averages (yards/TDs/turnovers/3rd-downs)
- **Usage**: 5,537 players (2025-26) — target/touch shares joined to prop σ tables
- Snap counts 2025-2026 landed (feeds sweep lane); ADVANCED_FEEDS_STATUS.md written
- BUGS FIXED: drives have no points field (score-delta used), elapsed is a dict, usage is a dict

### STATE
- Kill ledger: 8 entries, chain intact · Registry: 9 features declared, margin_head_inputs()=[] · Bus chain: 10 commits (…→d121d2c7d)
- 20-item build order status: 1 ✅ 2 🟡(derived, ESPN validation pending) 3 ✅ 4 ✅ 5 🟡(join next) 6 🟡(snaps done; NGS/combine/contracts/QBR/FPI = feeds lane report) 7-20 queued

### [16:00] ITEMS 3+5+6 CLOSED + INVENTED METRIC #1 LIVE
- **Item 3 ✅**: NGS 2024 (passing/receiving/rushing), combine (all years), historical contracts, officials.parquet, injuries 2025, snap counts 2025 — nflverse-data releases (2025 NGS not yet published)
- **Invented metric #1 — MICRO-STATE SITUATIONAL GRAPH (nfl_situational_graph.py)**: 133,431 plays → 17,458 drives → **216 distinct states** (down × dist × ytg × score-leverage × qtr × timing). Outputs: situational_ep_states CSV + leverage-conditional EP (43 cells). **The novel delta: drive EP conditioned on score state at identical (down,dist,ytg) — top spread +0.61 (1st&7-10 at opp 11-20: down-8-20 outearns blowout leaders)**. Standard EP models stop at down/dist/ytg; this is the leverage layer
- Bug found+fixed: nflfastR has NO `distance` column — it's `ydstogo` (also: kickoff rows carry down=''; qtr parses as float-string)
- Item 2 🟡→ next: independent EPA re-derivation + validation; Item 5 🟡: usage×prop-σ join next
