/**
 * Expected-metrics adapters — real computation from win-probability,
 * success-rate, expected-completion, expected-yac, and validation modules.
 *
 * Each adapter invokes the real exported function. Fail-closed on
 * missing input. No fake data.
 */

import type { AdapterResult } from "./universal-adapter.js";
import {
  predictWinProbability,
  type WinProbabilityModel,
  type WpPlay,
} from "../expected-metrics/win-probability.js";
import {
  isSuccessfulPlay,
  type SuccessPlay,
} from "../expected-metrics/success-rate.js";
import {
  predictCompletionProbability,
  computeCpoe,
  type ExpectedCompletionModel,
  type DropbackPlay,
} from "../expected-metrics/expected-completion.js";
import {
  predictExpectedYac,
  computeYacOverExpected,
  type ExpectedYacModel,
  type CatchPlay,
} from "../expected-metrics/expected-yac.js";
import {
  buildCalibrationReport,
  graduationVerdict,
} from "../expected-metrics/validation.js";

const NOW_ISO = (): string => new Date().toISOString();

// ── Win probability ────────────────────────────────────────────────────────

export function winProbabilityAdapter(
  input: {
    readonly model: WinProbabilityModel | null | undefined;
    readonly play: WpPlay | null | undefined;
  } | null | undefined,
): AdapterResult {
  if (!input || !input.model || !input.play) {
    return {
      failClosed: true,
      reason: "missing win-probability model or play",
      source: "expected-metrics:win-probability",
    };
  }
  try {
    const p = predictWinProbability(input.model, input.play);
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      return {
        failClosed: true,
        reason: "predictWinProbability returned value outside [0,1]",
        source: "expected-metrics:win-probability",
      };
    }
    return {
      source: "expected-metrics:win-probability",
      asOf: NOW_ISO(),
      value: Number(p.toFixed(4)),
      confidence: 0.8,
      provenance:
        "packages/prediction-engine/src/expected-metrics/win-probability.ts#predictWinProbability",
      family: "MARKET",
      raw: { winProb: Number(p.toFixed(4)) },
    };
  } catch {
    return {
      failClosed: true,
      reason: "predictWinProbability threw",
      source: "expected-metrics:win-probability",
    };
  }
}

// ── Success rate ───────────────────────────────────────────────────────────

export function successfulPlayAdapter(
  input: SuccessPlay | null | undefined,
): AdapterResult {
  if (!input) {
    return {
      failClosed: true,
      reason: "missing success play",
      source: "expected-metrics:successful-play",
    };
  }
  try {
    const s = isSuccessfulPlay(input);
    return {
      source: "expected-metrics:successful-play",
      asOf: NOW_ISO(),
      value: s, // may be null when unclassifiable — fail-closed on the observation side
      confidence: s === null ? 0 : 0.9,
      provenance:
        "packages/prediction-engine/src/expected-metrics/success-rate.ts#isSuccessfulPlay",
      family: "PLAY_CHARTING",
      raw: { successful: s },
    };
  } catch {
    return {
      failClosed: true,
      reason: "isSuccessfulPlay threw",
      source: "expected-metrics:successful-play",
    };
  }
}

// ── Expected completion / CPOE ─────────────────────────────────────────────

export function completionProbabilityAdapter(
  input: {
    readonly model: ExpectedCompletionModel | null | undefined;
    readonly play: DropbackPlay | null | undefined;
  } | null | undefined,
): AdapterResult {
  if (!input || !input.model || !input.play) {
    return {
      failClosed: true,
      reason: "missing expected-completion model or dropback play",
      source: "expected-metrics:completion-probability",
    };
  }
  try {
    const p = predictCompletionProbability(input.model, input.play);
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      return {
        failClosed: true,
        reason: "completion probability outside [0,1]",
        source: "expected-metrics:completion-probability",
      };
    }
    return {
      source: "expected-metrics:completion-probability",
      asOf: NOW_ISO(),
      value: Number(p.toFixed(4)),
      confidence: 0.8,
      provenance:
        "packages/prediction-engine/src/expected-metrics/expected-completion.ts#predictCompletionProbability",
      family: "PLAY_CHARTING",
      raw: { pComplete: Number(p.toFixed(4)) },
    };
  } catch {
    return {
      failClosed: true,
      reason: "predictCompletionProbability threw",
      source: "expected-metrics:completion-probability",
    };
  }
}

export function cpoeAdapter(
  input: {
    readonly model: ExpectedCompletionModel | null | undefined;
    readonly plays: readonly DropbackPlay[];
  } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !input.model ||
    !Array.isArray(input.plays) ||
    input.plays.length === 0
  ) {
    return {
      failClosed: true,
      reason: "missing model or empty dropback plays",
      source: "expected-metrics:cpoe",
    };
  }
  try {
    const cpoe = computeCpoe(input.model, [...input.plays]);
    return {
      source: "expected-metrics:cpoe",
      asOf: NOW_ISO(),
      value: Number(cpoe.toFixed(4)),
      confidence: 0.75,
      provenance:
        "packages/prediction-engine/src/expected-metrics/expected-completion.ts#computeCpoe",
      family: "PLAY_CHARTING",
      raw: { cpoe: Number(cpoe.toFixed(4)), n: input.plays.length },
    };
  } catch {
    return {
      failClosed: true,
      reason: "computeCpoe threw",
      source: "expected-metrics:cpoe",
    };
  }
}

