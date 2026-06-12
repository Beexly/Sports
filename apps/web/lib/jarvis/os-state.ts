/**
 * Jarvis OS State — unified composition of every OS layer.
 *
 * Pure function over the OwnerSummary plus the static layer builders.
 * No I/O, no Date.now() — assessedAt mirrors the summary. The state is
 * honest by construction: NOT_WIRED layers report NOT_WIRED.
 */

import type { OwnerSummary } from "../cockpit/owner-summary";
import { getCouncilSeatCounts } from "./agent-council";
import { getOperatingLoop } from "./intelligence-state";
import { summarizeScribeEntries } from "./scribe";
import type { ScribeEntry } from "./scribe-types";
import { buildJarvisMemoryStatus } from "./memory-protocol";
import { buildToolRouterStatus } from "./tool-router";
import { buildVoiceProtocolStatus } from "./voice-protocol";
import { PROMPT_LIBRARY, suggestNextPrompt } from "./prompt-library";
import { buildActionQueueSummary, type ActionItem } from "./action-queue";
import { buildAuditLedgerStatus } from "./audit-ledger";
import { buildImprovementLoopStatus } from "./improvement-loop";
import {
  buildBotRegistrySummary,
  getBotsThatCanDispatch,
} from "./bot-registry";
import {
  getAllAvailableTaskCategories,
  getAgentForCategory,
  getRecommendedBotForCategory,
  type TaskCategory,
} from "./task-dispatch";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OSPhaseStatus =
  | "WIRED"
  | "PARTIAL"
  | "NOT_WIRED"
  | "DESIGNED"
  | "MANUAL"
  | "DRAFT_ONLY"
  | "ACTIVE";

export interface OSPhasePosture {
  readonly phase: string;
  readonly status: OSPhaseStatus;
  readonly truth: string;
}

export interface JarvisOSState {
  readonly assessedAt: string;
  readonly operatingLoopPhases: readonly OSPhasePosture[];
  readonly wiredCount: number;
  readonly partialCount: number;
  readonly notWiredCount: number;
  readonly topBlockers: readonly string[];
  readonly nextBestActions: readonly string[];
  readonly ownerDecisionQueue: readonly string[];
  readonly safeToRunNow: readonly string[];
  readonly requiresApproval: readonly string[];
  readonly scribeSummary: string;
  readonly memorySummary: string;
  readonly agentSummary: string;
  readonly toolSummary: string;
  readonly voiceSummary: string;
  readonly promptLibrarySummary: string;
  readonly actionQueueSummary: string;
  readonly auditSummary: string;
  readonly improvementSummary: string;
  readonly taskDispatchSummary: string;
  readonly botRegistrySummary: string;
}

// ─── OS layer postures ────────────────────────────────────────────────────────

/** OS-layer phases appended after the core Sense→Improve loop. Statuses stay
 *  within WIRED/PARTIAL/NOT_WIRED so counts always partition the list. */
const OS_LAYER_PHASES: readonly OSPhasePosture[] = [
  {
    phase: "SCRIBE",
    status: "WIRED",
    truth:
      "Scribe protocol is code-backed and file-backed: typed entries, redaction, " +
      "markdown rendering to the vault. Writing files is a human/approved step.",
  },
  {
    phase: "VAULT",
    status: "WIRED",
    truth:
      "Obsidian-compatible vault exists under docs/ai/jarvis/vault/ — " +
      "git-versioned markdown with frontmatter.",
  },
  {
    phase: "MEMORY",
    status: "NOT_WIRED",
    truth:
      "Memory protocol is designed (classification + redaction in code) but no " +
      "queryable store exists. Nothing is recalled across sessions.",
  },
  {
    phase: "TOOL_ROUTER",
    status: "WIRED",
    truth:
      "Tool registry is code-backed with honest per-tool statuses. Most tools " +
      "are NOT_WIRED; no write tool can run without approval.",
  },
  {
    phase: "VOICE",
    status: "NOT_WIRED",
    truth:
      "Voice protocol and command grammar are designed; STT/TTS are not wired. " +
      "The console renders status only.",
  },
  {
    phase: "PROMPT_LIBRARY",
    status: "WIRED",
    truth:
      "Typed prompt library is code-backed with 8 templates, deterministic " +
      "suggestion, and placeholder filling.",
  },
  {
    phase: "ACTION_QUEUE",
    status: "WIRED",
    truth:
      "Action lifecycle is code-backed with a hard approval boundary: only " +
      "read-only checks can run without owner sign-off. No executor exists.",
  },
  {
    phase: "AUDIT_LEDGER",
    status: "PARTIAL",
    truth:
      "Picks are versioned and the settlement ledger is canonical, but no " +
      "unified action audit store is wired. Entry types and formatting exist.",
  },
  {
    phase: "IMPROVEMENT_LOOP",
    status: "NOT_WIRED",
    truth:
      "Improvement proposals are typed and the prediction engine can never be " +
      "auto-adjusted, but no loop runs. Calibration review is manual.",
  },
];

// ─── Builder ──────────────────────────────────────────────────────────────────

