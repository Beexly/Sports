/**
 * Ask Jarvis — deterministic question answering from OwnerSummary state.
 *
 * Pure function. No model call. No fabrication. Every answer is derived
 * entirely from the OwnerSummary produced by buildOwnerSummary().
 *
 * Rules:
 *   - Never invent performance stats not present in the summary.
 *   - Never claim 70% is achieved unless performance.displaySafe is true.
 *   - Never describe agents as autonomous.
 *   - When data is unavailable, the answer says so.
 *   - confidence is LOW when key facts are UNKNOWN or missing.
 */

import type { OwnerSummary } from "./owner-summary";
import {
  CAPABILITY_REGISTRY,
  computeWiringScore,
  getWiringLabel,
  type JarvisCapability,
} from "../jarvis/capability-registry";
import { AGENT_COUNCIL, getCouncilSeatCounts } from "../jarvis/agent-council";
import { buildMemoryStatus, getOperatingLoop } from "../jarvis/intelligence-state";
import { buildJarvisMemoryStatus } from "../jarvis/memory-protocol";
import { buildScribeProtocolForAgent } from "../jarvis/scribe";
import { buildToolRouterStatus, getWiredTools } from "../jarvis/tool-router";
import { buildVoiceProtocolStatus } from "../jarvis/voice-protocol";
import {
  PROMPT_LIBRARY,
  getPromptsByType,
  suggestNextPrompt,
} from "../jarvis/prompt-library";
import { buildImprovementLoopStatus } from "../jarvis/improvement-loop";
import { buildAuditLedgerStatus } from "../jarvis/audit-ledger";
import { buildJarvisOSState } from "../jarvis/os-state";
import {
  BOT_REGISTRY,
  buildBotRegistrySummary,
  getBotsThatCanDispatch,
} from "../jarvis/bot-registry";
import {
  getAllAvailableTaskCategories,
  getAgentForCategory,
  getPromptForCategory,
  getToolsForCategory,
  getRecommendedBotForCategory,
  buildOvernightLoopPlan,
} from "../jarvis/task-dispatch";

// ─── Types ────────────────────────────────────────────────────────────────────

export type JarvisIntent =
  | "picks"
  | "launch-ready"
  | "performance"
  | "blocked"
  | "decisions"
  | "today"
  | "workers"
  | "meeting"
  | "ai-ops"
  | "what-is-jarvis"
  | "what-is-wired"
  | "what-is-not-wired"
  | "what-can-run"
  | "which-agent-owns-this"
  | "what-needs-approval"
  | "what-should-we-build-next"
  | "what-is-ai-ops-status"
  | "what-is-memory-status"
  | "what-do-you-remember"
  | "what-is-in-scribe"
  | "what-are-agents-doing"
  | "prepare-next-prompt"
  | "what-tools-are-wired"
  | "can-you-talk"
  | "can-you-act"
  | "what-did-we-decide"
  | "what-should-run-overnight"
  | "summarize-galaxy"
  | "summarize-airwave"
  | "what-is-blocked-os"
  | "how-do-we-improve"
  | "dispatch-task"
  | "what-bots-are-wired"
  | "run-overnight-loop"
  | "what-can-jarvis-run";

export const JARVIS_QUESTIONS: Readonly<Record<JarvisIntent, string>> = {
  "picks": "Where are our picks?",
  "launch-ready": "Are we launch-ready?",
  "performance": "Can we show performance?",
  "blocked": "What is blocked?",
  "decisions": "What needs my decision?",
  "today": "What changed today?",
  "workers": "What are workers doing?",
  "meeting": "What should I know before a meeting?",
  "ai-ops": "What is our AI Ops / Claude / Codex status?",
  "what-is-jarvis": "What is Jarvis?",
  "what-is-wired": "What is actually wired?",
  "what-is-not-wired": "What is not wired yet?",
  "what-can-run": "What can run today?",
  "which-agent-owns-this": "Which agent owns what?",
  "what-needs-approval": "What needs my approval?",
  "what-should-we-build-next": "What should we build next?",
  "what-is-ai-ops-status": "What is the AI Ops posture?",
  "what-is-memory-status": "What is Jarvis memory status?",
  "what-do-you-remember": "What do you remember?",
  "what-is-in-scribe": "What is in the scribe?",
  "what-are-agents-doing": "What are the agents doing?",
  "prepare-next-prompt": "What should the next prompt be?",
  "what-tools-are-wired": "What tools are wired?",
  "can-you-talk": "Can you talk?",
  "can-you-act": "Can you act on your own?",
  "what-did-we-decide": "What did we decide?",
  "what-should-run-overnight": "What should run overnight?",
  "summarize-galaxy": "How is the galaxy doing?",
  "summarize-airwave": "How is Airwave doing?",
  "what-is-blocked-os": "What is blocked across the OS?",
  "how-do-we-improve": "How do we improve?",
  "dispatch-task": "How do I dispatch a task through Jarvis?",
  "what-bots-are-wired": "What bots are wired?",
  "run-overnight-loop": "What would the overnight loop run?",
  "what-can-jarvis-run": "What can Jarvis run?",
};

export const JARVIS_INTENT_ORDER: readonly JarvisIntent[] = [
  "picks",
  "launch-ready",
  "performance",
  "blocked",
  "decisions",
  "today",
  "workers",
  "meeting",
  "ai-ops",
  "what-is-jarvis",
  "what-is-wired",
  "what-is-not-wired",
  "what-can-run",
  "which-agent-owns-this",
  "what-needs-approval",
  "what-should-we-build-next",
  "what-is-ai-ops-status",
  "what-is-memory-status",
  "what-do-you-remember",
  "what-is-in-scribe",
  "what-are-agents-doing",
  "prepare-next-prompt",
  "what-tools-are-wired",
  "can-you-talk",
  "can-you-act",
  "what-did-we-decide",
  "what-should-run-overnight",
  "summarize-galaxy",
  "summarize-airwave",
  "what-is-blocked-os",
  "how-do-we-improve",
  "dispatch-task",
  "what-bots-are-wired",
  "run-overnight-loop",
  "what-can-jarvis-run",
];

/** OPERATIONS intents answer from the live OwnerSummary; ARCHITECTURE intents
 *  answer from the capability registry, agent council, and memory protocol;
 *  OS_LAYER intents answer from the Jarvis OS layers (scribe, memory, tools,
 *  voice, prompts, actions, audit, improvement). */
export type JarvisIntentGroup = "OPERATIONS" | "ARCHITECTURE" | "OS_LAYER";

export const JARVIS_GROUP_LABELS: Readonly<Record<JarvisIntentGroup, string>> = {
  OPERATIONS: "Operations",
  ARCHITECTURE: "Architecture & System",
  OS_LAYER: "Jarvis OS Layers",
};

export const JARVIS_INTENT_GROUPS: Readonly<
  Record<JarvisIntentGroup, readonly JarvisIntent[]>
> = {
  OPERATIONS: [
    "picks",
    "launch-ready",
    "performance",
    "blocked",
    "decisions",
    "today",
    "workers",
    "meeting",
    "ai-ops",
  ],
  ARCHITECTURE: [
    "what-is-jarvis",
    "what-is-wired",
    "what-is-not-wired",
    "what-can-run",
    "which-agent-owns-this",
    "what-needs-approval",
    "what-should-we-build-next",
    "what-is-ai-ops-status",
    "what-is-memory-status",
  ],
  OS_LAYER: [
    "what-do-you-remember",
    "what-is-in-scribe",
    "what-are-agents-doing",
    "prepare-next-prompt",
    "what-tools-are-wired",
    "can-you-talk",
    "can-you-act",
    "what-did-we-decide",
    "what-should-run-overnight",
    "summarize-galaxy",
    "summarize-airwave",
    "what-is-blocked-os",
    "how-do-we-improve",
    "dispatch-task",
    "what-bots-are-wired",
    "run-overnight-loop",
    "what-can-jarvis-run",
  ],
};

