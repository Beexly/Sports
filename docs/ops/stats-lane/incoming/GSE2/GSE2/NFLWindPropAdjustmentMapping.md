# NFL Wind/Weather Prop Adjustment Mapping
## FG, Passing Yards, Rushing Yards — Wind Speed & Direction Sensitivity

> Research artifact (H0). Quantifies how sustained wind speed and direction shift the three core
> NFL prop lines. Sources cited inline. All wind figures are **sustained** mph unless "gusts" noted;
> gusts amplify every effect (15 mph sustained + gusts to 25 behaves more like the 25 mph tier).

---

## 0. Executive Ranking — Which props are MOST affected by wind?

| Rank | Prop line | Sensitivity driver | Net effect of wind | Why it moves |
|------|-----------|--------------------|--------------------|--------------|
| 1 | **Passing Yards** (QB/receiver props) | Wind **speed** (convex at 20+) | Strongly **down** | Shorter routes, fewer attempts, lower completion % + lower YPA = compounding drop |
| 2 | **FG / Longest FG / FG distance** | Wind **direction** (crosswind) | **Down** on range & accuracy | Lateral drift + gust shear hardest to correct; coaches also kick shorter |
| 3 | **Rushing Yards** (RB props) | Wind **speed** (volume shift) | **Up** | Play-calling pivots to run; gain is carries, not YPC |

- Passing & FG are **negatively** impacted (wind suppresses them).
- Rushing is **positively** impacted (wind suppresses pass → run volume increases).
- FG is uniquely dependent on **direction** (crosswind > headwind > tailwind); passing is mainly **speed** driven but accuracy hurt most by crosswind.

---

## 1. Wind-Speed Threshold Reference (sustained mph)

Baseline NFL game ≈ 7 mph. Effects are non-linear (convex): the 15→20→25 climb accelerates.

| Band | Label | Passing | FG | Rushing | Market signal |
|------|-------|---------|----|---------|---------------|
| 0–7 mph | Calm / negligible | Normal production | FG% ≈ 83%, standard distances | Normal | No adjustment |
| 7–10 mph | Slight | –1–2 pts completion %; barely noticeable | Minimal FG impact; long kicks still attempted | Flat | Ignore |
| 10–15 mph | Noticeable | Completion 60.3%→61.2%→…; decline begins | FG% still ~83%; **shorter attempts begin** (~79% at top of band) | Start rising | 15 mph = "soft trigger" — watch, don't bet |
| 15–20 mph | Material | Completion ≈ 58.9% (calm 60.31%→58.9% @ 16–20); **–1.6 cmp pts** vs calm; route tree trimmed | FG% ~80%; avg attempt distance shrinking | +2–3 FP lead RB | Totals under-adjusted by market here |
| 20–25 mph | Severe | **5.65 pt completion drop** (60.3→54.65%); yards/attempt compresses; ANY/A→4.62; **–30 to 50 pass yds per QB** | **Distance –7 yds**; make% 83%→**77%**; xFG 88.8% (gap –11.86 pts) | +~20–30 yds / +3–4 FP | "Tipping point" — sharps under early in week |
| 25+ mph | Extreme | Production **–10%+**; 25% fewer scoring drives; game = run/punt/FG-difficulty | Effective range **–10+ yds** (47-yder = coin flip); FG% collapses further; FG attempts curtailed | **+30–40 rush yds** / **+5 FP lead RB**; carries 18→24-28 | Ground-and-pound; 4th-down FG decisions shift to go-for-it |

**Key non-linearity (Covers / weatherimpactonnflbet):** the 15→20→25 climb is convex — the jump from 15–20 → 20+ is ~1.5–2x larger than the 10–15→15–20 jump.

---

## 2. Passing Yards Sensitivity

### Quantified (sustained wind, QB / team prop)
- **Per-mph elasticity (visitor, log model — Claremont Tables 6/7):** ≈ **–0.7% to –0.9% pass yards per mph** (visitor ~2× home sensitivity; home ≈ –0.4%/mph).
  - Implied ≈ **–0.9%/mph → ~23 yds per 10 mph** vs visitor avg (229 pass yds).
- **Rule of thumb (weatherimpactonnflbet, CapperTek):** ~**2–3 completion % pts per 5 mph** (calm 64.8% @ 0–5 mph → 55.7% @ 21–25 mph).
- **15 mph:** ~**–12 to 18 passing yards** vs line (1.6 cmp-pt drop).
- **20 mph:** ~**–30 to 50 passing yards** (CapperTek: 60.3%→54.65% completion).
- **25+ mph:** ~**–40 to 60+ yards**; route tree collapses to slants/screens.

