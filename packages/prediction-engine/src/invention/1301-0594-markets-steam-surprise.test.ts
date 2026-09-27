/**
 * Tests for 1301.0594 markets steam surprise (ADAPT).
 * Architecture only — no live wiring, disabled by default.
 */
import { describe, expect, it } from "vitest";
import {
  attributeNewsWindow,
  deltaLogit,
  evaluateSteamStep,
  isSteamMove,
  logit,
  NEWS_HALF_WINDOW_MS,
  passesSteamGate,
  predictsCloseDirection,
  surpriseS,
  type NewsItem,
} from "./1301-0594-markets-steam-surprise.js";

describe("1301.0594 markets steam surprise", () => {
  describe("logit / deltaLogit / surpriseS", () => {
    it("logit is finite on (0,1) and clamps endpoints", () => {
      expect(Number.isFinite(logit(0.5))).toBe(true);
      expect(Number.isFinite(logit(0))).toBe(true);
      expect(Number.isFinite(logit(1))).toBe(true);
      expect(logit(0.5)).toBeCloseTo(0, 10);
    });

    it("deltaLogit is positive when p rises", () => {
      const d = deltaLogit(0.4, 0.6);
      expect(d).toBeGreaterThan(0);
      expect(d).toBeCloseTo(logit(0.6) - logit(0.4), 10);
    });

    it("surpriseS divides by sqrt(varT)", () => {
      expect(surpriseS(0.2, 0.04)).toBeCloseTo(1, 10);
      expect(Number.isFinite(surpriseS(0.1, 0))).toBe(true);
    });
  });

  describe("isSteamMove / evaluateSteamStep", () => {
    it("flags a large move relative to small variance", () => {
      const d = deltaLogit(0.5, 0.7);
      expect(isSteamMove(d, 0.01)).toBe(true);
    });

    it("does not flag a tiny move against large variance", () => {
      const d = deltaLogit(0.5, 0.51);
      expect(isSteamMove(d, 1.0)).toBe(false);
    });

    it("evaluateSteamStep returns SteamSurpriseResult fields", () => {
      const step = evaluateSteamStep(0.45, 0.55, 0.01);
      expect(step.deltaLogit).toBeCloseTo(deltaLogit(0.45, 0.55), 10);
      expect(step.varT).toBe(0.01);
      expect(step.surpriseS).toBeCloseTo(
        surpriseS(step.deltaLogit, 0.01),
        10,
      );
      expect(typeof step.isSteam).toBe("boolean");
      expect(step.isSteam).toBe(isSteamMove(step.deltaLogit, 0.01));
    });

    it("honors an explicit k override", () => {
      const d = deltaLogit(0.5, 0.55);
      expect(isSteamMove(d, 0.01, 100)).toBe(false);
      expect(isSteamMove(d, 0.01, 0.1)).toBe(true);
    });
  });

  describe("attributeNewsWindow", () => {
    const flagMs = 1_700_000_000_000;
    const news: NewsItem[] = [
      { t: flagMs - 5 * 60_000, text: "Mahomes listed as questionable" },
      { t: flagMs + 10 * 60_000, text: "weather delay possible" },
      { t: flagMs - NEWS_HALF_WINDOW_MS - 60_000, text: "out for season" },
    ];

    it("matches tokens and player names inside the half-window", () => {
      const attr = attributeNewsWindow(flagMs, news, ["mahomes"]);
      expect(attr.windowStartMs).toBe(flagMs - NEWS_HALF_WINDOW_MS);
      expect(attr.windowEndMs).toBe(flagMs + NEWS_HALF_WINDOW_MS);
      expect(attr.matched).toContain("questionable");
      expect(attr.matched).toContain("weather");
      expect(attr.matched).toContain("mahomes");
      expect(attr.matched).not.toContain("out");
      expect(attr.expectedEntropyLoss).toBeGreaterThanOrEqual(0);
    });

    it("returns empty matched when no news in window", () => {
      const attr = attributeNewsWindow(flagMs, [], ["mahomes"]);
      expect(attr.matched).toEqual([]);
    });
  });

  describe("predictsCloseDirection / passesSteamGate", () => {
    it("predictsCloseDirection agrees with close move sign", () => {
      expect(predictsCloseDirection(1.5, 0.5, 0.7)).toBe(true);
      expect(predictsCloseDirection(-1.5, 0.5, 0.3)).toBe(true);
      expect(predictsCloseDirection(1.5, 0.5, 0.3)).toBe(false);
    });

    it("passesSteamGate requires flagged>=200 and accuracy>=0.55", () => {
      const pass = passesSteamGate(200, 110);
      expect(pass.flagged).toBe(200);
      expect(pass.correctDirection).toBe(110);
      expect(pass.accuracy).toBeCloseTo(0.55, 10);
      expect(pass.passes).toBe(true);

      expect(passesSteamGate(199, 120).passes).toBe(false);
      expect(passesSteamGate(200, 100).passes).toBe(false);
    });
  });
});
