/**
 * GSE Stats & Metrics Catalog — the densest rights-tagged registry in sports analytics.
 *
 * Ambition: more named, checkable metrics than any competitor API — WITHOUT
 * fabricating performance claims. Every row is a contract: id, formula class,
 * rights, surface, sport, family, status.
 *
 * Status:
 *  - ACTIVE: computed or ingestable today
 *  - CATALOG: named + rights-cleared, compute path CODE_READY or planned
 *  - DARK: proprietary, not public until ship criteria
 *  - BLOCKED: rights or legal hold
 */

import { expandAll } from "./catalog-expand.js";
import type { MetricDef, MetricFamily, MetricStatus, SportCode } from "./catalog-types.js";
export type { MetricDef, MetricFamily, MetricStatus, SportCode } from "./catalog-types.js";
import type { PublicSurface, RightsClass, RightsEnvelope } from "./rights.js";
import { isPublicApiEligible } from "./rights.js";


function env(

  rights: RightsClass,
  surface: PublicSurface,
  notes = "",
): RightsEnvelope {
  return {
    rights,
    surface,
    attributionRequired: rights === "cc_by_4",
    commercialOk: rights !== "rights_hold" && rights !== "excluded_sharealike",
    notes,
  };
}

function m(
  partial: Omit<MetricDef, "publicApi" | "asOfRequired" | "pitRequired"> & {
    asOfRequired?: boolean;
    pitRequired?: boolean;
  },
): MetricDef {
  const rights = partial.rights;
  return {
    ...partial,
    asOfRequired: partial.asOfRequired ?? true,
    pitRequired: partial.pitRequired ?? true,
    publicApi: isPublicApiEligible(rights) && partial.status !== "BLOCKED" && partial.status !== "DARK",
  };
}

/** Core named proprietary GSE metrics (dark until ship). */
const PROPRIETARY_CORE: MetricDef[] = [
  m({
    id: "gse.optical_confirmation_score",
    name: "Optical Confirmation Score",
    sport: "MULTI",
    family: "proprietary",
    status: "DARK",
    unit: "rate",
    description: "Fraction of fired decisions with independent optical corroboration.",
    formulaClass: "mean(I_optical_ok)",
    sourceIds: ["optical.scorebug", "optical.formation"],
    rights: env("optical_derived", "dark", "Ship when clean≥0.98 on gold set"),
  }),
  m({
    id: "gse.decision_latency_edge",
    name: "Decision Latency Edge",
    sport: "MULTI",
    family: "proprietary",
    status: "DARK",
    unit: "ms",
    description: "Mean decision latency vs market-move window; lower is sharper.",
    formulaClass: "mean(t_decision - t_quote)",
    sourceIds: ["odds.snapshot", "decision.ledger"],
    rights: env("internal_synthetic", "dark"),
  }),
  m({
    id: "gse.refusal_calibration_residual",
    name: "Refusal Calibration Residual",
    sport: "MULTI",
    family: "calibration",
    status: "DARK",
    unit: "rate",
    description: "|abstain_rate - target| on selective gate cohort.",
    formulaClass: "abs(abstain - target)",
    sourceIds: ["gate.selective"],
    rights: env("internal_synthetic", "dark"),
  }),
  m({
    id: "gse.edge_index",
    name: "Edge Index",
    sport: "MULTI",
    family: "market",
    status: "ACTIVE",
    unit: "prob",
    description: "Calibrated pLo − no-vig market q. Fire on this, never confidence.",
    formulaClass: "p_lo - q_novig",
    sourceIds: ["model.calibrated", "odds.devig"],
    rights: env("internal_synthetic", "pro_api"),
  }),
  m({
    id: "gse.clv_vs_pinnacle",
    name: "CLV vs Pinnacle Close",
    sport: "MULTI",
    family: "market",
    status: "ACTIVE",
    unit: "prob",
    description: "Closing-line value vs Pinnacle (primary sharp anchor).",
    formulaClass: "q_close_pin - q_decision",
    sourceIds: ["odds.pinnacle_close", "decision.price"],
    rights: env("licensed_odds", "pro_api"),
  }),
  m({
    id: "gse.honest_band",
    name: "Honest Band (Wilson)",
    sport: "MULTI",
    family: "calibration",
    status: "ACTIVE",
    unit: "interval",
    description: "Wilson score interval on settled selective rate; held until floor.",
    formulaClass: "wilson(successes,n,0.95)",
    sourceIds: ["ledger.settled"],
    rights: env("internal_synthetic", "public_api"),
  }),
  m({
    id: "gse.no_bet_pressure",
    name: "No-Bet Pressure",
    sport: "MULTI",
    family: "proprietary",
    status: "ACTIVE",
    unit: "score",
    description: "Composite refusal pressure from freshness/width/sample/rights.",
    formulaClass: "computeNoBetStrength",
    sourceIds: ["gate.selective", "odds.freshness"],
    rights: env("internal_synthetic", "pro_api"),
  }),
  m({
    id: "gse.glass_ledger_integrity",
    name: "Glass Ledger Integrity",
    sport: "MULTI",
    family: "meta",
    status: "ACTIVE",
    unit: "bool",
    description: "Open recompute of receipt chain master fingerprint.",
    formulaClass: "recomputeChain(receipts).ok",
    sourceIds: ["ledger.receipts"],
    rights: env("internal_synthetic", "public_api"),
  }),
];

