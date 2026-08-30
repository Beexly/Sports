import { describe, it, expect } from "vitest";
import {
  buildCommunityCalibrationTournament,
  type CommunityForecastSubmission,
} from "@/lib/tournament/calibration-tournament";

/**
 * Regression: the leaderboard filter was `sampleSize >= Math.min(1, minEligibleSubmissions)`,
 * which collapses to `>= 1` for any threshold above 1 — so the default 25-submission
 * minimum (and any caller-provided minimum) was ineffective and undersampled participants
 * ranked. The threshold must actually be honored.
 */

let seq = 0;
function submission(
  participantId: string,
  outcome: 0 | 1,
  probability = 0.6
): CommunityForecastSubmission {
  seq += 1;
  return {
    id: `s-${participantId}-${seq}`,
    participantId,
    participantName: participantId,
    eventId: `e-${seq}`,
    probability,
    outcome,
    submittedAt: "2026-01-01T00:00:00.000Z",
    lockAt: "2026-01-01T01:00:00.000Z",
    settledAt: "2026-01-02T00:00:00.000Z",
  };
}

function manyFor(participantId: string, n: number): CommunityForecastSubmission[] {
  return Array.from({ length: n }, (_, i) => submission(participantId, i % 2 === 0 ? 1 : 0));
}

describe("buildCommunityCalibrationTournament — eligibility threshold", () => {
  it("excludes participants below minEligibleSubmissions", () => {
    const submissions = [
      ...manyFor("meets", 4), // 4 settled submissions
      ...manyFor("under", 2), // only 2 — below the threshold
    ];

    const board = buildCommunityCalibrationTournament(submissions, new Date("2026-02-01T00:00:00.000Z"), {
      minEligibleSubmissions: 3,
    });

    const ids = board.leaderboard.map((r) => r.participantId);
    expect(ids).toContain("meets");
    expect(ids).not.toContain("under"); // <-- would have ranked under the old Math.min(1, …) bug
  });

  it("keeps a floor of 1 so a 0/negative threshold still drops empty rows", () => {
    const board = buildCommunityCalibrationTournament(manyFor("solo", 1), new Date("2026-02-01T00:00:00.000Z"), {
      minEligibleSubmissions: 0,
    });
    // One real settled submission still qualifies (floor of 1), nothing spurious appears.
    expect(board.leaderboard.map((r) => r.participantId)).toEqual(["solo"]);
  });
});
