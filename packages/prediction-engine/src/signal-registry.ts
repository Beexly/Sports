/**
 * signal-registry.ts — the engine's single source of truth for what it knows.
 *
 * WHY THIS EXISTS
 * The corpus sweeps recovered 4,437 text findings, 1,428 office findings and
 * 372 never-read archive files. Almost none of it was wired: the branch atlas
 * shows 81 calibration branches producing 25 modules of which only 10 are
 * imported by shipping code, and MASTER-REGISTER reports Tier-1 metrics wired
 * 0 of 11. This registry closes that gap by making every signal an explicit,
 * weighted, provenance-carrying entry instead of an unwired module.
 *
 * DESIGN RULES (each one exists because a measurement demanded it)
 *
 * 1. EMISSION WEIGHT 0 UNTIL MEASURED. No signal may carry a non-zero
 *    emission weight until it has improved CRPS on the frozen 2,462-game
 *    filter (REG 2017 W1..2026 W5, mu = +spread_line, Gaussian 7.154021,
 *    gate 7.099). Today NOTHING clears that bar, so every emission weight
 *    here is 0. That is not timidity -- it is the measured state.
 *
 * 2. DIAGNOSTIC WEIGHT IS ALWAYS LIVE. A signal with emission weight 0 still
 *    runs, still appears in the reasoning trace, and still contributes to
 *    diagnostics. Nothing is killed or deferred; it is weighted honestly.
 *
 * 3. mu = +spread_line ON NFLVERSE. Never flipped. Measured: flipping costs
 *    3.28 CRPS (7.154021 -> 10.435732) and corr(spread_line, home_margin)
 *    is +0.4469. The corpus's `mu_margin = -listed_spread` is correct for a
 *    book's home-number feed and WRONG for nflverse columns.
 *
 * 4. PROVENANCE IS MANDATORY. Every entry names where the number came from.
 *    A parameter without a source is rejected at construction time.
 *
 * 5. UNCERTAINTY IS REPORTED, NOT ASSUMED. The vision plane measured 787
 *    plays / 1,181,625 frames at mean RMSE 0.0956 m but 90% CI coverage
 *    83.65% -- the point estimate is fine while the stated uncertainty is
 *    wrong. So every entry carries its own evidence strength.
 */

// ---------------------------------------------------------------- types

export type SignalClass =
  | "market"        // odds, lines, de-vig, CLV
  | "schedule"      // rest, travel, timezone, altitude, surface, roof
  | "roster"        // injuries, availability, depth
  | "tracking"      // spatial / coordinate derived
  | "rating"        // Elo, Glicko, Bradley-Terry, RAPM
  | "form"          // rolling efficiency, EPA, success rate
  | "situational"   // coaching, scheme, referee, weather
  | "distributional" // distribution shape: atoms, mixture, conformal
  | "integrity";    // data-quality and abstention machinery

export type EvidenceStrength =
  | "measured-reproduced"  // re-run by this engine on the frozen filter
  | "measured-reported"    // measured by a prior session, source named
  | "stated-unverified"    // asserted in the corpus, never measured
  | "contradicted";        // two sources disagree

export interface SignalSpec {
  readonly id: string;
  readonly cls: SignalClass;
  /** Human label for the reasoning trace. */
  readonly label: string;
  /** What it measures, one line. */
  readonly measures: string;
  /** Where the number came from. MANDATORY. */
  readonly provenance: string;
  readonly evidence: EvidenceStrength;
  /**
   * Weight applied to the PREDICTIVE DISTRIBUTION. 0 for every signal today.
   * Non-zero requires a measured CRPS improvement on the frozen filter.
   */
  readonly emissionWeight: number;
  /**
   * Weight applied to the DIAGNOSTIC / reasoning trace. Always >= 0 and
   * always live, so an unproven signal is still visible rather than deleted.
   */
  readonly diagnosticWeight: number;
  /** Concrete blocker preventing emission weight > 0, or null if cleared. */
  readonly blocker: string | null;
  /** Known failure mode. Surfaced in the trace so a reader can discount it. */
  readonly caveat: string | null;
  /** Does this signal depend on which team a spread refers to? */
  readonly signSensitive?: boolean;
}

// ---------------------------------------------------------------- constants

/** The locked baseline. Every CRPS claim is checked against these. */
export const FROZEN_FILTER = {
  gameType: "REG",
  seasons: "2017 W1 .. 2026 W5",
  n: 2462,
  mu: "spread_line",
  muSign: "+1" as const,
  gaussianSigma: 13.45,
  gaussianCrps: 7.154021,
  gate: 7.099,
  minN: 150,
  /** Measured cost of flipping mu. Do not rediscover this. */
  flipCostCrps: 3.281711,
  /**
   * corr(spread_line, home_margin). TWO values circulate in the corpus:
   * +0.4536 and +0.4469. Both positive, so the sign conclusion is unaffected,
   * but they were produced under different filters and must NOT be collapsed
   * into one number until the same filter reproduces both.
   */
  corrSpreadToHomeMargin: 0.4469,
  corrSpreadToHomeMarginAlt: 0.4536,
  corrProvenance: "two distinct measurements under different filters; sign agrees, magnitude unresolved",
} as const;

