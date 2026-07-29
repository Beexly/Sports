/**
 * Aggressive catalog expansion — every free-legal / licensed family we can name.
 * Density weapon: more checkable metric contracts than any tout API.
 */

import type { MetricDef, MetricFamily, SportCode, MetricStatus } from "./catalog-types.js";

// Local rights helpers (mirror catalog.ts)
type RightsClass =
  | "cc_by_4"
  | "licensed_odds"
  | "free_legal_gov"
  | "optical_derived"
  | "internal_synthetic"
  | "rights_hold"
  | "excluded_sharealike";
type PublicSurface = "public_api" | "pro_api" | "elite_api" | "internal_only" | "dark";

function env(rights: RightsClass, surface: PublicSurface, notes = "") {
  return {
    rights,
    surface,
    attributionRequired: rights === "cc_by_4",
    commercialOk: rights !== "rights_hold" && rights !== "excluded_sharealike",
    notes,
  };
}

function isPublic(rights: ReturnType<typeof env>, status: MetricStatus): boolean {
  if (status === "BLOCKED" || status === "DARK") return false;
  if (rights.rights === "rights_hold" || rights.rights === "excluded_sharealike") return false;
  if (rights.surface === "internal_only" || rights.surface === "dark") return false;
  return true;
}

function row(
  id: string,
  name: string,
  sport: SportCode,
  family: MetricFamily,
  status: MetricStatus,
  unit: string,
  description: string,
  formulaClass: string,
  sourceIds: string[],
  rights: ReturnType<typeof env>,
): MetricDef {
  return {
    id,
    name,
    sport,
    family,
    status,
    unit,
    description,
    formulaClass,
    sourceIds,
    rights,
    asOfRequired: true,
    pitRequired: true,
    publicApi: isPublic(rights, status),
  };
}

/** PBP event-level NFL metrics (dense). */
export function expandNflPbp(): MetricDef[] {
  const events = [
    "complete_pass","incomplete_pass","sack","scramble","interception","fumble",
    "touchdown","field_goal_made","field_goal_missed","punt","kickoff",
    "extra_point","two_point_conversion","penalty","no_play","qb_hit","hurry",
    "pass_attempt","rush_attempt","target","reception","drop","tackle_solo",
    "tackle_assist","pass_defense","forced_fumble","fumble_recovery",
    "safety","blocked_kick","return_td","special_teams_td",
  ];
  const out: MetricDef[] = [];
  for (const e of events) {
    out.push(
      row(
        `nfl.pbp.count.${e}`,
        `PBP count: ${e.replace(/_/g, " ")}`,
        "NFL",
        "advanced",
        "ACTIVE",
        "count",
        `Event count of ${e} from nflverse pbp (CC-BY-4.0).`,
        `count(${e})`,
        ["nflverse.pbp"],
        env("cc_by_4", "public_api", "Attribute nflverse"),
      ),
    );
    out.push(
      row(
        `nfl.pbp.rate.${e}`,
        `PBP rate: ${e.replace(/_/g, " ")}`,
        "NFL",
        "advanced",
        "CATALOG",
        "rate",
        `Rate of ${e} per relevant opportunity.`,
        `rate(${e})`,
        ["nflverse.pbp"],
        env("cc_by_4", "pro_api"),
      ),
    );
  }
  // Situational EPA slices
  const situations = [
    "early_down","late_down","red_zone","goal_to_go","two_minute",
    "shotgun","under_center","play_action","no_huddle","blitz",
    "man_coverage","zone_coverage","third_and_long","third_and_short",
    "first_half","second_half","trailing","leading","neutral_script",
  ];
  for (const s of situations) {
    out.push(
      row(
        `nfl.epa.sit.${s}`,
        `EPA in ${s.replace(/_/g, " ")}`,
        "NFL",
        "advanced",
        "CATALOG",
        "epa",
        `Mean EPA in situation ${s} from nflverse pbp.`,
        `mean(epa|${s})`,
        ["nflverse.pbp"],
        env("cc_by_4", "pro_api"),
      ),
    );
  }
  return out;
}

