/**
 * GSE Coach Brain LLM Prompt Spine & Anti-Hallucination Grounding Validator
 *
 * Bounds LLM generation to the Tuesday v1.0 sealed WeeklyCadencePacket:
 *   - Injects the immutable coachMindsetHash and Merkle root into the system prompt.
 *   - Verifies all generated outputs cite only sealed gameIds and valid Tuesday coach hashes.
 */

import type { TuesdayMasterLock } from "../coach-sim/weekly-cadence-orchestrator.js";

export function buildCoachBrainSystemPrompt(packet: TuesdayMasterLock): string {
  const packetMerkle =
    (packet as any).packetLock?.merkle ??
    packet.games[0]?.coachLock?.cadenceLock?.merkle ??
    "SEALED_PACKET";

  const rows = packet.games.map((g) => {
    const home = g.coachLock.frozenCoachInput.homeTeam;
    const away = g.coachLock.frozenCoachInput.awayTeam;
    const merkle = g.coachLock.cadenceLock?.merkle ?? packetMerkle;
    return [
      `GAME ${g.gameId}: ${away} @ ${home}`,
      `  CoachMindsetHash (v1.0 Frozen): ${g.coachLock.coachMindsetHash}`,
      `  Active Cadence Version: ${g.coachLock.cadenceLock.version} (Merkle: ${merkle})`,
      `  Model MarginMean (Home): ${g.coachLock.marginMean} | Model ScoreMean: ${g.coachLock.scoreMean}`,
      `  WinProb Home: ${g.coachLock.winProbHome}`,
    ].join("\n");
  });

  return [
    "You are GSE-COACH-BRAIN-V1 (Garrett Baxley's Neuro-Symbolic Sports Intelligence Engine).",
    "CORE DOCTRINE: The Coach Mindset is locked at Tuesday 04:00 CT (v1.0) and NEVER mutates. Injury reports (v2.0 Wed, v3.0 Fri, v4.0 Sun T-90) only reallocate targets/carries via Sinkhorn and apply bounded EPA dropoffs.",
    "HARD FENCE: Never cite or invent any game, coach, or player outside the sealed packet below.",
    `PACKET: Season ${packet.season} Week ${packet.week} (${packet.version}) | Merkle=${packetMerkle}`,
    ...rows,
  ].join("\n\n");
}

export function verifyCoachBrainOutputAgainstPacket(
  packet: TuesdayMasterLock,
  candidate: { referencedGameIds: readonly string[]; quotedCoachHash?: string },
): { ok: boolean; violations: string[] } {
  const packetMerkle =
    (packet as any).packetLock?.merkle ??
    packet.games[0]?.coachLock?.cadenceLock?.merkle ??
    "SEALED_PACKET";
  const violations: string[] = [];
  const validIds = new Set(packet.games.map((g) => g.gameId));
  for (const id of candidate.referencedGameIds) {
    if (!validIds.has(id)) {
      violations.push(`Unsealed/hallucinated gameId ${id} not in packet ${packetMerkle}`);
    }
  }
  if (candidate.quotedCoachHash) {
    const validHashes = new Set(packet.games.map((g) => g.coachLock.coachMindsetHash));
    if (!validHashes.has(candidate.quotedCoachHash)) {
      violations.push(`Quoted coachMindsetHash ${candidate.quotedCoachHash} does not match any Tuesday v1.0 lock`);
    }
  }
  return { ok: violations.length === 0, violations };
}