/**
 * Small-N conformal law, verified: at alpha=0.10, k=ceil((n+1)(1-alpha)).
 * n=5 -> k=6 > n -> infinite interval or No-Bet; clamping gives 83.33%
 * coverage (6.67% under-coverage). Minimum viable n=9 (k=9, 0.9000).
 * Resampling does NOT fix this -- bootstrap adds variance estimates, not ranks.
 */
export const CONFORMAL_SMALL_N = {
  alpha: 0.10,
  minViableN: 9,
  kAt5: 6,
  /** Clamped to the max score: min(k,n)/(n+1) = 5/6 = 0.833333... */
  clampedCoverageAt5: 0.8333333333333334,
  /** 1 - 5/6 = 1/6 = 0.166666... The MISS RATE. NOT the defect against 90%. */
  nonCoverageAt5: 0.1666666666666667,
  /** 0.90 - 5/6 = 0.066666... THE UNDER-COVERAGE DEFECT vs nominal. */
  shortfallVsNominalAt5: 0.06666666666666665,
  kAt500: 451,
  coverageAt500: 0.9002,
  remediation: "Venn-Abers, or jackknife+ with the (1-2alpha) correction, or explicit No-Bet. NOT more bootstrap resamples.",
} as const;

/**
 * The de-vigged closing moneyline is already calibrated: pooled Brier 0.2106
 * (95% CI [0.2050, 0.2172]), adaptive ECE 0.0126, n=5,281 NFL games 2006-2025.
 * Isotonic/Platt/beta beat identity by <= 0.0005. This is the bar.
 */
export const MARKET_BAR = {
  brier: 0.2106,
  brierCiLow: 0.2050,
  brierCiHigh: 0.2172,
  adaptiveEce: 0.0126,
  n: 5281,
  seasons: "2006-2025",
  bestRecalibrationGain: 0.0005,
} as const;

/**
 * Deployed v5.2.7 FAILS its own ECE floor (0.1089 vs 0.05) while the pooled
 * sample clears. And the Brier <= 0.22 publishability floor is non-binding:
 * at base rate 0.69 a zero-skill constant forecast scores 0.2139 < 0.22.
 * Both gates are unsound; both are replaced by skill-score floors here.
 */
export const GATE_DEFECTS = {
  deployedEce: 0.1089,
  deployedEceFloor: 0.05,
  pooledEceClears: true,
  brierFloor: 0.22,
  baseRate: 0.69,
  zeroSkillBrier: 0.2139,
  brierFloorBinding: false,
  fix: "Brier Skill Score vs base rate (0 for a constant forecast), gated on the DEPLOYED version not the pooled sample.",
} as const;

// ---------------------------------------------------------------- registry

/**
 * Every signal recovered from the corpus. Ordered by class.
 *
 * emissionWeight is 0 on every entry because no signal has produced a measured
 * CRPS improvement on the frozen filter. This is the honest state as of
 * 2026-10-14 and it is the thing to change next -- by measuring, not by
 * asserting.
 */
