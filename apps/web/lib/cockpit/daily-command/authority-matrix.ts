/**
 * Authority matrix — the visible L0–L5 autonomy ladder.
 *
 * Maps each `AgentAuthorityLevel` to a rung and projects the 22 agents in the
 * registry onto it. The ladder is the honest answer to "what are these agents
 * allowed to do, and who decides?":
 *
 *   L0 OBSERVE            — read/analyze only
 *   L1 DRAFT              — produce drafts; never publish
 *   L2 ROUTE              — route work into the governed queue
 *   L3 MANUAL_EXECUTION   — human-triggered, verified execution
 *   L4 OWNER_ONLY         — owner approval required for the action
 *   L5 AUTONOMOUS         — DECLARED EMPTY. No agent may take external action;
 *                           every agent has externalActionsAllowed=false.
 *
 * L5 exists on the board precisely so the gap is visible: the platform names
 * the autonomous rung and then shows it is empty by design.
 */

import { AGENT_OS_REGISTRY } from "@/lib/agents/agent-registry";
import type { AgentAuthorityLevel } from "@/lib/agents/agent-authority";
import type { AuthorityAgentRef, AuthorityMatrix, AuthorityRung } from "./types";

interface RungDef {
  readonly level: string;
  readonly title: string;
  readonly description: string;
  /** The authority level(s) that land on this rung; empty for the L5 declared rung. */
  readonly authorityLevels: readonly AgentAuthorityLevel[];
  readonly externalActionsAllowed: boolean;
}

/**
 * The ladder, named ahead of time. L0–L4 each map from exactly one
 * AgentAuthorityLevel; L5 is declared-empty (no level maps to it).
 */
export const AUTHORITY_LADDER: readonly RungDef[] = [
  {
    level: "L0",
    title: "Observe",
    description: "Read and analyze cockpit state. No drafts, no routing, no action.",
    authorityLevels: ["OBSERVE"],
    externalActionsAllowed: false,
  },
  {
    level: "L1",
    title: "Draft",
    description: "Produce drafts and review items. Never publishes or sends.",
    authorityLevels: ["DRAFT"],
    externalActionsAllowed: false,
  },
  {
    level: "L2",
    title: "Route",
    description: "Route work into the governed task queue. Approval gates preserved.",
    authorityLevels: ["ROUTE"],
    externalActionsAllowed: false,
  },
  {
    level: "L3",
    title: "Manual execution",
    description: "Human-triggered, verified execution (settlement, calibration, cost review).",
    authorityLevels: ["MANUAL_EXECUTION"],
    externalActionsAllowed: false,
  },
  {
    level: "L4",
    title: "Owner-only",
    description: "Owner approval required before the action is taken.",
    authorityLevels: ["OWNER_ONLY"],
    externalActionsAllowed: false,
  },
  {
    level: "L5",
    title: "Autonomous",
    description:
      "DECLARED EMPTY by design. No agent may take external action without a human decision; every agent has externalActionsAllowed=false.",
    authorityLevels: [],
    externalActionsAllowed: false,
  },
] as const;

function toRef(agent: (typeof AGENT_OS_REGISTRY)[number]): AuthorityAgentRef {
  return {
    id: agent.id,
    displayName: agent.displayName,
    role: agent.role,
    status: agent.status,
    riskLevel: agent.riskLevel,
    ownerApprovalRequired: agent.ownerApprovalRequired,
  };
}

/**
 * Project the registry onto the ladder. Pure (no I/O), so it is trivially
 * testable. Each agent lands on exactly the rung its authorityLevel maps to.
 */
export function buildAuthorityMatrix(): AuthorityMatrix {
  const rungs: AuthorityRung[] = AUTHORITY_LADDER.map((rung) => {
    const agents = AGENT_OS_REGISTRY.filter((agent) =>
      rung.authorityLevels.includes(agent.authorityLevel)
    ).map(toRef);
    return {
      level: rung.level,
      title: rung.title,
      description: rung.description,
      externalActionsAllowed: rung.externalActionsAllowed,
      agents,
    };
  });

  const externalActionCapableCount = AGENT_OS_REGISTRY.filter(
    (agent) => agent.externalActionsAllowed
  ).length;

  return {
    rungs,
    externalActionCapableCount,
    note:
      externalActionCapableCount === 0
        ? "L5 is empty by design: no agent can act externally without a human decision."
        : "WARNING: an agent claims external-action capability — this violates the autonomy posture.",
  };
}