// ── Expected YAC ───────────────────────────────────────────────────────────

export function expectedYacAdapter(
  input: {
    readonly model: ExpectedYacModel | null | undefined;
    readonly play: CatchPlay | null | undefined;
  } | null | undefined,
): AdapterResult {
  if (!input || !input.model || !input.play) {
    return {
      failClosed: true,
      reason: "missing expected-YAC model or catch play",
      source: "expected-metrics:expected-yac",
    };
  }
  try {
    const yac = predictExpectedYac(input.model, input.play);
    if (!Number.isFinite(yac)) {
      return {
        failClosed: true,
        reason: "expected YAC non-finite",
        source: "expected-metrics:expected-yac",
      };
    }
    return {
      source: "expected-metrics:expected-yac",
      asOf: NOW_ISO(),
      value: Number(yac.toFixed(3)),
      confidence: 0.75,
      provenance:
        "packages/prediction-engine/src/expected-metrics/expected-yac.ts#predictExpectedYac",
      family: "PLAY_CHARTING",
      raw: { expectedYac: Number(yac.toFixed(3)) },
    };
  } catch {
    return {
      failClosed: true,
      reason: "predictExpectedYac threw",
      source: "expected-metrics:expected-yac",
    };
  }
}

export function yacOverExpectedAdapter(
  input: {
    readonly model: ExpectedYacModel | null | undefined;
    readonly plays: readonly CatchPlay[];
  } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !input.model ||
    !Array.isArray(input.plays) ||
    input.plays.length === 0
  ) {
    return {
      failClosed: true,
      reason: "missing model or empty catch plays",
      source: "expected-metrics:yac-over-expected",
    };
  }
  try {
    const yoe = computeYacOverExpected(input.model, [...input.plays]);
    return {
      source: "expected-metrics:yac-over-expected",
      asOf: NOW_ISO(),
      value: Number(yoe.toFixed(3)),
      confidence: 0.75,
      provenance:
        "packages/prediction-engine/src/expected-metrics/expected-yac.ts#computeYacOverExpected",
      family: "PLAY_CHARTING",
      raw: { yacOverExpected: Number(yoe.toFixed(3)), n: input.plays.length },
    };
  } catch {
    return {
      failClosed: true,
      reason: "computeYacOverExpected threw",
      source: "expected-metrics:yac-over-expected",
    };
  }
}

// ── Validation / calibration report ────────────────────────────────────────

export function calibrationReportAdapter(
  input: {
    readonly predicted: readonly number[];
    readonly actual: readonly number[];
  } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Array.isArray(input.predicted) ||
    !Array.isArray(input.actual) ||
    input.predicted.length === 0 ||
    input.predicted.length !== input.actual.length
  ) {
    return {
      failClosed: true,
      reason: "predicted/actual must align and be non-empty",
      source: "expected-metrics:calibration-report",
    };
  }
  try {
    const report = buildCalibrationReport([...input.predicted], [...input.actual]);
    return {
      source: "expected-metrics:calibration-report",
      asOf: NOW_ISO(),
      value: report.brier ?? report.rmse ?? null,
      confidence: 0.9,
      provenance:
        "packages/prediction-engine/src/expected-metrics/validation.ts#buildCalibrationReport",
      family: "CALIBRATION_HISTORY",
      raw: { ...report, n: input.predicted.length },
    };
  } catch {
    return {
      failClosed: true,
      reason: "buildCalibrationReport threw",
      source: "expected-metrics:calibration-report",
    };
  }
}

export function graduationVerdictAdapter(
  input: {
    readonly predicted: readonly number[];
    readonly actual: readonly number[];
  } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Array.isArray(input.predicted) ||
    !Array.isArray(input.actual) ||
    input.predicted.length < 2 ||
    input.predicted.length !== input.actual.length
  ) {
    return {
      failClosed: true,
      reason: "predicted/actual must align, length >= 2",
      source: "expected-metrics:graduation-verdict",
    };
  }
  try {
    const v = graduationVerdict([...input.predicted], [...input.actual]);
    return {
      source: "expected-metrics:graduation-verdict",
      asOf: NOW_ISO(),
      value: typeof v === "boolean" ? v : String(v),
      confidence: 0.85,
      provenance:
        "packages/prediction-engine/src/expected-metrics/validation.ts#graduationVerdict",
      family: "CALIBRATION_HISTORY",
      raw: { verdict: v },
    };
  } catch {
    return {
      failClosed: true,
      reason: "graduationVerdict threw",
      source: "expected-metrics:graduation-verdict",
    };
  }
}

// ── Registry ───────────────────────────────────────────────────────────────

export const EXPECTED_METRICS_ADAPTERS = {
  winProbability: winProbabilityAdapter,
  successfulPlay: successfulPlayAdapter,
  completionProbability: completionProbabilityAdapter,
  cpoe: cpoeAdapter,
  expectedYac: expectedYacAdapter,
  yacOverExpected: yacOverExpectedAdapter,
  calibrationReport: calibrationReportAdapter,
  graduationVerdict: graduationVerdictAdapter,
} as const;

export type ExpectedMetricsAdapterName = keyof typeof EXPECTED_METRICS_ADAPTERS;

export type {
  WinProbabilityModel,
  WpPlay,
  SuccessPlay,
  ExpectedCompletionModel,
  DropbackPlay,
  ExpectedYacModel,
  CatchPlay,
};
