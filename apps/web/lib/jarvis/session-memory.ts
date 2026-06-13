/**
 * Jarvis Session Memory — Layer B
 *
 * Within a session, Jarvis never re-derives a known fact. He accumulates
 * context, stores facts with their sources, and provides instant lookup
 * so the same question doesn't cost a re-derive.
 *
 * Trust rules:
 *   - Facts are immutable once stored; supersedeFact creates a new fact,
 *     not a mutation — the old fact is marked supersededBy.
 *   - No fact is invented — derivedFrom must name the actual source.
 *   - buildSessionHandoff produces a ScribeEntry of type HANDOFF for
 *     the vault — compact, not a data dump.
 */

import type { ConversationMessage } from "./conversation-engine";
import type { ScribeEntry } from "./scribe-types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionFactType =
  | "PLATFORM_STATE"
  | "OWNER_DECISION"
  | "TASK_DISPATCHED"
  | "AGENT_REPORT"
  | "RISK_SURFACED"
  | "IMPROVEMENT_NOTED"
  | "PATTERN_OBSERVED";

export interface SessionFact {
  readonly id: string;
  readonly factType: SessionFactType;
  readonly content: string;
  /** The source this fact was derived from. Required — no invented facts. */
  readonly derivedFrom: string;
  readonly confidence: "HIGH" | "MEDIUM" | "LOW";
  readonly timestamp: string;
  readonly usedCount: number;
  /** Set when a newer fact superseded this one. Points to the new fact id. */
  readonly supersededBy?: string;
}

export interface SessionContext {
  readonly sessionId: string;
  readonly facts: readonly SessionFact[];
  readonly ownerPreferences: readonly string[];
  readonly openLoops: readonly string[];
  readonly decisionsThisSession: readonly string[];
  readonly tasksDispatchedThisSession: readonly string[];
  readonly risksSurfacedThisSession: readonly string[];
  readonly lastSyncedAt: string;
}

// ─── ID generation ─────────────────────────────────────────────────────────────

let _factCounter = 0;
function nextFactId(): string {
  return `fact_${Date.now()}_${++_factCounter}`;
}

// ─── Core functions ────────────────────────────────────────────────────────────

/** Create a new empty session context. */
export function createSessionContext(
  sessionId: string,
  startedAt: string,
): SessionContext {
  return {
    sessionId,
    facts: [],
    ownerPreferences: [],
    openLoops: [],
    decisionsThisSession: [],
    tasksDispatchedThisSession: [],
    risksSurfacedThisSession: [],
    lastSyncedAt: startedAt,
  };
}

/**
 * Add a fact to the session context.
 *
 * Does NOT add if an identical fact (same type + content + source) already
 * exists and has not been superseded — this is the "never re-derive" invariant.
 */
export function addFact(
  context: SessionContext,
  fact: Omit<SessionFact, "id" | "usedCount">,
): SessionContext {
  // Deduplication: skip if an active (non-superseded) fact with the same
  // type and content already exists.
  const existing = context.facts.find(
    (f) =>
      f.factType === fact.factType &&
      f.content === fact.content &&
      f.supersededBy === undefined,
  );
  if (existing) return context;

  const newFact: SessionFact = { ...fact, id: nextFactId(), usedCount: 0 };

  // Track by category for quick access
  const decisionsThisSession =
    fact.factType === "OWNER_DECISION"
      ? [...context.decisionsThisSession, fact.content]
      : context.decisionsThisSession;

  const tasksDispatchedThisSession =
    fact.factType === "TASK_DISPATCHED"
      ? [...context.tasksDispatchedThisSession, fact.content]
      : context.tasksDispatchedThisSession;

  const risksSurfacedThisSession =
    fact.factType === "RISK_SURFACED"
      ? [...context.risksSurfacedThisSession, fact.content]
      : context.risksSurfacedThisSession;

  return {
    ...context,
    facts: [...context.facts, newFact],
    decisionsThisSession,
    tasksDispatchedThisSession,
    risksSurfacedThisSession,
    lastSyncedAt: fact.timestamp,
  };
}

/** Look up all active (non-superseded) facts of a given type. */
export function lookupFact(
  context: SessionContext,
  factType: SessionFactType,
): readonly SessionFact[] {
  return context.facts.filter(
    (f) => f.factType === factType && f.supersededBy === undefined,
  );
}

/**
 * Supersede an existing fact with a newer one.
 *
 * The old fact is marked supersededBy pointing to the new fact's id.
 * The new fact is appended. This creates an immutable audit trail.
 */
