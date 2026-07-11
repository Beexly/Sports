import { NextRequest, NextResponse } from "next/server";
import { resolve } from "node:path";
import { auth } from "@/lib/auth";
import { isFoundryEnabled, scanAll, SKILL_MANIFESTS, canExecute } from "@/lib/agent-foundry";

export const dynamic = "force-dynamic";

/**
 * Agent Foundry feed — admin-only, read-only, flag-gated.
 *
 * Manifests + their deterministic scan reports. Nothing in this payload is
 * executable: `canExecute` is computed and pinned false for every manifest
 * in this wave, and the payload says why execution is blocked per manifest.
 */
export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin role required for cockpit endpoints" },
      { status: 403 },
    );
  }

  if (!isFoundryEnabled()) {
    return NextResponse.json(
      { success: false, disabled: true, error: "AGENT_FOUNDRY_ENABLED is not set" },
      { status: 404 },
    );
  }

  const repoRoot = resolve(process.cwd(), "..", "..");
  const scans = scanAll(repoRoot);

  return NextResponse.json({
    success: true,
    data: {
      totalManifests: SKILL_MANIFESTS.length,
      manifests: SKILL_MANIFESTS.map((m) => {
        const scan = scans.find((s) => s.manifestId === m.id)!;
        const executable = canExecute(m, repoRoot);
        return {
          ...m,
          scan,
          executable,
          executionBlockedBecause: executable
            ? null
            : m.lifecycle !== "APPROVED"
              ? `lifecycle is ${m.lifecycle}; APPROVED requires an owner-reviewed code change`
              : m.humanApprovalRequired
                ? "human approval required on every run"
                : "blocking scan findings present",
        };
      }),
      externalScannersAbsent: scans[0]?.externalScannersAbsent ?? [],
    },
  });
}
