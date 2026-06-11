import { NextResponse } from "next/server";
import { readIntelligenceControlPlane } from "@/lib/airwave/intelligence-control-plane";

export const dynamic = "force-dynamic";

/**
 * GET /api/airwave/intelligence-readiness
 *
 * Read-only intelligence control plane readiness summary.
 * Returns: source policy summary, CH87 lane status, intake plan,
 * GSE/GSN output readiness, legal hold summary, operator surface.
 *
 * NEVER exposes: secrets, local file paths, source pointers,
 * transcript content, account credentials, or raw capture state.
 */
export async function GET(): Promise<NextResponse> {
  const plane = readIntelligenceControlPlane(
    process.env as Record<string, string | undefined>,
  );

  // Return the full plane minus the channel87Contract.shows (sample fixture —
  // no need to serialize all placeholder blocks to the API surface).
  const omitContract = ({ channel87Contract: _contract, ...kept }: typeof plane) => kept;
  const rest = omitContract(plane);

  return NextResponse.json({
    success: true,
    data: {
      ...rest,
      channel87ContractSummary: {
        channelNumber: plane.channel87Contract.channelNumber,
        channelName: plane.channel87Contract.channelName,
        timezone: plane.channel87Contract.timezone,
        window: plane.channel87Contract.window,
        scheduleSource: plane.channel87Contract.scheduleSource,
        totalShows: plane.channel87Contract.shows.length,
        policy: plane.channel87Contract.policy,
        complianceNote: plane.channel87Contract.complianceNote,
        nextOperatorAction: plane.channel87Contract.nextOperatorAction,
      },
    },
  });
}