export interface JarvisAnswer {
  readonly intent: JarvisIntent;
  readonly question: string;
  readonly answer: string;
  readonly supportingState: readonly string[];
  readonly confidence: "HIGH" | "MEDIUM" | "LOW";
  readonly caveat: string | null;
  readonly nextAction: string | null;
  /** OS-layer extensions — optional, additive, backward compatible. */
  readonly source?: string;
  readonly phase?: string;
  readonly scribeSuggestion?: string;
  readonly promptSuggestion?: string;
  readonly approvalRequired?: boolean;
}

// ─── Intent handlers ──────────────────────────────────────────────────────────

function answerPicks(summary: OwnerSummary): JarvisAnswer {
  const { picks } = summary;

  let answer: string;
  if (picks.isPublicGateOpen && picks.today > 0) {
    answer = `${picks.today} pick${picks.today === 1 ? "" : "s"} are published and public-facing today.`;
  } else if (picks.isPublicGateOpen && picks.today === 0) {
    answer = "The public picks gate is open but no picks have been published today.";
  } else {
    answer = `Picks are internal only. ${picks.today > 0 ? `${picks.today} pick${picks.today === 1 ? "" : "s"} published internally today. ` : "No picks published today. "}The PUBLIC_PICKS_ENABLED gate is closed.`;
  }

  const supporting = [
    `Today: ${picks.today} pick${picks.today === 1 ? "" : "s"}`,
    `Public gate: ${picks.isPublicGateOpen ? "OPEN" : "CLOSED"}`,
    `Canonical settled: ${picks.canonicalSettled}`,
    `Pending settlement: ${picks.canonicalPending}`,
    `Bootstrap excluded: ${picks.bootstrapExcluded}`,
  ];

  if (picks.blockedReason) {
    supporting.push(`Blocked reason: ${picks.blockedReason}`);
  }

  return {
    intent: "picks",
    question: JARVIS_QUESTIONS["picks"],
    answer,
    supportingState: supporting,
    confidence: picks.isPublicGateOpen ? "HIGH" : "MEDIUM",
    caveat: picks.blockedReason
      ? `Gate is closed: ${picks.blockedReason}. This is intentional.`
      : null,
    nextAction: !picks.isPublicGateOpen
      ? "Set PUBLIC_PICKS_ENABLED=true when data quality and trust gates are satisfied."
      : picks.today === 0
        ? "Run the ingestion and scoring workers to generate today's picks."
        : "Monitor ingestion freshness and settlement health.",
  };
}

function answerLaunchReady(summary: OwnerSummary): JarvisAnswer {
  const color = summary.overallColor;
  const criticals = summary.criticalWarnings.length;
  const decisions = summary.decisions.filter((d) => d.urgency === "CRITICAL").length;

  let answer: string;
  let confidence: JarvisAnswer["confidence"];
  if (color === "GREEN" && criticals === 0) {
    answer = "Yes. Platform is launch-ready. All gates are aligned and no safety warnings are active.";
    confidence = "HIGH";
  } else if (color === "RED") {
    answer = `No. Platform is NOT launch-ready. ${criticals > 0 ? `${criticals} critical warning(s) active.` : "RED-status systems detected."}`;
    confidence = "HIGH";
  } else {
    answer = `Not fully ready. Code is aligned but ${decisions > 0 ? `${decisions} critical item(s) need attention` : "some systems are amber"}.`;
    confidence = "MEDIUM";
  }

  const supporting = [
    `Overall: ${color}`,
    `Jarvis status: ${summary.oneLiner}`,
    `Critical warnings: ${criticals}`,
    `Open decisions: ${summary.decisions.length}`,
  ];

  return {
    intent: "launch-ready",
    question: JARVIS_QUESTIONS["launch-ready"],
    answer,
    supportingState: supporting,
    confidence,
    caveat:
      color !== "GREEN"
        ? "Launch-readiness is derived from readiness gates, ingestion health, settlement health, and safety warnings."
        : null,
    nextAction:
      summary.decisions[0]?.description ??
      "Continue monitoring the daily operator checklist.",
  };
}

function answerPerformance(summary: OwnerSummary): JarvisAnswer {
  const { performance } = summary;

  let answer: string;
  let confidence: JarvisAnswer["confidence"];

  if (performance.displaySafe && performance.actualWinRate !== null) {
    answer = `Yes. Performance stats are public-ready. Current win rate: ${performance.actualWinRate}% vs target ${performance.targetPct}% (${performance.record}, ${performance.canonicalSampleSize} canonical picks).`;
    confidence = "HIGH";
  } else if (!performance.isGateOpen) {
    answer = `No. The PERFORMANCE_STATS_ENABLED gate is closed. Target: ${performance.targetPct}%. Public display is off until the operator opens the gate.`;
    confidence = "HIGH";
  } else if (performance.remainingToThreshold > 0) {
    answer = `Not yet. Target: ${performance.targetPct}%. Gate is open but the canonical sample is too small. ${performance.canonicalSampleSize} of ${performance.minimumRequired} required picks settled. Need ${performance.remainingToThreshold} more.`;
    confidence = "HIGH";
  } else {
    answer = `No. Performance display is gated. Target: ${performance.targetPct}%. Blockers: ${performance.gateBlockers.join(", ")}.`;
    confidence = "MEDIUM";
  }

  const supporting = [
    `Target: ${performance.targetPct}% (internal goal — not a public claim)`,
    `Gate open: ${performance.isGateOpen ? "YES" : "NO"}`,
    `Display safe: ${performance.displaySafe ? "YES" : "NO"}`,
    `Canonical settled: ${performance.canonicalSampleSize} / ${performance.minimumRequired} required`,
    `Bootstrap excluded: always`,
    `Pending excluded: always`,
    ...(performance.actualWinRate !== null
      ? [`Current win rate: ${performance.actualWinRate}%`, `Record: ${performance.record}`]
      : []),
  ];

  return {
    intent: "performance",
    question: JARVIS_QUESTIONS["performance"],
    answer,
    supportingState: supporting,
    confidence,
    caveat:
      "Win rates are never derived from pending or bootstrap picks. The 70% figure is a target, not a claim, unless canonical data and the gate both allow display.",
    nextAction: !performance.isGateOpen
      ? "Set PERFORMANCE_STATS_ENABLED=true after reviewing canonical pick history."
      : performance.remainingToThreshold > 0
        ? `Accumulate ${performance.remainingToThreshold} more canonical settled picks before display threshold.`
        : "Performance is display-ready. Verify before opening gate.",
  };
}

