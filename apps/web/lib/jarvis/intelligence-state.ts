/**
 * Jarvis Intelligence State
 *
 * Pure composition layer: OwnerSummary (live operational truth) + capability
 * registry (architecture truth) + agent council (governance truth) + the
 * operating-loop posture (what parts of the Sense → Improve loop are real).
 *
 * No I/O, no Date.now(), no model calls. Everything derives from the
 * OwnerSummary passed in plus the static registries, so the state is
 * serializable and reproducible for a given summary.
 *
 * Trust rules:
 *   - memory.wired is false until a real memory store exists.
 *   - Loop phases are WIRED only when the behavior runs in code today.
 *   - Capability/council counts come straight from the registries — never
 *     adjusted for optics.
 */

import type { OwnerSummary } from "../cockpit/owner-summary";
import {
  CAPABILITY_REGISTRY,
  computeWiringScore,
  getWiringLabel,
  type JarvisCapability,
} from "./capability-registry";
import {
  AGENT_COUNCIL,
  getCouncilSeatCounts,
  type AgentCouncilMember,
  type CouncilSeatCounts,
} from "./agent-council";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OperatingPhase =
  | "SENSE"
  | "INTERPRET"
  | "DECIDE"
  | "EXPLAIN"
  | "ACT_SAFELY"
  | "REMEMBER"
  | "AUDIT"
  | "IMPROVE";

/** WIRED = behavior runs in code today. PARTIAL = some of it runs, rest is
 *  manual. NOT_WIRED = the phase does not exist yet. Never "AUTONOMOUS". */
export type PhaseStatus = "WIRED" | "PARTIAL" | "NOT_WIRED";

export interface OperatingPhasePosture {
  readonly phase: OperatingPhase;
  readonly status: PhaseStatus;
  readonly truth: string;
}

export interface CapabilityStats {
  readonly total: number;
  readonly active: number;
  readonly draftOnly: number;
  readonly manual: number;
  readonly designed: number;
  readonly notWired: number;
  readonly wiringScore: number;
  readonly wiringLabel: string;
}

export interface MemoryStatus {
  /** Always false until a persistent memory store is wired. */
  readonly wired: false;
  readonly truth: string;
  readonly protocolDocs: readonly string[];
  readonly nextAction: string;
}

export interface JarvisIntelligenceState {
  readonly summary: OwnerSummary;
  readonly capabilities: readonly JarvisCapability[];
  readonly capabilityStats: CapabilityStats;
  readonly council: readonly AgentCouncilMember[];
  readonly councilCounts: CouncilSeatCounts;
  readonly operatingLoop: readonly OperatingPhasePosture[];
  readonly memory: MemoryStatus;
  /** Mirrors summary.assessedAt — the state is only as fresh as the summary. */
  readonly assessedAt: string;
}

// ─── Operating loop posture ───────────────────────────────────────────────────

const OPERATING_LOOP: readonly OperatingPhasePosture[] = [
  {
    phase: "SENSE",
    status: "WIRED",
    truth:
      "Jarvis assessment reads ingestion, settlement, picks, and gate state from the " +
      "database on every cockpit load.",
  },
  {
    phase: "INTERPRET",
    status: "WIRED",
    truth:
      "OwnerSummary derives posture color, department health, and performance policy " +
      "deterministically — no model calls.",
  },
  {
    phase: "DECIDE",
    status: "WIRED",
    truth:
      "The decision queue ranks safety warnings, config gaps, and recommended actions " +
      "by urgency. The owner decides; Jarvis only recommends.",
  },
  {
    phase: "EXPLAIN",
    status: "WIRED",
    truth:
      "Ask Jarvis answers owner questions from live state with supporting facts, " +
      "confidence, and caveats.",
  },
  {
    phase: "ACT_SAFELY",
    status: "PARTIAL",
    truth:
      "All agent outputs are drafts requiring human approval. There is no autonomous " +
      "execution path; manual workers are the only act surface.",
  },
  {
    phase: "REMEMBER",
    status: "NOT_WIRED",
    truth:
      "No persistent memory exists. Context is rebuilt fresh from OwnerSummary every " +
      "load. The memory protocol is designed in docs/ai/jarvis/.",
  },
  {
    phase: "AUDIT",
    status: "PARTIAL",
    truth:
      "Picks are versioned and the settlement ledger is canonical. There is no " +
      "unified audit log for agent actions or tool calls yet.",
  },
  {
    phase: "IMPROVE",
    status: "NOT_WIRED",
    truth:
      "Calibration review is manual. No automated feedback loop adjusts the " +
      "prediction engine from settled results.",
  },
];

const MEMORY_PROTOCOL_DOCS: readonly string[] = [
  "docs/ai/jarvis/JARVIS_ARCHITECTURE.md",
  "docs/ai/jarvis/JARVIS_CAPABILITY_REGISTRY.md",
  "docs/ai/jarvis/JARVIS_AGENT_COUNCIL.md",
  "docs/ai/jarvis/JARVIS_MEMORY_PROTOCOL.md",
  "docs/ai/jarvis/JARVIS_OPERATOR_BRIEF.md",
];

// ─── Builders ─────────────────────────────────────────────────────────────────

// Counts capabilities by status and computes the weighted wiring score.
export function buildCapabilityStats(): CapabilityStats {
  const count = (s: JarvisCapability["status"]): number =>
    CAPABILITY_REGISTRY.filter((c) => c.status === s).length;
  const score = computeWiringScore();
  return {
    total: CAPABILITY_REGISTRY.length,
    active: count("ACTIVE"),
    draftOnly: count("DRAFT_ONLY"),
    manual: count("MANUAL"),
    designed: count("DESIGNED"),
    notWired: count("NOT_WIRED"),
    wiringScore: score,
    wiringLabel: getWiringLabel(score),
  };
}

// Returns the honest memory posture: protocol designed, store not wired.
export function buildMemoryStatus(): MemoryStatus {
  return {
    wired: false,
    truth:
      "Jarvis has no persistent memory. Operational truth is rebuilt from the database " +
      "on every load; architectural truth lives in version-controlled markdown. " +
      "Nothing is recalled across sessions.",
    protocolDocs: MEMORY_PROTOCOL_DOCS,
    nextAction:
      "Wire an episodic memory store (Postgres table or mem0) that captures owner " +
      "decisions with timestamps, per JARVIS_MEMORY_PROTOCOL.md.",
  };
}

// Returns the Sense → Improve loop posture (static truth about what runs today).
export function getOperatingLoop(): readonly OperatingPhasePosture[] {
  return OPERATING_LOOP;
}

// Composes the full intelligence state from a live OwnerSummary.
export function buildIntelligenceState(
  summary: OwnerSummary
): JarvisIntelligenceState {
  return {
    summary,
    capabilities: CAPABILITY_REGISTRY,
    capabilityStats: buildCapabilityStats(),
    council: AGENT_COUNCIL,
    councilCounts: getCouncilSeatCounts(),
    operatingLoop: OPERATING_LOOP,
    memory: buildMemoryStatus(),
    assessedAt: summary.assessedAt,
  };
}