export const SIGNALS: readonly SignalSpec[] = [
  // ---- market -----------------------------------------------------------
  {
    id: "market.close",
    cls: "market",
    label: "Closing line (de-vigged)",
    measures: "The market's own probability, already calibrated.",
    provenance: "Next Project Steps (1).docx / ASTRA-PACK-COMBINED.docx; n=5,281 NFL 2006-2025",
    evidence: "measured-reported",
    emissionWeight: 0,
    diagnosticWeight: 1.0,
    blocker: "Not a model signal; it is the benchmark. Using it as a feature destroys CLV measurement (target leakage).",
    caveat: "The market-efficiency assumption behind CLV is itself contested (arXiv 1710.02824, 2008.01485).",
    signSensitive: true,
  },
  {
    id: "market.clv",
    cls: "market",
    label: "Closing line value",
    measures: "Whether the locked price beat the de-vigged close.",
    provenance: "Galaxy Sports Edge Research Audit (2).docx; GSE_FINAL_LAUNCH_9.20.docx",
    evidence: "contradicted",
    emissionWeight: 0,
    diagnosticWeight: 1.0,
    blocker: "Denominator contamination: system CLV 23.2% [0.212,0.253] counts MATCHED_CLOSE as non-beats; decided-only 40.8% [0.377,0.441]. Floor at -110 is 52.4%. Neither clears.",
    caveat: "ELITE's canUseClvLedger gates a client-only localStorage bet log with no path to the platform's graded picks, so those CLV figures are not platform CLV.",
  },
  {
    id: "market.devig",
    cls: "market",
    label: "De-vig (Shin / multiplicative)",
    measures: "Removes book margin to recover fair probability.",
    provenance: "gse-deep-nfl-methods-corpus-2026.md; Shin closed-root z~0.0476 at -110/-110",
    evidence: "stated-unverified",
    emissionWeight: 0,
    diagnosticWeight: 0.8,
    blocker: "Shin de-vig root flagged unverified in the corpus equation block.",
    caveat: "Sub-1 books fall back to multiplicative; the closed-root form does not apply everywhere.",
    signSensitive: true,
  },
  {
    id: "market.steam",
    cls: "market",
    label: "Steam / reverse line movement",
    measures: "Line velocity and divergence from public betting.",
    provenance: "PREDICTION_ENGINE_MASTER (2).md line 383; threshold >= 1.5pt/10min",
    evidence: "stated-unverified",
    emissionWeight: 0,
    diagnosticWeight: 0.3,
    blocker: "RETRACTED in a prior session as lookahead. Local Pinnacle snapshots cannot test it: 0 of 911 matchups appear in more than one file, so line movement is unmeasurable from that archive.",
    caveat: "RLM needs a public-bet-percentage field, which the snapshots do not carry.",
  },

  // ---- schedule ---------------------------------------------------------
  {
    id: "schedule.rest",
    cls: "schedule",
    label: "Rest differential",
    measures: "|home_rest - away_rest| / 7 as a residual-scale modulator.",
    provenance: "knm_vectorized.py; frozen filter, 2,254 scored games",
    evidence: "measured-reproduced",
    emissionWeight: 0,
    diagnosticWeight: 1.0,
    blocker: "Median sigma_mod is 13.450 and MAX is 13.450 -- rest almost never widens sigma. 1,467 of 2,254 scored games have rest = 0, so the modulator is a structural no-op on 65% of games.",
    caveat: "The beta fit wanders (-0.07 in 2017 W15 to -0.28 in 2023 W7) rather than converging; the -0.28 value sits on the grid edge.",
  },
  {
    id: "schedule.travel",
    cls: "schedule",
    label: "Travel / timezone shift",
    measures: "Distance and timezone displacement for the visiting team.",
    provenance: "GSE_HANDOFF_PACK_2026-10-10 (1).md L672-681; adj = 0.25*clip(days_rest_diff,-1,1) -0.4 we / +0.4 ew / +0.3 altitude",
    evidence: "stated-unverified",
    emissionWeight: 0,
    diagnosticWeight: 0.5,
    blocker: "17 stadiums have unresolved travel in schedule_meta; no adjustment can be computed for them without imputation, which is banned.",
    caveat: "The research brief's regression claims these are priced in by the close -- unverified.",
    signSensitive: true,
  },
  {
    id: "schedule.surface",
    cls: "schedule",
    label: "Surface / roof / indoor",
    measures: "Playing surface and enclosure.",
    provenance: "knm_keynumbers.py diagnostics; nflverse games.csv surface/roof columns",
    evidence: "measured-reproduced",
    emissionWeight: 0,
    diagnosticWeight: 0.4,
    blocker: "Adding indoor/Thursday/division on top of the hybrid scored WORSE (7.133 vs 7.129 base).",
    caveat: null,
  },

  // ---- roster -----------------------------------------------------------
  {
    id: "roster.injury.status",
    cls: "roster",
    label: "Injury report status",
    measures: "Out/Doubtful/Questionable/Probable weighted by position.",
    provenance: "situational_diagnostics.json; RIL refused on the frozen filter",
    evidence: "measured-reproduced",
    emissionWeight: 0,
    diagnosticWeight: 1.0,
    blocker: "RIL REFUSED: n scored 2,061 of 2,105 defined; without 7.159999, with 7.164178, delta +0.004179.",
    caveat: "2025-2026 injury files carry zero date_modified, so those seasons fail closed and are excluded -- 351 games omitted.",
  },
  {
    id: "roster.cvi",
    cls: "roster",
    label: "Cornerback cascade vulnerability index",
    measures: "(cascade_count/4) * (opp_deep_rate/league_avg) * backup_quality_multiplier.",
    provenance: "cvi_and_ingest_plan.md / cvi_implementation_handoff.md",
    evidence: "measured-reported",
    emissionWeight: 0,
    diagnosticWeight: 0.7,
    blocker: "CVI branch terminally REFUSED (fitted beta < 0, commit e51c4c91).",
    caveat: "Backup quality is a snap-share proxy labelled as such; pre-2025 depth charts have no observed_at and were not joined.",
  },
  {
    id: "roster.combine",
    cls: "roster",
    label: "Combine measurables + NGS scores",
    measures: "forty/vertical/broad/three-cone/shuttle/bench plus ngs_athleticism, ngs_college_production, ngs_final.",
    provenance: "combine_results.xlsx recovered from GSE 10.2.26 archive; joins via nfl_id -> gsis_id crosswalk (12,608 rows in archive.zip)",
    evidence: "measured-reported",
    emissionWeight: 0,
    diagnosticWeight: 0.6,
    blocker: "Never scored against any outcome. Draft-year population, not game rosters.",
    caveat: "Heavy NA on position-specific drills (three_cone/shuttle/bench). Position-conditional availability; do not impute.",
  },

  // ---- tracking ---------------------------------------------------------
  {
    id: "tracking.combine.drill",
    cls: "tracking",
    label: "Combine drill tracking",
    measures: "x/y/s/a/dis/dir at ~1 ms intervals during named drills.",
    provenance: "combine_tracking.xlsx recovered from GSE 10.2.26 archive; 38.9 MB, 1,852,770 cells",
    evidence: "measured-reported",
    emissionWeight: 0,
    diagnosticWeight: 0.5,
    blocker: "Coordinate frame is LOCAL TO THE DRILL (x~44, y~28), not the 120x53.3 field. Cannot join to game-frame tracking without a transform.",
    caveat: "Draft prospects, not game rosters. CC BY-NC 4.0 applies via BDB 2027.",
  },
  {
    id: "tracking.field",
    cls: "tracking",
    label: "In-game field tracking",
    measures: "22-player coordinates at 10 Hz.",
    provenance: "BDB 2027 game_tracking_2023/2024/2025.csv; 1,001 of 1,002 games, 22.6M rows",
    evidence: "measured-reported",
    emissionWeight: 0,
    diagnosticWeight: 0.6,
    blocker: "Covers 2023-2025 only. Week 5/6 of 2026 have NO public coordinate source: the BDB '2026' ids are Jan-Feb 2026 postseason, 0 shared dates with nflverse 2026 REG.",
    caveat: "CC BY-NC 4.0 (non-commercial) -- unresolved, blocks commercial use.",
  },
  {
    id: "tracking.vision.jacobian",
    cls: "tracking",
    label: "Homography Jacobian covariance propagation",
    measures: "R_field(u,v) = J(u,v) R_pixel J(u,v)^T + eps I2, eps=1e-6 m^2.",
    provenance: "Projective Geometry ... 8-DoF Hartley DLT docx; vision_fix.py",
    evidence: "measured-reported",
    emissionWeight: 0,
    diagnosticWeight: 0.6,
    blocker: "Vision weight remains 0. Jacobian bands sit inside [0.85,0.95] per zone but the aggregate 90% CI coverage is 83.65% (476/787 plays below 0.85).",
    caveat: "The point estimate is good (mean RMSE 0.0956 m) while the stated uncertainty is wrong. Do not trust the interval until coverage is fixed.",
  },

  // ---- rating -----------------------------------------------------------
  {
    id: "rating.glicko2",
    cls: "rating",
    label: "Glicko-2",
    measures: "Rating, deviation, volatility under the Illinois volatility solve.",
    provenance: "glicko2-modified-2310.ts (packages/feature-store/src/metrics, 8 tests); canonical 1464.05/151.52/0.059996; dfs/walk_forward/glicko2_ref.py",
    evidence: "measured-reproduced",
    emissionWeight: 0,
    diagnosticWeight: 0.8,
    blocker: "TWO defects measured in the shipped TS port, and ZERO importers outside its own test. (1) SEASON-START DEVIATES FROM PAPER: it returns phi' = sqrt(phi^2 + priorPhi^2) -- raw quadrature, uncapped. The paper's idle rule is phi' = sqrt(phi^2 + sigma^2), i.e. it must add the VOLATILITY sigma, and the archived reference applies the same formula capped by scale. Adding priorPhi instead silently changes what the term means. (2) NO IDLE-BY-GAME-LIST: the port only has season-start and per-game updates, so a bye is not represented at all; glicko2_parallel(r, rd, sigma, []) in the python path raises ZeroDivisionError at v = 1.0/sum(...).",
    caveat: "The corpus claims 'Task 1 (idle step wired): DONE in commit 744d89fb1', but the very next commit (e1ef31280) says 'Idle not wired' -- and grep confirms no importer exists today. The idle rule itself reproduces exactly (RD 200 -> 200.27 / 201.08 / 204.57) but that is the python reference, not the shipped TS.",
  },
  {
    id: "rating.elo",
    cls: "rating",
    label: "Elo / Bradley-Terry",
    measures: "P = 1/(1+10^((rb-ra)/400)) with MLE and Zermelo iteration.",
    provenance: "Mathematical Verification ... docx; Formal Verification ... docx",
    evidence: "stated-unverified",
    emissionWeight: 0,
    diagnosticWeight: 0.5,
    blocker: "Never scored on the frozen filter. Soft-Elo MAE 45.9->17.9 was KILLED pending ledger 0540.",
    caveat: "Sequential updates are not canonical Glicko-2.",
  },
  {
    id: "rating.rapm",
    cls: "rating",
    label: "Regularized adjusted plus-minus",
    measures: "Player contribution controlling for teammates and opponents.",
    provenance: "METRIC_UNIVERSE.md",
    evidence: "stated-unverified",
    emissionWeight: 0,
    diagnosticWeight: 0.3,
    blocker: "No implementation exists ('implementation: none' per METRIC_UNIVERSE).",
    caveat: null,
  },

  // ---- form -------------------------------------------------------------
  {
    id: "form.epa",
    cls: "form",
    label: "EPA and efficiency residuals",
    measures: "Expected points added, pass/rush split, CPOE, explosive rate.",
    provenance: "NFL_EPA_MIN_GAMES=4; GSE_FINAL_LAUNCH_9.20.docx; SCALE_CONSTANT=45.42, HFA_POINTS=2.10",
    evidence: "contradicted",
    emissionWeight: 0,
    diagnosticWeight: 0.8,
    blocker: "HFA has THREE conflicting values across the corpus: 2.10, 2.178 (fitted on 1,187 games), and 1.56 [1.54,1.59]. No single source of truth.",
    caveat: "Sack rate, pressure-to-sack, pace and explosive rate were all fit and applied on top of 7.129 -- NONE improved it.",
    signSensitive: true,
  },
  {
    id: "form.winprob",
    cls: "form",
    label: "In-game win probability",
    measures: "WP from score, time, field position, down, distance.",
    provenance: "Mathematical Verification docx; EP = sum v_k P(NextScore=k), v=(7,3,2,0,-2,-3,-7)",
    evidence: "stated-unverified",
    emissionWeight: 0,
    diagnosticWeight: 0.5,
    blocker: "nflfastR/Baldwin show adding the pre-game spread cuts log loss 0.52 -> 0.44 and error 27% -> 23%, but that destroys CLV measurement. Unresolved and load-bearing.",
    caveat: null,
    signSensitive: true,
  },

  // ---- situational ------------------------------------------------------
  {
    id: "situational.referee",
    cls: "situational",
    label: "Referee empirical-Bayes shrinkage",
    measures: "post_r = w_r (mean_r - grand), w_r = signal_var/(signal_var + sd_game^2/n_r).",
    provenance: "GSE_HANDOFF_PACK_2026-10-10 (1).md L4137-4182",
    evidence: "stated-unverified",
    emissionWeight: 0,
    diagnosticWeight: 0.4,
    blocker: "Never scored. Requires a per-referee game count that is not in the frozen filter.",
    caveat: "signal_var = max(var_between - se2, 0) collapses to 0 when between-ref variance is within sampling noise.",
  },
  {
    id: "situational.weather",
    cls: "situational",
    label: "Weather (wind, precipitation)",
    measures: "Wind -0.197 pts/mph; rain -1.5; snow -2.5.",
    provenance: "Completeness audit v7 docx; n=2,472 for the wind slope",
    evidence: "measured-reported",
    emissionWeight: 0,
    diagnosticWeight: 0.4,
    blocker: "Weather/failover remains diagnostic only and does not enter the scoring path.",
    caveat: "Historical pre-kickoff weather was not pulled under model-run timestamps, so it is a permanent PIT exclusion.",
  },
  {
    id: "situational.coaching",
    cls: "situational",
    label: "Coaching tendencies and scheme",
    measures: "Coach offence/defence tendency tables, PROE, red-zone mix.",
    provenance: "coaching/data (adjustments.csv, coach_offense.csv, coach_defense.csv, pass_rate_cells.csv, rz_mix.csv, proe_early_neutral.csv)",
    evidence: "stated-unverified",
    emissionWeight: 0,
    diagnosticWeight: 0.5,
    blocker: "Present as data, never scored against margin on the frozen filter.",
    caveat: "The Monken profile template exists once; it was never multiplied across 32 teams.",
  },

  {
    id: "situational.context.effects",
    cls: "situational",
    label: "Measured context effects vs close",
    measures: "Travel +0.0004/mi (t=2.14) or +0.4pts/1000mi; post-bye road teams -2.33 pts (t=-2.54); altitude beta -0.25/kft (n.s.); rest/tz/short-week not significant.",
    provenance: "data/context_engine.py and data/slate_context2.py, cited in ASTRA-PACK-COMBINED.docx",
    evidence: "stated-unverified",
    emissionWeight: 0,
    diagnosticWeight: 0.7,
    blocker: "Reported as edges vs EARLY lines only, not the close. Not reproduced on the frozen 2,462-game filter.",
    caveat: "'Rust, not rest' -- the post-bye effect is road-only and the mechanism is attributed to rust, so it must not be folded into the rest feature.",
    signSensitive: true,
  },
  {
    id: "situational.fatigue",
    cls: "situational",
    label: "Fatigue / half-time splits",
    measures: "EPL 2H/1H fatigue ratio 1.224 (p=6.9e-14); heat index + altitude physics + circadian equations.",
    provenance: "data/fatigue_efficiency.py, cited in the Completeness audit v7 docx",
    evidence: "stated-unverified",
    emissionWeight: 0,
    diagnosticWeight: 0.4,
    blocker: "The ratio is measured on EPL (soccer), NOT NFL. Unported and unvalidated on football.",
    caveat: "The corpus itself labels this 'real edge in total splits' for soccer only. Carrying it into an NFL margin model would be an unjustified transfer.",
  },
  {
    id: "roster.ril.definition",
    cls: "roster",
    label: "RIL feature definition (as specified)",
    measures: "RIL = rest_deficit x SUM(status_weight x position_weight x prior_3w_snap_share).",
    provenance: "ASTRA-PACK-COMBINED.docx, explicit formula line",
    evidence: "measured-reproduced",
    emissionWeight: 0,
    diagnosticWeight: 0.9,
    blocker: "The DEFINITION is now pinned, but scoring it was REFUSED: n scored 2,061 of 2,105; without 7.159999, with 7.164178, delta +0.004179.",
    caveat: "Knowing the formula does not make it predictive. The refusal stands; this entry exists so the equation is not lost.",
  },
  {
    id: "roster.ctf.definition",
    cls: "roster",
    label: "CTF feature definition (as specified)",
    measures: "CTF = tz_diff_hours x ln(1 + travel_miles) x (1 if short rest else 0.5).",
    provenance: "ASTRA-PACK-COMBINED.docx, explicit formula line",
    evidence: "measured-reproduced",
    emissionWeight: 0,
    diagnosticWeight: 0.9,
    blocker: "Definition pinned; scoring REFUSED with delta +0.000912 (without 7.058731, with 7.059643, n=1,690 of 1,723).",
    caveat: "The 0.5 factor on non-short rest is an arbitrary constant with no fitted support.",
  },
  {
    id: "situational.postbye",
    cls: "situational",
    label: "Post-bye indicator (rest >= 12)",
    measures: "Binary flag when a team's rest reaches 12+ days; road post-bye teams -2.33 pts vs close.",
    provenance: "data/slate_context2.py; pb_h = 1 if hrest >= 12 else 0",
    evidence: "stated-unverified",
    emissionWeight: 0,
    diagnosticWeight: 0.6,
    blocker: "Not scored on the frozen filter. The rest modulator itself is inert (median sigma_mod = max = 13.450).",
    caveat: "Distinct from the rest feature: this is a threshold flag, not a continuous modulator.",
  },
  {
    id: "integrity.leafdrift",
    cls: "integrity",
    label: "Leaf drift monitor",
    measures: "Favourite-strength leaf 6.5-9.5 drifts 65.86% train -> 57.12% test (n=576, ~3.6 SE).",
    provenance: "ASTRA-PACK-COMBINED.docx leaf drift FLAG",
    evidence: "stated-unverified",
    emissionWeight: 0,
    diagnosticWeight: 0.7,
    blocker: "Flagged but not gated. ~3.6 SE on the train/test gap is a real distribution shift.",
    caveat: "This is the kind of drift that invalidates a backtest without changing any single number.",
  },
  {
    id: "integrity.signal.registry.census",
    cls: "integrity",
    label: "Signal registry census",
    measures: "47 signals: yes=0, no=46, partial=1 (nfl_age_conditioned_rest). Trust weights of 1.0 are priors.",
    provenance: "Corpus registry line: 'Registry: 47 signals, yes=0, no=46, partial=1'",
    evidence: "stated-unverified",
    emissionWeight: 0,
    diagnosticWeight: 0.8,
    blocker: "An earlier census counted 47 signals with 0 wired. This session's registry now registers 38 with explicit weights; the two counts use different criteria and are not yet reconciled.",
    caveat: "'Trust weights of 1.0 are priors' -- a weight of 1.0 there is a starting belief, not a measured confidence. Do not confuse the two scales.",
  },

  {
    id: "distributional.conformal.pid",
    cls: "distributional",
    label: "Conformal PID control (drift fallback)",
    measures: "Online quantile tracking: the controller adjusts the miscoverage level each step so coverage holds under distribution shift, with NO exchangeability assumption.",
    provenance: "repo-intel/models/aangelopoulos-conformal-time-series.md recovered from the 2 GB GSE 10.2.26 archive; companion to arXiv 2307.16895 (MIT)",
    evidence: "stated-unverified",
    emissionWeight: 0,
    diagnosticWeight: 0.8,
    blocker: "Research code, not a package. The corpus's own verdict is 'REBUILD -- implement the PID/quantile-tracking controller as the drift-fallback for live signals; do not wire the research code directly.'",
    caveat: "This is the specific remediation for the leaf-drift defect (favourite leaf 6.5-9.5 drifts 65.86% train -> 57.12% test, n=576, ~3.6 SE): a static conformal level cannot hold under that shift, but PID quantile tracking can. It is NOT a fix for the small-N rank deficit, which is a different failure.",
  },

  {
    id: "distributional.drive.outcome",
    cls: "distributional",
    label: "Drive outcome distribution (SHADOW, unmerged)",
    measures: "Outcome shares over 10 buckets (TD, FG, MISSED_FG, PUNT, TURNOVER, TURNOVER_ON_DOWNS, SAFETY, END_OF_HALF, END_OF_GAME, OTHER), reconciled to points per drive. MIN_DRIVES_TO_REPORT = 10.",
    provenance: "packages/prediction-engine/src/expected-metrics/drive-outcome-distribution.ts on branch origin/jules/q11-drive-outcome-recovery-2026-10-14 (251 lines + 188-line test, vitest 8/8 green, tsc exit 0). Never merged to main.",
    evidence: "measured-reported",
    emissionWeight: 0,
    diagnosticWeight: 0.6,
    blocker: "SHADOW and unmerged -- nothing on main imports it. It is a CATEGORICAL distribution over drive outcomes, not a margin distribution, so it cannot be scored against home margin / CRPS directly.",
    caveat: "A game-script / scoring-efficiency signal, not a replacement for the margin distribution. Its branch note explicitly states 'SHADOW status unchanged; no scoring, no gate, no MODEL_VERSION change'. TD buckets include trailing PAT/2PT because Drive.points is the whole drive.",
  },

  // ---- distributional ---------------------------------------------------
  {
    id: "distributional.keynumbers",
    cls: "distributional",
    label: "Key-number atoms",
    measures: "Discrete mass at |margin| = 3, 7 (and tested 6, 10).",
    provenance: "knm_keynumbers.py; 7 candidate atom sets scored on the frozen filter",
    evidence: "measured-reproduced",
    emissionWeight: 0,
    diagnosticWeight: 1.0,
    blocker: "Best set is {3,6,7} at CRPS 7.109543 (n=2,399); current {3,7} is 7.109809. Gain over current is 0.000266 -- noise level. The corpus's {3,6,7,10} is WORSE at 7.118668.",
    caveat: "Observed |margin| frequencies: 3=0.1466, 7=0.0833, 6=0.0666, 10=0.0496 against a ~0.044 baseline. All four are genuine spikes; adding the extra two still dilutes the score.",
  },
  {
    id: "distributional.mixture",
    cls: "distributional",
    label: "Two-normal mixture",
    measures: "0.20 N(mu,6.5) + 0.80 N(mu,14).",
    provenance: "filter_contract_2026-10-14.json; CRPS 7.138654, -0.015367 vs Gaussian",
    evidence: "measured-reproduced",
    emissionWeight: 0,
    diagnosticWeight: 0.9,
    blocker: "Best continuous family measured, but still 0.039654 above the 7.099 gate.",
    caveat: "Mu locked on every component; no mean shift is fitted.",
  },
  {
    id: "distributional.restscale",
    cls: "distributional",
    label: "Rest-modulated scale",
    measures: "sigma = 13.45 * exp(clip(beta*rest, -0.45, 0.45)).",
    provenance: "knm_vectorized.py; beta grid linspace(-0.28, 0, 121), step 0.00233",
    evidence: "measured-reproduced",
    emissionWeight: 0,
    diagnosticWeight: 0.7,
    blocker: "Median and MAX sigma_mod are both 13.450 -- the modulator is inert on most games (1,467 of 2,254 have rest = 0).",
    caveat: "121 points chosen because the CRPS surface is smooth and the discrete argmin is stable; going to 201 doubles cost with no measured gain.",
  },
  {
    id: "distributional.conformal",
    cls: "distributional",
    label: "Conformal calibration wrapper",
    measures: "Distribution-free coverage guarantee via rank quantile.",
    provenance: "Auditing Conformal Prediction ... docx; CONFORMAL_SMALL_N constant",
    evidence: "measured-reproduced",
    emissionWeight: 0,
    diagnosticWeight: 0.9,
    blocker: "15 of 25 calibration modules are test-only and never shipped, including temporal-conformal, weighted-conformal-shift and venn-width-harness.",
    caveat: "Small-N law: n=5 alpha=0.10 gives k=6 > n -> infinite or No-Bet. Bootstrap resampling does NOT fix this.",
  },

  // ---- integrity --------------------------------------------------------
  {
    id: "integrity.emission.gate",
    cls: "integrity",
    label: "Walk-forward emission gate",
    measures: "readWalkForwardGate rejects 7 branches; passed must be strictly true.",
    provenance: "packages/ingestion-pipeline/src/walk-forward-gate.ts; gate_probe.mjs",
    evidence: "measured-reproduced",
    emissionWeight: 0,
    diagnosticWeight: 1.0,
    blocker: "passed=false. All 7 branches return open=false: missing, unreadable, unparseable, no_generated_at, stale (>168h), not_passed, and passed='true' (string, correctly rejected).",
    caveat: "The gate check sits at generate-signal-slate.ts:269 BEFORE any db access, so buildIndependentFairValues (565) and the pick writes (946,960) are unreachable while closed.",
  },
  {
    id: "integrity.brier.floor",
    cls: "integrity",
    label: "Brier publishability floor",
    measures: "Brier <= 0.22 required to publish.",
    provenance: "ASTRA-PACK-COMBINED.docx; GATE_DEFECTS constant",
    evidence: "measured-reported",
    emissionWeight: 0,
    diagnosticWeight: 1.0,
    blocker: "NON-BINDING. At base rate 0.69 a zero-skill constant forecast scores 0.2139 < 0.22, so the floor is passed by a model with no predictive power.",
    caveat: "Replace with Brier Skill Score vs base rate, gated on the DEPLOYED version not the pooled sample.",
  },
  {
    id: "integrity.ece.deployed",
    cls: "integrity",
    label: "Deployed-version ECE",
    measures: "Expected calibration error of the version actually serving traffic.",
    provenance: "ASTRA-PACK-COMBINED.docx",
    evidence: "measured-reported",
    emissionWeight: 0,
    diagnosticWeight: 1.0,
    blocker: "v5.2.7 ECE 0.1089 vs floor 0.05 -- the deployed version FAILS while the pooled sample clears.",
    caveat: "Aggregating across versions hides the deployed regression.",
  },
  {
    id: "integrity.vision.coverage",
    cls: "integrity",
    label: "Vision interval coverage",
    measures: "Empirical coverage of the stated 90% CI.",
    provenance: "Measurement-First Engineering Roadmap docx; 787 plays / 1,181,625 frames",
    evidence: "measured-reported",
    emissionWeight: 0,
    diagnosticWeight: 1.0,
    blocker: "Coverage 83.65%, outside [0.85,0.95]: 476/787 plays below 0.85, 31/787 above 0.95.",
    caveat: "Mean RMSE 0.0956 m (median 0.0972, range 0.0681-0.1246) looks healthy. The point estimate is fine; the interval is not.",
  },
  {
    id: "integrity.snapshot.auth",
    cls: "integrity",
    label: "Snapshot auth-failure detection",
    measures: "Rejects market records that are HTTP error bodies rather than data.",
    provenance: "clv_snapshot_diagnostic.json; pinnacle_mkt_1637432960/1637435175/1637435176.json",
    evidence: "measured-reproduced",
    emissionWeight: 0,
    diagnosticWeight: 1.0,
    blocker: "3 of 17 snapshot files are 119-byte HTTP 401 bodies ({\"detail\":\"No authorization token provided\",\"status\":401,\"type\":\"about:blank\"}) saved into the snapshot dir as though they were market data.",
    caveat: "Any loader that does not check status silently treats them as empty boards and drags averages toward zero.",
  },
];

