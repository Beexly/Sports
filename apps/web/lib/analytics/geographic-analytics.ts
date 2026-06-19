/**
 * Geographic Analytics
 *
 * Pure TypeScript geographic / location-based analytics for the Galaxy Sports
 * Edge prediction platform. Covers geospatial distance, team travel / scheduling,
 * regional user distribution, geo conversions, clustering / proximity, market /
 * venue analytics, and home-field adjustments.
 *
 * Zero npm dependencies — Node built-ins / pure math only.
 */

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface IdentifiedGeoPoint extends GeoPoint {
  id: string;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface RegionUser {
  region: string;
}

export interface RegionRevenueInput {
  region: string;
  users: number;
  arpu: number;
}

export interface GeoTargetingRegion {
  users: number;
  conversionRate: number;
  arpu: number;
}

const DEFAULT_EARTH_RADIUS_KM = 6371;
const KM_PER_MILE = 1.609344;
const MILES_PER_KM = 0.621371;

// ---------------------------------------------------------------------------
// 4. Geo-conversion & format (defined early — reused by section 1)
// ---------------------------------------------------------------------------

/** Convert kilometers to miles. */
export function kmToMiles(km: number): number {
  return km * MILES_PER_KM;
}

/** Convert miles to kilometers. */
export function milesToKm(miles: number): number {
  return miles * KM_PER_MILE;
}

/** Convert degrees to radians. */
export function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Convert radians to degrees. */
export function radiansToDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Format a coordinate value with a hemisphere letter.
 * Latitude → N (>=0) / S (<0); Longitude → E (>=0) / W (<0).
 */
export function formatCoordinate(value: number, type: 'lat' | 'lon'): string {
  const positive = type === 'lat' ? 'N' : 'E';
  const negative = type === 'lat' ? 'S' : 'W';
  // Treat -0 as positive hemisphere for clean output.
  const hemisphere = value < 0 ? negative : positive;
  const magnitude = Math.abs(value);
  return `${magnitude.toFixed(4)}° ${hemisphere}`;
}

// ---------------------------------------------------------------------------
// 1. Geospatial distance
// ---------------------------------------------------------------------------

/**
 * Great-circle distance between two points using the haversine formula.
 * Returns kilometers (default Earth radius 6371 km).
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  earthRadiusKm: number = DEFAULT_EARTH_RADIUS_KM,
): number {
  const phi1 = degreesToRadians(lat1);
  const phi2 = degreesToRadians(lat2);
  const deltaPhi = degreesToRadians(lat2 - lat1);
  const deltaLambda = degreesToRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

/**
 * Initial bearing (forward azimuth) from point 1 to point 2.
 * Returns degrees normalized to the 0–360 range.
 */
export function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = degreesToRadians(lat1);
  const phi2 = degreesToRadians(lat2);
  const deltaLambda = degreesToRadians(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);

  return (radiansToDegrees(theta) + 360) % 360;
}

/**
 * Geographic midpoint along the great circle between two points.
 */
export function midpoint(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): { lat: number; lon: number } {
  const phi1 = degreesToRadians(lat1);
  const phi2 = degreesToRadians(lat2);
  const lambda1 = degreesToRadians(lon1);
  const deltaLambda = degreesToRadians(lon2 - lon1);

  const bx = Math.cos(phi2) * Math.cos(deltaLambda);
  const by = Math.cos(phi2) * Math.sin(deltaLambda);

  const phiMid = Math.atan2(
    Math.sin(phi1) + Math.sin(phi2),
    Math.sqrt((Math.cos(phi1) + bx) * (Math.cos(phi1) + bx) + by * by),
  );
  const lambdaMid = lambda1 + Math.atan2(by, Math.cos(phi1) + bx);

  // Normalize longitude to -180..180.
  const lonMid = ((radiansToDegrees(lambdaMid) + 540) % 360) - 180;

  return { lat: radiansToDegrees(phiMid), lon: lonMid };
}

/**
 * Axis-aligned bounding box covering all points. Null if no points.
 */
export function boundingBox(points: { lat: number; lon: number }[]): BoundingBox | null {
  if (points.length === 0) {
    return null;
  }

  const first = points[0] ?? { lat: 0, lon: 0 };
  let minLat = first.lat;
  let maxLat = first.lat;
  let minLon = first.lon;
  let maxLon = first.lon;

  for (let i = 1; i < points.length; i += 1) {
    const p = points[i] ?? { lat: 0, lon: 0 };
    if (p.lat < minLat) {
      minLat = p.lat;
    }
    if (p.lat > maxLat) {
      maxLat = p.lat;
    }
    if (p.lon < minLon) {
      minLon = p.lon;
    }
    if (p.lon > maxLon) {
      maxLon = p.lon;
    }
  }

  return { minLat, maxLat, minLon, maxLon };
}

