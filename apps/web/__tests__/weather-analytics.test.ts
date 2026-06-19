import { describe, it, expect } from 'vitest';
import {
  fahrenheitToCelsius,
  celsiusToFahrenheit,
  windChill,
  heatIndex,
  dewPoint,
  apparentTemperature,
  beaufortScale,
  windComponentsAtBallpark,
  stadiumWindAngle,
  precipSeverity,
  snowImpact,
  nflWeatherImpact,
  mlbWindImpact,
  mlbTemperatureImpact,
  soccerWeatherImpact,
  golfWeatherImpact,
  tennisWeatherImpact,
  weatherBettingEdge,
  weatherRegressionMultiplier,
  fanComfortIndex,
  isWeatherGame,
  type WeatherConditions,
} from '../lib/sports/weather-analytics';

// ─── Test Fixture Helper ──────────────────────────────────────────────────────

function makeWeather(overrides: Partial<WeatherConditions> = {}): WeatherConditions {
  return {
    temperatureF: 72,
    windSpeedMph: 5,
    windDirectionDeg: 180,
    precipitationInches: 0,
    humidity: 50,
    ...overrides,
  };
}

// ─── Temperature Conversion ───────────────────────────────────────────────────

describe('fahrenheitToCelsius', () => {
  it('converts 32F to 0C (freezing point)', () => {
    expect(fahrenheitToCelsius(32)).toBeCloseTo(0, 5);
  });

  it('converts 212F to 100C (boiling point)', () => {
    expect(fahrenheitToCelsius(212)).toBeCloseTo(100, 5);
  });

  it('converts 98.6F to 37C (body temperature)', () => {
    expect(fahrenheitToCelsius(98.6)).toBeCloseTo(37, 1);
  });

  it('converts negative Fahrenheit values', () => {
    expect(fahrenheitToCelsius(-40)).toBeCloseTo(-40, 5);
  });
});

describe('celsiusToFahrenheit', () => {
  it('converts 0C to 32F', () => {
    expect(celsiusToFahrenheit(0)).toBeCloseTo(32, 5);
  });

  it('converts 100C to 212F', () => {
    expect(celsiusToFahrenheit(100)).toBeCloseTo(212, 5);
  });

  it('converts -40C to -40F', () => {
    expect(celsiusToFahrenheit(-40)).toBeCloseTo(-40, 5);
  });

  it('roundtrips F→C→F', () => {
    const original = 68;
    expect(celsiusToFahrenheit(fahrenheitToCelsius(original))).toBeCloseTo(original, 5);
  });

  it('roundtrips C→F→C', () => {
    const original = 25;
    expect(fahrenheitToCelsius(celsiusToFahrenheit(original))).toBeCloseTo(original, 5);
  });
});

// ─── Wind Chill ───────────────────────────────────────────────────────────────

describe('windChill', () => {
  it('cold+windy is lower than cold+calm', () => {
    const calmChill = windChill(20, 2);
    const windyChill = windChill(20, 25);
    expect(windyChill).toBeLessThan(calmChill);
  });

  it('warm temperature returns close to actual temp (no wind chill)', () => {
    const result = windChill(60, 20);
    expect(result).toBeCloseTo(60, 0);
  });

  it('calm wind returns actual temp', () => {
    const result = windChill(30, 2); // wind <= 3 mph
    expect(result).toBe(30);
  });

  it('very cold temp with very strong wind produces extreme chill', () => {
    const result = windChill(0, 40);
    expect(result).toBeLessThan(-20);
  });

  it('freezing temp with moderate wind produces chill below actual', () => {
    const result = windChill(25, 15);
    expect(result).toBeLessThan(25);
  });

  it('wind chill at 32F with 20mph wind is below 32', () => {
    const result = windChill(32, 20);
    expect(result).toBeLessThan(32);
  });
});

// ─── Heat Index ───────────────────────────────────────────────────────────────

