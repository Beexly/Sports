/**
 * Home venues.
 *
 * The `games` table has no venue column, so `loadGameIdentity` returns MISSING
 * for `identity.venue` and the weather loader has nothing to resolve. Rather
 * than invent a stadium per game, this table maps a canonical home team to the
 * venue it actually plays in. It is a static fact about the league, not a
 * measurement, and it is the only place a stadium name is allowed to come from.
 *
 * A team not in this table yields null, and the weather loader reports MISSING.
 * It never falls back to Denver.
 */

import type { NflTeamCode } from "@sports/prediction-engine/src/evidence/team-codes.js";

export interface HomeVenue {
  readonly venue: string;
  readonly city: string;
  readonly state: string;
  readonly indoor: boolean;
}

export const HOME_VENUES: Readonly<Record<NflTeamCode, HomeVenue>> = {
  ARI: { venue: "State Farm Stadium", city: "Glendale", state: "AZ", indoor: true },
  ATL: { venue: "Mercedes-Benz Stadium", city: "Atlanta", state: "GA", indoor: true },
  BAL: { venue: "M&T Bank Stadium", city: "Baltimore", state: "MD", indoor: false },
  BUF: { venue: "Highmark Stadium", city: "Orchard Park", state: "NY", indoor: false },
  CAR: { venue: "Bank of America Stadium", city: "Charlotte", state: "NC", indoor: false },
  CHI: { venue: "Soldier Field", city: "Chicago", state: "IL", indoor: false },
  CIN: { venue: "Paycor Stadium", city: "Cincinnati", state: "OH", indoor: false },
  CLE: { venue: "Huntington Bank Field", city: "Cleveland", state: "OH", indoor: false },
  DAL: { venue: "AT&T Stadium", city: "Arlington", state: "TX", indoor: true },
  DEN: { venue: "Empower Field at Mile High", city: "Denver", state: "CO", indoor: false },
  DET: { venue: "Ford Field", city: "Detroit", state: "MI", indoor: true },
  GB: { venue: "Lambeau Field", city: "Green Bay", state: "WI", indoor: false },
  HOU: { venue: "NRG Stadium", city: "Houston", state: "TX", indoor: true },
  IND: { venue: "Lucas Oil Stadium", city: "Indianapolis", state: "IN", indoor: true },
  JAX: { venue: "EverBank Stadium", city: "Jacksonville", state: "FL", indoor: false },
  KC: { venue: "GEHA Field at Arrowhead Stadium", city: "Kansas City", state: "MO", indoor: false },
  LAC: { venue: "SoFi Stadium", city: "Inglewood", state: "CA", indoor: true },
  LAR: { venue: "SoFi Stadium", city: "Inglewood", state: "CA", indoor: true },
  LV: { venue: "Allegiant Stadium", city: "Las Vegas", state: "NV", indoor: true },
  MIA: { venue: "Hard Rock Stadium", city: "Miami Gardens", state: "FL", indoor: false },
  MIN: { venue: "U.S. Bank Stadium", city: "Minneapolis", state: "MN", indoor: true },
  NE: { venue: "Gillette Stadium", city: "Foxborough", state: "MA", indoor: false },
  NO: { venue: "Caesars Superdome", city: "New Orleans", state: "LA", indoor: true },
  NYG: { venue: "MetLife Stadium", city: "East Rutherford", state: "NJ", indoor: false },
  NYJ: { venue: "MetLife Stadium", city: "East Rutherford", state: "NJ", indoor: false },
  PHI: { venue: "Lincoln Financial Field", city: "Philadelphia", state: "PA", indoor: false },
  PIT: { venue: "Acrisure Stadium", city: "Pittsburgh", state: "PA", indoor: false },
  SEA: { venue: "Lumen Field", city: "Seattle", state: "WA", indoor: false },
  SF: { venue: "Levi's Stadium", city: "Santa Clara", state: "CA", indoor: false },
  TB: { venue: "Raymond James Stadium", city: "Tampa", state: "FL", indoor: false },
  TEN: { venue: "Nissan Stadium", city: "Nashville", state: "TN", indoor: false },
  WSH: { venue: "Northwest Stadium", city: "Landover", state: "MD", indoor: false },
};

export function homeVenue(team: NflTeamCode): HomeVenue | null {
  return HOME_VENUES[team] ?? null;
}