function answerBlocked(summary: OwnerSummary): JarvisAnswer {
  const criticals = summary.decisions.filter((d) => d.urgency === "CRITICAL");
  const highs = summary.decisions.filter((d) => d.urgency === "HIGH");
  const blockedDepts = summary.departments.filter((d) => d.actionRequired);

  let answer: string;
  if (criticals.length === 0 && highs.length === 0 && blockedDepts.length === 0) {
    answer = "Nothing is critically blocked right now. The platform is in a stable state.";
  } else {
    const parts: string[] = [];
    if (criticals.length > 0) parts.push(`${criticals.length} critical safety warning(s)`);
    if (highs.length > 0) parts.push(`${highs.length} missing environment variable(s)`);
    if (blockedDepts.length > 0) parts.push(`${blockedDepts.length} department(s) require action`);
    answer = `Blocked items: ${parts.join(", ")}.`;
  }

  const supporting = [
    ...criticals.map((d) => `[CRITICAL] ${d.description}`),
    ...highs.map((d) => `[HIGH] ${d.description}`),
    ...blockedDepts.map((d) => `[DEPT:${d.name}] ${d.actionDescription ?? d.oneLiner}`),
  ];

  if (supporting.length === 0) supporting.push("No blockers detected.");

  return {
    intent: "blocked",
    question: JARVIS_QUESTIONS["blocked"],
    answer,
    supportingState: supporting,
    confidence: summary.overallColor === "GREEN" ? "HIGH" : "MEDIUM",
    caveat: null,
    nextAction: criticals[0]?.description ?? highs[0]?.description ?? null,
  };
}

function answerDecisions(summary: OwnerSummary): JarvisAnswer {
  const { decisions } = summary;

  let answer: string;
  if (decisions.length === 0) {
    answer = "No owner decisions are queued right now.";
  } else {
    const critical = decisions.filter((d) => d.urgency === "CRITICAL").length;
    const high = decisions.filter((d) => d.urgency === "HIGH").length;
    const normal = decisions.filter((d) => d.urgency === "NORMAL").length;
    const parts: string[] = [];
    if (critical > 0) parts.push(`${critical} critical`);
    if (high > 0) parts.push(`${high} high-priority`);
    if (normal > 0) parts.push(`${normal} normal`);
    answer = `${decisions.length} item${decisions.length === 1 ? "" : "s"} need your attention: ${parts.join(", ")}.`;
  }

  const supporting = decisions.map(
    (d) => `[${d.urgency}] ${d.description}`
  );
  if (supporting.length === 0) supporting.push("Queue is empty.");

  return {
    intent: "decisions",
    question: JARVIS_QUESTIONS["decisions"],
    answer,
    supportingState: supporting,
    confidence: "HIGH",
    caveat: null,
    nextAction: decisions[0]
      ? `Start with: ${decisions[0].description}`
      : "Monitor daily operator checklist.",
  };
}

function answerToday(summary: OwnerSummary): JarvisAnswer {
  const { picks } = summary;

  const supporting = [
    `Picks published today: ${picks.today}`,
    `Canonical settled total: ${picks.canonicalSettled}`,
    `Pending settlement: ${picks.canonicalPending}`,
    `Bootstrap excluded: ${picks.bootstrapExcluded}`,
    `Overall status: ${summary.overallColor}`,
    `Critical warnings: ${summary.criticalWarnings.length}`,
  ];

  return {
    intent: "today",
    question: JARVIS_QUESTIONS["today"],
    answer:
      `Today: ${picks.today} pick${picks.today === 1 ? "" : "s"} published. ` +
      `${picks.canonicalPending} pending settlement. ` +
      `Overall status: ${summary.overallColor}. ` +
      (summary.criticalWarnings.length > 0
        ? `${summary.criticalWarnings.length} safety warning(s) active.`
        : "No safety warnings."),
    supportingState: supporting,
    confidence: picks.today > 0 ? "HIGH" : "MEDIUM",
    caveat:
      "This reflects the last Jarvis sync. Refresh the cockpit to see current state.",
    nextAction: "Verify ingestion freshness and settlement in /admin/dashboard.",
  };
}

function answerWorkers(summary: OwnerSummary): JarvisAnswer {
  const dataReliability = summary.departments.find((d) => d.id === "data-reliability");
  const settlement = summary.departments.find((d) => d.id === "settlement-results");

  const supporting = [
    `Data ingestion: ${dataReliability?.status ?? "UNKNOWN"} — ${dataReliability?.oneLiner ?? "status unknown"}`,
    `Settlement: ${settlement?.status ?? "UNKNOWN"} — ${settlement?.oneLiner ?? "status unknown"}`,
    "All agents: DRAFT_ONLY — no external actions without human approval.",
    "Workers: BullMQ + Redis queue. Check /admin/dashboard for last run timestamps.",
  ];

  const bothGreen =
    dataReliability?.status === "GREEN" && settlement?.status === "GREEN";

  return {
    intent: "workers",
    question: JARVIS_QUESTIONS["workers"],
    answer: bothGreen
      ? "Ingestion and settlement workers are running normally. No manual intervention needed."
      : `Workers have issues. Ingestion: ${dataReliability?.status ?? "UNKNOWN"}, Settlement: ${settlement?.status ?? "UNKNOWN"}.`,
    supportingState: supporting,
    confidence: bothGreen ? "HIGH" : "MEDIUM",
    caveat:
      "Agents are internal operator roles. They produce DRAFTS only — no external actions happen without your approval.",
    nextAction: !bothGreen
      ? "Check /admin/dashboard for ingestion and settlement run logs."
      : "Continue monitoring. Workers are healthy.",
  };
}

function answerMeeting(summary: OwnerSummary): JarvisAnswer {
  const { picks, performance, decisions, criticalWarnings, overallColor } = summary;

  const bullets: string[] = [
    `Status: ${overallColor} — ${summary.oneLiner}`,
    `Picks: ${picks.today} published today (${picks.isPublicGateOpen ? "public" : "internal only"})`,
    `Performance: Target ${performance.targetPct}% — ${performance.displaySafe ? `${performance.actualWinRate ?? "?"}% (${performance.record})` : "Gated"}`,
    `Open decisions: ${decisions.length}`,
    `Critical warnings: ${criticalWarnings.length}`,
  ];

  let answer: string;
  if (overallColor === "GREEN" && criticalWarnings.length === 0) {
    answer = `Platform is GREEN. No critical issues. ${picks.today} pick${picks.today === 1 ? "" : "s"} published today. Performance is ${performance.displaySafe ? "display-ready" : "gated — still accumulating data"}.`;
  } else if (overallColor === "RED") {
    answer = `Platform has issues before this meeting. ${criticalWarnings.length} critical warning(s) active. Do not make public claims until resolved.`;
  } else {
    answer = `Platform is AMBER. ${decisions.length} item${decisions.length === 1 ? "" : "s"} need attention. Safe to operate but not yet fully launch-ready.`;
  }

  return {
    intent: "meeting",
    question: JARVIS_QUESTIONS["meeting"],
    answer,
    supportingState: bullets,
    confidence: "HIGH",
    caveat:
      "Performance stats are only shared publicly if displaySafe is true. Never share the 70% target as an achieved result.",
    nextAction:
      decisions.length > 0
        ? `Review the ${decisions.length} open decision(s) before the meeting.`
        : "No action needed. Platform state is stable.",
  };
}

