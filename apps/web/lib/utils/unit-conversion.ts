/**
 * unit-conversion.ts — Pure TypeScript unit conversion utilities for Galaxy Sports Edge.
 *
 * Zero external dependencies (Node built-ins / pure TS only). No `any`.
 * Covers length, mass, temperature, speed, time/duration, a generic
 * cross-unit `convert()` dispatcher, data sizes, and sports-specific helpers.
 */

// ---------------------------------------------------------------------------
// Length
// ---------------------------------------------------------------------------

const METERS_PER_FOOT = 0.3048;
const METERS_PER_YARD = 0.9144;
const KM_PER_MILE = 1.609344;
const CM_PER_INCH = 2.54;

/** Convert meters to feet. */
export function metersToFeet(m: number): number {
  return m / METERS_PER_FOOT;
}

/** Convert feet to meters. */
export function feetToMeters(ft: number): number {
  return ft * METERS_PER_FOOT;
}

/** Convert miles to kilometers. */
export function milesToKm(mi: number): number {
  return mi * KM_PER_MILE;
}

/** Convert kilometers to miles. */
export function kmToMiles(km: number): number {
  return km / KM_PER_MILE;
}

/** Convert inches to centimeters. */
export function inchesToCm(inch: number): number {
  return inch * CM_PER_INCH;
}

/** Convert centimeters to inches. */
export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

/** Convert yards to meters. */
export function yardsToMeters(yd: number): number {
  return yd * METERS_PER_YARD;
}

/** Convert meters to yards. */
export function metersToYards(m: number): number {
  return m / METERS_PER_YARD;
}

// ---------------------------------------------------------------------------
// Weight / mass
// ---------------------------------------------------------------------------

const KG_PER_LB = 0.45359237;
const GRAMS_PER_OZ = 28.349523125;
const KG_PER_STONE = 6.35029318;

/** Convert kilograms to pounds. */
export function kgToLbs(kg: number): number {
  return kg / KG_PER_LB;
}

/** Convert pounds to kilograms. */
export function lbsToKg(lbs: number): number {
  return lbs * KG_PER_LB;
}

/** Convert ounces to grams. */
export function ozToGrams(oz: number): number {
  return oz * GRAMS_PER_OZ;
}

/** Convert grams to ounces. */
export function gramsToOz(g: number): number {
  return g / GRAMS_PER_OZ;
}

/** Convert stone to kilograms. */
export function stoneToKg(stone: number): number {
  return stone * KG_PER_STONE;
}

/** Convert kilograms to stone. */
export function kgToStone(kg: number): number {
  return kg / KG_PER_STONE;
}

// ---------------------------------------------------------------------------
// Temperature
// ---------------------------------------------------------------------------

const KELVIN_OFFSET = 273.15;

/** Convert Celsius to Fahrenheit. */
export function celsiusToFahrenheit(c: number): number {
  return c * 9 / 5 + 32;
}

/** Convert Fahrenheit to Celsius. */
export function fahrenheitToCelsius(f: number): number {
  return (f - 32) * 5 / 9;
}

/** Convert Celsius to Kelvin. */
export function celsiusToKelvin(c: number): number {
  return c + KELVIN_OFFSET;
}

/** Convert Kelvin to Celsius. */
export function kelvinToCelsius(k: number): number {
  return k - KELVIN_OFFSET;
}

/** Convert Fahrenheit to Kelvin. */
export function fahrenheitToKelvin(f: number): number {
  return celsiusToKelvin(fahrenheitToCelsius(f));
}

// ---------------------------------------------------------------------------
// Speed
// ---------------------------------------------------------------------------

const KMH_PER_MPH = KM_PER_MILE;
const KMH_PER_KNOT = 1.852;

/** Convert miles per hour to kilometers per hour. */
export function mphToKmh(mph: number): number {
  return mph * KMH_PER_MPH;
}

/** Convert kilometers per hour to miles per hour. */
export function kmhToMph(kmh: number): number {
  return kmh / KMH_PER_MPH;
}

/** Convert meters per second to kilometers per hour. */
export function msToKmh(ms: number): number {
  return ms * 3.6;
}

/** Convert kilometers per hour to meters per second. */
export function kmhToMs(kmh: number): number {
  return kmh / 3.6;
}

