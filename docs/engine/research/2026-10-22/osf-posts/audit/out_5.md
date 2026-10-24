post_15|xFG uses logistic regression with kick_distance GW_FG_Att wind Precip as significant predictors|mismatch|TS uses quadratic-kink sigmoid(b0 - b1*d - b2*max(0,d-50)^2 - b3*wind + b4*dome + b5*altitudeKm) with no GW_FG_Att or Precip
post_15|FGOE = ActualFGMade - xFG summed per kicker|match|TS returns fgoe = sum(made - xfgByAttempt) same definition
post_15|80/20 train/test split with seed 123 for model fitting|not-implemented|TS fits all attempts by Newton-Raphson no train/test split
post_15|Model accuracy 86% overall 88% made 49% missed|not-implemented|TS returns converged flag and coefficients no accuracy metrics
post_15|xFG probability threshold 0.5 for classification|not-implemented|TS outputs continuous xFG no classification threshold
post_15|Variables include indoors/outdoors natural_grass temp precipitation binary factors|mismatch|TS uses dome altitudeKm windMph distance only

post_17|RERUN = GrossYards - return_smooth where return_smooth from LOESS span=0.65|mismatch|TS uses OLS E[ReturnYards|hangtime grossYards sidelineDirection gunnerSeparation] not LOESS
post_17|Era adjustment by fitting LOESS per season|not-implemented|TS single OLS fit no seasonal adjustment
post_17|League average Net equals RERUN 37.9 yards|unverifiable|TS returns aggregateNetOverExpected mean of expected-actual not league averages
post_17|Assumptions: punter 100% responsible for return occurrence 0% for return length|unverifiable|TS model conditions on hangtime grossYards sidelineDirection gunnerSeparation different framing
post_17|RERUN2 uses season-specific LOESS predictions return_smooth2|not-implemented|TS single coefficient set no per-season models
post_17|Top punters ranked by mean RERUN2 per season with >32 punts|not-implemented|TS returns coefficients and per-punt metrics no ranking function

post_21|KDE uses scipy.stats.gaussian_kde with fixed 121x141 grid -30:30:121j -10:60:141j|mismatch|TS uses Silverman bandwidth per axis evaluates on data-bounded grid with configurable step
post_21|QB comparison via difference of two KDE estimates|partial|TS computes overlapIntegral against weak spots not QB-KDE differences
post_21|MASS::kde2d for QB vs QB with common x/y range n=200|not-implemented|TS single KDE from targets no pairwise QB comparison
post_21|Faceted heatmaps by EPA/YAC sign using geom_density_2d_filled|not-implemented|TS returns density grid no faceting or plotting
post_21|Animated heatmaps via gganimate transition_states|not-implemented|TS static output no animation capability
post_21|QB density compare function using matrix subtraction of kde2d outputs|not-implemented|TS no QB-specific KDE or diff function

post_22|KDE grid fixed -30:30:121j -10:60:141j for comparability|mismatch|TS grid derived from target min/max with gridStepYards default 2
post_22|Completion surface via PyGAM LogisticGAM s(0) s(1) te(0,1) splines+tensor|mismatch|TS uses tensor-product logistic GAM with x y separation sidelineDistance and squares 8 features
post_22|Regressed QB model: (med_n*league_gam*league_kde + n_qb*qb_gam*qb_kde)/(med_n*league_kde + n_qb*qb_kde)|not-implemented|TS fits single surface on supplied observations no league-QB regression
post_22|CPOE = QB completion prob - league avg completion prob|partial|TS cpoe = mean(predictions) - observedRate on same data not league vs QB
post_22|Model accuracy 70.1% vs 65.3% baseline|not-implemented|TS returns logLikelihood converged flag no accuracy metric
post_22|Partial dependence plots for x_coord y_coord feature effects|not-implemented|TS no partial dependence extraction