// ---------------------------------------------------------------- accessors

export function signalsByClass(cls: SignalClass): readonly SignalSpec[] {
  return SIGNALS.filter((s) => s.cls === cls);
}

export function signalsWithEmissionWeight(): readonly SignalSpec[] {
  return SIGNALS.filter((s) => s.emissionWeight > 0);
}

export function signSensitiveSignals(): readonly SignalSpec[] {
  return SIGNALS.filter((s) => s.signSensitive === true);
}

/** Total emission weight. 0 today, by measurement, not by choice. */
export function totalEmissionWeight(): number {
  return SIGNALS.reduce((a, s) => a + s.emissionWeight, 0);
}

/**
 * The reasoning trace. Every signal appears -- nothing is killed, nothing is
 * deferred -- with its weight, its evidence strength, its blocker and its
 * caveat. A signal at weight 0 is still visible and still explained.
 */
export interface ReasoningStep {
  readonly signalId: string;
  readonly label: string;
  readonly cls: SignalClass;
  readonly emissionWeight: number;
  readonly diagnosticWeight: number;
  readonly evidence: EvidenceStrength;
  readonly verdict: "emitting" | "diagnostic-only" | "blocked";
  readonly because: string;
}

export function buildReasoningTrace(): readonly ReasoningStep[] {
  return SIGNALS.map((s) => ({
    signalId: s.id,
    label: s.label,
    cls: s.cls,
    emissionWeight: s.emissionWeight,
    diagnosticWeight: s.diagnosticWeight,
    evidence: s.evidence,
    verdict: s.emissionWeight > 0 ? "emitting" : s.blocker ? "blocked" : "diagnostic-only",
    because: s.blocker ?? "No measured CRPS improvement on the frozen filter yet.",
  }));
}

