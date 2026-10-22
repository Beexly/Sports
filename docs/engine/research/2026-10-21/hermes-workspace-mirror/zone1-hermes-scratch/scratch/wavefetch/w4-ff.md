# Wave 4 Cluster-C Dossier — Formulas / Scoring / Pricing (09-12 × 3)

Sources (staging only, no git ops):
- `extract-data-2026-09-12 (1).json` — primary URL baseball-reference.com (bat/pitch); cross-site sweep inside scoring/projection/formula sections (Savant, LineStar, FanGraphs, RotoGrinders, NGS, PFR, NBA, RBSDM, Polymarket, OddsShopper, PickFinder, SaberSim).
- `extract-data-2026-09-12 (2).json` — primary URL baseballsavant.mlb.com/statcast_leaderboard; sweep adds calibration-theory pages (arXiv ×3, scikit-learn, GitHub beyond_calibration) + DFS/odds sites. Key name differs: `pricing_ownership` (vs `pricing_and_ownership` elsewhere).
- `extract-data-2026-09-12.json` — primary URL also statcast_leaderboard, but content is a LineStar-first multi-site sweep (Projections, Ownership, Props, SalaryComparison, SalaryChanges, DailyDashboard, PlayerProps) + reference sites + odds/DFS + calibration + nflverse. Features are mostly `control_name`-only.

Companions: `formulas.json` (111 rows, every formula verbatim + source URL), `pricing.json` (106 rows, every pricing/ownership claim + citation).

## 1. Counts per file (python3 Counter-verified)

| File | Features (rows / unique) | Columns (rows / unique headers) | Formulas | Pricing rows | Pricing key |
|---|---|---|---|---|---|
| (1).json | 71 / 68 | 567 / 470 | 34 | 12 | pricing_and_ownership |
| (2).json | 53 / 53 | 93 / 90 | 15 | 21 | pricing_ownership |
| 09-12.json | 201 / 194 | 194 / 194 | 62 | 73 | pricing_and_ownership |
| **Total** | **325 / —** | **854 / —** | **111** | **106** | — |

Notes:
- (1).json columns are inflated by year-by-year BRef batting/pitching tables repeating Team/Player/G/W/L/FGM/FGA/FG% headers (Team ×8, Player/G/W/L/FGM/FGA/FG% ×4 each).
- (2).json columns deduplicate cleanly (90 unique of 93; PA ×3, Projection ×2).
- 09-12.json columns are fully unique (194/194, all lowercase LineStar-style headers: game teams, scores, O/U, spread/moneyline, pOwn%, Value, Leverage, …).
- 09-12.json features are thin: mostly `control_name` + citation only, no functionality/data_consumed (vs (1) and (2) which carry both).

## 2. Formula inventory (verbatim in formulas.json; heads below)

(1).json (34) — the only file with real closed-form sports math, all from BRef tooltips:
BA `Hits/At Bats`; OBP `(H + BB + HBP)/(At Bats + BB + HBP + SF)`; SLG `Total Bases/At Bats or (1B + 2*2B + 3*3B + 4*HR)/AB`; TB, BIP `At Bats - SO - HR + Sac Flies`; ERA `9 * ER / IP`; WHIP `(BB + H)/IP`; BAbip `(Hits - HR)/(AB - SO - HR + SF)`; H9/HR9/BB9/SO9 `9 x H|HR|BB|SO / IP`; SO/W `SO/BB`; PA estimate `AB + BB + HBP + SF + SH`. Plus Savant expected-stats prose, Sprint Speed (fastest 1-sec window; seasonal avg ≈ best two-thirds), FanGraphs on-pace proration ×2, NGS rushing qualifier, NBA VORP `× 2.70`, Rotogrinders 72.81% / 11.27% edge example, NFL EPA/RYOE/Pressure%/POE-difference/Series-Conv% definitions. 4 entries are explicit "no formula disclosed" (LineStar Value-X, OddsShopper, PickFinder, SaberSim).

