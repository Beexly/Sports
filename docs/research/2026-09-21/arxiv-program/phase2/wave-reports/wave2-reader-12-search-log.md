# Reader 12 — Fresh-Candidate Search Log (wave 2, 2026-09-21)

All 12 assigned records and the reserve were found in `state/done-ids.txt`
(checked 2026-09-21) and therefore had to be skipped and replaced. This log
documents every search, candidate, dedup result, and selection rationale for
the 12 replacement papers.

## 1. Assigned duplicates (all skipped — present in done-ids.txt)

| # | arXiv id | Provisional read note |
|---|----------|----------------------|
| 1 | 2402.02623 | provisional ADAPT |
| 2 | 2407.02236 | provisional REJECT |
| 3 | 2409.05192 | provisional ADAPT |
| 4 | 2503.16470 | provisional ADAPT |
| 5 | 2604.03888 | provisional ADAPT (abstract claims experimental superiority; body has no experiment) |
| 6 | 2604.08251 | provisional ADAPT (5,467 pre-match influencer bets; follower flat-stake ROI −38.27%) |
| 7 | 2604.24366 | provisional ADAPT (30.3B order-book events; trade-direction inference only ~59% accurate) |
| 8 | 2605.00493 | provisional ADAPT (Information Leakage Score framework; negative pilot, detector not trained) |
| 9 | 2605.02287 | confirmed REJECT (Maduro/Venezuela ILSdl application proposed but not executed) |
| 10 | 2606.07811 | not fully read — duplicate skip |
| 11 | 2607.08199 | not fully read — duplicate skip |
| 12 | 2607.14051 | not fully read — duplicate skip |
| R | 2102.03453 (reserve) | in done-ids.txt → reserve unavailable |

Invalid ledgers 0882–0889 written for these duplicates were quarantined to
`/tmp/quarantine-r12/` on 2026-09-21; they do not count.

## 2. Search sessions (2026-09-21, all via public web search)

Queries run (dedup queries also recorded in the session summary):

1. `Bradley-Terry model sports ranking arXiv 2025`
2. `Elo rating sports team prediction arXiv 2025`
3. `Plackett-Luce TrueSkill Glicko sports rating model arXiv`
4. `arXiv dynamic Bayesian rating model football soccer team strength state-space 2025`
5. `Bradley-Terry tennis NFL basketball rating prediction arXiv 2025 2026`
6. `arXiv margin of victory rating model NBA NFL score-based prediction 2025`
7. `"pairwise comparison" sports football soccer rating arXiv 2025`
8. `arXiv tennis match prediction rating model 2025 Bayesian Elo surface`
9. `Plackett-Luce model sports racing ranking arXiv 2025`
10. `arXiv NCAA basketball Elo prediction tournament 2025 rating`
11. `"Pairwise-Elo" rating system Wong arXiv` (found only as Zenodo/JSM proceeding, not arXiv — skipped)
12. `arXiv horse racing rating model prediction win probability 2025`
13. `arXiv chess Elo rating improvement draw model 2025 Glickman`
14. `arXiv Dixon-Coles bivariate Poisson football match prediction extension 2025`
15. `arXiv basketball RAPM adjusted plus-minus player rating model 2025`
16. `arXiv 2026 "Elo" football player rating prediction points`
17. `arXiv horse racing win probability prediction betting market model`
18. `arXiv NFL point spread prediction model team strength 2025`
19. `"arXiv" horse racing OR "tennis" Bayesian hierarchical match prediction model 2025`

Problems noted: direct arXiv API calls over HTTP returned empty files
(redirects not followed); HTTPS worked once but multiword unquoted searches
returned ~255 mostly irrelevant results; later quoted/relevance API calls hung
or were throttled. Discovery proceeded via public web search.

## 3. Candidates checked and rejected on dedup (all in done-ids.txt)