function answerAiOps(summary: OwnerSummary): JarvisAnswer {
  const { aiOps } = summary;

  const supporting = [
    `Telemetry available: NO — ${aiOps.reason}`,
    `ccusage: ${aiOps.ccusageNote}`,
    "Model lane policy:",
    ...aiOps.modelLanePolicy.map((p) => `  • ${p}`),
    "To instrument next:",
    ...aiOps.toInstrumentNext.map((t) => `  • ${t}`),
  ];

  return {
    intent: "ai-ops",
    question: JARVIS_QUESTIONS["ai-ops"],
    answer:
      "AI Ops telemetry is not yet instrumented. Usage data does not flow into Jarvis automatically. " +
      "Run `npx ccusage@latest` in the terminal to see today's Claude spend. " +
      "Model lane policy is defined and should be followed by all agents.",
    supportingState: supporting,
    confidence: "HIGH",
    caveat:
      "No token counts, model costs, or failed-run data are available in Jarvis until wired. " +
      "This is the honest state — do not infer discipline from absence of data.",
    nextAction: aiOps.toInstrumentNext[0] ?? "Wire ccusage to /cockpit/api-costs.",
  };
}

// ─── Architecture intent handlers ─────────────────────────────────────────────
// These answer from the static capability registry, agent council, and memory
// protocol — the architecture truth — combined with live summary state where
// it sharpens the answer. Same purity rules: no model calls, no fabrication.

function describeCapability(c: JarvisCapability): string {
  return `[${c.status}] ${c.name} — ${c.nextAction}`;
}

function answerWhatIsJarvis(summary: OwnerSummary): JarvisAnswer {
  const loop = getOperatingLoop();
  const wired = loop.filter((p) => p.status === "WIRED").length;

  return {
    intent: "what-is-jarvis",
    question: JARVIS_QUESTIONS["what-is-jarvis"],
    answer:
      "Jarvis is a governed intelligence system, not a chatbot or a dashboard theme. " +
      "It senses platform state, interprets it deterministically, prioritizes decisions, " +
      "explains itself, and recommends action — while every external action waits for " +
      `human approval. ${wired} of ${loop.length} operating-loop phases run in code today.`,
    supportingState: loop.map((p) => `[${p.status}] ${p.phase}: ${p.truth}`),
    confidence: "HIGH",
    caveat:
      "Jarvis never executes autonomously. Memory and self-improvement phases are not " +
      "wired yet — that is the honest state.",
    nextAction: summary.decisions[0]
      ? `Operationally, start with: ${summary.decisions[0].description}`
      : "Review the capability map for the next architecture step.",
  };
}

function answerWhatIsWired(_summary: OwnerSummary): JarvisAnswer {
  const wired = CAPABILITY_REGISTRY.filter(
    (c) => c.status === "ACTIVE" || c.status === "DRAFT_ONLY" || c.status === "MANUAL"
  );
  const score = computeWiringScore();

  return {
    intent: "what-is-wired",
    question: JARVIS_QUESTIONS["what-is-wired"],
    answer:
      `${wired.length} of ${CAPABILITY_REGISTRY.length} capabilities exist in working form ` +
      `today — all draft-only or human-operated, none autonomous. ` +
      `Wiring score: ${score}/100 (${getWiringLabel(score)}).`,
    supportingState: wired.map((c) => `[${c.status}] ${c.name} — ${c.currentTruth}`),
    confidence: "HIGH",
    caveat:
      "Wired means the capability functions via drafts or a human-run process. " +
      "Zero capabilities are ACTIVE (autonomous) — and that is intentional at this stage.",
    nextAction: "Ask 'What should we build next?' for the prioritized gap list.",
  };
}

function answerWhatIsNotWired(_summary: OwnerSummary): JarvisAnswer {
  const missing = CAPABILITY_REGISTRY.filter(
    (c) => c.status === "NOT_WIRED" || c.status === "DESIGNED"
  );

  return {
    intent: "what-is-not-wired",
    question: JARVIS_QUESTIONS["what-is-not-wired"],
    answer:
      `${missing.length} of ${CAPABILITY_REGISTRY.length} capabilities are designed but not ` +
      "functional: memory, tool routing (MCP), agent orchestration runtime, market/CLV " +
      "intelligence, subscription intelligence, browser control, voice, and workflow automation.",
    supportingState: missing.map(describeCapability),
    confidence: "HIGH",
    caveat:
      "DESIGNED means architecture is defined with partial infrastructure. NOT_WIRED means " +
      "concept only — zero code. Neither will be claimed as live before it is.",
    nextAction: missing[0]?.nextAction ?? null,
  };
}

function answerWhatCanRun(summary: OwnerSummary): JarvisAnswer {
  const canExecute = CAPABILITY_REGISTRY.filter((c) => c.canExecute);
  const canAnswer = CAPABILITY_REGISTRY.filter((c) => c.canAnswer);
  const manual = CAPABILITY_REGISTRY.filter((c) => c.status === "MANUAL");

  return {
    intent: "what-can-run",
    question: JARVIS_QUESTIONS["what-can-run"],
    answer:
      canExecute.length === 0
        ? `Nothing runs autonomously — by design. ${canAnswer.length} capabilities can answer ` +
          `questions from live data, and ${manual.length} run when a human triggers them ` +
          "(settlement, calibration review, AI Ops spot-checks)."
        : `${canExecute.length} capabilities can execute autonomously; the rest answer or recommend only.`,
    supportingState: [
      `Autonomous execution: ${canExecute.length} capabilities`,
      `Can answer from live data: ${canAnswer.length} capabilities`,
      `Human-triggered (MANUAL): ${manual.map((c) => c.name).join(", ") || "none"}`,
      `Live decision queue: ${summary.decisions.length} item(s) awaiting the owner`,
    ],
    confidence: "HIGH",
    caveat:
      "canExecute is false across the registry until an approved orchestration runtime " +
      "with audit logging exists. Do not infer execution ability from a capability existing.",
    nextAction:
      "To expand what can run: wire the tool router / MCP layer first, then orchestration.",
  };
}

function answerWhichAgentOwnsThis(_summary: OwnerSummary): JarvisAnswer {
  const counts = getCouncilSeatCounts();

  return {
    intent: "which-agent-owns-this",
    question: JARVIS_QUESTIONS["which-agent-owns-this"],
    answer:
      `Every capability has exactly one owning council seat. ${counts.total} seats total: ` +
      `${counts.registeredCockpitAgents} registered cockpit agents (draft-only), ` +
      `${counts.manual} human-run roles, ${counts.notWired} designed-but-unwired seats.`,
    supportingState: AGENT_COUNCIL.map(
      (m) =>
        `[${m.status}] ${m.codename} (${m.role}) → ${m.ownsCapabilities.join(", ")}`
    ),
    confidence: "HIGH",
    caveat:
      "Council seats are governed roles with charters, not running processes. " +
      "No seat takes external actions without human approval.",
    nextAction: "Review the agent council panel in the cockpit for full charters.",
  };
}

function answerWhatNeedsApproval(summary: OwnerSummary): JarvisAnswer {
  const approvalGated = CAPABILITY_REGISTRY.filter((c) => c.requiresHumanApproval);
  const liveDecisions = summary.decisions;

  return {
    intent: "what-needs-approval",
    question: JARVIS_QUESTIONS["what-needs-approval"],
    answer:
      `${approvalGated.length} of ${CAPABILITY_REGISTRY.length} capabilities require human ` +
      `approval before anything externally visible happens. Right now ${liveDecisions.length} ` +
      `live decision${liveDecisions.length === 1 ? "" : "s"} await${liveDecisions.length === 1 ? "s" : ""} you in the queue.`,
    supportingState: [
      ...liveDecisions.map((d) => `[LIVE · ${d.urgency}] ${d.description}`),
      ...approvalGated
        .filter((c) => c.ownerMode === "OWNER_DECISION_REQUIRED")
        .map((c) => `[GATE] ${c.name}: ${c.nextAction}`),
    ],
    confidence: "HIGH",
    caveat:
      "Approval gates are structural, not optional: publishing, settlement verification, " +
      "performance display, and all content require a human decision.",
    nextAction: liveDecisions[0]
      ? `Start with: ${liveDecisions[0].description}`
      : "Queue is clear. No approvals pending.",
  };
}

