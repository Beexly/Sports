import { vaultAccessRequiredResponse } from "@/lib/vault/api";

export const dynamic = "force-dynamic";

export function GET() {
  return vaultAccessRequiredResponse();
}
