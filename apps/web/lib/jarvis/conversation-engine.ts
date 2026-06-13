/**
 * Jarvis Conversation Engine — Layer A
 *
 * Core of "I want to talk to Jarvis." Jarvis holds a conversation with the
 * owner in an executive register. He speaks like a 20-year COO: concise,
 * sourced, prioritized, actionable. Never chatbot small talk.
 *
 * Trust rules:
 *   - Every claim is derived from OwnerSummary or static registries.
 *   - detectIntent uses pattern matching only — no model calls.
 *   - buildJarvisResponse never invents stats not present in the summary.
 *   - requiresApproval is true whenever a response triggers an action.
 *   - DispatchPlan.requiresApproval is always true — literal type.
 */

import { askJarvis, type JarvisIntent } from "../cockpit/ask-jarvis";
import type { OwnerSummary } from "../cockpit/owner-summary";
import type { JarvisIntelligenceState } from "./intelligence-state";
import { ROUTING_RULES, type TaskType } from "./routing-rules";
import type { ScribeEntry } from "./scribe-types";

// ─── Re-export for consumers ──────────────────────────────────────────────────

/** Alias — the OS state passed throughout the conversation engine. */
export type JarvisOSState = JarvisIntelligenceState;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConversationRole = "OWNER" | "JARVIS";
export type MessagePriority = "ROUTINE" | "ATTENTION_REQUIRED" | "URGENT" | "CRITICAL";

export type TaskCategory =
  | "OVERNIGHT_LOOP"  // "run today", "run the loop"
  | "FIX"             // "fix [X]"
  | "CHECK"           // "check [X]"
  | "BUILD"           // "build [X]"
  | "DISPATCH"        // explicit dispatch
  | "GENERAL_INQUIRY";

export interface DispatchPlan {
  readonly category: TaskCategory;
  readonly description: string;
  /** Ordered routing sequence from council routing rules. */
  readonly sequence: readonly string[];
  /** Always true — no dispatch executes without owner approval. */
  readonly requiresApproval: true;
  readonly estimatedImpact: "LOW" | "MEDIUM" | "HIGH";
  /** Prepared prompt the owner can hand to the appropriate agent. */
  readonly preparedPrompt?: string;
  /** Which routing rule this maps to, if any. */
  readonly routingRuleType?: TaskType;
}