function answerWhatToBuildNext(_summary: OwnerSummary): JarvisAnswer {
  // Deterministic leverage ranking: MANUAL capabilities are closest to paying
  // off (the process already works — automate it), then DESIGNED, then
  // NOT_WIRED. Within a band, higher operational risk surfaces first.
  const statusRank: Record<JarvisCapability["status"], number> = {
    MANUAL: 0,
    DESIGNED: 1,
    NOT_WIRED: 2,
    DRAFT_ONLY: 3,
    ACTIVE: 4,
  };
  const riskRank: Record<JarvisCapability["riskLevel"], number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };
  const ranked = CAPABILITY_REGISTRY.filter((c) => c.status !== "ACTIVE")
    .slice()
    .sort(
      (a, b) =>
        statusRank[a.status] - statusRank[b.status] ||
        riskRank[a.riskLevel] - riskRank[b.riskLevel]
    );
  const top = ranked.slice(0, 3);

  return {
    intent: "what-should-we-build-next",
    question: JARVIS_QUESTIONS["what-should-we-build-next"],
    answer:
      "Highest-leverage next builds, ranked deterministically (manual processes closest to " +
      `automation first, then designed gaps): ${top.map((c) => c.name).join("; ")}.`,
    supportingState: ranked.slice(0, 6).map(describeCapability),
    confidence: "MEDIUM",
    caveat:
      "This ranking is a deterministic heuristic over the capability registry — status depth " +
      "and risk level — not a market analysis. The owner sets the real roadmap.",
    nextAction: top[0]?.nextAction ?? null,
  };
}

function answerAiOpsArchitecture(summary: OwnerSummary): JarvisAnswer {
  const cap = CAPABILITY_REGISTRY.find((c) => c.id === "ai-ops-token-discipline");
  const { aiOps } = summary;

  return {
    intent: "what-is-ai-ops-status",
    question: JARVIS_QUESTIONS["what-is-ai-ops-status"],
    answer:
      `AI Ops is ${cap?.status ?? "UNKNOWN"}: the model lane policy is defined and enforced ` +
      "by convention, ccusage covers manual spend checks, and no live token telemetry is " +
      "wired into the cockpit. Discipline today is policy plus spot-checks, not instrumentation.",
    supportingState: [
      `Capability status: ${cap?.status ?? "UNKNOWN"} (${cap?.ownerMode ?? "UNKNOWN"})`,
      `Telemetry available: NO — ${aiOps.reason}`,
      `ccusage: ${aiOps.ccusageNote}`,
      ...(cap ? cap.forbiddenActions.map((f) => `Forbidden: ${f}`) : []),
    ],
    confidence: "HIGH",
    caveat:
      "No token counts or model costs are claimed without instrumentation. " +
      "Absence of data is reported as absence, never as discipline.",
    nextAction: cap?.nextAction ?? aiOps.toInstrumentNext[0] ?? null,
  };
}

function answerMemoryStatus(_summary: OwnerSummary): JarvisAnswer {
  const memory = buildMemoryStatus();

  return {
    intent: "what-is-memory-status",
    question: JARVIS_QUESTIONS["what-is-memory-status"],
    answer:
      "Jarvis has no persistent memory yet. Operational truth is rebuilt from the database " +
      "on every load; architectural truth lives in version-controlled markdown. The memory " +
      "protocol is designed and documented, but no store is wired.",
    supportingState: [
      `Memory wired: ${memory.wired ? "YES" : "NO"}`,
      `Truth: ${memory.truth}`,
      "Protocol docs (designed, version-controlled):",
      ...memory.protocolDocs.map((d) => `  • ${d}`),
    ],
    confidence: "HIGH",
    caveat:
      "Nothing is recalled across sessions. Any claim of remembered context before the " +
      "store is wired would be fabrication.",
    nextAction: memory.nextAction,
  };
}

// ─── OS-layer intent handlers ─────────────────────────────────────────────────
// These answer from the Jarvis OS layers: scribe, memory protocol, tool router,
// voice protocol, prompt library, action queue, audit ledger, improvement loop.
// Same purity rules: deterministic, no model calls, no fabrication.

function answerWhatDoYouRemember(_summary: OwnerSummary): JarvisAnswer {
  const memory = buildJarvisMemoryStatus();

  return {
    intent: "what-do-you-remember",
    question: JARVIS_QUESTIONS["what-do-you-remember"],
    answer:
      "Honestly: nothing across sessions. The memory protocol is designed — " +
      "classification and redaction run in code, and candidate memories live as " +
      "version-controlled markdown in the vault — but no queryable store is wired.",
    supportingState: [
      `Wired: ${memory.isWired ? "YES" : "NO"}`,
      `Backing: ${memory.backingStatus}`,
      ...memory.capabilities.map((c) => `Can: ${c}`),
      ...memory.limitations.map((l) => `Cannot: ${l}`),
    ],
    confidence: "HIGH",
    caveat:
      "Any claim of remembered context before the store is wired would be fabrication.",
    nextAction: memory.nextWiringStep,
    source: "memory-protocol",
    phase: "MEMORY",
  };
}

function answerWhatIsInScribe(_summary: OwnerSummary): JarvisAnswer {
  const protocol = buildScribeProtocolForAgent("jarvis");

  return {
    intent: "what-is-in-scribe",
    question: JARVIS_QUESTIONS["what-is-in-scribe"],
    answer:
      "The scribe is the shared note-taking protocol every agent writes through. " +
      "It is FILE_BACKED: typed entries are validated, redacted for secrets, and " +
      "rendered as markdown into the vault. No entries flow into this view " +
      "automatically yet — files land by explicit human or approved-job action.",
    supportingState: [
      `Output path: ${protocol.outputPath}`,
      `Required fields: ${protocol.requiredFields.join(", ")}`,
      `Forbidden fields: ${protocol.forbiddenFields.join(", ")}`,
      "Entry types: OBSERVATION, DECISION, PROMPT, ACTION_PROPOSAL, HANDOFF, RESULT, RISK, MEMORY, TODO",
      "Redaction: key/secret/token/password/credential values become [REDACTED]",
    ],
    confidence: "HIGH",
    caveat:
      "The scribe library does no I/O. Reading entries back into the cockpit is a " +
      "future wiring step.",
    nextAction: "Add a reviewed write path that lands formatted entries in docs/ai/jarvis/scribe/.",
    source: "scribe",
    phase: "SCRIBE",
    scribeSuggestion:
      "Record today's working session as a RESULT entry (project JARVIS).",
  };
}