/**
 * Simple arithmetic centroid (average lat/lon). Null if no points.
 * Note: this is a naive average and not a true spherical centroid.
 */
export function centroid(points: { lat: number; lon: number }[]): { lat: number; lon: number } | null {
  if (points.length === 0) {
    return null;
  }

  let sumLat = 0;
  let sumLon = 0;
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i] ?? { lat: 0, lon: 0 };
    sumLat += p.lat;
    sumLon += p.lon;
  }

  return { lat: sumLat / points.length, lon: sumLon / points.length };
}

// ---------------------------------------------------------------------------
// 2. Travel / scheduling (team travel)
// ---------------------------------------------------------------------------

/**
 * Total great-circle distance (km) along an ordered list of stops.
 */
export function travelDistance(stops: { lat: number; lon: number }[]): number {
  if (stops.length < 2) {
    return 0;
  }

  let total = 0;
  for (let i = 1; i < stops.length; i += 1) {
    const a = stops[i - 1] ?? { lat: 0, lon: 0 };
    const b = stops[i] ?? { lat: 0, lon: 0 };
    total += haversineDistance(a.lat, a.lon, b.lat, b.lon);
  }

  return total;
}

/**
 * Rough timezone offset (hours) derived from longitude.
 * offset = round(lon / 15), clamped to the valid -12..14 range.
 */
export function timeZoneOffsetHours(lon: number): number {
  const raw = Math.round(lon / 15);
  return Math.max(-12, Math.min(14, raw));
}

/**
 * Jet-lag severity = absolute difference in rough timezone offsets between
 * origin and destination longitudes. Range 0–14 (eastward dest can reach +14).
 */
export function jetLagSeverity(originLon: number, destLon: number): number {
  return Math.abs(timeZoneOffsetHours(destLon) - timeZoneOffsetHours(originLon));
}

/**
 * Rest advantage for the home side: awayTravel - homeTravel.
 * Positive => home team traveled less (more rested).
 */
export function restAdvantage(homeTravelKm: number, awayTravelKm: number): number {
  return awayTravelKm - homeTravelKm;
}

/**
 * Back-to-back fatigue index. Higher travel and fewer rest days both raise it.
 * (travelKm / 1000) / max(daysBetweenGames, 0.5).
 */
export function backToBackPenalty(daysBetweenGames: number, travelKm: number): number {
  const denom = Math.max(daysBetweenGames, 0.5);
  return travelKm / 1000 / denom;
}

// ---------------------------------------------------------------------------
// 3. Regional distribution
// ---------------------------------------------------------------------------

/**
 * Count of users per region.
 */
export function regionDistribution(users: { region: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < users.length; i += 1) {
    const region = users[i]?.region ?? '';
    counts.set(region, (counts.get(region) ?? 0) + 1);
  }
  return counts;
}

/**
 * Fraction of users per region (shares sum to 1). Empty map if no users.
 */
export function regionShare(users: { region: string }[]): Map<string, number> {
  const shares = new Map<string, number>();
  const total = users.length;
  if (total === 0) {
    return shares;
  }

  const counts = regionDistribution(users);
  for (const [region, count] of counts) {
    shares.set(region, count / total);
  }
  return shares;
}

/**
 * Top n regions by count, ties broken alphabetically by region name.
 */
export function topRegions(
  users: { region: string }[],
  n: number = 5,
): { region: string; count: number }[] {
  const counts = regionDistribution(users);
  const entries: { region: string; count: number }[] = [];
  for (const [region, count] of counts) {
    entries.push({ region, count });
  }

  entries.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.region < b.region ? -1 : a.region > b.region ? 1 : 0;
  });

  if (n < 0) {
    return [];
  }
  return entries.slice(0, n);
}

/**
 * Herfindahl-Hirschman Index of region concentration (sum of squared shares).
 * 1 => fully concentrated in one region, →0 => highly fragmented. 0 if empty.
 */
export function regionConcentration(users: { region: string }[]): number {
  if (users.length === 0) {
    return 0;
  }

  const shares = regionShare(users);
  let hhi = 0;
  for (const share of shares.values()) {
    hhi += share * share;
  }
  return hhi;
}

/**
 * Shannon entropy of the region distribution (natural log).
 * 0 if empty or a single region (no diversity).
 */
export function regionDiversity(users: { region: string }[]): number {
  if (users.length === 0) {
    return 0;
  }

  const shares = regionShare(users);
  if (shares.size <= 1) {
    return 0;
  }

  let entropy = 0;
  for (const share of shares.values()) {
    if (share > 0) {
      entropy -= share * Math.log(share);
    }
  }
  return entropy;
}

// ---------------------------------------------------------------------------
// 5. Clustering & proximity
// ---------------------------------------------------------------------------

/**
 * Id of the candidate closest to the target. Null if no candidates.
 */