describe('heatIndex', () => {
  it('hot+humid is higher than hot+dry', () => {
    const humid = heatIndex(95, 80);
    const dry = heatIndex(95, 40);
    expect(humid).toBeGreaterThan(dry);
  });

  it('returns close to actual temp for mild conditions', () => {
    // Below threshold — returns tempF unchanged
    const result = heatIndex(75, 50);
    expect(result).toBe(75);
  });

  it('returns actual temp when temp < 80F', () => {
    const result = heatIndex(70, 90);
    expect(result).toBe(70);
  });

  it('returns actual temp when humidity < 40', () => {
    const result = heatIndex(85, 30);
    expect(result).toBe(85);
  });

  it('extreme heat and humidity produces index well above actual temp', () => {
    const result = heatIndex(100, 90);
    expect(result).toBeGreaterThan(110);
  });

  it('produces reasonable value for 90F + 70% humidity', () => {
    const result = heatIndex(90, 70);
    expect(result).toBeGreaterThan(90);
    expect(result).toBeLessThan(110);
  });
});

// ─── Dew Point ────────────────────────────────────────────────────────────────

describe('dewPoint', () => {
  it('dew point is less than or equal to temperature', () => {
    const dp = dewPoint(75, 60);
    expect(dp).toBeLessThanOrEqual(75);
  });

  it('dew point increases with higher humidity', () => {
    const dp40 = dewPoint(80, 40);
    const dp80 = dewPoint(80, 80);
    expect(dp80).toBeGreaterThan(dp40);
  });

  it('returns value in reasonable Fahrenheit range', () => {
    const dp = dewPoint(72, 55);
    expect(dp).toBeGreaterThan(20);
    expect(dp).toBeLessThan(72);
  });

  it('very low humidity produces low dew point', () => {
    const dp = dewPoint(90, 10);
    expect(dp).toBeLessThan(50);
  });
});

// ─── Apparent Temperature ─────────────────────────────────────────────────────

describe('apparentTemperature', () => {
  it('uses wind chill at cold temp (40F) with wind', () => {
    const apparent = apparentTemperature(40, 20, 50);
    const chill = windChill(40, 20);
    expect(apparent).toBeCloseTo(chill, 1);
  });

  it('uses heat index at hot+humid conditions', () => {
    const apparent = apparentTemperature(90, 5, 75);
    const hi = heatIndex(90, 75);
    expect(apparent).toBeCloseTo(hi, 1);
  });

  it('returns actual temp for mild conditions (65F)', () => {
    const result = apparentTemperature(65, 10, 50);
    expect(result).toBe(65);
  });

  it('returns actual temp for mid-range (70F)', () => {
    const result = apparentTemperature(70, 15, 60);
    expect(result).toBe(70);
  });

  it('at exactly 50F returns the actual temp (boundary case)', () => {
    const result = apparentTemperature(50, 20, 50);
    expect(result).toBe(50);
  });
});

// ─── Beaufort Scale ───────────────────────────────────────────────────────────

describe('beaufortScale', () => {
  it('0 mph = force 0, Calm', () => {
    const { force, description } = beaufortScale(0);
    expect(force).toBe(0);
    expect(description).toBe('Calm');
  });

  it('1 mph = force 1 (light air)', () => {
    const { force } = beaufortScale(1);
    expect(force).toBe(1);
  });

  it('15 mph = force 3 or 4 (moderate/gentle breeze range)', () => {
    const { force } = beaufortScale(15);
    expect(force).toBeGreaterThanOrEqual(3);
    expect(force).toBeLessThanOrEqual(4);
  });

  it('75 mph = force 12 (hurricane force)', () => {
    const { force } = beaufortScale(75);
    expect(force).toBe(12);
  });

  it('very calm (0.5 mph) = force 0', () => {
    const { force } = beaufortScale(0.5);
    expect(force).toBe(0);
  });

  it('description is always a non-empty string', () => {
    [0, 5, 15, 30, 50, 80].forEach((mph) => {
      const { description } = beaufortScale(mph);
      expect(description.length).toBeGreaterThan(0);
    });
  });

  it('force increases monotonically with wind speed', () => {
    const speeds = [0, 2, 5, 10, 15, 25, 35, 45, 55, 65, 75];
    const forces = speeds.map((s) => beaufortScale(s).force);
    for (let i = 1; i < forces.length; i++) {
      expect(forces[i]).toBeGreaterThanOrEqual(forces[i - 1]!);
    }
  });
});

// ─── Wind Components at Ballpark ──────────────────────────────────────────────

