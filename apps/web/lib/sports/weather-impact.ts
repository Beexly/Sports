/**
 * Weather impact utilities — pure, zero dependencies.
 *
 * Wind, temperature, precipitation, and humidity effects on
 * outdoor sports betting. All functions return structured impact
 * assessments for NFL, MLB, and college football/baseball contexts.
 * Pure analytics — does not affect model or pick scores.
 */

export type WeatherImpactLevel = "none" | "low" | "moderate" | "high" | "severe";

export type SportType = "nfl" | "ncaaf" | "mlb" | "ncaab_outdoor";

export interface WeatherConditions {
  readonly tempF: number;
  readonly windSpeedMph: number;
  readonly windGustMph?: number;
  readonly precipitationInch: number;   // inches per hour (0 = none)
  readonly snowInch?: number;           // snow accumulation
  readonly humidity: number;            // 0-100
  readonly isIndoor: boolean;
}

export interface WeatherImpact {
  readonly level: WeatherImpactLevel;
  readonly score: number;               // 0-100 (0=no impact, 100=extreme)
  readonly favorsBetting: "under" | "over" | "neither";  // totals direction
  readonly affectsPassingGame: boolean;
  readonly affectsFooting: boolean;
  readonly description: string;
  readonly factors: readonly string[];  // list of active impact factors
}

// ----- Wind Impact -----

/**
 * Assess the impact of wind speed (and gusts) on outdoor sports.
 * If gustMph > windSpeedMph, gusts are used for classification.
 */
export function windImpact(
  windSpeedMph: number,
  gustMph?: number,
): { level: WeatherImpactLevel; score: number; description: string } {
  const effective = gustMph !== undefined && gustMph > windSpeedMph ? gustMph : windSpeedMph;

  if (effective >= 35) {
    return { level: "severe", score: 100, description: "Severe wind, major passing disruption" };
  }
  if (effective >= 25) {
    return { level: "high", score: 75, description: "High wind disrupts aerial game" };
  }
  if (effective >= 20) {
    return { level: "moderate", score: 50, description: "Strong wind affects passing" };
  }
  if (effective >= 15) {
    return { level: "low", score: 25, description: "Moderate wind" };
  }
  if (effective >= 10) {
    return { level: "low", score: 15, description: "Light wind" };
  }
  return { level: "none", score: 0, description: "" };
}

// ----- Temperature Impact -----

/**
 * Assess the impact of temperature on outdoor sports.
 */
export function temperatureImpact(
  tempF: number,
): { level: WeatherImpactLevel; score: number; description: string } {
  if (tempF > 110) {
    return { level: "severe", score: 100, description: "Extreme heat" };
  }
  if (tempF >= 100) {
    return { level: "moderate", score: 40, description: "Extreme heat" };
  }
  if (tempF >= 86) {
    return { level: "low", score: 15, description: "Hot conditions" };
  }
  if (tempF >= 50) {
    return { level: "none", score: 0, description: "Comfortable" };
  }
  if (tempF >= 35) {
    return { level: "low", score: 15, description: "Cool conditions" };
  }
  if (tempF >= 20) {
    return { level: "moderate", score: 40, description: "Cold game-time" };
  }
  if (tempF >= 5) {
    return { level: "high", score: 70, description: "Very cold, affects performance" };
  }
  return { level: "severe", score: 100, description: "Extreme cold" };
}

// ----- Precipitation Impact -----

/**
 * Assess the impact of precipitation on outdoor sports.
 * Snow accumulation adds +20 to score and changes label to "snow".
 */