export function supersedeFact(
  context: SessionContext,
  oldId: string,
  newFact: Omit<SessionFact, "id" | "usedCount">,
): SessionContext {
  const newId = nextFactId();
  const updatedFacts = context.facts.map((f) =>
    f.id === oldId ? { ...f, supersededBy: newId } : f,
  );
  const addedFact: SessionFact = { ...newFact, id: newId, usedCount: 0 };
  return {
    ...context,
    facts: [...updatedFacts, addedFact],
    lastSyncedAt: newFact.timestamp,
  };
}

/** Mark a fact as used — increments usedCount. */
export function markFactUsed(
  context: SessionContext,
  factId: string,
): SessionContext {
  return {
    ...context,
    facts: context.facts.map((f) =>
      f.id === factId ? { ...f, usedCount: f.usedCount + 1 } : f,
    ),
  };
}

/** Build a compact executive summary of the session context. */
export function buildContextSummary(context: SessionContext): string {
  const active = context.facts.filter((f) => f.supersededBy === undefined);
  const byType = new Map<SessionFactType, number>();
  for (const f of active) {
    byType.set(f.factType, (byType.get(f.factType) ?? 0) + 1);
  }

  const parts: string[] = [`Session ${context.sessionId}:`];
  if (byType.size === 0) {
    parts.push("No facts accumulated yet.");
  } else {
    for (const [type, count] of byType) {
      parts.push(`${count} ${type.toLowerCase().replace(/_/g, " ")} fact${count === 1 ? "" : "s"}`);
    }
  }

  if (context.decisionsThisSession.length > 0) {
    parts.push(`Decisions: ${context.decisionsThisSession.length}`);
  }
  if (context.tasksDispatchedThisSession.length > 0) {
    parts.push(`Dispatched: ${context.tasksDispatchedThisSession.length}`);
  }
  if (context.risksSurfacedThisSession.length > 0) {
    parts.push(`Risks: ${context.risksSurfacedThisSession.length}`);
  }

  return parts.join(" · ");
}

/**
 * Infer owner preferences from the pattern of messages in this session.
 * Preferences are inferred, not stored — they evaporate at session end.
 */
export function extractOwnerPreferences(
  messages: readonly ConversationMessage[],
): readonly string[] {
  const prefs: string[] = [];

  const ownerMessages = messages.filter((m) => m.role === "OWNER");
  if (ownerMessages.length === 0) return prefs;

  // Infer brevity preference from message length
  const avgLen =
    ownerMessages.reduce((s, m) => s + m.content.length, 0) / ownerMessages.length;
  if (avgLen < 30) prefs.push("Prefers terse exchanges");

  // Infer preference for morning briefings
  const hasMorningIntent = messages.some(
    (m) => m.intent === "today" || m.content.toLowerCase().includes("morning"),
  );
  if (hasMorningIntent) prefs.push("Reviews morning briefings");

  // Infer dispatch orientation
  const hasDispatches = messages.some((m) => m.dispatchPlan !== undefined);
  if (hasDispatches) prefs.push("Uses Jarvis for task dispatch");

  return prefs;
}

/**
 * Build a session handoff ScribeEntry for the vault.
 *
 * This is the compact record that allows the next session to pick up
 * where this one left off — decisions made, tasks dispatched, risks noted.
 */
export function buildSessionHandoff(context: SessionContext): ScribeEntry {
  const lines: string[] = [];

  const decisions = context.decisionsThisSession;
  const tasks = context.tasksDispatchedThisSession;
  const risks = context.risksSurfacedThisSession;
  const openLoops = context.openLoops;

  if (decisions.length > 0) {
    lines.push(`DECISIONS (${decisions.length}): ${decisions.join("; ")}`);
  }
  if (tasks.length > 0) {
    lines.push(`DISPATCHED (${tasks.length}): ${tasks.join("; ")}`);
  }
  if (risks.length > 0) {
    lines.push(`RISKS (${risks.length}): ${risks.join("; ")}`);
  }
  if (openLoops.length > 0) {
    lines.push(`OPEN (${openLoops.length}): ${openLoops.join("; ")}`);
  }
  if (lines.length === 0) {
    lines.push("No significant events this session.");
  }

  const today = new Date().toISOString().slice(0, 10);

  return {
    id: `handoff_${context.sessionId}`,
    type: "HANDOFF",
    title: `Session handoff — ${context.sessionId}`,
    body: lines.join("\n"),
    createdAt: context.lastSyncedAt,
    sourceSessionId: context.sessionId,
    tags: ["handoff", "session", today],
    vaultPath: `01-daily/${today}.md`,
  };
}
