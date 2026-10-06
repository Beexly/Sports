# GSE-lab + Optimizer Cross-Check — 2026-09-19

**Question asked:** was any of Galaxy Sports Edge's own data (gse-lab tables, props-consensus, engine DB, DFS optimizer) actually used in Week 2 DFS research, or only X/second-party?
**Answer:** Only X/second-party had been used. This file records the correction: direct mining of `docs/research/2026-09-17/gse-lab/` and a live run of the repo's exact DFS optimizer on the Week 2 slate.

## Method

- **GSE-lab tables mined:** `unit_matchups_2026.csv` (EPA percentiles, Week 1 2026), `rush_pressure_2026.csv` (pressure proxy), `turnover_luck_2026.csv`.
  - Caveat: one-game 2026 samples; percentiles are descriptive of Week 1, not predictive truth. Direction: higher percentile = better unit.
- **Optimizer run:** `apps/web/lib/fantasy/dfs-optimizer.ts` `optimizeOne`, exact DP, modes cash (max proj) and leverage (`ceiling/(own*100+1.5)*6 + ceiling*0.45`), `stack:true`.
- **Slate built from:** 131 players — salaries from Huddle-corroborated `[2P]` raw CSVs; projections DK Network > FantasyPros > OWS (77/21/12 + 9 FIC); ownership OWS (45 real, 86 positional-prior estimated, labeled); floor=0.55×proj, ceiling=1.6×proj (uniform-derived, labeled).
- **Exclusions (injury-verified 2026-09-19):** Bowers (doubtful), Flowers (doubtful), N. Collins (OUT), Mason (IR), Darnold/Kyler Murray/Purdy (OUT), London (status disputed), Jeudy (team/salary conflict), Kelce (implausible row).
- **Props-consensus:** `our_projections.csv` / `game-projections.md` are Week 1 (BUF@DET 9/17) vintage — stale for Week 2, not used. Engine Neon DB (spread/moneyline/total only) not queried; credential transient.

## GSE-lab Week 2 edges (your own numbers)

| Game | Lab edge |
|---|---|
| WAS@DAL | Shootout confirmed: DAL pass D 3rd pct (worst) vs WAS pass O 61st; DAL pass O 77th vs WAS pass D 35th |
| JAX vs DEN | JAX DST is lab #1: JAX pass D 100th vs DEN pass O 9.7th; DEN rush D 0.00 (worst) |
| CLE@TB | TB DST: CLE pass O 0.00 (league-worst) vs TB pass D 67.7 |
| LV vs LAC | Geno: LV pass O 67.7 / rush O 87.1 vs LAC pass D 16.1; LAC offense 29th/6.5th |
| BAL vs NO | Henry: BAL rush O 96.8; BAL pass D 96.8 vs NO pass O 38.7 (Shough fade) |
| SF vs MIA | CMC: SF pass O 80.6 / rush O 93.5 vs MIA pass D 32 / rush D 12.9 |
| KC vs IND (SNF) | **Novel:** KC rush O 100th vs IND rush D 3.2 — Pacheco/Hunt edge nobody had |
| CHI vs MIN | Caleb: CHI pass O 90.3 / rush O 90.3 (supports vs weather); MIN rush D 100th |
| NYG@LAR (MNF) | NYG pass O 96.8 vs LAR pass D 19.4; LAR rush D 6.45 vs NYG rush O 71 — Dart/Skattebo case |
| PHI vs TEN | PHI pass O 64.5 vs TEN pass D 12.9 / rush D 16.1 — smash spot |
| HOU vs CIN | Stroud MIXED: CIN pass D 87.1 (good, tempers) but CIN pressure forced 12.9th vs HOU allowed 66.1 (clean pocket holds) |
| CAR vs ATL | Bryce TEMPERED: ATL pass D 83.9 / rush D 90.3 (good); CAR allows pressure 19.4th (Bryce stays clean, low-volume game) |
| NE vs PIT | Maye faces PIT pass D 93.5; NE rush O 3.2 (worst) |
| NYJ vs GB | NYJ offense 87/84th but GB D 64.5/64.5 (above avg); GB rush O 0.00 vs NYJ D 80.6/74.2 |

## Optimizer output (your exact solver, our data)

**Cash-optimal — 159.2 proj, $50,000, 73% own:**
Stroud ($5.5K) + Hutchinson ($3.5K) + Schultz ($3.2K) HOU triple-stack; Henry ($7.2K); Jeanty ($6.8K); Swift ($6.3K); JSN ($8.1K); C. Watson ($6.2K); LAC DST ($3.2K).

**Leverage-optimal — 142.7 proj, $49,600, 42% own:**
Lock ($4.9K, 1.6%) + JSN ($8.1K) SEA stack; Swift ($6.3K); Etienne ($6.0K, NO); Olave ($7.2K); C. Watson ($6.2K); Hutchinson ($3.5K); Ferguson ($3.8K); TB DST ($3.6K).

## Conflicts with hand-built lineups (adversarial notes)

1. Solver fades Dak/CeeDee/Pickens (salary+ownership) in favor of the HOU triple-stack value — agrees with Stroud/Schultz/Henry/Jeanty core of hand-built L2.
2. Solver loves D'Andre Swift ($6.3K, 22.0 DKN proj) and Christian Watson ($6.2K, 17.1) — in neither hand-built.
3. Solver's cash pick of LAC DST (8.47 proj) conflicts with the INT-luck downgrade (+7.11) — pure-proj solver can't see luck regression. Human+lab wins here.
4. Solver's Olave (17.7 DKN) conflicts with lab (BAL pass D 96.8) — faded on lab grounds.
5. Stroud's case survives but narrowed: clean pocket yes, CIN pass D 87.1 says efficiency will be earned, not given.

## Revised 15-game GPP lineups (post-cross-check)

**L1 "Lab + solver consensus" $49,400:** Stroud 5500 / Henry 7200 / Swift 6300 / JSN 8100 / Metcalf 5200 / Hutchinson 3500 / Schultz 3200 / FLEX CMC 8000 / JAX DST 2400. (~78% own)
**L2 "MNF + contrarian" $50,000:** Geno 4800 / Swift 6300 / Skattebo 5900 / Nabers 6500 / C. Watson 6200 / Coker 5100 / Andrews 4400 / FLEX Bijan 8200 / TB DST 2600.

## Still gated

Lobby salary verification (all `[2P]`); Sunday 11:30 CT inactives; Puka (hip) + Banks (calf) Saturday reports; SNF KC-backfield salaries (lab edge, no pool data); 15-game ownership for SNF/MNF pieces.
