import { describe, it, expect } from "vitest";
import {
  LIVE_SLATE_COACH_WRITEUPS,
  buildCoachGameWriteup,
  formatConfidenceScore,
  type CoachGameWriteup,
} from "@/lib/writeups/coach-writeup-engine";

describe("Coach Writeup Engine & Tactical Slate Integrity", () => {
  it("pre-populates live slate writeups across all major NFL time slots (TNF, SUN_EARLY, SUN_LATE, SNF, MNF)", () => {
    const slots = new Set(LIVE_SLATE_COACH_WRITEUPS.map((w) => w.windowSlot));
    expect(slots.has("TNF")).toBe(true);
    expect(slots.has("SUN_EARLY")).toBe(true);
    expect(slots.has("SUN_LATE")).toBe(true);
    expect(slots.has("SNF")).toBe(true);
    expect(slots.has("MNF")).toBe(true);
    expect(LIVE_SLATE_COACH_WRITEUPS.length).toBeGreaterThanOrEqual(5);
  });

  it("NEVER formats confidence as a percentage (%) anywhere in the slate writeups", () => {
    const confidenceRegex = /^\d{1,3}\/100$/;

    for (const writeup of LIVE_SLATE_COACH_WRITEUPS) {
      // Check Side / Total
      expect(writeup.sideTotalCall.sideConfidence).toMatch(confidenceRegex);
      expect(writeup.sideTotalCall.sideConfidence).not.toContain("%");
      expect(writeup.sideTotalCall.totalConfidence).toMatch(confidenceRegex);
      expect(writeup.sideTotalCall.totalConfidence).not.toContain("%");

      // Check Props
      for (const prop of writeup.topProps) {
        expect(prop.confidence).toMatch(confidenceRegex);
        expect(prop.confidence).not.toContain("%");
      }

      // Check SGP Ticket Legs
      for (const leg of writeup.correlatedSgpTicket.legs) {
        expect(leg.confidence).toMatch(confidenceRegex);
        expect(leg.confidence).not.toContain("%");
      }
    }
  });

  it("NEVER publishes or packages any pick where decision is 'PASS' or expectedClv is negative", () => {
    for (const writeup of LIVE_SLATE_COACH_WRITEUPS) {
      // Side & Total
      expect(writeup.sideTotalCall.sideDecision).toBe("PLAY");
      expect(writeup.sideTotalCall.sideExpectedClv).toBeGreaterThan(0);
      expect(writeup.sideTotalCall.totalDecision).toBe("PLAY");
      expect(writeup.sideTotalCall.totalExpectedClv).toBeGreaterThan(0);

      // Top Props
      for (const prop of writeup.topProps) {
        expect(prop.decision).toBe("PLAY");
        expect(prop.expectedClv).toBeGreaterThan(0);
      }

      // SGP Legs
      for (const leg of writeup.correlatedSgpTicket.legs) {
        expect(leg.decision).toBe("PLAY");
        expect(leg.expectedClv).toBeGreaterThan(0);
      }
    }
  });

  it("includes valid Quad-Engine scientific citations across all writeups", () => {
    for (const writeup of LIVE_SLATE_COACH_WRITEUPS) {
      const { arxiv, openalex, kaggle, hf } = writeup.quadEngineCitations;
      expect(arxiv.length).toBeGreaterThan(0);
      expect(arxiv.every((c) => c.startsWith("arxiv:"))).toBe(true);

      expect(openalex.length).toBeGreaterThan(0);
      expect(openalex.every((c) => c.startsWith("openalex:"))).toBe(true);

      expect(kaggle.length).toBeGreaterThan(0);
      expect(kaggle.every((c) => c.startsWith("kaggle:"))).toBe(true);

      expect(hf.length).toBeGreaterThan(0);
      expect(hf.every((c) => c.startsWith("hf:"))).toBe(true);
    }
  });

  it("includes detailed tactical sections (Pace of Play, Scheme Matchup, N_eff Target Props, Correlated SGP, DFS Stacks)", () => {
    for (const writeup of LIVE_SLATE_COACH_WRITEUPS) {
      // Pace of Play
      expect(writeup.paceOfPlay.neutralSecPerSnap).toBeGreaterThan(20);
      expect(typeof writeup.paceOfPlay.passEpaPlay).toBe("number");
      expect(typeof writeup.paceOfPlay.notes).toBe("string");

      // Scheme Matchup
      expect(writeup.schemeMatchup.coverageShell.length).toBeGreaterThan(10);
      expect(writeup.schemeMatchup.blitzRateVsPressureToSack.length).toBeGreaterThan(10);

      // Props with N_eff
      for (const prop of writeup.topProps) {
        expect(prop.nEffTargetNotes).toContain("N_eff=");
      }

      // Correlated SGP Ticket
      expect(writeup.correlatedSgpTicket.legs.length).toBeGreaterThanOrEqual(2);
      expect(writeup.correlatedSgpTicket.jointWinProb).toBeGreaterThan(0);
      expect(writeup.correlatedSgpTicket.edgeScore).toBeGreaterThan(0);

      // DFS Stacks
      expect(writeup.dfsStacks.captainPicks.length).toBeGreaterThan(0);
      expect(writeup.dfsStacks.cashCore.length).toBeGreaterThan(0);
      expect(writeup.dfsStacks.gppStacks.length).toBeGreaterThan(0);
    }
  });

  it("buildCoachGameWriteup throws if a pick with decision 'PASS' or expectedClv < 0 is submitted", () => {
    expect(() =>
      buildCoachGameWriteup({
        matchup: "Test Team A @ Test Team B",
        windowSlot: "TNF",
        sideTotalCall: {
          sideSelection: "Team A -3",
          sideConfidence: "70/100",
          sideExpectedClv: -0.02, // Negative CLV rejected!
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
            decision: "PASS" as unknown as "PLAY", // PASS rejected!
            nEffTargetNotes: "N_eff=6.0",
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
