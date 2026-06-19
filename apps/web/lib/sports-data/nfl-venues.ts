/**
 * NFL venue static lookup table.
 * Compiled from nflverse public schedule data (CC-BY-SA 4.0).
 * Attribution: nflverse (nflverse.nflverse.com). Data: CC-BY-SA 4.0.
 * No API calls — static facts baked in.
 */

export type SurfaceType = "grass" | "turf" | "fieldturf" | "astroturf" | "unknown";
export type RoofType = "open" | "closed" | "dome" | "retractable" | "unknown";

export interface NFLVenue {
  readonly teamAbbr: string; // home team abbreviation
  readonly teamName: string;
  readonly city: string;
  readonly stadium: string;
  readonly surface: SurfaceType;
  readonly roof: RoofType;
  readonly altitudeFeet: number; // elevation of the stadium
  readonly timeZone: string; // IANA tz string
  readonly capacityApprox: number;
}

export const NFL_VENUES: readonly NFLVenue[] = [
  { teamAbbr: "ARI", teamName: "Arizona Cardinals", city: "Glendale, AZ", stadium: "State Farm Stadium", surface: "turf", roof: "retractable", altitudeFeet: 1083, timeZone: "America/Phoenix", capacityApprox: 63400 },
  { teamAbbr: "ATL", teamName: "Atlanta Falcons", city: "Atlanta, GA", stadium: "Mercedes-Benz Stadium", surface: "fieldturf", roof: "retractable", altitudeFeet: 1050, timeZone: "America/New_York", capacityApprox: 71000 },
  { teamAbbr: "BAL", teamName: "Baltimore Ravens", city: "Baltimore, MD", stadium: "M&T Bank Stadium", surface: "fieldturf", roof: "open", altitudeFeet: 43, timeZone: "America/New_York", capacityApprox: 71008 },
  { teamAbbr: "BUF", teamName: "Buffalo Bills", city: "Orchard Park, NY", stadium: "Highmark Stadium", surface: "fieldturf", roof: "open", altitudeFeet: 600, timeZone: "America/New_York", capacityApprox: 71608 },
  { teamAbbr: "CAR", teamName: "Carolina Panthers", city: "Charlotte, NC", stadium: "Bank of America Stadium", surface: "grass", roof: "open", altitudeFeet: 751, timeZone: "America/New_York", capacityApprox: 74455 },
  { teamAbbr: "CHI", teamName: "Chicago Bears", city: "Chicago, IL", stadium: "Soldier Field", surface: "grass", roof: "open", altitudeFeet: 587, timeZone: "America/Chicago", capacityApprox: 61500 },
  { teamAbbr: "CIN", teamName: "Cincinnati Bengals", city: "Cincinnati, OH", stadium: "Paycor Stadium", surface: "turf", roof: "open", altitudeFeet: 489, timeZone: "America/New_York", capacityApprox: 65515 },
  { teamAbbr: "CLE", teamName: "Cleveland Browns", city: "Cleveland, OH", stadium: "Huntington Bank Field", surface: "grass", roof: "open", altitudeFeet: 569, timeZone: "America/New_York", capacityApprox: 67895 },
  { teamAbbr: "DAL", teamName: "Dallas Cowboys", city: "Arlington, TX", stadium: "AT&T Stadium", surface: "turf", roof: "retractable", altitudeFeet: 551, timeZone: "America/Chicago", capacityApprox: 80000 },
  { teamAbbr: "DEN", teamName: "Denver Broncos", city: "Denver, CO", stadium: "Empower Field at Mile High", surface: "grass", roof: "open", altitudeFeet: 5280, timeZone: "America/Denver", capacityApprox: 76125 },
  { teamAbbr: "DET", teamName: "Detroit Lions", city: "Detroit, MI", stadium: "Ford Field", surface: "fieldturf", roof: "dome", altitudeFeet: 585, timeZone: "America/Detroit", capacityApprox: 65000 },
  { teamAbbr: "GB", teamName: "Green Bay Packers", city: "Green Bay, WI", stadium: "Lambeau Field", surface: "grass", roof: "open", altitudeFeet: 631, timeZone: "America/Chicago", capacityApprox: 81441 },
  { teamAbbr: "HOU", teamName: "Houston Texans", city: "Houston, TX", stadium: "NRG Stadium", surface: "grass", roof: "retractable", altitudeFeet: 43, timeZone: "America/Chicago", capacityApprox: 72220 },
  { teamAbbr: "IND", teamName: "Indianapolis Colts", city: "Indianapolis, IN", stadium: "Lucas Oil Stadium", surface: "fieldturf", roof: "retractable", altitudeFeet: 715, timeZone: "America/Indiana/Indianapolis", capacityApprox: 67000 },
  { teamAbbr: "JAX", teamName: "Jacksonville Jaguars", city: "Jacksonville, FL", stadium: "EverBank Stadium", surface: "grass", roof: "open", altitudeFeet: 16, timeZone: "America/New_York", capacityApprox: 67814 },
  { teamAbbr: "KC", teamName: "Kansas City Chiefs", city: "Kansas City, MO", stadium: "GEHA Field at Arrowhead Stadium", surface: "grass", roof: "open", altitudeFeet: 910, timeZone: "America/Chicago", capacityApprox: 76416 },
  { teamAbbr: "LA", teamName: "Los Angeles Rams", city: "Inglewood, CA", stadium: "SoFi Stadium", surface: "fieldturf", roof: "dome", altitudeFeet: 89, timeZone: "America/Los_Angeles", capacityApprox: 70240 },
  { teamAbbr: "LAC", teamName: "Los Angeles Chargers", city: "Inglewood, CA", stadium: "SoFi Stadium", surface: "fieldturf", roof: "dome", altitudeFeet: 89, timeZone: "America/Los_Angeles", capacityApprox: 70240 },
  { teamAbbr: "LV", teamName: "Las Vegas Raiders", city: "Las Vegas, NV", stadium: "Allegiant Stadium", surface: "fieldturf", roof: "dome", altitudeFeet: 2001, timeZone: "America/Los_Angeles", capacityApprox: 65000 },
  { teamAbbr: "MIA", teamName: "Miami Dolphins", city: "Miami Gardens, FL", stadium: "Hard Rock Stadium", surface: "grass", roof: "open", altitudeFeet: 9, timeZone: "America/New_York", capacityApprox: 65326 },
  { teamAbbr: "MIN", teamName: "Minnesota Vikings", city: "Minneapolis, MN", stadium: "U.S. Bank Stadium", surface: "fieldturf", roof: "dome", altitudeFeet: 830, timeZone: "America/Chicago", capacityApprox: 66655 },
  { teamAbbr: "NE", teamName: "New England Patriots", city: "Foxborough, MA", stadium: "Gillette Stadium", surface: "fieldturf", roof: "open", altitudeFeet: 151, timeZone: "America/New_York", capacityApprox: 65878 },
  { teamAbbr: "NO", teamName: "New Orleans Saints", city: "New Orleans, LA", stadium: "Caesars Superdome", surface: "fieldturf", roof: "dome", altitudeFeet: 3, timeZone: "America/Chicago", capacityApprox: 73208 },
  { teamAbbr: "NYG", teamName: "New York Giants", city: "East Rutherford, NJ", stadium: "MetLife Stadium", surface: "fieldturf", roof: "open", altitudeFeet: 6, timeZone: "America/New_York", capacityApprox: 82500 },
  { teamAbbr: "NYJ", teamName: "New York Jets", city: "East Rutherford, NJ", stadium: "MetLife Stadium", surface: "fieldturf", roof: "open", altitudeFeet: 6, timeZone: "America/New_York", capacityApprox: 82500 },
  { teamAbbr: "PHI", teamName: "Philadelphia Eagles", city: "Philadelphia, PA", stadium: "Lincoln Financial Field", surface: "fieldturf", roof: "open", altitudeFeet: 20, timeZone: "America/New_York", capacityApprox: 69796 },
  { teamAbbr: "PIT", teamName: "Pittsburgh Steelers", city: "Pittsburgh, PA", stadium: "Acrisure Stadium", surface: "grass", roof: "open", altitudeFeet: 730, timeZone: "America/New_York", capacityApprox: 68400 },
  { teamAbbr: "SEA", teamName: "Seattle Seahawks", city: "Seattle, WA", stadium: "Lumen Field", surface: "fieldturf", roof: "open", altitudeFeet: 21, timeZone: "America/Los_Angeles", capacityApprox: 69000 },
  { teamAbbr: "SF", teamName: "San Francisco 49ers", city: "Santa Clara, CA", stadium: "Levi's Stadium", surface: "grass", roof: "open", altitudeFeet: 52, timeZone: "America/Los_Angeles", capacityApprox: 68500 },
  { teamAbbr: "TB", teamName: "Tampa Bay Buccaneers", city: "Tampa, FL", stadium: "Raymond James Stadium", surface: "grass", roof: "open", altitudeFeet: 15, timeZone: "America/New_York", capacityApprox: 65890 },
  { teamAbbr: "TEN", teamName: "Tennessee Titans", city: "Nashville, TN", stadium: "Nissan Stadium", surface: "fieldturf", roof: "open", altitudeFeet: 390, timeZone: "America/Chicago", capacityApprox: 69143 },
  { teamAbbr: "WAS", teamName: "Washington Commanders", city: "Landover, MD", stadium: "Northwest Stadium", surface: "fieldturf", roof: "open", altitudeFeet: 105, timeZone: "America/New_York", capacityApprox: 82000 },
] as const;

/** Look up venue data by home team abbreviation. Returns undefined if not found. */
export function getNFLVenue(teamAbbr: string): NFLVenue | undefined {
  return NFL_VENUES.find((v) => v.teamAbbr === teamAbbr);
}

/** True if the stadium has artificial turf (any type) */
export function isArtificialTurf(venue: NFLVenue): boolean {
  return ["turf", "fieldturf", "astroturf"].includes(venue.surface);
}

/** True if the stadium is fully enclosed (dome) or has a retractable roof */
export function isIndoor(venue: NFLVenue): boolean {
  return venue.roof === "dome" || venue.roof === "closed" || venue.roof === "retractable";
}

/** True if altitude is significantly elevated (>=2500 feet, as used in betting models) */
export function isHighAltitude(venue: NFLVenue): boolean {
  return venue.altitudeFeet >= 2500;
}