2511.03467, 2507.22472, 2508.19848, 2608.02081, 2501.05873, 2502.10985,
2508.02725, 2606.24171 (FIFA 2026 SDR-Elo — would otherwise fit lane),
2304.09078, 2104.14012, 2410.02831, 2512.18013, 2506.00348, 2508.05891,
2608.05030, 2508.15956 (dynamic graph forecasts of tennis bookmaker odds —
would otherwise fit lane), 1701.08055 (already ledger 0004, BT/Elo unification),
2405.10247, 2502.01613, 2407.07116, 2307.02139 (Dixon-Coles extension, women's
football), 2010.11187 (G-Elo), 2510.16008 (convolutional attention in betting
exchanges — would otherwise fit lane), 2606.26267 (DD-Elo chess), 2601.15000
(L-RAPM), 2503.16470 (OU horse-racing odds — was also an assigned duplicate).

## 4. Selected fresh candidates (not in done-ids.txt; not claimed by other readers' assignments)

| # | arXiv id | Title (as discovered; verified against full text before ledgering) | Rationale for lane odds_market |
|---|----------|-------------------------------------------------------------------|--------------------------------|
| 1 | 2512.15269 | Model inference for ranking from pairwise comparisons | Jointly learns latent strengths and the unknown strength→win-probability link; tennis case study. Direct BT extension. |
| 2 | 2512.18858 | Adapting Skill Ratings to Luck-Based Hidden-Information Games | Separates skill from luck/randomized outcomes — relevant to rating in high-variance betting markets. |
| 3 | 2504.09499 | (Bayesian-network modeling; title verified from full text) | Hattrick dataset, 250 variables, 1M match samples — large-scale football rating machinery. |
| 4 | 2312.13619 | The many routes to the ubiquitous Bradley-Terry model | Theoretical extension: ties, points systems, multi-competitor settings in sports. |
| 5 | 1508.06773 | Ranking by pairwise comparisons for Swiss-system tournaments | Margin-sensitive pairwise comparison matrices for tournament seeding/rating. |
| 6 | 2310.01748 | (Dynamic linear modeling for multi-competitor sports; title verified from full text) | Evolving abilities, transformed outcomes, full-race simulation. |
| 7 | 2604.03840 | New insights into Elo algorithm for practitioners and statisticians | Decouples ranking model from prediction model; closed-form noise corrections; applied to six years of FIFA rankings. |
| 8 | 1802.00527 | Predicting outcomes for games of skill by redefining what it means to win | Margin-of-victory Elo producing full point-spread distributions — directly spread-relevant. |
| 9 | 2111.09695 | Features selection in NBA outcome prediction through Deep Learning | Feature selection for NBA outcome prediction — odds-market adjacent. |
| 10 | 2509.14645 | Are Final Market Prices Sufficient for Information Aggregation? Evidence from Last-Minute Dynamics in Parimutuel Betting | Directly about betting-market information aggregation (parimutuel, late odds moves). |
| 11 | 2401.11016 | (Plackett–Luce with consideration; title verified from full text) | Choice-set extension of Plackett–Luce ranking. |
| 12 | 1909.06722 | (Plackett–Luce loss for learning-to-rank; title verified from full text) | Ranking-loss methodology applicable to team/player ranking. |
| 13 | 1810.12068 | Modelling rankings in R: the PlackettLuce package | Software + 36-race, 87-driver NASCAR example — backup candidate. |

Note: candidates 11–13 are methodologically adjacent (ranking theory/software)
rather than direct betting-market papers; they are kept as backups and only
ledgered if they clear the GSE-value bar after a full read. Also not yet
dedup-checked at log time: 1211.5037 (Bayesian nonparametric Plackett–Luce).

Cross-check: none of the above are claimed by phase-2 assignments 01–11 or
13–49 (checked 2026-09-21 against their assignment files). Other readers may
independently discover the same fresh IDs through web search; done-ids.txt
remains the authority at ledger time.

## 2026-09-21 — Verdict: 2401.11016 (Aoki-Sherwood et al., PL+C consideration sets, AISTATS 2025) — REJECT
- Full theory paper read (AISTATS 2025, PMLR 258): Plackett–Luce with independent consideration sets; proves consideration probabilities are non-identifiable (Thm 4.1) but derives relative bounds (Thm 4.4: pj/(1-pj) vs pi/(1-pi) from top-l ranking flips) and absolute bounds (Chernoff-based, Theorems 5.2/6.3) given expected consideration-set size lower bound alpha>1 and known utilities; tightening algorithms via DAG propagation (Alg 1/2); empirical application to Putnam et al. (2018) psychology survey of U.S. states (~2900 participants, Random-10 vs Top-3 rankings).
- No sports data, no betting/odds application, no market validation. Theoretical ranking literature only. Does not clear GSE odds_market value bar. REJECTED; needs replacement.
- Replacement chain: assigned duplicate -> fresh 2401.11016 -> REJECT -> 1211.5037 (first backup, downloaded 2026-09-21, full read required).

