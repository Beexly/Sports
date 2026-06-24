import { describe, expect, it } from "vitest";
import {
  buildCommunityCalibrationTournament,
  type CommunityForecastSubmission,
} from "./calibration-tournament";

const BASE_TIME = {
  lockAt: "2026-09-06T17:00:00.000Z",
  submittedAt: "2026-09-06T16:00:00.000Z",
  settledAt: "2026-09-07T23:00:00.000Z",
};

function submission(
  id: string,
  participantId: string,
  participantName: string,
  probability: number,
  outcome: 0 | 1,
  overrides: Partial<CommunityForecastSubmission> = {}
): CommunityForecastSubmission {
  return {
    ...BASE_TIME,
    eventId: `event-${id}`,
    id,
    outcome,
    participantId,
    participantName,
    probability,
    ...overrides,
  };
}

describe("community calibration tournament", () => {
  it("ranks participants by lower bounded Brier and keeps the board draft-only", () => {
    const board = buildCommunityCalibrationTournament(
      [
        submission("sharp-1", "sharp", "Sharp Forecaster", 0.82, 1),
        submission("sharp-2", "sharp", "Sharp Forecaster", 0.74, 1),
        submission("loose-1", "loose", "Loose Forecaster", 0.68, 0),
        submission("loose-2", "loose", "Loose Forecaster", 0.58, 1),
      ],
      new Date("2026-09-08T00:00:00.000Z"),
      { minEligibleSubmissions: 2 }
    );

    const first = board.leaderboard[0];
    const second = board.leaderboard[1];
    if (!first || !second) throw new Error("expected two leaderboard rows");

    expect(first.participantId).toBe("sharp");
    expect(first.brierScore).toBeLessThan(second.brierScore);
    expect(board.acceptedSubmissions).toBe(4);
    expect(board.harnessCalibration.sampleSize).toBe(4);
    expect(board.status).toBe("DRAFT_ONLY");
    expect(board.enabled).toBe(false);
    expect(board.draftOnly).toBe(true);
    expect(board.priced).toBe(false);
    expect(first.eligibleForRecognition).toBe(false);
    expect(first.priced).toBe(false);
  });

  it("rejects late, pending, and invalid probability submissions", () => {
    const board = buildCommunityCalibrationTournament([
      submission("ok", "p1", "Player One", 0.7, 1),
      submission("late", "p1", "Player One", 0.7, 1, {
        submittedAt: "2026-09-06T17:05:00.000Z",
      }),
      { ...submission("pending", "p2", "Player Two", 0.55, 1), outcome: null },
      submission("bad-prob", "p3", "Player Three", 1.2, 1),
    ]);

    expect(board.acceptedSubmissions).toBe(1);
    expect(board.rejectedSubmissions).toBe(3);
    expect(board.leaderboard).toHaveLength(1);
    expect(board.leaderboard[0]?.participantId).toBe("p1");
  });

  it("never enables recognition even when the sample threshold is met", () => {
    const board = buildCommunityCalibrationTournament(
      [
        submission("a", "p1", "Player One", 0.9, 1),
        submission("b", "p1", "Player One", 0.85, 1),
      ],
      new Date("2026-09-08T00:00:00.000Z"),
      { minEligibleSubmissions: 1, flagKey: "TEST_COMMUNITY_TOURNAMENT" }
    );

    expect(board.flagKey).toBe("TEST_COMMUNITY_TOURNAMENT");
    expect(board.leaderboard[0]?.eligibleForRecognition).toBe(false);
    expect(board.enabled).toBe(false);
    expect(board.note).toContain("review only");
  });
});
