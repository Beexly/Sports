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
 *
 * Memory recall (§Recall-before-answer):
 *   - For owner/architecture/product/strategy intents, recallRelevantMemory
 *     is called before composing the answer.
 *   - Confirmed memories are prepended to supportingState with the phrasing
 *     "Using confirmed memory from [date]: …"
 *   - Candidate-only note: "I found a related memory candidate, but it has
 *     not been confirmed."
 *   - Conflicts: "There are conflicting memories. Owner review is required."
 *   - On MemoryStoreUnavailableError: answer proceeds exactly as today —
 *     no degradation, no fake memory. Memory context is ADDITIVE.
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
import { recallRelevantMemory, type RecallFilter } from "../jarvis/memory/actions";
import { MemoryStoreUnavailableError } from "../jarvis/memory/errors";

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
  | "what-is-memory-status";

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
];

/** OPERATIONS intents answer from the live OwnerSummary; ARCHITECTURE intents
 *  answer from the capability registry, agent council, and memory protocol. */
export type JarvisIntentGroup = "OPERATIONS" | "ARCHITECTURE";

export const JARVIS_GROUP_LABELS: Readonly<Record<JarvisIntentGroup, string>> = {
  OPERATIONS: "Operations",
  ARCHITECTURE: "Architecture & System",
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
};

export interface JarvisAnswer {
  readonly intent: JarvisIntent;
  readonly question: string;
  readonly answer: string;
  readonly supportingState: readonly string[];
  readonly confidence: "HIGH" | "MEDIUM" | "LOW";
  readonly caveat: string | null;
  readonly nextAction: string | null;
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
};

// Dispatches a deterministic owner question to the correct intent handler for the given OwnerSummary.
export function askJarvis(intent: JarvisIntent, summary: OwnerSummary): JarvisAnswer {
  return HANDLERS[intent](summary);
}

// ─── Memory recall — intents that trigger recall-before-answer ────────────────

/**
 * Intents that represent owner/architecture/product/strategy questions.
 * These are the intents where recallRelevantMemory is called before composing.
 */
const RECALL_INTENTS = new Set<JarvisIntent>([
  "decisions",
  "meeting",
  "what-is-jarvis",
  "what-is-wired",
  "what-is-not-wired",
  "what-can-run",
  "which-agent-owns-this",
  "what-needs-approval",
  "what-should-we-build-next",
  "what-is-ai-ops-status",
  "what-is-memory-status",
]);

/** Derive a recall filter scope + tags from the intent. */
function recallFilterForIntent(intent: JarvisIntent): RecallFilter {
  const intentTagMap: Partial<Record<JarvisIntent, string[]>> = {
    "decisions": ["decision", "owner"],
    "meeting": ["decision", "owner", "product"],
    "what-is-jarvis": ["architecture", "jarvis"],
    "what-is-wired": ["architecture", "wiring"],
    "what-is-not-wired": ["architecture", "wiring"],
    "what-can-run": ["architecture", "execution"],
    "which-agent-owns-this": ["architecture", "agent"],
    "what-needs-approval": ["decision", "approval"],
    "what-should-we-build-next": ["architecture", "product", "roadmap"],
    "what-is-ai-ops-status": ["ai-ops", "architecture"],
    "what-is-memory-status": ["memory", "architecture"],
  };

  const scopeMap: Partial<Record<JarvisIntent, string>> = {
    "decisions": "owner.decision",
    "meeting": "owner.decision",
    "what-is-jarvis": "architecture",
    "what-is-wired": "architecture",
    "what-is-not-wired": "architecture",
    "what-can-run": "architecture",
    "which-agent-owns-this": "architecture",
    "what-needs-approval": "owner.decision",
    "what-should-we-build-next": "architecture",
    "what-is-ai-ops-status": "architecture",
    "what-is-memory-status": "architecture",
  };

  return {
    scope: scopeMap[intent],
    tags: intentTagMap[intent],
  };
}

/**
 * Format recalled memory context into supportingState entries, per spec:
 *   - confirmed → "Using confirmed memory from [date]: …"
 *   - conflicts → "There are conflicting memories. Owner review is required."
 *   - candidate-only note → "I found a related memory candidate, but it has not been confirmed."
 */
function formatMemoryContext(
  memories: Awaited<ReturnType<typeof recallRelevantMemory>>,
): readonly string[] {
  if (!memories) return [];

  const lines: string[] = [];

  const { memories: confirmed, unresolvedConflicts: conflicts } = memories;

  if (conflicts.length > 0) {
    lines.push("There are conflicting memories. Owner review is required.");
  }

  for (const mem of confirmed) {
    const date = (mem.confirmed_at ?? mem.created_at).toISOString().slice(0, 10);
    lines.push(`Using confirmed memory from ${date}: ${mem.summary}`);
  }

  return lines;
}

/**
 * Async variant of askJarvis that recalls relevant memory before composing
 * the answer for owner/architecture/product/strategy intents.
 *
 * - Memory context is ADDITIVE: existing answer is the base.
 * - On MemoryStoreUnavailableError: answers exactly as askJarvis() — no degradation.
 * - Candidate-only note: "I found a related memory candidate, but it has not been confirmed."
 *   (surfaced when there are candidates but no confirmed memories in scope)
 */
export async function askJarvisWithMemory(
  intent: JarvisIntent,
  summary: OwnerSummary,
): Promise<JarvisAnswer> {
  const base = askJarvis(intent, summary);

  if (!RECALL_INTENTS.has(intent)) {
    return base;
  }

  try {
    const filter = recallFilterForIntent(intent);
    const recalled = await recallRelevantMemory(filter);

    if (!recalled) return base;

    const { memories: confirmedMemories, unresolvedConflicts } = recalled;

    if (confirmedMemories.length === 0 && unresolvedConflicts.length === 0) {
      return base;
    }

    const memoryLines = formatMemoryContext(recalled);

    return {
      ...base,
      supportingState: [...memoryLines, ...base.supportingState],
    };
  } catch (err) {
    if (err instanceof MemoryStoreUnavailableError) {
      // Memory store unavailable — answer exactly as today, no degradation
      return base;
    }
    // Other errors: also fall back gracefully
    return base;
  }
}