## 2026-09-21 — Correction to earlier note
- Earlier note said 1211.5037 had not been checked against done-ids.txt. CORRECTED: 1211.5037 and 1810.12068 were both confirmed ABSENT from state/done-ids.txt on 2026-09-21. Both are fresh candidates.

## 2026-09-21 — Verdict: 1211.5037 (Caron, Teh & Murphy, BNP Plackett-Luce, AOAS 2014) — REJECT
- Full text read (published AOAS 8(2):1145-1181): Bayesian nonparametric extension of Plackett-Luce via gamma process prior G~Gamma(alpha,tau,H); PL as partial size-biased permutation of atoms (Eq 3); Thurstonian exponential race + inter-arrival latent variables Z; posterior characterisation via Palm formula (Thms 1-2); conjugate Gibbs sampler; Dirichlet process mixture of BNP-PL components with Pitt-Walker atom-sharing construction; applied to 53,757 Irish CAO 2000 applicants' top-10 degree-programme rankings; 26 clusters >10 (26th=47); clusters characterised by subject matter and geography (subject/geography > prestige); entropy-based within-cluster variability; hyperparameters posterior ranges alpha~[3,8], gamma~[2,5], phi~[100,200].
- Verdict rationale: methodologically strong ranking-clustering paper, but the only application is college applications; no sports data, no odds/betting validation anywhere. Sports ranking enters only as a citation (Hunter 2004). Does not clear the GSE odds_market value bar. REJECTED.
- Replacement chain: assigned duplicate -> fresh 1211.5037 (reserve/first backup) -> REJECT -> next replacement needed (fresh arXiv search).

## 2026-09-21 — Verdict: 2512.18858 (modified Elo for luck-driven hidden-information Rummy) — REJECT
- Full text read. Score-based Elo variant tuned on 270,000 simulated games of six deterministic strategies: K=-0.625, alpha~=-0.0032, beta=-0.012690, F1 0.7927; claims rating stabilisation ~5,000 games.
- Fatal internal problems: derivation requires beta>0 yet the reported optimal beta is NEGATIVE (-0.012690); discussion claims top strategies exceed 1350 contradicting the custom-Elo table (means 1300.788 max); discussion cites Defeat Heuristic custom CV above 180% but the custom table gives 14.603% (256.939% appears only in traditional Elo); claims comparison with Glicko/TrueSkill but the empirical comparison shown is only vs traditional Elo. Simulation-only, no human play or market data.
- Verdict rationale: internal contradictions make no reported number trustworthy; no real sports or market validation. REJECTED. Needs replacement (fresh search).