/** Convert miles per hour to meters per second. */
export function mphToMs(mph: number): number {
  return kmhToMs(mphToKmh(mph));
}

/** Convert knots to kilometers per hour. */
export function knotsToKmh(knots: number): number {
  return knots * KMH_PER_KNOT;
}

/**
 * Convert a running/cycling pace (seconds per km) to speed (km/h).
 * Returns 0 when the input is 0 (or non-positive) to avoid division blow-ups.
 */
export function paceToSpeed(secondsPerKm: number): number {
  if (secondsPerKm === 0) return 0;
  return 3600 / secondsPerKm;
}

/**
 * Convert speed (km/h) to a running/cycling pace (seconds per km).
 * Returns Infinity when the input is 0 (you would never finish a km).
 */
export function speedToPace(kmh: number): number {
  if (kmh === 0) return Infinity;
  return 3600 / kmh;
}

// ---------------------------------------------------------------------------
// Time & duration
// ---------------------------------------------------------------------------

/** Convert hours to seconds. */
export function hoursToSeconds(h: number): number {
  return h * 3600;
}

/** Convert minutes to seconds. */
export function minutesToSeconds(m: number): number {
  return m * 60;
}

/**
 * Format a number of seconds as a clock string.
 * Includes the hours segment only when there is at least one hour
 * ("1:23:45"); otherwise renders as minutes:seconds ("23:45").
 * Negative values are formatted with a leading "-".
 */
export function formatDuration(totalSeconds: number): string {
  if (!isFinite(totalSeconds)) return "0:00";
  const sign = totalSeconds < 0 ? "-" : "";
  const abs = Math.floor(Math.abs(totalSeconds));
  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  const seconds = abs % 60;
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) {
    const mm = String(minutes).padStart(2, "0");
    return `${sign}${hours}:${mm}:${ss}`;
  }
  return `${sign}${minutes}:${ss}`;
}

/**
 * Parse a clock string into total seconds.
 * Accepts "h:mm:ss" and "mm:ss" forms. Returns 0 for invalid input.
 */
export function parseDurationToSeconds(text: string): number {
  if (typeof text !== "string") return 0;
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;

  let sign = 1;
  let body = trimmed;
  if (body.startsWith("-")) {
    sign = -1;
    body = body.slice(1);
  }

  const parts = body.split(":");
  if (parts.length < 2 || parts.length > 3) return 0;

  const nums: number[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return 0;
    nums.push(Number(part));
  }

  let total: number;
  if (nums.length === 3) {
    const h = nums[0] ?? 0;
    const m = nums[1] ?? 0;
    const s = nums[2] ?? 0;
    total = h * 3600 + m * 60 + s;
  } else {
    const m = nums[0] ?? 0;
    const s = nums[1] ?? 0;
    total = m * 60 + s;
  }
  return sign * total;
}

/** Break a number of seconds into hours, minutes, and seconds. */
export function secondsToHMS(totalSeconds: number): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  const abs = Math.floor(Math.abs(totalSeconds));
  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  const seconds = abs % 60;
  return { hours, minutes, seconds };
}

// ---------------------------------------------------------------------------
// Generic & data
// ---------------------------------------------------------------------------

type UnitCategory = "length" | "mass" | "temperature" | "speed";

interface UnitDef {
  category: UnitCategory;
  /** Factor to multiply by to reach the category base unit (non-temperature). */
  toBase: number;
}

/**
 * Unit registry for the generic `convert()` dispatcher.
 *
 * Base units: length=meters, mass=kilograms, speed=meters/second.
 * Temperature is NOT linear-from-base (it has offsets), so it is handled
 * via dedicated functions rather than a single multiplicative factor.
 */
