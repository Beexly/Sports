/**
 * GSE Open-Source & Data Adoption Ledger — "what already exists that we can
 * adopt" as a rights-aware, scorable registry.
 *
 * Answers the question "what have people already built that we can use?" without
 * ever overstating what is legally usable. Each resource carries a license CLASS
 * and an explicit `commercialOk` verdict (true / false / null=unverified) mapped
 * onto the GSE source-rights vocabulary. The adoption score HARD-CAPS anything
 * that is non-commercial or unverified, so a tempting dataset (e.g. StatsBomb
 * Open Data — research-only) can never rank as "adopt now".
 *
 * License facts here are conservative seeds; the authoritative, web-verified
 * detail (with the landmines) lives in
 * docs/research/GSE_2026_OPEN_SOURCE_AND_DATA_LEDGER.md. Verify before depending
 * on any entry commercially.
 */

import type { SourceRightsStatus } from "@/lib/scraping/source-rights-registry";
import { type GseScore, makeScore } from "./gse-scoring-systems";

export type ResourceType = "repo" | "dataset" | "model" | "library" | "api";

export type LicenseClass =
  | "public_domain" // CC0 / Unlicense
  | "permissive" // MIT / BSD / Apache
  | "copyleft" // GPL family
  | "share_alike" // CC BY-SA — derivatives must share alike
  | "non_commercial" // CC BY-NC / research-only — NOT for commercial use
  | "proprietary_api" // licensed API with commercial terms
  | "unknown";

export type IntegrationStatus = "have" | "partial" | "candidate" | "gap";

export interface ExternalResource {
  readonly id: string;
  readonly name: string;
  readonly type: ResourceType;
  readonly url: string;
  readonly license: string;
  readonly licenseClass: LicenseClass;
  /** true = commercial use OK; false = not OK; null = unverified (treat as risk). */
  readonly commercialOk: boolean | null;
  readonly rightsStatus: SourceRightsStatus;
  readonly domain: string;
  readonly whatItGives: string;
  readonly integrationStatus: IntegrationStatus;
  /** 0..1 value to GSE if adopted. */
  readonly valueToGse: number;
  /** 0..1 integration cost (higher = more work). */
  readonly integrationCost: number;
  readonly note: string;
}

