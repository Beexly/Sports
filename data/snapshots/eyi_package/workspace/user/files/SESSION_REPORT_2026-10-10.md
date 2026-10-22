# MASTER SESSION REPORT — 2026-10-10
**Sports quant RE sprint: College Football + NFL + books + exchange + doctrine**
Everything below was computed, verified, and pushed to the agent bus (7-commit chain, blobs verified). Sources: this session's live work + 19/19-enforced doctrine layer.

---

## PART 1 — THE 19-RULE DOCTRINE, CONVERTED TO CODE

`doctrine.py` + `doctrine_selfcheck.py` — **19/19 PASS**. Every rule is an artifact that physically refuses violation:

| # | Rule | Artifact | The refusal |
|---|---|---|---|
| 1 | Point-in-time warehouse | `Warehouse.asof(t)` | only read path; future rows unreachable; unstamped rows rejected |
| 2 | Pinnacle close = anchor | `Anchor.propose_mu` | μ replaced only by PROMOTED verdict whose sha covers the exact number |
| 3 | College fit on college rows | `CollegeGuard` | NFL constants refused by key (`nfl_*`) AND by value (13.45/13.19/1.56/70.9/37.7/41.7 ±2%) |
| 4/5/8/12/13/14 | Diagnostic roles | `FeatureRegistry` | `margin_head_inputs()` returns production only; leakage unwritable |
| 6 | Devig discipline | `devig()` + `CalibrationLedger` | Shin closed-form primary; multiplicative ONLY sub-1; pools refuse books without calibration history; volume-weighting refused |
| 7/17 | Latency | `LatencyTracker` | hard bound raises; rows after decision-t return False |
| 9 | CLV primary | `CLVLedger` | backtest alone never promotes; live non-negative CLV required |
| 10 | ADP isolation | `ADPGuard` | feeds `rankings_diagnostic` ONLY — the rule is the exception |
| 11 | Novig ≠ close | `Anchor.set_close` | source-locked to 'pinnacle' |
| 15 | Founder gate | `FounderGate` | n≥100, Brier≤0.22, ECE≤0.05, **3 consecutive** green |
| 16 | Kill ledger | `KillLedger` | append-only hash-chained JSONL; no delete verb exists; tamper detected |
| 18 | σ tested not assumed | `propose_sigma` | PROMOTED verdict covering the exact σ or refusal |
| 19 | Honesty gate | `HonestyGate` | walk-forward manifest sha-frozen; tamper voids gate (RuntimeError); forged verdicts refused |

Key design: candidate `identity()` binds proposed numbers into the verdict sha — **an invented number literally has no verdict.** Self-check battery attacks each rule with live violations (future-row leak, forged verdict, edited kill entry, ADP→win_probability feed, NFL constant by value).

---

## PART 2 — THE CFB ENGINE (fit on college rows only)

**Parameters (2023–2025 closes, n=2,681 FBS games):**
- Spread σ **15.15** (NFL 13.45/10.62 — different, rule 3 vindicated)
- Total σ **15.81**, closing-total bias +0.876
- **HFA 4.32** (NFL 1.56) · neutral-site margin ≈ +0.99 (close prices it)
- **CFBD spread trap decoded**: spread is AWAY-perspective; ML-orientation cut σ 28.9→15.15

**MODEL CARD v1 (the frozen bar):**
- Fit window 2023–25 → leakage-free holdout 2026 wks 1–6 (283 games)
- **Close CRPS 8.3314** — every challenger must beat this
- σ favorite-size-INVARIANT (15.23/15.49/14.54/15.20/15.23 across fav buckets) — only μ drifts
- Point-in-time Colley: ratings computed from `asof(kickoff)` only — no leak

