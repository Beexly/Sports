#!/usr/bin/env node
/**
 * LSRQC KERNEL v1 — SRQC replay harness (offline, read-only).
 *
 * Reads a JSON array of ProjectableEvent (from a file path argument or stdin),
 * folds it with the pure `projectWindow`, applies the baseline IndInv predicate
 * (pendingCountClass GE2, or a rejected fingerprint on an unbound id), prints
 * the projected abstract states and any violations, and exits 1 if ANY
 * violation was projected, else 0. It performs NO writes and touches no
 * database or spec — it is a deterministic replay of the pure projection, for
 * eyeballing a captured window.
 *
 * Optional `--expect-version N` is printed for reference only (this harness
 * runs the pure baseline predicate and does not load a live certificate).
 *
 * Run:
 *   npx tsx scripts/srqc-replay.ts path/to/window.json
 *   cat window.json | npx tsx scripts/srqc-replay.ts
 *   npx tsx scripts/srqc-replay.ts --expect-version 2 window.json
 */

import { readFileSync } from "node:fs";

import { projectWindow } from "../apps/web/lib/ai-control-plane/srqc-projection";
import type {
  AbstractControlState,
  ProjectableEvent,
} from "../apps/web/lib/ai-control-plane/srqc-projection";

/** The baseline IndInv negation predicate (kept inline so the harness has no
 *  runtime dependency on the miner). */
export function isBaselineViolation(s: AbstractControlState): boolean {
  return (
    s.pendingCountClass === "GE2" || (s.hasRejectedFp && !s.fingerprintBound)
  );
}

export interface ReplayResult {
  readonly projected: readonly AbstractControlState[];
  readonly violations: readonly AbstractControlState[];
  /** 1 iff any violation was projected, else 0. */
  readonly exitCode: 0 | 1;
}

/** Pure replay core — projects the window and applies the baseline predicate. */
export function replayEvents(
  events: readonly ProjectableEvent[],
): ReplayResult {
  const projected = projectWindow(events);
  const violations = projected.filter(isBaselineViolation);
  return { projected, violations, exitCode: violations.length > 0 ? 1 : 0 };
}

function parseEvents(text: string): readonly ProjectableEvent[] {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error("srqc-replay: input must be a JSON array of ProjectableEvent");
  }
  return parsed as ProjectableEvent[];
}

function main(): void {
  const argv = process.argv.slice(2);
  let expectVersion: string | null = null;
  let filePath: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === "--expect-version") {
      expectVersion = argv[i + 1] ?? null;
      i += 1;
    } else if (!arg.startsWith("--")) {
      filePath = arg;
    }
  }

  const text =
    filePath !== null ? readFileSync(filePath, "utf8") : readFileSync(0, "utf8");
  const events = parseEvents(text);
  const result = replayEvents(events);

  if (expectVersion !== null) {
    // eslint-disable-next-line no-console
    console.log(`[srqc-replay] --expect-version ${expectVersion} (reference only)`);
  }
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        projected: result.projected,
        violations: result.violations,
        violationCount: result.violations.length,
      },
      null,
      2,
    ),
  );
  process.exit(result.exitCode);
}

// Run only when invoked directly (not when imported by a test for its core).
const invokedPath = process.argv[1] ?? "";
if (invokedPath.endsWith("srqc-replay.ts") || invokedPath.endsWith("srqc-replay.js")) {
  main();
}