describe('windComponentsAtBallpark', () => {
  it('pure headwind: same direction as ballpark = full headwind', () => {
    // Wind blowing FROM South (180°), ballpark oriented toward South
    const { headwind, crosswind } = windComponentsAtBallpark(180, 180, 20);
    expect(headwind).toBeCloseTo(20, 1);
    expect(Math.abs(crosswind)).toBeLessThan(0.1);
  });

  it('pure tailwind: opposite direction = full tailwind (negative headwind)', () => {
    // Wind from North (0°), ballpark oriented toward South (180°)
    const { headwind, crosswind } = windComponentsAtBallpark(0, 180, 20);
    expect(headwind).toBeCloseTo(-20, 1);
    expect(Math.abs(crosswind)).toBeLessThan(0.1);
  });

  it('90° angle = full crosswind, no headwind', () => {
    // Wind from East (90°), ballpark oriented toward South (180°)
    const { headwind, crosswind } = windComponentsAtBallpark(90, 180, 20);
    expect(Math.abs(headwind)).toBeLessThan(0.1);
    expect(Math.abs(crosswind)).toBeCloseTo(20, 1);
  });

  it('zero wind speed produces zero components', () => {
    const { headwind, crosswind } = windComponentsAtBallpark(45, 90, 0);
    expect(headwind).toBeCloseTo(0, 5);
    expect(crosswind).toBeCloseTo(0, 5);
  });
});

// ─── Stadium Wind Angle ───────────────────────────────────────────────────────

describe('stadiumWindAngle', () => {
  it('wind blowing same direction as ballpark = blowing in (headwind)', () => {
    const dir = stadiumWindAngle(180, 180);
    expect(dir).toBe('in');
  });

  it('wind opposite to ballpark = blowing out (tailwind)', () => {
    const dir = stadiumWindAngle(0, 180);
    expect(dir).toBe('out');
  });

  it('90° crosswind = left-to-right or right-to-left', () => {
    const dir = stadiumWindAngle(270, 180);
    expect(['left-to-right', 'right-to-left']).toContain(dir);
  });

  it('returns a valid WindDirection', () => {
    const valid = ['left-to-right', 'right-to-left', 'in', 'out', 'crosswind'];
    [0, 45, 90, 135, 180, 225, 270, 315].forEach((deg) => {
      expect(valid).toContain(stadiumWindAngle(deg, 90));
    });
  });
});

// ─── Precipitation Severity ───────────────────────────────────────────────────

describe('precipSeverity', () => {
  it('0 inches = none', () => {
    expect(precipSeverity(0)).toBe('none');
  });

  it('negative = none', () => {
    expect(precipSeverity(-0.1)).toBe('none');
  });

  it('0.05 inches = light', () => {
    expect(precipSeverity(0.05)).toBe('light');
  });

  it('0.15 inches = moderate', () => {
    expect(precipSeverity(0.15)).toBe('moderate');
  });

  it('0.5 inches = heavy', () => {
    expect(precipSeverity(0.5)).toBe('heavy');
  });

  it('boundary: exactly 0.1 = moderate', () => {
    expect(precipSeverity(0.1)).toBe('moderate');
  });

  it('boundary: exactly 0.3 = heavy', () => {
    expect(precipSeverity(0.3)).toBe('heavy');
  });
});

// ─── Snow Impact ──────────────────────────────────────────────────────────────

describe('snowImpact', () => {
  it('no snow = normal field, footing 1.0', () => {
    const { fieldConditions, footing } = snowImpact(0);
    expect(fieldConditions).toBe('normal');
    expect(footing).toBe(1.0);
  });

  it('light snow (0.25") = normal conditions, slightly reduced footing', () => {
    const { footing } = snowImpact(0.25);
    expect(footing).toBeLessThan(1.0);
    expect(footing).toBeGreaterThan(0.8);
  });

  it('moderate snow (1") = poor conditions, footing 0.8', () => {
    const { fieldConditions, footing } = snowImpact(1);
    expect(fieldConditions).toBe('poor');
    expect(footing).toBe(0.8);
  });

  it('heavy snow (2"+) = very_poor conditions, footing <= 0.65', () => {
    const { fieldConditions, footing } = snowImpact(3);
    expect(fieldConditions).toBe('very_poor');
    expect(footing).toBeLessThanOrEqual(0.65);
  });

  it('footing decreases as snow accumulates', () => {
    const f0 = snowImpact(0).footing;
    const f1 = snowImpact(0.5).footing;
    const f2 = snowImpact(1.5).footing;
    const f3 = snowImpact(3).footing;
    expect(f1).toBeLessThan(f0);
    expect(f2).toBeLessThan(f1);
    expect(f3).toBeLessThanOrEqual(f2);
  });
});

