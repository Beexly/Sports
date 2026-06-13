/**
 * Jarvis Self-Knowledge Model — Layer E
 *
 * Jarvis knows exactly what he knows, what he can do, what he cannot do,
 * and where his information came from. He never overstates confidence.
 * He flags when his knowledge is stale.
 *
 * Trust rules:
 *   - MEMORY_STORE is isKnown=false — no DB/vector store is wired.
 *   - VOICE_INTERFACE is isKnown=false, freshnessStatus=UNKNOWN — not wired.
 *   - EXTERNAL_TOOLS is isKnown=false — MCP layer is not wired.
 *   - cannotDoList always includes voice and external tools.
 *   - No domain claims FRESH without evidence from the OwnerSummary.
 *   - selfCorrectionLog is append-only — never mutates previous entries.
 */

import type { OwnerSummary } from "../cockpit/owner-summary";
import type { JarvisIntelligenceState } from "./intelligence-state";

// ─── Re-export ────────────────────────────────────────────────────────────────

export type JarvisOSState = JarvisIntelligenceState;

// ─── Types ────────────────────────────────────────────────────────────────────

export type KnowledgeDomain =
  | "PLATFORM_STATE"    // freshness from last OwnerSummary assessment
  | "PICKS_DATA"        // freshness from last ingestion
  | "SETTLEMENT_DATA"   // freshness from last settlement run
  | "PERFORMANCE_STATS" // freshness from calibration gate
  | "SUBSCRIPTION_DATA" // freshness from Stripe sync
  | "AGENT_STATUSES"    // static from registry (always current)
  | "TOOL_STATUSES"     // static from registry (always current)
  | "MEMORY_STORE"      // honest: FILE_BACKED only, no vector/DB
  | "VOICE_INTERFACE"   // honest: NOT_WIRED
  | "EXTERNAL_TOOLS";   // honest: MCP layer NOT_WIRED

export interface KnowledgeEntry {
  readonly domain: KnowledgeDomain;
  readonly isKnown: boolean;
  readonly confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  readonly source: string;
  readonly freshnessStatus: "FRESH" | "ACCEPTABLE" | "STALE" | "UNKNOWN";
  readonly lastUpdated: string | null;
  /** What Jarvis does NOT know in this domain. */
  readonly gapDescription: string | null;
  /** How to get this knowledge if not available. */
  readonly howToFill: string | null;
}

export interface JarvisSelfModel {
  readonly modelVersion: string;
  readonly assessedAt: string;
  readonly knowledgeMap: readonly KnowledgeEntry[];
  readonly canDoList: readonly string[];
  readonly cannotDoList: readonly string[];
  readonly watchingFor: readonly string[];
  readonly openQuestions: readonly string[];
  readonly confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  readonly selfCorrectionLog: readonly string[];
}

// ─── Freshness thresholds ──────────────────────────────────────────────────────

const FRESHNESS_THRESHOLDS_MS = {
  FRESH: 60 * 60 * 1000,        // < 1 hour
  ACCEPTABLE: 6 * 60 * 60 * 1000, // < 6 hours
} as const;

export function isKnowledgeStale(entry: KnowledgeEntry, nowIso: string): boolean {
  if (!entry.lastUpdated || entry.freshnessStatus === "UNKNOWN") return true;
  const ageMs = new Date(nowIso).getTime() - new Date(entry.lastUpdated).getTime();
  return ageMs > FRESHNESS_THRESHOLDS_MS.ACCEPTABLE;
}

function computeFreshness(lastUpdated: string | null, nowIso: string): "FRESH" | "ACCEPTABLE" | "STALE" | "UNKNOWN" {
  if (!lastUpdated) return "UNKNOWN";
  const ageMs = new Date(nowIso).getTime() - new Date(lastUpdated).getTime();
  if (ageMs <= FRESHNESS_THRESHOLDS_MS.FRESH) return "FRESH";
  if (ageMs <= FRESHNESS_THRESHOLDS_MS.ACCEPTABLE) return "ACCEPTABLE";
  return "STALE";
}

// ─── Self-model builder ────────────────────────────────────────────────────────