### Mechanism (compounding, not linear)
1. **Completion %** falls (receiver timing on deeper routes breaks).
2. **Yards per attempt** shrinks (coordinators trim aDOT; more checkdowns/screens).
3. **Attempts** fall (disrupted dropbacks, holding vs pressure, fewer drives).
→ Combined effect exceeds a linear projection of the completion drop alone.

### Direction effect (secondary)
- **Headwind:** compresses throw distance 5–8 yds per forward throw; deep balls fail first.
- **Tailwind:** can *extend* deep-ball range; helps the downfield team (use cautiously — one team benefits).
- **Crosswind (most damaging to accuracy):** lateral drift; at 45° a 15-mph wind offsets a deep ball ~5 yds; ~45% of large CPOE swings occur when airflow ⊥ stadium axis (Fantasy Life).

### Elite vs average QBs
- Elite arms/ quick releases lose ~1.5–2 cmp pts per 5 mph; below-average QBs lose 3–4 pts per 5 mph (the spread widens as wind climbs).

---

## 3. Field Goal (FG) Sensitivity — distance, make/miss, longest-FG props

### Quantified (sustained wind, 20+ mph unless noted)
- **Mean attempted FG distance: –7 yards** at 20+ mph (both Spax & Covers).
- **FG conversion rate:** league ~83% (calm) → ~80% (15–20 mph) → **~77% at 20+ mph**.
- **Distance-controlled residual:** xFG% = 88.8% vs actual 76.9% at 20+ mph → **net –11.86 pts** = wind hurts *beyond* shorter attempts (Spax).
- **Effective range shrinkage:** ~**10+ yards** at 20 mph crosswind; a 47-yd attempt in calm air ≈ coin flip in heavy wind (weatherimpactonnflbet).

### Direction effect (DOMINANT factor — FG's #1 wind variable)
| Direction | Distance | Accuracy | Notes |
|-----------|----------|----------|-------|
| **Crosswind** (⊥ goal) | – | **↓↓ strongest** | Lateral drift; muscle memory is vertical plane; 20-mph cross > 20-mph head on accuracy |
| Headwind | –5 to 8 yds | ↓ | Predictable vertical path; kicker can compensate by driving lower |
| Tailwind | **+8 to 10 yds** per 10 mph | ↑ | Extends range; helps but rarely used for long kicks (risk) |
| Gust / shear | – | ↓↓ | A 15+ mph gust can skew ball 10+ yds laterally (wind shear) — WIVB |

### Physics anchors (Calista)
- Optimal launch ≈ 43°; ball exit velocity 85–93 mph; drag reduces range 35–45%.
- **10 mph tailwind ≈ +8–10 yds** effective range; **a 30°F temp swing ≈ –5 yds**.
- Reliability cliff begins ~57 yds; long FGs in wind are attempts only at half-ending.

### Market/decision effect
- Coaches reduce long-FG attempts in wind (defensive positioning shifts); 4th-down FG attempts decline, more go-for-it → binary TD/zero outcomes.
- **"Subtract a full FG (6 pts) off the total"** at 20 mph, pre-passing-game (weatherimpactonnflbet).

### Note on a conflicting figure
- Advanced Football Analytics ("Temperature and Field Goals") reports kicks at 25+ mph wind ≈ 82% success = same as <6 mph.
- **Reconciliation:** AFA's raw % is swamped by the fact coaches kick *shorter* FGs in wind. Spax's xFG%-vs-actual gap (–11.86 pts @ 20+) shows wind still imposes real, distance-independent difficulty once attempt distance is controlled.

---

## 4. Rushing Yards Sensitivity

> Unlike pass/FG, wind **boosts** rushing — but it's a **volume** effect, not efficiency.

### Quantified (sustained wind)
- **Team rush yards (visitor, log model — Claremont):** +**7% per 10 mph** (rush attempts +5%/10 mph; rush attempts +1.2–1.8 per 10 mph; rush ypc +2%/10 mph).
  - Visitor wind-acclimation splits: +up to **9.4% rush yards per 10 mph**; dome visitors **+~1 yd/attempt at 20 mph** (Claremont Table 9).
