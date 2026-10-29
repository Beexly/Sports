import { describe, it, expect } from "vitest";
import {
  CADENCE,
  cadenceIndex,
  getPostGameFilmReviewWindow,
  getTMinus48hSimWindow,
  ROLLING_GAME_WINDOW_CADENCE,
} from "../cadence.js";
import {
  buildWeeklyCadenceSnapshot,
  type PublishGateResult,
} from "../../coach-sim/weekly-cadence-orchestrator.js";

describe("Rolling Game-Window Cadence", () => {
  it("keeps CADENCE length === 6 and cadenceIndex intact", () => {
    expect(CADENCE).toHaveLength(6);
    expect(cadenceIndex("v1.0")).toBe(0);
    expect(cadenceIndex("v2.0")).toBe(1);
    expect(cadenceIndex("v2.5")).toBe(2);
    expect(cadenceIndex("v3.0")).toBe(3);
    expect(cadenceIndex("v4.0")).toBe(4);
  });

  describe("getPostGameFilmReviewWindow", () => {
    it("returns Sunday 4:00 PM CT for SUN_EARLY slot", () => {
      const window = getPostGameFilmReviewWindow("SUN_EARLY");
      expect(window.gameSlot).toBe("SUN_EARLY");
      expect(window.phase).toBe("POST_GAME_FILM_AUTOPSY");
      expect(window.day).toBe("Sun");
      expect(window.ctTime).toBe("16:00");
      expect(window.hour).toBe(16);
      expect(window.minute).toBe(0);
      expect(window.outputs).toContain("FILM_GRADES");
      expect(window.outputs).toContain("PACE_OF_PLAY");
    });

    it("verifies autopsy windows for SUN_LATE, SNF, TNF, and MNF", () => {
      const sunLate = getPostGameFilmReviewWindow("SUN_LATE");
      expect(sunLate.day).toBe("Sun");
      expect(sunLate.ctTime).toBe("19:30");

      const snf = getPostGameFilmReviewWindow("SNF");
      expect(snf.day).toBe("Sun");
      expect(snf.ctTime).toBe("22:45");

      const tnf = getPostGameFilmReviewWindow("TNF");
      expect(tnf.day).toBe("Thu");
      expect(tnf.ctTime).toBe("22:45");

      const mnf = getPostGameFilmReviewWindow("MNF");
      expect(mnf.day).toBe("Mon");
      expect(mnf.ctTime).toBe("22:45");
    });
  });

  describe("getTMinus48hSimWindow", () => {
    it("returns correct T-48h simulation windows for TNF, SUN_EARLY, and MNF", () => {
      const tnf = getTMinus48hSimWindow("TNF");
      expect(tnf.gameSlot).toBe("TNF");
      expect(tnf.phase).toBe("T_MINUS_48H_EARLY_SIM");
      expect(tnf.day).toBe("Tue");
      expect(tnf.ctTime).toBe("04:00");

      const sunEarly = getTMinus48hSimWindow("SUN_EARLY");
      expect(sunEarly.gameSlot).toBe("SUN_EARLY");
      expect(sunEarly.phase).toBe("T_MINUS_48H_EARLY_SIM");
      expect(sunEarly.day).toBe("Fri");
      expect(sunEarly.ctTime).toBe("04:00");

      const mnf = getTMinus48hSimWindow("MNF");
      expect(mnf.gameSlot).toBe("MNF");
      expect(mnf.phase).toBe("T_MINUS_48H_EARLY_SIM");
      expect(mnf.day).toBe("Sat");
      expect(mnf.ctTime).toBe("04:00");
    });
  });

  describe("weekly-cadence-orchestrator publication gate", () => {
    it("returns ticket: null when publishGate.passes is false", () => {
      const failedGate: PublishGateResult = {
        passes: false,
        reason: "Edge +1.2% below minEdgePct 2.0% gate",
        checks: [
          { name: "independentEdge", pass: false, detail: "PASS on ML" },
          { name: "minEdgeThreshold", pass: false, detail: "1.2% < 2.0%" },
        ],
      };

      const rawTicket = {
        callId: "SF-personnel",
        side: "OVER",
        line: 24.5,
        edge: 0.012,
        price: -115,
      };

      const snapshot = buildWeeklyCadenceSnapshot({
        slot: "SUN_EARLY",
        phase: "T_MINUS_48H_EARLY_SIM",
        gameId: "401873017",
        publishGate: failedGate,
        rawTicket,
      });

      expect(snapshot.publishGate.passes).toBe(false);
      expect(snapshot.ticket).toBeNull();
    });

    it("returns ticket when publishGate.passes is true", () => {
      const passedGate: PublishGateResult = {
        passes: true,
        reason: "Edge +3.8% clears gate and models agree",
        checks: [
          { name: "independentEdge", pass: true, detail: "BET" },
          { name: "minEdgeThreshold", pass: true, detail: "3.8% >= 2.0%" },
        ],
      };

      const rawTicket = {
        callId: "SF-personnel",
        side: "OVER",
        line: 24.5,
        edge: 0.038,
        price: -115,
      };

      const snapshot = buildWeeklyCadenceSnapshot({
        slot: "SUN_EARLY",
        phase: "T_MINUS_90M_FINAL_LOCK",
        gameId: "401873017",
        publishGate: passedGate,
        rawTicket,
      });

      expect(snapshot.publishGate.passes).toBe(true);
      expect(snapshot.ticket).toEqual(rawTicket);
    });
  });
});
