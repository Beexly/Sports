import { describe, it, expect } from "vitest";
import {
  buildCalibrationInsightUserPrompt,
  CALIBRATION_INSIGHT_SYSTEM_PROMPT,
  type CalibrationInsightInput,
} from "@/lib/calibration-training/insight-prompt";

function baseInput(overrides: Partial<CalibrationInsightInput> = {}): CalibrationInsightInput {
  return {
    userId: "user_test",
    weekOfYear: 22,
    yearOf: 2026,
    totalEstimates: 30,
    bandData: {
      "60-70": { sampleSize: 12, actualWinRate: 0.65, userMidpoint: 65 },
    },
    perSportData: {
      NBA: { sampleSize: 10, calibrationDelta: -5.2, direction: "OVER" },
    },
    perPickKindData: {
      SPREAD: { sampleSize: 8, calibrationDelta: 3.1, direction: "UNDER" },
    },
    ...overrides,
  };
}

describe("CALIBRATION_INSIGHT_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof CALIBRATION_INSIGHT_SYSTEM_PROMPT).toBe("string");
    expect(CALIBRATION_INSIGHT_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });

  it("contains the voice rules section", () => {
    expect(CALIBRATION_INSIGHT_SYSTEM_PROMPT).toContain("VOICE RULES");
  });

  it("contains the prohibited section", () => {
    expect(CALIBRATION_INSIGHT_SYSTEM_PROMPT).toContain("PROHIBITED");
  });

  it("specifies 25-word limit", () => {
    expect(CALIBRATION_INSIGHT_SYSTEM_PROMPT).toContain("25 words");
  });
});

describe("buildCalibrationInsightUserPrompt — header fields", () => {
  it("includes the week of year and year", () => {
    const prompt = buildCalibrationInsightUserPrompt(baseInput({ weekOfYear: 22, yearOf: 2026 }));
    expect(prompt).toContain("week 22 of 2026");
  });

  it("includes the total estimates count", () => {
    const prompt = buildCalibrationInsightUserPrompt(baseInput({ totalEstimates: 47 }));
    expect(prompt).toContain("Total estimates: 47");
  });

  it("ends with the generation directive", () => {
    const prompt = buildCalibrationInsightUserPrompt(baseInput());
    expect(prompt.trim().endsWith("Produce the one-sentence insight now.")).toBe(true);
  });
});

describe("buildCalibrationInsightUserPrompt — band data formatting", () => {
  it("formats a band row as 'band: estimated N%, actual M% (sample K)'", () => {
    const prompt = buildCalibrationInsightUserPrompt(
      baseInput({
        bandData: {
          "70-80": { sampleSize: 15, actualWinRate: 0.73, userMidpoint: 75 },
        },
      })
    );
    expect(prompt).toContain("70-80: estimated 75%, actual 0.73% (sample 15)");
  });

  it("includes all band rows when multiple bands are present", () => {
    const prompt = buildCalibrationInsightUserPrompt(
      baseInput({
        bandData: {
          "60-70": { sampleSize: 8, actualWinRate: 0.60, userMidpoint: 65 },
          "70-80": { sampleSize: 12, actualWinRate: 0.74, userMidpoint: 75 },
        },
      })
    );
    expect(prompt).toContain("60-70:");
    expect(prompt).toContain("70-80:");
  });

  it("shows '(insufficient data)' when bandData is empty", () => {
    const prompt = buildCalibrationInsightUserPrompt(baseInput({ bandData: {} }));
    expect(prompt).toContain("(insufficient data)");
  });
});

describe("buildCalibrationInsightUserPrompt — sport data filtering", () => {
  it("includes sport rows with sampleSize >= 5", () => {
    const prompt = buildCalibrationInsightUserPrompt(
      baseInput({
        perSportData: {
          NBA: { sampleSize: 5, calibrationDelta: -4.0, direction: "OVER" },
        },
      })
    );
    expect(prompt).toContain("NBA:");
  });

  it("excludes sport rows with sampleSize < 5", () => {
    const prompt = buildCalibrationInsightUserPrompt(
      baseInput({
        perSportData: {
          NFL: { sampleSize: 4, calibrationDelta: 2.0, direction: "UNDER" },
        },
      })
    );
    expect(prompt).not.toContain("NFL:");
    expect(prompt).toContain("no sport had a meaningful sample this week");
  });

  it("shows fallback when all sports are below the threshold", () => {
    const prompt = buildCalibrationInsightUserPrompt(
      baseInput({
        perSportData: {
          MLB: { sampleSize: 3, calibrationDelta: 1.5, direction: "WELL_CALIBRATED" },
          CFB: { sampleSize: 2, calibrationDelta: 0.0, direction: "WELL_CALIBRATED" },
        },
      })
    );
    expect(prompt).toContain("no sport had a meaningful sample this week");
  });

  it("shows fallback when perSportData is empty", () => {
    const prompt = buildCalibrationInsightUserPrompt(baseInput({ perSportData: {} }));
    expect(prompt).toContain("no sport had a meaningful sample this week");
  });

  it("formats sport row with direction and delta", () => {
    const prompt = buildCalibrationInsightUserPrompt(
      baseInput({
        perSportData: {
          NBA: { sampleSize: 10, calibrationDelta: -8.3, direction: "OVER" },
        },
      })
    );
    expect(prompt).toContain("NBA: OVER, delta -8.3% (sample 10)");
  });
});

describe("buildCalibrationInsightUserPrompt — pick kind data filtering", () => {
  it("includes pick-kind rows with sampleSize >= 5", () => {
    const prompt = buildCalibrationInsightUserPrompt(
      baseInput({
        perPickKindData: {
          MONEYLINE: { sampleSize: 6, calibrationDelta: 2.5, direction: "UNDER" },
        },
      })
    );
    expect(prompt).toContain("MONEYLINE:");
  });

  it("excludes pick-kind rows with sampleSize < 5", () => {
    const prompt = buildCalibrationInsightUserPrompt(
      baseInput({
        perPickKindData: {
          TOTAL: { sampleSize: 3, calibrationDelta: 1.0, direction: "WELL_CALIBRATED" },
        },
      })
    );
    expect(prompt).not.toContain("TOTAL:");
    expect(prompt).toContain("no pick kind had a meaningful sample this week");
  });

  it("shows fallback when perPickKindData is empty", () => {
    const prompt = buildCalibrationInsightUserPrompt(baseInput({ perPickKindData: {} }));
    expect(prompt).toContain("no pick kind had a meaningful sample this week");
  });

  it("formats pick-kind row with WELL_CALIBRATED direction", () => {
    const prompt = buildCalibrationInsightUserPrompt(
      baseInput({
        perPickKindData: {
          SPREAD: { sampleSize: 20, calibrationDelta: 0.5, direction: "WELL_CALIBRATED" },
        },
      })
    );
    expect(prompt).toContain("SPREAD: WELL_CALIBRATED, delta 0.5% (sample 20)");
  });
});