// ─── NFL Weather Impact ───────────────────────────────────────────────────────

describe('nflWeatherImpact', () => {
  it('dome stadium → severity none, factor 1.0, no notes about conditions', () => {
    const impact = nflWeatherImpact(
      makeWeather({ temperatureF: 25, windSpeedMph: 30 }),
      'dome',
    );
    expect(impact.severity).toBe('none');
    expect(impact.overallFactor).toBe(1.0);
    expect(impact.passingImpact).toBe(0);
    expect(impact.scoringImpact).toBe(0);
  });

  it('retractable stadium → severity none', () => {
    const impact = nflWeatherImpact(
      makeWeather({ temperatureF: 10, windSpeedMph: 25 }),
      'retractable',
    );
    expect(impact.severity).toBe('none');
  });

  it('25°F + 20mph wind → significant impact', () => {
    const impact = nflWeatherImpact(
      makeWeather({ temperatureF: 25, windSpeedMph: 20 }),
      'outdoor',
    );
    expect(['significant', 'severe']).toContain(impact.severity);
    expect(impact.overallFactor).toBeLessThan(1.0);
    expect(impact.passingImpact).toBeLessThan(0);
  });

  it('mild conditions (65°F, calm) → minimal or none severity', () => {
    const impact = nflWeatherImpact(
      makeWeather({ temperatureF: 65, windSpeedMph: 5 }),
      'outdoor',
    );
    expect(['none', 'minimal']).toContain(impact.severity);
    expect(impact.overallFactor).toBeGreaterThanOrEqual(0.95);
  });

  it('heavy snow → reduced footing and kicking impact', () => {
    const impact = nflWeatherImpact(
      makeWeather({ temperatureF: 30, windSpeedMph: 5, snowInches: 3 }),
      'outdoor',
    );
    expect(impact.kickingImpact).toBeLessThan(0);
    expect(impact.overallFactor).toBeLessThan(0.9);
  });

  it('heavy rain → negative passing and scoring impact', () => {
    const impact = nflWeatherImpact(
      makeWeather({ precipitationInches: 0.4 }),
      'outdoor',
    );
    expect(impact.passingImpact).toBeLessThan(0);
    expect(impact.scoringImpact).toBeLessThan(0);
  });

  it('strong wind boosts rushing impact slightly', () => {
    const calm = nflWeatherImpact(makeWeather({ windSpeedMph: 5 }), 'outdoor');
    const windy = nflWeatherImpact(makeWeather({ windSpeedMph: 35 }), 'outdoor');
    expect(windy.rushingImpact).toBeGreaterThan(calm.rushingImpact);
  });

  it('overallFactor stays within 0.7–1.0 bounds', () => {
    const extreme = nflWeatherImpact(
      makeWeather({
        temperatureF: -10,
        windSpeedMph: 50,
        precipitationInches: 0.5,
        snowInches: 4,
      }),
      'outdoor',
    );
    expect(extreme.overallFactor).toBeGreaterThanOrEqual(0.7);
    expect(extreme.overallFactor).toBeLessThanOrEqual(1.0);
  });

  it('notes array is populated for significant conditions', () => {
    const impact = nflWeatherImpact(
      makeWeather({ temperatureF: 10, windSpeedMph: 25 }),
      'outdoor',
    );
    expect(impact.notes.length).toBeGreaterThan(0);
  });
});

// ─── MLB Wind Impact ──────────────────────────────────────────────────────────

