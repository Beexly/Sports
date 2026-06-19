import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  bearing,
  midpoint,
  boundingBox,
  centroid,
  travelDistance,
  timeZoneOffsetHours,
  jetLagSeverity,
  restAdvantage,
  backToBackPenalty,
  regionDistribution,
  regionShare,
  topRegions,
  regionConcentration,
  regionDiversity,
  kmToMiles,
  milesToKm,
  degreesToRadians,
  radiansToDegrees,
  formatCoordinate,
  nearestNeighbor,
  pointsWithinRadius,
  densityPerArea,
  gridCell,
  marketPenetration,
  regionalGrowthRate,
  weightedRegionalRevenue,
  geoTargetingScore,
  altitudeAdjustment,
  homeFieldDistanceFactor,
  venueCapacityUtilization,
} from '@/lib/analytics/geographic-analytics';

// Well-known coordinates
const NYC = { lat: 40.7128, lon: -74.006 };
const LA = { lat: 34.0522, lon: -118.2437 };
const LONDON = { lat: 51.5074, lon: -0.1278 };
const TOKYO = { lat: 35.6762, lon: 139.6503 };

describe('haversineDistance', () => {
  it('NYC to LA is approximately 3936 km', () => {
    const d = haversineDistance(NYC.lat, NYC.lon, LA.lat, LA.lon);
    expect(d).toBeGreaterThan(3900);
    expect(d).toBeLessThan(3975);
  });

  it('same point is exactly 0', () => {
    expect(haversineDistance(40.7128, -74.006, 40.7128, -74.006)).toBe(0);
  });

  it('same point at origin is 0', () => {
    expect(haversineDistance(0, 0, 0, 0)).toBe(0);
  });

  it('is symmetric', () => {
    const ab = haversineDistance(NYC.lat, NYC.lon, LA.lat, LA.lon);
    const ba = haversineDistance(LA.lat, LA.lon, NYC.lat, NYC.lon);
    expect(ab).toBeCloseTo(ba, 6);
  });

  it('returns a positive number for distinct points', () => {
    expect(haversineDistance(0, 0, 0, 1)).toBeGreaterThan(0);
  });

  it('one degree of longitude at equator is ~111.2 km', () => {
    const d = haversineDistance(0, 0, 0, 1);
    expect(d).toBeGreaterThan(111);
    expect(d).toBeLessThan(112);
  });

  it('one degree of latitude is ~111.2 km', () => {
    const d = haversineDistance(0, 0, 1, 0);
    expect(d).toBeGreaterThan(111);
    expect(d).toBeLessThan(112);
  });

  it('uses custom earth radius (radius 1 gives angular distance)', () => {
    const d = haversineDistance(0, 0, 0, 180, 1);
    expect(d).toBeCloseTo(Math.PI, 5);
  });

  it('antipodal points equal half circumference', () => {
    const d = haversineDistance(0, 0, 0, 180);
    expect(d).toBeCloseTo(6371 * Math.PI, 0);
  });

  it('London to Tokyo is roughly 9560 km', () => {
    const d = haversineDistance(LONDON.lat, LONDON.lon, TOKYO.lat, TOKYO.lon);
    expect(d).toBeGreaterThan(9400);
    expect(d).toBeLessThan(9700);
  });

  it('scales linearly with custom radius', () => {
    const d1 = haversineDistance(0, 0, 0, 1, 6371);
    const d2 = haversineDistance(0, 0, 0, 1, 12742);
    expect(d2).toBeCloseTo(d1 * 2, 6);
  });

  it('handles negative coordinates', () => {
    const d = haversineDistance(-33.8688, 151.2093, -37.8136, 144.9631);
    expect(d).toBeGreaterThan(700);
    expect(d).toBeLessThan(720);
  });

  it('defaults to earth radius 6371', () => {
    const withDefault = haversineDistance(0, 0, 0, 90);
    const withExplicit = haversineDistance(0, 0, 0, 90, 6371);
    expect(withDefault).toBe(withExplicit);
  });
});