export interface ConversationMessage {
  readonly id: string;
  readonly role: ConversationRole;
  readonly content: string;
  readonly timestamp: string;
  readonly intent?: string;
  readonly priority: MessagePriority;
  readonly actionItems: readonly string[];
  readonly scribeEntry?: ScribeEntry;
  readonly dispatchPlan?: DispatchPlan;
  readonly requiresApproval: boolean;
  readonly confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface ConversationSession {
  readonly sessionId: string;
  readonly startedAt: string;
  readonly messages: readonly ConversationMessage[];
  readonly openActionItems: readonly string[];
  readonly ownerDecisionsPending: number;
  readonly sessionSummary?: string;
  readonly scribedAt?: string;
}

// ─── Intent detection ─────────────────────────────────────────────────────────

/** Map of pattern regex → detected intent or task category. */
const INTENT_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  intent: JarvisIntent | null;
  taskCategory?: TaskCategory;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}> = [
  // Task requests
  { pattern: /\brun\s+today\b/i, intent: null, taskCategory: "OVERNIGHT_LOOP", confidence: "HIGH" },
  { pattern: /\brun\s+(the\s+)?loop\b/i, intent: null, taskCategory: "OVERNIGHT_LOOP", confidence: "HIGH" },
  { pattern: /\bdispatch\s+overnight\b/i, intent: null, taskCategory: "OVERNIGHT_LOOP", confidence: "HIGH" },
  { pattern: /\bfix\s+\w+/i, intent: null, taskCategory: "FIX", confidence: "HIGH" },
  { pattern: /\bcheck\s+\w+/i, intent: null, taskCategory: "CHECK", confidence: "HIGH" },
  { pattern: /\bbuild\s+\w+/i, intent: null, taskCategory: "BUILD", confidence: "HIGH" },
  { pattern: /\bdispatch\b/i, intent: null, taskCategory: "DISPATCH", confidence: "MEDIUM" },

  // Operational intents
  { pattern: /\bwhat\s+needs\s+me\b/i, intent: "decisions", taskCategory: undefined, confidence: "HIGH" },
  { pattern: /\bwhat\s+needs\s+(my\s+)?decision\b/i, intent: "decisions", taskCategory: undefined, confidence: "HIGH" },
  { pattern: /\bwhat'?s\s+blocked\b/i, intent: "blocked", taskCategory: undefined, confidence: "HIGH" },
  { pattern: /\bwhat\s+is\s+blocked\b/i, intent: "blocked", taskCategory: undefined, confidence: "HIGH" },
  { pattern: /\b(how\s+are\s+we\s+doing|overall\s+status|status\s+check|system\s+status)\b/i, intent: "today", taskCategory: undefined, confidence: "HIGH" },
  { pattern: /\bmorning\s+briefing\b/i, intent: "today", taskCategory: undefined, confidence: "HIGH" },
  { pattern: /\bwhat\s+(changed|happened)\s+today\b/i, intent: "today", taskCategory: undefined, confidence: "HIGH" },
  { pattern: /\b(status|update)\b/i, intent: "today", taskCategory: undefined, confidence: "MEDIUM" },
  { pattern: /\bpicks\b/i, intent: "picks", taskCategory: undefined, confidence: "MEDIUM" },
  { pattern: /\blaunch[\s-]?ready\b/i, intent: "launch-ready", taskCategory: undefined, confidence: "HIGH" },
  { pattern: /\b(performance|win\s*rate)\b/i, intent: "performance", taskCategory: undefined, confidence: "MEDIUM" },
  { pattern: /\bworkers?\b/i, intent: "workers", taskCategory: undefined, confidence: "MEDIUM" },
  { pattern: /\b(meeting|brief\s+me)\b/i, intent: "meeting", taskCategory: undefined, confidence: "MEDIUM" },
  { pattern: /\bai[\s-]?ops\b/i, intent: "ai-ops", taskCategory: undefined, confidence: "HIGH" },

  // Architecture intents
  { pattern: /\bwhat\s+is\s+jarvis\b/i, intent: "what-is-jarvis", taskCategory: undefined, confidence: "HIGH" },
  { pattern: /\bwhat('?s|\s+is)\s+wired\b/i, intent: "what-is-wired", taskCategory: undefined, confidence: "HIGH" },
  { pattern: /\bwhat('?s|\s+is)(\s+not)?\s+not\s+wired\b/i, intent: "what-is-not-wired", taskCategory: undefined, confidence: "HIGH" },
  { pattern: /\bwhat\s+can\s+(run|we\s+do)\b/i, intent: "what-can-run", taskCategory: undefined, confidence: "HIGH" },
  { pattern: /\bwhich\s+agent\b/i, intent: "which-agent-owns-this", taskCategory: undefined, confidence: "HIGH" },
  { pattern: /\bwhat\s+needs\s+approval\b/i, intent: "what-needs-approval", taskCategory: undefined, confidence: "HIGH" },
  { pattern: /\bwhat\s+should\s+we\s+build\b/i, intent: "what-should-we-build-next", taskCategory: undefined, confidence: "HIGH" },
  { pattern: /\bmemory\s+status\b/i, intent: "what-is-memory-status", taskCategory: undefined, confidence: "HIGH" },
];

export function detectIntent(input: string): {
  intent: JarvisIntent | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  taskCategory?: TaskCategory;
} {
  const normalized = input.trim().toLowerCase();

  for (const { pattern, intent, taskCategory, confidence } of INTENT_PATTERNS) {
    if (pattern.test(normalized)) {
      return { intent, confidence, taskCategory };
    }
  }

  return { intent: null, confidence: "LOW", taskCategory: "GENERAL_INQUIRY" };
}

// ─── Dispatch plan builder ─────────────────────────────────────────────────────

function buildDispatchPlan(
  input: string,
  category: TaskCategory,
): DispatchPlan {
  // Map task categories to routing rule types where applicable.
  const categoryToRuleMap: Partial<Record<TaskCategory, TaskType>> = {
    FIX: "data-incident",
    BUILD: "stat-rd",
    CHECK: "pick-research",
    OVERNIGHT_LOOP: "pick-research",
  };

  const ruleType = categoryToRuleMap[category];
  const rule = ruleType ? ROUTING_RULES.find((r) => r.taskType === ruleType) : undefined;
  const sequence = rule ? rule.sequence.map((s) => s.seat) : ["JARVIS", "Owner"];

  const descMap: Record<TaskCategory, string> = {
    OVERNIGHT_LOOP: "Run today's overnight intelligence loop: ingest, score, review, queue content.",
    FIX: `Investigate and fix: ${input}`,
    CHECK: `Check and report on: ${input}`,
    BUILD: `Plan and implement: ${input}`,
    DISPATCH: `Dispatch task: ${input}`,
    GENERAL_INQUIRY: `Handle request: ${input}`,
  };

  const impactMap: Record<TaskCategory, "LOW" | "MEDIUM" | "HIGH"> = {
    OVERNIGHT_LOOP: "HIGH",
    FIX: "MEDIUM",
    CHECK: "LOW",
    BUILD: "HIGH",
    DISPATCH: "MEDIUM",
    GENERAL_INQUIRY: "LOW",
  };

  const promptMap: Record<TaskCategory, string> = {
    OVERNIGHT_LOOP:
      "Run the overnight intelligence loop: (1) trigger ingestion worker, " +
      "(2) run scoring pipeline, (3) review output for safety, (4) queue content drafts. " +
      "Do not publish without owner approval.",
    FIX: `Investigate the issue: "${input}". Provide root cause analysis and proposed fix for owner review.`,
    CHECK: `Check the current state of: "${input}". Report back with facts, sources, and any action items.`,
    BUILD: `Draft an implementation plan for: "${input}". Include scope, steps, and approval gates.`,
    DISPATCH: `Dispatch to the appropriate agent: "${input}". Route per council rules and await approval.`,
    GENERAL_INQUIRY: `Research and respond to: "${input}".`,
  };

  return {
    category,
    description: descMap[category],
    sequence,
    requiresApproval: true,
    estimatedImpact: impactMap[category],
    preparedPrompt: promptMap[category],
    routingRuleType: ruleType,
  };
}

// ─── Response builders ────────────────────────────────────────────────────────

function priorityFromSummary(summary: OwnerSummary): MessagePriority {
  if (summary.criticalWarnings.length > 0) return "CRITICAL";
  if (summary.overallColor === "RED") return "URGENT";
  if (summary.overallColor === "AMBER") return "ATTENTION_REQUIRED";
  return "ROUTINE";
}

function buildGenericResponse(
  input: string,
  summary: OwnerSummary,
): { content: string; priority: MessagePriority; actionItems: readonly string[] } {
  const priority = priorityFromSummary(summary);

  const content =
    `Platform is ${summary.overallColor} (source: OwnerSummary, assessed ${summary.assessedAt.slice(0, 10)}). ` +
    `${summary.oneLiner} ` +
    (summary.decisions.length > 0
      ? `${summary.decisions.length} item${summary.decisions.length === 1 ? "" : "s"} awaiting your decision.`
      : "No decisions pending.");

  const actionItems: string[] = [];
  if (summary.criticalWarnings.length > 0) {
    actionItems.push(`Address ${summary.criticalWarnings.length} critical warning(s): ${summary.criticalWarnings[0]}`);
  }
  if (summary.decisions.length > 0) {
    actionItems.push(`Review decision queue: ${summary.decisions[0]?.description}`);
  }

  return { content, priority, actionItems };
}

// ─── Main response builder ─────────────────────────────────────────────────────

let _messageCounter = 0;
function nextMessageId(): string {
  return `msg_${Date.now()}_${++_messageCounter}`;
}

/**
 * Build Jarvis's executive-register response to owner input.
 *
 * Rules:
 *   - detectIntent first; route to askJarvis if known JarvisIntent.
 *   - Task requests (run/fix/check/build) produce a DispatchPlan.
 *   - All claims sourced from OwnerSummary or static registries.
 *   - requiresApproval whenever a DispatchPlan is present.
 *   - Response is always concise (3 sentences max for status).
 */
export function buildJarvisResponse(
  input: string,
  session: ConversationSession,
  summary: OwnerSummary,
  _osState: JarvisOSState,
): ConversationMessage {
  const timestamp = new Date().toISOString();
  const id = nextMessageId();
  const { intent, confidence, taskCategory } = detectIntent(input);

  // Task request path — produces a DispatchPlan
  if (taskCategory && taskCategory !== "GENERAL_INQUIRY" && intent === null) {
    const plan = buildDispatchPlan(input, taskCategory);
    const priority: MessagePriority =
      taskCategory === "OVERNIGHT_LOOP" ? "ATTENTION_REQUIRED" : "ROUTINE";

    const content =
      `Prepared a ${taskCategory === "OVERNIGHT_LOOP" ? "full overnight loop" : taskCategory.toLowerCase()} plan. ` +
      `Routing: ${plan.sequence.join(" → ")}. ` +
      `This requires your approval before any action is taken.`;

    return {
      id,
      role: "JARVIS",
      content,
      timestamp,
      intent: taskCategory,
      priority,
      actionItems: [`Approve or reject dispatch plan: ${plan.description}`],
      dispatchPlan: plan,
      requiresApproval: true,
      confidence,
    };
  }

  // Known JarvisIntent path — answer from OwnerSummary
  if (intent !== null) {
    const answer = askJarvis(intent, summary);
    const priority = priorityFromSummary(summary);

    const actionItems: string[] = [];
    if (answer.nextAction) actionItems.push(answer.nextAction);

    // Critical warnings surface as top action items
    if (summary.criticalWarnings.length > 0 && intent === "today") {
      summary.criticalWarnings.slice(0, 2).forEach((w) => actionItems.unshift(`CRITICAL: ${w}`));
    }

    const requiresApproval =
      answer.intent === "what-needs-approval" ||
      answer.intent === "decisions" ||
      (answer.nextAction?.toLowerCase().includes("approve") ?? false);

    return {
      id,
      role: "JARVIS",
      content: answer.answer,
      timestamp,
      intent: answer.intent,
      priority,
      actionItems,
      requiresApproval,
      confidence: answer.confidence,
    };
  }

  // General inquiry — synthesize from summary
  const { content, priority, actionItems } = buildGenericResponse(input, summary);

  return {
    id,
    role: "JARVIS",
    content,
    timestamp,
    intent: "general-inquiry",
    priority,
    actionItems,
    requiresApproval: false,
    confidence: "MEDIUM",
  };
}

// ─── Session builders ──────────────────────────────────────────────────────────

/** Build a board-room-quality session summary. */
export function buildExecutiveBriefing(
  session: ConversationSession,
  summary: OwnerSummary,
): string {
  const messageCount = session.messages.filter((m) => m.role === "JARVIS").length;
  const dispatched = session.messages.filter((m) => m.dispatchPlan !== undefined).length;
  const decisions = session.ownerDecisionsPending;
  const criticals = summary.criticalWarnings.length;

  const lines: string[] = [
    `Session ${session.sessionId} — ${new Date(session.startedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.`,
    `${messageCount} exchange${messageCount === 1 ? "" : "s"}. Platform ${summary.overallColor} (${summary.oneLiner}).`,
  ];

  if (dispatched > 0) lines.push(`${dispatched} dispatch plan${dispatched === 1 ? "" : "s"} prepared, all pending approval.`);
  if (decisions > 0) lines.push(`${decisions} owner decision${decisions === 1 ? "" : "s"} remain open.`);
  if (criticals > 0) lines.push(`${criticals} critical warning${criticals === 1 ? "" : "s"} active — require owner review.`);
  if (session.openActionItems.length > 0) {
    lines.push(`Open actions: ${session.openActionItems.slice(0, 3).join("; ")}`);
  }

  return lines.join(" ");
}

/** Returns true if this message warrants scribing to institutional memory. */
export function shouldScribeMessage(message: ConversationMessage): boolean {
  if (message.priority === "CRITICAL" || message.priority === "URGENT") return true;
  if (message.dispatchPlan !== undefined) return true;
  if (message.requiresApproval) return true;
  if (
    message.intent === "decisions" ||
    message.intent === "what-needs-approval"
  ) return true;
  return false;
}

/** Build a new empty session. */
export function createSession(sessionId: string): ConversationSession {
  return {
    sessionId,
    startedAt: new Date().toISOString(),
    messages: [],
    openActionItems: [],
    ownerDecisionsPending: 0,
  };
}

/** Append a message to a session, updating open action items and decision count. */
export function appendMessage(
  session: ConversationSession,
  message: ConversationMessage,
): ConversationSession {
  const newOpenItems = [
    ...session.openActionItems,
    ...message.actionItems,
  ];

  const newDecisionCount =
    message.requiresApproval
      ? session.ownerDecisionsPending + 1
      : session.ownerDecisionsPending;

  return {
    ...session,
    messages: [...session.messages, message],
    openActionItems: newOpenItems,
    ownerDecisionsPending: newDecisionCount,
  };
}