describe('mlbWindImpact', () => {
  it('15mph tailwind blowing out → over lean', () => {
    // ballpark oriented toward North (0°), wind from South (180°) = tailwind
    const impact = mlbWindImpact(
      makeWeather({ windSpeedMph: 15, windDirectionDeg: 180 }),
      0,
    );
    expect(impact.bettingEdge).toBe('over');
    expect(impact.hrBoost).toBeGreaterThan(0);
  });

  it('15mph headwind blowing in → under lean', () => {
    // ballpark oriented toward North (0°), wind from North (0°) = headwind
    const impact = mlbWindImpact(
      makeWeather({ windSpeedMph: 15, windDirectionDeg: 0 }),
      0,
    );
    expect(impact.bettingEdge).toBe('under');
    expect(impact.hrBoost).toBeLessThan(0);
  });

  it('crosswind (90°) → neutral lean', () => {
    // ballpark toward North (0°), wind from East (90°) = crosswind
    const impact = mlbWindImpact(
      makeWeather({ windSpeedMph: 12, windDirectionDeg: 90 }),
      0,
    );
    expect(impact.bettingEdge).toBe('neutral');
  });

  it('calm wind → neutral', () => {
    const impact = mlbWindImpact(makeWeather({ windSpeedMph: 3 }), 0);
    expect(impact.bettingEdge).toBe('neutral');
  });

  it('mph field matches input wind speed', () => {
    const impact = mlbWindImpact(makeWeather({ windSpeedMph: 20 }), 90);
    expect(impact.mph).toBe(20);
  });

  it('returns a valid WindDirection', () => {
    const valid = ['left-to-right', 'right-to-left', 'in', 'out', 'crosswind'];
    const impact = mlbWindImpact(makeWeather({ windSpeedMph: 12, windDirectionDeg: 45 }), 90);
    expect(valid).toContain(impact.direction);
  });
});

// ─── MLB Temperature Impact ───────────────────────────────────────────────────

describe('mlbTemperatureImpact', () => {
  it('75°F baseline returns exactly 1.0', () => {
    expect(mlbTemperatureImpact(75)).toBe(1.0);
  });

  it('85°F returns above 1.0 (more offense)', () => {
    expect(mlbTemperatureImpact(85)).toBeGreaterThan(1.0);
  });

  it('50°F returns below 1.0 (less offense)', () => {
    expect(mlbTemperatureImpact(50)).toBeLessThan(1.0);
  });

  it('higher temperature consistently means more offense', () => {
    const f60 = mlbTemperatureImpact(60);
    const f75 = mlbTemperatureImpact(75);
    const f90 = mlbTemperatureImpact(90);
    expect(f60).toBeLessThan(f75);
    expect(f75).toBeLessThan(f90);
  });
});

// ─── Soccer Weather Impact ────────────────────────────────────────────────────

describe('soccerWeatherImpact', () => {
  it('heavy rain + grass → heavyPitch = true', () => {
    const result = soccerWeatherImpact(
      makeWeather({ precipitationInches: 0.4 }),
      'grass',
    );
    expect(result.heavyPitch).toBe(true);
  });

  it('heavy rain + turf → heavyPitch = false', () => {
    const result = soccerWeatherImpact(
      makeWeather({ precipitationInches: 0.4 }),
      'turf',
    );
    expect(result.heavyPitch).toBe(false);
  });

  it('heavy rain slows pace (paceFactor < 1)', () => {
    const result = soccerWeatherImpact(
      makeWeather({ precipitationInches: 0.4 }),
      'grass',
    );
    expect(result.paceFactor).toBeLessThan(1.0);
  });

  it('mild conditions → no heavy pitch, full pace', () => {
    const result = soccerWeatherImpact(makeWeather(), 'grass');
    expect(result.heavyPitch).toBe(false);
    expect(result.paceFactor).toBe(1.0);
    expect(result.scoringFactor).toBe(1.0);
  });

  it('cold weather reduces scoring factor', () => {
    const cold = soccerWeatherImpact(makeWeather({ temperatureF: 20 }), 'grass');
    const mild = soccerWeatherImpact(makeWeather({ temperatureF: 65 }), 'grass');
    expect(cold.scoringFactor).toBeLessThan(mild.scoringFactor);
  });

  it('scoringFactor stays within 0.7–1.0', () => {
    const extreme = soccerWeatherImpact(
      makeWeather({ temperatureF: 10, windSpeedMph: 40, precipitationInches: 0.5 }),
      'grass',
    );
    expect(extreme.scoringFactor).toBeGreaterThanOrEqual(0.7);
    expect(extreme.scoringFactor).toBeLessThanOrEqual(1.0);
  });
});

// ─── Golf Weather Impact ──────────────────────────────────────────────────────

