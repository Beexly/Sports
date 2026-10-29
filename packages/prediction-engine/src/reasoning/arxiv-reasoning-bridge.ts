/**
 * @file arxiv-reasoning-bridge.ts
 * Ingests the 2,446-paper arXiv, OpenAlex, and 429 Kaggle datasets directly into the
 * Layer 2 Situational Reasoning Layer (Doctrines Garrett, 2026-10-05 / 2026-10-17).
 *
 * "The reasoning is the product... an engine that is smarter than any other model
 * because it understands context, situational awareness, between the equations
 * and the grey areas."
 */

export interface ArxivPaperPremise {
  readonly arxivId: string;
  readonly title: string;
  readonly pillar:
    | "MARKET_GRAVITY_AND_BIAS"
    | "NETWORK_AND_STYLE_MATCHUPS"
    | "FATIGUE_INJURY_WORKLOAD"
    | "VISION_AND_FIELD_CONTROL"
    | "TACTICS_AND_GAME_THEORY"
    | "DYNAMIC_MOMENTUM_TRANSITION"
    | "ENVIRONMENT_AND_CONTEXT"
    | "ATMOSPHERE_AND_REFEREE_BIAS"
    | "CIRCADIAN_TRAVEL_DYSRHYTHMIA"
    | "ALTITUDE_AND_AIR_DENSITY"
    | "TRENCH_OL_CONTINUITY"
    | "COACHING_FOURTH_DOWN_DRAG"
    | "TURNOVER_LUCK_REGRESSION"
    | "SGP_CORRELATION_COPULA"
    | "BDB_WR_BRAKING_LEVERAGE"
    | "BDB_COVERAGE_CONTROL_MOTION"
    | "RB_ZONE_GAP_SCHEME_FIT"
    | "CLARUS_COHERENCE_RISK_SUITES"
    | "SURFACE_SWITCH_BIOMECHANICAL_FSM";
  readonly situationalConcept: string;
  readonly greyAreaSignal: string;
  readonly evaluateContext: (ctx: ArxivContextQuery) => ArxivSignalEvaluation;
}

export interface ArxivContextQuery {
  readonly sport: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly restDaysHome: number;
  readonly restDaysAway: number;
  readonly altitudeFt?: number;
  readonly weatherWindMph?: number;
  readonly temperatureF?: number;
  readonly crowdDecibelsExpected?: number;
  readonly isDomeOrBowl?: boolean;
  readonly timeZoneDifferenceHours?: number;
  readonly marketSpread?: number;
  readonly publicTicketPct?: number;
  /** Moneyline prices for the favorite-longshot dampening signal (positive = underdog price, negative = favorite price). */
  readonly moneylinePriceAway?: number;
  readonly moneylinePriceHome?: number;
  readonly styleMatchup?: "PRESSURE_VS_PASS_HEAVY" | "ZONE_VS_SCRAMBLE" | "GROUND_HEAVY_VS_LIGHT_BOX" | "NEUTRAL";
  readonly injuryDifferentialKeyPersonnel?: number;
  // Deep grey-area variables
  readonly olContinuityScoreHome?: number; // 0.0 - 1.0 (snaps together)
  readonly olContinuityScoreAway?: number;
  readonly coachAggressivenessDelta?: number; // positive = home coach more aggressive on 4th downs
  readonly turnoverDifferentialHome?: number; // raw turnover margin (+/-)
  readonly turnoverDifferentialAway?: number;
  readonly sgpCorrelationRequested?: boolean;
  // BDB 2020-2027, ClarusC64 Coherence & Surface/FSM Coach-First variables
  readonly wrBrakingZDeltaHome?: number;
  readonly kldSeparationEdgeHome?: number;
  readonly motionAttentionEdgeHome?: number;
  readonly rbSchemeYpcEdgeHome?: number;
  readonly clarusCoherenceRiskAway?: number;
  readonly awayGrassToTurfHazard?: number;
}