export function precipitationImpact(
  precipInch: number,
  snowInch?: number,
): { level: WeatherImpactLevel; score: number; description: string } {
  const hasSnow = snowInch !== undefined && snowInch > 0;

  if (precipInch === 0 && !hasSnow) {
    return { level: "none", score: 0, description: "" };
  }

  let baseScore: number;
  let baseDescription: string;

  if (precipInch >= 0.5) {
    baseScore = 100;
    baseDescription = hasSnow ? "Severe snow" : "Severe precipitation";
  } else if (precipInch >= 0.25) {
    baseScore = 75;
    baseDescription = hasSnow ? "Heavy snow, significant impact" : "Heavy rain, significant impact";
  } else if (precipInch >= 0.1) {
    baseScore = 50;
    baseDescription = hasSnow ? "Moderate snow, affects footing" : "Moderate rain, affects footing";
  } else if (precipInch >= 0.01) {
    baseScore = 20;
    baseDescription = hasSnow ? "Light snow" : "Light rain";
  } else {
    // precipInch is 0 but we have snow
    baseScore = 0;
    baseDescription = "Light snow";
  }

  if (hasSnow) {
    baseScore = Math.min(100, baseScore + 20);
  }

  const finalScore = baseScore;

  let level: WeatherImpactLevel;
  if (finalScore === 0) {
    level = "none";
  } else if (finalScore <= 20) {
    level = "low";
  } else if (finalScore <= 50) {
    level = "moderate";
  } else if (finalScore <= 75) {
    level = "high";
  } else {
    level = "severe";
  }

  return { level, score: finalScore, description: baseDescription };
}

// ----- Overall Weather Impact -----

/**
 * Compute a combined weather impact for a given sport.
 * If the venue is indoor, returns a no-impact result immediately.
 */
export function overallWeatherImpact(
  conditions: WeatherConditions,
  sport: SportType = "nfl",
): WeatherImpact {
  if (conditions.isIndoor) {
    return {
      level: "none",
      score: 0,
      favorsBetting: "neither",
      affectsPassingGame: false,
      affectsFooting: false,
      description: "Indoor venue",
      factors: [],
    };
  }

  const wind = windImpact(conditions.windSpeedMph, conditions.windGustMph);
  const temp = temperatureImpact(conditions.tempF);
  const precip = precipitationImpact(conditions.precipitationInch, conditions.snowInch);

  const windScore = wind.score;
  const tempScore = temp.score;
  const precipScore = precip.score;

  const score = Math.max(windScore, tempScore, precipScore);

  let level: WeatherImpactLevel;
  if (score === 0) {
    level = "none";
  } else if (score <= 20) {
    level = "low";
  } else if (score <= 50) {
    level = "moderate";
  } else if (score <= 75) {
    level = "high";
  } else {
    level = "severe";
  }

  let favorsBetting: "under" | "over" | "neither";
  if (windScore >= 50 || precipScore >= 50) {
    favorsBetting = "under";
  } else if (score === 0) {
    favorsBetting = "over";
  } else {
    favorsBetting = "neither";
  }

  const affectsPassingGame = windScore >= 25 || precipScore >= 50;
  const affectsFooting =
    precipScore >= 25 || (conditions.snowInch !== undefined && conditions.snowInch > 0);

  const factors: string[] = [];
  if (wind.description) factors.push(wind.description);
  if (temp.description && temp.level !== "none") factors.push(temp.description);
  if (precip.description) factors.push(precip.description);

  const description = factors.length > 0 ? factors.join(", ") : "Clear conditions";

  // sport parameter reserved for future sport-specific adjustments
  void sport;

  return {
    level,
    score,
    favorsBetting,
    affectsPassingGame,
    affectsFooting,
    description,
    factors,
  };
}

// ----- Wind Chill -----

/**
 * NWS wind chill formula.
 * Only valid for T <= 50°F and windSpeed >= 3 mph.
 * Returns tempF unchanged if conditions not met.
 */
export function windChill(tempF: number, windSpeedMph: number): number {
  if (tempF > 50 || windSpeedMph < 3) {
    return tempF;
  }
  const V = windSpeedMph;
  const T = tempF;
  const V016 = Math.pow(V, 0.16);
  return 35.74 + 0.6215 * T - 35.75 * V016 + 0.4275 * T * V016;
}

