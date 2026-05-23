import {
  vaultAccessRequiredResponse,
  vaultWriteNotEnabledResponse,
} from "@/lib/vault/api";

export const dynamic = "force-dynamic";

export function GET() {
  return vaultAccessRequiredResponse();
}

export function PATCH() {
  return vaultWriteNotEnabledResponse();
}