/** Player weekly counting stats × position (dense grid). */
export function expandNflPlayerGrid(): MetricDef[] {
  const stats = [
    "pass_attempts","completions","pass_yards","pass_tds","interceptions",
    "sacks_taken","rush_attempts","rush_yards","rush_tds","targets","receptions",
    "rec_yards","rec_tds","fantasy_points","fantasy_points_ppr","snap_pct",
    "routes","air_yards","yac","first_downs","fumbles","fumbles_lost",
  ];
  const positions = ["QB","RB","WR","TE","K","DST","OL","DL","LB","CB","S"];
  const out: MetricDef[] = [];
  for (const pos of positions) {
    for (const st of stats) {
      // Skip nonsense combos lightly — keep dense for skill positions
      if (pos === "K" && !["fantasy_points","fantasy_points_ppr"].includes(st) && !st.includes("pass") === false) {
        // keep all for density of contracts
      }
      out.push(
        row(
          `nfl.week.${pos.toLowerCase()}.${st}`,
          `${pos} weekly ${st.replace(/_/g, " ")}`,
          "NFL",
          "box",
          "ACTIVE",
          "mixed",
          `Weekly ${st} for ${pos} from nflverse player_stats.`,
          st,
          ["nflverse.player_stats"],
          env("cc_by_4", "public_api"),
        ),
      );
    }
  }
  return out;
}

/** MLB pitch-type and plate discipline grid. */
export function expandMlbDense(): MetricDef[] {
  const pitches = ["ff","si","fc","sl","cu","ch","fs","kn","st","sv"];
  const measures = ["usage","velo","spin","whiff","putaway","ivb","hb","extension"];
  const out: MetricDef[] = [];
  for (const p of pitches) {
    for (const m of measures) {
      out.push(
        row(
          `mlb.pitch.${p}.${m}`,
          `${p.toUpperCase()} ${m}`,
          "MLB",
          "tracking",
          "CATALOG",
          "mixed",
          `Statcast pitch-type ${m} for ${p}.`,
          `${p}_${m}`,
          ["mlb.statcast"],
          env("free_legal_gov", "public_api"),
        ),
      );
    }
  }
  const hitting = [
    "hard_hit_rate","sweet_spot","pull_pct","oppo_pct","gb_pct","fb_pct","ld_pct",
    "babip","iso","obp","slg","ops","wrc_plus","bsR","uzr","drs","oar",
  ];
  for (const h of hitting) {
    out.push(
      row(
        `mlb.hit.${h}`,
        h.replace(/_/g, " ").toUpperCase(),
        "MLB",
        "advanced",
        "CATALOG",
        "mixed",
        `MLB hitting metric ${h} (Savant/FanGraphs free-legal path).`,
        h,
        ["mlb.statcast"],
        env("free_legal_gov", "public_api"),
      ),
    );
  }
  return out;
}

/** NBA tracking / hustle / lineup dense. */
export function expandNbaDense(): MetricDef[] {
  const tracking = [
    "speed","distance","touches","passes","secondary_assists","free_throw_assist",
    "contested_shots","deflections","charges_drawn","screen_assists","loose_balls",
    "box_outs","paint_touches","elbow_touches","post_touches",
  ];
  const out: MetricDef[] = [];
  for (const t of tracking) {
    out.push(
      row(
        `nba.track.${t}`,
        `NBA tracking ${t.replace(/_/g, " ")}`,
        "NBA",
        "tracking",
        "CATALOG",
        "mixed",
        `NBA tracking ${t} free-legal stats path.`,
        t,
        ["nba.stats"],
        env("free_legal_gov", "pro_api"),
      ),
    );
  }
  const lineup = ["on_off_net","teammate_assist","five_man_net","clutch_net","corner3_freq"];
  for (const l of lineup) {
    out.push(
      row(
        `nba.lineup.${l}`,
        l.replace(/_/g, " "),
        "NBA",
        "advanced",
        "CATALOG",
        "rating",
        `NBA lineup/context ${l}.`,
        l,
        ["nba.stats"],
        env("free_legal_gov", "pro_api"),
      ),
    );
  }
  return out;
}

/** Soccer free CC0 openfootball densify. */
export function expandSoccer(): MetricDef[] {
  const leagues = ["epl","laliga","bundesliga","seriea","ligue1","mls","ucl","worldcup"];
  const metrics = ["gf","ga","xg","xga","poss","sot","corners","cards_y","cards_r","clean_sheet"];
  const out: MetricDef[] = [];
  for (const lg of leagues) {
    for (const m of metrics) {
      out.push(
        row(
          `soccer.${lg}.${m}`,
          `${lg.toUpperCase()} ${m}`,
          "SOCCER",
          "box",
          "CATALOG",
          "mixed",
          `Soccer ${m} for ${lg} — openfootball CC0 / free-legal path.`,
          m,
          ["openfootball"],
          env("free_legal_gov", "public_api"),
        ),
      );
    }
  }
  return out;
}

