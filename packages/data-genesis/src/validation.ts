/**
 * Shared validators used across the engine (and especially by the promotion gate). Pure predicates,
 * no side effects — they return lists of problems or booleans, never throw on bad data.
 */

import { isReceiptValid } from "./receipt.js";
import { isSignalId } from "./brands.js";
import type { SyntheticSignal, SignalValidationStatus } from "./signal.js";

/** A signal may be considered for promotion only from `candidate` or `validated`. */
export function isPromotableStatus(status: SignalValidationStatus): boolean {
  return status === "candidate" || status === "validated";
}

/** Structural validation of a SyntheticSignal. Returns problems; empty = OK. */
export function validateSyntheticSignal(signal: SyntheticSignal): string[] {
  const problems: string[] = [];
  if (!isSignalId(signal.signalId)) problems.push("signalId is not namespaced");
  if (!Number.isFinite(signal.confidence) || signal.confidence < 0 || signal.confidence > 1) {
    problems.push("confidence is out of [0,1]");
  }
  if (!Number.isFinite(signal.uncertainty) || signal.uncertainty < 0 || signal.uncertainty > 1) {
    problems.push("uncertainty is out of [0,1]");
  }
  if (!signal.engineVersion || signal.engineVersion.trim().length === 0) {
    problems.push("missing engineVersion");
  }
  if (!isReceiptValid(signal.receipt)) problems.push("receipt is not valid");
  return problems;
}