/** Generate dense nflverse-linked metrics. */
function nflverseFamily(): MetricDef[] {
  const box = [
    ["pass_yds", "Passing Yards", "yds"],
    ["pass_td", "Passing TDs", "count"],
    ["pass_int", "Interceptions", "count"],
    ["rush_yds", "Rushing Yards", "yds"],
    ["rush_td", "Rushing TDs", "count"],
    ["rec_yds", "Receiving Yards", "yds"],
    ["rec_td", "Receiving TDs", "count"],
    ["receptions", "Receptions", "count"],
    ["targets", "Targets", "count"],
    ["sacks", "Sacks", "count"],
    ["tackles", "Tackles", "count"],
    ["fg_made", "FG Made", "count"],
    ["xp_made", "XP Made", "count"],
  ] as const;

  const advanced = [
    ["epa", "EPA", "epa", "sum(epa)"],
    ["cpoe", "CPOE", "prob", "mean(cpoe)"],
    ["success_rate", "Success Rate", "rate", "mean(success)"],
    ["air_yards", "Air Yards", "yds", "sum(air_yards)"],
    ["yac", "Yards After Catch", "yds", "sum(yards_after_catch)"],
    ["wpa", "Win Probability Added", "prob", "sum(wpa)"],
    ["comp_pct", "Completion %", "rate", "completions/attempts"],
    ["ypa", "Yards per Attempt", "yds", "pass_yds/attempts"],
    ["pressure_rate", "Pressure Rate", "rate", "pressures/dropbacks"],
  ] as const;

  const ngs = [
    ["separation", "Average Separation", "yds"],
    ["cushion", "Average Cushion", "yds"],
    ["time_to_throw", "Time to Throw", "s"],
    ["aggressiveness", "Aggressiveness", "rate"],
    ["rush_yards_over_expected", "Rush Yards Over Expected", "yds"],
    ["expected_yac", "Expected YAC", "yds"],
  ] as const;

  const out: MetricDef[] = [];
  for (const [id, name, unit] of box) {
    out.push(
      m({
        id: `nfl.box.${id}`,
        name,
        sport: "NFL",
        family: "box",
        status: "ACTIVE",
        unit,
        description: `NFL weekly ${name} from nflverse player_stats (CC-BY-4.0).`,
        formulaClass: `sum(${id})`,
        sourceIds: ["nflverse.player_stats"],
        rights: env("cc_by_4", "public_api", "Attribute nflverse"),
      }),
    );
  }
  for (const [id, name, unit, formula] of advanced) {
    out.push(
      m({
        id: `nfl.adv.${id}`,
        name,
        sport: "NFL",
        family: "advanced",
        status: "ACTIVE",
        unit,
        description: `NFL advanced ${name} from nflverse pbp/aggregates.`,
        formulaClass: formula,
        sourceIds: ["nflverse.pbp", "nflverse.stats_team"],
        rights: env("cc_by_4", "public_api", "Attribute nflverse"),
      }),
    );
  }
  for (const [id, name, unit] of ngs) {
    out.push(
      m({
        id: `nfl.ngs.${id}`,
        name,
        sport: "NFL",
        family: "tracking",
        status: "ACTIVE",
        unit,
        description: `NFL Next Gen Stats ${name} (nflverse nextgen_stats).`,
        formulaClass: `mean(${id})`,
        sourceIds: ["nflverse.nextgen_stats"],
        rights: env("cc_by_4", "pro_api", "Attribute nflverse; NGS labels"),
      }),
    );
  }

  // Role / context
  const ctx = [
    ["snap_share", "Snap Share", "rate", "snap_counts"],
    ["route_participation", "Route Participation", "rate", "pbp_participation"],
    ["depth_rank", "Depth Chart Rank", "rank", "depth_charts"],
    ["injury_status", "Injury Status", "enum", "injuries"],
    ["contract_apy", "Contract APY", "usd", "contracts"],
    ["referee_crew", "Referee Crew", "id", "officials"],
  ] as const;
  for (const [id, name, unit, src] of ctx) {
    const blocked = src === "pbp_participation";
    out.push(
      m({
        id: `nfl.ctx.${id}`,
        name,
        sport: "NFL",
        family: "context",
        status: blocked ? "BLOCKED" : "CATALOG",
        unit,
        description: blocked
          ? "Rights-hold CC-BY-SA — not ingested."
          : `Context signal ${name} from nflverse ${src}.`,
        formulaClass: id,
        sourceIds: [`nflverse.${src}`],
        rights: blocked
          ? env("excluded_sharealike", "dark", "Share-alike hold")
          : env("cc_by_4", "pro_api"),
      }),
    );
  }
  return out;
}

