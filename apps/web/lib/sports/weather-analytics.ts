/**
 * Weather Analytics — Pure TypeScript weather impact model for outdoor sports
 * No external dependencies. Strict TypeScript.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeatherConditions {
  temperatureF: number;
  windSpeedMph: number;
  windDirectionDeg: number; // 0-360; 0=North, 90=East, 180=South, 270=West
  precipitationInches: number;
  humidity: number; // 0-100
  snowInches?: number;
  visibility?: number; // miles
  pressure?: number; // inHg
}

export type Sport = 'nfl' | 'mlb' | 'nba' | 'nhl' | 'soccer' | 'golf' | 'tennis';
export type StadiumType = 'outdoor' | 'dome' | 'retractable';
export type WindDirection = 'left-to-right' | 'right-to-left' | 'in' | 'out' | 'crosswind';

export interface WeatherImpact {
  severity: 'none' | 'minimal' | 'moderate' | 'significant' | 'severe';
  overallFactor: number; // 0.7-1.0
  scoringImpact: number; // negative = reduced scoring
  passingImpact: number; // -100 to 0
  rushingImpact: number; // -50 to +25
  kickingImpact: number;
  notes: string[];
}

export interface BallparkWindImpact {
  direction: WindDirection;
  mph: number;
  bettingEdge: 'over' | 'under' | 'neutral';
  hrBoost: number; // estimated HR% change
  runBoost: number; // estimated run% change
}

export interface GolfWeatherImpact {
  distanceEffect: number; // yards gained/lost per hole
  controlPenalty: number; // % accuracy reduction
  severity: 'playable' | 'challenging' | 'very_challenging' | 'extreme';
}

// ─── Temperature Utilities ─────────────────────────────────────────────────────

export function fahrenheitToCelsius(f: number): number {
  return (f - 32) * (5 / 9);
}

export function celsiusToFahrenheit(c: number): number {
  return c * (9 / 5) + 32;
}

/**
 * Wind chill formula (NWS):
 * 35.74 + 0.6215*T - 35.75*V^0.16 + 0.4275*T*V^0.16
 * Only applicable when T <= 50°F and V > 3 mph.
 */
export function windChill(tempF: number, windMph: number): number {
  if (tempF > 50 || windMph <= 3) return tempF;
  const v016 = Math.pow(windMph, 0.16);
  return 35.74 + 0.6215 * tempF - 35.75 * v016 + 0.4275 * tempF * v016;
}

/**
 * Heat Index using the Steadman/NWS full regression formula.
 * Only applicable when T >= 80°F and RH >= 40%.
 */
