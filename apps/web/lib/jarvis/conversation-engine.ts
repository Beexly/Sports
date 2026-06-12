/**
 * Jarvis conversation engine — Layer A of Executive Intelligence v2.
 *
 * Pure functions only: no model calls, no network, no state. Intent is
 * pattern-matched; answers come from askJarvis() over the live
 * OwnerSummary, task requests become DispatchPlans (PROPOSED, never
 * executed). Executive register throughout: concise, sourced,
 * prioritized, and honest when the answer isn't known.
 */

import {
  askJarvis,
  JARVIS_QUESTIONS,
  type JarvisIntent,
} from "@/lib/cockpit/ask-jarvis";
import type { OwnerSummary } from "@/lib/cockpit/owner-summary";
import { planDispatch, type DispatchPlan, type TaskCategory } from "./task-dispatch";
import { nextScribeId, type ScribeEntry } from "./scribe-types";

export type ConversationRole = "OWNER" | "JARVIS";
export type MessagePriority = "ROUTINE" | "ATTENTION_REQUIRED" | "URGENT" | "CRITICAL";

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

export interface DetectedIntent {
  readonly intent: string | null;
  readonly confidence: "HIGH" | "MEDIUM" | "LOW";
  readonly taskCategory?: TaskCategory;
}

// ─── Intent detection ─────────────────────────────────────────────────────────

/** Ordered: first match wins. Task patterns before question patterns. */
const TASK_PATTERNS: ReadonlyArray<readonly [RegExp, TaskCategory]> = [
  [/\b(run|start)\b.*\b(today|tonight|overnight|the day|daily loop)\b/i, "OVERNIGHT_LOOP"],
  [/\bovernight loop\b/i, "OVERNIGHT_LOOP"],
  [/\bfix\b/i, "FIX"],
  [/\b(build|create|add|ship)\b/i, "BUILD"],
  [/\b(investigate|diagnose|dig into|look into|check why)\b/i, "INVESTIGATE"],
  [/\b(draft|write).*(post|content|brief|article)\b/i, "CONTENT"],
  [/\b(refresh|ingest|pull).*(data|odds|lines)\b/i, "DATA_REFRESH"],
  [/\bsettle\b/i, "SETTLEMENT"],
  [/\breview\b/i, "REVIEW"],
];