export function nearestNeighbor(
  target: { lat: number; lon: number },
  candidates: { lat: number; lon: number; id: string }[],
): string | null {
  if (candidates.length === 0) {
    return null;
  }

  let bestId: string | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < candidates.length; i += 1) {
    const c = candidates[i];
    if (!c) {
      continue;
    }
    const dist = haversineDistance(target.lat, target.lon, c.lat, c.lon);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = c.id;
    }
  }

  return bestId;
}

/**
 * Ids of all points within radiusKm of the center (inclusive).
 */
export function pointsWithinRadius(
  center: { lat: number; lon: number },
  points: { lat: number; lon: number; id: string }[],
  radiusKm: number,
): string[] {
  const result: string[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    if (!p) {
      continue;
    }
    const dist = haversineDistance(center.lat, center.lon, p.lat, p.lon);
    if (dist <= radiusKm) {
      result.push(p.id);
    }
  }
  return result;
}

/**
 * Density per unit area: count / areaKm2. 0 if area is 0.
 */
export function densityPerArea(count: number, areaKm2: number): number {
  if (areaKm2 === 0) {
    return 0;
  }
  return count / areaKm2;
}

/**
 * Quantize a coordinate into a grid cell key "lat_lon" using cellSizeDeg.
 * Default cell size 1 degree.
 */
export function gridCell(lat: number, lon: number, cellSizeDeg: number = 1): string {
  const size = cellSizeDeg === 0 ? 1 : Math.abs(cellSizeDeg);
  const latCell = Math.floor(lat / size) * size;
  const lonCell = Math.floor(lon / size) * size;
  // Normalize -0 to 0 for stable keys.
  const latKey = latCell === 0 ? 0 : latCell;
  const lonKey = lonCell === 0 ? 0 : lonCell;
  return `${latKey}_${lonKey}`;
}

// ---------------------------------------------------------------------------
// 6. Market / venue analytics
// ---------------------------------------------------------------------------

/**
 * Market penetration = subscribers / population. 0 if population is 0.
 */
export function marketPenetration(subscribersInRegion: number, populationInRegion: number): number {
  if (populationInRegion === 0) {
    return 0;
  }
  return subscribersInRegion / populationInRegion;
}

/**
 * Period-over-period growth rate: (current - prior) / prior.
 * Infinity if prior is 0 and current > 0; 0 if both are 0.
 */
export function regionalGrowthRate(currentUsers: number, priorUsers: number): number {
  if (priorUsers === 0) {
    if (currentUsers === 0) {
      return 0;
    }
    return currentUsers > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  }
  return (currentUsers - priorUsers) / priorUsers;
}

/**
 * Weighted revenue per region: users * arpu. Regions sharing a name accumulate.
 */
export function weightedRegionalRevenue(
  regions: { region: string; users: number; arpu: number }[],
): Map<string, number> {
  const revenue = new Map<string, number>();
  for (let i = 0; i < regions.length; i += 1) {
    const r = regions[i];
    if (!r) {
      continue;
    }
    revenue.set(r.region, (revenue.get(r.region) ?? 0) + r.users * r.arpu);
  }
  return revenue;
}

/**
 * Geo-targeting expected value: users * conversionRate * arpu.
 */
export function geoTargetingScore(region: {
  users: number;
  conversionRate: number;
  arpu: number;
}): number {
  return region.users * region.conversionRate * region.arpu;
}

// ---------------------------------------------------------------------------
// 7. Venue / home-field
// ---------------------------------------------------------------------------

/**
 * Altitude performance multiplier. Above the baseline elevation, each 1000m
 * adds `perThousandMeters` to the multiplier. At/below baseline returns 1.
 * Always >= 1.
 */
export function altitudeAdjustment(
  altitudeMeters: number,
  baselineMeters: number = 0,
  perThousandMeters: number = 0.02,
): number {
  const delta = altitudeMeters - baselineMeters;
  if (delta <= 0) {
    return 1;
  }
  const multiplier = 1 + (delta / 1000) * perThousandMeters;
  return multiplier < 1 ? 1 : multiplier;
}

/**
 * Home-field support factor decaying with fan travel distance.
 * 1 / (1 + fanTravelKm / 500), clamped to 0–1.
 */
export function homeFieldDistanceFactor(fanTravelKm: number): number {
  const travel = fanTravelKm < 0 ? 0 : fanTravelKm;
  const factor = 1 / (1 + travel / 500);
  return Math.max(0, Math.min(1, factor));
}

/**
 * Venue capacity utilization = attendance / capacity. 0 if capacity is 0.
 * Clamped to 0–1.
 */
export function venueCapacityUtilization(attendance: number, capacity: number): number {
  if (capacity === 0) {
    return 0;
  }
  const util = attendance / capacity;
  return Math.max(0, Math.min(1, util));
}
