/**
 * Agent Foundry — council derivation (never duplication).
 *
 * Seat identity and authority come from agent-council.ts, the single source
 * of role truth. The Foundry validates that every manifest's owning seat
 * exists and that the manifest never claims authority its seat lacks. If the
 * council and a manifest ever disagree, the manifest is wrong by definition.
 */

import { AGENT_COUNCIL, type AgentSeat } from "@/lib/jarvis/agent-council";
import type { SkillManifest } from "./types";

export function getOwningSeat(m: SkillManifest): AgentSeat | undefined {
  return AGENT_COUNCIL.find((s) => s.id === m.owningSeatId);
}

export interface AuthorityCheck {
  readonly ok: boolean;
  readonly problems: readonly string[];
}

/**
 * A manifest may never exceed its seat:
 *  - the seat must exist;
 *  - external action is impossible (seats carry externalActionsAllowed:false —
 *    a manifest that names publish/send/bet/charge verbs conflicts);
 *  - NO seat tier waives owner approval for a HIGH/CRITICAL-risk skill (G-6:
 *    the rule was tier-0-scoped, but 2 of 3 seed owners sit at tier ≥1 — a
 *    high-risk skill under them would have passed without the approval bit).
 */
export function checkSeatAuthority(m: SkillManifest): AuthorityCheck {
  const problems: string[] = [];
  const seat = getOwningSeat(m);
  if (!seat) {
    return { ok: false, problems: [`owning seat "${m.owningSeatId}" does not exist in the council`] };
  }
  if (seat.externalActionsAllowed !== false) {
    // Structurally unreachable (literal false) — checked so a future council
    // regression is caught here too, not just in council tests.
    problems.push(`seat ${seat.id} claims external actions — council invariant broken`);
  }
  if ((m.risk === "HIGH" || m.risk === "CRITICAL") && !m.humanApprovalRequired) {
    problems.push(
      `${m.id}: ${m.risk} risk requires humanApprovalRequired — seat tier ${seat.authorityTier} does not waive it`
    );
  }
  return { ok: problems.length === 0, problems };
}