const UNIT_REGISTRY: Readonly<Record<string, UnitDef>> = {
  // length — base: meter
  m: { category: "length", toBase: 1 },
  meter: { category: "length", toBase: 1 },
  meters: { category: "length", toBase: 1 },
  km: { category: "length", toBase: 1000 },
  kilometer: { category: "length", toBase: 1000 },
  kilometers: { category: "length", toBase: 1000 },
  cm: { category: "length", toBase: 0.01 },
  mm: { category: "length", toBase: 0.001 },
  ft: { category: "length", toBase: METERS_PER_FOOT },
  foot: { category: "length", toBase: METERS_PER_FOOT },
  feet: { category: "length", toBase: METERS_PER_FOOT },
  in: { category: "length", toBase: CM_PER_INCH / 100 },
  inch: { category: "length", toBase: CM_PER_INCH / 100 },
  inches: { category: "length", toBase: CM_PER_INCH / 100 },
  yd: { category: "length", toBase: METERS_PER_YARD },
  yard: { category: "length", toBase: METERS_PER_YARD },
  yards: { category: "length", toBase: METERS_PER_YARD },
  mi: { category: "length", toBase: KM_PER_MILE * 1000 },
  mile: { category: "length", toBase: KM_PER_MILE * 1000 },
  miles: { category: "length", toBase: KM_PER_MILE * 1000 },

  // mass — base: kilogram
  kg: { category: "mass", toBase: 1 },
  kilogram: { category: "mass", toBase: 1 },
  kilograms: { category: "mass", toBase: 1 },
  g: { category: "mass", toBase: 0.001 },
  gram: { category: "mass", toBase: 0.001 },
  grams: { category: "mass", toBase: 0.001 },
  mg: { category: "mass", toBase: 0.000001 },
  lb: { category: "mass", toBase: KG_PER_LB },
  lbs: { category: "mass", toBase: KG_PER_LB },
  pound: { category: "mass", toBase: KG_PER_LB },
  pounds: { category: "mass", toBase: KG_PER_LB },
  oz: { category: "mass", toBase: GRAMS_PER_OZ / 1000 },
  ounce: { category: "mass", toBase: GRAMS_PER_OZ / 1000 },
  ounces: { category: "mass", toBase: GRAMS_PER_OZ / 1000 },
  stone: { category: "mass", toBase: KG_PER_STONE },

  // speed — base: meters/second
  "m/s": { category: "speed", toBase: 1 },
  mps: { category: "speed", toBase: 1 },
  "km/h": { category: "speed", toBase: 1 / 3.6 },
  kmh: { category: "speed", toBase: 1 / 3.6 },
  kph: { category: "speed", toBase: 1 / 3.6 },
  mph: { category: "speed", toBase: KM_PER_MILE * 1000 / 3600 },
  knot: { category: "speed", toBase: KMH_PER_KNOT * 1000 / 3600 },
  knots: { category: "speed", toBase: KMH_PER_KNOT * 1000 / 3600 },

  // temperature — handled specially (offset-based)
  c: { category: "temperature", toBase: 1 },
  celsius: { category: "temperature", toBase: 1 },
  f: { category: "temperature", toBase: 1 },
  fahrenheit: { category: "temperature", toBase: 1 },
  k: { category: "temperature", toBase: 1 },
  kelvin: { category: "temperature", toBase: 1 },
};

/** Normalize a temperature unit token to a canonical key (c/f/k), or null. */
function normalizeTempUnit(unit: string): "c" | "f" | "k" | null {
  switch (unit) {
    case "c":
    case "celsius":
      return "c";
    case "f":
    case "fahrenheit":
      return "f";
    case "k":
    case "kelvin":
      return "k";
    default:
      return null;
  }
}

/** Convert a temperature value between c/f/k canonical units. */
function convertTemperature(
  value: number,
  from: "c" | "f" | "k",
  to: "c" | "f" | "k",
): number {
  // Normalize to Celsius first.
  let celsius: number;
  switch (from) {
    case "c":
      celsius = value;
      break;
    case "f":
      celsius = fahrenheitToCelsius(value);
      break;
    case "k":
      celsius = kelvinToCelsius(value);
      break;
  }
  switch (to) {
    case "c":
      return celsius;
    case "f":
      return celsiusToFahrenheit(celsius);
    case "k":
      return celsiusToKelvin(celsius);
  }
}

/**
 * Generic dispatcher across length / mass / temperature / speed.
 * Returns NaN for unknown units or incompatible categories.
 * Temperature is handled specially because of its additive offsets.
 */
export function convert(value: number, from: string, to: string): number {
  const fromKey = from.trim().toLowerCase();
  const toKey = to.trim().toLowerCase();

  const fromDef = UNIT_REGISTRY[fromKey];
  const toDef = UNIT_REGISTRY[toKey];
  if (fromDef === undefined || toDef === undefined) return NaN;
  if (fromDef.category !== toDef.category) return NaN;

  if (fromDef.category === "temperature") {
    const f = normalizeTempUnit(fromKey);
    const t = normalizeTempUnit(toKey);
    if (f === null || t === null) return NaN;
    return convertTemperature(value, f, t);
  }

  const base = value * fromDef.toBase;
  return base / toDef.toBase;
}