function answerWhatAreAgentsDoing(summary: OwnerSummary): JarvisAnswer {
  const counts = getCouncilSeatCounts();
  const actionDepts = summary.departments.filter((d) => d.actionRequired);

  return {
    intent: "what-are-agents-doing",
    question: JARVIS_QUESTIONS["what-are-agents-doing"],
    answer:
      `${counts.total} council seats: ${counts.draftOnly} draft-only registered agents ` +
      `producing drafts for approval, ${counts.manual} human-run roles, and ` +
      `${counts.notWired} designed seats that do not run yet. No agent acts ` +
      "externally without your approval." +
      (actionDepts.length > 0
        ? ` ${actionDepts.length} department(s) currently require action.`
        : ""),
    supportingState: AGENT_COUNCIL.map(
      (m) => `[${m.status}] ${m.codename} — ${m.role}: ${m.currentTruth}`
    ),
    confidence: "HIGH",
    caveat:
      "Council seats are governed roles with charters, not running processes. " +
      "DRAFT_ONLY means outputs wait in the review queue.",
    nextAction:
      actionDepts[0]?.actionDescription ??
      "Review the agent council panel for charters and handoffs.",
    source: "agent-council",
    phase: "ACT_SAFELY",
  };
}

function answerPrepareNextPrompt(summary: OwnerSummary): JarvisAnswer {
  const blockers = [
    ...summary.criticalWarnings,
    ...summary.decisions.map((d) => d.description),
  ];
  const suggested = suggestNextPrompt("operations", blockers);

  return {
    intent: "prepare-next-prompt",
    question: JARVIS_QUESTIONS["prepare-next-prompt"],
    answer: suggested
      ? `Suggested template: ${suggested.id} (${suggested.type}). Purpose: ${suggested.purpose} ` +
        `Model lane: ${suggested.modelRecommendation}, budget: ${suggested.tokenBudget}.`
      : "No prompt template matched the current state.",
    supportingState: suggested
      ? [
          `Approval boundary: ${suggested.approvalBoundary}`,
          ...suggested.acceptanceCriteria.map((c) => `Accept: ${c}`),
          ...suggested.validationCommands.map((v) => `Validate: ${v}`),
        ]
      : [`Library size: ${PROMPT_LIBRARY.length} templates`],
    confidence: suggested ? "HIGH" : "LOW",
    caveat:
      "Suggestion is a deterministic keyword heuristic over the typed library — " +
      "not a model call. The owner picks the actual next task.",
    nextAction: suggested
      ? `Fill the {{placeholders}} in ${suggested.id} and launch the session.`
      : "Add templates to the prompt library.",
    source: "prompt-library",
    phase: "DECIDE",
    promptSuggestion: suggested?.id,
  };
}

function answerWhatToolsAreWired(_summary: OwnerSummary): JarvisAnswer {
  const status = buildToolRouterStatus();
  const wired = getWiredTools();

  return {
    intent: "what-tools-are-wired",
    question: JARVIS_QUESTIONS["what-tools-are-wired"],
    answer:
      `${status.wiredCount} of ${status.totalTools} tools are wired ` +
      `(${wired.map((t) => t.name).join(", ") || "none"}), ${status.partialCount} partial, ` +
      `${status.notWiredCount} not wired or designed. Ready to use now, read-only: ` +
      `${status.readyToUseNow.join(", ") || "none"}. Every write tool is parked behind approval.`,
    supportingState: [
      `Ready now: ${status.readyToUseNow.join(", ") || "none"}`,
      `Requires approval: ${status.requiresApproval.join(", ") || "none"}`,
      "Invariant: canRunNow=false for all write tools until the approval mechanism is wired",
    ],
    confidence: "HIGH",
    caveat:
      "Wired means the integration functions today (file system or DB reads). " +
      "PARTIAL tools depend on the session (web/file search).",
    nextAction:
      "Wire the approval mechanism so GitHub writes can flow through the action queue.",
    source: "tool-router",
    phase: "TOOL_ROUTER",
  };
}

function answerCanYouTalk(_summary: OwnerSummary): JarvisAnswer {
  const voice = buildVoiceProtocolStatus();

  return {
    intent: "can-you-talk",
    question: JARVIS_QUESTIONS["can-you-talk"],
    answer:
      `Not yet. Voice is not active: STT is ${voice.sttStatus}, TTS is ${voice.ttsStatus}, ` +
      `wake mode is ${voice.wakeMode}. The command grammar (${voice.supportedCommands.length} ` +
      "commands) and privacy rules are designed, and the console renders the honest status.",
    supportingState: [
      `isActive: ${voice.isActive ? "YES" : "NO"}`,
      `Approval phrase for any write: "${voice.approvalPhrase}"`,
      ...voice.privacyRules.map((r) => `Privacy: ${r}`),
    ],
    confidence: "HIGH",
    caveat:
      "Browser speech APIs may be feature-detected client-side, but nothing records " +
      "or speaks until the protocol is wired.",
    nextAction:
      "Feature-detect browser SpeechRecognition in the voice console, then wire push-to-talk STT.",
    source: "voice-protocol",
    phase: "VOICE",
  };
}

function answerCanYouAct(_summary: OwnerSummary): JarvisAnswer {
  const improvement = buildImprovementLoopStatus();

  return {
    intent: "can-you-act",
    question: JARVIS_QUESTIONS["can-you-act"],
    answer:
      "Only inside hard boundaries. Every action flows through the action queue, " +
      "and only READ_ONLY_CHECK can execute without approval — every write-shaped " +
      "action requires your sign-off, and no executor is wired yet. The prediction " +
      "engine can never be adjusted automatically.",
    supportingState: [
      "Action lifecycle: PROPOSED → NEEDS_APPROVAL → APPROVED → RUNNING → COMPLETED/FAILED → SCRIBED",
      "canExecuteWithoutApproval: true only for READ_ONLY_CHECK",
      `Improvement loop active: ${improvement.isActive ? "YES" : "NO"}`,
      `Can auto-adjust prediction engine: ${improvement.canAutomaticallyAdjustPredictionEngine ? "YES" : "NO"}`,
    ],
    confidence: "HIGH",
    caveat:
      "The queue is code-backed but no execution runtime exists — even approved " +
      "actions are carried out by humans today.",
    nextAction: "Keep the boundary: wire the audit store before any executor.",
    source: "action-queue",
    phase: "ACT_SAFELY",
    approvalRequired: true,
  };
}

function answerWhatDidWeDecide(summary: OwnerSummary): JarvisAnswer {
  const { decisions } = summary;

  return {
    intent: "what-did-we-decide",
    question: JARVIS_QUESTIONS["what-did-we-decide"],
    answer:
      decisions.length === 0
        ? "The live decision queue is empty. Past decisions are not recalled — " +
          "there is no cross-session memory yet; the decision log lives in the " +
          "vault (02-decisions) as markdown."
        : `${decisions.length} decision item${decisions.length === 1 ? "" : "s"} are ` +
          "live in the queue right now. Historical decisions are not recalled — " +
          "no cross-session memory is wired; check the vault decision log.",
    supportingState: [
      ...decisions.map((d) => `[${d.urgency}] ${d.description}`),
      "Decision log: docs/ai/jarvis/vault/02-decisions/",
      "Cross-session memory: NOT wired",
    ],
    confidence: decisions.length > 0 ? "HIGH" : "MEDIUM",
    caveat:
      "This shows the live queue only. Jarvis cannot recall prior sessions until " +
      "the memory store is wired.",
    nextAction:
      "Record owner decisions as vault notes so they survive until memory is wired.",
    source: "owner-summary",
    phase: "REMEMBER",
    scribeSuggestion: "Write a DECISION entry for any call made today.",
  };
}