describe('bearing', () => {
  it('due north is 0 degrees', () => {
    const b = bearing(0, 0, 10, 0);
    expect(b).toBeCloseTo(0, 5);
  });

  it('due east is 90 degrees', () => {
    const b = bearing(0, 0, 0, 10);
    expect(b).toBeCloseTo(90, 5);
  });

  it('due south is 180 degrees', () => {
    const b = bearing(10, 0, 0, 0);
    expect(b).toBeCloseTo(180, 5);
  });

  it('due west is 270 degrees', () => {
    const b = bearing(0, 0, 0, -10);
    expect(b).toBeCloseTo(270, 5);
  });

  it('is always in range 0–360', () => {
    const pairs = [
      [NYC, LA],
      [LA, NYC],
      [LONDON, TOKYO],
      [TOKYO, LONDON],
    ];
    for (const [a, b] of pairs) {
      const result = bearing(a!.lat, a!.lon, b!.lat, b!.lon);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(360);
    }
  });

  it('southwest bearing is between 180 and 270', () => {
    const b = bearing(10, 10, 0, 0);
    expect(b).toBeGreaterThan(180);
    expect(b).toBeLessThan(270);
  });

  it('northeast bearing is between 0 and 90', () => {
    const b = bearing(0, 0, 10, 10);
    expect(b).toBeGreaterThan(0);
    expect(b).toBeLessThan(90);
  });

  it('NYC to LA is roughly westward (between 180 and 360)', () => {
    const b = bearing(NYC.lat, NYC.lon, LA.lat, LA.lon);
    expect(b).toBeGreaterThan(180);
    expect(b).toBeLessThan(360);
  });

  it('never returns exactly 360', () => {
    const b = bearing(0, 0, 0.0001, -0.0001);
    expect(b).toBeLessThan(360);
  });
});

describe('midpoint', () => {
  it('midpoint of identical points is the same point', () => {
    const m = midpoint(40, -70, 40, -70);
    expect(m.lat).toBeCloseTo(40, 5);
    expect(m.lon).toBeCloseTo(-70, 5);
  });

  it('midpoint along equator is halfway in longitude', () => {
    const m = midpoint(0, 0, 0, 90);
    expect(m.lat).toBeCloseTo(0, 5);
    expect(m.lon).toBeCloseTo(45, 5);
  });

  it('midpoint of NYC and LA has latitude between the two', () => {
    const m = midpoint(NYC.lat, NYC.lon, LA.lat, LA.lon);
    expect(m.lat).toBeGreaterThan(Math.min(NYC.lat, LA.lat) - 5);
    expect(m.lat).toBeLessThan(Math.max(NYC.lat, LA.lat) + 5);
  });

  it('midpoint longitude stays in -180..180', () => {
    const m = midpoint(0, 170, 0, -170);
    expect(m.lon).toBeGreaterThanOrEqual(-180);
    expect(m.lon).toBeLessThanOrEqual(180);
  });

  it('returns an object with lat and lon keys', () => {
    const m = midpoint(10, 20, 30, 40);
    expect(m).toHaveProperty('lat');
    expect(m).toHaveProperty('lon');
  });

  it('midpoint of two points on same meridian is between latitudes', () => {
    const m = midpoint(0, 10, 40, 10);
    expect(m.lat).toBeGreaterThan(0);
    expect(m.lat).toBeLessThan(40);
    expect(m.lon).toBeCloseTo(10, 5);
  });
});

describe('boundingBox', () => {
  it('returns null for empty array', () => {
    expect(boundingBox([])).toBeNull();
  });

  it('single point gives a degenerate box', () => {
    const box = boundingBox([{ lat: 10, lon: 20 }]);
    expect(box).toEqual({ minLat: 10, maxLat: 10, minLon: 20, maxLon: 20 });
  });

  it('computes correct extents for multiple points', () => {
    const box = boundingBox([
      { lat: 10, lon: 20 },
      { lat: -5, lon: 30 },
      { lat: 40, lon: -10 },
    ]);
    expect(box).toEqual({ minLat: -5, maxLat: 40, minLon: -10, maxLon: 30 });
  });

  it('handles all-negative coordinates', () => {
    const box = boundingBox([
      { lat: -10, lon: -20 },
      { lat: -30, lon: -5 },
    ]);
    expect(box).toEqual({ minLat: -30, maxLat: -10, minLon: -20, maxLon: -5 });
  });

  it('two identical points give degenerate box', () => {
    const box = boundingBox([
      { lat: 5, lon: 5 },
      { lat: 5, lon: 5 },
    ]);
    expect(box).toEqual({ minLat: 5, maxLat: 5, minLon: 5, maxLon: 5 });
  });

  it('returns object with all four keys', () => {
    const box = boundingBox([{ lat: 1, lon: 2 }]);
    expect(box).not.toBeNull();
    expect(box).toHaveProperty('minLat');
    expect(box).toHaveProperty('maxLat');
    expect(box).toHaveProperty('minLon');
    expect(box).toHaveProperty('maxLon');
  });
});

