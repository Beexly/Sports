/**
 * Server-side 21+ age gate — launch blocker for paid acquisition.
 *
 * Copy already says 21+ everywhere; nothing in the User model or checkout
 * path actually verified it. This module is the single source of truth for
 * "is this date of birth at least 21 full years old?"
 *
 * Persistence (User.dateOfBirth) needs a Prisma field + migration — that is
 * OWNER_GATE (schema is sealed). This helper is the app-side check: checkout
 * must call it *before* any Stripe side effect.
 *
 * Dates are calendar dates (YYYY-MM-DD), interpreted in UTC so a timezone
 * cannot grant a day of eligibility.
 */

export const MINIMUM_AGE_YEARS = 21;

export type AgeGateFailure = {
  ok: false;
  code: "missing_date_of_birth" | "invalid_date_of_birth" | "age_restricted";
  error: string;
  ageYears?: number;
};

export type AgeGateSuccess = {
  ok: true;
  dateOfBirth: Date;
  ageYears: number;
};

export type AgeGateResult = AgeGateSuccess | AgeGateFailure;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDateOnly(raw: unknown): Date | null {
  if (typeof raw !== "string") return null;
  const match = ISO_DATE.exec(raw.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function ageInFullYears(dateOfBirth: Date, now: Date = new Date()): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export function assertAtLeast21(raw: unknown, now: Date = new Date()): AgeGateResult {
  if (raw === undefined || raw === null || raw === "") {
    return {
      ok: false,
      code: "missing_date_of_birth",
      error: "Date of birth is required.",
    };
  }
  const dob = parseIsoDateOnly(raw);
  if (!dob) {
    return {
      ok: false,
      code: "invalid_date_of_birth",
      error: "Date of birth must be a real calendar date (YYYY-MM-DD).",
    };
  }
  if (dob.getTime() > now.getTime()) {
    return {
      ok: false,
      code: "invalid_date_of_birth",
      error: "Date of birth must be a real calendar date (YYYY-MM-DD).",
    };
  }
  const ageYears = ageInFullYears(dob, now);
  if (ageYears < MINIMUM_AGE_YEARS) {
    return {
      ok: false,
      code: "age_restricted",
      error: "You must be 21 or older to subscribe.",
      ageYears,
    };
  }
  return { ok: true, dateOfBirth: dob, ageYears };
}
