import { VAULT_FOUNDING_CAP } from "./config";
import type { VaultSeatCount } from "./types";

export type VaultFoundingSeatAssignment =
  | {
      status: "assign";
      foundingNumber: number;
      reason: "next_available";
    }
  | {
      status: "waitlist";
      foundingNumber: null;
      reason: "cap_reached";
    }
  | {
      status: "manual_review";
      foundingNumber: null;
      reason: "duplicate_existing_number" | "invalid_existing_number";
    };

function clampSeatCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(VAULT_FOUNDING_CAP, Math.floor(value)));
}

export function getVaultSeatCount(filled = 0): VaultSeatCount {
  const safeFilled = clampSeatCount(filled);
  const remaining = Math.max(0, VAULT_FOUNDING_CAP - safeFilled);

  return {
    cap: VAULT_FOUNDING_CAP,
    filled: safeFilled,
    remaining,
    waitlistOpen: remaining === 0,
  };
}

export function getVaultSeatCountFromEnv(): VaultSeatCount {
  return getVaultSeatCount(Number(process.env.VAULT_FOUNDING_FILLED ?? 0));
}

export function getNextFoundingSeatAssignment(
  existingFoundingNumbers: readonly number[],
): VaultFoundingSeatAssignment {
  const seen = new Set<number>();
  let max = 0;

  for (const value of existingFoundingNumbers) {
    if (!Number.isInteger(value) || value < 1) {
      return {
        status: "manual_review",
        foundingNumber: null,
        reason: "invalid_existing_number",
      };
    }

    if (seen.has(value)) {
      return {
        status: "manual_review",
        foundingNumber: null,
        reason: "duplicate_existing_number",
      };
    }

    seen.add(value);
    max = Math.max(max, value);
  }

  if (max >= VAULT_FOUNDING_CAP) {
    return {
      status: "waitlist",
      foundingNumber: null,
      reason: "cap_reached",
    };
  }

  return {
    status: "assign",
    foundingNumber: max + 1,
    reason: "next_available",
  };
}