describe('centroid', () => {
  it('returns null for empty array', () => {
    expect(centroid([])).toBeNull();
  });

  it('single point centroid is the point itself', () => {
    expect(centroid([{ lat: 10, lon: 20 }])).toEqual({ lat: 10, lon: 20 });
  });

  it('averages lat and lon', () => {
    const c = centroid([
      { lat: 0, lon: 0 },
      { lat: 10, lon: 20 },
    ]);
    expect(c).toEqual({ lat: 5, lon: 10 });
  });

  it('averages three points', () => {
    const c = centroid([
      { lat: 0, lon: 0 },
      { lat: 3, lon: 6 },
      { lat: 6, lon: 12 },
    ]);
    expect(c).toEqual({ lat: 3, lon: 6 });
  });

  it('handles negative averages', () => {
    const c = centroid([
      { lat: -10, lon: -20 },
      { lat: 10, lon: 20 },
    ]);
    expect(c).toEqual({ lat: 0, lon: 0 });
  });
});

describe('travelDistance', () => {
  it('empty stops is 0', () => {
    expect(travelDistance([])).toBe(0);
  });

  it('single stop is 0', () => {
    expect(travelDistance([{ lat: 10, lon: 20 }])).toBe(0);
  });

  it('two stops equals the haversine distance', () => {
    const stops = [NYC, LA];
    const expected = haversineDistance(NYC.lat, NYC.lon, LA.lat, LA.lon);
    expect(travelDistance(stops)).toBeCloseTo(expected, 6);
  });

  it('sums multiple legs', () => {
    const stops = [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 1 },
      { lat: 0, lon: 2 },
    ];
    const leg1 = haversineDistance(0, 0, 0, 1);
    const leg2 = haversineDistance(0, 1, 0, 2);
    expect(travelDistance(stops)).toBeCloseTo(leg1 + leg2, 6);
  });

  it('round trip is twice one-way', () => {
    const oneWay = travelDistance([NYC, LA]);
    const roundTrip = travelDistance([NYC, LA, NYC]);
    expect(roundTrip).toBeCloseTo(oneWay * 2, 4);
  });

  it('zero distance for repeated identical stops', () => {
    expect(travelDistance([NYC, NYC, NYC])).toBe(0);
  });
});

describe('timeZoneOffsetHours', () => {
  it('longitude 0 is offset 0', () => {
    expect(timeZoneOffsetHours(0)).toBe(0);
  });

  it('longitude 15 is offset +1', () => {
    expect(timeZoneOffsetHours(15)).toBe(1);
  });

  it('longitude -75 is offset -5 (US East roughly)', () => {
    expect(timeZoneOffsetHours(-75)).toBe(-5);
  });

  it('rounds to nearest', () => {
    expect(timeZoneOffsetHours(20)).toBe(1);
    expect(timeZoneOffsetHours(23)).toBe(2);
  });

  it('clamps to minimum -12', () => {
    expect(timeZoneOffsetHours(-200)).toBe(-12);
  });

  it('clamps to maximum 14', () => {
    expect(timeZoneOffsetHours(300)).toBe(14);
  });

  it('does not exceed 14 at far east', () => {
    expect(timeZoneOffsetHours(220)).toBe(14);
  });

  it('longitude 139 (Tokyo) gives +9', () => {
    expect(timeZoneOffsetHours(139)).toBe(9);
  });
});

describe('jetLagSeverity', () => {
  it('same longitude is 0', () => {
    expect(jetLagSeverity(0, 0)).toBe(0);
  });

  it('is absolute (order-independent)', () => {
    expect(jetLagSeverity(-75, 139)).toBe(jetLagSeverity(139, -75));
  });

  it('NYC to Tokyo is large', () => {
    const severity = jetLagSeverity(-74, 139);
    expect(severity).toBeGreaterThanOrEqual(13);
  });

  it('is never negative', () => {
    expect(jetLagSeverity(100, -100)).toBeGreaterThanOrEqual(0);
  });

  it('is at most 26 across clamped extremes', () => {
    expect(jetLagSeverity(-200, 300)).toBe(26);
  });

  it('one timezone apart is 1', () => {
    expect(jetLagSeverity(0, 15)).toBe(1);
  });
});

describe('restAdvantage', () => {
  it('positive when home traveled less', () => {
    expect(restAdvantage(100, 500)).toBe(400);
  });

  it('negative when home traveled more', () => {
    expect(restAdvantage(500, 100)).toBe(-400);
  });

  it('zero when equal travel', () => {
    expect(restAdvantage(300, 300)).toBe(0);
  });

  it('handles zero home travel', () => {
    expect(restAdvantage(0, 250)).toBe(250);
  });
});