const INTENT_PATTERNS: ReadonlyArray<readonly [RegExp, JarvisIntent]> = [
  [/\bwhat needs (me|my decision|my approval)\b/i, "decisions"],
  [/\b(decisions?|approve|approvals?) (pending|queue|waiting)\b/i, "decisions"],
  [/\bhow are we doing\b/i, "today"],
  [/\bwhat('s| is| has) (blocked|stuck)\b/i, "blocked"],
  [/\bstatus\b/i, "today"],
  [/\bwhat changed\b/i, "today"],
  [/\b(launch|go.?live).*(ready|status)\b/i, "launch-ready"],
  [/\bare we (launch.?)?ready\b/i, "launch-ready"],
  [/\bpicks?\b/i, "picks"],
  [/\bperformance|win.?rate|track record\b/i, "performance"],
  [/\bworkers?\b/i, "workers"],
  [/\bmeeting\b/i, "meeting"],
  [/\bai.?ops|claude|token (spend|usage)\b/i, "ai-ops"],
  [/\bwhat is jarvis\b/i, "what-is-jarvis"],
  [/\bwhat('s| is) (actually )?wired\b/i, "what-is-wired"],
  [/\bnot wired\b/i, "what-is-not-wired"],
  [/\bwhat can run\b/i, "what-can-run"],
  [/\bwh(o|ich agent) owns\b/i, "which-agent-owns-this"],
  [/\bneeds? (my )?approval\b/i, "what-needs-approval"],
  [/\bbuild next\b/i, "what-should-we-build-next"],
  [/\bmemory\b/i, "what-is-memory-status"],
];

export function detectIntent(input: string): DetectedIntent {
  const text = input.trim();
  if (!text) return { intent: null, confidence: "LOW" };

  for (const [re, category] of TASK_PATTERNS) {
    if (re.test(text)) {
      return { intent: category, confidence: "HIGH", taskCategory: category };
    }
  }
  for (const [re, intent] of INTENT_PATTERNS) {
    if (re.test(text)) return { intent, confidence: "HIGH" };
  }
  return { intent: "general-inquiry", confidence: "LOW" };
}

// ─── Response construction ────────────────────────────────────────────────────

let messageSeq = 0;

function nextMessageId(nowIso: string): string {
  messageSeq += 1;
  return `msg-${nowIso.slice(0, 10)}-${messageSeq}`;
}

function priorityFromSummary(summary: OwnerSummary): MessagePriority {
  if (summary.criticalWarnings.length > 0) return "CRITICAL";
  if (summary.decisions.some((d) => d.urgency === "CRITICAL")) return "URGENT";
  if (summary.decisions.length > 0) return "ATTENTION_REQUIRED";
  return "ROUTINE";
}

const KNOWN_INTENTS = new Set<string>(Object.keys(JARVIS_QUESTIONS));

export function buildJarvisResponse(
  input: string,
  session: ConversationSession,
  summary: OwnerSummary,
  nowIso: string = new Date().toISOString()
): ConversationMessage {
  const detected = detectIntent(input);
  const base = {
    id: nextMessageId(nowIso),
    role: "JARVIS" as const,
    timestamp: nowIso,
    intent: detected.intent ?? undefined,
  };

  // Task request → dispatch plan, never execution.
  if (detected.taskCategory) {
    const plan = planDispatch(input, detected.taskCategory, nowIso);
    const verb = plan.requiresApproval ? "Awaiting your approval" : "Proceeding read-only";
    return {
      ...base,
      content:
        `Routed to ${plan.assignedAgentName} (${plan.category}). ` +
        `${plan.steps.length} steps prepared, risk ${plan.riskLevel}. ${verb}.`,
      priority: plan.riskLevel === "HIGH" ? "ATTENTION_REQUIRED" : "ROUTINE",
      actionItems: plan.requiresApproval ? [`Approve or decline: ${plan.id}`] : [],
      dispatchPlan: plan,
      requiresApproval: plan.requiresApproval,
      confidence: "HIGH",
    };
  }

  // Known question → deterministic answer from OwnerSummary.
  if (detected.intent && KNOWN_INTENTS.has(detected.intent)) {
    const answer = askJarvis(detected.intent as JarvisIntent, summary);
    const lines = [answer.answer];
    if (answer.caveat) lines.push(`Caveat: ${answer.caveat}`);
    if (answer.nextAction) lines.push(`Next: ${answer.nextAction}`);
    return {
      ...base,
      content: lines.join(" "),
      priority: priorityFromSummary(summary),
      actionItems: answer.nextAction ? [answer.nextAction] : [],
      requiresApproval: false,
      confidence: answer.confidence,
    };
  }

  // Honest fallback — never invent.
  return {
    ...base,
    intent: "general-inquiry",
    content:
      "I don't have a sourced answer for that. I answer from the live OwnerSummary, " +
      "the capability registry, and the agent council — ask about picks, performance, " +
      "blockers, decisions, or say a task (\"run today\", \"fix X\") and I'll route it.",
    priority: "ROUTINE",
    actionItems: [],
    requiresApproval: false,
    confidence: "LOW",
  };
}

// ─── Session-level synthesis ──────────────────────────────────────────────────

export function buildExecutiveBriefing(
  session: ConversationSession,
  summary: OwnerSummary
): string {
  const dispatches = session.messages.filter((m) => m.dispatchPlan).length;
  const approvals = session.messages.filter((m) => m.requiresApproval).length;
  const exchanges = session.messages.filter((m) => m.role === "OWNER").length;
  return [
    `Session ${session.sessionId}: ${exchanges} owner exchanges, ` +
      `${dispatches} dispatch plans prepared, ${approvals} awaiting approval.`,
    `Platform at close: ${summary.overallColor} — ${summary.oneLiner}`,
    summary.decisions.length > 0
      ? `Open owner decisions: ${summary.decisions.length} (highest: ${summary.decisions[0]?.urgency ?? "NORMAL"}).`
      : "No owner decisions pending.",
  ].join("\n");
}

export function shouldScribeMessage(message: ConversationMessage): boolean {
  if (message.dispatchPlan) return true;
  if (message.requiresApproval) return true;
  if (message.priority === "CRITICAL" || message.priority === "URGENT") return true;
  return false;
}

export function buildSessionScribe(
  session: ConversationSession,
  summary: OwnerSummary,
  nowIso: string
): ScribeEntry {
  return {
    id: nextScribeId("HANDOFF", nowIso),
    type: "HANDOFF",
    title: `Session handoff — ${nowIso.slice(0, 10)}`,
    body: buildExecutiveBriefing(session, summary),
    vaultPath: `06-memory/${nowIso.slice(0, 10)}-session-handoff.md`,
    createdAt: nowIso,
    tags: ["session", "handoff"],
  };
}