export function heatIndex(tempF: number, humidity: number): number {
  if (tempF < 80 || humidity < 40) return tempF;
  const T = tempF;
  const RH = humidity;
  let hi =
    -42.379 +
    2.04901523 * T +
    10.14333127 * RH -
    0.22475541 * T * RH -
    0.00683783 * T * T -
    0.05481717 * RH * RH +
    0.00122874 * T * T * RH +
    0.00085282 * T * RH * RH -
    0.00000199 * T * T * RH * RH;

  // Adjustment for low humidity
  if (RH < 13 && T >= 80 && T <= 112) {
    hi -= ((13 - RH) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  }
  // Adjustment for high humidity
  if (RH > 85 && T >= 80 && T <= 87) {
    hi += ((RH - 85) / 10) * ((87 - T) / 5);
  }

  return hi;
}

/**
 * Dew point using the August-Roche-Magnus approximation.
 * Calculates in Celsius, returns Fahrenheit.
 */
export function dewPoint(tempF: number, humidity: number): number {
  const tc = fahrenheitToCelsius(tempF);
  const rh = Math.max(1, Math.min(100, humidity));
  // Magnus constants
  const a = 17.625;
  const b = 243.04;
  const alpha = (a * tc) / (b + tc) + Math.log(rh / 100);
  const dpC = (b * alpha) / (a - alpha);
  return celsiusToFahrenheit(dpC);
}

/**
 * Apparent temperature:
 * - Heat index if T > 80°F and humidity relevant
 * - Wind chill if T < 50°F and wind relevant
 * - Otherwise actual temp
 */
export function apparentTemperature(tempF: number, windMph: number, humidity: number): number {
  if (tempF < 50) {
    return windChill(tempF, windMph);
  } else if (tempF > 80) {
    return heatIndex(tempF, humidity);
  }
  return tempF;
}

// ─── Wind Analysis ─────────────────────────────────────────────────────────────

// Beaufort scale upper limits (exclusive): mph < limit → that force
// Force 0: < 1 mph; Force 1: 1-3 mph; etc.
const BEAUFORT_SCALE: { limit: number; force: number; description: string }[] = [
  { limit: 1, force: 0, description: 'Calm' },
  { limit: 4, force: 1, description: 'Light air' },
  { limit: 8, force: 2, description: 'Light breeze' },
  { limit: 13, force: 3, description: 'Gentle breeze' },
  { limit: 19, force: 4, description: 'Moderate breeze' },
  { limit: 25, force: 5, description: 'Fresh breeze' },
  { limit: 32, force: 6, description: 'Strong breeze' },
  { limit: 39, force: 7, description: 'Near gale' },
  { limit: 47, force: 8, description: 'Gale' },
  { limit: 55, force: 9, description: 'Severe gale' },
  { limit: 64, force: 10, description: 'Storm' },
  { limit: 73, force: 11, description: 'Violent storm' },
  { limit: Infinity, force: 12, description: 'Hurricane' },
];

export function beaufortScale(windMph: number): { force: number; description: string } {
  const mph = Math.max(0, windMph);
  for (const entry of BEAUFORT_SCALE) {
    if (mph < entry.limit) {
      return { force: entry.force, description: entry.description };
    }
  }
  return { force: 12, description: 'Hurricane' };
}

/**
 * Decompose wind into headwind and crosswind components relative to ballpark orientation.
 * headwind = windMph * cos(angleDiff)  — positive = headwind, negative = tailwind
 * crosswind = windMph * sin(angleDiff)
 */
export function windComponentsAtBallpark(
  windDeg: number,
  ballparkOrientationDeg: number,
  windMph: number,
): { headwind: number; crosswind: number } {
  // angleDiff: how much the wind direction differs from the ballpark orientation
  const angleDiffDeg = windDeg - ballparkOrientationDeg;
  const angleDiffRad = (angleDiffDeg * Math.PI) / 180;
  const headwind = windMph * Math.cos(angleDiffRad);
  const crosswind = windMph * Math.sin(angleDiffRad);
  return { headwind, crosswind };
}

/**
 * Classify wind direction relative to home plate direction.
 */
export function stadiumWindAngle(
  windDeg: number,
  ballparkOrientationDeg: number,
): WindDirection {
  const { headwind, crosswind } = windComponentsAtBallpark(
    windDeg,
    ballparkOrientationDeg,
    1,
  );
  const absHead = Math.abs(headwind);
  const absCross = Math.abs(crosswind);

  if (absHead >= absCross) {
    if (headwind > 0) return 'in'; // blowing toward batter (headwind = in toward plate)
    return 'out'; // negative headwind = tailwind = blowing out toward OF
  }
  // crosswind dominant
  if (crosswind > 0) return 'left-to-right';
  return 'right-to-left';
}

// ─── Precipitation ─────────────────────────────────────────────────────────────

export function precipSeverity(
  inches: number,
): 'none' | 'light' | 'moderate' | 'heavy' {
  if (inches <= 0) return 'none';
  if (inches < 0.1) return 'light';
  if (inches < 0.3) return 'moderate';
  return 'heavy';
}

export function snowImpact(
  snowInches: number,
): { fieldConditions: 'normal' | 'poor' | 'very_poor'; footing: number } {
  if (snowInches <= 0) {
    return { fieldConditions: 'normal', footing: 1.0 };
  }
  if (snowInches < 0.5) {
    return { fieldConditions: 'normal', footing: 0.95 };
  }
  if (snowInches < 1.0) {
    return { fieldConditions: 'poor', footing: 0.9 };
  }
  if (snowInches < 2.0) {
    return { fieldConditions: 'poor', footing: 0.8 };
  }
  return { fieldConditions: 'very_poor', footing: 0.65 };
}

// ─── NFL Weather Impact ────────────────────────────────────────────────────────

export function nflWeatherImpact(
  weather: WeatherConditions,
  stadiumType: StadiumType,
): WeatherImpact {
  // Dome / retractable closed → no impact
  if (stadiumType === 'dome' || stadiumType === 'retractable') {
    return {
      severity: 'none',
      overallFactor: 1.0,
      scoringImpact: 0,
      passingImpact: 0,
      rushingImpact: 0,
      kickingImpact: 0,
      notes: ['Indoor stadium — weather has no impact'],
    };
  }

  const notes: string[] = [];
  let overallFactor = 1.0;
  let passingImpact = 0;
  let rushingImpact = 0;
  let kickingImpact = 0;
  let negativeFactor = 0;

  const { temperatureF, windSpeedMph, precipitationInches } = weather;
  const snow = weather.snowInches ?? 0;

  // Temperature penalty
  if (temperatureF < 0) {
    overallFactor -= 0.1;
    passingImpact -= 25;
    kickingImpact -= 20;
    negativeFactor += 3;
    notes.push(`Extreme cold (${temperatureF}°F) severely reduces ball handling`);
  } else if (temperatureF < 20) {
    overallFactor -= 0.07;
    passingImpact -= 20;
    kickingImpact -= 15;
    negativeFactor += 2;
    notes.push(`Very cold (${temperatureF}°F) hurts passing and kicking`);
  } else if (temperatureF < 32) {
    overallFactor -= 0.04;
    passingImpact -= 12;
    kickingImpact -= 10;
    negativeFactor += 1;
    notes.push(`Freezing temps (${temperatureF}°F) affect passing`);
  } else if (temperatureF > 95) {
    overallFactor -= 0.02;
    negativeFactor += 1;
    notes.push(`High heat (${temperatureF}°F) increases fatigue`);
  }

  // Wind penalty
  if (windSpeedMph > 30) {
    overallFactor -= 0.1;
    passingImpact -= 35;
    kickingImpact -= 30;
    rushingImpact += 10;
    negativeFactor += 3;
    notes.push(`High winds (${windSpeedMph} mph) severely impact passing game`);
  } else if (windSpeedMph > 20) {
    overallFactor -= 0.06;
    passingImpact -= 20;
    kickingImpact -= 20;
    rushingImpact += 5;
    negativeFactor += 2;
    notes.push(`Strong winds (${windSpeedMph} mph) limit passing`);
  } else if (windSpeedMph > 15) {
    overallFactor -= 0.03;
    passingImpact -= 10;
    kickingImpact -= 10;
    rushingImpact += 3;
    negativeFactor += 1;
    notes.push(`Moderate winds (${windSpeedMph} mph) may affect passing`);
  }

  // Precipitation penalty
  const precip = precipSeverity(precipitationInches);
  if (precip === 'heavy') {
    overallFactor -= 0.08;
    passingImpact -= 20;
    rushingImpact -= 5;
    kickingImpact -= 15;
    negativeFactor += 2;
    notes.push('Heavy precipitation affects footing and ball handling');
  } else if (precip === 'moderate') {
    overallFactor -= 0.04;
    passingImpact -= 10;
    kickingImpact -= 8;
    negativeFactor += 1;
    notes.push('Moderate precipitation may cause fumbles');
  } else if (precip === 'light') {
    overallFactor -= 0.01;
    kickingImpact -= 3;
    notes.push('Light precipitation — minimal impact');
  }

  // Snow penalty
  if (snow >= 2) {
    overallFactor -= 0.08;
    passingImpact -= 15;
    rushingImpact -= 10;
    kickingImpact -= 25;
    negativeFactor += 2;
    notes.push(`Heavy snow (${snow}") creates treacherous conditions`);
  } else if (snow >= 0.5) {
    overallFactor -= 0.04;
    passingImpact -= 8;
    kickingImpact -= 15;
    negativeFactor += 1;
    notes.push(`Snow (${snow}") on field affects footing`);
  }

  // Clamp overallFactor
  overallFactor = Math.max(0.7, Math.min(1.0, overallFactor));
  passingImpact = Math.max(-100, Math.min(0, passingImpact));
  rushingImpact = Math.max(-50, Math.min(25, rushingImpact));

  // Determine severity
  let severity: WeatherImpact['severity'];
  if (negativeFactor === 0) {
    severity = 'none';
  } else if (negativeFactor === 1) {
    severity = 'minimal';
  } else if (negativeFactor === 2) {
    // Two moderate factors together are significant
    severity = 'significant';
  } else if (negativeFactor <= 4) {
    severity = 'significant';
  } else {
    severity = 'severe';
  }

  const scoringImpact = Math.round((overallFactor - 1.0) * 100);

  return {
    severity,
    overallFactor: Math.round(overallFactor * 1000) / 1000,
    scoringImpact,
    passingImpact,
    rushingImpact,
    kickingImpact,
    notes,
  };
}

// ─── MLB Wind Impact ───────────────────────────────────────────────────────────

export function mlbWindImpact(
  weather: WeatherConditions,
  ballparkOrientationDeg: number,
): BallparkWindImpact {
  const { windSpeedMph, windDirectionDeg } = weather;
  const { headwind, crosswind } = windComponentsAtBallpark(
    windDirectionDeg,
    ballparkOrientationDeg,
    windSpeedMph,
  );
  const direction = stadiumWindAngle(windDirectionDeg, ballparkOrientationDeg);

  // Tailwind (negative headwind) boosts offense; headwind hurts offense
  let bettingEdge: BallparkWindImpact['bettingEdge'] = 'neutral';
  let hrBoost = 0;
  let runBoost = 0;

  const tailwind = -headwind; // positive tailwind means blowing out
  const absCross = Math.abs(crosswind);

  if (tailwind > 10) {
    // Strong tailwind blowing out
    bettingEdge = 'over';
    hrBoost = Math.min(30, tailwind * 1.2);
    runBoost = Math.min(20, tailwind * 0.8);
  } else if (headwind > 10) {
    // Strong headwind blowing in
    bettingEdge = 'under';
    hrBoost = -Math.min(25, headwind * 1.0);
    runBoost = -Math.min(15, headwind * 0.6);
  } else if (absCross > 10) {
    // Significant crosswind
    bettingEdge = 'neutral';
    hrBoost = 0;
    runBoost = 0;
  }

  return {
    direction,
    mph: windSpeedMph,
    bettingEdge,
    hrBoost: Math.round(hrBoost * 10) / 10,
    runBoost: Math.round(runBoost * 10) / 10,
  };
}

/**
 * Estimated run factor relative to 75°F baseline.
 * Ball travels ~3% farther per 10°F increase.
 */
export function mlbTemperatureImpact(tempF: number): number {
  const deltaT = tempF - 75;
  const factor = 1.0 + (deltaT / 10) * 0.03;
  return Math.round(factor * 10000) / 10000;
}

// ─── Soccer Weather Impact ─────────────────────────────────────────────────────

export function soccerWeatherImpact(
  weather: WeatherConditions,
  surfaceType: 'grass' | 'turf',
): { heavyPitch: boolean; scoringFactor: number; paceFactor: number } {
  const { precipitationInches, temperatureF, windSpeedMph } = weather;
  const precip = precipSeverity(precipitationInches);

  let heavyPitch = false;
  let scoringFactor = 1.0;
  let paceFactor = 1.0;

  // Heavy rain on grass = heavy pitch
  if (precip === 'heavy' && surfaceType === 'grass') {
    heavyPitch = true;
    scoringFactor -= 0.1;
    paceFactor -= 0.15; // slows pace
  } else if (precip === 'moderate' && surfaceType === 'grass') {
    heavyPitch = true;
    scoringFactor -= 0.05;
    paceFactor -= 0.08;
  } else if (precip === 'light') {
    paceFactor -= 0.03;
  }

  // Cold weather
  if (temperatureF < 32) {
    scoringFactor -= 0.05;
    paceFactor -= 0.05;
  }

  // Strong wind
  if (windSpeedMph > 25) {
    scoringFactor -= 0.05;
    paceFactor -= 0.05;
  }

  return {
    heavyPitch,
    scoringFactor: Math.max(0.7, Math.round(scoringFactor * 100) / 100),
    paceFactor: Math.max(0.7, Math.round(paceFactor * 100) / 100),
  };
}

// ─── Golf Weather Impact ───────────────────────────────────────────────────────

export function golfWeatherImpact(weather: WeatherConditions): GolfWeatherImpact {
  const { windSpeedMph, temperatureF, precipitationInches } = weather;

  let distanceEffect = 0;
  let controlPenalty = 0;
  let severity: GolfWeatherImpact['severity'] = 'playable';

  // Temperature effects on ball flight (~2 yards per 10°F from 70°F baseline)
  const tempDelta = temperatureF - 70;
  distanceEffect += (tempDelta / 10) * 2;

  // Wind effects
  if (windSpeedMph >= 30) {
    distanceEffect -= windSpeedMph * 0.4;
    controlPenalty = Math.min(50, windSpeedMph * 1.2);
    severity = 'very_challenging';
  } else if (windSpeedMph > 20) {
    distanceEffect -= windSpeedMph * 0.25;
    controlPenalty = Math.min(30, windSpeedMph * 0.9);
    severity = 'challenging';
  } else if (windSpeedMph > 10) {
    distanceEffect -= windSpeedMph * 0.1;
    controlPenalty = Math.min(15, windSpeedMph * 0.5);
  }

  // Rain effects
  const precip = precipSeverity(precipitationInches);
  if (precip === 'heavy') {
    controlPenalty = Math.min(60, controlPenalty + 15);
    if (severity !== 'very_challenging') severity = 'challenging';
  } else if (precip === 'moderate') {
    controlPenalty = Math.min(60, controlPenalty + 8);
  }

  // Extreme temp
  if (temperatureF < 32 || temperatureF > 100) {
    if (severity === 'playable') severity = 'challenging';
    controlPenalty = Math.min(60, controlPenalty + 10);
  }

  // Extreme conditions upgrade
  if (windSpeedMph > 40 || precipitationInches >= 0.5) {
    severity = 'extreme';
  }

  return {
    distanceEffect: Math.round(distanceEffect * 10) / 10,
    controlPenalty: Math.round(controlPenalty * 10) / 10,
    severity,
  };
}

// ─── Tennis Weather Impact ─────────────────────────────────────────────────────

export function tennisWeatherImpact(weather: WeatherConditions): {
  ballBounce: 'higher' | 'normal' | 'lower';
  serveEffect: number;
  fatigueMultiplier: number;
  playable: boolean;
} {
  const { temperatureF, windSpeedMph, precipitationInches, humidity } = weather;

  // Not playable if rain > 0.1" or wind > 30mph
  const playable = precipitationInches <= 0.1 && windSpeedMph <= 30;

  // Ball bounce — hot/dry = higher; cold/wet = lower
  let ballBounce: 'higher' | 'normal' | 'lower' = 'normal';
  if (temperatureF > 85 && humidity < 50) {
    ballBounce = 'higher';
  } else if (temperatureF < 50 || precipitationInches > 0) {
    ballBounce = 'lower';
  }

  // Serve effect: wind reduces serve speed effectiveness
  const serveEffect = windSpeedMph > 10 ? -Math.min(15, windSpeedMph * 0.4) : 0;

  // Fatigue multiplier: heat index > 95 = higher fatigue
  const hi = heatIndex(temperatureF, humidity);
  let fatigueMultiplier = 1.0;
  if (hi > 105) {
    fatigueMultiplier = 1.4;
  } else if (hi > 95) {
    fatigueMultiplier = 1.2;
  } else if (hi > 85) {
    fatigueMultiplier = 1.1;
  }

  return {
    ballBounce,
    serveEffect: Math.round(serveEffect * 10) / 10,
    fatigueMultiplier,
    playable,
  };
}

// ─── Composite Betting Edge ────────────────────────────────────────────────────

export function weatherBettingEdge(
  weather: WeatherConditions,
  sport: Sport,
  stadiumType?: StadiumType,
  ballparkOrientation?: number,
): {
  totalLean: 'over' | 'under' | 'neutral';
  spreadEffect: number;
  confidence: 'low' | 'medium' | 'high';
  factors: string[];
} {
  const factors: string[] = [];
  let underScore = 0;
  let overScore = 0;
  let spreadEffect = 0;

  // Indoor sports or indoor stadiums — weather is irrelevant
  if (sport === 'nba' || sport === 'nhl') {
    return { totalLean: 'neutral', spreadEffect: 0, confidence: 'low', factors: ['Indoor sport — not weather affected'] };
  }

  if (stadiumType === 'dome' || stadiumType === 'retractable') {
    return { totalLean: 'neutral', spreadEffect: 0, confidence: 'low', factors: ['Indoor stadium'] };
  }

  const { temperatureF, windSpeedMph, precipitationInches } = weather;
  const snow = weather.snowInches ?? 0;

  if (sport === 'nfl') {
    const impact = nflWeatherImpact(weather, 'outdoor');
    if (impact.severity === 'significant' || impact.severity === 'severe') {
      underScore += 3;
      spreadEffect -= Math.abs(impact.scoringImpact) * 0.5;
      factors.push(...impact.notes.slice(0, 2));
    } else if (impact.severity === 'moderate') {
      underScore += 2;
      spreadEffect -= Math.abs(impact.scoringImpact) * 0.3;
      factors.push(...impact.notes.slice(0, 1));
    } else if (impact.severity === 'minimal') {
      underScore += 1;
    } else {
      factors.push('Mild conditions — no weather edge');
    }
  }

  if (sport === 'mlb' && ballparkOrientation !== undefined) {
    const windImpact = mlbWindImpact(weather, ballparkOrientation);
    if (windImpact.bettingEdge === 'over') {
      overScore += 2;
      spreadEffect += windImpact.runBoost * 0.1;
      factors.push(`Tailwind blowing out (${windImpact.mph} mph) — favors OVER`);
    } else if (windImpact.bettingEdge === 'under') {
      underScore += 2;
      spreadEffect -= Math.abs(windImpact.runBoost) * 0.1;
      factors.push(`Headwind blowing in (${windImpact.mph} mph) — favors UNDER`);
    }
    const tempFactor = mlbTemperatureImpact(temperatureF);
    if (tempFactor > 1.02) {
      overScore += 1;
      factors.push('Warm temps boost offense');
    } else if (tempFactor < 0.98) {
      underScore += 1;
      factors.push('Cold temps suppress offense');
    }
  }

  if (sport === 'soccer') {
    const soccerImpact = soccerWeatherImpact(weather, 'grass');
    if (soccerImpact.heavyPitch) {
      underScore += 2;
      factors.push('Heavy pitch conditions reduce scoring');
    }
  }

  if (sport === 'golf') {
    const golfImpact = golfWeatherImpact(weather);
    if (golfImpact.severity === 'extreme' || golfImpact.severity === 'very_challenging') {
      underScore += 2;
      factors.push(`Severe golf conditions: ${golfImpact.severity}`);
    }
  }

  // General temperature underline for all outdoor sports
  if (temperatureF < 20) {
    underScore += 2;
    spreadEffect -= 4;
    factors.push(`Very cold (${temperatureF}°F) suppresses scoring`);
  } else if (temperatureF < 32 && sport !== 'mlb') {
    underScore += 1;
    spreadEffect -= 2;
  }

  if (windSpeedMph > 25) {
    underScore += 1;
    factors.push(`Strong wind (${windSpeedMph} mph) reduces scoring`);
  }

  if (precipitationInches >= 0.3) {
    underScore += 1;
    factors.push('Heavy precipitation suppresses scoring');
  }

  if (snow >= 1) {
    underScore += 2;
    spreadEffect -= 3;
    factors.push('Snow reduces scoring significantly');
  }

  // Determine lean
  let totalLean: 'over' | 'under' | 'neutral' = 'neutral';
  if (underScore > overScore + 1) {
    totalLean = 'under';
  } else if (overScore > underScore + 1) {
    totalLean = 'over';
  }

  // Confidence based on number of factors and magnitude
  const factorCount = factors.filter(
    (f) => !f.includes('Mild') && !f.includes('Indoor') && !f.includes('no weather'),
  ).length;
  let confidence: 'low' | 'medium' | 'high' = 'low';
  if (factorCount >= 3 || Math.abs(underScore - overScore) >= 3) {
    confidence = 'high';
  } else if (factorCount >= 2 || Math.abs(underScore - overScore) >= 2) {
    confidence = 'medium';
  }

  if (factors.length === 0) {
    factors.push('No significant weather factors');
  }

  return {
    totalLean,
    spreadEffect: Math.round(spreadEffect * 10) / 10,
    confidence,
    factors,
  };
}

// ─── Historical Regression Multiplier ─────────────────────────────────────────

export function weatherRegressionMultiplier(
  temperature: number,
  windSpeed: number,
  precipitation: number,
  sport: Sport,
): number {
  let multiplier = 1.0;

  // Temperature penalty
  if (temperature < 20) {
    multiplier -= 0.08;
  } else if (temperature < 32) {
    multiplier -= 0.05;
  } else if (temperature > 95) {
    multiplier -= 0.02;
  }

  // Wind penalty (scaled by sport sensitivity)
  const windSensitivity: Record<Sport, number> = {
    nfl: 0.003,
    mlb: 0.002,
    golf: 0.004,
    soccer: 0.002,
    tennis: 0.003,
    nba: 0.0,
    nhl: 0.0,
  };

  multiplier -= windSpeed * windSensitivity[sport];

  // Precipitation penalty
  const precipSev = precipSeverity(precipitation);
  if (precipSev === 'heavy') {
    multiplier -= 0.05;
  } else if (precipSev === 'moderate') {
    multiplier -= 0.03;
  } else if (precipSev === 'light') {
    multiplier -= 0.01;
  }

  // Clamp to 0.85–1.0
  return Math.max(0.85, Math.min(1.0, Math.round(multiplier * 10000) / 10000));
}

// ─── Fan Comfort Index ─────────────────────────────────────────────────────────

export function fanComfortIndex(weather: WeatherConditions): number {
  let score = 100;
  const { temperatureF, windSpeedMph, precipitationInches, humidity } = weather;
  const snow = weather.snowInches ?? 0;

  // Temperature penalty
  const tempDeltaHot = Math.max(0, temperatureF - 85);
  const tempDeltaCold = Math.max(0, 55 - temperatureF);
  score -= tempDeltaHot * 1.5;
  score -= tempDeltaCold * 1.8;

  // Wind penalty
  if (windSpeedMph > 20) {
    score -= (windSpeedMph - 20) * 1.5;
  } else if (windSpeedMph > 10) {
    score -= (windSpeedMph - 10) * 0.5;
  }

  // Humidity penalty
  if (humidity > 80) {
    score -= (humidity - 80) * 0.4;
  }

  // Precipitation penalty
  const precip = precipSeverity(precipitationInches);
  if (precip === 'heavy') score -= 25;
  else if (precip === 'moderate') score -= 15;
  else if (precip === 'light') score -= 5;

  // Snow penalty
  if (snow >= 2) score -= 25;
  else if (snow >= 0.5) score -= 15;
  else if (snow > 0) score -= 5;

  // Apparent temperature adjustment (heat index impact)
  const apparent = apparentTemperature(temperatureF, windSpeedMph, humidity);
  if (apparent > 100) score -= 10;
  else if (apparent > 95) score -= 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── Is Weather Game ──────────────────────────────────────────────────────────

export function isWeatherGame(
  weather: WeatherConditions,
  sport: Sport,
  stadiumType?: StadiumType,
): boolean {
  // Indoor sports are never weather games
  if (sport === 'nba' || sport === 'nhl') return false;
  if (stadiumType === 'dome' || stadiumType === 'retractable') return false;

  const { temperatureF, windSpeedMph, precipitationInches } = weather;
  const snow = weather.snowInches ?? 0;

  // Sport-specific thresholds
  switch (sport) {
    case 'nfl':
      return (
        temperatureF < 32 ||
        windSpeedMph > 15 ||
        precipitationInches >= 0.1 ||
        snow >= 0.5
      );
    case 'mlb':
      return (
        temperatureF < 40 ||
        temperatureF > 95 ||
        windSpeedMph > 15 ||
        precipitationInches >= 0.05
      );
    case 'soccer':
      return (
        temperatureF < 25 ||
        windSpeedMph > 25 ||
        precipitationInches >= 0.2
      );
    case 'golf':
      return windSpeedMph > 15 || precipitationInches > 0.05 || temperatureF < 40;
    case 'tennis':
      return precipitationInches > 0.1 || windSpeedMph > 20 || temperatureF > 95;
    default:
      return false;
  }
}