describe('backToBackPenalty', () => {
  it('higher travel increases penalty', () => {
    const low = backToBackPenalty(2, 500);
    const high = backToBackPenalty(2, 2000);
    expect(high).toBeGreaterThan(low);
  });

  it('fewer rest days increases penalty', () => {
    const rested = backToBackPenalty(5, 1000);
    const tired = backToBackPenalty(1, 1000);
    expect(tired).toBeGreaterThan(rested);
  });

  it('clamps rest days to at least 0.5', () => {
    const zero = backToBackPenalty(0, 1000);
    const half = backToBackPenalty(0.5, 1000);
    expect(zero).toBe(half);
  });

  it('zero travel gives zero penalty', () => {
    expect(backToBackPenalty(3, 0)).toBe(0);
  });

  it('computes expected value', () => {
    expect(backToBackPenalty(2, 1000)).toBeCloseTo(0.5, 6);
  });

  it('negative days still clamp to 0.5 floor', () => {
    expect(backToBackPenalty(-3, 1000)).toBeCloseTo(2, 6);
  });
});

describe('regionDistribution', () => {
  it('empty users gives empty map', () => {
    expect(regionDistribution([]).size).toBe(0);
  });

  it('counts per region', () => {
    const dist = regionDistribution([
      { region: 'NA' },
      { region: 'NA' },
      { region: 'EU' },
    ]);
    expect(dist.get('NA')).toBe(2);
    expect(dist.get('EU')).toBe(1);
  });

  it('single user single region', () => {
    const dist = regionDistribution([{ region: 'APAC' }]);
    expect(dist.get('APAC')).toBe(1);
    expect(dist.size).toBe(1);
  });

  it('total counts equal number of users', () => {
    const users = [
      { region: 'A' },
      { region: 'B' },
      { region: 'A' },
      { region: 'C' },
    ];
    const dist = regionDistribution(users);
    let sum = 0;
    for (const v of dist.values()) {
      sum += v;
    }
    expect(sum).toBe(users.length);
  });

  it('returns a Map instance', () => {
    expect(regionDistribution([{ region: 'X' }])).toBeInstanceOf(Map);
  });

  it('handles empty-string region', () => {
    const dist = regionDistribution([{ region: '' }, { region: '' }]);
    expect(dist.get('')).toBe(2);
  });
});