function mlbFamily(): MetricDef[] {
  const rows: Array<[string, string, string, string]> = [
    ["woba", "wOBA", "rate", "weighted on-base average"],
    ["xwoba", "xwOBA", "rate", "expected wOBA from Statcast"],
    ["barrel_rate", "Barrel Rate", "rate", "barrels / batted balls"],
    ["exit_velo", "Avg Exit Velocity", "mph", "mean launch speed"],
    ["launch_angle", "Avg Launch Angle", "deg", "mean launch angle"],
    ["whiff_rate", "Whiff Rate", "rate", "whiffs / swings"],
    ["chase_rate", "Chase Rate", "rate", "swings outside zone"],
    ["k_pct", "K%", "rate", "strikeout rate"],
    ["bb_pct", "BB%", "rate", "walk rate"],
    ["era", "ERA", "rate", "earned run average"],
    ["fip", "FIP", "rate", "fielding independent pitching"],
    ["xfip", "xFIP", "rate", "expected FIP"],
    ["stuff_plus", "Stuff+", "index", "pitch quality index (GSE)"],
    ["location_plus", "Location+", "index", "command index (GSE)"],
    ["sprint_speed", "Sprint Speed", "ft/s", "Statcast sprint speed"],
  ];
  return rows.map(([id, name, unit, desc]) =>
    m({
      id: `mlb.statcast.${id}`,
      name,
      sport: "MLB",
      family: id.endsWith("_plus") ? "proprietary" : "advanced",
      status: id.endsWith("_plus") ? "DARK" : "CATALOG",
      unit,
      description: `${desc}. Free-legal Baseball Savant / MLB Stats API path.`,
      formulaClass: id,
      sourceIds: ["mlb.statcast", "mlb.statsapi"],
      rights: env(
        id.endsWith("_plus") ? "internal_synthetic" : "free_legal_gov",
        id.endsWith("_plus") ? "dark" : "public_api",
      ),
    }),
  );
}

function nbaFamily(): MetricDef[] {
  const rows: Array<[string, string, string]> = [
    ["pts", "Points", "count"],
    ["reb", "Rebounds", "count"],
    ["ast", "Assists", "count"],
    ["ts_pct", "True Shooting %", "rate"],
    ["usg_pct", "Usage %", "rate"],
    ["pie", "PIE", "rate"],
    ["net_rating", "Net Rating", "rating"],
    ["oreb_pct", "OREB%", "rate"],
    ["dreb_pct", "DREB%", "rate"],
    ["ast_to", "AST/TO", "ratio"],
    ["pace", "Pace", "poss"],
    ["efg_pct", "eFG%", "rate"],
  ];
  return rows.map(([id, name, unit]) =>
    m({
      id: `nba.box.${id}`,
      name,
      sport: "NBA",
      family: "box",
      status: "CATALOG",
      unit,
      description: `NBA ${name} — free-legal stats path (stats.nba.com / CDN).`,
      formulaClass: id,
      sourceIds: ["nba.stats"],
      rights: env("free_legal_gov", "public_api"),
    }),
  );
}

