import { vaultWebhookNotEnabledResponse } from "@/lib/vault/api";

export const dynamic = "force-dynamic";

export function POST() {
  return vaultWebhookNotEnabledResponse();
}