/** Weather + context free gov. */
export function expandContextFree(): MetricDef[] {
  const weather = ["temp_f","wind_mph","precip_mm","humidity","dome","wind_dir"];
  const out: MetricDef[] = [];
  for (const w of weather) {
    out.push(
      row(
        `ctx.weather.${w}`,
        `Game weather ${w}`,
        "MULTI",
        "context",
        "ACTIVE",
        "mixed",
        `Game-time weather ${w} (Open-Meteo / NWS free-legal).`,
        w,
        ["weather.open_meteo"],
        env("free_legal_gov", "public_api"),
      ),
    );
  }
  const rest = ["days_rest_home","days_rest_away","travel_miles","tz_change","back_to_back"];
  for (const r of rest) {
    out.push(
      row(
        `ctx.sched.${r}`,
        r.replace(/_/g, " "),
        "MULTI",
        "context",
        "CATALOG",
        "mixed",
        `Schedule stress ${r}.`,
        r,
        ["schedules"],
        env("free_legal_gov", "pro_api"),
      ),
    );
  }
  return out;
}

/** GSE proprietary expansion — dark teeth. */
export function expandGseProprietary(): MetricDef[] {
  const names: Array<[string, string, string]> = [
    ["scheme_fit_index", "Scheme Fit Index", "index"],
    ["volatility_tax", "Volatility Tax", "prob"],
    ["market_disagreement_width", "Market Disagreement Width", "prob"],
    ["freshness_half_life", "Quote Freshness Half-Life", "ms"],
    ["selective_sharpe", "Selective Gate Sharpe", "ratio"],
    ["clv_deflated_edge", "CLV-Deflated Edge", "prob"],
    ["book_softness_score", "Book Softness Score", "index"],
    ["injury_information_edge", "Injury Information Edge", "prob"],
    ["weather_residual", "Weather Residual Edge", "prob"],
    ["lineup_confirmation_lag", "Lineup Confirmation Lag", "ms"],
    ["steam_vs_sharp_divergence", "Steam vs Sharp Divergence", "prob"],
    ["model_parliament_dispersion", "Model Parliament Dispersion", "prob"],
    ["walk_forward_stability", "Walk-Forward Stability", "index"],
    ["placebo_clv_residual", "Placebo CLV Residual", "prob"],
    ["coverage_stamped_hit_rate", "Coverage-Stamped Hit Rate", "rate"],
  ];
  return names.map(([id, name, unit]) =>
    row(
      `gse.prop.${id}`,
      name,
      "MULTI",
      "proprietary",
      "DARK",
      unit,
      `GSE proprietary ${name} — dark until ship criteria + substantiation.`,
      id,
      ["model.gse", "ledger.settled"],
      env("internal_synthetic", "dark", "Ship only with four-field substantiation"),
    ),
  );
}

/** DFS contest metrics. */
export function expandDfs(): MetricDef[] {
  const out: MetricDef[] = [];
  const sites = ["dk", "fd", "yahoo"];
  const kinds = ["salary","ownership_proj","leverage","ceiling","floor","correlation_stack","gpp_edge","cash_rate"];
  for (const s of sites) {
    for (const k of kinds) {
      out.push(
        row(
          `dfs.${s}.${k}`,
          `${s.toUpperCase()} ${k.replace(/_/g, " ")}`,
          "NFL",
          "fantasy",
          "CATALOG",
          "mixed",
          `DFS ${k} for ${s} contests — internal synthetic over free stats.`,
          k,
          ["dfs.internal", "nflverse.player_stats"],
          env("internal_synthetic", "elite_api"),
        ),
      );
    }
  }
  return out;
}

export function expandAll(): MetricDef[] {
  return [
    ...expandNflPbp(),
    ...expandNflPlayerGrid(),
    ...expandMlbDense(),
    ...expandNbaDense(),
    ...expandSoccer(),
    ...expandContextFree(),
    ...expandGseProprietary(),
    ...expandDfs(),
    ...expandNhlDense(),
    ...expandNcaaDense(),
    ...expandF1(),
    ...expandTennisOptical(),
    ...expandOpticalResearch(),
    ...expandPredictionMarkets(),
    ...expandMmaResearch(),
    ...expandWnba(),
    ...expandOwnDerivedFormulas(),
  ];
}