function answerWhatShouldRunOvernight(_summary: OwnerSummary): JarvisAnswer {
  const overnight = getPromptsByType("OVERNIGHT_RUN");
  const pick = overnight[0] ?? null;

  return {
    intent: "what-should-run-overnight",
    question: JARVIS_QUESTIONS["what-should-run-overnight"],
    answer: pick
      ? `Run the ${pick.id} template overnight: ${pick.purpose} It is read-and-test ` +
        "only — any code fix it drafts waits for your approval in the morning."
      : "No OVERNIGHT_RUN template is registered in the prompt library.",
    supportingState: pick
      ? [
          ...pick.validationCommands.map((v) => `Command: ${v}`),
          ...pick.forbiddenActions.map((f) => `Forbidden: ${f}`),
          `Approval boundary: ${pick.approvalBoundary}`,
        ]
      : [`Library size: ${PROMPT_LIBRARY.length}`],
    confidence: pick ? "HIGH" : "LOW",
    caveat:
      "Nothing runs unattended yet — 'overnight' means you launch the session " +
      "before stepping away. No scheduler is wired to do it for you.",
    nextAction: pick
      ? `Launch ${pick.id} with scope filled in before end of day.`
      : "Add an OVERNIGHT_RUN template.",
    source: "prompt-library",
    phase: "ACT_SAFELY",
    promptSuggestion: pick?.id,
  };
}

function answerSummarizeGalaxy(summary: OwnerSummary): JarvisAnswer {
  const os = buildJarvisOSState(summary);

  return {
    intent: "summarize-galaxy",
    question: JARVIS_QUESTIONS["summarize-galaxy"],
    answer:
      `Platform: ${summary.overallColor} — ${summary.oneLiner} ` +
      `Picks: ${summary.picks.today} today (gate ${summary.picks.isPublicGateOpen ? "open" : "closed"}). ` +
      `Decisions waiting: ${summary.decisions.length}. ` +
      `OS posture: ${os.wiredCount} layers wired, ${os.partialCount} partial, ` +
      `${os.notWiredCount} not wired.`,
    supportingState: [
      `Agents: ${os.agentSummary}`,
      `Tools: ${os.toolSummary}`,
      `Memory: ${os.memorySummary}`,
      `Voice: ${os.voiceSummary}`,
      `Improvement: ${os.improvementSummary}`,
    ],
    confidence: "HIGH",
    caveat:
      "Operational facts come from the last Jarvis sync; OS layer statuses are " +
      "static truth from the registries.",
    nextAction: os.nextBestActions[0] ?? null,
    source: "os-state",
    phase: "INTERPRET",
  };
}

function answerSummarizeAirwave(_summary: OwnerSummary): JarvisAnswer {
  return {
    intent: "summarize-airwave",
    question: JARVIS_QUESTIONS["summarize-airwave"],
    answer:
      "Honest answer: Airwave state does not flow into the OwnerSummary yet. " +
      "The Airwave engines (pundit scorecards, claim grading, capture gating) " +
      "exist in code with a demo ledger, but no live Airwave telemetry is wired " +
      "into Jarvis — so no operational summary can be given without fabricating.",
    supportingState: [
      "Airwave code: apps/web/lib/airwave/ (scorecards, ledger, adapters)",
      "Data: demo ledger only — no live claim ingestion",
      "OwnerSummary coverage: NONE",
    ],
    confidence: "HIGH",
    caveat:
      "Absence of data is reported as absence. Do not infer Airwave health from this answer.",
    nextAction:
      "Wire an Airwave section into buildOwnerSummary() so Jarvis can answer this from live state.",
    source: "os-state",
    phase: "SENSE",
  };
}

function answerWhatIsBlockedOS(summary: OwnerSummary): JarvisAnswer {
  const os = buildJarvisOSState(summary);
  const notWired = os.operatingLoopPhases.filter((p) => p.status === "NOT_WIRED");

  return {
    intent: "what-is-blocked-os",
    question: JARVIS_QUESTIONS["what-is-blocked-os"],
    answer:
      `Across the OS: ${os.topBlockers.length} blockers. ` +
      `${notWired.length} of ${os.operatingLoopPhases.length} phases are NOT_WIRED ` +
      `(${notWired.map((p) => p.phase).join(", ")}). ` +
      (summary.criticalWarnings.length > 0
        ? `${summary.criticalWarnings.length} live critical warning(s) on top.`
        : "No live critical warnings."),
    supportingState: [
      ...os.topBlockers.map((b) => `Blocker: ${b}`),
      ...os.ownerDecisionQueue,
    ],
    confidence: "HIGH",
    caveat:
      "OS-layer blockers are structural (wiring gaps), not incidents. Live " +
      "operational blockers come from the last Jarvis sync.",
    nextAction: os.nextBestActions[0] ?? null,
    source: "os-state",
    phase: "DECIDE",
  };
}

function answerHowDoWeImprove(_summary: OwnerSummary): JarvisAnswer {
  const loop = buildImprovementLoopStatus();
  const audit = buildAuditLedgerStatus();

  return {
    intent: "how-do-we-improve",
    question: JARVIS_QUESTIONS["how-do-we-improve"],
    answer:
      `Through proposals, never autonomy. The improvement loop is ${loop.isActive ? "active" : "not active"}: ` +
      `${loop.proposals.length} standing proposal(s) on file, every one requiring owner ` +
      "approval. The prediction engine can never be adjusted automatically — " +
      "calibration and model changes need sign-off plus out-of-sample validation.",
    supportingState: [
      ...loop.proposals.map((p) => `[${p.status}] ${p.title}`),
      `canAutomaticallyAdjustPredictionEngine: ${loop.canAutomaticallyAdjustPredictionEngine ? "YES" : "NO"}`,
      `Audit ledger wired: ${audit.isWired ? "YES" : "NO"} — improvements need a trail`,
    ],
    confidence: "HIGH",
    caveat: loop.truth,
    nextAction:
      "Run the standing calibration review manually and record the result as a scribe entry.",
    source: "improvement-loop",
    phase: "IMPROVE",
    approvalRequired: true,
  };
}

// ─── Dispatch / bot intent handlers ──────────────────────────────────────────
// These answer from the task-dispatch system and bot registry.
// Same purity rules: deterministic, no model calls, no fabrication.

function answerDispatchTask(_summary: OwnerSummary): JarvisAnswer {
  const categories = getAllAvailableTaskCategories();

  const supporting = categories.map((c) => {
    const agent = getAgentForCategory(c);
    const promptId = getPromptForCategory(c);
    const tools = getToolsForCategory(c);
    const bot = getRecommendedBotForCategory(c);
    return (
      `[${c}] agent:${agent}, template:${promptId}, ` +
      `tools:[${tools.slice(0, 3).join(",")}${tools.length > 3 ? "…" : ""}]` +
      (bot ? `, bot:${bot}` : "")
    );
  });

  return {
    intent: "dispatch-task",
    question: JARVIS_QUESTIONS["dispatch-task"],
    answer:
      `To dispatch a task through Jarvis: pick a TaskCategory, supply a title and context ` +
      `map, and call dispatchTask(). Jarvis identifies the owning agent, selects the ` +
      `prompt template and required tools, creates an ActionItem in the action queue, ` +
      `and returns a DispatchPlan with the full ready-to-run prompt. ` +
      `${categories.length} task categories are available: ` +
      categories.join(", ") + ". " +
      "Every plan includes: fullPrompt (copy into Claude Code or Fable), checkpoints, " +
      "rollbackPlan, and scribeInstructions.",
    supportingState: supporting,
    confidence: "HIGH",
    caveat:
      "Dispatch prepares the plan; the owner launches the session and approves any changes. " +
      "No code runs automatically from a DispatchPlan.",
    nextAction:
      "Open the Task Dispatch panel in the cockpit to see all categories and ready-to-run prompts.",
    source: "task-dispatch",
    phase: "DECIDE",
  };
}

