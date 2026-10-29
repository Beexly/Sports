import { describe, it, expect } from "vitest";
import {
  LIVE_SLATE_COACH_WRITEUPS,
  LIVE_WEEK8_2026_BOARD,
  buildCoachGameWriteup,
  formatConfidenceScore,
} from "@/lib/writeups/coach-writeup-engine";

describe("Coach Writeup Engine & Week 8 10,000-Sim Board", () => {
  it("publishes the live 2026 week 8 board and 14 data-backed 10,000-sim writeups with honest PLAY/PASS selectivity", () => {
    expect(LIVE_WEEK8_2026_BOARD).toHaveLength(14);
    expect(LIVE_SLATE_COACH_WRITEUPS).toHaveLength(14);

    const slots = new Set(LIVE_WEEK8_2026_BOARD.map((w) => w.windowSlot));
    expect(slots.has("TNF")).toBe(true);
    expect(slots.has("SUN_EARLY")).toBe(true);
    expect(slots.has("SUN_LATE")).toBe(true);
    expect(slots.has("SNF")).toBe(true);
    expect(slots.has("MNF")).toBe(true);

    const tnf = LIVE_WEEK8_2026_BOARD[0]!;
    expect(tnf.espnEventId).toBe("401873023");
    expect(tnf.matchup).toBe("Carolina Panthers @ Green Bay Packers");
    expect(tnf.kickoff).toBe("2026-11-01T18:00Z");
    expect(tnf.postedDetails).toBe("GB -3.5");
    expect(tnf.postedTotal).toBe(47.5);
    expect(tnf.publication).toBe("PLAY");
    expect(tnf.windowSlot).toBe("TNF");

    let playCount = 0;
    let passCount = 0;
    for (const w of LIVE_SLATE_COACH_WRITEUPS) {
      expect(w.sideTotalCall.sideConfidence).toMatch(/^\d{1,3}\/100$/);
      expect(w.sideTotalCall.totalConfidence).toMatch(/^\d{1,3}\/100$/);
      if (w.sideTotalCall.sideDecision === "PLAY") {
        playCount++;
        expect(w.sideTotalCall.sideExpectedClv).toBeGreaterThan(0);
      } else {
        passCount++;
      }
      if (w.sideTotalCall.totalDecision === "PLAY") {
        playCount++;
        expect(w.sideTotalCall.totalExpectedClv).toBeGreaterThan(0);
      } else {
        passCount++;
      }
    }
    expect(playCount).toBeGreaterThanOrEqual(5);
    expect(playCount).toBeLessThanOrEqual(6);
    expect(passCount).toBeGreaterThan(0);

    const blob = JSON.stringify(LIVE_WEEK8_2026_BOARD);
    expect(blob).not.toContain("Minnesota Vikings @ Los Angeles Rams");
    expect(blob).not.toContain("2024-10-24");
  });

  it("does not invent a packaged play when fields are omitted", () => {
    expect(() =>
      buildCoachGameWriteup({
        matchup: "Carolina Panthers @ Green Bay Packers",
        windowSlot: "TNF",
      }),
    ).toThrow(/Refusing to invent/);
  });

  it("buildCoachGameWriteup preserves honest PASS decisions without throwing and throws if PLAY has expectedClv < 0", () => {
    const sample = LIVE_SLATE_COACH_WRITEUPS[2]!;
    const builtPass = buildCoachGameWriteup({
      ...sample,
      sideTotalCall: {
        ...sample.sideTotalCall,
        sideDecision: "PASS",
        sideExpectedClv: -0.005,
        totalDecision: "PASS",
        totalExpectedClv: 0.0,
        rationale: "",
      },
    });
    expect(builtPass.sideTotalCall.sideDecision).toBe("PASS");
    expect(builtPass.sideTotalCall.totalDecision).toBe("PASS");
    expect(builtPass.sideTotalCall.rationale).toBe("Market efficient — no forced bet");

    expect(() =>
      buildCoachGameWriteup({
        matchup: "Test Team A @ Test Team B",
        windowSlot: "TNF",
        sideTotalCall: {
          sideSelection: "Team A -3",
          sideConfidence: "70/100",
          sideExpectedClv: -0.02,
          sideDecision: "PLAY",
          totalSelection: "OVER 45",
          totalConfidence: "65/100",
          totalExpectedClv: 0.03,
          totalDecision: "PLAY",
          rationale: "Negative CLV test",
        },
      }),
    ).toThrow(/expectedClv < 0/);

    expect(() =>
      buildCoachGameWriteup({
        matchup: "Test Team A @ Test Team B",
        windowSlot: "TNF",
        topProps: [
          {
            playerId: "p1",
            playerName: "Player One",
            propType: "Receiving Yards",
            line: 50.5,
            side: "OVER",
            confidence: "75/100",
            expectedClv: 0.04,
            decision: "INVALID" as unknown as "PLAY",
            nEffTargetNotes: "Plain football note",
          },
        ],
      }),
    ).toThrow(/invalid decision/);
  });

  it("formatConfidenceScore rejects percentage strings and formats numbers properly", () => {
    expect(formatConfidenceScore("74/100")).toBe("74/100");
    expect(formatConfidenceScore(74)).toBe("74/100");
    expect(formatConfidenceScore(0.74)).toBe("74/100");
    expect(() => formatConfidenceScore("74%")).toThrow(/Percent '%' is forbidden/);
  });
});