const DATA_UNITS_BINARY = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB"];
const DATA_UNITS_DECIMAL = ["B", "KB", "MB", "GB", "TB", "PB", "EB"];

/**
 * Human-readable byte size.
 * binary=true (default) uses 1024-based KiB/MiB/...; binary=false uses
 * 1000-based KB/MB/.... Negative values keep their sign.
 */
export function bytesToHuman(bytes: number, binary = true): string {
  if (!isFinite(bytes)) return "0 B";
  const factor = binary ? 1024 : 1000;
  const units = binary ? DATA_UNITS_BINARY : DATA_UNITS_DECIMAL;
  const sign = bytes < 0 ? "-" : "";
  let value = Math.abs(bytes);

  if (value < factor) {
    return `${sign}${value} B`;
  }

  let index = 0;
  while (value >= factor && index < units.length - 1) {
    value /= factor;
    index += 1;
  }
  const unit = units[index] ?? "B";
  return `${sign}${roundTo(value, 2)} ${unit}`;
}

/**
 * Parse a human-readable size (e.g. "1.5 MiB", "2GB", "500") into bytes.
 * Recognizes both binary (KiB/MiB/...) and decimal (KB/MB/...) suffixes.
 * A bare number is treated as bytes. Returns 0 for invalid input.
 */
export function humanToBytes(text: string): number {
  if (typeof text !== "string") return 0;
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;

  const match = /^(-?\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/.exec(trimmed);
  if (match === null) return 0;

  const numPart = match[1] ?? "";
  const unitPart = (match[2] ?? "").toLowerCase();
  const value = Number(numPart);
  if (!isFinite(value)) return 0;

  if (unitPart === "" || unitPart === "b") {
    return value;
  }

  const binaryMap: Readonly<Record<string, number>> = {
    kib: 1024,
    mib: 1024 ** 2,
    gib: 1024 ** 3,
    tib: 1024 ** 4,
    pib: 1024 ** 5,
    eib: 1024 ** 6,
  };
  const decimalMap: Readonly<Record<string, number>> = {
    kb: 1000,
    mb: 1000 ** 2,
    gb: 1000 ** 3,
    tb: 1000 ** 4,
    pb: 1000 ** 5,
    eb: 1000 ** 6,
    k: 1000,
    m: 1000 ** 2,
    g: 1000 ** 3,
    t: 1000 ** 4,
  };

  const binMultiplier = binaryMap[unitPart];
  if (binMultiplier !== undefined) return value * binMultiplier;

  const decMultiplier = decimalMap[unitPart];
  if (decMultiplier !== undefined) return value * decMultiplier;

  return 0;
}

/** Round a value to a fixed number of decimal places. */
export function roundTo(value: number, decimals: number): number {
  if (!isFinite(value)) return value;
  const d = Math.max(0, Math.floor(decimals));
  const factor = Math.pow(10, d);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

// ---------------------------------------------------------------------------
// Sports-specific
// ---------------------------------------------------------------------------

const NEWTONS_PER_LBF = 4.4482216152605;
const KJ_PER_KCAL = 4.184;
const GRAVITY_MS2 = 9.80665;

/**
 * Approximate mechanical-to-metabolic conversion for cycling power.
 * Assumes ~23% gross efficiency: kcal/h ≈ watts * 0.86.
 */
export function wattsToKcalPerHour(watts: number): number {
  return watts * 0.86;
}

/** Convert feet to yards. */
export function feetToYards(ft: number): number {
  return ft / 3;
}

/** Convert pounds-force to newtons. */
export function poundsForceToNewtons(lbf: number): number {
  return lbf * NEWTONS_PER_LBF;
}

/** Convert (small/thermochemical) calories to kilojoules. */
export function caloriesToKilojoules(cal: number): number {
  return cal * KJ_PER_KCAL / 1000;
}

/** Convert g-force (multiples of standard gravity) to m/s². */
export function gForceToMs2(g: number): number {
  return g * GRAVITY_MS2;
}
