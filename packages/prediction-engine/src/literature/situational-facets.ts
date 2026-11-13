/**
 * @file situational-facets.ts
 * The single source of truth for corpus-grounding facets.
 *
 * Every caller (slate pipeline, smoke test, future dossier routes) builds its
 * facets here so the queries and anchors are tuned once. Anchors were tuned
 * against the live corpus on 2026-11-12 (see docs/engine/research/2026-11-11/
 * corpus-grounding-live-smoke-TNF-v4.txt):
 *   - qbSkillScript: "rookie"/"script" pulled strength-training citations;
 *     anchors are now quarterback-specific passing words.
 *   - rivalry: "home" alone matched generic home-field modelling; the facet
 *     only fires for divisional games and anchors on rivalry words.
 */
import type { GroundingFacet } from "./corpus-grounding.js";

export interface FacetGameContext {
  readonly isIndoor: boolean;
  readonly windMph?: number | null;
  readonly tempF?: number | null;
  readonly isShortWeekRoad?: boolean;
  readonly isHighAltitudeDenver?: boolean;
  readonly isDivisional?: boolean;
  /** e.g. "Thursday Night Football" */
  readonly window?: string | null;
}

export const FACET_LIBRARY = {
  restFatigue: {
    family: "restFatigue",
    query: "short week rest fatigue recovery between games",
    anchors: ["fatigue", "rest", "recovery", "tired", "congested", "sleep"],
  },
  altitude: {
    family: "restFatigue",
    query: "high altitude endurance oxygen visiting team fatigue",
    anchors: ["altitude", "elevation", "hypoxia", "oxygen"],
  },
  pressure: {
    family: "pressure",
    query: "pass rush pressure blitz quarterback sacks offensive line protection",
    anchors: ["pressure", "blitz", "sack", "sacks", "rush"],
  },
  weather: {
    family: "weather",
    query: "cold wind weather outdoor passing kicking accuracy",
    anchors: ["weather", "wind", "cold", "rain", "snow", "temperature", "precipitation"],
  },
  coveragePersonnel: {
    family: "coveragePersonnel",
    query: "man coverage zone coverage cornerback receiver matchup",
    anchors: ["coverage", "cornerback", "zone", "man-to-man"],
  },
  qbSkillScript: {
    family: "qbSkillScript",
    query: "quarterback passing accuracy completion decision under pressure play action",
    anchors: ["quarterback", "passer", "completion", "cpoe", "play-action"],
  },
  marketMicrostructure: {
    family: "marketMicrostructure",
    query: "betting market point spread closing line odds efficiency",
    anchors: ["betting", "bettors", "sportsbook", "odds", "wager", "spread", "market"],
  },
  rivalry: {
    family: "other",
    query: "divisional rivalry familiarity opponent repeated matchup",
    anchors: ["rivalry", "rival", "divisional", "familiarity"],
  },
  fourthDown: {
    family: "other",
    query: "fourth down decision go for it punt field goal win probability",
    anchors: ["fourth", "4th", "punt"],
  },
} as const satisfies Record<string, Omit<GroundingFacet, "weight">>;

/** Build the facets for one game. Weights reflect whether the spot is live tonight. */
export function facetsForGame(ctx: FacetGameContext): GroundingFacet[] {
  const L = FACET_LIBRARY;
  const out: GroundingFacet[] = [
    { ...L.pressure, weight: 1 },
    { ...L.coveragePersonnel, weight: 0.8 },
    { ...L.qbSkillScript, weight: 0.8 },
    { ...L.marketMicrostructure, weight: 0.5 },
    { ...L.fourthDown, weight: 0.7 },
  ];
  const shortWeek = ctx.isShortWeekRoad === true || /thursday/i.test(ctx.window ?? "");
  out.push({ ...L.restFatigue, weight: shortWeek ? 1 : 0.4 });
  if (!ctx.isIndoor) {
    const harsh = (ctx.windMph ?? 0) >= 11 || (ctx.tempF ?? 70) <= 48;
    out.push({ ...L.weather, weight: harsh ? 1 : 0.3 });
  }
  if (ctx.isHighAltitudeDenver) out.push({ ...L.altitude, weight: 0.8 });
  if (ctx.isDivisional) out.push({ ...L.rivalry, weight: 0.6 });
  return out;
}