// Composes the unified OS state from the live summary plus every layer builder.
export function buildJarvisOSState(
  summary: OwnerSummary,
  recentScribeEntries?: readonly ScribeEntry[],
  pendingActions?: readonly ActionItem[]
): JarvisOSState {
  const memory = buildJarvisMemoryStatus();
  const tools = buildToolRouterStatus();
  const voice = buildVoiceProtocolStatus();
  const council = getCouncilSeatCounts();
  const audit = buildAuditLedgerStatus();
  const improvement = buildImprovementLoopStatus();
  const queue = buildActionQueueSummary(pendingActions ?? []);
  const bots = buildBotRegistrySummary();
  const dispatchable = getBotsThatCanDispatch();
  const categories = getAllAvailableTaskCategories();

  const phases: readonly OSPhasePosture[] = [
    ...getOperatingLoop().map((p) => ({
      phase: p.phase,
      status: p.status as OSPhaseStatus,
      truth: p.truth,
    })),
    ...OS_LAYER_PHASES,
  ];

  const wiredCount = phases.filter((p) => p.status === "WIRED").length;
  const partialCount = phases.filter((p) => p.status === "PARTIAL").length;
  const notWiredCount = phases.filter((p) => p.status === "NOT_WIRED").length;

  const topBlockers: string[] = [
    ...summary.criticalWarnings,
    "Memory store not wired — no cross-session recall",
    "No approval mechanism wired — every write tool is parked",
    "Audit store not wired — agent actions have no automated trail",
  ];

  const suggested = suggestNextPrompt("jarvis-os", topBlockers);
  const nextBestActions: string[] = [
    memory.nextWiringStep,
    "Persist AuditEntry rows and write one on every action-queue transition",
    ...(suggested ? [`Run prompt template: ${suggested.id} — ${suggested.purpose}`] : []),
  ];

  return {
    assessedAt: summary.assessedAt,
    operatingLoopPhases: phases,
    wiredCount,
    partialCount,
    notWiredCount,
    topBlockers,
    nextBestActions,
    ownerDecisionQueue: summary.decisions.map(
      (d) => `[${d.urgency}] ${d.description}`
    ),
    safeToRunNow: [
      ...tools.readyToUseNow.map((t) => `Tool: ${t} (read-only)`),
      "Action type: READ_ONLY_CHECK",
      "Ask Jarvis — deterministic Q&A from live state",
    ],
    requiresApproval: [
      ...tools.requiresApproval.map((t) => `Tool: ${t}`),
      "Every non-read-only action type in the queue",
      "Every improvement proposal (prediction engine: always)",
    ],
    scribeSummary: summarizeScribeEntries(recentScribeEntries ?? []),
    memorySummary: memory.truth,
    agentSummary:
      `${council.total} council seats: ${council.draftOnly} draft-only, ` +
      `${council.manual} manual, ${council.notWired} not wired. ` +
      `${council.registeredCockpitAgents} registered cockpit agents. ` +
      "No seat acts externally without approval.",
    toolSummary:
      `${tools.totalTools} tools registered: ${tools.wiredCount} wired, ` +
      `${tools.partialCount} partial, ${tools.notWiredCount} not wired/designed. ` +
      `Ready now (read-only): ${tools.readyToUseNow.join(", ") || "none"}.`,
    voiceSummary:
      `Voice is ${voice.isActive ? "active" : "not active"}: STT ${voice.sttStatus}, ` +
      `TTS ${voice.ttsStatus}, wake mode ${voice.wakeMode}. ` +
      `${voice.supportedCommands.length} commands designed.`,
    promptLibrarySummary:
      `${PROMPT_LIBRARY.length} prompt templates registered, code-backed. ` +
      `Suggested next: ${suggested?.id ?? "none"}.`,
    actionQueueSummary:
      `Queue: ${queue.proposed} proposed, ${queue.needsApproval} needs approval, ` +
      `${queue.approved} approved, ${queue.running} running, ` +
      `${queue.completed} completed, ${queue.failed} failed.`,
    auditSummary: audit.truth,
    improvementSummary: improvement.truth,
    taskDispatchSummary:
      `${categories.length} task categories available for dispatch. ` +
      categories
        .slice(0, 4)
        .map((c: TaskCategory) => {
          const bot = getRecommendedBotForCategory(c);
          const agent = getAgentForCategory(c);
          return `${c} → agent:${agent}${bot ? ` bot:${bot}` : ""}`;
        })
        .join("; ") +
      ` and ${categories.length - 4} more.`,
    botRegistrySummary:
      `${bots.total} bots registered: ${bots.canDispatch} can dispatch via Jarvis, ` +
      `${bots.manual} manual, ${bots.active} active. ` +
      `Dispatchable: ${dispatchable.map((b) => b.name).join(", ") || "none"}.`,
  };
}

// ─── Stub summary (for the OS page when the database is unavailable) ──────────

// Builds a minimal, honest OwnerSummary stub so the OS map can render without a DB.
export function buildStubOwnerSummaryForOS(assessedAt: string): OwnerSummary {
  return {
    overallColor: "AMBER",
    oneLiner:
      "Stub summary — live Jarvis assessment unavailable. OS layer statuses are " +
      "static truth and remain accurate.",
    picks: {
      today: 0,
      isPublicGateOpen: false,
      publicReadyCount: 0,
      blockedReason: "Live assessment unavailable",
      canonicalPending: 0,
      canonicalSettled: 0,
      bootstrapExcluded: 0,
      totalInSystem: 0,
      publicReadinessExplanation:
        "Live data unavailable — no claims are made about picks state.",
    },
    performance: {
      targetPct: 70,
      actualWinRate: null,
      canonicalSampleSize: 0,
      minimumRequired: 25,
      remainingToThreshold: 25,
      isGateOpen: false,
      displaySafe: false,
      gateBlockers: ["LIVE_ASSESSMENT_UNAVAILABLE"],
      smallSampleWarning: false,
      record: "0-0-0",
    },
    departments: [],
    decisions: [],
    criticalWarnings: [],
    advisoryWarnings: ["Live Jarvis assessment unavailable — showing stub summary."],
    aiOps: {
      available: false,
      reason: "Usage telemetry is not instrumented.",
      modelLanePolicy: [],
      toInstrumentNext: [],
      ccusageNote: "Run `npx ccusage@latest` for manual spend checks.",
    },
    assessedAt,
    jarvisVersion: "stub",
  };
}
