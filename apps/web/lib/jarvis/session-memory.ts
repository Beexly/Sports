/**
 * Jarvis session memory — Layer B of Executive Intelligence v2.
 *
 * Within a session, a known fact is never re-derived: lookups hit the
 * fact store first, and addFact() refuses exact duplicates (returns the
 * existing context with the original fact's usedCount bumped instead).
 * Pure and immutable — every mutation returns a new context.
 */

import type { ConversationMessage } from "./conversation-engine";
import { nextScribeId, type ScribeEntry } from "./scribe-types";

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
  readonly derivedFrom: string;
  readonly confidence: "HIGH" | "MEDIUM" | "LOW";
  readonly timestamp: string;
  readonly usedCount: number;
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

export function createSessionContext(sessionId: string, startedAt: string): SessionContext {
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

let factSeq = 0;

/**
 * Add a fact. If an identical live fact (same type + content) exists, the
 * store is NOT duplicated — the existing fact's usedCount increments,
 * which is the "never re-derive" invariant in code.
 */
export function addFact(
  context: SessionContext,
  fact: Omit<SessionFact, "id" | "usedCount">
): SessionContext {
  const existing = context.facts.find(
    (f) => !f.supersededBy && f.factType === fact.factType && f.content === fact.content
  );
  if (existing) {
    return {
      ...context,
      facts: context.facts.map((f) =>
        f.id === existing.id ? { ...f, usedCount: f.usedCount + 1 } : f
      ),
      lastSyncedAt: fact.timestamp,
    };
  }
  factSeq += 1;
  const stored: SessionFact = { ...fact, id: `fact-${factSeq}`, usedCount: 0 };
  return { ...context, facts: [...context.facts, stored], lastSyncedAt: fact.timestamp };
}

/** Live (non-superseded) facts of a type, most recent first. */
export function lookupFact(
  context: SessionContext,
  factType: SessionFactType
): readonly SessionFact[] {
  return context.facts
    .filter((f) => f.factType === factType && !f.supersededBy)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function supersedeFact(
  context: SessionContext,
  oldId: string,
  newFact: Omit<SessionFact, "id" | "usedCount">
): SessionContext {
  const withNew = addFact(context, newFact);
  const newest = withNew.facts[withNew.facts.length - 1];
  if (!newest) return withNew;
  return {
    ...withNew,
    facts: withNew.facts.map((f) =>
      f.id === oldId ? { ...f, supersededBy: newest.id } : f
    ),
  };
}

export function buildContextSummary(context: SessionContext): string {
  const live = context.facts.filter((f) => !f.supersededBy);
  return [
    `${live.length} facts on hand (${context.facts.length - live.length} superseded).`,
    `Dispatched: ${context.tasksDispatchedThisSession.length} · ` +
      `Decisions: ${context.decisionsThisSession.length} · ` +
      `Risks surfaced: ${context.risksSurfacedThisSession.length}.`,
    context.openLoops.length > 0
      ? `Open loops: ${context.openLoops.join("; ")}`
      : "No open loops.",
  ].join("\n");
}

/** Owner preferences inferred from phrasing — explicit signals only. */
export function extractOwnerPreferences(
  messages: readonly ConversationMessage[]
): readonly string[] {
  const prefs: string[] = [];
  const ownerText = messages
    .filter((m) => m.role === "OWNER")
    .map((m) => m.content.toLowerCase())
    .join(" ");
  if (/\b(short|concise|brief|tldr|one.?liner)\b/.test(ownerText)) {
    prefs.push("Prefers maximum brevity — lead with the verdict.");
  }
  if (/\b(don'?t ask|just (do|work)|autonomous)\b/.test(ownerText)) {
    prefs.push("Prefers autonomous execution over check-ins.");
  }
  if (/\b(token|budget|sparing|frugal)\b/.test(ownerText)) {
    prefs.push("Token-frugal: minimize exploratory spend.");
  }
  return prefs;
}

export function buildSessionHandoff(context: SessionContext): ScribeEntry {
  const nowIso = context.lastSyncedAt;
  return {
    id: nextScribeId("HANDOFF", nowIso),
    type: "HANDOFF",
    title: `Session ${context.sessionId} handoff`,
    body: buildContextSummary(context),
    vaultPath: `06-memory/${nowIso.slice(0, 10)}-${context.sessionId}-handoff.md`,
    createdAt: nowIso,
    tags: ["handoff", context.sessionId],
  };
}
