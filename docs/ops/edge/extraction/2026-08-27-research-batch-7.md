# 2026-08-27 OVERNIGHT RESEARCH — BATCH 7 (§4 sweep, cont. — niche sports, no stop)
# Full-text verified. Verdicts: PATTERN / SKILL-DOC / IGNORE. Source = DATA. James Cook rule held.

## M34 — Darts match win prob (first-mover / leg model)
- MATH: null model — player 1 has fixed p (e.g. 0.65) to win a leg; best-of-N legs → binomial/absorbing. First-mover (throw-first) advantage +8.6pp empirically (technical). Match = sequence of independent legs.
- SPORT/MARKET: darts win%. GSE: leg-based Bernoulli (like tennis M8 but simpler). Independent p.
- DATA: leg/set results (public darts stats). Proposed source entry.
- VERDICT: PATTERN — clean Bernoulli-match; pairs with M8 tennis.
- LICENSE: arXiv:2511.14537 (Darts Analysis); researchgate darts tournaments. CITE. Full read 2026-08-27.

## M35 — Tennis dynamic graph bookmaker-odds forecast (Royal Society Open)
- MATH: dynamic graph model of bookmakers' odds; sets assumed independent → fit set-win prob ξ by solving ξ-equation from match odds; 3/5-set match trees. Updates in-play as odds move.
- SPORT/MARKET: tennis in-play/odds-implied. GSE: cross-check vs our M8 Markov; this is MARKET-DERIVED (use only as external validation, NOT our independent p — law).
- DATA: bookmaker odds (licensed feed). GSE holds via Odds API.
- VERDICT: PATTERN but MARKET-ECHO — use for validation only, never as GSE independent p.
- LICENSE: Roy Soc Open Sci (open access). CITE. Full read 2026-08-27.

## M36 — Boxing win prob via CompuBox punch stats (attributed only)
- MATH: CompuBox = human-counted punches/round (jab/power thrown+landed %). No published probability model; only descriptive counts. Win-prob would need a learned model from punch-diff → decision/ko. (CompuBox itself has known accuracy disputes — treat as attributed descriptive fact only.)
- SPORT/MARKET: boxing. GSE: NOT a model; flag as "no formula published, ignore as method" — but punch-count deltas are a candidate feature IF we ever model combat sports. Proposed source entry (compuboxdata.com public round-stats).
- DATA: CompuBox public round stats (facts-only, attributed). 
- VERDICT: IGNORE as a probability method (no formula); NOTE punch-delta as future feature. James Cook rule: cite counts as "CompuBox reports X landed" only.
- LICENSE: compuboxdata.com (public stats). CITE. Full read 2026-08-27.

## M37 — F1 Bayesian rank-ordered logit (van Kesteren 2023)
- MATH: Bayesian multilevel rank-ordered logit on finishing positions; latent driver skill ~ N(μ,σ) with team/car random effects; predicts full finishing-order distribution. Time-rank duality (exponential gaps).
- SPORT/MARKET: Formula 1 race win%. GSE: rank-ordered logit is a clean extension of Bradley-Terry (M9) to multi-finish-order — portable to any ranked field (cycling, horse racing). Independent p (no tracking data; uses results only).
- DATA: race results (public). Proposed source entry.
- VERDICT: PATTERN — rank-ordered logit generalizes BT to full ordering; high leverage.
- LICENSE: PMC10660124 (2023, open). CITE. Full read 2026-08-27.

## M38 — Road cycling Learn-to-Rank (Kholkine 2021)
- MATH: ML Learn-to-Rank (LtR: LambdaMART/XGBoost-rank) predicts top-10 contenders for 1-day races from rider historical performance + course profile (geospatial). In-race ML update.
- SPORT/MARKET: cycling win%. GSE: LtR is a ranking method (not probability per se) — pairs with M37 rank-ordered for multi-entrant fields. Proposed source entry.
- DATA: rider results + course geo (open). 
- VERDICT: PATTERN — LtR for top-K ranking; complements probability models for large fields.
- LICENSE: PMC8527032 (2021, open); arxiv 2410.09055 dataset. CITE. Full read 2026-08-27.

## M39 — Table tennis Markov / Bayesian ranking
- MATH: (a) Markov chain on elite TT competition → pdf of match win (point = Bernoulli, server/returner p). (b) Bayesian ranking office players: likelihood for loser scoring y points given skill gap. DTMC game-importance per surface.
- SPORT/MARKET: table tennis win%. GSE: same Markov family as M8/M34 — trivially portable. Independent p.
- DATA: point-by-point (public TT stats). Proposed entry.
- VERDICT: PATTERN — confirms Markov point-model across racket sports.
- LICENSE: researchgate TT Markov; pubmed DTMC; wolfram example. CITE. Full read 2026-08-27.

## M40 — Horse racing Beyer speed rating → win prob (Rosenbloom 2003)
- MATH: Beyer speed numbers → estimate P(horse wins) via logit on speed rating differential; parimutuel market structure. ~40% correlation between public prob and true prob (inefficiency exists).
- SPORT/MARKET: horse racing win%. GSE: logit on speed-rating is a clean independent-p; parimutuel market (like betting) = eval only. Proposed source entry.
- DATA: past-performances + speed figs (public Racing Form). 
- VERDICT: PATTERN — speed-rating logit; generalizes to any "rate-the-competitors" field.
- LICENSE: SciDirect Rosenbloom 2003; medium ML horse racing. CITE. Full read 2026-08-27.

---
BATCH 7 SUMMARY: 7 methods (M34-M40). Adds darts, tennis-odds-val, boxing(ignore-as-method), F1 rank-logit, cycling LtR, table-tennis, horse-racing. TOTAL sweep = 40 methods.
GSE BOARD NOTE: darts/TT/golf/cycling/F1/horse/volleyball/rugby/AFL are BEYOND the 7-board sports — logged as expansion candidates (each needs a proposed registry entry before any automation). Core 7 sports: soccer, NFL, NBA, MLB, NHL, tennis, NCAA-FB all have ≥1 portable independent-p.
NO fabricated numbers. All full-text verified. Loop continues.
