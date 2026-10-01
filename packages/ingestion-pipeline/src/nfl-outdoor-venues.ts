/**
 * Outdoor NFL venues. Copied from apps/web/lib/weather/game-weather.ts so the
 * slate can ask the National Weather Service without importing the web app.
 * A team absent from this table is not treated as a dome. Absence means we
 * do not have a coordinate, and weather abstains.
 */
export interface OutdoorVenue {
  readonly stadium: string;
  readonly lat: number;
  readonly lon: number;
}

export const OUTDOOR_NFL_VENUES: Readonly<Record<string, OutdoorVenue>> = {
  GB: { stadium: "Lambeau Field", lat: 44.5013, lon: -88.0622 },
  CHI: { stadium: "Soldier Field", lat: 41.8623, lon: -87.6167 },
  BUF: { stadium: "Highmark Stadium", lat: 42.7738, lon: -78.787 },
  NE: { stadium: "Gillette Stadium", lat: 42.0909, lon: -71.2643 },
  CLE: { stadium: "Huntington Bank Field", lat: 41.5061, lon: -81.6995 },
  PIT: { stadium: "Acrisure Stadium", lat: 40.4468, lon: -80.0158 },
  CIN: { stadium: "Paycor Stadium", lat: 39.0954, lon: -84.516 },
  KC: { stadium: "Arrowhead Stadium", lat: 39.0489, lon: -94.4839 },
  DEN: { stadium: "Empower Field", lat: 39.7439, lon: -105.02 },
  PHI: { stadium: "Lincoln Financial Field", lat: 39.9008, lon: -75.1675 },
  NYJ: { stadium: "MetLife Stadium", lat: 40.8135, lon: -74.0745 },
  NYG: { stadium: "MetLife Stadium", lat: 40.8135, lon: -74.0745 },
  WAS: { stadium: "Northwest Stadium", lat: 38.9077, lon: -76.8645 },
  BAL: { stadium: "M&T Bank Stadium", lat: 39.278, lon: -76.6227 },
  SEA: { stadium: "Lumen Field", lat: 47.5952, lon: -122.3316 },
  MIA: { stadium: "Hard Rock Stadium", lat: 25.958, lon: -80.2389 },
  TB: { stadium: "Raymond James Stadium", lat: 27.9759, lon: -82.5033 },
  CAR: { stadium: "Bank of America Stadium", lat: 35.2258, lon: -80.8528 },
  JAX: { stadium: "EverBank Stadium", lat: 30.3239, lon: -81.6373 },
  TEN: { stadium: "Nissan Stadium", lat: 36.1665, lon: -86.7713 },
};
