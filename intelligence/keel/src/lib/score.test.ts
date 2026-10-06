import { describe, expect, it } from "vitest";
import { scoreHit } from "./score";
import type { RawHit } from "./types";

function makeHit(title: string, abstract: string = ""): RawHit {
  return {
    id: "test-hit-1",
    title,
    authors: "Test Author",
    year: "2026",
    venue: "Test Venue",
    url: "https://example.com/test",
    abstract,
    lane: "test-lane",
  };
}

describe("scoreHit", () => {
  describe("Reject rules", () => {
    it("rejects noise tutorials or lock guides (REJECT_NOISE)", () => {
      const hit = makeHit("Fantasy Football Draft Tutorial for Beginners", "A step-by-step guide to winning.");
      const res = scoreHit(hit);
      expect(res.verdict).toBe("reject");
      expect(res.law).toBe("01");
      expect(res.why).toContain("Noise");
      expect(res.equation).toBeNull();
    });

    it("rejects imputing nulls or invalid fixture values (FILLS_NULL)", () => {
      const hit = makeHit("Impute the mean for missing statistics", "We assume healthy if not listed as healthy.");
      const res = scoreHit(hit);
      expect(res.verdict).toBe("reject");
      expect(res.law).toBe("01");
      expect(res.why).toContain("This would fill a null");
      expect(res.equation).toBeNull();
    });

    it("rejects stub 2024 NGS files", () => {
      const hit = makeHit("Analysis of 616-byte ngs_2024 file", "Do not use it in production.");
      const res = scoreHit(hit);
      expect(res.verdict).toBe("reject");
      expect(res.law).toBe("02");
      expect(res.why).toContain("single-year 2024 NGS file is a stub");
      expect(res.equation).toBeNull();
    });

    it("rejects non-matching fallback hits", () => {
      const hit = makeHit("Unrelated Computer Vision Paper", "Deep learning for object detection.");
      const res = scoreHit(hit);
      expect(res.verdict).toBe("reject");
      expect(res.law).toBe("01");
      expect(res.why).toContain("No gate in the closed record can use this");
      expect(res.equation).toBeNull();
    });
  });

  describe("Hold rules", () => {
    it("holds proposals for filling missing offensive line cells", () => {
      const hit = makeHit("Methodology to impute missing offensive line data", "Filling missing cells in tabular data.");
      const res = scoreHit(hit);
      expect(res.verdict).toBe("hold");
      expect(res.law).toBe("01");
      expect(res.why).toContain("proposes filling a missing cell");
    });

    it("holds point-estimate fourth-down models without uncertainty", () => {
      const hit = makeHit("Optimal fourth-down strategy in football", "A new decision model for fourth downs.");
      const res = scoreHit(hit);
      expect(res.verdict).toBe("hold");
      expect(res.law).toBe("03");
      expect(res.why).toContain("Fourth-down work is on the problem");
    });

    it("holds football win probability models", () => {
      const hit = makeHit("Estimating win probability in the NFL", "In-game win probability model.");
      const res = scoreHit(hit);
      expect(res.verdict).toBe("hold");
      expect(res.law).toBe("03");
      expect(res.why).toContain("Win-probability point estimates are the baseline");
    });

    it("holds time to throw prior metrics", () => {
      const hit = makeHit("Measuring avg_time_to_throw with next gen stats", "Analyzing quarterback time-to-throw.");
      const res = scoreHit(hit);
      expect(res.verdict).toBe("hold");
      expect(res.law).toBe("02");
      expect(res.why).toContain("Time-to-throw at week or season grain");
    });

    it("holds big data bowl player tracking datasets", () => {
      const hit = makeHit("Big Data Bowl 2025: Player tracking analytics", "Analyzing tracking data.");
      const res = scoreHit(hit);
      expect(res.verdict).toBe("hold");
      expect(res.law).toBe("02");
      expect(res.why).toContain("Historical tracking can time a release");
    });

    it("holds weekly NFL injury studies", () => {
      const hit = makeHit("Quarterback injury rates in NFL football", "Analyzing team performance.");
      const res = scoreHit(hit);
      expect(res.verdict).toBe("hold");
      expect(res.law).toBe("02");
      expect(res.why).toContain("Injury information is weekly");
    });

    it("holds generic Kaggle NFL datasets", () => {
      const hit = makeHit("Kaggle competition dataset for NFL games", "Predicting play outcomes.");
      const res = scoreHit(hit);
      expect(res.verdict).toBe("hold");
      expect(res.law).toBe("02");
      expect(res.why).toContain("A dataset is not feed until its grain and its key are named");
    });
  });

  describe("Admit rules", () => {
    it("admits fourth-down models incorporating uncertainty / confidence intervals", () => {
      const hit = makeHit("Fourth-down decision making under bootstrap uncertainty", "Using confidence interval boundaries to abstain.");
      const res = scoreHit(hit);
      expect(res.verdict).toBe("admit");
      expect(res.law).toBe("03");
      expect(res.why).toContain("Admitted to the decision shelf");
      expect(res.equation).toContain("uncertainty set");
    });

    it("admits decision-focused learning / predict-then-optimize papers", () => {
      const hit = makeHit("Decision-focused learning via predict-then-optimize", "Minimizing downstream decision regret with SPO+.");
      const res = scoreHit(hit);
      expect(res.verdict).toBe("admit");
      expect(res.law).toBe("03");
      expect(res.why).toContain("Admitted as the reason a decision lift and a Brier score can move apart");
      expect(res.equation).toBe("regret(θ̂) = cost(decision(θ̂)) − cost(decision(θ))");
    });

    it("admits proper scoring rules and calibration without degradation", () => {
      const hit = makeHit("Conformal prediction and Brier score calibration", "Improving probability estimates for classifiers.");
      const res = scoreHit(hit);
      expect(res.verdict).toBe("admit");
      expect(res.law).toBe("04");
      expect(res.why).toContain("Owned by local CPU");
      expect(res.equation).toBe("BS = (1/n) Σ (p − y)²");
    });

    it("admits proper scoring rules with degradation warning brake", () => {
      const hit = makeHit("Isotonic calibration for probability forecast models", "Reports that calibration can worsen Brier score under shift.");
      const res = scoreHit(hit);
      expect(res.verdict).toBe("admit");
      expect(res.law).toBe("04");
      expect(res.why).toContain("reports that a calibrator can worsen a proper score");
      expect(res.equation).toBe("BS = (1/n) Σ (p − y)²");
    });

    it("admits change of support / ecological fallacy papers", () => {
      const hit = makeHit("Change of support and avoiding ecological fallacy", "Modeling spatial aggregation differences.");
      const res = scoreHit(hit);
      expect(res.verdict).toBe("admit");
      expect(res.law).toBe("02");
      expect(res.why).toContain("Admitted as the law of grain");
    });

    it("admits closing line value / devig models", () => {
      const hit = makeHit("De-vig methods and closing line value estimation", "Applying shin method to sportsbook odds.");
      const res = scoreHit(hit);
      expect(res.verdict).toBe("admit");
      expect(res.law).toBe("05");
      expect(res.why).toContain("Admitted to the closing-line shelf");
      expect(res.equation).toBe("CLV = d_bet / d_close − 1");
    });
  });

  describe("Grain derivation (grainOf)", () => {
    it("derives play grain", () => {
      const hit = makeHit("Play-by-play tracking data analysis", "Unrelated abstract");
      const res = scoreHit(hit);
      expect(res.grain).toBe("play");
    });

    it("derives week grain", () => {
      const hit = makeHit("Player-week weekly average statistics", "Unrelated abstract");
      const res = scoreHit(hit);
      expect(res.grain).toBe("week");
    });

    it("derives season grain", () => {
      const hit = makeHit("Season-long aggregate rates", "Unrelated abstract");
      const res = scoreHit(hit);
      expect(res.grain).toBe("season");
    });

    it("derives market grain", () => {
      const hit = makeHit("Betting market odds from sportsbook", "Unrelated abstract");
      const res = scoreHit(hit);
      expect(res.grain).toBe("market");
    });

    it("derives theory grain", () => {
      const hit = makeHit("Proper scoring rule and conformal calibration", "Unrelated abstract");
      const res = scoreHit(hit);
      expect(res.grain).toBe("theory");
    });

    it("derives decision grain", () => {
      const hit = makeHit("Fourth-down decision model", "Unrelated abstract");
      const res = scoreHit(hit);
      expect(res.grain).toBe("decision");
    });

    it("falls back to unspecified grain", () => {
      const hit = makeHit("Quantum physics experiment", "Unrelated abstract");
      const res = scoreHit(hit);
      expect(res.grain).toBe("unspecified");
    });
  });

  describe("Join key derivation (joinOf)", () => {
    it("derives gsis_id join key", () => {
      const hit = makeHit("Player dataset containing gsis identifier", "Unrelated abstract");
      const res = scoreHit(hit);
      expect(res.join).toBe("gsis_id");
    });

    it("derives game_id + play_id join key", () => {
      const hit = makeHit("Tracking dataset with game_id and play_id", "Unrelated abstract");
      const res = scoreHit(hit);
      expect(res.join).toBe("game_id + play_id");
    });

    it("derives player × week join key", () => {
      const hit = makeHit("Weekly player-week dataset", "Unrelated abstract");
      const res = scoreHit(hit);
      expect(res.join).toBe("player × week");
    });

    it("falls back to none join key", () => {
      const hit = makeHit("Theoretical computer science paper", "Unrelated abstract");
      const res = scoreHit(hit);
      expect(res.join).toBe("none");
    });
  });
});