export function buildSelfModel(
  summary: OwnerSummary,
  osState: JarvisOSState,
): JarvisSelfModel {
  const now = new Date().toISOString();
  const assessedAt = summary.assessedAt;

  // Build knowledge map for all domains
  const knowledgeMap: KnowledgeEntry[] = [
    {
      domain: "PLATFORM_STATE",
      isKnown: true,
      confidence: "HIGH",
      source: "OwnerSummary.assessedAt",
      freshnessStatus: computeFreshness(assessedAt, now),
      lastUpdated: assessedAt,
      gapDescription:
        computeFreshness(assessedAt, now) === "STALE"
          ? "OwnerSummary is stale — reload cockpit to refresh."
          : null,
      howToFill:
        computeFreshness(assessedAt, now) === "STALE"
          ? "Reload the cockpit page to trigger a fresh assessment."
          : null,
    },
    {
      domain: "PICKS_DATA",
      isKnown: summary.picks.totalInSystem > 0,
      confidence: summary.picks.isPublicGateOpen ? "HIGH" : "MEDIUM",
      source: "OwnerSummary.picks",
      freshnessStatus: computeFreshness(assessedAt, now),
      lastUpdated: assessedAt,
      gapDescription:
        summary.picks.totalInSystem === 0
          ? "No picks in system — ingestion has not run or generated picks yet."
          : null,
      howToFill:
        summary.picks.totalInSystem === 0
          ? "Run ingestion and scoring workers to generate picks."
          : null,
    },
    {
      domain: "SETTLEMENT_DATA",
      isKnown: summary.picks.canonicalSettled > 0,
      confidence: summary.picks.canonicalSettled > 0 ? "HIGH" : "LOW",
      source: "OwnerSummary.picks.canonicalSettled",
      freshnessStatus:
        summary.picks.canonicalSettled > 0
          ? computeFreshness(assessedAt, now)
          : "UNKNOWN",
      lastUpdated: summary.picks.canonicalSettled > 0 ? assessedAt : null,
      gapDescription:
        summary.picks.canonicalSettled === 0
          ? "No picks have been settled. Settlement worker has not run."
          : null,
      howToFill:
        summary.picks.canonicalSettled === 0
          ? "Run the settlement worker to settle pending picks against verified game outcomes."
          : null,
    },
    {
      domain: "PERFORMANCE_STATS",
      isKnown: summary.performance.displaySafe,
      confidence: summary.performance.displaySafe ? "HIGH" : "LOW",
      source: "OwnerSummary.performance",
      freshnessStatus: summary.performance.displaySafe
        ? computeFreshness(assessedAt, now)
        : "UNKNOWN",
      lastUpdated: summary.performance.displaySafe ? assessedAt : null,
      gapDescription: !summary.performance.displaySafe
        ? `Performance not display-safe: ${summary.performance.remainingToThreshold} more canonical picks needed.`
        : null,
      howToFill: !summary.performance.displaySafe
        ? `Settle ${summary.performance.remainingToThreshold} more canonical picks.`
        : null,
    },
    {
      domain: "SUBSCRIPTION_DATA",
      isKnown: false,
      confidence: "UNKNOWN",
      source: "OwnerSummary.aiOps (Stripe wired, intelligence not built)",
      freshnessStatus: "UNKNOWN",
      lastUpdated: null,
      gapDescription:
        "Subscription intelligence (churn, CLV, upgrade triggers) is not built. Stripe is wired for billing only.",
      howToFill: "Build BOBBY subscription intelligence layer on top of existing Stripe integration.",
    },
    {
      domain: "AGENT_STATUSES",
      isKnown: true,
      confidence: "HIGH",
      source: "agent-council.ts (static registry)",
      freshnessStatus: "FRESH",
      lastUpdated: now,
      gapDescription: null,
      howToFill: null,
    },
    {
      domain: "TOOL_STATUSES",
      isKnown: true,
      confidence: "HIGH",
      source: "capability-registry.ts (static registry)",
      freshnessStatus: "FRESH",
      lastUpdated: now,
      gapDescription: null,
      howToFill: null,
    },
    {
      domain: "MEMORY_STORE",
      isKnown: false,
      confidence: "UNKNOWN",
      source: "intelligence-state.ts (memory.wired)",
      freshnessStatus: "UNKNOWN",
      lastUpdated: null,
      gapDescription:
        "No persistent cross-session memory. Each session rebuilds from OwnerSummary. " +
        "Memory protocol is designed in docs/ai/jarvis/ but the store is not wired.",
      howToFill:
        "Wire the episodic memory store (Postgres-first per spec). Vector/mem0 is retrieval only, never authority.",
    },
    {
      domain: "VOICE_INTERFACE",
      isKnown: false,
      confidence: "UNKNOWN",
      source: "agent-council.ts (ECHO seat: NOT_WIRED)",
      freshnessStatus: "UNKNOWN",
      lastUpdated: null,
      gapDescription: "No STT/TTS pipeline exists. Voice is Phase 4+ design only.",
      howToFill: "Wire STT/TTS pipeline per ECHO seat charter when Phase 4 begins.",
    },
    {
      domain: "EXTERNAL_TOOLS",
      isKnown: false,
      confidence: "UNKNOWN",
      source: "agent-council.ts (RELAY seat: NOT_WIRED)",
      freshnessStatus: "UNKNOWN",
      lastUpdated: null,
      gapDescription:
        "MCP tool bus is not wired. External tool calls go through hand-written adapters (Odds API, Stripe) only.",
      howToFill: "Wire RELAY seat MCP gateway per charter when tool automation is required.",
    },
  ];

  // What Jarvis can do right now
  const canDoList: string[] = [
    "Answer owner questions from OwnerSummary state (deterministic, no model calls)",
    "Detect intents from natural language via pattern matching",
    "Build and present department health reports from OwnerSummary",
    "Prepare dispatch plans for task routing (pending owner approval)",
    "Produce morning briefings synthesized from live assessment",
    "Accumulate session context within a conversation (session memory)",
    "Detect patterns across historical OwnerSummary snapshots",
    `Surface ${osState.councilCounts.total} council seat charters and capabilities`,
    "Produce a self-knowledge model with honest capability/gap accounting",
    "Scribe session handoffs to vault format",
  ];

  // What Jarvis cannot do right now
  const cannotDoList: string[] = [
    "Voice interface — NOT_WIRED (ECHO seat designed only)",
    "External tool calls beyond Odds API and Stripe adapters — MCP NOT_WIRED",
    "Persistent cross-session memory — memory store not wired",
    "Execute tasks autonomously — all dispatch plans require owner approval",
    "Access Stripe subscription intelligence — layer not built",
    "Run model inference — all responses are deterministic from registry/OwnerSummary",
    "Post to external channels — externalActionsAllowed is always false",
  ];

  // Patterns and risks Jarvis is watching
  const watchingFor: string[] = [
    "Critical warnings persisting across sessions without resolution",
    "Decision backlog growing without owner action",
    "Settlement backlog growing (canonicalPending > 10)",
    "Data pipeline health degrading across snapshots",
    "AI Ops telemetry gaps widening",
  ];

  // Open questions Jarvis needs answers to
  const openQuestions: string[] = [];
  if (summary.picks.totalInSystem === 0) {
    openQuestions.push("Why have no picks been generated? Is ingestion running?");
  }
  if (summary.criticalWarnings.length > 0) {
    summary.criticalWarnings.forEach((w) => openQuestions.push(`What resolves: "${w}"?`));
  }
  if (!summary.performance.displaySafe) {
    openQuestions.push(
      `When will the ${summary.performance.remainingToThreshold} remaining canonical picks settle?`,
    );
  }
  const memWired = osState.memory.wired;
  if (!memWired) {
    openQuestions.push("When will the episodic memory store be wired?");
  }

  // Confidence: HIGH only when platform is GREEN and no critical gaps
  const confidenceLevel: "HIGH" | "MEDIUM" | "LOW" =
    summary.overallColor === "GREEN" && summary.criticalWarnings.length === 0
      ? "HIGH"
      : summary.overallColor === "RED"
        ? "LOW"
        : "MEDIUM";

  return {
    modelVersion: summary.jarvisVersion,
    assessedAt,
    knowledgeMap,
    canDoList,
    cannotDoList,
    watchingFor,
    openQuestions,
    confidenceLevel,
    selfCorrectionLog: [],
  };
}