## 2026-09-21 — Verdict: 2312.13619 (Statistical Science survey: Bradley-Terry through many lenses) — ADAPT
- Substantive full-text read (accepted in Statistical Science). Derives/surveys BT through odds transitivity, Luce choice axiom, reciprocity/sufficient statistics, MaxEnt/ML under retrodictive criterion, geometric minimization, Gumbel/Weibull/Frechet discriminal processes, Rasch/Mallows/von Mises-Fisher/Cox-hazards/network formulations, Poisson scoring, sudden death, quasi-symmetry links (PageRank, fair bets, Wei-Kendall, RPI, Barker's algorithm), exponential-family synthesis, ties and multi-competitor extensions.
- Overlap check vs existing-research-map.md: BT/Plackett-Luce appear only in the inventoried metric catalog (mentioned, not deeply researched); no BT-foundations paper in the 64-ID dedup set. Novel contribution vs corpus: principled derivation menu, when-BT-fails diagnostics, fast spectral approximations, ties/multi-competitor extensions.
- Verdict: ADAPT — conceptual, but fills a genuine BT-foundations gap in the corpus; model-selection criteria and failure diagnostics feed GSE rating-system design. (Honest caveat: conceptual, no new predictive experiment.)

## 2026-09-21 — Verdict: 1508.06773 (incomplete reciprocal pairwise-comparison matrices, 2010 Chess Olympiad) — REJECT
- Full text read. 149 teams, 810 matches, only 7.3% of possible matrix elements observed; four arbitrary score-to-ratio transformations x Eigenvector/Logarithmic Least Squares methods; rankings highly similar across variants (rank correlations >0.99); introduces log-Euclidean rank distance tau.
- Verdict rationale: descriptive ranking/tie-break study only; no predictive validation, no calibration, no odds-market application. The one general finding (ranking-method choice matters little) is thin. Does not clear the GSE odds_market bar. REJECTED. Needs replacement (fresh search).

## 2026-09-21 — Verdict: 1909.06722 (PLRank: Plackett-Luce loss + gradient-boosted trees, learning-to-rank) — ADAPT
- Full text read (arXiv 2019, Wright State). PLRank = ListMLE/PL-loss in gradient-boosting framework with regression-tree weak learners; exact functional gradient (Eqn 9) and leaf Newton step; multi-permutation ground-truth handling with compression.
- Key results: Yahoo 2010 (519 features): PLRank NDCG@10 0.7902-0.7903 vs LambdaMART 0.7809 (~2 pts); industry-tuned PLRank(obj=1) NDCG@10 0.802 vs LambdaMART 0.796; Microsoft 30K: PLRank matches LambdaMART/McRank across measures; same time complexity as LambdaMART, much faster than McRank (126h vs 250+h single core).
- Key design rule: linear ListMLE is unstable unless #features is large relative to avg docs per query (critical thresholds ~200 features for NDCG@1, ~100 for NDCG@10 on Yahoo; MS30K l-ListMLE ~8 pts worse than CA) — PL loss consistency (NDCG@K) needs feature richness; boosted trees fix the instability.
- GSE use: listwise PL-loss ranking of betting opportunities by expected edge (learning-to-rank is a commissioned ML-brief topic); feature-richness precondition as a design rule for GSE pick-ranking models. (Honest caveat: web-search domain, no sports validation; PL loss itself was first proposed for horse gambling — Plackett 1975.)

## 2026-09-21 — Verdict: 2409.13528 (Liu, Donovan & Popov, "A Comparison between Financial and Gambling Markets", q-fin.ST) — REJECT
- Full text read (2,399 lines incl. references). Qualitative conceptual review: screens 263 publications, keeps 125 (1968–2026), synthesizes across five dimensions (platform, product, procedure, participant, strategy). Concludes peer-to-peer betting exchanges share structural features with order-driven financial markets and that statistical arbitrage/portfolio framing can transfer; explicitly warns structural pricing equations from no-arbitrage replication do NOT transfer (gambling prices emerge from probability aggregation and exposure management).
- No equations, no new dataset, no empirical test, no backtest of any proposed transfer — the "portfolio selection over distinct outcome spaces" framing is asserted, not demonstrated. Descriptive survey only. Does not clear the GSE odds_market bar (no implementable, testable result). REJECTED. Needs replacement (fresh search).

## 2026-09-21 — Finalization dedup recheck (ledger time): TWO fresh candidates found to be duplicates
- 2512.15269v1 (previously decided ADAPT): already has ADAPT ledger 1051 (`arxiv-deep/1051-pairwise-comparison-kernel-inference.md`) written by wave2-reader-19 (lane bayesian_statespace). NOT in done-ids.txt (reader-19's omission), but double-counting it as valuable would corrupt the 750-program count. Dropped; NOT counted among the 12.
- 2001.04226v2 (previously decided ADAPT): already has ADAPT ledger 0601 (`arxiv-deep/0601-prediction-and-evaluation-in-college-hockey.md`, phase 1, team_ratings lane) AND is present in done-ids.txt. Dropped; NOT counted among the 12.
- Integrity note: both were screened against done-ids.txt only at selection time; the ledger-time recheck against existing ledgers, both trackers, and all wave reports caught them. Both replaced from fresh search — neither counts as a REJECT (they are duplicate skips, like the 12 assigned duplicates).

## 2026-09-21 — Verdict: 2109.13743 (Karle & Tyagi, "Dynamic Ranking with the BTL Model: A Nearest Neighbor based Rank Centrality Method", math.ST) — ADAPT
- Substantive full read (abstract, setup, Algorithm 1, Theorems 1–2, all experiments, related-work discussion; proof appendices at statement level). Dynamic BTL with Lipschitz-smooth strengths; Dynamic Rank Centrality: time-neighborhood union graph -> locally averaged win fractions -> Rank Centrality transition matrix -> leading left eigenvector. Non-asymptotic l2/l_inf bounds; optimal window delta* ~= T^{2/3} giving O(T^{-1/3}) l2 rate; static case recovers the Negahban/Chen O(1/sqrt(Lnp)) rate.
- Synthetic: DRC ~= kernel-MLE (Bong et al.) on l2/ranking/l_inf errors; DRC 5-10x faster (n=100,T=150: 13.2s vs 66.0s; n=400,T=100: 59.6s vs 551.5s). NFL 2009-2015 (nflWAR, 32 teams x 16 rounds): LOOCV delta tuning; DRC strength estimates correlate with Elo ratings 0.284-0.518 (2011-2015) vs MLE -0.337-0.092; Kendall rank correlations similar and low for all methods. Code: github.com/karle-eglantine/Dynamic_Rank_Centrality.
- Verdict: ADAPT — cheapest principled dynamic rating in the corpus; the delta* rule gives GSE a theory-backed forgetting window. Replaces duplicate-skipped 2512.15269v1.
- Replacement chain: assigned duplicate -> fresh 2512.15269v1 -> DUPLICATE (ledger 1051, wave2-reader-19) -> fresh 2109.13743v2 -> ADAPT.

## 2026-09-21 — Verdict: 2211.06052 (Oetting, Deutscher, De Angelis & Singleton, "Gambling on Momentum", econ.GN) — ADAPT
- Full text read (1,018 lines through conclusion and limitations). Second-by-second bookmaker odds + staked volumes, 612 Bundesliga matches (2017/18-18/19); 212 matches reaching 1-1 before 85'. Three regressions (match clustered SEs): (1) outcome logit: equaliser beta2 = 0.115 (0.286), n.s. — no momentum effect; (2) bookmaker odds: beta2 = -0.017 (0.128), n.s. — bookmaker ignores momentum; (3) bettor stakes: beta2 = 0.127*** (0.028) — +12.7pp relative stakes on the equaliser-scorer, +35.7% at covariate means (+46.5% with pre-stakes control; +19.4pp second half). Always-back-the-momentum ROI: -20.1% (moderate favs, 70 bets), -7.4% (moderate longshots, 50 bets), -23.3% (strong longshots, 72 bets); +0.6% for strong favs (20 bets) vs 7.9% overround.
- Verdict: ADAPT — cleanest behavioral-bias evidence in the wave; fade-the-narrative feature for GSE in-play models. Replaces duplicate-skipped 2001.04226v2.
- Replacement chain: assigned duplicate -> fresh 2001.04226v2 -> DUPLICATE (ledger 0601, phase 1; in done-ids.txt) -> fresh 2211.06052v1 -> ADAPT.

## 2026-09-21 — Final ledger set (12 valuable, lane odds_market, ledgers 0882-0893)
0882: 2312.13619v2 ADAPT | 0883: 2310.01748v2 ADAPT | 0884: 2604.03840v1 ADAPT | 0885: 1802.00527v1 ADAPT | 0886: 2111.09695v1 ADAPT (weak) | 0887: 2509.14645v3 ADAPT | 0888: 1909.06722v1 ADAPT | 0889: 1810.12068v2 ADAPT | 0890: 2112.11262v1 ADAPT | 0891: 2312.04711v1 ADAPT | 0892: 2109.13743v2 ADAPT | 0893: 2211.06052v1 ADAPT.
Rejections (6, none counted): 2504.09499, 2512.18858, 1508.06773, 2401.11016, 1211.5037, 2409.13528 — all replaced. Duplicate skips (14, none counted): 12 assigned duplicates + reserve 2102.03453 + fresh duplicates 2512.15269v1, 2001.04226v2 — all replaced. No blocked papers. Nothing committed or pushed.