describe('golfWeatherImpact', () => {
  it('30mph wind → very_challenging', () => {
    const result = golfWeatherImpact(makeWeather({ windSpeedMph: 30 }));
    expect(result.severity).toBe('very_challenging');
  });

  it('calm conditions → playable', () => {
    const result = golfWeatherImpact(makeWeather({ windSpeedMph: 5, temperatureF: 72 }));
    expect(result.severity).toBe('playable');
  });

  it('extreme wind (45+ mph) or heavy rain → extreme severity', () => {
    const result = golfWeatherImpact(makeWeather({ windSpeedMph: 45 }));
    expect(result.severity).toBe('extreme');
  });

  it('control penalty increases with wind speed', () => {
    const low = golfWeatherImpact(makeWeather({ windSpeedMph: 5 }));
    const high = golfWeatherImpact(makeWeather({ windSpeedMph: 25 }));
    expect(high.controlPenalty).toBeGreaterThan(low.controlPenalty);
  });

  it('warm temperature produces positive distance effect', () => {
    const warm = golfWeatherImpact(makeWeather({ temperatureF: 90, windSpeedMph: 0 }));
    const cool = golfWeatherImpact(makeWeather({ temperatureF: 50, windSpeedMph: 0 }));
    expect(warm.distanceEffect).toBeGreaterThan(cool.distanceEffect);
  });

  it('heavy rain makes conditions at least challenging', () => {
    const result = golfWeatherImpact(makeWeather({ precipitationInches: 0.4, windSpeedMph: 5 }));
    expect(['challenging', 'very_challenging', 'extreme']).toContain(result.severity);
  });
});

// ─── Tennis Weather Impact ────────────────────────────────────────────────────

describe('tennisWeatherImpact', () => {
  it('rain > 0.1" → not playable', () => {
    const result = tennisWeatherImpact(makeWeather({ precipitationInches: 0.15 }));
    expect(result.playable).toBe(false);
  });

  it('wind > 30mph → not playable', () => {
    const result = tennisWeatherImpact(makeWeather({ windSpeedMph: 35 }));
    expect(result.playable).toBe(false);
  });

  it('mild conditions → playable', () => {
    const result = tennisWeatherImpact(makeWeather({ windSpeedMph: 5, precipitationInches: 0 }));
    expect(result.playable).toBe(true);
  });

  it('hot+dry = higher ball bounce', () => {
    const result = tennisWeatherImpact(
      makeWeather({ temperatureF: 95, humidity: 30, windSpeedMph: 5 }),
    );
    expect(result.ballBounce).toBe('higher');
  });

  it('cold conditions = lower ball bounce', () => {
    const result = tennisWeatherImpact(makeWeather({ temperatureF: 40, windSpeedMph: 5 }));
    expect(result.ballBounce).toBe('lower');
  });

  it('mild conditions = normal bounce', () => {
    const result = tennisWeatherImpact(makeWeather({ temperatureF: 70, humidity: 50 }));
    expect(result.ballBounce).toBe('normal');
  });

  it('high heat index (>95) increases fatigue multiplier', () => {
    const hot = tennisWeatherImpact(makeWeather({ temperatureF: 100, humidity: 85 }));
    const mild = tennisWeatherImpact(makeWeather({ temperatureF: 72, humidity: 50 }));
    expect(hot.fatigueMultiplier).toBeGreaterThan(mild.fatigueMultiplier);
  });

  it('strong wind reduces serve effect', () => {
    const calm = tennisWeatherImpact(makeWeather({ windSpeedMph: 5 }));
    const windy = tennisWeatherImpact(makeWeather({ windSpeedMph: 25 }));
    expect(windy.serveEffect).toBeLessThan(calm.serveEffect);
  });
});

// ─── Weather Betting Edge ─────────────────────────────────────────────────────

