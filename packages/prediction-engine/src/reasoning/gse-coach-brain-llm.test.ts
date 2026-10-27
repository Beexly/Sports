import { describe, it, expect } from "vitest";
import {
  buildCoachBrainSystemPrompt,
  verifyCoachBrainOutputAgainstPacket,
} from "./gse-coach-brain-llm.js";
import { generateTuesdayMasterLock } from "../coach-sim/weekly-cadence-orchestrator.js";

describe("gse-coach-brain-llm: grounded prompt + Merkle anti-hallucination gate", () => {
  const packet = generateTuesdayMasterLock({
    season: 2026,
    week: 7,
    lockedAtIso: "2026-10-20T09:00:00.000Z",
    games: [
      {
        gameId: "401873017",
        homeTeam: "ATL",
        awayTeam: "SF",
        week: 7,
        coachSupport: 0.84,
        neutralPassRate: 0.57,
        staffAggression: 0.64,
        staffAggressionAway: 0.69,
        marketSpreadHome: 3.5,
        marketTotal: 50.5,
        rooms: { homeTargets: [], awayTargets: [] },
      },
    ],
  });

  it("injects the exact Tuesday coachMindsetHash and packet Merkle into the system prompt", () => {
    const prompt = buildCoachBrainSystemPrompt(packet);
    expect(prompt).toContain(packet.games[0].coachLock.cadenceLock.merkle);
    expect(prompt).toContain(packet.games[0].coachLock.coachMindsetHash);
    expect(prompt).toContain("SF @ ATL");
  });

  it("rejects any LLM response referencing an unsealed gameId or mismatched coach hash", () => {
    const check = verifyCoachBrainOutputAgainstPacket(packet, {
      referencedGameIds: ["UNSEALED_GAME"],
      quotedCoachHash: "invalid",
    });
    expect(check.ok).toBe(false);
    expect(check.violations.length).toBe(2);
  });

  it("approves valid responses citing sealed gameIds and correct coachMindsetHash", () => {
    const check = verifyCoachBrainOutputAgainstPacket(packet, {
      referencedGameIds: ["401873017"],
      quotedCoachHash: packet.games[0].coachLock.coachMindsetHash,
    });
    expect(check.ok).toBe(true);
    expect(check.violations.length).toBe(0);
  });
});
