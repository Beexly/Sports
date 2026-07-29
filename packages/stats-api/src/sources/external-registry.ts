/**
 * External leverage registry — free/legal sources OUTSIDE Beexly/Sports.
 * Every row is a research+integration pointer. Ingest only when rights allow.
 *
 * Categories: open data, CV datasets (HF/Roboflow), free APIs, open engines.
 */

export type ExternalKind =
  | "open_data"
  | "cv_dataset"
  | "cv_model"
  | "free_api"
  | "engine"
  | "paper";

export type ExternalRights =
  | "cc_by_4"
  | "cc_by_sa" // hold — share-alike review required
  | "cc0"
  | "research_only"
  | "api_tos"
  | "unknown_review";

export interface ExternalSource {
  readonly id: string;
  readonly name: string;
  readonly kind: ExternalKind;
  readonly url: string;
  readonly rights: ExternalRights;
  readonly sports: readonly string[];
  readonly leverage: string;
  readonly gseMetricPrefixes: readonly string[];
  readonly status: "CATALOG" | "WIRE_NEXT" | "BLOCKED" | "RESEARCH";
}

export const EXTERNAL_SOURCES: readonly ExternalSource[] = [
  // ── Open data ──────────────────────────────────────────
  {
    id: "ext.nflverse",
    name: "nflverse-data",
    kind: "open_data",
    url: "https://github.com/nflverse/nflverse-data",
    rights: "cc_by_4",
    sports: ["NFL"],
    leverage: "Foundation NFL box/pbp/NGS — already primary intake",
    gseMetricPrefixes: ["nfl."],
    status: "WIRE_NEXT",
  },
  {
    id: "ext.mlb_statcast",
    name: "Baseball Savant / Statcast",
    kind: "free_api",
    url: "https://baseballsavant.mlb.com/",
    rights: "api_tos",
    sports: ["MLB"],
    leverage: "Pitch-level tracking free path",
    gseMetricPrefixes: ["mlb."],
    status: "CATALOG",
  },
  {
    id: "ext.mlb_statsapi",
    name: "MLB Stats API",
    kind: "free_api",
    url: "https://statsapi.mlb.com/",
    rights: "api_tos",
    sports: ["MLB"],
    leverage: "Schedules, box, live feed",
    gseMetricPrefixes: ["mlb."],
    status: "CATALOG",
  },
  {
    id: "ext.moneypuck",
    name: "MoneyPuck",
    kind: "open_data",
    url: "https://moneypuck.com/data.htm",
    rights: "api_tos",
    sports: ["NHL"],
    leverage: "xG / skater CSVs free download",
    gseMetricPrefixes: ["nhl."],
    status: "CATALOG",
  },
  {
    id: "ext.openfootball",
    name: "openfootball",
    kind: "open_data",
    url: "https://github.com/openfootball",
    rights: "cc0",
    sports: ["SOCCER"],
    leverage: "CC0 fixtures/results worldwide",
    gseMetricPrefixes: ["soccer."],
    status: "CATALOG",
  },
  {
    id: "ext.cfbd",
    name: "CollegeFootballData API",
    kind: "free_api",
    url: "https://collegefootballdata.com/",
    rights: "api_tos",
    sports: ["NCAAF"],
    leverage: "Advanced CFB metrics free tier",
    gseMetricPrefixes: ["ncaaf."],
    status: "CATALOG",
  },
  {
    id: "ext.henrygd_ncaa",
    name: "henrygd NCAA API",
    kind: "free_api",
    url: "https://github.com/henrygd/ncaa-api",
    rights: "api_tos",
    sports: ["NCAAF", "NCAAB"],
    leverage: "Self-hostable free scores/rankings",
    gseMetricPrefixes: ["ncaaf.", "ncaab."],
    status: "WIRE_NEXT",
  },
  {
    id: "ext.espn_public",
    name: "ESPN public scoreboard API",
    kind: "free_api",
    url: "https://site.api.espn.com/",
    rights: "api_tos",
    sports: ["MULTI"],
    leverage: "Free scores/schedule multi-sport",
    gseMetricPrefixes: ["ctx.", "box."],
    status: "WIRE_NEXT",
  },
  {
    id: "ext.open_meteo",
    name: "Open-Meteo",
    kind: "free_api",
    url: "https://open-meteo.com/",
    rights: "cc_by_4",
    sports: ["MULTI"],
    leverage: "Game weather free",
    gseMetricPrefixes: ["ctx.weather."],
    status: "WIRE_NEXT",
  },
  {
    id: "ext.balldontlie",
    name: "balldontlie NBA API",
    kind: "free_api",
    url: "https://www.balldontlie.io/",
    rights: "api_tos",
    sports: ["NBA"],
    leverage: "Free NBA stats API tier",
    gseMetricPrefixes: ["nba."],
    status: "CATALOG",
  },
  {
    id: "ext.nhl_api",
    name: "NHL Stats API",
    kind: "free_api",
    url: "https://api-web.nhle.com/",
    rights: "api_tos",
    sports: ["NHL"],
    leverage: "Official free endpoints",
    gseMetricPrefixes: ["nhl."],
    status: "CATALOG",
  },
  {
    id: "ext.f1_openf1",
    name: "OpenF1",
    kind: "free_api",
    url: "https://openf1.org/",
    rights: "api_tos",
    sports: ["F1"],
    leverage: "Free F1 telemetry/timing API",
    gseMetricPrefixes: ["f1."],
    status: "CATALOG",
  },
  {
    id: "ext.ergast",
    name: "Jolpica / Ergast F1",
    kind: "free_api",
    url: "https://github.com/jolpica/jolpica-f1",
    rights: "api_tos",
    sports: ["F1"],
    leverage: "Historical F1 results API",
    gseMetricPrefixes: ["f1."],
    status: "CATALOG",
  },
  {
    id: "ext.ufc_stats",
    name: "UFC Stats",
    kind: "open_data",
    url: "http://ufcstats.com/",
    rights: "unknown_review",
    sports: ["MMA"],
    leverage: "Fight stats scrape review required",
    gseMetricPrefixes: ["mma."],
    status: "RESEARCH",
  },
  {
    id: "ext.odds_api",
    name: "The Odds API",
    kind: "free_api",
    url: "https://the-odds-api.com/",
    rights: "api_tos",
    sports: ["MULTI"],
    leverage: "Licensed odds — paid when free credits dry",
    gseMetricPrefixes: ["mkt."],
    status: "WIRE_NEXT",
  },
  {
    id: "ext.kalshi",
    name: "Kalshi public market data",
    kind: "free_api",
    url: "https://kalshi.com/",
    rights: "api_tos",
    sports: ["MULTI"],
    leverage: "Prediction market corroboration only",
    gseMetricPrefixes: ["mkt.pred."],
    status: "CATALOG",
  },

  // ── HuggingFace / CV ───────────────────────────────────
  {
    id: "ext.hf_sportsmot",
    name: "MCG-NJU/SportsMOT",
    kind: "cv_dataset",
    url: "https://huggingface.co/datasets/MCG-NJU/SportsMOT",
    rights: "research_only",
    sports: ["SOCCER", "NBA", "VOLLEYBALL"],
    leverage: "Player MOT benchmark — optical pipeline eval, not commercial scrape",
    gseMetricPrefixes: ["opt.track."],
    status: "RESEARCH",
  },
  {
    id: "ext.hf_teamtrack",
    name: "TeamTrack (full-pitch MOT)",
    kind: "cv_dataset",
    url: "https://arxiv.org/html/2404.13868",
    rights: "research_only",
    sports: ["SOCCER", "NBA", "HANDBALL"],
    leverage: "Full-pitch tracking research benchmark",
    gseMetricPrefixes: ["opt.track."],
    status: "RESEARCH",
  },
  {
    id: "ext.hf_courtside",
    name: "Davidsv/CourtSide-Computer-Vision",
    kind: "cv_model",
    url: "https://huggingface.co/Davidsv/CourtSide-Computer-Vision-v0.1",
    rights: "research_only",
    sports: ["TENNIS"],
    leverage: "Tennis ball YOLO — optical tennis path",
    gseMetricPrefixes: ["opt.tennis."],
    status: "RESEARCH",
  },
  {
    id: "ext.hf_detr",
    name: "facebook/detr-resnet-50",
    kind: "cv_model",
    url: "https://huggingface.co/facebook/detr-resnet-50",
    rights: "research_only",
    sports: ["MULTI"],
    leverage: "Generic DETR for player/ball bootstrap",
    gseMetricPrefixes: ["opt.detect."],
    status: "RESEARCH",
  },
  {
    id: "ext.roboflow_sports",
    name: "Roboflow Sports Universe",
    kind: "cv_dataset",
    url: "https://universe.roboflow.com/browse/sports",
    rights: "unknown_review",
    sports: ["MULTI"],
    leverage: "Scorebug/jersey/ball datasets — license per dataset",
    gseMetricPrefixes: ["opt.scorebug.", "opt.jersey."],
    status: "RESEARCH",
  },
  {
    id: "ext.soccernet",
    name: "SoccerNet",
    kind: "cv_dataset",
    url: "https://www.soccer-net.org/",
    rights: "research_only",
    sports: ["SOCCER"],
    leverage: "Action spotting, tracking, replay — research license",
    gseMetricPrefixes: ["opt.soccer."],
    status: "RESEARCH",
  },
  {
    id: "ext.baseballcv",
    name: "BaseballCV / roboflow baseball",
    kind: "cv_dataset",
    url: "https://github.com/dylandru/BaseballCV",
    rights: "unknown_review",
    sports: ["MLB"],
    leverage: "Pitch/hit vision — ChArUco calib path (PARKED overlay)",
    gseMetricPrefixes: ["opt.baseball."],
    status: "RESEARCH",
  },

  // ── Engines / non-Sports repos ─────────────────────────
  {
    id: "ext.feast",
    name: "Feast feature store",
    kind: "engine",
    url: "https://github.com/feast-dev/feast",
    rights: "api_tos",
    sports: ["MULTI"],
    leverage: "Offline PIT materialization already stubbed",
    gseMetricPrefixes: ["gse."],
    status: "WIRE_NEXT",
  },
  {
    id: "ext.ultralytics",
    name: "Ultralytics YOLO",
    kind: "engine",
    url: "https://github.com/ultralytics/ultralytics",
    rights: "api_tos",
    sports: ["MULTI"],
    leverage: "Scorebug/player detect engine when overlay unparks",
    gseMetricPrefixes: ["opt."],
    status: "RESEARCH",
  },
  {
    id: "ext.supervision",
    name: "roboflow/supervision",
    kind: "engine",
    url: "https://github.com/roboflow/supervision",
    rights: "api_tos",
    sports: ["MULTI"],
    leverage: "Tracking + annotator utilities for optical layer",
    gseMetricPrefixes: ["opt.track."],
    status: "RESEARCH",
  },
  {
    id: "ext.sportsipy",
    name: "sportsipy / sportsreference forks",
    kind: "engine",
    url: "https://github.com/roclark/sportsipy",
    rights: "unknown_review",
    sports: ["MULTI"],
    leverage: "Scrape wrappers — prefer official free APIs first",
    gseMetricPrefixes: [],
    status: "BLOCKED",
  },
];

export function listExternalSources(filter?: {
  kind?: ExternalKind;
  status?: ExternalSource["status"];
  rights?: ExternalRights;
}): ExternalSource[] {
  let rows = [...EXTERNAL_SOURCES];
  if (filter?.kind) rows = rows.filter((r) => r.kind === filter.kind);
  if (filter?.status) rows = rows.filter((r) => r.status === filter.status);
  if (filter?.rights) rows = rows.filter((r) => r.rights === filter.rights);
  return rows;
}

export function externalSourceStats() {
  const byKind: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const s of EXTERNAL_SOURCES) {
    byKind[s.kind] = (byKind[s.kind] ?? 0) + 1;
    byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
  }
  return {
    total: EXTERNAL_SOURCES.length,
    byKind,
    byStatus,
    wireNext: EXTERNAL_SOURCES.filter((s) => s.status === "WIRE_NEXT").map((s) => s.id),
  };
}
