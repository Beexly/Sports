/**
 * Load a committed pre-registration file. Refuses a candidate whose file
 * is not already on disk (stand-in for "already committed") or whose
 * kill line is not a number. Does not run any trial.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface PreRegistration {
  readonly hypothesis: string;
  readonly featureDefinition: string;
  readonly codeHash: string;
  readonly strata: readonly string[];
  readonly killLine: {
    readonly threshold: number;
    readonly confidenceLevel: number;
    readonly nFloor: number;
  };
  readonly familyId: string;
  readonly falseDiscoveryLevel: number;
  readonly placeboSpec: string;
}

export class PreRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreRegistrationError";
  }
}

export const FEATURE_TRIALS_DIR = "docs/calibration-proposals/feature-trials";

function assertNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PreRegistrationError(`${label} must be a finite number`);
  }
  return value;
}

function parse(raw: unknown, path: string): PreRegistration {
  if (!raw || typeof raw !== "object") {
    throw new PreRegistrationError(`malformed pre-registration at ${path}`);
  }
  const o = raw as Record<string, unknown>;
  const kill = o.killLine;
  if (!kill || typeof kill !== "object") {
    throw new PreRegistrationError(`kill line missing at ${path}`);
  }
  const k = kill as Record<string, unknown>;
  const required = [
    "hypothesis",
    "featureDefinition",
    "codeHash",
    "familyId",
    "placeboSpec",
  ] as const;
  for (const field of required) {
    if (typeof o[field] !== "string" || (o[field] as string).length === 0) {
      throw new PreRegistrationError(`${field} missing at ${path}`);
    }
  }
  if (!Array.isArray(o.strata)) {
    throw new PreRegistrationError(`stratum list missing at ${path}`);
  }
  return {
    hypothesis: o.hypothesis as string,
    featureDefinition: o.featureDefinition as string,
    codeHash: o.codeHash as string,
    strata: o.strata.map(String),
    killLine: {
      threshold: assertNumber(k.threshold, "killLine.threshold"),
      confidenceLevel: assertNumber(k.confidenceLevel, "killLine.confidenceLevel"),
      nFloor: assertNumber(k.nFloor, "killLine.nFloor"),
    },
    familyId: o.familyId as string,
    falseDiscoveryLevel: assertNumber(o.falseDiscoveryLevel, "falseDiscoveryLevel"),
    placeboSpec: o.placeboSpec as string,
  };
}

export function loadPreRegistration(
  candidateId: string,
  repoRoot: string,
): PreRegistration {
  const path = join(repoRoot, FEATURE_TRIALS_DIR, `${candidateId}.json`);
  if (!existsSync(path)) {
    throw new PreRegistrationError(`pre-registration not committed: ${path}`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new PreRegistrationError(`malformed pre-registration at ${path}`);
  }
  return parse(raw, path);
}
