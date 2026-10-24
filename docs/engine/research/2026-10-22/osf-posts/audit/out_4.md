post_13|Rodgers ranked 7th in EPA/play 2016-2019 but 1st in 2011-2015|not-implemented|osf-qb-volatility-and-prospects.ts covers Posts #4, #9, #14, #1, #2 only; no EPA ranking tables
post_13|Raw EPA overrates Garoppolo/Mullens/Lock and underrates Rodgers/Russ|not-implemented|No player-level EPA ranking or adjustment logic in any of the three implementation files
post_13|Random-effects model with passer/receiver/defense adjusts for context|not-implemented|osf-qb-volatility-and-prospects.ts has gunslinger classification (Post #9) and aging decomposition (Post #14) but not this multi-component random-effects model
post_13|Model decomposes QB value into Play Quality, Air Yards, YAC components|not-implemented|No three-component decomposition exists; closest is aging/scheme decomposition in osf-qb-volatility-and-prospects.ts:decomposeQbAgingAndSchemeSupport
post_13|Rodgers most aggressive on late downs (yards past sticks on 3rd/4th down)|not-implemented|No late-down aggression metric in any implementation file
post_13|Success rate peaks at ~6 air yards on 1st down|not-implemented|No success-rate-by-air-yards analysis implemented
post_14|TE targets steadily increased 2000-2019; FB targets dropped off|not-implemented|osf-receiving-xfp-and-spatial-surfaces.ts:evaluateReceivingByPositionCurve fits CP~airYards per position but no historical trend analysis
post_14|WR targets reduced past 3 seasons after prior decade rise|not-implemented|No time-series target share trends in implementation; only cross-sectional curve fitting
post_14|TE EPA rising; RB passing game ineffective despite similar targets|not-implemented|Implementation returns mean EPA per position but no trend or efficiency claims
post_14|No change in average air yards to TEs since 2006|not-implemented|evaluateReceivingByPositionCurve reports meanAirYards per position but no longitudinal comparison
post_14|TEs get higher target share near goal line, eating RB share|not-implemented|No red-zone target share by position implemented
post_14|Team outliers: 2011 Patriots, 2019 Eagles/Ravens/Raiders high TE usage|not-implemented|No team-level receiving breakdown in any implementation file
post_19|xFP = sum over YAC distribution: CP * yac_prob * (1 + gain/10 + 6*I(TD))|mismatch|osf-receiving-xfp-and-spatial-surfaces.ts:computeReceiverExpectedFantasyPoints uses point formula CP*(w_ppr+0.1*(airYards+E[YAC])+6*P(TD|catch)) not full YAC distribution
post_19|Expected catches = sum(CP); expected yards = sum(gain*CP*yac_prob)|mismatch|Implementation returns single expectedFantasyPoints; no separate expected catches/yards/TDs outputs
post_19|Simulation of 10k outcomes per game for percentile distributions|not-implemented|No simulation or distribution logic in any implementation file
post_19|QB quality should factor into catch probability for xFP|unverifiable|Implementation takes catchProbability as input; no QB adjustment layer
post_19|Excludes fumbles, 2pt conversions, rushing plays|match|computeReceiverExpectedFantasyPoints excludes these; rushing terms are optional separate inputs
post_19|FPOE = actual - expected identifies buy-low/sell-high candidates|match|computeReceiverExpectedFantasyPoints returns fantasyPointsOverExpected and regressionDelta = -FPOE with buy-low/sell-high/neutral signal
post_20|538 predictions scraped from nfl_elo.csv with elo_prob1|not-implemented|osf-team-ability-hfa-and-ewma.ts:blendEspnFpiAnd538EloPredictions assumes probabilities already obtained; no scraping
post_20|ESPN game IDs scraped from schedule pages per week|not-implemented|No web scraping in any implementation file
post_20|ESPN API returns gameProjection (win prob) and pickcenter moneylines|not-implemented|No ESPN API integration implemented
post_20|Moneyline conversion: positive ML→100/(ML+100), negative ML→ML/(ML-100)|not-implemented|No odds-to-probability conversion in implementation
post_20|Numberfire most accurate (benefits from betting info); ESPN/538 lower|not-implemented|No accuracy/Brier score calculation in blendEspnFpiAnd538EloPredictions
post_20|Log-odds pooling of FPI, Elo, market probabilities|match|blendEspnFpiAnd538EloPredictions implements log-odds pool with weighted normalized sources, clipping away from 0/1