**PPA challenger (the closest yet):**
- k = 5.55 pts/PPA fit point-in-time on 2023–25 (n=2,124)
- Frozen wk-6 gate: **REFUSED by 0.026** (7.5272 vs 7.5057)
- **Pooled 2026 (n=232): close+PPA WINS by 0.0432 CRPS, t=+1.83** — edge concentrated in wks 2–3 (the close's cold-start premium)
- Full-holdout pooled: 8.3401 vs 8.3314 → refused; **"cold-start overlay (PPA wks 1–3)" = next gated hypothesis**

**Honest corrections (kill ledger, 7 entries, chain intact):**
- Pooled CFB spread residual is **Gaussian to <0.6%** at every alt offset — earlier ladder "edges" were within-class artifacts
- Real structure: **31+ blowout tax +3.08 (n=86)** — big favorites beat the close
- MEMORY CORRECTION: precomputed CFB EPA EXISTS — CFBD `/ppa/teams` (138 teams; 2026: Georgia/Indiana +0.44 off, New Mexico/NDSU −0.18 def)

---

## PART 3 — THE METHODOLOGY (what's between the numbers)

Four-layer information hierarchy — money lives where a layer is priced in one market and not another:

**L2 — in the number, not the price:**
- **|3|+|7| = 18.6% of ALL CFB games** land on a key number (3: 5.26%, 7: 4.55%; CFB keys ≠ NFL keys: 13/14 and 17/20/21 all spike)
- Closing-total bias is a **REGIME**: wk-by-wk −1.05 → +3.20 → +3.00 (2026) — never a constant
- Blowout tax: 31+ favorites +2.84 (n=198) on per-book spreads, +3.08 (n=86) on median spine

**L3 — in the situation, not the number (subclass residuals vs close):**
| factor | n | t | verdict |
|---|---|---|---|
| altitude home ≥4,000ft | 190 | **+1.88** (+2.11 pts) | near-signal |
| blowout-class fav | 123 | **+1.88** (+2.52) | near-signal |
| **travel >1000mi (road)** | 581 | **+1.92** (+1.20) | best spot |
| first-year coach | 1,389 | −0.80 | PRICED |
| **CFB bye week** | 1,723 | **+0.02** | **DEAD** (NFL −2.33 does NOT port — rule 3 empirically proven) |
| wind 15+ (CFB totals) | 339 | −0.04 | NFL −0.197/mph NOT assumed |
| rain ≥2mm | 157 | total −1.17 | direction yes, n-starved |

**L4 — flow:** CFBD `lastUpdate` never populated (0/709 measured) → move-leadership uncomputable from archives → **OUR snapshot pump builds it** (below).

**Recruiting capital verdict: PRICED BY THE CLOSE** (n=2,659): slope −0.08 resid-pts per 100 talent-gap, t≈−0.5, buckets flat. Capital → PRIOR, not edge. Tail blue-chip share >70% home: +1.54 (t=1.81, weak). Momentum: null.

---

## PART 4 — BOOK ANATOMY (how they're made; 4 seasons of closes)

| book | ML hold | shading | sharpness (CRPS) | character |
|---|---|---|---|---|
| **DraftKings** | **4.19% engineered constant** (4.20/4.19/4.20/4.09) | hugs spine σ 0.99 | 8.527 | volume machine: parlay tax + Gaussian prop ladders + jersey tax |
| ESPN Bet | 4.24% | σ 1.03 | 8.633 (worst) | acquisition-mode, promo-funded |
| Bovada | 4.52% | σ 0.44 (pure price-taker) | 8.504 | offshore: no reg cost, +0.33% access premium |
| **Caesars/WH-NJ** | — | σ 0.48 | **8.335 (sharpest!)** | retail brand, legacy steel engine |

- **Favorite-longshot tax**: hold extracted ~3.0 pts from FAV side vs ~1.2 from dog — books tax favorites on BOTH ML and spread (blowout tax = same shade, second expression)
- **Kalshi (exchange)**: no vig — fee `7·p(1−p)¢` IS the spread. Live book read (IND −2.5): yes bid 71¢/ask 72¢ (1¢ display + 1.43¢ fee at mid), maker 0¢, **1¢ seed walls with 1.5M shares** (MM inventory parks at the tick). Round-trip taker ≈ 2.9–3.5% vs retail 4.19–4.52% ML
- How each sleeps: DK on engineered hold + SGP correlation tax; Bovada on the access premium; Caesars on brand; Circa on square flow following wiseguy flow at thin margin; Kalshi on both-side fees of a matched book

---

## PART 5 — DK CFB PROP ENGINE: RECONSTRUCTED THEN CLONED

**Reconstruction** (league **87637** = CFB; subcats **16569 pass / 16570 rush / 16571 rec**):
- 266 player ladder fits from DK's own `trueOdds` (probit of invnorm(1/trueOdds) vs threshold → implied **μ̂, σ̂** per player)
- **σ medians: pass 74.8 (n=45) · rush 33.0 (n=142) · rec 32.5 (n=79)**, ladder R² 0.95–0.99
- NFL refs: 70.9/41.7/37.7 — same engine, college-calibrated

**The calibration gap (nobody has this):**
- **DK σ / empirical σ = 0.94** — DK 6% tighter than realized distributions
- DK μ̂ vs empirical season mean: +37.8 ±29.6 (projection premium — weekly cadence separates skill from bias)
- Position-level divergences (3,907 player-games): **RB rush 49.5 over = 23.3% empirical vs 32.6% Gaussian (−9.3 pts!)**, WR/TE rec 49.5 −6.6, 99.5 tails +3.0 — smooth Gaussian overprices common unders, underprices 100+ tails

**The clone** (`cfb_prop_engine.py`): same ladder math, EMPIRICAL inputs + measured tail corrections → `cfb_prop_edge_sheet.csv` (divergence-ranked). Top divergences huge but matchup-confounded — kill test pre-registered (weekly cadence + graded outcomes decide).

**Empirical CFB prop σ tables** (player-games 2024–26): QB pass 132.7/111.5 (n=12,723), RB rush 32.2/38.4 (n=28,520), WR/TE rec 29.6/30.8 + 2.50 catches (n=56,948).

---

## PART 6 — PBP TENDENCIES (126,362 plays, 2026 wks 1–6)

- **4th-down aggression**: league go-rate 54.9% (4th&≤3 opp territory); Vandy/FAA .889 (z+2.05) vs **Wyoming .000 (z−3.12)**, Clemson .250 — coaching identity measurable
- **Tempo**: Auburn 27.0 s/play fastest → Wisconsin 34.6 slowest (8 s/play spread)
- **Penalties**: Utah State .0937/play; pre-snap kings Kent State .0587
- **Halftime adjusters**: Texas Tech +13.8 best; **USC/Miami −12.0 worst (front-runner profile)**
- **Success rate**: Army .615 elite, Notre Dame .591
- All diagnostic, registry-pathed; FBS-only re-run queued

---

## PART 7 — NFL LANE

- **Schedule archive restored**: games_all.csv 7,549 rows w/ `game_id` join key + players, officials, rosters, FTN fingerprints (47,316 plays: motion 42.0%, PA 10.7%, RPO 4.5%, drop-when-catchable 5.7%), draft picks, fresh ESPN injuries (8.7MB)
- **NFL weather measured** (549 outdoor REG games 2023–25, Open-Meteo stadium-level): **WIND 15+ mph = total −5.41 vs mild** (prior est −3.0), RAIN −1.31, COLD −2.36; cache = 27 cities keyed by team abbr. Residual-vs-close versions queued on 2026 line snapshots
- Rest/travel measured RAW (post-bye home margin +3.18 vs normal 2.31); residual versions need line history (pump accumulates it)
- Prior NFL session constants (context only, never ported): EPA r=0.980, quarter-fatigue 1.519 Q2/Q1, post-bye −2.33, HFA 1.56, referee EB 1.09, FLB 0.943, λ₃ 0.3035

---

## PART 8 — THE DATA MACHINE (feeds + pump)

- **Flow pump LIVE** (`pump/`): snapshot_pump.py → flow_warehouse.jsonl **5,190 stamped rows** (CFBD lines + Kalshi order books + Pinnacle), 2-timestamp first-mover diffing verified (`flow_analysis.py` + `first_mover_counts.json`). THE move-leadership dataset nobody has; needs cadence (Sat AM / Sun AM / post-whistle, Shortcuts automation) to compound
- **Injuries feed**: 800 structured ESPN rows stamped w/ report_ts (latency measurable per rule 17)
- **Weather feed**: 60 CFB **stadium-level** forecasts (venues lat/lon, not city)
- **6,050 stamped rows total** across three append-only feeds

---

## PART 9 — FULL CORPUS STATE (mirrored to shared/gse/)

**CFB** (20 files): games+lines 4 seasons (2,681 completed FBS games w/ 5-book closes), SP+ 2024–26, talent ×4, recruiting 1.4MB ×5 classes, coaches 3.1MB (1,816 records), venues 852 (lat/lon), PPA teams+games ×4, rankings, portal, weather_2025, player-games 3,907.
**NFL**: games_all 7,549, players, officials, rosters, ftn_2025, draft_picks, injuries 8.7MB, weather cache.
**DK**: 16,230 NFL prop rows + 442 fits + dk_submap (189 taxonomy) + **266 CFB fits** + σ tables.

---

## PART 10 — THE BUS (7-commit chain, every blob verified)

```
990ad8898 (doctr 19/19) → e3fd5f9d8 (doctrine code) → 97176f72b (CFB engine + book anatomy + methodology)
→ 20c182d97 (parallel lanes) → 311bcadda (model card + feeds) → b0e820210 (DK CFB props) → bd6348e7c (tendencies + clone)
```
Branch `research/rating-atlas-2026-10-09-packet`, 63 files under `docs/research/.../minis/`, parent chain preserved, triple-verified each push. Local mirrors: `shared/gse/delivery_20261010_{0758,1015,1100,1200,1300,1400}`.

---

## PART 11 — LESSONS (encoded, not just noted)

1. **Subagent caps**: 3/3+ lanes hit 10-min caps with defective docs (raw margins sold as signals, empty weather, roof=`outdoors` typo) — always disk-verify + own-run the deliverable
2. **Workspace wipes**: recovery via shared mirror worked twice — the mirror rule is doctrine now
3. **CFBD spread is away-perspective** — orient by moneyline or lose 13 points of σ
4. **GitHub raw path**: nflverse = `master` branch, `/raw/` redirects to HTML — use raw.githubusercontent
5. **DK in-page fetch**: leagueSubcategory URL must be taken verbatim from the page's own performance log (templateVars encoding + eventsQuery filter)
6. **Probit slope sign**: P(over) z-slopes are NEGATIVE in threshold — the B≤0 guard skipped every fit until fixed
7. **Within-class close variation** masquerades as distribution-shape edge — always residualize per-game before comparing ladders

---

## PART 12 — NEXT QUEUE (pre-registered, gate-ordered)

1. **Both-sides DK harvest** (O/U primary markets) → true EV rows on the edge sheet
2. **Weekly prop-drift tracker** + CLV test (rule 9: backtest alone never promotes)
3. **Cold-start PPA overlay** (wks 1–3 only) through the walk-forward gate
4. **FBS-only PBP re-run** + residual-vs-close framing for every tendency
5. **Totals-by-class ladder** (the totals edge sheet)
6. **Pump cadence automation** (Shortcuts — guaranteed-fire)
7. **FD/Caesars/Circa engine clones** (browser lanes; FD smp open price service + previousWinRunnerOdds movement data)
8. Travel × altitude interaction; blowout-tax μ-shift as registry production candidate
9. Novig key decision; HIBP slot; both prop-lane drift monitors

**The standing bar**: close CRPS 8.3314 (CFB holdout). The gate is code. The close moves only when the evidence does.