function nhlFamily(): MetricDef[] {
  const rows: Array<[string, string, string]> = [
    ["g", "Goals", "count"],
    ["a", "Assists", "count"],
    ["pts", "Points", "count"],
    ["cf_pct", "CF%", "rate"],
    ["xgf", "xGF", "count"],
    ["hdcf", "HDCF", "count"],
    ["pdo", "PDO", "rate"],
    ["sv_pct", "Save %", "rate"],
    ["gsaa", "GSAA", "count"],
  ];
  return rows.map(([id, name, unit]) =>
    m({
      id: `nhl.adv.${id}`,
      name,
      sport: "NHL",
      family: "advanced",
      status: "CATALOG",
      unit,
      description: `NHL ${name} — MoneyPuck / NHL API free-legal path where cleared.`,
      formulaClass: id,
      sourceIds: ["nhl.moneypuck", "nhl.api"],
      rights: env("free_legal_gov", "public_api"),
    }),
  );
}

function marketFamily(): MetricDef[] {
  const books = ["pinnacle", "circa", "draftkings", "fanduel", "betmgm", "caesars", "consensus"];
  const markets = ["spread", "total", "ml", "player_prop"];
  const out: MetricDef[] = [];
  for (const book of books) {
    for (const market of markets) {
      out.push(
        m({
          id: `mkt.${book}.${market}.price`,
          name: `${book} ${market} price`,
          sport: "MULTI",
          family: "market",
          status: "ACTIVE",
          unit: "american",
          description: `Licensed odds snapshot for ${book} ${market}.`,
          formulaClass: "last_price",
          sourceIds: ["odds.the_odds_api"],
          rights: env("licensed_odds", "pro_api"),
        }),
      );
      out.push(
        m({
          id: `mkt.${book}.${market}.novig`,
          name: `${book} ${market} no-vig`,
          sport: "MULTI",
          family: "market",
          status: "ACTIVE",
          unit: "prob",
          description: `De-vigged implied probability (${book} ${market}).`,
          formulaClass: "shin_or_proportional_devig",
          sourceIds: ["odds.the_odds_api"],
          rights: env("licensed_odds", "pro_api"),
        }),
      );
    }
  }
  // Line movement series
  for (const market of markets) {
    out.push(
      m({
        id: `mkt.move.${market}.open_to_close`,
        name: `${market} open→close move`,
        sport: "MULTI",
        family: "market",
        status: "ACTIVE",
        unit: "prob",
        description: "Consensus open to close probability move.",
        formulaClass: "q_close - q_open",
        sourceIds: ["odds.line_archive"],
        rights: env("licensed_odds", "elite_api"),
      }),
    );
  }
  return out;
}

function fantasyFamily(): MetricDef[] {
  const positions = ["QB", "RB", "WR", "TE", "K", "DST"];
  const out: MetricDef[] = [];
  for (const pos of positions) {
    for (const scoring of ["ppr", "half_ppr", "standard"]) {
      out.push(
        m({
          id: `fan.proj.${pos.toLowerCase()}.${scoring}`,
          name: `${pos} projection (${scoring})`,
          sport: "NFL",
          family: "fantasy",
          status: "CATALOG",
          unit: "fp",
          description: `Season/weekly fantasy projection for ${pos} under ${scoring}.`,
          formulaClass: "gse_projection_v1",
          sourceIds: ["nflverse.player_stats", "model.projection"],
          rights: env("internal_synthetic", "pro_api"),
        }),
      );
    }
  }
  return out;
}

function opticalFamily(): MetricDef[] {
  return [
    m({
      id: "opt.scorebug.clock",
      name: "Scorebug Clock",
      sport: "MULTI",
      family: "optical",
      status: "CATALOG",
      unit: "mm:ss",
      description: "OCR clock from broadcast scorebug. Ship clean≥0.98.",
      formulaClass: "ocr_clock",
      sourceIds: ["optical.scorebug"],
      rights: env("optical_derived", "dark", "Harness CODE_READY; CV PARKED"),
    }),
    m({
      id: "opt.scorebug.score",
      name: "Scorebug Score",
      sport: "MULTI",
      family: "optical",
      status: "CATALOG",
      unit: "pair",
      description: "OCR home/away score from scorebug.",
      formulaClass: "ocr_score",
      sourceIds: ["optical.scorebug"],
      rights: env("optical_derived", "dark"),
    }),
    m({
      id: "opt.formation.personnel",
      name: "Optical Personnel",
      sport: "NFL",
      family: "optical",
      status: "DARK",
      unit: "enum",
      description: "Formation/personnel from vision — second optical signal only after scorebug ships.",
      formulaClass: "cv_personnel",
      sourceIds: ["optical.formation"],
      rights: env("optical_derived", "dark", "Overlay PARKED on MAIN"),
    }),
  ];
}

