import { NextResponse } from "next/server";
import type { VaultCronJobName } from "./types";

export function vaultCronScaffoldResponse(job: VaultCronJobName) {
  return NextResponse.json(
    {
      ok: false,
      job,
      status: "scaffold-only",
      message:
        "Vault cron plumbing exists, but provider integrations are intentionally unimplemented.",
    },
    { status: 501 },
  );
}
