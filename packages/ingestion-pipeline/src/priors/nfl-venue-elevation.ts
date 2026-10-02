/**
 * USGS 3DEP point elevation, feet, at the outdoor-venue coordinate already
 * in nfl-outdoor-venues.ts. Queried 2026-10-01 from
 * https://epqs.nationalmap.gov/v1/json (units=Feet, wkid=4326).
 * A club absent from this table was not queried. Absence is not sea level.
 */
export const NFL_VENUE_ELEVATION_FT: Readonly<Record<string, number>> = {
  GB: 619.8,
  CHI: 585.5,
  BUF: 720.2,
  NE: 260.4,
  CLE: 583.2,
  PIT: 724.0,
  CIN: 480.2,
  KC: 886.2,
  DEN: 5194.9,
  PHI: 10.9,
  NYJ: 5.9,
  NYG: 5.9,
  WAS: 195.8,
  BAL: 9.6,
  SEA: 18.1,
  MIA: 8.4,
  TB: 36.2,
  CAR: 707.9,
  JAX: 4.5,
  TEN: 397.4,
};