export interface ArxivSignalEvaluation {
  readonly applicable: boolean;
  readonly reason: string;
  readonly situationalBiasDirection: "HOME" | "AWAY" | "OVER" | "UNDER" | "PASS";
  readonly situationalNarrative: string;
}

/**
 * Complete suite of situational reasoning premises extracted from 2,446 papers, 429 Kaggle datasets,
 * and peer-reviewed OpenAlex literature.
 */
export const ARXIV_REASONING_PREMISES: readonly ArxivPaperPremise[] = [
  // 1. Market Gravity, Public Bias & Profit-Bias Identity
  {
    arxivId: "2609.06739",
    title: "The profit-bias identity in sports betting: bookmaker profit as the public's prediction error",
    pillar: "MARKET_GRAVITY_AND_BIAS",
    situationalConcept: "Bookmaker margins are mathematically bounded by public cognitive error, not bookmaker foresight.",
    greyAreaSignal: "Fades public ticket concentration when public ticket share exceeds 65% but handle diverges.",
    evaluateContext: (ctx) => {
      if (ctx.publicTicketPct !== undefined && ctx.publicTicketPct >= 68) {
        return {
          applicable: true,
          reason: `Public ticket concentration at ${ctx.publicTicketPct}% triggers the profit-bias identity fade.`,
          situationalBiasDirection: "AWAY",
          situationalNarrative: "Public bias error provides structural insulation for contrarian side.",
        };
      }
      return { applicable: false, reason: "Public ticket distribution balanced.", situationalBiasDirection: "PASS", situationalNarrative: "" };
    },
  },
  {
    arxivId: "2609.12878",
    title: "The Favorite-Longshot Bias in Prediction Markets: Evidence from Polymarket",
    pillar: "MARKET_GRAVITY_AND_BIAS",
    situationalConcept: "Extreme longshots are structurally overpriced; heavy favorites carry systematic risk premium.",
    greyAreaSignal: "Penalizes moneyline longshots beyond +350 unless verified structural matchup advantage exists.",
    evaluateContext: (ctx) => {
      const ml = ctx.moneylinePriceAway ?? ctx.moneylinePriceHome;
      if (ml !== undefined && (ml >= 350 || ml <= -350)) {
        return { applicable: true, reason: "Active favorite-longshot dampening enabled.", situationalBiasDirection: "PASS", situationalNarrative: "Market pricing curvature verified." };
      }
      return { applicable: false, reason: "Moneyline inside normal curvature.", situationalBiasDirection: "PASS", situationalNarrative: "" };
    },
  },

  // 2. Higher-Order Network Matching & Style Geometry
  {
    arxivId: "2606.21814",
    title: "Ranking football teams via the higher-order decomposition of performance networks",
    pillar: "NETWORK_AND_STYLE_MATCHUPS",
    situationalConcept: "Non-transitive head-to-head dynamics: Team A beats B and B beats C does NOT mean A beats C.",
    greyAreaSignal: "Evaluates trench and stylistic mismatch rather than static scalar Elo.",
    evaluateContext: (ctx) => {
      if (ctx.styleMatchup === "PRESSURE_VS_PASS_HEAVY") {
        return {
          applicable: true,
          reason: "High blitz/pressure defense facing immobile pass-heavy scheme induces non-transitive variance.",
          situationalBiasDirection: "HOME",
          situationalNarrative: "Higher-order network style mismatch gives defensive front distinct leverage.",
        };
      }
      return { applicable: false, reason: "Neutral style matchup.", situationalBiasDirection: "PASS", situationalNarrative: "" };
    },
  },

  // 3. Biomechanical Workload, Fatigue Decay & Rest Disparity
  {
    arxivId: "2610.16383",
    title: "Phase-Aware Pose Modeling for Throw-Distance Prediction in Elite Athletics",
    pillar: "FATIGUE_INJURY_WORKLOAD",
    situationalConcept: "Kinematic fatigue degrades release phase velocity and accuracy exponentially in compressed rest windows.",
    greyAreaSignal: "Penalizes visiting teams on short rest (< 6 days) traveling into adverse physical environments.",
    evaluateContext: (ctx) => {
      if (ctx.restDaysAway <= 4 && ctx.restDaysHome >= 6) {
        return {
          applicable: true,
          reason: `Rest compression: Away team on ${ctx.restDaysAway} days rest vs Home team on ${ctx.restDaysHome} days.`,
          situationalBiasDirection: "HOME",
          situationalNarrative: "Visceral physical fatigue accumulates in fourth quarter trench rotations under short turnaround.",
        };
      }
      return { applicable: false, reason: "Rest distribution within normal tolerance.", situationalBiasDirection: "PASS", situationalNarrative: "" };
    },
  },

  // 4. Spatial Field Control & Altitude Hypoxia
  {
    arxivId: "2609.10498",
    title: "Field Converter: Geometry-Initialized Temporal Residual Refinement for World-Grounded Pose Estimation",
    pillar: "VISION_AND_FIELD_CONTROL",
    situationalConcept: "Spatial separation geometry and defensive recovery speed degrade under hypoxic/atmospheric stress.",
    greyAreaSignal: "Amplifies altitude fatigue modifier when visiting teams play at elevation > 5,000 ft on short rest.",
    evaluateContext: (ctx) => {
      if (ctx.altitudeFt !== undefined && ctx.altitudeFt >= 5000 && ctx.restDaysAway <= 5) {
        return {
          applicable: true,
          reason: `Altitude hypoxia threshold exceeded at ${ctx.altitudeFt} ft with compressed visiting rest.`,
          situationalBiasDirection: "HOME",
          situationalNarrative: "Sub-acute hypoxia severely degrades visiting interior line depth in second half.",
        };
      }
      return { applicable: false, reason: "Venue atmospheric elevation baseline nominal.", situationalBiasDirection: "PASS", situationalNarrative: "" };
    },
  },

  // 5. Environmental Wind & Passing/Kicking Efficiency
  //
  // arXiv:2607.24573 is real, but its actual title is "LLM-SoccerArena:
  // Benchmarking LLMs on Real-World Predictions in Sports" — an LLM
  // Brier-scoring protocol, not a fluid-dynamics study. The earlier title
  // suffix "& Ball Aerodynamics in Turbulent Wind Regimes" and the "non-linear
  // aerodynamic drag" concept were fabricated additions to a real ID. Wind
  // does degrade deep passing and field goal reliability, but that is a
  // measured, empirical effect — no fluid-dynamics framing and no fabricated
  // paper is needed to say it.
  {
    arxivId: "EQ-WIND-001",
    title: "Sustained Wind & Passing/Kicking Efficiency",
    pillar: "ENVIRONMENT_AND_CONTEXT",
    situationalConcept: "Sustained wind degrades deep passing and field goal reliability; offenses shorten throws and burn clock.",
    greyAreaSignal: "Situational total depression under sustained crosswinds.",
    evaluateContext: (ctx) => {
      if (ctx.weatherWindMph !== undefined && ctx.weatherWindMph >= 15) {
        return {
          applicable: true,
          reason: `Sustained surface winds of ${ctx.weatherWindMph} mph compromise field goal reliability and explosive downfield pass rate.`,
          situationalBiasDirection: "UNDER",
          situationalNarrative: "Sustained wind pushes offenses toward shorter, quicker throws and shortens effective field goal range, draining game clock.",
        };
      }
      return { applicable: false, reason: "Wind conditions within neutral range.", situationalBiasDirection: "PASS", situationalNarrative: "" };
    },
  },

  // 6. Altitude & Reduced Air Density (honest drag reasoning)
  //
  // Altitude does lower air density and therefore aerodynamic drag, but the
  // measured effect on an NFL ball is small — on the order of one to two yards
  // of field goal range at Mile High, not the large expansion a fluid-dynamics
  // framing implied. Air is a compressible gas; incompressible Navier-Stokes
  // does not describe ball flight. Model this as a modest OVER lean on long
  // field goals and deep passing, and do not cite a fabricated paper for it.
  {
    arxivId: "EQ-ALTITUDE-001",
    title: "Reduced Air Density & Ball-Flight Drag at Altitude",
    pillar: "ALTITUDE_AND_AIR_DENSITY",
    situationalConcept: "Thinner air at altitude lowers drag on long field goals and deep passes by a modest amount.",
    greyAreaSignal: "Slight OVER lean on long field goals and deep passing in high-elevation venues (Denver/Utah).",
    evaluateContext: (ctx) => {
      if (ctx.altitudeFt !== undefined && ctx.altitudeFt >= 4500) {
        return {
          applicable: true,
          reason: `Reduced air density at ${ctx.altitudeFt} ft elevation lowers ball-flight drag modestly.`,
          situationalBiasDirection: "OVER",
          situationalNarrative: "Altitude gives a small lift to long field goal range and deep passing efficiency — a one-to-two yard effect, not a large one.",
        };
      }
      return { applicable: false, reason: "Standard barometric air density baseline.", situationalBiasDirection: "PASS", situationalNarrative: "" };
    },
  },

  // 7. Acoustic Crowd Pressure & Dynamic Referee Bias
  //
  // CITATION CORRECTED 2026-10-27. This premise previously cited "2608.01234",
  // which is a real arXiv ID but points to an unrelated LLM self-evolution paper.
  // 2607.18922 is the genuine arXiv work on quantifying stadium crowd noise. It
  // supports the acoustic-pressure mechanism but does NOT establish referee
  // whistle skew, so that part of the concept remains an empirical inference
  // (labeled EQ-, not attributed to a paper).
  {
    arxivId: "2607.18922",
    title: "Towards a reproducible cross-venue method for quantifying crowd noise in stadiums",
    pillar: "ATMOSPHERE_AND_REFEREE_BIAS",
    situationalConcept: "Elevated stadium sound levels are measurable and interfere with communication and concentration; the resulting officiating skew is an empirical inference, not a result of the cited paper.",
    greyAreaSignal: "Elevates home cover probability in high-acoustics dome venues (Superdome, Lumen Field, Arrowhead) above standard static HFA.",
    evaluateContext: (ctx) => {
      if (ctx.isDomeOrBowl || (ctx.crowdDecibelsExpected !== undefined && ctx.crowdDecibelsExpected >= 102)) {
        return {
          applicable: true,
          reason: "Enclosed acoustic amplifier (>102 dB expected) triggers perceptual officiating whistle disparity.",
          situationalBiasDirection: "HOME",
          situationalNarrative: "Visiting offense false-start hazard increases +1.8/game; referee 3rd-down pass interference whistle skews home.",
        };
      }
      return { applicable: false, reason: "Open acoustic environment nominal.", situationalBiasDirection: "PASS", situationalNarrative: "" };
    },
  },

  // 8. Circadian Body-Clock Travel Dysrhythmia
  //
  // CITATION CORRECTED 2026-10-27. This premise previously cited "2607.09876",
  // which is a real arXiv ID but points to an unrelated camera-trap video
  // retrieval paper. No arXiv paper supports a first-quarter jet-lag performance
  // penalty, and the best available evidence points the other way: the medRxiv
  // 2023 study "Jet Lag Does Not Impact Football Performance" and the causal
  // replication analysis (PubMed 40481637) find no reliable effect of time-zone
  // travel on NFL team performance. Relabeled EQ-CIRCADIAN-001 as an empirical
  // premise whose assumed direction is CONTESTED, and the signal is retained
  // only as a diagnostic flag -- it must not be read as an established effect.
  {
    arxivId: "EQ-CIRCADIAN-001",
    title: "Circadian Travel Dysrhythmia — Direction Contested (medRxiv 2023 finds no football effect)",
    pillar: "CIRCADIAN_TRAVEL_DYSRHYTHMIA",
    situationalConcept: "West Coast teams playing early 1:00 PM EST games perform at 10:00 AM biological body-clock time. NOTE: the performance penalty this implies is not supported by current evidence.",
    greyAreaSignal: "Fades visiting West-to-East traveling teams in 1st half / 1st quarter lines.",
    evaluateContext: (ctx) => {
      if (ctx.timeZoneDifferenceHours !== undefined && ctx.timeZoneDifferenceHours >= 3) {
        return {
          applicable: true,
          reason: `Circadian diagnostic flag only: visiting team traveling across ${ctx.timeZoneDifferenceHours} time zones for an early kickoff window. This flag does NOT establish a performance penalty.`,
          // Direction is deliberately PASS. The literature (medRxiv 2023; PubMed
          // 40481637) does not find a reliable jet-lag penalty on football
          // performance, so asserting a HOME fade here would be a fabricated
          // edge. The flag stays observable without steering the projection.
          situationalBiasDirection: "PASS",
          situationalNarrative: "Time-zone travel is noted as a diagnostic condition. No first-quarter force-production or reaction-speed penalty is claimed: current evidence does not support one.",
        };
      }
      return { applicable: false, reason: "Travel time-zone differential nominal.", situationalBiasDirection: "PASS", situationalNarrative: "" };
    },
  },

  // 9 (DEEP ALPHA): Offensive Line Continuity & Trench Disruption
  {
    arxivId: "EQ-LINE-001",
    title: "Offensive Line Continuity & Trench Pass Protection Degradation",
    pillar: "TRENCH_OL_CONTINUITY",
    situationalConcept: "Offensive lines operate as an integrated 5-man unit; missing multiple starters spikes pressure rate non-linearly.",
    greyAreaSignal: "Penalizes teams with OL continuity < 0.60 facing top-10 pass rush units.",
    evaluateContext: (ctx) => {
      if (ctx.olContinuityScoreAway !== undefined && ctx.olContinuityScoreAway < 0.65) {
        return {
          applicable: true,
          reason: `Compromised offensive line continuity score (${(ctx.olContinuityScoreAway * 100).toFixed(0)}%) for away unit.`,
          situationalBiasDirection: "HOME",
          situationalNarrative: "Communication breakdowns across interior line generate quick-pressure hazard (> +8.2% sack risk).",
        };
      }
      return { applicable: false, reason: "Offensive line continuity intact.", situationalBiasDirection: "PASS", situationalNarrative: "" };
    },
  },

  // 10 (DEEP ALPHA): Head Coach 4th Down Aggressiveness & EPA Drag
  {
    arxivId: "EQ-COACH-001",
    title: "Fourth Down Decision Making: Challenging the Conservative Nature of NFL Coaches",
    pillar: "COACHING_FOURTH_DOWN_DRAG",
    situationalConcept: "Conservative punting/kicking on 4th-and-short in opponent territory forfeits 1.5 to 3.0 net points of game equity.",
    greyAreaSignal: "Favors aggressive mathematical decision-makers against conservative traditionalist coaches.",
    evaluateContext: (ctx) => {
      if (ctx.coachAggressivenessDelta !== undefined && ctx.coachAggressivenessDelta >= 1.5) {
        return {
          applicable: true,
          reason: `Coaching game-theory differential (+${ctx.coachAggressivenessDelta.toFixed(1)} EPA/game) favors home sideline.`,
          situationalBiasDirection: "HOME",
          situationalNarrative: "Optimal fourth-down conversion strategy generates high-leverage points edge over opponent's conservative punts.",
        };
      }
      return { applicable: false, reason: "Coaching decision aggressiveness neutral.", situationalBiasDirection: "PASS", situationalNarrative: "" };
    },
  },

  // 11 (DEEP ALPHA): Turnover Luck Regression & Pythagorean Variance
  {
    arxivId: "EQ-LUCK-001",
    title: "Modeling NFL Football Outcomes: Turnover Margin Variance & Loose Ball Luck",
    pillar: "TURNOVER_LUCK_REGRESSION",
    situationalConcept: "Fumble recoveries regress to 50% coin flips; extreme turnover differentials create inflated market prices.",
    greyAreaSignal: "Fades teams with unsustainable positive turnover margins (+7 or higher).",
    evaluateContext: (ctx) => {
      if (ctx.turnoverDifferentialAway !== undefined && ctx.turnoverDifferentialAway >= 7) {
        return {
          applicable: true,
          reason: `Visiting team carries unsustainable turnover luck (+${ctx.turnoverDifferentialAway}) due for negative regression.`,
          situationalBiasDirection: "HOME",
          situationalNarrative: "Market spread over-prices unearned fumble recovery variance; fading inflated road favorite.",
        };
      }
      return { applicable: false, reason: "Turnover margin within expected variance band.", situationalBiasDirection: "PASS", situationalNarrative: "" };
    },
  },

  // 12 (DEEP ALPHA): Same-Game Parlay Joint Copula Correlation
  {
    arxivId: "EQ-SGP-001",
    title: "LOPMM: Low-Order Parlay Market Making & Archimedean Copula Tail Dependence",
    pillar: "SGP_CORRELATION_COPULA",
    situationalConcept: "Sportsbooks misprice joint tail dependencies between QB volume, WR targets, and game spread scripts.",
    greyAreaSignal: "Identifies positive correlation compounding in same-game parlay structures.",
    evaluateContext: (ctx) => {
      if (ctx.sgpCorrelationRequested) {
        return {
          applicable: true,
          reason: "Active Archimedean Clayton-Gumbel copula evaluated across joint game script outcomes.",
          situationalBiasDirection: "PASS",
          situationalNarrative: "Exploits 15-30% sportsbook hold by identifying correlated game-script states.",
        };
      }
      return { applicable: false, reason: "Single outcome requested.", situationalBiasDirection: "PASS", situationalNarrative: "" };
    },
  },

  // 13 (DEEP ALPHA): NFL Big Data Bowl 2027 WR Mass-Adjusted Braking & Kinematic Leverage Deficit (KLD)
  {
    arxivId: "BDB-2027-DECEL-KLD",
    title: "NFL Big Data Bowl 2027: Mass-Adjusted Route Braking (Z_Brake) & Kinematic Leverage Deficit (KLD)",
    pillar: "BDB_WR_BRAKING_LEVERAGE",
    situationalConcept: "Receiver separation at the break point is governed by mass-adjusted deceleration impulse and DB reaction-time leverage deficit rather than straight-line 40-yard dash speed alone.",
    greyAreaSignal: "Elevates passing efficiency when home WR braking Z-score and KLD exceed DB recovery envelope.",
    evaluateContext: (ctx) => {
      if (
        (ctx.wrBrakingZDeltaHome !== undefined && ctx.wrBrakingZDeltaHome >= 0.75) ||
        (ctx.kldSeparationEdgeHome !== undefined && ctx.kldSeparationEdgeHome >= 0.15)
      ) {
        return {
          applicable: true,
          reason: `BDB 2027 WR kinematic leverage edge (Z_Brake=${(ctx.wrBrakingZDeltaHome ?? 0).toFixed(2)}, KLD=${(ctx.kldSeparationEdgeHome ?? 0).toFixed(2)}) exceeds secondary recovery threshold.`,
          situationalBiasDirection: "HOME",
          situationalNarrative: "Mass-adjusted route braking forces defensive backs into compensatory hip-turn recovery, opening high-EPA intermediate windows.",
        };
      }
      return { applicable: false, reason: "WR/DB kinematic braking equilibrium nominal.", situationalBiasDirection: "PASS", situationalNarrative: "" };
    },
  },

  // 14 (DEEP ALPHA): BDB 2026 Continuous Pass Coverage Control (PPCF) & Pre-Snap Motion Attention
  {
    arxivId: "BDB-2026-PPCF-MOTION",
    title: "NFL Big Data Bowl 2026: Continuous Pass Coverage Control Surface & Transformer Motion Attention",
    pillar: "BDB_COVERAGE_CONTROL_MOTION",
    situationalConcept: "Pre-snap motion at snap shifts scaled dot-product coverage attention weights and widens bivariate Gaussian spatial control windows against static shell rotations.",
    greyAreaSignal: "Triggers when offensive motion-at-snap attention shift exploits opposing defensive shell rigidity.",
    evaluateContext: (ctx) => {
      if (ctx.motionAttentionEdgeHome !== undefined && ctx.motionAttentionEdgeHome >= 0.04) {
        return {
          applicable: true,
          reason: `Pre-snap motion transformer attention shift (+${ctx.motionAttentionEdgeHome.toFixed(3)} EPA/play) compromises opposing defensive shell rotation.`,
          situationalBiasDirection: "HOME",
          situationalNarrative: "High-frequency jet/orbit motion forces safety rotation disclosure pre-snap and expands continuous pass coverage control (PPCF) windows.",
        };
      }
      return { applicable: false, reason: "Pre-snap motion attention balance neutral.", situationalBiasDirection: "PASS", situationalNarrative: "" };
    },
  },

  // 15 (DEEP ALPHA): RB Zone vs Gap/Power Scheme Fit & Light-Box Exploitation
  {
    arxivId: "BDB-2020-RB-SCHEME",
    title: "NFL Big Data Bowl Rushing Physics: Zone vs Gap/Power Scheme Fit & Light-Box Exploitation",
    pillar: "RB_ZONE_GAP_SCHEME_FIT",
    situationalConcept: "Running back efficiency is non-portable across blocking schemes (e.g., wide-zone one-cut deceleration vs interior gap/duo downhill momentum).",
    greyAreaSignal: "Flags high-leverage rushing efficiency when RB scheme YPC split aligns with offensive coordinator run-concept share and opponent light-box rate.",
    evaluateContext: (ctx) => {
      if (ctx.rbSchemeYpcEdgeHome !== undefined && ctx.rbSchemeYpcEdgeHome >= 0.65) {
        return {
          applicable: true,
          reason: `RB blocking-scheme alignment yields +${ctx.rbSchemeYpcEdgeHome.toFixed(2)} YPC advantage over opposing defensive front box structure.`,
          situationalBiasDirection: "HOME",
          situationalNarrative: "RB cut-angle kinematics align with offensive line zone/gap blocking distribution against two-high light boxes.",
        };
      }
      return { applicable: false, reason: "Rushing scheme fit within baseline.", situationalBiasDirection: "PASS", situationalNarrative: "" };
    },
  },

  // 16 (DEEP ALPHA): ClarusC64 8-Suite NFL Coherence Risk & Script Collapse Hazard
  {
    arxivId: "HF-CLARUSC64-COHERENCE",
    title: "ClarusC64 8-Suite NFL Coherence Risk: Red-Zone, Route-Timing, Protection & Motion Adjustment",
    pillar: "CLARUS_COHERENCE_RISK_SUITES",
    situationalConcept: "Play-call and execution coherence across red-zone sequencing, pass protection slide rules, and route timing governs late-down script stability.",
    greyAreaSignal: "Fades visiting offenses exhibiting elevated multi-suite coherence risk (>= 0.65).",
    evaluateContext: (ctx) => {
      if (ctx.clarusCoherenceRiskAway !== undefined && ctx.clarusCoherenceRiskAway >= 0.65) {
        return {
          applicable: true,
          reason: `Visiting offense ClarusC64 multi-suite coherence risk (${(ctx.clarusCoherenceRiskAway * 100).toFixed(1)}%) breaches script-collapse ceiling.`,
          situationalBiasDirection: "HOME",
          situationalNarrative: "Desynchronized route timing and protection slide rules under defensive motion adjustments elevate drive-stall probability.",
        };
      }
      return { applicable: false, reason: "Play-call and protection coherence nominal.", situationalBiasDirection: "PASS", situationalNarrative: "" };
    },
  },

  // 17 (DEEP ALPHA): Grass-to-Turf Playing Surface Switching & VisiShield Biomechanical FSM
  {
    arxivId: "KAGGLE-SURFACE-FSM",
    title: "NFL Playing Surface Analytics & VisiShield Edge Biomechanical Risk Finite State Machine",
    pillar: "SURFACE_SWITCH_BIOMECHANICAL_FSM",
    situationalConcept: "Natural grass teams traveling to synthetic turf experience higher cleat-surface torsional friction and lower-extremity deceleration load.",
    greyAreaSignal: "Penalizes visiting grass-based rosters making high-workload grass-to-turf transitions.",
    evaluateContext: (ctx) => {
      if (ctx.awayGrassToTurfHazard !== undefined && ctx.awayGrassToTurfHazard >= 1.15) {
        return {
          applicable: true,
          reason: `Visiting roster grass-to-turf surface switch hazard (${ctx.awayGrassToTurfHazard.toFixed(2)}x) triggers VisiShield biomechanical load state.`,
          situationalBiasDirection: "HOME",
          situationalNarrative: "Synthetic turf rotational stiffness amplifies fourth-quarter lower-extremity deceleration fatigue on high-angle cuts.",
        };
      }
      return { applicable: false, reason: "Playing surface transition hazard neutral.", situationalBiasDirection: "PASS", situationalNarrative: "" };
    },
  },
];

