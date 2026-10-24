post_00|Post #1 constructs non-QB surplus value curve using second-contract APY as player value measure|match|osf-qb-volatility-and-prospects.ts:258-273 evaluateNflDraftPickSurplusValue uses isotonic fit over measuredCurve APY points minus rookieCost
post_00|Measured APY curve is an input argument, not a hidden constant|match|osf-qb-volatility-and-prospects.ts:210-213 DraftPickSurplusInput requires measuredCurve as readonly array argument
post_00|Rookie cost curve comes from Spotrac draft contract data scaled to cap percentage|not-implemented|TS accepts single rookieCost number per pick; no Spotrac scrape or cap-scaling logic in module
post_00|Surplus value = fitted APY (isotonic) - rookie cost|match|osf-qb-volatility-and-prospects.ts:272 surplusValue: apy - rookieCost
post_00|On-field value (fit) and surplus value are distinct outputs|mismatch|TS returns only surplusValue and fittedApy; no separate on-field value field
post_00|QBs excluded entirely from surplus calculation|unverifiable|TS operates per-pick; position filtering would be caller responsibility

post_01|TF-IDF scouting-language trait extraction with position and school base-rate de-biasing|match|osf-qb-volatility-and-prospects.ts:323-359 evaluateProspectScoutingLinguisticProfile implements TF-IDF with positionBaseRates and schoolBiasOffsets
post_01|Trait lexicon includes 20 specific terms (arm strength, accuracy, anticipation, etc.)|match|osf-qb-volatility-and-prospects.ts:293-314 TRAIT_LEXICON array matches post terms exactly
post_01|Term frequency = trait count in text; IDF uses position base rate as document frequency proxy|match|osf-qb-volatility-and-prospects.ts:330-336 tf = 1 + log(matches); idf = log(1/base)
post_01|De-confounded score subtracts position base rate and school bias offsets|match|osf-qb-volatility-and-prospects.ts:349 deconfoundedScore = clamp01(total/(total+1) - positionMean - bias)
post_01|Ceiling modifier = 1 + 0.25 * (deconfoundedScore - 0.5)|match|osf-qb-volatility-and-prospects.ts:350 ceilingModifier = 1 + 0.25 * (deconfoundedScore - 0.5)
post_01|Floor modifier = 1 - 0.15 * abs(deconfoundedScore - 0.5)|match|osf-qb-volatility-and-prospects.ts:351 floorModifier = 1 - 0.15 * Math.abs(deconfoundedScore - 0.5)

post_03|Shifted Gini of QB EPA and VOLoe against league EPA regression baseline|match|osf-qb-volatility-and-prospects.ts:64-74 computeQbEpaGiniAndVolOe computes shiftedGini, expectedGini = gamma0 + gamma1*meanEpa, volOe = gini - expectedGini
post_03|Modified Gini handles negative EPA values via shifted Gini formulation|match|osf-qb-volatility-and-prospects.ts:68 shiftedGini imported from osf-math-core; post uses custom Gini_Function for negative EPA
post_03|Minimum 100 dropbacks threshold for interpretation (insufficient-sample)|match|osf-qb-volatility-and-prospects.ts:72 epa.length < 100 ? "insufficient-sample"
post_03|VOLoe interpretation: |volOe| < 0.05 = stable, else volatile|match|osf-qb-volatility-and-prospects.ts:72 Math.abs(volOe) < 0.05 ? "stable" : "volatile"
post_03|GAM model for expected VOL: VOL ~ s(EPA_play, k=9) + Plays (adjusted R²=0.75)|not-implemented|TS expects gamma0/gamma1 as published league regression coefficients; no GAM fitting in module
post_03|Outlier detection: EPA_play >= 85th percentile (~0.178) and VOLoe >= 85th percentile (~0.05)|not-implemented|No outlier detection logic in TS module
post_03|No relationship between QB age and volatility/VOLoe|unverifiable|TS has aging decomposition (Post #14) but no age-volatility correlation analysis

post_08|Bivariate classification on aDOT and CPOE z-scores, conditioned on tight-window aggressiveness|match|osf-qb-volatility-and-prospects.ts:107-125 classifyGunslingerVsGameManager standardizes adot/cpoe/tightWindowRate against league moments
post_08|Aggressiveness score = 0.5*adotZ + 0.3*tightWindowZ - 0.2*cpoeZ|match|osf-qb-volatility-and-prospects.ts:118 aggressivenessScore = 0.5*adotZ + 0.3*tightWindowZ - 0.2*cpoeZ
post_08|Quadrant classification by sign of standardized axes (not invented cut scores)|match|osf-qb-volatility-and-prospects.ts:120-123 classification by adotZ>0 && cpoeZ>0 etc.
post_08|Gunslinger weights: TDs 0.75, passYards 0.5, rushYards 0.25, shortOfSticksRate -0.75, airYards 1.0|not-implemented|TS uses simplified 3-feature model (adotZ, cpoeZ, tightWindowZ) not the 5-feature weighted sum from post
post_08|Game Manager weights: INTs -1.0, successRate 0.70, sacks -0.50, completion% 0.75|not-implemented|TS does not compute separate ManageScore; single aggressivenessScore drives quadrant
post_08|Garbage-time filter: home_wp between 0.1 and 0.9|not-implemented|TS has no play-level filtering; operates on pre-aggregated season inputs
post_08|Minimum 200 pass attempts per season filter|unverifiable|TS does not validate attempt count; caller supplies aggregated inputs