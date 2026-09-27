# [0558] Hierarchy and ranking in pairwise sports contests (arXiv:2508.19848v1)

**Citation:** Bogdán Asztalos, Boldizsár Balázs, Gergely Palla, Tamás Vicsek (2026). *Hierarchy and ranking in pairwise sports contests*. arXiv:2508.19848v1. URL: https://arxiv.org/abs/2508.19848v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2438 lines).
**Verdict:** ADAPT — don't import the tennis/fencing hierarchy measures as features, but adopt the cycle-enrichment diagnostic: compare observed 3-cycle abundance in the NFL win graph against the cycle count implied by GSE's rating-based win probabilities, as a check on whether the model under- or over-states parity and upset frequency.

## 1. Research question
Do pairwise-contest networks (nodes = athletes, directed edges = winner→loser) organize into a measurable hierarchy, does tournament format (round-robin/pool vs single elimination) change that hierarchy, and can hierarchy position plus network centralities predict match outcomes as well as official ranking points or Elo?

## 2. Dataset / schema
8 competition categories: men's/women's tennis (Grand Slams, tour events, Davis Cup, 1968–2024; 194,996 men's matches, 158,092 women's; Jeff Sackmann public data) and fencing foil/épée/sabre × men/women (Olympics, Worlds, Grand Prix, World Cups, Zone Championships, 2015–2024; 43,571–73,068 bouts per category; Anya Post-Michaelsen data). Elite events only. Networks built per calendar year (1-year time resolution; e.g., Djokovic's 11,360 ATP points on 2014-12-31 used for all his 2015 matches). Access: public (Sackmann tennis data; fencing database as cited).

## 3. Method / model
Three hierarchy measures on yearly directed win graphs: flow hierarchy (FH), global reaching centrality from 2-reach (GRC/2RC), random-walk hierarchy (RWH/RWC) — compared against configuration-model and Erdős–Rényi null ensembles. Cycle analysis: 3-cycle density (cycles / all node triads) and cycle-vs-feedforward-loop ratio; cycle *enrichment* = observed 3-cycles vs expected under resampled outcomes from a given ranking score's implied win probabilities. Prediction: five "prediction scores" per player — 2RC, RWC, official federation score (SFS), Elo (recomputed on the elite-only database), reversed PageRank (RPR) — mapped to win probabilities via a fitted score-difference function with parameters optimized on a trailing fitting window (bookmaker-style walk-forward: fit on years [t−k, t−1], predict year t). Metrics: fraction of mistakes (FM), average squared error (SE), average linear error (LE); p=0.5 counted as half a mistake.

## 4. Equations & assumptions
No closed-form equations stated in the extract for the hierarchy measures (FH, GRC, RWH defined verbally/by reference in Methods). Prediction protocol: P(A beats B) = f(score_A − score_B) with f fitted per year on trailing data; FM = mean 1[wrong] (0.5 baseline = random); SE = mean (p − outcome)² (0.25 = random). Stated assumptions: (i) yearly score snapshots are valid for the whole following year; (ii) elite-only Elo recomputation is comparable within the elite set (not true Elo); (iii) resampled-match cycle expectations under a ranking score isolate "hierarchy effects" from pure strength differences; (iv) tennis/fencing generalize to other pairwise contests.

## 5. Features / target
Inputs per match: the two players' five prediction scores (2RC, RWC, SFS, ELO, RPR) from the prior year-end snapshot. Target: match winner (binary). Horizon: next calendar year of matches.

## 6. Validation design
Walk-forward in time: parameters of the score-difference→probability map fitted on trailing years, predictions made for the next year, evaluated on matches with sufficient prior information. Compared across the 5 scores × 8 categories on FM/SE/LE. Baselines: official ranking points (SFS) and Elo serve as the reference bars; random prediction (FM 0.5, SE 0.25) as floor.

## 7. Numerical results / baselines
Paper's stated claims (Table 4, men's tennis): FM — ELO 0.344 (best), 2RC 0.345, RPR 0.345, SFS 0.356, RWC 0.450; SE — ELO 0.213 (best), RPR 0.217, 2RC 0.219, SFS 0.224, RWC 0.245. Women's tennis FM: 2RC 0.347, ELO comparable (table truncated in extract). Fencing: SFS beats Elo on the most accurate measures (official fencing ranking more efficient than tennis's). Structural findings: real networks show large hierarchy gaps vs Erdős–Rényi nulls for all three measures; vs configuration model, FH and RWH higher, GRC mixed. Format effect: elimination (single-elim/DE phase) networks have *lower* hierarchy and *more* 3-cycles than round-robin/pool-phase networks — i.e., elimination formats produce more circular win-loss patterns; pool-phase hierarchies are more decisive (superior-subordinate relationships clearer). Cycle enrichment vs rating-implied expectations diagnoses whether upsets exceed what the ranking predicts.

