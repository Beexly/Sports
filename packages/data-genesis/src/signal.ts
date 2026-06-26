/**
 * SyntheticSignal — the unit of synthetic intelligence in GSE.
 *
 * Anything generated, inferred, modeled, or AI-assisted (i.e. not a directly observed fact) becomes a
 * SyntheticSignal before it is allowed anywhere near picks, content, dashboards, confidence, pricing,
 * or promotion. Every signal carries a GenesisReceipt and an explicit `validationStatus`. A signal is
 * inert by default: only `promoteSignal` (promotion.ts) may set the status to `promoted`, and only
 * after the full gate passes.
 */

import type { GenesisReceipt } from "./receipt.js";
import type { SignalId } from "./brands.js";

export type SignalValidationStatus =
  | "draft"
  | "candidate"
  | "validated"
  | "promoted"
  | "rejected";

export type SignalDomain =
  | "odds"
  | "market"
  | "team"
  | "player"
  | "injury"
  | "weather"
  | "schedule"
  | "narrative"
  | "projection"
  | "calibration"
  | "edge"
  | "clv"
  | "content"
  | "unknown";

export interface SyntheticSignal<TValue = unknown> {
  signalId: SignalId;
  domain: SignalDomain;
  name: string;
  value: TValue;
  /** Subjective strength in [0,1] — NOT a calibrated probability until calibration proves it. */
  confidence: number;
  /** Self-reported uncertainty in [0,1]. */
  uncertainty: number;
  /** Injected ISO timestamp. */
  generatedAt: string;
  modelVersion?: string;
  engineVersion: string;
  receipt: GenesisReceipt;
  validationStatus: SignalValidationStatus;
  tags: readonly string[];
  notes?: string;
}

/** Domains whose value represents (or directly drives) a probability — calibration is mandatory. */
export const PROBABILISTIC_DOMAINS: ReadonlySet<SignalDomain> = new Set<SignalDomain>([
  "odds",
  "market",
  "projection",
  "calibration",
  "edge",
  "clv",
]);

export interface CreateSyntheticSignalArgs<TValue> {
  signalId: SignalId;
  domain: SignalDomain;
  name: string;
  value: TValue;
  confidence: number;
  uncertainty: number;
  generatedAt: string;
  engineVersion: string;
  modelVersion?: string;
  receipt: GenesisReceipt;
  /** Defaults to `draft`. May never be `promoted` here — promotion is gated elsewhere. */
  validationStatus?: Exclude<SignalValidationStatus, "promoted">;
  tags?: readonly string[];
  notes?: string;
}

function assert01(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`SyntheticSignal: ${field} must be in [0,1], received ${value}`);
  }
}

/**
 * Construct a SyntheticSignal with validated bounds. confidence/uncertainty are clamped-by-rejection
 * (out-of-range throws, never silently coerces). A new signal can never be born `promoted`.
 */
export function createSyntheticSignal<TValue>(
  args: CreateSyntheticSignalArgs<TValue>,
): SyntheticSignal<TValue> {
  assert01(args.confidence, "confidence");
  assert01(args.uncertainty, "uncertainty");

  const signal: SyntheticSignal<TValue> = {
    signalId: args.signalId,
    domain: args.domain,
    name: args.name,
    value: args.value,
    confidence: args.confidence,
    uncertainty: args.uncertainty,
    generatedAt: args.generatedAt,
    engineVersion: args.engineVersion,
    receipt: args.receipt,
    validationStatus: args.validationStatus ?? "draft",
    tags: [...(args.tags ?? [])],
  };
  if (args.modelVersion !== undefined) signal.modelVersion = args.modelVersion;
  if (args.notes !== undefined) signal.notes = args.notes;
  return signal;
}

/** Whether this signal's promotion must be backed by calibration evidence. */
export function requiresCalibrationEvidence(
  signal: SyntheticSignal,
  highConfidenceThreshold = 0.7,
): boolean {
  return (
    PROBABILISTIC_DOMAINS.has(signal.domain) ||
    signal.confidence >= highConfidenceThreshold ||
    signal.tags.includes("probabilistic")
  );
}

/**
 * Reject a signal, preserving its receipt and recording the failure reasons. A rejected signal is kept
 * (not discarded) so the autopsy trail survives.
 */
export function rejectSignal<TValue>(
  signal: SyntheticSignal<TValue>,
  reasons: readonly string[],
): SyntheticSignal<TValue> {
  const note = reasons.length > 0 ? `rejected: ${reasons.join("; ")}` : "rejected";
  return {
    ...signal,
    validationStatus: "rejected",
    notes: signal.notes ? `${signal.notes} | ${note}` : note,
  };
}
