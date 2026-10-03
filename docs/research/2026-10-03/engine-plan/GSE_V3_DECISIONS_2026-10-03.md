# GSE v3 binding decisions (2026-10-03, 03:00 CT)

This doc supersedes conflicting text in GSE_V2_DECISIONS_SPRINT_2026-10-03.md, the forward prompt, and the earlier plan docs. v2 rules that this doc does not mention still stand. Grok Heavy round 2 is the source. The answer is SUPER_GROK_HEAVY_ROUND2_ANSWER.docx in this folder.

Nothing here is a bet. Nothing is written to Neon picks.

## 1. What was measured, and what it closes

Walk-forward 2019-2026, n = 1,914 games, pre-game starters only:

- Market-anchored engine (offset + home/neutral + PIT QB + Elo residual): log loss 0.6107 vs the de-vigged close 0.6098. A tie. Do not spend the gate trying to beat 0.6098 on the moneyline.
- Availability by position group on top of that: 0.6106, CI on the add includes 0. Glazer rates do not go into the moneyline. They go into props and team totals.
- The old 0.6072 vs 0.6070 used the actual starter. It is leaky. Do not cite it. Do not build Lane 0 on it.
- Neighbourhood score distribution, unshifted: cover 0.4875 vs realized 0.4882; over 0.485 vs 0.4905. Keep that shape. Do not refit it.

## 2. The joint, as of this mint

The bug: shifting the margin sample so P(win) equals engine p. That gap is the neighbourhood win rate versus q, not an engine edge. It moved cover to 0.39 on six games while |p-q| was under 0.003.

The rule:

- Location-shift the margin sample onto the quoted spread, and the total sample onto the quoted total, so fair cover and fair over are as close to 0.5 as the discrete lattice allows.
- Fair means P(side) + 0.5 P(push). Strict cover is not the check. A 9% push makes strict cover look like 0.44 when fair cover is 0.49.
- An extra point-shift is applied only when |p-q| >= 0.01. Reweighting the moneyline on its own is forbidden.
- Gate: when |p-q| < 0.01, fair cover and fair over must be within 0.02 of 0.5 or the derived markets are withheld.

Receipt, remint 2026-10-03T07:57Z:

- File: eng/w4_mint_v1_20261003T0757Z.json
- sha256: b67c48f988f072e65119864bcb49ac6478960b3f181bf5bbef12acdda174099e
- model_hash: ddb2a61497c1d73b
- gate: pass, derived_markets published, fair_worst 0.0167
- 15 games. IND-WAS neutral_site true. Engine margin shift 0 on every game. Edges from -0.003 to +0.003.
- Forecast only. Grade after MNF 2026-10-05.

Sunday 06:45 CT cron `gse-w4-remint-pre-london` reruns this script. It will pick up the anchor. Do not revert the shift.

## 3. BUILD-NOW, in order

1. Capture alt spreads, alt totals, and team totals at the same timestamp as the main line. The live Neon snapshot (1,812 rows, 15 games) has MONEYLINE, SPREAD, TOTAL, and player props. It does not have alts, team totals, or halves. H1 cannot be scored until those rows exist. Do not invent the test.
2. Once those rows exist: game-blocked log loss of this joint against the book's alt and team total at one timestamp. Kill if the interval covers 0 after 200 games.
3. Glazer rates (Questionable miss 28%, Doubtful 99.8%, Blank 1.9%) into props and team totals, not the moneyline.
4. News-to-line is a measurement, not a model. Join GDELT seendate to the first Neon half-point move on the six weeks of snapshots. Six weeks is small. Report the lag. Do not promote a signal from it.

## 4. KILL

Do not open these as pricing inputs. A new estimand is required before any of them is rebuilt.

- Open-to-close as a bet. 2002-2011, n=2,560, the open did not beat the close.
- Kalshi as the sharp price. After fees it was best on 17.6% of 449 sides.
- OL continuity, mid-season firing ATS, referee totals after era adjustment, travel after 2015.
- CV and Madden as a price this week. No broadcast model at 90%. EA forbids commercial use of game content. Do not scrape EA. Write the licence constraint onto PR #1009 so the watcher is not treated as a price.
- LLM probabilities on games inside the model's training cutoff. The LLM extracts events. It does not output p.
- Bivariate Poisson. That is a soccer model.
- Foundation pretraining. No published NFL game log-loss gain. The flat 33-feature model already lost to two features.

## 5. LATER, not before Sunday

- Odds API featured backfill: 84,240 credits, us+eu, T-90 and close, 2020 through 2026 W4. One month at $59. Do not buy before Sunday. Neon covers the live slate. Props push the bill to the $119 plan. Circa in that feed: UNVERIFIED.
- Wind residual, previous-run only, and only on a paid Open-Meteo plan. The free tier is non-commercial.

## 6. Not done

- Corpus per-component briefings are incomplete. Several synth shards returned empty. Do not cite SYNTH_* as a finished read.
- Starter names in the mint are nflverse latest_team from the lake (Murray on MIN, Willis on MIA, Daniels on TB, Keenum on CHI, Lock on SEA, Cousins on LV). They are not cross-checked against the Friday injury report. Do not "correct" them from memory. A name whose team does not match the game is a trace bug to verify, not a known fact.
- Alt-line capture is the next build. It is not started.