function calibrationFamily(): MetricDef[] {
  return [
    m({
      id: "cal.brier",
      name: "Brier Score",
      sport: "MULTI",
      family: "calibration",
      status: "ACTIVE",
      unit: "score",
      description: "Brier score on settled selective predictions.",
      formulaClass: "mean((p-y)^2)",
      sourceIds: ["ledger.settled"],
      rights: env("internal_synthetic", "public_api"),
    }),
    m({
      id: "cal.reliability_diagram",
      name: "Reliability Diagram Points",
      sport: "MULTI",
      family: "calibration",
      status: "ACTIVE",
      unit: "series",
      description: "Calibration curve bins for public trust surface.",
      formulaClass: "bin_reliability",
      sourceIds: ["ledger.settled"],
      rights: env("internal_synthetic", "public_api"),
    }),
    m({
      id: "cal.selective_coverage",
      name: "Selective Coverage",
      sport: "MULTI",
      family: "calibration",
      status: "ACTIVE",
      unit: "rate",
      description: "n_fired / n_eligible under selective gate.",
      formulaClass: "n_fire/n_elig",
      sourceIds: ["gate.selective"],
      rights: env("internal_synthetic", "public_api"),
    }),
  ];
}

/** Expand sports×metrics for NCAAF / NCAAB placeholders. */
function collegeFamily(): MetricDef[] {
  const out: MetricDef[] = [];
  for (const sport of ["NCAAF", "NCAAB"] as const) {
    for (const [id, name] of [
      ["sp_plus", "SP+"],
      ["efficiency", "Efficiency"],
      ["tempo", "Tempo"],
      ["recruiting", "Recruiting Composite"],
    ] as const) {
      out.push(
        m({
          id: `${sport.toLowerCase()}.${id}`,
          name: `${sport} ${name}`,
          sport,
          family: "advanced",
          status: "CATALOG",
          unit: "index",
          description: `${name} for ${sport} — rights-reviewed college data path required before ACTIVE.`,
          formulaClass: id,
          sourceIds: ["college.cfbd"],
          rights: env("free_legal_gov", "dark", "Source-rights classification pending founder"),
        }),
      );
    }
  }
  return out;
}

let _cache: MetricDef[] | null = null;

export function getMetricCatalog(): readonly MetricDef[] {
  if (_cache) return _cache;
  _cache = [
    ...PROPRIETARY_CORE,
    ...nflverseFamily(),
    ...mlbFamily(),
    ...nbaFamily(),
    ...nhlFamily(),
    ...marketFamily(),
    ...fantasyFamily(),
    ...opticalFamily(),
    ...calibrationFamily(),
    ...collegeFamily(),
    ...expandAll(),
  ];
  // Dedupe by id (first wins)
  const seen = new Set<string>();
  _cache = _cache.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
  return _cache;
}

export function getMetricById(id: string): MetricDef | null {
  return getMetricCatalog().find((x) => x.id === id) ?? null;
}

export function listMetrics(filter?: {
  sport?: SportCode;
  family?: MetricFamily;
  status?: MetricStatus;
  publicApiOnly?: boolean;
}): MetricDef[] {
  let rows = [...getMetricCatalog()];
  if (filter?.sport) rows = rows.filter((r) => r.sport === filter.sport || r.sport === "MULTI");
  if (filter?.family) rows = rows.filter((r) => r.family === filter.family);
  if (filter?.status) rows = rows.filter((r) => r.status === filter.status);
  if (filter?.publicApiOnly) rows = rows.filter((r) => r.publicApi);
  return rows;
}

export function catalogStats() {
  const all = getMetricCatalog();
  const byStatus: Record<string, number> = {};
  const bySport: Record<string, number> = {};
  const byFamily: Record<string, number> = {};
  let publicApi = 0;
  for (const r of all) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    bySport[r.sport] = (bySport[r.sport] ?? 0) + 1;
    byFamily[r.family] = (byFamily[r.family] ?? 0) + 1;
    if (r.publicApi) publicApi++;
  }
  return {
    total: all.length,
    publicApi,
    byStatus,
    bySport,
    byFamily,
  };
}