function answerWhatBotsAreWired(_summary: OwnerSummary): JarvisAnswer {
  const bots = buildBotRegistrySummary();
  const dispatchable = getBotsThatCanDispatch();

  const supporting = BOT_REGISTRY.map(
    (b) =>
      `[${b.status}] ${b.name} (${b.type}) — owned by ${b.owningAgent}. ` +
      `Dispatch:${b.canDispatchViaJarvis ? "YES" : "NO"} Approval:${b.requiresApproval ? "YES" : "NO"} ` +
      `Scribe:${b.scribeOnRun ? "YES" : "NO"}`
  );

  return {
    intent: "what-bots-are-wired",
    question: JARVIS_QUESTIONS["what-bots-are-wired"],
    answer:
      `${bots.total} bots registered. ${bots.canDispatch} can be dispatched via Jarvis: ` +
      dispatchable.map((b) => b.name).join(", ") +
      `. ${bots.manual} are manual (human must trigger). ` +
      `${bots.active} are currently active. ` +
      "Every bot that modifies state requires owner approval before executing.",
    supportingState: supporting,
    confidence: "HIGH",
    caveat:
      "Bot status is static truth from the bot registry — MANUAL means a human runs it, " +
      "ON_DEMAND means Jarvis can prepare a plan but the owner launches the session.",
    nextAction:
      "Review the Bot Registry panel or ask 'what-can-jarvis-run' for a comprehensive view.",
    source: "bot-registry",
    phase: "ACT_SAFELY",
  };
}

function answerRunOvernightLoop(_summary: OwnerSummary): JarvisAnswer {
  const plan = buildOvernightLoopPlan({}, "2026-01-01T00:00:00.000Z");

  return {
    intent: "run-overnight-loop",
    question: JARVIS_QUESTIONS["run-overnight-loop"],
    answer:
      `Overnight loop dispatch plan is ready. Category: OVERNIGHT_LOOP. ` +
      `Owning agent: ${plan.owningAgent} (${plan.promptTemplate}). ` +
      `Risk: ${plan.riskLevel}. Approval required: ${plan.approvalRequired ? "YES" : "NO"}. ` +
      "The plan runs: full test suite, typecheck, lint — then triages failures into a " +
      "morning report. No code changes ship automatically — fixes are proposals awaiting " +
      "your morning review.",
    supportingState: [
      `Task ID: ${plan.taskId}`,
      `Template: ${plan.promptTemplate}`,
      `Tools: ${plan.toolsRequired.join(", ")}`,
      `Budget: ${plan.estimatedTokenBudget}`,
      `Rollback: ${plan.rollbackPlan}`,
      ...plan.checkpoints.map((c) => `Checkpoint: ${c}`),
      "Full prompt available in: DispatchPlan.fullPrompt — copy into Claude Code or Fable.",
    ],
    confidence: "HIGH",
    caveat:
      "Nothing runs unattended — 'overnight' means you launch the Claude Code session " +
      "before stepping away. No scheduler triggers this automatically.",
    nextAction:
      "Open the Task Dispatch panel, select OVERNIGHT_LOOP, and copy the fullPrompt into Claude Code.",
    source: "task-dispatch",
    phase: "ACT_SAFELY",
    promptSuggestion: plan.promptTemplate,
    approvalRequired: plan.approvalRequired,
  };
}

function answerWhatCanJarvisRun(summary: OwnerSummary): JarvisAnswer {
  const bots = buildBotRegistrySummary();
  const dispatchable = getBotsThatCanDispatch();
  const categories = getAllAvailableTaskCategories();
  const os = buildJarvisOSState(summary);

  return {
    intent: "what-can-jarvis-run",
    question: JARVIS_QUESTIONS["what-can-jarvis-run"],
    answer:
      `Jarvis is the operations director: ${categories.length} task categories, ` +
      `${bots.total} bots, ${os.toolSummary.split(":")[0] ?? "tools registered"}. ` +
      `Dispatchable bots (owner launches): ${dispatchable.map((b) => b.name).join(", ")}. ` +
      "For every category, Jarvis prepares a complete DispatchPlan with the full prompt, " +
      "owning agent, required tools, checkpoints, and rollback plan. The owner launches " +
      "the session — no autonomous execution exists.",
    supportingState: [
      `Task categories: ${categories.join(", ")}`,
      `Bots total: ${bots.total} | can dispatch: ${bots.canDispatch} | manual: ${bots.manual}`,
      `Dispatchable bots: ${dispatchable.map((b) => `${b.name} (${b.status})`).join("; ")}`,
      `Loops available: overnight-loop (tests+typecheck+lint), content-run, calibration-review`,
      `Tools ready now: ${os.safeToRunNow.slice(0, 4).join("; ")}`,
    ],
    confidence: "HIGH",
    caveat:
      "Jarvis prepares plans; the owner executes. No code runs automatically. " +
      "Every write-capable action requires approval.",
    nextAction:
      "Open the Task Dispatch panel to see all dispatch plans and copy the ready-to-run prompt.",
    source: "task-dispatch",
    phase: "DECIDE",
  };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

const HANDLERS: Readonly<Record<JarvisIntent, (s: OwnerSummary) => JarvisAnswer>> = {
  "picks": answerPicks,
  "launch-ready": answerLaunchReady,
  "performance": answerPerformance,
  "blocked": answerBlocked,
  "decisions": answerDecisions,
  "today": answerToday,
  "workers": answerWorkers,
  "meeting": answerMeeting,
  "ai-ops": answerAiOps,
  "what-is-jarvis": answerWhatIsJarvis,
  "what-is-wired": answerWhatIsWired,
  "what-is-not-wired": answerWhatIsNotWired,
  "what-can-run": answerWhatCanRun,
  "which-agent-owns-this": answerWhichAgentOwnsThis,
  "what-needs-approval": answerWhatNeedsApproval,
  "what-should-we-build-next": answerWhatToBuildNext,
  "what-is-ai-ops-status": answerAiOpsArchitecture,
  "what-is-memory-status": answerMemoryStatus,
  "what-do-you-remember": answerWhatDoYouRemember,
  "what-is-in-scribe": answerWhatIsInScribe,
  "what-are-agents-doing": answerWhatAreAgentsDoing,
  "prepare-next-prompt": answerPrepareNextPrompt,
  "what-tools-are-wired": answerWhatToolsAreWired,
  "can-you-talk": answerCanYouTalk,
  "can-you-act": answerCanYouAct,
  "what-did-we-decide": answerWhatDidWeDecide,
  "what-should-run-overnight": answerWhatShouldRunOvernight,
  "summarize-galaxy": answerSummarizeGalaxy,
  "summarize-airwave": answerSummarizeAirwave,
  "what-is-blocked-os": answerWhatIsBlockedOS,
  "how-do-we-improve": answerHowDoWeImprove,
  "dispatch-task": answerDispatchTask,
  "what-bots-are-wired": answerWhatBotsAreWired,
  "run-overnight-loop": answerRunOvernightLoop,
  "what-can-jarvis-run": answerWhatCanJarvisRun,
};

// Dispatches a deterministic owner question to the correct intent handler for the given OwnerSummary.
export function askJarvis(intent: JarvisIntent, summary: OwnerSummary): JarvisAnswer {
  return HANDLERS[intent](summary);
}
