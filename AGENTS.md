# GSE Discovery - Agent Notes

## Real GSE Data (Verified)
- qClose mean: 0.5539 (std: 0.1816)
- home_win mean: 0.5440
- rest_diff mean: -0.0712
- h_burden mean: 2.1699
- a_burden mean: 2.2898

## Enhancements Built (62 new columns)
1. Fantasy Projections → FantasyPros c1 scores (3 cols)
2. Prop Bet Odds → MyBookie/BetOnline odds (7 cols)
3. Recovery Metrics → WHOOP/Oura recovery data (6 cols)
4. Mental Toughness → mental_toughness x pressure compound (4 cols)
5. Injury Risk Score → Sports medicine injury prediction (4 cols)
6. Nutrition Factor → Nutrition science compound (4 cols)
7. Sleep Quality → Sleep optimization features (5 cols)
8. Team Chemistry → Social dynamics compound (5 cols)
9. Advanced Player Metrics → PFF grades, Understat xG, Statcast data (13 cols)
10. Market Efficiency → Exchange odds spread feature (11 cols)
11. ETL Pipeline → 50 APIs configured
12. Bayesian Model → Hierarchical model (AUC: 0.5247 vs Logistic: 0.6100)
13. Combat Sports Module → UFC, Bellator, Boxing (19 cols)
14. Cricket Module → Test, ODI, T20 (13 cols)
15. Golf Module → PGA Tour, LPGA Tour (13 cols)
16. Tennis Module → ATP/WTA, Grand Slam (14 cols)

## Files
- compound_table2_final.csv: 2895 rows × 133 columns
- gse_etl_pipeline.py: ETL pipeline for 50 APIs
- gse_bayesian_model.py: Bayesian hierarchical model
- build_gse_enhancements.py: Phase 1-2 builder script
- build_etl_bayesian.py: Phase 3 builder script
- gse_enhancements.py / _phase2.py / _phase3.py: Enhancement scripts
- etl_output.csv: 50 APIs configured

## Key Finding
Bayesian model (AUC 0.5247) underperforms Logistic Regression (AUC 0.6100) on GSE data. The simple logistic model captures more signal than the hierarchical Bayesian approach with random effects.