import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export interface AutonomousOverrideState {
  version: string;
  exposureCapDefaults: {
    maxPlayerExposure: number; // e.g. 0.35 (35%)
    maxTeamStackExposure: number; // e.g. 0.50 (50%)
    maxGameTotalExposure: number; // e.g. 0.40 (40%)
  };
  simulationPipeline: {
    tMinus48hEnabled: boolean;
    lastTickIso: string;
    nextScheduledTickIso: string;
    status: "IDLE" | "RUNNING" | "QUEUED";
  };
  manualOverrides: {
    suppressedPickIds: string[];
    featuredPickIds: string[];
    customExposureCaps: Record<string, number>;
  };
  broadcastChannels: {
    telegramEnabled: boolean;
    whopEnabled: boolean;
    lastBroadcastIso: string | null;
  };
}

// In-memory runtime state for cockpit overrides (can be backed by DB / Redis / config)
const overrideState: AutonomousOverrideState = {
  version: "v5.4.0-autonomous",
  exposureCapDefaults: {
    maxPlayerExposure: 0.35,
    maxTeamStackExposure: 0.5,
    maxGameTotalExposure: 0.4,
  },
  simulationPipeline: {
    tMinus48hEnabled: true,
    lastTickIso: new Date(Date.now() - 3600_000 * 4).toISOString(),
    nextScheduledTickIso: new Date(Date.now() + 3600_000 * 8).toISOString(),
    status: "IDLE",
  },
  manualOverrides: {
    suppressedPickIds: [],
    featuredPickIds: [],
    customExposureCaps: {},
  },
  broadcastChannels: {
    telegramEnabled: true,
    whopEnabled: true,
    lastBroadcastIso: new Date(Date.now() - 3600_000 * 2).toISOString(),
  },
};

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin role required for cockpit endpoints" },
      { status: 403 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: overrideState,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
    }
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin role required for cockpit endpoints" },
      { status: 403 }
    );
  }

  // Untrusted request body. Every field is read defensively at its use site
  // (String()/Number() coercion plus explicit guards), so the type only has to
  // describe the shape, not vouch for the values.
  let body: { action?: unknown; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, payload } = body;
  if (!action || typeof action !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'action' parameter" },
      { status: 400 }
    );
  }

  const appliedAt = new Date().toISOString();

  switch (action) {
    case "feature_pick": {
      const pickId = String(payload?.pickId || "");
      if (!pickId) {
        return NextResponse.json({ error: "Missing pickId" }, { status: 400 });
      }
      if (!overrideState.manualOverrides.featuredPickIds.includes(pickId)) {
        overrideState.manualOverrides.featuredPickIds.push(pickId);
      }
      // Remove from suppressed if present
      overrideState.manualOverrides.suppressedPickIds =
        overrideState.manualOverrides.suppressedPickIds.filter((id) => id !== pickId);

      return NextResponse.json({
        success: true,
        action,
        pickId,
        appliedAt,
        message: `Pick ${pickId} featured successfully in Cockpit console.`,
      });
    }

    case "suppress_pick": {
      const pickId = String(payload?.pickId || "");
      if (!pickId) {
        return NextResponse.json({ error: "Missing pickId" }, { status: 400 });
      }
      if (!overrideState.manualOverrides.suppressedPickIds.includes(pickId)) {
        overrideState.manualOverrides.suppressedPickIds.push(pickId);
      }
      // Remove from featured if present
      overrideState.manualOverrides.featuredPickIds =
        overrideState.manualOverrides.featuredPickIds.filter((id) => id !== pickId);

      return NextResponse.json({
        success: true,
        action,
        pickId,
        reason: payload?.reason || "Operator manual override",
        appliedAt,
        message: `Pick ${pickId} suppressed successfully.`,
      });
    }

    case "adjust_dfs_exposure": {
      const playerId = String(payload?.playerId || "");
      const maxExposurePercent = Number(payload?.maxExposurePercent);
      if (!playerId || isNaN(maxExposurePercent) || maxExposurePercent < 0 || maxExposurePercent > 100) {
        return NextResponse.json(
          { error: "Invalid playerId or maxExposurePercent (must be 0-100)" },
          { status: 400 }
        );
      }
      overrideState.manualOverrides.customExposureCaps[playerId] = maxExposurePercent / 100;

      return NextResponse.json({
        success: true,
        action,
        playerId,
        maxExposurePercent,
        appliedAt,
        message: `DFS exposure cap for player ${playerId} updated to ${maxExposurePercent}%.`,
      });
    }

    case "trigger_sim_tick": {
      const windowTarget = payload?.targetWindow || "T-48h";
      overrideState.simulationPipeline.status = "RUNNING";
      overrideState.simulationPipeline.lastTickIso = appliedAt;

      // In real execution, this enqueues or calls the Monte Carlo SGP sim engine
      return NextResponse.json({
        success: true,
        action,
        targetWindow: windowTarget,
        pipelineStatus: "TRIGGERED",
        appliedAt,
        message: `Simulation tick for window [${windowTarget}] triggered.`,
      });
    }

    case "broadcast_channel": {
      const channel = String(payload?.channel || "").toLowerCase();
      const packageId = payload?.packageId ? String(payload.packageId) : "ALL_ACTIVE";
      if (channel !== "telegram" && channel !== "whop" && channel !== "both") {
        return NextResponse.json(
          { error: "channel must be 'telegram', 'whop', or 'both'" },
          { status: 400 }
        );
      }
      overrideState.broadcastChannels.lastBroadcastIso = appliedAt;

      return NextResponse.json({
        success: true,
        action,
        channel,
        packageId,
        appliedAt,
        message: `Broadcast to ${channel.toUpperCase()} for package [${packageId}] initiated.`,
      });
    }

    default:
      return NextResponse.json(
        {
          error: `Unknown action '${action}'. Accepted: feature_pick, suppress_pick, adjust_dfs_exposure, trigger_sim_tick, broadcast_channel`,
        },
        { status: 400 }
      );
  }
}
