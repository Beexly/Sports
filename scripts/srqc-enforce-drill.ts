#!/usr/bin/env tsx
/**
 * SRQC ENFORCE drill — lab/staging-only, opt-in via SRQC_DRILL=1.
 *
 * ██ THIS SCRIPT DOES NOT TOUCH ANY DB, LIVE TRAFFIC, OR FEATURE FLAG. ██
 *
 * There is no surface registry or live ramp mechanism in this repo (see
 * docs/ops/ENFORCE_RAMP.md) for this script to wire into even if it tried
 * to. What it DOES do:
 *
 *   1. Builds a synthetic ledger-event window that projects a GE2 violation
 *      (two attempts concurrently pending on the same invocation — the
 *      exact forbidden shape `srqc-projection.ts` detects).
 *   2. Sets `SRQC_ENFORCE=1` in a plain object passed to
 *      `evaluateSrqcAdmissionForLab` as its OWN, explicit `env` argument —
 *      never `process.env` itself, so this script never mutates the real
 *      process environment either. Asserts the result is `REFUSE`.
 *   3. Calls `admitUnderSRQC` directly on the SAME synthetic events with the
 *      default `mode` (SHADOW). Asserts the result is still `ADMIT` —
 *      proving SHADOW-by-default is completely unaffected by this drill.
 *   4. Prints one JSON line describing the outcome.
 *
 * Exit codes: 2 if SRQC_DRILL is not "1" (refuses to run at all outside an
 * explicit opt-in); 0 on pass; 1 on any assertion failure.
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  admitUnderSRQC,
  evaluateSrqcAdmissionForLab,
  type ProjectableEvent,
  type SrqcEnvLike,
} from "../apps/web/lib/ai-control-plane/srqc-projection";

/** A synthetic window with two attempts concurrently PENDING on one invocation. */
export function buildGe2DrillWindow(): readonly ProjectableEvent[] {
  const invocationId = "srqc-drill-invocation-1";
  return [
    {
      eventType: "ATTEMPT_STARTED",
      source: "ai_attempt",
      sourceId: "srqc-drill-attempt-a",
      payload: { invocationId, attemptId: "srqc-drill-attempt-a" },
    },
    {
      eventType: "ATTEMPT_STARTED",
      source: "ai_attempt",
      sourceId: "srqc-drill-attempt-b",
      payload: { invocationId, attemptId: "srqc-drill-attempt-b" },
    },
  ];
}

export interface DrillResult {
  readonly kind: "srqc_enforce_drill";
  readonly passed: boolean;
  readonly at: string;
  readonly ge2Detected: boolean;
  readonly enforceRefused: boolean;
  readonly shadowStillAdmits: boolean;
  /** Populated only when `passed` is false, for operator diagnosis. */
  readonly failures?: readonly string[];
}

/**
 * Core drill assertion logic, factored out so it is unit-testable without
 * spawning a process or touching real env. Pure aside from the `now`
 * default (overridable for deterministic tests).
 */
export function runSrqcEnforceDrill(now: Date = new Date()): DrillResult {
  const events = buildGe2DrillWindow();
  const failures: string[] = [];

  // Step 2: ENFORCE, via an explicit synthetic env object — never process.env.
  const enforceEnv: SrqcEnvLike = { SRQC_ENFORCE: "1" };
  const enforceResult = evaluateSrqcAdmissionForLab(events, enforceEnv);
  const ge2Detected = enforceResult.violations.some(
    (v) => v.pendingCountClass === "GE2",
  );
  if (!ge2Detected) {
    failures.push("synthetic window did not project a GE2 violation");
  }
  const enforceRefused = enforceResult.decision === "REFUSE";
  if (!enforceRefused) {
    failures.push(
      `expected ENFORCE decision REFUSE, got ${enforceResult.decision}`,
    );
  }

  // Step 3: default mode (SHADOW) on the SAME events must still ADMIT.
  const shadowResult = admitUnderSRQC(events);
  const shadowStillAdmits = shadowResult.decision === "ADMIT";
  if (!shadowStillAdmits) {
    failures.push(
      `expected default-mode (SHADOW) decision ADMIT, got ${shadowResult.decision}`,
    );
  }

  const passed = failures.length === 0;
  return {
    kind: "srqc_enforce_drill",
    passed,
    at: now.toISOString(),
    ge2Detected,
    enforceRefused,
    shadowStillAdmits,
    ...(passed ? {} : { failures }),
  };
}

function main(): void {
  if (process.env.SRQC_DRILL !== "1") {
    process.exit(2);
  }

  const result = runSrqcEnforceDrill();
  console.log(JSON.stringify(result));
  process.exit(result.passed ? 0 : 1);
}

const scriptPath = fileURLToPath(import.meta.url);
const isDirectRun =
  process.argv[1] !== undefined && resolve(process.argv[1]) === scriptPath;
if (isDirectRun) {
  main();
}