// ----- Heat Index -----

/**
 * Steadman simplified heat index formula.
 * Only valid for T >= 80°F and humidity >= 40%.
 * Returns tempF unchanged if conditions not met.
 */
export function heatIndex(tempF: number, humidity: number): number {
  if (tempF < 80 || humidity < 40) {
    return tempF;
  }
  const T = tempF;
  const RH = humidity;
  return (
    -42.379 +
    2.04901523 * T +
    10.14333127 * RH -
    0.22475541 * T * RH -
    0.00683783 * T * T -
    0.05481717 * RH * RH +
    0.00122874 * T * T * RH +
    0.00085282 * T * RH * RH -
    0.00000199 * T * T * RH * RH
  );
}

// ----- Effective Temperature -----

/**
 * Compute perceived temperature accounting for wind chill or heat index.
 * - If tempF <= 50 and windSpeedMph >= 3: use windChill
 * - If tempF >= 80 and humidity >= 40: use heatIndex
 * - Otherwise: return tempF
 */
export function effectiveTemp(conditions: WeatherConditions): number {
  const { tempF, windSpeedMph, humidity } = conditions;
  if (tempF <= 50 && windSpeedMph >= 3) {
    return windChill(tempF, windSpeedMph);
  }
  if (tempF >= 80 && humidity >= 40) {
    return heatIndex(tempF, humidity);
  }
  return tempF;
}

// ----- Passing Game Impact Score -----

/**
 * Combined impact score on the passing game (0-100).
 * windContrib = windScore * 0.7
 * precipContrib = precipScore * 0.3
 */
export function passingGameImpactScore(
  windSpeedMph: number,
  precipitationInch: number,
): number {
  const windScore = windImpact(windSpeedMph).score;
  const precipScore = precipitationImpact(precipitationInch).score;
  return Math.min(100, windScore * 0.7 + precipScore * 0.3);
}

// ----- High Impact Game Check -----

/**
 * Returns true if weather is likely to significantly affect the game.
 * Requires outdoor venue and overall impact level of "high" or "severe".
 */
export function isHighImpactGame(conditions: WeatherConditions, sport: SportType): boolean {
  if (conditions.isIndoor) return false;
  const impact = overallWeatherImpact(conditions, sport);
  return impact.level === "high" || impact.level === "severe";
}

// ----- Weather Summary Line -----

/**
 * One-line human-readable summary of current weather conditions.
 * Format: "{tempF}°F, Wind {windSpeedMph}mph{gust}, {precip}"
 */
export function weatherSummaryLine(conditions: WeatherConditions): string {
  const { tempF, windSpeedMph, windGustMph, precipitationInch, snowInch } = conditions;

  let gustStr = "";
  if (windGustMph !== undefined && windGustMph > windSpeedMph + 5) {
    gustStr = `/gusts ${windGustMph}mph`;
  }

  let precipStr: string;
  if (snowInch !== undefined && snowInch > 0) {
    precipStr = `Snow ${snowInch}in`;
  } else if (precipitationInch > 0) {
    precipStr = `Rain ${precipitationInch}in/hr`;
  } else {
    precipStr = "No precipitation";
  }

  return `${tempF}°F, Wind ${windSpeedMph}mph${gustStr}, ${precipStr}`;
}

// ----- Total Adjustment -----

/**
 * Suggest an adjusted total based on weather impact.
 * - "under": baseline * (1 - score / 500) — max 20% reduction at score 100
 * - "over" or "neither": baseline unchanged
 * Rounds to nearest 0.5.
 */
export function totalAdjustment(impact: WeatherImpact, baseline: number): number {
  let adjusted: number;

  if (impact.favorsBetting === "under") {
    adjusted = baseline * (1 - impact.score / 500);
  } else {
    adjusted = baseline;
  }

  // Round to nearest 0.5
  return Math.round(adjusted * 2) / 2;
}