export const EXTERNAL_RESOURCES: readonly ExternalResource[] = [
  // ── data (sport) ──────────────────────────────────────────────────────────
  { id: "nflverse", name: "nflverse (nflfastR / nfl_data_py)", type: "dataset", url: "https://github.com/nflverse", license: "CC-BY-4.0 (data) / MIT (code)", licenseClass: "permissive", commercialOk: true, rightsStatus: "approved_open_license", domain: "NFL play-by-play + rosters", whatItGives: "Free EPA/WP-grade NFL data with attribution.", integrationStatus: "partial", valueToGse: 0.95, integrationCost: 0.3, note: "Attribution required. Repo already has an nflverse adapter — deepen it." },
  { id: "lahman", name: "Lahman Baseball Database", type: "dataset", url: "https://sabr.org/lahman-database/", license: "CC BY-SA 3.0", licenseClass: "share_alike", commercialOk: true, rightsStatus: "approved_open_license", domain: "MLB historical", whatItGives: "Deep historical MLB stats.", integrationStatus: "partial", valueToGse: 0.7, integrationCost: 0.25, note: "Share-alike: derivatives that redistribute the data must license alike. Repo has a lahman lib." },
  { id: "retrosheet", name: "Retrosheet", type: "dataset", url: "https://www.retrosheet.org", license: "Custom (attribution notice required)", licenseClass: "permissive", commercialOk: true, rightsStatus: "approved_open_license", domain: "MLB play-by-play", whatItGives: "Play-by-play MLB back decades.", integrationStatus: "candidate", valueToGse: 0.7, integrationCost: 0.45, note: "Must reproduce Retrosheet's required attribution notice verbatim." },
  { id: "statcast", name: "Statcast / Baseball Savant", type: "api", url: "https://baseballsavant.mlb.com", license: "MLBAM terms (no formal commercial license)", licenseClass: "unknown", commercialOk: null, rightsStatus: "permission_required", domain: "MLB tracking", whatItGives: "Pitch/hit tracking + xStats.", integrationStatus: "candidate", valueToGse: 0.85, integrationCost: 0.5, note: "Widely used in research; commercial terms unclear — verify before commercial display." },
  { id: "hoopr", name: "hoopR / sportsdataverse", type: "repo", url: "https://github.com/sportsdataverse", license: "MIT", licenseClass: "permissive", commercialOk: true, rightsStatus: "approved_open_license", domain: "NBA/CBB", whatItGives: "Free basketball data + loaders.", integrationStatus: "candidate", valueToGse: 0.75, integrationCost: 0.35, note: "Underlying data may carry source terms — check provenance." },
  { id: "statsbomb_open", name: "StatsBomb Open Data", type: "dataset", url: "https://github.com/statsbomb/open-data", license: "Non-commercial research user agreement", licenseClass: "non_commercial", commercialOk: false, rightsStatus: "permission_required", domain: "Soccer events", whatItGives: "Event + 360 data for select comps.", integrationStatus: "gap", valueToGse: 0.6, integrationCost: 0.4, note: "LANDMINE: looks free, is research-only. Commercial use needs a paid Hudl StatsBomb license. Do NOT ship." },
  { id: "understat", name: "Understat (xG)", type: "dataset", url: "https://understat.com", license: "No published commercial license", licenseClass: "unknown", commercialOk: false, rightsStatus: "permission_required", domain: "Soccer xG", whatItGives: "Free xG/xA for top-5 leagues.", integrationStatus: "gap", valueToGse: 0.55, integrationCost: 0.4, note: "No official API or commercial terms; commonly scraped. Treat as permission-required." },
  { id: "footballdata_couk", name: "Football-Data.co.uk", type: "dataset", url: "https://www.football-data.co.uk", license: "Free use (attribution)", licenseClass: "unknown", commercialOk: null, rightsStatus: "approved_public_logged_off", domain: "Soccer results + odds", whatItGives: "Historical results + closing odds CSVs.", integrationStatus: "candidate", valueToGse: 0.6, integrationCost: 0.2, note: "Long-standing free CSVs; commercial terms ambiguous — verify." },
  { id: "openfootball", name: "OpenFootball", type: "dataset", url: "https://github.com/openfootball", license: "Public Domain (CC0 / Unlicense)", licenseClass: "public_domain", commercialOk: true, rightsStatus: "approved_open_license", domain: "Soccer fixtures", whatItGives: "Open fixtures/results datasets.", integrationStatus: "candidate", valueToGse: 0.45, integrationCost: 0.25, note: "Public domain — safest soccer schedule source." },
  { id: "cfbd", name: "CollegeFootballData (CFBD)", type: "api", url: "https://collegefootballdata.com", license: "Free with key (generous terms)", licenseClass: "proprietary_api", commercialOk: true, rightsStatus: "approved_api", domain: "CFB", whatItGives: "Rich free college football API.", integrationStatus: "candidate", valueToGse: 0.7, integrationCost: 0.3, note: "Generous terms; confirm rate limits + attribution." },
  { id: "balldontlie", name: "balldontlie", type: "api", url: "https://balldontlie.io", license: "Freemium API terms", licenseClass: "proprietary_api", commercialOk: true, rightsStatus: "approved_api", domain: "NBA", whatItGives: "Simple NBA stats API.", integrationStatus: "candidate", valueToGse: 0.5, integrationCost: 0.2, note: "Good for a quick NBA backfill; verify paid-tier commercial terms." },
  { id: "the_odds_api", name: "The Odds API", type: "api", url: "https://the-odds-api.com", license: "Commercial subscription", licenseClass: "proprietary_api", commercialOk: true, rightsStatus: "approved_api", domain: "Odds", whatItGives: "Multi-book odds (already the primary feed).", integrationStatus: "have", valueToGse: 0.9, integrationCost: 0.1, note: "Already integrated. Diversify with a fallback odds source (single-feed risk)." },
  { id: "open_meteo", name: "Open-Meteo", type: "api", url: "https://open-meteo.com", license: "CC-BY 4.0 (free non-commercial; paid commercial)", licenseClass: "unknown", commercialOk: null, rightsStatus: "approved_api", domain: "Weather", whatItGives: "Free weather for game environments.", integrationStatus: "have", valueToGse: 0.6, integrationCost: 0.1, note: "Already used. Free tier is non-commercial; commercial needs a paid plan — VERIFY current usage tier." },
  { id: "espn_endpoints", name: "ESPN hidden endpoints", type: "api", url: "https://www.espn.com", license: "No official public terms (unofficial)", licenseClass: "unknown", commercialOk: false, rightsStatus: "permission_required", domain: "Scores/news", whatItGives: "Free scores/standings (repo uses adapters).", integrationStatus: "have", valueToGse: 0.55, integrationCost: 0.15, note: "RISK: undocumented/unofficial — can change or be blocked. Keep a licensed fallback; do not depend on it for paid claims." },

  // ── modeling libraries (for a Python worker or TS runtime) ────────────────
  { id: "scikit_learn", name: "scikit-learn", type: "library", url: "https://scikit-learn.org", license: "BSD-3-Clause", licenseClass: "permissive", commercialOk: true, rightsStatus: "approved_open_license", domain: "ML (Python)", whatItGives: "Calibration (Platt/isotonic), GBMs, pipelines.", integrationStatus: "candidate", valueToGse: 0.8, integrationCost: 0.4, note: "Python — fits a model-training worker, not the TS app runtime." },
  { id: "xgboost", name: "XGBoost / LightGBM", type: "library", url: "https://xgboost.ai", license: "Apache-2.0 / MIT", licenseClass: "permissive", commercialOk: true, rightsStatus: "approved_open_license", domain: "ML (Python)", whatItGives: "Strong tabular learners for projections.", integrationStatus: "candidate", valueToGse: 0.75, integrationCost: 0.45, note: "Train offline; export to ONNX for TS inference." },
  { id: "mapie", name: "MAPIE (conformal)", type: "library", url: "https://github.com/scikit-learn-contrib/MAPIE", license: "BSD-3-Clause", licenseClass: "permissive", commercialOk: true, rightsStatus: "approved_open_license", domain: "Uncertainty (Python)", whatItGives: "Distribution-free prediction intervals.", integrationStatus: "candidate", valueToGse: 0.7, integrationCost: 0.4, note: "Pairs with the new splitConformalHalfWidth primitive for richer intervals." },
  { id: "river", name: "River (online learning)", type: "library", url: "https://riverml.xyz", license: "BSD-3-Clause", licenseClass: "permissive", commercialOk: true, rightsStatus: "approved_open_license", domain: "Streaming ML (Python)", whatItGives: "Online/incremental models + drift detectors (ADWIN).", integrationStatus: "candidate", valueToGse: 0.7, integrationCost: 0.45, note: "Backs the self-learning loop's drift + online-update steps." },
  { id: "optuna", name: "Optuna", type: "library", url: "https://optuna.org", license: "MIT", licenseClass: "permissive", commercialOk: true, rightsStatus: "approved_open_license", domain: "HPO (Python)", whatItGives: "Hyperparameter search for model candidates.", integrationStatus: "candidate", valueToGse: 0.5, integrationCost: 0.35, note: "Use in the challenger-training pipeline." },
  { id: "onnx_runtime", name: "ONNX Runtime (Node)", type: "library", url: "https://onnxruntime.ai", license: "MIT", licenseClass: "permissive", commercialOk: true, rightsStatus: "approved_open_license", domain: "Inference (TS/Node)", whatItGives: "Run exported models inside the Node app.", integrationStatus: "candidate", valueToGse: 0.75, integrationCost: 0.4, note: "The bridge: train in Python, infer in TS — keeps the app dependency-light." },
  { id: "danfojs", name: "danfo.js", type: "library", url: "https://danfo.jsdata.org", license: "MIT", licenseClass: "permissive", commercialOk: true, rightsStatus: "approved_open_license", domain: "Dataframes (TS)", whatItGives: "Pandas-like data wrangling in JS/TS.", integrationStatus: "candidate", valueToGse: 0.45, integrationCost: 0.3, note: "Optional — only if heavy in-app data wrangling is needed." },
] as const;

