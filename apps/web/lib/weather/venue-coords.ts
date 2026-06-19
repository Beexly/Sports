/**
 * Venue coordinate lookup — maps home team name fragments to lat/lon.
 *
 * Geodata sourced from HIFLD Open (hifld-geoplatform.opendata.arcgis.com),
 * which is registered as "approved_open_license" (US federal public domain)
 * in the Source Rights Registry.
 *
 * Outdoor venues only — dome/indoor venues are omitted because weather is
 * not a meaningful factor for those games.
 *
 * PURE DATA — no network calls.
 */

export interface VenueCoords {
  readonly lat: number;
  readonly lon: number;
  readonly stadium: string;
  readonly isOutdoor: boolean;
}

/**
 * Map from home team name (or fragment) to venue coordinates.
 *
 * Keys are lowercase fragments matched via String.includes() so that
 * "Green Bay Packers" matches the key "packers", etc.
 *
 * Only outdoor/open-air venues are included — dome games are skipped.
 */
const OUTDOOR_VENUES_BY_TEAM_FRAGMENT: ReadonlyMap<string, VenueCoords> = new Map([
  // NFL outdoor venues (source: HIFLD Open / public domain)
  ["packers",    { lat: 44.5013, lon: -88.0622, stadium: "Lambeau Field",           isOutdoor: true }],
  ["bears",      { lat: 41.8623, lon: -87.6167, stadium: "Soldier Field",            isOutdoor: true }],
  ["bills",      { lat: 42.7738, lon: -78.7870, stadium: "Highmark Stadium",         isOutdoor: true }],
  ["patriots",   { lat: 42.0909, lon: -71.2643, stadium: "Gillette Stadium",         isOutdoor: true }],
  ["browns",     { lat: 41.5061, lon: -81.6995, stadium: "Huntington Bank Field",    isOutdoor: true }],
  ["steelers",   { lat: 40.4468, lon: -80.0158, stadium: "Acrisure Stadium",         isOutdoor: true }],
  ["bengals",    { lat: 39.0954, lon: -84.5160, stadium: "Paycor Stadium",           isOutdoor: true }],
  ["chiefs",     { lat: 39.0489, lon: -94.4839, stadium: "Arrowhead Stadium",        isOutdoor: true }],
  ["broncos",    { lat: 39.7439, lon: -105.020, stadium: "Empower Field",            isOutdoor: true }],
  ["eagles",     { lat: 39.9008, lon: -75.1675, stadium: "Lincoln Financial Field",  isOutdoor: true }],
  ["giants",     { lat: 40.8135, lon: -74.0745, stadium: "MetLife Stadium",          isOutdoor: true }],
  ["jets",       { lat: 40.8135, lon: -74.0745, stadium: "MetLife Stadium",          isOutdoor: true }],
  ["commanders", { lat: 38.9077, lon: -76.8645, stadium: "Northwest Stadium",        isOutdoor: true }],
  ["ravens",     { lat: 39.2780, lon: -76.6227, stadium: "M&T Bank Stadium",         isOutdoor: true }],
  ["seahawks",   { lat: 47.5952, lon: -122.332, stadium: "Lumen Field",              isOutdoor: true }],
  ["dolphins",   { lat: 25.9580, lon: -80.2389, stadium: "Hard Rock Stadium",        isOutdoor: true }],
  ["buccaneers", { lat: 27.9759, lon: -82.5033, stadium: "Raymond James Stadium",    isOutdoor: true }],
  ["panthers",   { lat: 35.2258, lon: -80.8528, stadium: "Bank of America Stadium",  isOutdoor: true }],
  ["jaguars",    { lat: 30.3239, lon: -81.6373, stadium: "EverBank Stadium",         isOutdoor: true }],
  ["titans",     { lat: 36.1665, lon: -86.7713, stadium: "Nissan Stadium",           isOutdoor: true }],
  ["raiders",    { lat: 33.5035, lon: -112.263, stadium: "Allegiant Stadium",        isOutdoor: false }],
  ["cardinals",  { lat: 33.5277, lon: -112.263, stadium: "State Farm Stadium",       isOutdoor: false }],

  // MLB outdoor venues
  ["yankees",    { lat: 40.8296, lon: -73.9262, stadium: "Yankee Stadium",           isOutdoor: true }],
  ["red sox",    { lat: 42.3467, lon: -71.0972, stadium: "Fenway Park",              isOutdoor: true }],
  ["cubs",       { lat: 41.9484, lon: -87.6553, stadium: "Wrigley Field",            isOutdoor: true }],
  // White Sox home stadium has a retractable roof — omitted from outdoor venues.
  // ["white sox", ...]  -- roof stadium, weather not a meaningful outdoor factor
  ["pirates",    { lat: 40.4469, lon: -80.0057, stadium: "PNC Park",                 isOutdoor: true }],
  ["cardinals",  { lat: 38.6226, lon: -90.1928, stadium: "Busch Stadium",            isOutdoor: true }],
  ["brewers",    { lat: 43.0280, lon: -87.9712, stadium: "American Family Field",    isOutdoor: false }],
  ["tigers",     { lat: 42.3390, lon: -83.0485, stadium: "Comerica Park",            isOutdoor: true }],
  ["indians",    { lat: 41.4955, lon: -81.6854, stadium: "Progressive Field",        isOutdoor: true }],
  ["guardians",  { lat: 41.4955, lon: -81.6854, stadium: "Progressive Field",        isOutdoor: true }],
  ["royals",     { lat: 39.0517, lon: -94.4803, stadium: "Kauffman Stadium",         isOutdoor: true }],
  ["mets",       { lat: 40.7571, lon: -73.8458, stadium: "Citi Field",               isOutdoor: true }],
  ["phillies",   { lat: 39.9061, lon: -75.1665, stadium: "Citizens Bank Park",       isOutdoor: true }],
  ["nationals",  { lat: 38.8730, lon: -77.0074, stadium: "Nationals Park",           isOutdoor: true }],
  ["orioles",    { lat: 39.2838, lon: -76.6216, stadium: "Camden Yards",             isOutdoor: true }],
  ["blue jays",  { lat: 43.6414, lon: -79.3894, stadium: "Rogers Centre",            isOutdoor: false }],
  ["rangers",    { lat: 32.7512, lon: -97.0832, stadium: "Globe Life Field",         isOutdoor: false }],
  ["astros",     { lat: 29.7573, lon: -95.3555, stadium: "Minute Maid Park",         isOutdoor: false }],
  ["athletics",  { lat: 37.7516, lon: -122.200, stadium: "Oakland Coliseum",         isOutdoor: true }],
  ["mariners",   { lat: 47.5913, lon: -122.332, stadium: "T-Mobile Park",            isOutdoor: false }],
  ["angels",     { lat: 33.8003, lon: -117.882, stadium: "Angel Stadium",            isOutdoor: true }],
  ["dodgers",    { lat: 34.0739, lon: -118.240, stadium: "Dodger Stadium",           isOutdoor: true }],
  ["padres",     { lat: 32.7076, lon: -117.157, stadium: "Petco Park",               isOutdoor: true }],
  ["giants sf",  { lat: 37.7786, lon: -122.389, stadium: "Oracle Park",              isOutdoor: true }],
  ["rockies",    { lat: 39.7559, lon: -104.994, stadium: "Coors Field",              isOutdoor: true }],
  ["diamondbacks", { lat: 33.4453, lon: -112.067, stadium: "Chase Field",            isOutdoor: false }],
]);

/**
 * Look up the venue coordinates for a home team by name.
 *
 * Matches by checking if any registered fragment appears in the lowercased
 * team name. Returns undefined if no match (dome teams, unrecognized teams,
 * or teams without registered coordinates).
 *
 * Show weather for outdoor venues only; the caller may choose to show for
 * all games if they prefer not to discriminate.
 */
export function lookupVenueCoords(homeTeamName: string): VenueCoords | undefined {
  const lower = homeTeamName.toLowerCase();
  for (const [fragment, coords] of OUTDOOR_VENUES_BY_TEAM_FRAGMENT) {
    if (lower.includes(fragment)) return coords;
  }
  return undefined;
}