describe('weatherBettingEdge', () => {
  it('cold + windy NFL outdoor → under lean', () => {
    const edge = weatherBettingEdge(
      makeWeather({ temperatureF: 20, windSpeedMph: 25 }),
      'nfl',
      'outdoor',
    );
    expect(edge.totalLean).toBe('under');
  });

  it('mild dome NFL → neutral', () => {
    const edge = weatherBettingEdge(
      makeWeather({ temperatureF: 65, windSpeedMph: 5 }),
      'nfl',
      'dome',
    );
    expect(edge.totalLean).toBe('neutral');
  });

  it('NBA → always neutral (indoor sport)', () => {
    const edge = weatherBettingEdge(
      makeWeather({ temperatureF: 0, windSpeedMph: 40 }),
      'nba',
    );
    expect(edge.totalLean).toBe('neutral');
    expect(edge.confidence).toBe('low');
  });

  it('NHL → always neutral (indoor sport)', () => {
    const edge = weatherBettingEdge(
      makeWeather({ temperatureF: 5, windSpeedMph: 50 }),
      'nhl',
    );
    expect(edge.totalLean).toBe('neutral');
  });

  it('factors array is non-empty', () => {
    const edge = weatherBettingEdge(makeWeather(), 'nfl', 'outdoor');
    expect(edge.factors.length).toBeGreaterThan(0);
  });

  it('confidence is one of low/medium/high', () => {
    const valid = ['low', 'medium', 'high'];
    const edge = weatherBettingEdge(makeWeather(), 'nfl', 'outdoor');
    expect(valid).toContain(edge.confidence);
  });

  it('MLB with strong tailwind out → over lean', () => {
    // Wind from South (180°), ballpark toward North (0°) = pure tailwind
    const edge = weatherBettingEdge(
      makeWeather({ windSpeedMph: 20, windDirectionDeg: 180 }),
      'mlb',
      'outdoor',
      0,
    );
    expect(edge.totalLean).toBe('over');
  });

  it('heavy snow NFL outdoor → under lean with spread effect', () => {
    const edge = weatherBettingEdge(
      makeWeather({ temperatureF: 25, windSpeedMph: 10, snowInches: 2 }),
      'nfl',
      'outdoor',
    );
    expect(edge.totalLean).toBe('under');
    expect(edge.spreadEffect).toBeLessThan(0);
  });
});

// ─── Weather Regression Multiplier ───────────────────────────────────────────

describe('weatherRegressionMultiplier', () => {
  it('extreme conditions → multiplier < 1.0', () => {
    const mult = weatherRegressionMultiplier(10, 40, 0.5, 'nfl');
    expect(mult).toBeLessThan(1.0);
  });

  it('mild conditions → multiplier close to 1.0', () => {
    const mult = weatherRegressionMultiplier(72, 3, 0, 'nfl');
    expect(mult).toBeGreaterThanOrEqual(0.99);
    expect(mult).toBeLessThanOrEqual(1.0);
  });

  it('multiplier always stays within 0.85–1.0', () => {
    const extremes: [number, number, number, 'nfl'][] = [
      [-10, 60, 1.0, 'nfl'],
      [100, 0, 0, 'nfl'],
      [32, 30, 0.5, 'nfl'],
      [72, 0, 0, 'nfl'],
    ];
    extremes.forEach(([temp, wind, precip, sport]) => {
      const mult = weatherRegressionMultiplier(temp, wind, precip, sport);
      expect(mult).toBeGreaterThanOrEqual(0.85);
      expect(mult).toBeLessThanOrEqual(1.0);
    });
  });

  it('wind has no effect on indoor sports (NBA)', () => {
    const withWind = weatherRegressionMultiplier(72, 50, 0, 'nba');
    const noWind = weatherRegressionMultiplier(72, 0, 0, 'nba');
    expect(withWind).toBe(noWind);
  });

  it('heavy precipitation reduces multiplier', () => {
    const dryMult = weatherRegressionMultiplier(72, 5, 0, 'nfl');
    const wetMult = weatherRegressionMultiplier(72, 5, 0.4, 'nfl');
    expect(wetMult).toBeLessThan(dryMult);
  });
});

// ─── Fan Comfort Index ────────────────────────────────────────────────────────

