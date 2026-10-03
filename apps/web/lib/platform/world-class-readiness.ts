/**
 * World-class readiness matrix — agents, media, engines, engagement, data redundancy.
 * Pure snapshot for cockpit / ops. Never claims ACTIVE autonomy or public fire.
 */

import { AGENT_OS_REGISTRY } from "@/lib/agents/agent-registry";
import { CAPABILITY_REGISTRY } from "@/lib/jarvis/capability-registry";
import { AGENT_COUNCIL } from "@/lib/jarvis/agent-council";
import { AGENTS } from "@/lib/cockpit/agents";
import { freeCoverageMatrix, redundancyGaps, PLATFORM_SOURCES } from "@/lib/data-sources/source-router";
import { scoreSourceChain } from "@/lib/data-sources/multi-source-scores";
import { ALL_SPORTS } from "@/lib/data-sources/source-router";

export type ReadinessLane =
  | "agents"
  | "media"
  | "engines"
  | "engagement"
  | "data_redundancy"
  | "apis";

export type LaneStatus = "PRIMED" | "DRAFT_READY" | "GATED" | "BLOCKED" | "PARKED";

export type WorldClassReadiness = {
  readonly generatedAt: string;
  readonly oddsApiRequired: false;
  readonly liveBoardDefault: "off";
  readonly lanes: ReadonlyArray<{
    readonly lane: ReadinessLane;
    readonly status: LaneStatus;
    readonly summary: string;
    readonly readyCount: number;
    readonly totalCount: number;
    readonly blockers: readonly string[];
    readonly nextActions: readonly string[];
  }>;
  readonly dataRedundancy: {
    readonly clearedSources: number;
    readonly dualOrBetterCritical: number;
    readonly singleSourceCritical: number;
    readonly noneCritical: number;
    readonly gaps: readonly { need: string; sport: string; clearedCount: number }[];
  };
  readonly agentPrime: {
    readonly cockpitRegistered: number;
    readonly councilSeats: number;
    readonly agentOs: number;
    readonly externalActions: "NONE";
    readonly autonomousActive: 0;
  };
};

const CRITICAL_NEEDS = new Set([
  "scores",
  "results",
  "odds",
  "standings",
  "schedules",
  "weather",
  "player_stats",
]);

export function buildWorldClassReadiness(now = new Date()): WorldClassReadiness {
  const matrix = freeCoverageMatrix();
  const critical = matrix.filter((r) => CRITICAL_NEEDS.has(r.need));
  const dualOrBetter = critical.filter((r) => r.clearedCount >= 2).length;
  const single = critical.filter((r) => r.clearedCount === 1).length;
  const none = critical.filter((r) => r.clearedCount === 0).length;
  const gaps = redundancyGaps(2)
    .filter((g) => CRITICAL_NEEDS.has(g.need))
    .slice(0, 40)
    .map((g) => ({ need: g.need, sport: g.sport, clearedCount: g.clearedCount }));

  const scoreChains = ALL_SPORTS.map((s) => ({
    sport: s,
    chain: scoreSourceChain(s).length,
  }));
  const dualScoreSports = scoreChains.filter((s) => s.chain >= 2).length;

  const draftOnlyCaps = CAPABILITY_REGISTRY.filter((c) => c.status === "DRAFT_ONLY").length;
  const osDraft = AGENT_OS_REGISTRY.filter((a) => a.status === "DRAFT_ONLY").length;

  return {
    generatedAt: now.toISOString(),
    oddsApiRequired: false,
    liveBoardDefault: "off",
    lanes: [
      {
        lane: "agents",
        status: "DRAFT_READY",
        summary:
          "All cockpit agents draft-only and primed. Council + Agent OS registered. No autonomous external actions.",
        readyCount: Object.keys(AGENTS).length + osDraft,
        totalCount: AGENT_COUNCIL.length + AGENT_OS_REGISTRY.length,
        blockers: ["Neon/CRON for live assessment history", "Owner approve rare external drafts"],
        nextActions: [
          "Open /cockpit/agents after Neon green",
          "jarvis-snapshot cron materializes draft tasks hourly",
        ],
      },
      {
        lane: "media",
        status: "DRAFT_READY",
        summary:
          "Content / studio / film-room / bot-outbox exist as draft-only. Auto-publish disabled (405).",
        readyCount: 4,
        totalCount: 4,
        blockers: ["OWNER_VISUAL_SPEND for film room", "No auto-publish by law"],
        nextActions: ["Approve AVA drafts in /cockpit/content when ready"],
      },
      {
        lane: "engines",
        status: "DRAFT_READY",
        summary:
          "prediction-engine + quote-plane + fantasy optimizers + free settle + multi-source scores primed.",
        readyCount: draftOnlyCaps + 5,
        totalCount: CAPABILITY_REGISTRY.length + 5,
        blockers: ["Public fire gated (LIVE_BOARD off)", "Phase C UNVERIFIED"],
        nextActions: ["Prove free gamma + free settle on Production Neon"],
      },
      {
        lane: "engagement",
        status: "GATED",
        summary:
          "Push/watchlist/community/moderation surfaces built; public engagement features gated until data + owner YES.",
        readyCount: 3,
        totalCount: 6,
        blockers: ["PUBLIC_PICKS ladder", "VAPID/Resend secrets optional"],
        nextActions: ["Keep engagement draft until sample + trust bar"],
      },
      {
        lane: "data_redundancy",
        status: dualOrBetter >= single ? "PRIMED" : "DRAFT_READY",
        summary: `Critical need×sport cells: dual+ ${dualOrBetter}, single ${single}, none ${none}. Live score dual chains on ${dualScoreSports}/7 sports.`,
        readyCount: dualOrBetter,
        totalCount: critical.length || 1,
        blockers: gaps.slice(0, 8).map((g) => `${g.need}/${g.sport}: ${g.clearedCount} cleared`),
        nextActions: [
          "Clear CFBD free key (gated) for NCAAF depth",
          "Optional BALLDONTLIE_API_KEY for NBA dual when free tier requires key",
        ],
      },
      {
        lane: "apis",
        status: "DRAFT_READY",
        summary:
          "161 API routes; free GSE/own paths oddsApiRequired=false; crons dual-secret ready.",
        readyCount: PLATFORM_SOURCES.filter((s) => s.cleared).length,
        totalCount: PLATFORM_SOURCES.length,
        blockers: ["CRON_SECRET + DATABASE_URL for production truth"],
        nextActions: ["Smoke gamma + settle free + jarvis-snapshot after deploy"],
      },
    ],
    dataRedundancy: {
      clearedSources: PLATFORM_SOURCES.filter((s) => s.cleared).length,
      dualOrBetterCritical: dualOrBetter,
      singleSourceCritical: single,
      noneCritical: none,
      gaps,
    },
    agentPrime: {
      cockpitRegistered: Object.keys(AGENTS).length,
      councilSeats: AGENT_COUNCIL.length,
      agentOs: AGENT_OS_REGISTRY.length,
      externalActions: "NONE",
      autonomousActive: 0,
    },
  };
}