## 8. Code / data availability
No code stated. Data: public third-party databases (Jeff Sackmann tennis; Anya Post-Michaelsen fencing) as cited.

## 9. Leakage & limitations
Be adversarial: (a) The recomputed Elo is explicitly not real Elo (elite-only subset) — the "Elo wins" comparison is against a degraded Elo, flattering the network measures. (b) Yearly score snapshots ignore within-year form changes; tennis rankings update weekly in reality. (c) The hierarchy-vs-format finding partly reflects graph topology: single-elimination *is* a tree, so "lower hierarchy, more cycles" conflates format mechanics with competitiveness. (d) Individual-sport, duel-only data — the NFL is a team sport with 16–17 games/team/season, so yearly win graphs are extremely sparse (~256 edges on 32 nodes); hierarchy measures will be noisy and dominated by schedule structure. (e) No betting-market baseline: "comparable to Elo" is a low bar if neither beats the market; no CLV or ROI analysis. (f) Prediction uses only pairwise score differences — no matchup, surface, or form features.

## 10. GSE overlap
Extension. The existing-research-map has no network-science work: no graph hierarchy measures, no cycle analysis, no PageRank-style ratings (Massey/Colley are mentioned as inventoried methods but not implemented as features). Not in the 64-ID dedup list. The transferable artifact is the *cycle-enrichment diagnostic*, not the hierarchy features themselves — GSE's ratings already do what 2RC/RPR do, and the paper shows they don't beat Elo anyway.

## 11. GSE implementation spec
1. Build the season's directed win graph from nflverse (32 nodes, game edges winner→loser, ties as bidirectional/half edges). 2. Compute observed 3-cycle count per season 2002–2025. 3. For each season, simulate the same schedule 10k times using GSE's rating-implied win probabilities; compute the expected 3-cycle distribution. 4. Cycle-enrichment = (observed − expected)/sd: positive enrichment = more rock-paper-scissors parity than the model believes (ratings overconfident in hierarchy); negative = hierarchy more decisive than modeled. 5. Use as a quarterly model diagnostic: persistent positive enrichment → widen rating uncertainty / add parity term; persistent negative → ratings may be under-confident. 6. Effort: half a day (networkx + existing sim).

## 12. Reproducible test
Dataset: nflverse regular seasons 2010–2025. Metric: per-season cycle-enrichment z-score vs the sim null from current GSE ratings. Baseline: z ≈ 0 (model well-calibrated on higher-order structure). Runnable: Python script, networkx, no charting data.

## 13. Acceptance / rejection gate
ADOPT the cycle-enrichment diagnostic as a standing quarterly check if |z| > 2 in ≥ 3 of the last 6 seasons (signal worth tracking) — then investigate the direction and adjust rating uncertainty accordingly. REJECT as a standing diagnostic if |z| ≤ 2 consistently (the rating model's implied parity already matches observed cycles; no action needed).

## 14. Improvement experiment
Weight cycles by margin: count only "strong" cycles (each win by ≥7 points) vs "any" cycles. If strong-cycle enrichment is near zero while any-cycle enrichment is positive, the model's hierarchy is right about true strength but wrong about close-game randomness — pointing at a close-game luck adjustment (cf. the repo's turnover-luck work) rather than a rating-spread fix.
