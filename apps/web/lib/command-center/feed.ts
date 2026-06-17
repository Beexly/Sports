/**
 * Command Center feed — the composition layer (I/O at the edges, logic pure).
 *
 * Pulls the platform's existing live synthesis and assembles the ranked
 * owner-attention queue + operating narrative + honest per-lane data modes.
 *
 * It adds NO new source of truth. Jarvis and the Owner Summary already derive
 * from real DB state through the trust gates; this layer ranks and narrates
 * what they produce. When the DB is unreachable, lanes fall back to a clearly
 * labeled state — never fabricated live data.
 */

import { getReadinessGates } from "@sports/prediction-engine";
import { db, isStubMode } from "@sports/db";
import { startOfDay, endOfDay } from "date-fns";
import { loadJarvisAssessment } from "../cockpit/jarvis-data";
import { JARVIS_VERSION } from "../cockpit/jarvis";
import { buildOwnerSummary } from "../cockpit/owner-summary";
import { collectAttentionSignals, rankAttention } from "./attention";
import { buildOperatingNarrative } from "./narrative";
import type {
  CommandCenterFeed,
  CommandCenterLane,
  DataMode,
  FeedDataMode,
  OwnerAttentionItem,
} from "./types";

function rollupDataMode(lanes: readonly CommandCenterLane[]): FeedDataMode {
  if (lanes.length === 0) return "unavailable";
  if (lanes.every((l) => l.dataMode === "unavailable")) return "unavailable";
  return lanes.some((l) => l.dataMode !== "live")
    ? "live_with_labeled_fallbacks"
    : "live";
}

function countByUrgency(items: readonly OwnerAttentionItem[]) {
  return {
    attentionTotal: items.length,
    critical: items.filter((a) => a.urgency === "CRITICAL").length,
    high: items.filter((a) => a.urgency === "HIGH").length,
    normal: items.filter((a) => a.urgency === "NORMAL").length,
    low: items.filter((a) => a.urgency === "LOW").length,
  };
}

/**
 * Build the full feed. Never throws: a synthesis failure returns a labeled
 * error feed so the surface always renders (the cockpit's job is to be the
 * answer to "is the system OK?", so failing to compute is itself a signal).
 */
