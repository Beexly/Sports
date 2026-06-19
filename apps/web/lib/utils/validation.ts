/**
 * Validation utilities — pure, zero dependencies.
 *
 * Simple runtime validators for common types used across
 * the sports picks platform. Returns result objects, never throws.
 */

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export type Validator<T> = (value: T) => ValidationResult;

/** Success result */
export function ok(): ValidationResult {
  return { valid: true, errors: [] };
}

/** Failure result with a single message */
export function err(message: string): ValidationResult {
  return { valid: false, errors: [message] };
}

/** Merge multiple ValidationResults: valid only if all are valid */
export function combine(...results: ValidationResult[]): ValidationResult {
  const allErrors: string[] = [];
  for (const result of results) {
    if (!result.valid) {
      for (const e of result.errors) {
        allErrors.push(e);
      }
    }
  }
  if (allErrors.length > 0) {
    return { valid: false, errors: allErrors };
  }
  return { valid: true, errors: [] };
}

/** Standard email regex check */
export function validateEmail(email: string): ValidationResult {
  if (typeof email !== "string" || email.trim() === "") {
    return err("Email must be a non-empty string");
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return err(`"${email}" is not a valid email address`);
  }
  return ok();
}

/** Must be https:// or http:// */
export function validateUrl(url: string): ValidationResult {
  if (typeof url !== "string" || url.trim() === "") {
    return err("URL must be a non-empty string");
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return err(`"${url}" is not a valid URL (must start with http:// or https://)`);
  }
  try {
    new URL(url);
    return ok();
  } catch {
    return err(`"${url}" is not a valid URL`);
  }
}

/** Returns err if value < min or > max */
export function validateNumberInRange(
  value: number,
  min: number,
  max: number,
  label?: string
): ValidationResult {
  const name = label ?? "Value";
  if (value < min || value > max) {
    return err(`${name} must be between ${min} and ${max}, got ${value}`);
  }
  return ok();
}

/** Must be a non-empty string after trim */
export function validateRequiredString(
  value: unknown,
  fieldName?: string
): ValidationResult {
  const name = fieldName ?? "Field";
  if (typeof value !== "string") {
    return err(`${name} must be a string`);
  }
  if (value.trim() === "") {
    return err(`${name} must not be empty`);
  }
  return ok();
}

/** Returns err if date is in the past */
export function validateDateNotPast(
  date: Date | string | number,
  now?: number
): ValidationResult {
  const nowMs = now ?? Date.now();
  let dateMs: number;
  if (date instanceof Date) {
    dateMs = date.getTime();
  } else if (typeof date === "string") {
    dateMs = new Date(date).getTime();
  } else {
    dateMs = date;
  }
  if (isNaN(dateMs)) {
    return err("Date is not valid");
  }
  if (dateMs < nowMs) {
    return err("Date must not be in the past");
  }
  return ok();
}

/** Must be a number in [0, 100] */
export function validateConfidence(confidence: unknown): ValidationResult {
  if (typeof confidence !== "number") {
    return err("Confidence must be a number");
  }
  if (!isFinite(confidence)) {
    return err("Confidence must be a finite number");
  }
  if (confidence < 0 || confidence > 100) {
    return err(`Confidence must be between 0 and 100, got ${confidence}`);
  }
  return ok();
}

/**
 * Must be a finite number in [-10000, 10000].
 * 0 is valid (EV).
 */
export function validateAmericanOdds(odds: unknown): ValidationResult {
  if (typeof odds !== "number") {
    return err("American odds must be a number");
  }
  if (!isFinite(odds)) {
    return err("American odds must be a finite number");
  }
  if (odds < -10000 || odds > 10000) {
    return err(`American odds must be in [-10000, 10000], got ${odds}`);
  }
  return ok();
}

const VALID_SPORT_SLUGS = [
  "americanfootball_nfl",
  "basketball_nba",
  "baseball_mlb",
  "icehockey_nhl",
  "soccer_epl",
  "americanfootball_ncaaf",
  "basketball_ncaab",
] as const;

type ValidSportSlug = (typeof VALID_SPORT_SLUGS)[number];

/** Must be one of the known sport slugs */
export function validateSportSlug(slug: unknown): ValidationResult {
  if (typeof slug !== "string") {
    return err("Sport slug must be a string");
  }
  if (!(VALID_SPORT_SLUGS as readonly string[]).includes(slug)) {
    return err(
      `"${slug}" is not a valid sport slug. Must be one of: ${VALID_SPORT_SLUGS.join(", ")}`
    );
  }
  return ok();
}

/**
 * Build a composite validator for an object type.
 * Each field validator is optional; only provided validators are run.
 */
export function createObjectValidator<T extends Record<string, unknown>>(
  validators: { [K in keyof T]?: Validator<T[K]> }
): Validator<T> {
  return (value: T): ValidationResult => {
    const results: ValidationResult[] = [];
    for (const key in validators) {
      const fieldValidator = validators[key];
      if (fieldValidator) {
        const fieldResult = fieldValidator(value[key] as T[typeof key]);
        if (!fieldResult.valid) {
          // Prefix errors with field name
          const prefixed: ValidationResult = {
            valid: false,
            errors: fieldResult.errors.map((e) => `[${key}] ${e}`),
          };
          results.push(prefixed);
        }
      }
    }
    return combine(...results);
  };
}
