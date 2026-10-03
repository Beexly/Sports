import { ForensicReportInputSchema, type ForensicReportOutput } from "./schemas";

export type ForensicDemoOutput = ForensicReportOutput;

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function buildForensicDemoReport(raw: unknown): ForensicDemoOutput {
  const input = ForensicReportInputSchema.parse(raw);
  const probabilityDelta = input.current_model_probability - input.market_open_probability;
  const gseFlags: string[] = [];

  if (Math.abs(probabilityDelta) >= 0.08) {
    gseFlags.push("model-market probability disagreement");
  }
  if (input.features.some((feature) => feature.name === "injury_timing_delta")) {
    gseFlags.push("public event timing changed after market open");
  }
  if (input.features.some((feature) => feature.name === "depth_chart_instability")) {
    gseFlags.push("depth chart instability requires review");
  }

  return {
    fixture_id: input.fixture_id,
    gse_flags: gseFlags,
    probability_delta: round(probabilityDelta),
    uncertainty_flag: gseFlags.length > 0,
    would_not_claim: [
      "betting edge",
      "prediction superiority",
      "live market accuracy",
      "official tracking-data equivalence",
    ],
  };
}
