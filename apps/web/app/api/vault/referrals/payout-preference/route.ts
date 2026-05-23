import { vaultWriteNotEnabledResponse } from "@/lib/vault/api";

export const dynamic = "force-dynamic";

export function PATCH() {
  return vaultWriteNotEnabledResponse();
}
