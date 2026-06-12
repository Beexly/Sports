/**
 * Self-knowledge model — Layer E of Executive Intelligence v2.
 *
 * Jarvis knows exactly what he knows, where it came from, and how stale
 * it is. He never overstates: voice is NOT wired, external tools are
 * NOT wired, memory is file-backed only — and the model says so in
 * plain text. Confidence is earned from evidence, not asserted.
 */

import type { OwnerSummary } from "@/lib/cockpit/owner-summary";
import { buildMemoryStatus } from "./intelligence-state";
import { computeWiringScore } from "./capability-registry";

export type KnowledgeDomain =
  | "PLATFORM_STATE"
  | "PICKS_DATA"
  | "SETTLEMENT_DATA"
  | "PERFORMANCE_STATS"
  | "SUBSCRIPTION_DATA"
  | "AGENT_STATUSES"
  | "TOOL_STATUSES"
  | "MEMORY_STORE"
  | "VOICE_INTERFACE"
  | "EXTERNAL_TOOLS";

export type FreshnessStatus = "FRESH" | "ACCEPTABLE" | "STALE" | "UNKNOWN";
export type Confidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export interface KnowledgeEntry {
  readonly domain: KnowledgeDomain;
  readonly isKnown: boolean;
  readonly confidence: Confidence;
  readonly source: string;
  readonly freshnessStatus: FreshnessStatus;
  readonly lastUpdated: string | null;
  readonly gapDescription: string | null;
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

const FRESH_MS = 2 * 60 * 60 * 1000; // 2h
const ACCEPTABLE_MS = 24 * 60 * 60 * 1000; // 24h

function freshness(lastUpdated: string | null, nowIso: string): FreshnessStatus {
  if (!lastUpdated) return "UNKNOWN";
  const age = Date.parse(nowIso) - Date.parse(lastUpdated);
  if (Number.isNaN(age)) return "UNKNOWN";
  if (age <= FRESH_MS) return "FRESH";
  if (age <= ACCEPTABLE_MS) return "ACCEPTABLE";
  return "STALE";
}

export function buildSelfModel(
  summary: OwnerSummary,
  nowIso: string = new Date().toISOString()
): JarvisSelfModel {
  const memory = buildMemoryStatus();
  const assessedAt = summary.assessedAt;
  const f = freshness(assessedAt, nowIso);

  const knowledgeMap: readonly KnowledgeEntry[] = [
    {
      domain: "PLATFORM_STATE",
      isKnown: true,
      confidence: f === "STALE" ? "MEDIUM" : "HIGH",
      source: "OwnerSummary (Jarvis assessment)",
      freshnessStatus: f,
      lastUpdated: assessedAt,
      gapDescription: null,
      howToFill: null,
    },
    {
      domain: "PICKS_DATA",
      isKnown: true,
      confidence: f === "STALE" ? "MEDIUM" : "HIGH",
      source: `OwnerSummary.picks (${summary.picks.totalInSystem} in system, ${summary.picks.today} today)`,
      freshnessStatus: f,
      lastUpdated: assessedAt,
      gapDescription: null,
      howToFill: null,
    },
    {
      domain: "SETTLEMENT_DATA",
      isKnown: true,
      confidence: "HIGH",
      source: `OwnerSummary.picks (${summary.picks.canonicalSettled} canonical settled)`,
      freshnessStatus: f,
      lastUpdated: assessedAt,
      gapDescription: null,
      howToFill: null,
    },
    {
      domain: "PERFORMANCE_STATS",
      isKnown: summary.performance.displaySafe,
      confidence: summary.performance.displaySafe ? "HIGH" : "LOW",
      source: "Performance gate (public-performance-policy)",
      freshnessStatus: f,
      lastUpdated: assessedAt,
      gapDescription: summary.performance.displaySafe
        ? null
        : `Gate closed: ${summary.performance.gateBlockers.join("; ") || "sample below minimum"}.`,
      howToFill: summary.performance.displaySafe
        ? null
        : `Accumulate ${summary.performance.remainingToThreshold} more settled canonical picks.`,
    },
    {
      domain: "SUBSCRIPTION_DATA",
      isKnown: false,
      confidence: "UNKNOWN",
      source: "Stripe webhooks (sync state not surfaced to Jarvis)",
      freshnessStatus: "UNKNOWN",
      lastUpdated: null,
      gapDescription: "Subscription counts/churn are not in OwnerSummary yet.",
      howToFill: "Add a subscriptions section to buildOwnerSummary from the Subscription table.",
    },
    {
      domain: "AGENT_STATUSES",
      isKnown: true,
      confidence: "HIGH",
      source: "Agent council registry (static, always current)",
      freshnessStatus: "FRESH",
      lastUpdated: nowIso,
      gapDescription: null,
      howToFill: null,
    },
    {
      domain: "TOOL_STATUSES",
      isKnown: true,
      confidence: "HIGH",
      source: `Capability registry (wiring score ${computeWiringScore()}%)`,
      freshnessStatus: "FRESH",
      lastUpdated: nowIso,
      gapDescription: null,
      howToFill: null,
    },
    {
      domain: "MEMORY_STORE",
      isKnown: false,
      confidence: "LOW",
      source: memory.truth,
      freshnessStatus: "UNKNOWN",
      lastUpdated: null,
      gapDescription: "File-backed vault only — no database, no vector store, no recall across sessions.",
      howToFill: "Persist ScribeEntries to a table and load the latest HANDOFF at session start.",
    },
    {
      domain: "VOICE_INTERFACE",
      isKnown: false,
      confidence: "UNKNOWN",
      source: "Not wired",
      freshnessStatus: "UNKNOWN",
      lastUpdated: null,
      gapDescription: "NOT_WIRED — no speech in or out exists.",
      howToFill: "Out of scope until the conversation surface proves out in text.",
    },
    {
      domain: "EXTERNAL_TOOLS",
      isKnown: false,
      confidence: "UNKNOWN",
      source: "Not wired",
      freshnessStatus: "UNKNOWN",
      lastUpdated: null,
      gapDescription: "NOT_WIRED — no MCP layer; Jarvis cannot touch external systems.",
      howToFill: "Deliberate: external actions stay human-executed until approval flow is proven.",
    },
  ];

  const known = knowledgeMap.filter((k) => k.isKnown).length;
  const confidenceLevel: JarvisSelfModel["confidenceLevel"] =
    known >= 6 && f !== "STALE" ? "HIGH" : known >= 4 ? "MEDIUM" : "LOW";

  return {
    modelVersion: "self-model-v2",
    assessedAt: nowIso,
    knowledgeMap,
    canDoList: [
      "Answer any of the 18 Ask-Jarvis intents from live OwnerSummary, with sources",
      "Prepare DispatchPlans routed to the right department head (approval-gated)",
      "Build morning briefings and department intelligence reports",
      "Detect recurring blockers, decision backlogs, and calibration drift across snapshots",
      "Hold session memory — facts are stored once, never re-derived in-session",
    ],
    cannotDoList: [
      "Speak or listen — voice interface is NOT_WIRED",
      "Touch external systems — external tool layer is NOT_WIRED",
      "Remember across sessions — memory store is file-backed vault only, no recall",
      "Execute dispatches — plans run only after explicit owner approval",
      "Report subscription/revenue numbers — not yet surfaced in OwnerSummary",
    ],
    watchingFor: [
      "Critical warnings recurring across assessments",
      "Owner decision queue growing without resolution",
      "Win-rate drift once the performance gate opens",
      "Pick-inflow slowdown (ingestion/quota trouble shows here first)",
    ],
    openQuestions: knowledgeMap
      .filter((k) => k.howToFill !== null)
      .map((k) => `${k.domain}: ${k.howToFill}`),
    confidenceLevel,
    selfCorrectionLog: [],
  };
}

export function getKnowledgeForDomain(
  model: JarvisSelfModel,
  domain: KnowledgeDomain
): KnowledgeEntry {
  const entry = model.knowledgeMap.find((k) => k.domain === domain);
  if (!entry) {
    return {
      domain,
      isKnown: false,
      confidence: "UNKNOWN",
      source: "Domain absent from knowledge map",
      freshnessStatus: "UNKNOWN",
      lastUpdated: null,
      gapDescription: "This domain has never been assessed.",
      howToFill: "Add it to buildSelfModel.",
    };
  }
  return entry;
}

export function isKnowledgeStale(entry: KnowledgeEntry, nowIso: string): boolean {
  if (!entry.lastUpdated) return true;
  return freshness(entry.lastUpdated, nowIso) === "STALE";
}

export function recordSelfCorrection(
  model: JarvisSelfModel,
  correction: string
): JarvisSelfModel {
  return {
    ...model,
    selfCorrectionLog: [...model.selfCorrectionLog, correction],
  };
}

export function summarizeSelfModelForOwner(model: JarvisSelfModel): string {
  const known = model.knowledgeMap.filter((k) => k.isKnown);
  const unknown = model.knowledgeMap.filter((k) => !k.isKnown);
  return [
    `I know confidently: ${known.map((k) => k.domain).join(", ")}.`,
    `I do not know: ${unknown.map((k) => k.domain).join(", ")} — and I won't pretend to.`,
    `Watching: ${model.watchingFor.join("; ")}.`,
    model.openQuestions.length > 0
      ? `To close the gaps: ${model.openQuestions[0]}`
      : "No open gaps.",
  ].join("\n");
}