- **Lead-back RB (fantasy — weatherimpactonnflbet):**
  - 15–20 mph: +2–3 FP → ~**+15–20 rush yds**
  - 20–25 mph: accelerating
  - 25+ mph: **+5 FP** → **~30–40 rush yds**, carries 18→24–28
- **YPC stays flat or slightly ↓** (wet/slippery surface + aggressive run defense) — the gain is **carries, not efficiency**.

### Direction effect
- **Minimal.** Wind drives a play-calling pivot (pass→run) and volume, not directional run geometry.
  - Caveat: a hard **headwind up the middle** can shave a yard or two on sweeps/WR reverses, but impact on rushing-yards props is negligible vs speed.

### Market signal (the edge)
- Game totals move fast on wind; **RB rushing-yards/ attempts props lag** (anchored to season-long lines). Lead-back overs in confirmed 20+ mph are the clearest value; **fade RB receiving yards** (checkdowns suppressed).
- Committee backfields dilute the effect (volume shared) — prefer team rushing total or bellcow backs.

---

## 5. Quick-Adjustment Cheat Sheet (betting)

| Wind | Passing Yards prop | FG prop | Rushing Yards prop |
|------|--------------------|---------|--------------------|
| 10–15 mph | –0 to –5 yds (negligible vs line) | No FG-distance change yet; slight make% edge if >50 yds | ±0 |
| 15–20 mph | **–12 to 18 yds** per QB | Longest-FG range –2 to 4 yds; make% ~80% | Lead back +15–20 yds |
| 20–25 mph | **–30 to 50 yds** per QB; under lean strong | Avg attempt –7 yds; make% **~77%**; xFG gap –12 pts; range –8–10 yds | Lead back +20–30 yds (+3–4 FP) |
| 25+ mph | **–40 to 60+ yds**; under dominant | Range –10+ yds; long FGs near-worthless; 4th-down FGs → go-for-it | Lead back +30–40 yds (+5 FP); carries +6–10 |

Direction modifiers (apply to the above):
- **Crosswind 20+ mph:** FG accuracy down extra –3 to 5 pts on make% — biggest kicker risk; passing accuracy down extra.
- **Tailwind 20 mph:** kicker range +8–10 yds, deep passing *up* — offset the baseline downward adjustment for the downfield team.
- **Headwind 20 mph:** kicker range –5–8 yds; deep passing down — apply baseline most forecasts.

Bookmaker behavior: totals and **passing-touchdown** lines adjust by 20+ mph, but **QB passing-yards and RB rushing-yards individual props under-adjust** — the persistent edge.

---

## 6. Sources

1. **Claremont (CMC) Senior Thesis, Zipperman 2014** — "Quantifying The Impact Of Temperature And Wind On NFL Passing And Rushing Performance"; OLS on 3,133 games (2002–13). Visitor-specific wind coefficients on pass yds/completion%/rush yds/rush att/ypc; visitor ~2× home sensitivity. Log-form (coef ≈ % per mph).
2. **Covers.com** — "How Weather Actually Impacts NFL Betting"; wind-speed tier table (passing + kicking), 83%→77% FG% and –7-yd distance @ 20+ mph.
3. **weatherimpactonnflbet.com** — "NFL Wind Passing Yards Stats" (completion 64.8%@0–5→55.7%@21–25 mph; 2–3 pts/5 mph; 1.6-pt rule @15 mph); "Wind Speed Betting Thresholds" (crosswind vs headwind/tailwind); "Running Game Bad Weather Boost" (+5 FP @25+ mph; volume not YPC).
4. **The Spax** — "Analyzing the Effect of Weather in the NFL"; FG xFG% gap of 11.86 pts @ 20+ mph (actual 76.9% vs xFG 88.8%); passing 60.31%→54.65% @ 20+ mph; ANY/A→4.62.
5. **Fantasy Life** — "Does Wind Matter in Fantasy Football"; CPOE/ProE analysis; ~45% of large CPOE swings when airflow ⊥ stadium axis.
6. **Ariel Calista (Substack)** — "A Physics-Based Synopsis of the Limits of NFL Field Goal Kicking"; 43° optimum launch; 10 mph tailwind ≈ +8–10 yds range; drag –35–45%; cliff ~57 yds.
7. **WIVB (News 4 Buffalo)** — gust ≥15 mph skews ball >10 yds (wind shear).
8. **Advanced Football Analytics** — "Weather Effects on Passing" (15-mph threshold); "Temperature and Field Goals" (conflicting raw FG% @25+ mph ≈82% — reconcile via distance-control).
