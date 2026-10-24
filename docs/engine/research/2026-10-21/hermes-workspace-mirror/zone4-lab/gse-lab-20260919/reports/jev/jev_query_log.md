# JEV query log

arXiv API only (export.arxiv.org). 'opened' = fetched entries screened by JEV; ALL fetched were opened. arXiv API has NO citation sort - relevance or recency only (stated per S3.A). Founder skip-list honored: DAVE, bare 'probabilities', 'gaussian-close', 'empirical-close', CTI, bare sport/football/JRSS/CQR/jackknife, 'dixon codes' typo - none run as primary queries. Rewrites applied per spec.

| query | label | total results | fetched/opened | kept (KEEP/MEASURE) |
|---|---|---|---|---|
| must_open | must_open | ? | 8 | 7 |
| jackknife+ | jackknife+ | ? | 12 | 1 |
| cv+ | cv+ | ? | 12 | 1 |
| cross-conformal | cross-conformal | ? | 12 | 4 |
| split-conformal | split-conformal | ? | 12 | 3 |
| full-conformal | full-conformal | ? | 12 | 2 |
| mondrian | mondrian | ? | 12 | 1 |
| conformalized-quantile | conformalized-quantile | ? | 12 | 3 |
| adaptive-conformal | adaptive-conformal | ? | 12 | 5 |
| covariate-shift | covariate-shift | ? | 12 | 2 |
| nonexchangeable | nonexchangeable | ? | 12 | 3 |
| venn-abers | venn-abers | ? | 12 | 2 |
| dtaci | dtaci | ? | 1 | 0 |
| au-vovk | au-vovk | ? | 12 | 2 |
| au-romano | au-romano | ? | 12 | 4 |
| au-barber | au-barber | ? | 12 | 3 |
| au-gibbs | au-gibbs | ? | 3 | 2 |
| au-petej | au-petej | ? | 10 | 3 |
| au-angelopoulos | au-angelopoulos | ? | 12 | 4 |
| au-zaffran | au-zaffran | ? | 12 | 1 |
| additive-quantile | additive-quantile | ? | 12 | 0 |
| qgam | qgam | ? | 3 | 0 |
| brier | brier | ? | 12 | 3 |
| wilson | wilson | ? | 4 | 3 |
| parlay | parlay | ? | 4 | 1 |
| kelly | kelly | ? | 12 | 5 |
| pinnacle | pinnacle | ? | 6 | 0 |
| closing-line | closing-line | ? | 12 | 5 |
| bookies | bookies | ? | 1 | 1 |
| skellam | skellam | ? | 5 | 2 |
| dixon-coles | dixon-coles | ? | 3 | 1 |
| nfl-prediction | nfl-prediction | ? | 12 | 4 |
| ncaaf | ncaaf | ? | 12 | 5 |
| soccer-goals | soccer-goals | ? | 12 | 2 |
| wasserstein-sport | wasserstein-sport | ? | 5 | 1 |
| intrinsic-dim | intrinsic-dim | ? | 12 | 0 |
| dfa | dfa | ? | 1 | 1 |
| hedge-experts | hedge-experts | ? | 12 | 1 |
| expert-aggregation | expert-aggregation | ? | 12 | 3 |
| _newest200 | _newest200 | ? | 25 | 1 |
| all:"conformal prediction" AND (all:football OR all:soccer OR all:sport OR all:betting) | gap-conformal-sport | None | 0 | 0 |
| all:Skellam AND (all:"American football" OR all:NFL OR all:"point difference") | gap-skellam-nfl | None | 0 | 0 |
| all:quarterback AND (all:"covariate shift" OR all:"distribution shift" OR all:conformal) | gap-qb-shift | None | 0 | 0 |
| all:"closing line value" AND (all:betting OR all:sportsbook) | gap-clv-denominator | 0 | 0 | 0 |
| all:"college football" AND (all:calibration OR all:conformal OR all:"prediction interval") | gap-ncaaf-calibration | 0 | 0 | 0 |

Batching: 38 search queries + newest200 window + 8 must-open ID fetches + 5 gap queries = real API calls. S3.A protocol used: author-seeds (Vovk/Romano/Barber/Gibbs/Petej/Angelopoulos/Zaffran), title-seeds, newest-200.