/** Look up a resource by id. */
export function getResource(id: string): ExternalResource | undefined {
  return EXTERNAL_RESOURCES.find((r) => r.id === id);
}

/**
 * Score how worth adopting a resource is (0..100, higher = adopt sooner).
 * Commercial-use is a HARD gate: a non-commercial / not-OK license caps the
 * score into the very-low band, and an UNVERIFIED license is capped at "moderate"
 * with a flag — we never rank an unconfirmed-rights resource as adopt-now.
 */
export function scoreAdoptionValue(r: ExternalResource): GseScore {
  const flags: string[] = [];
  const licenseSafety = r.commercialOk === true ? 1.0 : r.commercialOk === null ? 0.5 : 0.1;

  let score = Math.max(0, Math.min(1, r.valueToGse)) * 100 * licenseSafety - Math.max(0, Math.min(1, r.integrationCost)) * 25;

  if (r.commercialOk === false) {
    score = Math.min(score, 18);
    flags.push("commercial use NOT permitted — do not adopt for production");
  } else if (r.commercialOk === null) {
    score = Math.min(score, 58);
    flags.push("commercial rights UNVERIFIED — confirm license before depending on it");
  }
  if (r.licenseClass === "share_alike") flags.push("share-alike: redistributed derivatives must license alike");
  if (r.integrationStatus === "have") flags.push("already integrated — opportunity is to harden/diversify, not adopt");
  if (r.rightsStatus === "permission_required" || r.rightsStatus === "excluded") {
    flags.push(`rights status ${r.rightsStatus} — clearance required`);
  }

  return makeScore("adoption_value", score, {
    confidence: r.commercialOk === null ? "tentative" : "supported",
    rationale: [
      `value ${(r.valueToGse * 100).toFixed(0)}%`,
      `license ${r.licenseClass}`,
      `commercial ${r.commercialOk === null ? "unverified" : r.commercialOk ? "ok" : "no"}`,
      `status ${r.integrationStatus}`,
    ],
    flags,
  });
}

export interface ScoredResource {
  readonly resource: ExternalResource;
  readonly adoption: GseScore;
}

/** Resources ranked by adoption value (highest first). */
export function rankAdoption(): readonly ScoredResource[] {
  return EXTERNAL_RESOURCES.map((resource) => ({ resource, adoption: scoreAdoptionValue(resource) })).sort(
    (a, b) => b.adoption.score - a.adoption.score,
  );
}

/** The "adopt this week" set: commercial-OK, not already integrated, high score. */
export function adoptableNow(threshold = 55): readonly ScoredResource[] {
  return rankAdoption().filter(
    (s) => s.resource.commercialOk === true && s.resource.integrationStatus !== "have" && s.adoption.score >= threshold,
  );
}
