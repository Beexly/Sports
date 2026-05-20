/**
 * Operator Cockpit — Agent Registry
 *
 * Static registry of the six internal operator "agents" — these are *roles*
 * inside the operations team, not external automations. They route work
 * inside the cockpit. None of them perform external actions on their own;
 * every output is a draft that must be approved by a human reviewer before
 * any externally visible state changes.
 *
 * The agents are also a deliberate match for the OperatorAgent enum in the
 * Prisma schema. Adding an agent here without adding to the schema (or the
 * other way around) is a type error caught by the typecheck step.
 */

import type { OperatorAgent } from "@prisma/client";

export type AgentKey = OperatorAgent;

export interface AgentDefinition {
  readonly key: AgentKey;
  readonly displayName: string;
  readonly responsibility: string;
  readonly safeActions: readonly string[];
  readonly externalActions: "NONE";
}

export const AGENTS: Readonly<Record<AgentKey, AgentDefinition>> = {
  JARVIS: {
    key: "JARVIS",
    displayName: "Jarvis",
    responsibility:
      "Orchestration. Routes incoming work to the right agent, surfaces system readiness, and reports the next recommended actions to the operator.",
    safeActions: [
      "Read all task and decision data",
      "Propose routing for NEW tasks",
      "Surface readiness-gate status",
      "Suggest next actions for the operator",
    ],
    externalActions: "NONE",
  },
  SARAH: {
    key: "SARAH",
    displayName: "Sarah",
    responsibility:
      "Support and review queue. Drafts replies to support inquiries and triages items into the review queue. Never sends replies — all drafts wait for human approval.",
    safeActions: [
      "Draft support replies",
      "Triage tickets into the review queue",
      "Annotate review items with context",
    ],
    externalActions: "NONE",
  },
  TAL: {
    key: "TAL",
    displayName: "Tal",
    responsibility:
      "Engineering. Owns repo audits, bug triage, test failures, and minor implementation tasks tied to the sports platform.",
    safeActions: [
      "Open implementation drafts",
      "File bug investigations",
      "Comment on failing tests",
    ],
    externalActions: "NONE",
  },
  SCOUT: {
    key: "SCOUT",
    displayName: "Scout",
    responsibility:
      "Sports research. Watches odds movement, injury news, and schedule signals. Produces research notes that are drafted into the queue for an analyst to review.",
    safeActions: [
      "Draft research notes",
      "Flag line-movement events",
      "Annotate picks with new context",
    ],
    externalActions: "NONE",
  },
  AVA: {
    key: "AVA",
    displayName: "Ava",
    responsibility:
      "Sports content workflow. Drafts blog posts, newsletter sections, and short-form copy strictly from approved platform data. Never publishes; every draft requires human approval and waits in the media queue.",
    safeActions: [
      "Draft blog/newsletter copy from approved picks",
      "Suggest scheduling metadata",
      "Annotate drafts with source coverage",
    ],
    externalActions: "NONE",
  },
  BOBBY: {
    key: "BOBBY",
    displayName: "Bobby",
    responsibility:
      "Funnel, subscription, and analytics insights. Reads platform telemetry and surfaces conversion / churn observations as review-queue items.",
    safeActions: [
      "Surface subscription metric anomalies",
      "Draft funnel observations",
      "Flag pricing experiments for review",
    ],
    externalActions: "NONE",
  },
};

export function listAgents(): readonly AgentDefinition[] {
  return Object.values(AGENTS);
}

export function getAgent(key: AgentKey): AgentDefinition {
  return AGENTS[key];
}
