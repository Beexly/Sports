import { VAULT_FOUNDING_CAP } from "./config";
import type { VaultSeatCount } from "./types";

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