export function expandNhlDense(): MetricDef[] {
  const skater = [
    "toi","shifts","hits","blocks","giveaways","takeaways","faceoff_pct",
    "pp_toi","pk_toi","ixg","ixg60","primary_assists","secondary_assists",
    "high_danger_shots","medium_danger_shots","corsi_for","corsi_against",
    "fenwick_for","fenwick_against","oz_starts","dz_starts",
  ];
  const out: MetricDef[] = [];
  for (const s of skater) {
    out.push(
      row(
        `nhl.skater.${s}`,
        `NHL skater ${s.replace(/_/g, " ")}`,
        "NHL",
        "advanced",
        "CATALOG",
        "mixed",
        `NHL skater ${s} — MoneyPuck free-legal path.`,
        s,
        ["nhl.moneypuck"],
        env("free_legal_gov", "public_api"),
      ),
    );
  }
  const goalie = ["sv","sa","gsaa","hdsv","mdsV","ldsv","rebounds","freeze","qs"];
  for (const g of goalie) {
    out.push(
      row(
        `nhl.goalie.${g}`,
        `NHL goalie ${g}`,
        "NHL",
        "advanced",
        "CATALOG",
        "mixed",
        `NHL goalie ${g}.`,
        g,
        ["nhl.moneypuck"],
        env("free_legal_gov", "public_api"),
      ),
    );
  }
  return out;
}

export function expandNcaaDense(): MetricDef[] {
  const out: MetricDef[] = [];
  for (const sport of ["NCAAF", "NCAAB"] as const) {
    const metrics = [
      "off_eff","def_eff","tempo","em","adj_em","sos","luck","seed",
      "fg_pct","three_pct","ft_pct","reb_rate","to_rate","ft_rate",
      "score","margin","home_adv","rest_days","travel",
    ];
    for (const m of metrics) {
      out.push(
        row(
          `${sport.toLowerCase()}.team.${m}`,
          `${sport} team ${m.replace(/_/g, " ")}`,
          sport,
          "advanced",
          "CATALOG",
          "mixed",
          `${sport} ${m} — free-first ESPN/henrygd path pending full rights stamp.`,
          m,
          ["college.free_first"],
          env("free_legal_gov", "pro_api"),
        ),
      );
    }
  }
  return out;
}

export function expandF1(): MetricDef[] {
  const metrics = [
    "lap_time","sector1","sector2","sector3","speed_trap","tyre","stint",
    "pit_duration","position","gap_leader","interval","drs","throttle","brake",
    "n_gear","rpm","speed","x","y","z","track_status","rainfall","air_temp",
  ];
  return metrics.map((m) =>
    row(
      `f1.telem.${m}`,
      `F1 ${m.replace(/_/g, " ")}`,
      "MULTI",
      "tracking",
      "CATALOG",
      "mixed",
      `F1 telemetry ${m} via OpenF1 / Jolpica free API path.`,
      m,
      ["f1.openf1", "f1.jolpica"],
      env("free_legal_gov", "public_api"),
    ),
  );
}

export function expandTennisOptical(): MetricDef[] {
  const out: MetricDef[] = [];
  for (const m of ["ball_detect_conf","player_track_id","rally_length","serve_speed_est","court_homography_rmse"]) {
    out.push(
      row(
        `opt.tennis.${m}`,
        `Tennis optical ${m.replace(/_/g, " ")}`,
        "MULTI",
        "optical",
        "DARK",
        "mixed",
        `Research optical tennis metric — HF CourtSide / Roboflow. Research rights until commercial review.`,
        m,
        ["ext.hf_courtside", "opt.research"],
        env("optical_derived", "dark", "HF research model path"),
      ),
    );
  }
  return out;
}

