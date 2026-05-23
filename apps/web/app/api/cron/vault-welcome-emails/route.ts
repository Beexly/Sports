import { vaultCronScaffoldResponse } from "@/lib/vault/cron";

export const dynamic = "force-dynamic";

export function GET() {
  return vaultCronScaffoldResponse("vault-welcome-emails");
}