(2).json (15) — mixed Statcast + calibration theory, highest formula density of disclosed math:
Qualifiers `2.1 PA / team game (batters), 1.25 (pitchers)`; EV50 (hardest 50% / softest 50% allowed); LineStar `Value = Projection/Salary` (the dossier's only DFS value equation); `EPA/play`; PFR labels Y/P Y/A NY/A Sc% TO% EXP (no defs); log-loss `phi^LL = -Σ Y_k log S_k`, Brier `phi^BS = Σ (S_k − Y_k)²`; CL/GL/IL split `E[d(S,Y)] = E[d(S,C)] + E[d(C,Q)] + E[d(Q,Y)]`; GECE `Σ (|B|/|B|) d(ḡ_B, ȳ_B)`; inter-interval `max(0, max(l−ȳ, ȳ−h))`; Bregman `d_phi + sharpness-gap/calibration split`; Platt `1/(1+exp(A f+B))`; isotonic `min Σ(y−f̂)² s.t. monotone`; temperature `softmax(z/T)`.

09-12.json (62) — mostly "no formula disclosed" attestations (≈40 of 62) + duplicates of EV50/qualifiers/Platt/isotonic/temperature in short form; new verbatim: DK moneyline/spread/totals explainer, Odds-API request-quota definition, Polymarket 0–1 outcomePrices + 50-50 uncompleted-game rule, nfl_data_py downcast `float64→float32 ≈ −30% mem / −50% load speed`, FootballGuys custom-rankings line, calibration prose quotes.

## 3. Scoring-logic comparison

Unanimous finding across all 3: **no site discloses a universal composite ranking formula or weight vector.** Ranking is per-table sort keys + named composite columns shown without construction math.

| Dimension | (1).json | (2).json | 09-12.json | Read |
|---|---|---|---|---|
| Default sort | BRef Year `sort_default_asc`; survey adds: Savant Sort By/Order, LineStar Value-desc (implied), FanGraphs `sortdir=desc`, NBA MP `sort_col`, PFR Rk asc, RotoWire game-time, RBSDM EPA/play | Rk. + sortable leaders; LineStar Value↓; RotoWire game-time; nflsavant EPA/play desc; arxiv Fig.7 by accuracy | Rk. / FanGraphs `#` + `sortcol/sortdir/pageitems=30`; LineStar Ownership selectable sorts | Agreement: ordinal rank column + desc-by-displayed-metric; no global formula |
| Composite metrics | LineStar Value(X)/Consensus/AlertScore/SIC/Floor/Ceiling/pOwn/Leverage/Safety; Props confidence/hit/+EV/Edge%; WAR, SRS/OSRS/DSRS (named only) | wRC+/Off/Def/WAR; PER/WS/BPM/VORP; LineStar Value/Leverage/Safety/SIC/AlertScore/Consensus; EV+ ranked by edge; SRS group; ECE/Brier | RotoWire max-proj-pts under cap+stacking; SaberSim ROI/upside; PickFinder EV+ vs devigged line ranked by edge | Same metric set, different emphasis: (1) catalogs DFS columns, (2) adds calibration losses, (f0) states optimizer objectives |
| Weights/factors | Expected-stats = expected BIP outcomes + actual K/BB/HBP; Sprint ≈ best 2/3 runs; "no weights disclosed" (LineStar); SaberSim exposures/stacks (no numbers) | Same qualifiers; SaberSim exposures/stacks; RBSDM Weighted-EPA view + garbage-time WP filter | Qualifiers 2.1/1.25; SaberSim exposures/stacks; RBSDM Weighted EPA + WP filter | Identical qualifier + filter facts in all 3; weights never numeric |

Net: the three files corroborate (not contradict) each other. (2).json is the calibration-theory source; (1).json is the BRef-math source; 09-12.json is the DFS-optimizer-objective source.

## 4. Pricing claims (106 rows in pricing.json; 50 carry an explicit $ price)

- (1).json: 12 rows, 9 priced — LineStar $39.99/mo or $239.99/yr; PropFinder $14.99/mo, $149.99/yr; Props.Cash $199.99/yr, $19.99/mo, NBA $99.99/yr; Outlier $19.99/$29.99/$79.99/mo + 7-day trial; PlayerProps.ai $295/6mo (pay-5-get-6, −30% annual); PickFinder Premium $149.99/yr, Pro $299.99/yr. Access-only: FanGraphs export Members-Only, CTG Memberful (price unseen).
- (2).json: 21 rows, 13 priced — same price points corroborated + extras: Props.Cash $119.99/yr ANNUAL40 promo; Daily Fantasy Fuel $29.99/mo; PropFinder Free $0 (1 game/league); PickFinder from $19.99/mo; LineStar "under 66¢/day"; SaberSim $7/7-day trial; PlayerProps.ai $1.62/day. Non-priced: Stathead ad-free (no price), Statcast free, GitHub public, Polymarket fee-field-only, DK example lines (spread +7/−7 −112/−108, total 49.5, ML +270/−340).
- 09-12.json: 73 rows, 28 priced — LineStar $39.99/$239.99 repeated across 7 page-slugs (dedup to 1 fact), PropFinder Free $0, Monthly $14.99, Yearly $149.99, plus Odds-API quota pricing, Polymarket fee mechanics, DK/odds examples; remainder are "no price shown" attestations (Savant, BRef, FanGraphs export, Stathead, NGS, PFR).

Cross-file price agreement: LineStar, PropFinder, Props.Cash, Outlier, PickFinder, PlayerProps.ai figures match between (1) and (2); 09-12.json repeats LineStar/PropFinder only. No conflicts found; differences are promo variants ($119.99 ANNUAL40 vs $199.99 list).

## 5. Top 3 GSE-actionable features

1. **LineStar Value = Projection/Salary + Edge%/confidence columns** — the only disclosed DFS value equation in the corpus ((2).json; corroborated by (1) Value-X display + 09-12.json +9%/+4% edge and 63%/54% conf examples). Replicate as GSE's base value rank; add Own-Diff and Leverage as contrarian modifiers.
2. **Statcast expected-stats construction (xBA/xSLG/xwOBA = accumulated BIP expected outcomes + actual K/BB/HBP) with 2.1/1.25 PA qualifiers** — stated identically in all 3 files. Adopt as GSE's calibration anchor for batter/pitcher ratings and minimum-sample gate.
3. **PickFinder EV+ rank-by-edge vs devigged fair line + FanGraphs Depth-Charts ensemble (ZiPS + Steamer + staff playing-time)** — optimizer objective from (2)/09-12.json + ensemble recipe from (1)/(2) projection sections. Gives GSE both a bet-ranking rule (edge-desc) and a projection-combining template competitors already validate.

## 6. Caveats (as fractions)

- Formula rows that are explicit "no formula disclosed" attestations, not math: 4/34 in (1).json, 1/15 in (2).json, ~40/62 in 09-12.json.
- 09-12.json feature rows carrying only control_name + citation (no functionality): ~190/201.
- 09-12.json pricing rows that restate the same LineStar $39.99/$239.99 copy per page-slug: 7/73.
- Column-row inflation from repeated BRef table headers in (1).json: 97/567 rows share the top-8 repeated headers (unique 470/567).
- Calibration-theory formulas in (2).json sourced from papers/docs, not product UIs: 8/15.
- Scoring sections asserting weights "not disclosed": 3/3 files.

## 7. GSE action reads

- Treat BRef tooltip math ((1).json) as ground-truth rate-stat library; no re-derivation needed.
- Treat LineStar Value + EV+ edge-rank as the competitor scoring to beat: GSE differentiates on Ownership-adjusted (Own-Diff × Leverage) ranking, which no file prices as a standalone formula.
- Treat the 2.1/1.25 qualifier + x-stat construction as the shared data-quality bar; anything GSE publishes below those samples must carry a confidence discount.
- Price anchor: $14.99–$19.99/mo entry / $99–$199/yr all-sports is the cluster's revealed band; PlayerProps.ai $295/6mo is the premium ceiling.

## 8. Re-extraction targets

1. LineStar Projections/Ownership/Props pages — capture the actual Value/Edge%/confidence equations behind the X-multiplier and +9%/63% displays (all 3 files report "not disclosed").
2. FanGraphs leaders/projections export (Members-Only) — WAR/wRC+/Depth-Charts weights are paywalled in every file; authenticated capture needed.
3. PFR SRS/OSRS/DSRS + NBA PER/WS/BPM/VORP + RBSDM Weighted EPA — all displayed without construction formulas in (1) and 09-12.json; dedicated glossary-page extraction per metric.
4. Odds-API quota/pricing page + Polymarket fee/resolution docs — (2) and 09-12.json capture fragments only; pull full tier tables.
5. BRef pitch.shtml tooltip set at full depth — (1).json captured 14 pitching/batting formulas; verify against live glossary for drift (VORP ×2.70 came from NBA advanced, cross-check MLB equivalent).