export function getKnowledgeForDomain(
  model: JarvisSelfModel,
  domain: KnowledgeDomain,
): KnowledgeEntry {
  const entry = model.knowledgeMap.find((e) => e.domain === domain);
  if (!entry) {
    return {
      domain,
      isKnown: false,
      confidence: "UNKNOWN",
      source: "Not in self-model",
      freshnessStatus: "UNKNOWN",
      lastUpdated: null,
      gapDescription: `Domain "${domain}" not present in self-model.`,
      howToFill: "Add this domain to buildSelfModel().",
    };
  }
  return entry;
}

/** Append a self-correction to the log — immutable, append-only. */
export function recordSelfCorrection(
  model: JarvisSelfModel,
  correction: string,
): JarvisSelfModel {
  const entry = `[${new Date().toISOString().slice(0, 16)}] ${correction}`;
  return {
    ...model,
    selfCorrectionLog: [...model.selfCorrectionLog, entry],
  };
}

/**
 * Summarize the self-model for the owner in executive register.
 * Format: what I know confidently · what I don't know · what I'm watching · what I need.
 */
export function summarizeSelfModelForOwner(model: JarvisSelfModel): string {
  const knownDomains = model.knowledgeMap
    .filter((e) => e.isKnown && e.freshnessStatus !== "STALE")
    .map((e) => e.domain);

  const unknownDomains = model.knowledgeMap
    .filter((e) => !e.isKnown)
    .map((e) => e.domain);

  const staleCount = model.knowledgeMap.filter(
    (e) => e.freshnessStatus === "STALE",
  ).length;

  const lines: string[] = [
    `WHAT I KNOW CONFIDENTLY (${knownDomains.length} domains): ${knownDomains.join(", ")}.`,
    `WHAT I DON'T KNOW (${unknownDomains.length} domains): ${unknownDomains.join(", ")}.`,
  ];

  if (staleCount > 0) {
    lines.push(`STALE: ${staleCount} domain${staleCount === 1 ? "" : "s"} have stale data — reload or re-run to refresh.`);
  }

  if (model.watchingFor.length > 0) {
    lines.push(`WATCHING: ${model.watchingFor.slice(0, 3).join("; ")}.`);
  }

  if (model.openQuestions.length > 0) {
    lines.push(`NEED FROM YOU: ${model.openQuestions[0]}`);
  } else {
    lines.push("NEED FROM YOU: Nothing critical at this time.");
  }

  if (model.selfCorrectionLog.length > 0) {
    lines.push(
      `CORRECTIONS: ${model.selfCorrectionLog[model.selfCorrectionLog.length - 1]}`,
    );
  }

  return lines.join("\n");
}