export async function loadCommandCenterFeed(): Promise<CommandCenterFeed> {
  const now = new Date();
  const gates = getReadinessGates();
  const stub = isStubMode();

  // This pick.count doubles as a DB-reachability probe. It uses the same client
  // and DB as every query inside loadJarvisAssessment — which catches its own DB
  // errors and degrades to empty/zero data rather than throwing. So if this probe
  // fails (or we're in stub mode), the synthesis behind EVERY lane was built from
  // empty fallbacks, and no lane may honestly claim "live".
  //
  // In stub mode we never call the stub's count: with DEMO_PICKS_ENABLED it would
  // report sample picks as today's live count, contradicting the fallback label.
  let dbReachable = false;
  let todayPickCount = 0;
  if (!stub) {
    try {
      todayPickCount = await db.pick.count({
        where: {
          isPublished: true,
          generatedAt: { gte: startOfDay(now), lte: endOfDay(now) },
        },
      });
      dbReachable = true;
    } catch {
      dbReachable = false;
      todayPickCount = 0;
    }
  }

  let assessment;
  let performancePolicy;
  try {
    const jarvis = await loadJarvisAssessment();
    assessment = jarvis.assessment;
    performancePolicy = jarvis.performancePolicy;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Jarvis synthesis failed.";
    return {
      success: false,
      generatedAt: now.toISOString(),
      noFakeLiveData: true,
      dataMode: "unavailable",
      overallColor: "RED",
      headline: "Command Center could not synthesize live state.",
      lanes: [
        {
          key: "jarvis",
          label: "Jarvis synthesis",
          dataMode: "unavailable",
          fallbackReason: message,
          itemCount: 0,
        },
      ],
      attention: [],
      narrative: {
        headline: "Synthesis unavailable — investigate the DB connection and workers.",
        whatChanged: [`Jarvis synthesis failed: ${message}`],
        whatsBlocked: ["The Command Center cannot rank attention without live synthesis."],
        needsYou: ["Restore the data layer, then reload."],
        canWait: [],
        canIgnore: [],
      },
      counts: countByUrgency([]),
      jarvisVersion: JARVIS_VERSION,
      error: message,
    };
  }

  const ownerSummary = buildOwnerSummary({
    assessment,
    performancePolicy,
    gates,
    todayPickCount,
  });

  const signals = collectAttentionSignals({
    safetyWarnings: assessment.safetyWarnings,
    externalConfigWarnings: assessment.externalConfigWarnings,
    missingPhaseWarnings: assessment.missingPhaseWarnings,
    recommendedNextActions: assessment.recommendedNextActions,
    // The Owner Summary's `decisions` and `advisoryWarnings` are re-derived views
    // of the SAME assessment arrays above (decisions = safety ∪ config ∪ first-3
    // recommended; advisories = missingPhase). Feeding both would double-count
    // every issue and inflate the ranked queue, so the Command Center reads the
    // assessment directly — the single source of truth — and takes only
    // `departments`, the unique signal the Owner Summary adds.
    advisoryWarnings: [],
    decisions: [],
    departments: ownerSummary.departments.map((d) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      actionRequired: d.actionRequired,
      actionDescription: d.actionDescription,
      drilldownHref: d.drilldownHref,
    })),
  });

  const attention = rankAttention(signals);

  const departmentsActioned = ownerSummary.departments.filter((d) => d.actionRequired).length;

  // Every lane below is synthesized from DB-backed state. When the DB is
  // unreachable (stub or outage), that synthesis ran on empty fallbacks, so the
  // lanes are honestly labeled fallback — not just the picks lane.
  const derivedMode: DataMode = dbReachable ? "live" : "labeled_fallback";
  const derivedReason = dbReachable
    ? null
    : "Database unreachable (stub or outage) — synthesized from empty fallbacks, not live state.";

  const lanes: CommandCenterLane[] = [
    {
      key: "jarvis",
      label: "Jarvis launch assessment",
      dataMode: derivedMode,
      fallbackReason: derivedReason,
      itemCount:
        assessment.safetyWarnings.length +
        assessment.missingPhaseWarnings.length +
        assessment.recommendedNextActions.length,
    },
    {
      key: "departments",
      label: "Department command map",
      dataMode: derivedMode,
      fallbackReason: derivedReason,
      itemCount: departmentsActioned,
    },
    {
      key: "performance",
      label: "Performance gate",
      dataMode: derivedMode,
      fallbackReason: derivedReason,
      itemCount: ownerSummary.performance.displaySafe ? 1 : 0,
    },
    {
      key: "config",
      label: "External configuration",
      dataMode: derivedMode,
      fallbackReason: derivedReason,
      itemCount: assessment.externalConfigWarnings.length,
    },
    {
      key: "picks",
      label: "Today's picks",
      dataMode: dbReachable ? "live" : "labeled_fallback",
      fallbackReason: dbReachable
        ? null
        : "Database unreachable (stub or outage) — pick count shown as zero, not fabricated.",
      itemCount: todayPickCount,
    },
  ];

  const narrative = buildOperatingNarrative({
    launchStatus: assessment.launchStatus,
    overallColor: ownerSummary.overallColor,
    todayPickCount,
    gatesOpen: assessment.readinessGateSummary.openCount,
    gatesTotal: assessment.readinessGateSummary.totalCount,
    publicGateOpen: ownerSummary.picks.isPublicGateOpen,
    attention,
  });

  return {
    success: true,
    generatedAt: now.toISOString(),
    noFakeLiveData: true,
    dataMode: rollupDataMode(lanes),
    overallColor: ownerSummary.overallColor,
    headline: narrative.headline,
    lanes,
    attention,
    narrative,
    counts: countByUrgency(attention),
    jarvisVersion: JARVIS_VERSION,
    error: null,
  };
}
