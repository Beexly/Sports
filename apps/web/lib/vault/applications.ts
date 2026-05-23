import type {
  VaultApplicationInput,
  VaultApplicationSource,
} from "./types";

export type VaultApplicationValidationError = {
  field: keyof VaultApplicationInput;
  message: string;
};

export type VaultApplicationValidationResult =
  | {
      ok: true;
      input: VaultApplicationInput;
    }
  | {
      ok: false;
      errors: VaultApplicationValidationError[];
    };

const ALLOWED_APPLICATION_SOURCES: readonly VaultApplicationSource[] = [
  "interview",
  "elite",
  "public",
  "referral",
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isVaultApplicationSource(
  value: string,
): value is VaultApplicationSource {
  return ALLOWED_APPLICATION_SOURCES.includes(value as VaultApplicationSource);
}

export function validateVaultApplicationInput(
  body: unknown,
): VaultApplicationValidationResult {
  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const firstName = asString(record.firstName);
  const email = asString(record.email).toLowerCase();
  const freeformAnswer = asString(record.freeformAnswer);
  const requestedSource = asString(record.source) || "public";
  const referralCode = asString(record.referralCode);
  const errors: VaultApplicationValidationError[] = [];
  const normalizedSource = isVaultApplicationSource(requestedSource)
    ? requestedSource
    : null;

  if (!firstName) {
    errors.push({ field: "firstName", message: "First name is required." });
  }

  if (!EMAIL_PATTERN.test(email)) {
    errors.push({ field: "email", message: "A valid email is required." });
  }

  if (freeformAnswer.length < 20 || freeformAnswer.length > 2000) {
    errors.push({
      field: "freeformAnswer",
      message: "Answer must be between 20 and 2000 characters.",
    });
  }

  if (!normalizedSource) {
    errors.push({ field: "source", message: "Source is not recognized." });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    input: {
      firstName,
      email,
      freeformAnswer,
      source: normalizedSource ?? "public",
      ...(referralCode ? { referralCode } : {}),
    },
  };
}