describe('fanComfortIndex', () => {
  it('72°F, low wind → high comfort score (> 80)', () => {
    const score = fanComfortIndex(makeWeather({ temperatureF: 72, windSpeedMph: 3 }));
    expect(score).toBeGreaterThan(80);
  });

  it('10°F blizzard → very low comfort score (< 20)', () => {
    const score = fanComfortIndex(
      makeWeather({
        temperatureF: 10,
        windSpeedMph: 30,
        precipitationInches: 0.4,
        snowInches: 3,
      }),
    );
    expect(score).toBeLessThan(20);
  });

  it('perfect weather (~72°F, no wind, no rain) → high score', () => {
    const score = fanComfortIndex(
      makeWeather({ temperatureF: 72, windSpeedMph: 0, precipitationInches: 0, humidity: 45 }),
    );
    expect(score).toBeGreaterThan(85);
  });

  it('score is between 0 and 100', () => {
    const extremes: Array<Partial<WeatherConditions>> = [
      { temperatureF: -20, windSpeedMph: 60, precipitationInches: 1 },
      { temperatureF: 120, humidity: 100 },
      { temperatureF: 72, windSpeedMph: 5 },
    ];
    extremes.forEach((o) => {
      const score = fanComfortIndex(makeWeather(o));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  it('heavy rain reduces comfort significantly', () => {
    const dry = fanComfortIndex(makeWeather({ precipitationInches: 0 }));
    const wet = fanComfortIndex(makeWeather({ precipitationInches: 0.4 }));
    expect(wet).toBeLessThan(dry - 10);
  });

  it('very cold temp reduces comfort significantly', () => {
    const comfortable = fanComfortIndex(makeWeather({ temperatureF: 72 }));
    const freezing = fanComfortIndex(makeWeather({ temperatureF: 10 }));
    expect(freezing).toBeLessThan(comfortable - 20);
  });
});

// ─── Is Weather Game ──────────────────────────────────────────────────────────

describe('isWeatherGame', () => {
  it('dome → false regardless of conditions', () => {
    expect(
      isWeatherGame(
        makeWeather({ temperatureF: 10, windSpeedMph: 40, precipitationInches: 0.5 }),
        'nfl',
        'dome',
      ),
    ).toBe(false);
  });

  it('NBA → always false', () => {
    expect(
      isWeatherGame(
        makeWeather({ temperatureF: -10, windSpeedMph: 60 }),
        'nba',
      ),
    ).toBe(false);
  });

  it('NHL → always false', () => {
    expect(
      isWeatherGame(
        makeWeather({ temperatureF: -10, windSpeedMph: 60 }),
        'nhl',
      ),
    ).toBe(false);
  });

  it('outdoor cold+wind NFL → true', () => {
    expect(
      isWeatherGame(
        makeWeather({ temperatureF: 20, windSpeedMph: 25 }),
        'nfl',
        'outdoor',
      ),
    ).toBe(true);
  });

  it('outdoor mild NFL → false', () => {
    expect(
      isWeatherGame(
        makeWeather({ temperatureF: 65, windSpeedMph: 8, precipitationInches: 0 }),
        'nfl',
        'outdoor',
      ),
    ).toBe(false);
  });

  it('outdoor freezing temp NFL → true', () => {
    expect(
      isWeatherGame(
        makeWeather({ temperatureF: 28, windSpeedMph: 5 }),
        'nfl',
        'outdoor',
      ),
    ).toBe(true);
  });

  it('MLB rain → true', () => {
    expect(
      isWeatherGame(
        makeWeather({ precipitationInches: 0.1, temperatureF: 65 }),
        'mlb',
      ),
    ).toBe(true);
  });

  it('golf with light wind (5mph, 65°F) → false', () => {
    expect(
      isWeatherGame(makeWeather({ windSpeedMph: 5, temperatureF: 65 }), 'golf'),
    ).toBe(false);
  });

  it('golf with strong wind → true', () => {
    expect(
      isWeatherGame(makeWeather({ windSpeedMph: 20, temperatureF: 65 }), 'golf'),
    ).toBe(true);
  });

  it('tennis with rain > 0.1" → true', () => {
    expect(
      isWeatherGame(makeWeather({ precipitationInches: 0.15 }), 'tennis'),
    ).toBe(true);
  });

  it('soccer heavy precipitation → true', () => {
    expect(
      isWeatherGame(makeWeather({ precipitationInches: 0.3 }), 'soccer'),
    ).toBe(true);
  });

  it('retractable stadium → false', () => {
    expect(
      isWeatherGame(
        makeWeather({ temperatureF: 5, windSpeedMph: 50 }),
        'nfl',
        'retractable',
      ),
    ).toBe(false);
  });
});
