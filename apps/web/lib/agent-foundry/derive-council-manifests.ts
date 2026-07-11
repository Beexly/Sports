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
 *  - a tier-0 seat cannot own a HIGH/CRITICAL-risk skill without the owner
 *    approval bit set (it is set on all seeds; the scanner enforces it).
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
  if ((m.risk === "HIGH" || m.risk === "CRITICAL") && seat.authorityTier === 0 && !m.humanApprovalRequired) {
    problems.push(
      `${m.id}: ${m.risk} risk under tier-0 seat ${seat.id} requires humanApprovalRequired`
    );
  }
  return { ok: problems.length === 0, problems };
}