/**
 * Gate the emission path against the registry. Returns the 0-object unless at
 * least one signal has cleared the measured bar. This is the same fail-closed
 * discipline as readWalkForwardGate: absence of proof is refusal, not silence.
 */
export interface EmissionDecision {
  readonly emit: boolean;
  readonly picks: number;
  readonly parlays: number;
  readonly dfs: number;
  readonly note: string;
  readonly trace: readonly ReasoningStep[];
}

export function decideEmission(): EmissionDecision {
  const trace = buildReasoningTrace();
  const emitting = SIGNALS.filter((s) => s.emissionWeight > 0);
  if (emitting.length === 0) {
    return {
      emit: false,
      picks: 0,
      parlays: 0,
      dfs: 0,
      note: "0 picks, 0 parlays, 0 DFS -- no signal has a measured CRPS improvement on the frozen 2,462-game filter",
      trace,
    };
  }
  return {
    emit: false,
    picks: 0,
    parlays: 0,
    dfs: 0,
    note: `0 picks, 0 parlays, 0 DFS -- ${emitting.length} signal(s) carry weight but walk_forward.json still has passed=false`,
    trace,
  };
}

/** Provenance guard: an entry with no provenance is a construction error. */
export function assertProvenance(spec: SignalSpec): void {
  if (!spec.provenance || spec.provenance.trim().length === 0) {
    throw new Error(`signal ${spec.id} has no provenance -- rejected`);
  }
}

/** Sign guard: any sign-sensitive signal must declare the nflverse convention. */
export function assertSignConvention(spec: SignalSpec): void {
  if (spec.signSensitive && FROZEN_FILTER.muSign !== "+1") {
    throw new Error(
      `signal ${spec.id} is sign-sensitive but muSign is ${FROZEN_FILTER.muSign}; ` +
      `nflverse requires mu = +spread_line (flip costs ${FROZEN_FILTER.flipCostCrps} CRPS)`,
    );
  }
}

/** Validate the whole registry at module load. */
export function validateRegistry(): readonly string[] {
  const problems: string[] = [];
  for (const s of SIGNALS) {
    try {
      assertProvenance(s);
    } catch (e) {
      problems.push((e as Error).message);
    }
    try {
      assertSignConvention(s);
    } catch (e) {
      problems.push((e as Error).message);
    }
    if (s.emissionWeight < 0 || s.emissionWeight > 1) {
      problems.push(`${s.id}: emissionWeight ${s.emissionWeight} outside [0,1]`);
    }
    if (s.diagnosticWeight < 0 || s.diagnosticWeight > 1) {
      problems.push(`${s.id}: diagnosticWeight ${s.diagnosticWeight} outside [0,1]`);
    }
  }
  return problems;
}
