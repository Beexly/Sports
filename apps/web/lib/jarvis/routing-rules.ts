/**
 * Jarvis Routing Rules
 *
 * The 13 default task routing sequences from the Agent Council build spec §6.
 * Each rule maps a task type to an ordered sequence of council seats, ending
 * at JARVIS or Owner. These are data — not running processes.
 *
 * Routing rules are testable (spec AC17) and visible in the cockpit.
 * They do NOT represent wired automation — they document the governed
 * handoff path that a human or future automation should follow.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskType =
  | "pick-research"
  | "settlement"
  | "public-content"
  | "customer-dashboard"
  | "data-incident"
  | "memory-decision"
  | "tool-browser"
  | "workflow-automation"
  | "marketing"
  | "community-launch"
  | "revenue-pricing"
  | "forecasting"
  | "stat-rd";

export interface RouteStep {
  /** Council seat codename. */
  seat: string;
  /** Optional condition that must be true for this step to activate. */
  gateCondition?: string;
}

export interface RoutingRule {
  taskType: TaskType;
  description: string;
  sequence: RouteStep[];
  /** The terminal authority — work ends here awaiting human decision. */
  endsAt: "JARVIS" | "Owner";
}

// ─── Routing rules (spec §6) ──────────────────────────────────────────────────

export const ROUTING_RULES: readonly RoutingRule[] = [
  {
    taskType: "pick-research",
    description:
      "Research for a new pick: Scout surfaces context, Delta adds market intelligence, " +
      "Tal verifies freshness, Jarvis reviews, Owner approves if public-facing.",
    sequence: [
      { seat: "SCOUT" },
      { seat: "DELTA", gateCondition: "market context required" },
      { seat: "TAL", gateCondition: "freshness issue detected" },
      { seat: "JARVIS" },
      { seat: "Owner", gateCondition: "public-facing pick" },
    ],
    endsAt: "Owner",
  },

  {
    taskType: "settlement",
    description:
      "Settle picks against verified outcomes: Ledger owns canonical results, " +
      "Audit owns calibration and sample gates, Jarvis receives the summary.",
    sequence: [
      { seat: "LEDGER" },
      { seat: "AUDIT" },
      { seat: "JARVIS" },
    ],
    endsAt: "JARVIS",
  },

  {
    taskType: "public-content",
    description:
      "Public-facing content pipeline: Ava drafts, Quill rewrites to brand voice, " +
      "Gauge audits quality and claims, Jarvis reviews, Owner publishes.",
    sequence: [
      { seat: "AVA" },
      { seat: "QUILL" },
      { seat: "GAUGE" },
      { seat: "JARVIS" },
      { seat: "Owner" },
    ],
    endsAt: "Owner",
  },

  {
    taskType: "customer-dashboard",
    description:
      "Customer dashboard health: Sarah owns the surface, Gauge audits quality, " +
      "Tal resolves any data issues, Jarvis receives the final report.",
    sequence: [
      { seat: "SARAH" },
      { seat: "GAUGE" },
      { seat: "TAL", gateCondition: "data issue detected" },
      { seat: "JARVIS" },
    ],
    endsAt: "JARVIS",
  },

  {
    taskType: "data-incident",
    description:
      "Data pipeline incident: Tal investigates, Meter reviews if model/cost involved, " +
      "Jarvis escalates, Owner approves if production risk.",
    sequence: [
      { seat: "TAL" },
      { seat: "METER", gateCondition: "model or cost involved" },
      { seat: "JARVIS" },
      { seat: "Owner", gateCondition: "production risk" },
    ],
    endsAt: "Owner",
  },

  {
    taskType: "memory-decision",
    description:
      "Memory candidate decision: Archive creates the candidate, Jarvis reviews, " +
      "Owner confirms if sensitive or durable.",
    sequence: [
      { seat: "ARCHIVE" },
      { seat: "JARVIS" },
      { seat: "Owner", gateCondition: "sensitive or durable memory" },
    ],
    endsAt: "Owner",
  },

  {
    taskType: "tool-browser",
    description:
      "Tool or browser action: Relay routes to Pilot only with pre-approved domain " +
      "and owner approval; every action is logged.",
    sequence: [
      { seat: "RELAY" },
      { seat: "PILOT", gateCondition: "pre-approved domain + owner approval" },
      { seat: "Owner" },
    ],
    endsAt: "Owner",
  },

  {
    taskType: "workflow-automation",
    description:
      "Workflow automation proposal: Chain proposes, Meter reviews cost and risk, " +
      "Jarvis reviews the design, Owner approves external or production changes.",
    sequence: [
      { seat: "CHAIN" },
      { seat: "METER", gateCondition: "cost or risk review" },
      { seat: "JARVIS" },
      { seat: "Owner", gateCondition: "external or production impact" },
    ],
    endsAt: "Owner",
  },

  {
    taskType: "marketing",
    description:
      "Marketing campaign flow: Flare originates, Bobby validates funnel data, " +
      "Quill rewrites voice, Gauge audits claims, Jarvis reviews, Owner approves.",
    sequence: [
      { seat: "FLARE" },
      { seat: "BOBBY" },
      { seat: "QUILL" },
      { seat: "GAUGE" },
      { seat: "JARVIS" },
      { seat: "Owner" },
    ],
    endsAt: "Owner",
  },

  {
    taskType: "community-launch",
    description:
      "Community launch: Pulse designs engagement, Sarah owns customer surface, " +
      "Gauge audits quality, Jarvis reviews, Owner approves launch.",
    sequence: [
      { seat: "PULSE" },
      { seat: "SARAH" },
      { seat: "GAUGE" },
      { seat: "JARVIS" },
      { seat: "Owner" },
    ],
    endsAt: "Owner",
  },

  {
    taskType: "revenue-pricing",
    description:
      "Revenue and pricing decisions: Bobby surfaces signals, Mint owns financial view, " +
      "Vector contributes forecasting, Jarvis reviews, Owner decides.",
    sequence: [
      { seat: "BOBBY" },
      { seat: "MINT" },
      { seat: "VECTOR" },
      { seat: "JARVIS" },
      { seat: "Owner" },
    ],
    endsAt: "Owner",
  },

  {
    taskType: "forecasting",
    description:
      "Planning and forecasting: Vector leads, routes to Bobby, Mint, or Tal " +
      "as needed for data, then Jarvis receives the result.",
    sequence: [
      { seat: "VECTOR" },
      { seat: "BOBBY", gateCondition: "subscription/funnel data needed" },
      { seat: "MINT", gateCondition: "financial data needed" },
      { seat: "TAL", gateCondition: "data pipeline input needed" },
      { seat: "JARVIS" },
    ],
    endsAt: "JARVIS",
  },

  {
    taskType: "stat-rd",
    description:
      "Stat R&D pipeline: Prism originates research, Ascend proposes improvement " +
      "experiments, Audit validates calibration impact, Jarvis escalates scoring " +
      "changes to Owner.",
    sequence: [
      { seat: "PRISM" },
      { seat: "ASCEND" },
      { seat: "AUDIT" },
      { seat: "JARVIS" },
      { seat: "Owner", gateCondition: "scoring change proposed" },
    ],
    endsAt: "Owner",
  },
];

// ─── Accessor ─────────────────────────────────────────────────────────────────

/** Returns the routing rule for a given task type, or undefined if not found. */
export function routeForTaskType(type: TaskType): RoutingRule | undefined {
  return ROUTING_RULES.find((r) => r.taskType === type);
}
