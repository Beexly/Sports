import { describe, it, expect } from "vitest";
import { scanModelJournalMarkdown } from "@/lib/journal/compliance";

describe("scanModelJournalMarkdown", () => {
  describe("clean content", () => {
    it("returns green + publishAllowed for factual, non-violating text", () => {
      const result = scanModelJournalMarkdown(
        "The settled data shows 14 wins and 6 losses over 30 games. " +
        "The edge score averaged 4.2 across high-confidence picks."
      );
      expect(result.status).toBe("green");
      expect(result.publishAllowed).toBe(true);
      expect(result.flags).toHaveLength(0);
    });

    it("empty string is green", () => {
      const result = scanModelJournalMarkdown("");
      expect(result.status).toBe("green");
      expect(result.publishAllowed).toBe(true);
    });
  });

  describe("L1 platform ban violations → red", () => {
    it("flags 'AI-powered' language as block", () => {
      const result = scanModelJournalMarkdown(
        "The AI-powered engine improved this month."
      );
      expect(result.status).toBe("red");
      expect(result.publishAllowed).toBe(false);
      const flag = result.flags.find((f) => f.id === "L1-AI-POWERED");
      expect(flag).toBeDefined();
      expect(flag?.severity).toBe("block");
      expect(flag?.span.start).toBeGreaterThanOrEqual(0);
      expect(flag?.span.end).toBeGreaterThan(flag?.span.start ?? 0);
    });

    it("flags first-person algorithm voice", () => {
      const result = scanModelJournalMarkdown(
        "I see a consistent pattern in line movement."
      );
      expect(result.status).toBe("red");
      const flag = result.flags.find((f) => f.id === "L1-FIRST-PERSON-ALGORITHM");
      expect(flag).toBeDefined();
    });
  });

  describe("L2 unsupported claim violations → red", () => {
    it("flags win-rate marketing (our win rate is)", () => {
      const result = scanModelJournalMarkdown(
        "Analysis: our win rate is 68% — strong signal."
      );
      expect(result.status).toBe("red");
      const flag = result.flags.find((f) => f.id === "L2-PUBLIC-WIN-RATE");
      expect(flag).toBeDefined();
    });

    it("flags guarantee language", () => {
      const result = scanModelJournalMarkdown(
        "This pick is a guaranteed winner based on the factors."
      );
      expect(result.status).toBe("red");
      const flag = result.flags.find((f) => f.id === "L2-GUARANTEE");
      expect(flag).toBeDefined();
    });
  });

  describe("MODEL_JOURNAL-specific violation → red", () => {
    it("flags first-person confidence framing (MJ-FIRST-PERSON-CONFIDENCE)", () => {
      const result = scanModelJournalMarkdown(
        "We believe the model is well-calibrated this month."
      );
      expect(result.status).toBe("red");
      const flag = result.flags.find((f) => f.id === "MJ-FIRST-PERSON-CONFIDENCE");
      expect(flag).toBeDefined();
      expect(flag?.layer).toBe(3);
    });

    it("'we think' also triggers the MODEL_JOURNAL rule", () => {
      const result = scanModelJournalMarkdown(
        "we think the spreads are fair."
      );
      expect(result.status).toBe("red");
      expect(result.flags.some((f) => f.id === "MJ-FIRST-PERSON-CONFIDENCE")).toBe(true);
    });
  });

  describe("multiple violations", () => {
    it("collects all flags across layers", () => {
      const result = scanModelJournalMarkdown(
        "I see the board is guaranteed to hit 70% this week."
      );
      expect(result.status).toBe("red");
      expect(result.publishAllowed).toBe(false);
      // Should flag at minimum first-person + guarantee
      expect(result.flags.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("span accuracy", () => {
    it("span correctly indexes the matched text in the content string", () => {
      const content = "The model hit a guaranteed winner last night.";
      const result = scanModelJournalMarkdown(content);
      const flag = result.flags.find((f) => f.id === "L2-GUARANTEE");
      expect(flag).toBeDefined();
      if (flag) {
        const matched = content.slice(flag.span.start, flag.span.end);
        expect(matched.toLowerCase()).toContain("guaranteed");
      }
    });
  });
});