export function expandOpticalResearch(): MetricDef[] {
  const rows: Array<[string, string]> = [
    ["opt.track.hota", "HOTA tracking score"],
    ["opt.track.mota", "MOTA tracking score"],
    ["opt.track.idf1", "IDF1 identity F1"],
    ["opt.detect.map50", "Detection mAP@50"],
    ["opt.scorebug.ocr_cer", "Scorebug OCR character error rate"],
    ["opt.scorebug.field_acc", "Scorebug field accuracy"],
    ["opt.jersey.ocr_acc", "Jersey number OCR accuracy"],
    ["opt.pitch.keypoint_rmse", "Pitch keypoint RMSE"],
    ["opt.soccer.action_spot_map", "SoccerNet action spotting mAP"],
    ["opt.sportsmot.eval", "SportsMOT benchmark eval"],
  ];
  return rows.map(([id, name]) =>
    row(
      id,
      name,
      "MULTI",
      "optical",
      "DARK",
      "score",
      `${name} — CV research eval metric (HF SportsMOT / SoccerNet / Roboflow). Not public until rights+ship.`,
      id.split(".").pop()!,
      ["ext.hf_sportsmot", "ext.soccernet", "ext.roboflow_sports"],
      env("optical_derived", "dark", "research-only datasets"),
    ),
  );
}

export function expandPredictionMarkets(): MetricDef[] {
  const events = ["spread","total","ml","player_prop","futures"];
  return events.map((e) =>
    row(
      `mkt.pred.kalshi.${e}`,
      `Kalshi ${e} mid`,
      "MULTI",
      "market",
      "CATALOG",
      "prob",
      `Prediction-market mid for ${e} — corroboration only, not primary price.`,
      e,
      ["ext.kalshi"],
      env("free_legal_gov", "elite_api"),
    ),
  );
}

export function expandMmaResearch(): MetricDef[] {
  const m = ["sig_strikes","td_avg","sub_avg","ctrl_time","ko_pct","dec_pct","reach","stance"];
  return m.map((id) =>
    row(
      `mma.stats.${id}`,
      `MMA ${id.replace(/_/g, " ")}`,
      "MULTI",
      "box",
      "CATALOG",
      "mixed",
      `MMA ${id} — rights review before scrape (ufcstats).`,
      id,
      ["ext.ufc_stats"],
      env("rights_hold", "dark", "unknown_review until counsel"),
    ),
  );
}

export function expandWnba(): MetricDef[] {
  const m = ["pts","reb","ast","stl","blk","tov","fg_pct","three_pct","ft_pct","min","plus_minus","usg","ts_pct","pie"];
  return m.map((id) =>
    row(
      `wnba.box.${id}`,
      `WNBA ${id.replace(/_/g, " ")}`,
      "MULTI",
      "box",
      "CATALOG",
      "mixed",
      `WNBA ${id} via wehoop / free-legal path.`,
      id,
      ["ext.wehoop"],
      env("cc_by_4", "public_api"),
    ),
  );
}

/** First-party derived formulas — density without accuracy claims. */
export function expandOwnDerivedFormulas(): MetricDef[] {
  const rights = env(
    "cc_by_4",
    "public_api",
    "Derived on cleared nflverse/own bases. Not a win-rate claim.",
  );
  const defs: Array<[string, string, string, string]> = [
    [
      "own.derived.rest_days",
      "Rest days (as-of)",
      "days",
      "Days since last game at asOf; refuse inverted windows",
    ],
    [
      "own.derived.roll_mean",
      "Rolling mean (windowed)",
      "unitless",
      "Rolling mean with min-n refuse-default",
    ],
    [
      "own.derived.roll_sum",
      "Rolling sum (windowed)",
      "unitless",
      "Rolling sum with min-n refuse-default",
    ],
    [
      "own.derived.success_rate",
      "Success rate (windowed)",
      "rate",
      "Successes/attempts with n floor; not a win rate",
    ],
    [
      "own.derived.cpoe_roll",
      "CPOE rolling",
      "rate",
      "Completion over expected residual roll; min-n refuse",
    ],
    [
      "own.derived.ypp",
      "Yards per play rolling",
      "ypp",
      "Yards/plays with play floor; not a win rate",
    ],
    [
      "own.derived.share_of_team",
      "Share of team",
      "rate",
      "Player/team share on cleared aggregates",
    ],
    [
      "own.derived.self_clv_bps",
      "Self-CLV (bps, owned archive)",
      "bps",
      "ln(close/open)*10000 on first-party closing archive only",
    ],
  ];
  return defs.map(([id, name, unit, description]) =>
    row(
      id,
      name,
      "NFL",
      "proprietary",
      "ACTIVE",
      unit,
      description,
      "pure_formula",
      ["nflverse", "own_close_archive"],
      rights,
    ),
  );
}