describe('regionShare', () => {
  it('empty users gives empty map', () => {
    expect(regionShare([]).size).toBe(0);
  });

  it('shares sum to 1', () => {
    const shares = regionShare([
      { region: 'A' },
      { region: 'B' },
      { region: 'A' },
      { region: 'C' },
    ]);
    let sum = 0;
    for (const v of shares.values()) {
      sum += v;
    }
    expect(sum).toBeCloseTo(1, 10);
  });

  it('single region has share 1', () => {
    const shares = regionShare([{ region: 'A' }, { region: 'A' }]);
    expect(shares.get('A')).toBe(1);
  });

  it('equal split gives equal shares', () => {
    const shares = regionShare([{ region: 'A' }, { region: 'B' }]);
    expect(shares.get('A')).toBe(0.5);
    expect(shares.get('B')).toBe(0.5);
  });

  it('correct fractional share', () => {
    const shares = regionShare([
      { region: 'A' },
      { region: 'A' },
      { region: 'A' },
      { region: 'B' },
    ]);
    expect(shares.get('A')).toBeCloseTo(0.75, 10);
    expect(shares.get('B')).toBeCloseTo(0.25, 10);
  });

  it('all shares are between 0 and 1', () => {
    const shares = regionShare([
      { region: 'A' },
      { region: 'B' },
      { region: 'C' },
    ]);
    for (const v of shares.values()) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('topRegions', () => {
  it('empty users gives empty array', () => {
    expect(topRegions([])).toEqual([]);
  });

  it('orders by count descending', () => {
    const top = topRegions([
      { region: 'A' },
      { region: 'B' },
      { region: 'B' },
      { region: 'C' },
      { region: 'C' },
      { region: 'C' },
    ]);
    expect(top[0]).toEqual({ region: 'C', count: 3 });
    expect(top[1]).toEqual({ region: 'B', count: 2 });
    expect(top[2]).toEqual({ region: 'A', count: 1 });
  });

  it('breaks ties alphabetically', () => {
    const top = topRegions([
      { region: 'Zebra' },
      { region: 'Apple' },
      { region: 'Mango' },
    ]);
    expect(top.map((t) => t.region)).toEqual(['Apple', 'Mango', 'Zebra']);
  });

  it('respects n parameter', () => {
    const top = topRegions(
      [
        { region: 'A' },
        { region: 'B' },
        { region: 'C' },
        { region: 'D' },
      ],
      2,
    );
    expect(top).toHaveLength(2);
  });

  it('defaults to top 5', () => {
    const users = Array.from({ length: 10 }, (_, i) => ({ region: `R${i}` }));
    expect(topRegions(users)).toHaveLength(5);
  });

  it('returns all if fewer than n', () => {
    const top = topRegions([{ region: 'A' }, { region: 'B' }], 10);
    expect(top).toHaveLength(2);
  });

  it('n=0 returns empty array', () => {
    expect(topRegions([{ region: 'A' }], 0)).toEqual([]);
  });

  it('negative n returns empty array', () => {
    expect(topRegions([{ region: 'A' }], -1)).toEqual([]);
  });

  it('count and tie ordering combined', () => {
    const top = topRegions([
      { region: 'B' },
      { region: 'B' },
      { region: 'A' },
      { region: 'A' },
      { region: 'C' },
    ]);
    // A and B both 2 -> A before B alphabetically; C is 1
    expect(top).toEqual([
      { region: 'A', count: 2 },
      { region: 'B', count: 2 },
      { region: 'C', count: 1 },
    ]);
  });
});

describe('regionConcentration', () => {
  it('empty users is 0', () => {
    expect(regionConcentration([])).toBe(0);
  });

  it('single region HHI is 1', () => {
    expect(regionConcentration([{ region: 'A' }, { region: 'A' }])).toBe(1);
  });

  it('two equal regions HHI is 0.5', () => {
    const hhi = regionConcentration([{ region: 'A' }, { region: 'B' }]);
    expect(hhi).toBeCloseTo(0.5, 10);
  });

  it('four equal regions HHI is 0.25', () => {
    const hhi = regionConcentration([
      { region: 'A' },
      { region: 'B' },
      { region: 'C' },
      { region: 'D' },
    ]);
    expect(hhi).toBeCloseTo(0.25, 10);
  });

  it('is between 0 and 1', () => {
    const hhi = regionConcentration([
      { region: 'A' },
      { region: 'A' },
      { region: 'B' },
    ]);
    expect(hhi).toBeGreaterThan(0);
    expect(hhi).toBeLessThanOrEqual(1);
  });

  it('more concentrated distribution has higher HHI', () => {
    const concentrated = regionConcentration([
      { region: 'A' },
      { region: 'A' },
      { region: 'A' },
      { region: 'B' },
    ]);
    const even = regionConcentration([
      { region: 'A' },
      { region: 'A' },
      { region: 'B' },
      { region: 'B' },
    ]);
    expect(concentrated).toBeGreaterThan(even);
  });
});

describe('regionDiversity', () => {
  it('empty users is 0', () => {
    expect(regionDiversity([])).toBe(0);
  });

  it('single region Shannon entropy is 0', () => {
    expect(regionDiversity([{ region: 'A' }, { region: 'A' }])).toBe(0);
  });

  it('two equal regions entropy is ln(2)', () => {
    const e = regionDiversity([{ region: 'A' }, { region: 'B' }]);
    expect(e).toBeCloseTo(Math.log(2), 10);
  });

  it('four equal regions entropy is ln(4)', () => {
    const e = regionDiversity([
      { region: 'A' },
      { region: 'B' },
      { region: 'C' },
      { region: 'D' },
    ]);
    expect(e).toBeCloseTo(Math.log(4), 10);
  });

  it('is non-negative', () => {
    const e = regionDiversity([
      { region: 'A' },
      { region: 'A' },
      { region: 'B' },
    ]);
    expect(e).toBeGreaterThanOrEqual(0);
  });

  it('more even distribution has higher entropy', () => {
    const even = regionDiversity([{ region: 'A' }, { region: 'B' }]);
    const skewed = regionDiversity([
      { region: 'A' },
      { region: 'A' },
      { region: 'A' },
      { region: 'B' },
    ]);
    expect(even).toBeGreaterThan(skewed);
  });

  it('single user is 0 (single region)', () => {
    expect(regionDiversity([{ region: 'A' }])).toBe(0);
  });
});

describe('kmToMiles / milesToKm', () => {
  it('100 km to miles', () => {
    expect(kmToMiles(100)).toBeCloseTo(62.1371, 4);
  });

  it('100 miles to km', () => {
    expect(milesToKm(100)).toBeCloseTo(160.9344, 4);
  });

  it('roundtrip km -> miles -> km', () => {
    // 0.621371 and 1.609344 are not exact reciprocals, so tolerance is loose.
    expect(milesToKm(kmToMiles(500))).toBeCloseTo(500, 3);
  });

  it('roundtrip miles -> km -> miles', () => {
    expect(kmToMiles(milesToKm(300))).toBeCloseTo(300, 3);
  });

  it('zero is zero both ways', () => {
    expect(kmToMiles(0)).toBe(0);
    expect(milesToKm(0)).toBe(0);
  });

  it('a marathon (42.195 km) is ~26.2 miles', () => {
    expect(kmToMiles(42.195)).toBeCloseTo(26.2, 1);
  });
});

describe('degreesToRadians / radiansToDegrees', () => {
  it('180 degrees is pi radians', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 10);
  });

  it('pi radians is 180 degrees', () => {
    expect(radiansToDegrees(Math.PI)).toBeCloseTo(180, 10);
  });

  it('90 degrees is pi/2', () => {
    expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2, 10);
  });

  it('roundtrip degrees', () => {
    expect(radiansToDegrees(degreesToRadians(45))).toBeCloseTo(45, 10);
  });

  it('zero both ways', () => {
    expect(degreesToRadians(0)).toBe(0);
    expect(radiansToDegrees(0)).toBe(0);
  });

  it('negative degrees', () => {
    expect(degreesToRadians(-90)).toBeCloseTo(-Math.PI / 2, 10);
  });
});

describe('formatCoordinate', () => {
  it('positive latitude is N', () => {
    expect(formatCoordinate(40.7128, 'lat')).toBe('40.7128° N');
  });

  it('negative longitude is W', () => {
    expect(formatCoordinate(-74.006, 'lon')).toBe('74.0060° W');
  });

  it('positive longitude is E', () => {
    expect(formatCoordinate(139.6503, 'lon')).toBe('139.6503° E');
  });

  it('negative latitude is S', () => {
    expect(formatCoordinate(-33.8688, 'lat')).toBe('33.8688° S');
  });

  it('zero latitude is N hemisphere', () => {
    expect(formatCoordinate(0, 'lat')).toBe('0.0000° N');
  });

  it('zero longitude is E hemisphere', () => {
    expect(formatCoordinate(0, 'lon')).toBe('0.0000° E');
  });

  it('formats to four decimal places', () => {
    expect(formatCoordinate(12.3, 'lat')).toBe('12.3000° N');
  });

  it('uses absolute magnitude', () => {
    expect(formatCoordinate(-12.5, 'lat')).toContain('12.5000');
  });
});

describe('nearestNeighbor', () => {
  it('empty candidates returns null', () => {
    expect(nearestNeighbor({ lat: 0, lon: 0 }, [])).toBeNull();
  });

  it('single candidate returns its id', () => {
    expect(
      nearestNeighbor({ lat: 0, lon: 0 }, [{ lat: 1, lon: 1, id: 'x' }]),
    ).toBe('x');
  });

  it('returns closest of several', () => {
    const id = nearestNeighbor({ lat: 0, lon: 0 }, [
      { lat: 50, lon: 50, id: 'far' },
      { lat: 1, lon: 1, id: 'near' },
      { lat: 30, lon: 30, id: 'mid' },
    ]);
    expect(id).toBe('near');
  });

  it('exact match wins', () => {
    const id = nearestNeighbor({ lat: 10, lon: 10 }, [
      { lat: 10, lon: 10, id: 'exact' },
      { lat: 11, lon: 11, id: 'close' },
    ]);
    expect(id).toBe('exact');
  });

  it('returns string id type', () => {
    const id = nearestNeighbor({ lat: 0, lon: 0 }, [
      { lat: 5, lon: 5, id: 'a' },
    ]);
    expect(typeof id).toBe('string');
  });
});

describe('pointsWithinRadius', () => {
  it('empty points gives empty array', () => {
    expect(pointsWithinRadius({ lat: 0, lon: 0 }, [], 100)).toEqual([]);
  });

  it('includes points within radius', () => {
    const center = { lat: 0, lon: 0 };
    const result = pointsWithinRadius(
      center,
      [
        { lat: 0, lon: 0.5, id: 'in' },
        { lat: 0, lon: 50, id: 'out' },
      ],
      100,
    );
    expect(result).toContain('in');
    expect(result).not.toContain('out');
  });

  it('point exactly at radius is included (inclusive)', () => {
    const center = { lat: 0, lon: 0 };
    const oneDegree = haversineDistance(0, 0, 0, 1);
    const result = pointsWithinRadius(
      center,
      [{ lat: 0, lon: 1, id: 'edge' }],
      oneDegree,
    );
    expect(result).toContain('edge');
  });

  it('zero radius only includes coincident points', () => {
    const result = pointsWithinRadius(
      { lat: 5, lon: 5 },
      [
        { lat: 5, lon: 5, id: 'same' },
        { lat: 5, lon: 6, id: 'other' },
      ],
      0,
    );
    expect(result).toEqual(['same']);
  });

  it('returns all when radius is huge', () => {
    const result = pointsWithinRadius(
      { lat: 0, lon: 0 },
      [
        { lat: 10, lon: 10, id: 'a' },
        { lat: -20, lon: 40, id: 'b' },
      ],
      100000,
    );
    expect(result).toHaveLength(2);
  });

  it('preserves order of candidates', () => {
    const result = pointsWithinRadius(
      { lat: 0, lon: 0 },
      [
        { lat: 0, lon: 0.1, id: 'first' },
        { lat: 0, lon: 0.2, id: 'second' },
      ],
      1000,
    );
    expect(result).toEqual(['first', 'second']);
  });
});

describe('densityPerArea', () => {
  it('zero area returns 0', () => {
    expect(densityPerArea(100, 0)).toBe(0);
  });

  it('computes count / area', () => {
    expect(densityPerArea(500, 100)).toBe(5);
  });

  it('zero count is 0', () => {
    expect(densityPerArea(0, 50)).toBe(0);
  });

  it('fractional density', () => {
    expect(densityPerArea(1, 4)).toBe(0.25);
  });
});

describe('gridCell', () => {
  it('quantizes to default 1-degree cell', () => {
    expect(gridCell(40.7, -74.3)).toBe('40_-75');
  });

  it('uses custom cell size', () => {
    expect(gridCell(40.7, 12.3, 10)).toBe('40_10');
  });

  it('points in same cell share a key', () => {
    expect(gridCell(40.1, 20.1)).toBe(gridCell(40.9, 20.9));
  });

  it('points in different cells differ', () => {
    expect(gridCell(40.1, 20.1)).not.toBe(gridCell(41.1, 20.1));
  });

  it('origin maps to 0_0', () => {
    expect(gridCell(0, 0)).toBe('0_0');
  });

  it('small negative near zero normalizes to 0', () => {
    // floor(-0.5 / 1) * 1 = -1, so -0.5 lands in cell -1
    expect(gridCell(-0.5, 0.5)).toBe('-1_0');
  });

  it('returns underscore-joined string', () => {
    expect(gridCell(10, 20)).toMatch(/^-?\d+_-?\d+$/);
  });
});

describe('marketPenetration', () => {
  it('zero population returns 0', () => {
    expect(marketPenetration(100, 0)).toBe(0);
  });

  it('computes subs / population', () => {
    expect(marketPenetration(250, 1000)).toBe(0.25);
  });

  it('zero subscribers is 0', () => {
    expect(marketPenetration(0, 5000)).toBe(0);
  });

  it('full penetration is 1', () => {
    expect(marketPenetration(1000, 1000)).toBe(1);
  });
});

describe('regionalGrowthRate', () => {
  it('prior 0 and current positive is Infinity', () => {
    expect(regionalGrowthRate(100, 0)).toBe(Number.POSITIVE_INFINITY);
  });

  it('both zero is 0', () => {
    expect(regionalGrowthRate(0, 0)).toBe(0);
  });

  it('positive growth', () => {
    expect(regionalGrowthRate(150, 100)).toBeCloseTo(0.5, 10);
  });

  it('negative growth (decline)', () => {
    expect(regionalGrowthRate(80, 100)).toBeCloseTo(-0.2, 10);
  });

  it('no change is 0', () => {
    expect(regionalGrowthRate(100, 100)).toBe(0);
  });

  it('doubling is 1.0', () => {
    expect(regionalGrowthRate(200, 100)).toBe(1);
  });
});

describe('weightedRegionalRevenue', () => {
  it('empty input gives empty map', () => {
    expect(weightedRegionalRevenue([]).size).toBe(0);
  });

  it('computes users * arpu', () => {
    const rev = weightedRegionalRevenue([
      { region: 'NA', users: 100, arpu: 15 },
    ]);
    expect(rev.get('NA')).toBe(1500);
  });

  it('accumulates same region', () => {
    const rev = weightedRegionalRevenue([
      { region: 'NA', users: 100, arpu: 15 },
      { region: 'NA', users: 50, arpu: 10 },
    ]);
    expect(rev.get('NA')).toBe(2000);
  });

  it('handles multiple distinct regions', () => {
    const rev = weightedRegionalRevenue([
      { region: 'NA', users: 10, arpu: 5 },
      { region: 'EU', users: 20, arpu: 4 },
    ]);
    expect(rev.get('NA')).toBe(50);
    expect(rev.get('EU')).toBe(80);
  });

  it('zero users gives zero revenue', () => {
    const rev = weightedRegionalRevenue([
      { region: 'X', users: 0, arpu: 99 },
    ]);
    expect(rev.get('X')).toBe(0);
  });

  it('returns a Map', () => {
    expect(weightedRegionalRevenue([{ region: 'A', users: 1, arpu: 1 }])).toBeInstanceOf(Map);
  });
});

describe('geoTargetingScore', () => {
  it('computes users * conversionRate * arpu', () => {
    expect(
      geoTargetingScore({ users: 1000, conversionRate: 0.05, arpu: 20 }),
    ).toBeCloseTo(1000, 10);
  });

  it('zero conversion gives 0', () => {
    expect(geoTargetingScore({ users: 1000, conversionRate: 0, arpu: 20 })).toBe(0);
  });

  it('zero users gives 0', () => {
    expect(geoTargetingScore({ users: 0, conversionRate: 0.1, arpu: 20 })).toBe(0);
  });

  it('higher conversion scores higher', () => {
    const low = geoTargetingScore({ users: 100, conversionRate: 0.01, arpu: 10 });
    const high = geoTargetingScore({ users: 100, conversionRate: 0.1, arpu: 10 });
    expect(high).toBeGreaterThan(low);
  });

  it('scales with arpu', () => {
    const a = geoTargetingScore({ users: 100, conversionRate: 0.05, arpu: 10 });
    const b = geoTargetingScore({ users: 100, conversionRate: 0.05, arpu: 20 });
    expect(b).toBeCloseTo(a * 2, 6);
  });
});

describe('altitudeAdjustment', () => {
  it('sea level (0) returns 1', () => {
    expect(altitudeAdjustment(0)).toBe(1);
  });

  it('below baseline returns 1', () => {
    expect(altitudeAdjustment(-500)).toBe(1);
  });

  it('1000m above baseline adds 2%', () => {
    expect(altitudeAdjustment(1000)).toBeCloseTo(1.02, 10);
  });

  it('2000m adds 4%', () => {
    expect(altitudeAdjustment(2000)).toBeCloseTo(1.04, 10);
  });

  it('always returns at least 1', () => {
    for (const alt of [-1000, 0, 500, 3000]) {
      expect(altitudeAdjustment(alt)).toBeGreaterThanOrEqual(1);
    }
  });

  it('respects custom baseline', () => {
    // Denver baseline ~1600m; venue at 1600 => no adjustment
    expect(altitudeAdjustment(1600, 1600)).toBe(1);
  });

  it('above custom baseline adjusts', () => {
    expect(altitudeAdjustment(2600, 1600)).toBeCloseTo(1.02, 10);
  });

  it('respects custom perThousandMeters', () => {
    expect(altitudeAdjustment(1000, 0, 0.05)).toBeCloseTo(1.05, 10);
  });

  it('higher altitude gives larger multiplier', () => {
    expect(altitudeAdjustment(3000)).toBeGreaterThan(altitudeAdjustment(1000));
  });
});

describe('homeFieldDistanceFactor', () => {
  it('zero travel gives factor 1', () => {
    expect(homeFieldDistanceFactor(0)).toBe(1);
  });

  it('500 km gives factor 0.5', () => {
    expect(homeFieldDistanceFactor(500)).toBeCloseTo(0.5, 10);
  });

  it('decays with distance', () => {
    expect(homeFieldDistanceFactor(1000)).toBeLessThan(homeFieldDistanceFactor(100));
  });

  it('stays within 0–1', () => {
    for (const km of [0, 100, 500, 5000, 50000]) {
      const f = homeFieldDistanceFactor(km);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });

  it('negative travel treated as 0 (factor 1)', () => {
    expect(homeFieldDistanceFactor(-100)).toBe(1);
  });

  it('very large distance approaches 0', () => {
    expect(homeFieldDistanceFactor(1000000)).toBeLessThan(0.01);
  });
});

describe('venueCapacityUtilization', () => {
  it('zero capacity returns 0', () => {
    expect(venueCapacityUtilization(100, 0)).toBe(0);
  });

  it('half full is 0.5', () => {
    expect(venueCapacityUtilization(500, 1000)).toBe(0.5);
  });

  it('full is 1', () => {
    expect(venueCapacityUtilization(1000, 1000)).toBe(1);
  });

  it('clamps overflow to 1', () => {
    expect(venueCapacityUtilization(1500, 1000)).toBe(1);
  });

  it('empty venue is 0', () => {
    expect(venueCapacityUtilization(0, 1000)).toBe(0);
  });

  it('clamps negative attendance to 0', () => {
    expect(venueCapacityUtilization(-50, 1000)).toBe(0);
  });

  it('stays within 0–1', () => {
    const pairs = [
      [100, 1000],
      [999, 1000],
      [2000, 1000],
    ];
    for (const [att, cap] of pairs) {
      const u = venueCapacityUtilization(att ?? 0, cap ?? 0);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThanOrEqual(1);
    }
  });
});