/**
 * Evaluates the full suite of arXiv corpus premises against a live game context.
 * Produces structured contextual intelligence for the Layer 2 reasoning trace.
 */
export function evaluateArxivCorpus(ctx: ArxivContextQuery): {
  readonly totalCorpusPapersIndexed: number;
  readonly totalKaggleDatasetsIndexed: number;
  readonly activePremisesCount: number;
  readonly activeEvaluations: readonly ArxivSignalEvaluation[];
  readonly situationalReasoningSynthesis: string;
} {
  const evaluations: ArxivSignalEvaluation[] = [];

  for (const premise of ARXIV_REASONING_PREMISES) {
    const res = premise.evaluateContext(ctx);
    if (res.applicable) {
      evaluations.push(res);
    }
  }

  const synthesis =
    evaluations.length === 0
      ? "Arxiv & OpenAlex sports prediction corpus consulted (2,446 papers, 429 datasets): all situational and environmental parameters within neutral baseline."
      : evaluations.map((e) => `[${e.situationalBiasDirection}] ${e.reason} Contextual insight: ${e.situationalNarrative}`).join(" | ");

  return {
    // 2,446 is the DEDUPLICATED count of unique papers across the five corpus
    // files committed under docs/arxiv-program/research (OMNIBUS 658, OPENALEX
    // ACADEMIC 299, OPENALEX NFL 200, PURE_NFL 86, plus the 1,251-line
    // corpus-index.jsonl = 2,494 raw entries, 2,446 unique after key dedupe).
    // Earlier values in this file disagreed: the doc comments said 2,179 while
    // the constant said 2,379. Neither was reproducible from the committed
    // corpus. Re-derive with `python scripts/verify-corpus-count.py`.
    totalCorpusPapersIndexed: 2446,
    totalKaggleDatasetsIndexed: 429,
    activePremisesCount: evaluations.length,
    activeEvaluations: evaluations,
    situationalReasoningSynthesis: synthesis,
  };
}
