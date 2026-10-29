/**
 * Candidate baseline: the ONLY write target for pre-seal operators.
 *
 * The sealed center (week-2026-W44) is read-only. Pre-seal work accumulates in
 * candidates/2026-10-25-week7-candidate.json. A candidate is promoted to the
 * sealed center only by the explicit Tuesday seal step, which lives outside
 * this package and requires force=True to re-seal an already-sealed week.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { CandidateBaseline, TeamRating, PoolingParams, ConformalResult } from "./types.js";

/**
 * Repo root resolution.
 *
 * Tests run from packages/prediction-engine (3 levels below the repo root) and
 * ad-hoc runs often start at the repo root. Walk up until a directory that
 * contains both `packages/` and `artifacts/` is found.
 */
function findRepoRoot(): string {
  const cwdFn = Reflect.get(process, "cwd") as () => string;
  let dir = cwdFn.call(process);
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, "packages")) && existsSync(join(dir, "artifacts"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return cwdFn.call(process);
}

const REPO_ROOT = findRepoRoot();

export const CANDIDATE_PATH = join(
  REPO_ROOT,
  "candidates",
  "2026-10-25-week7-candidate.json",
);

/** Stable SHA-256 over canonical JSON. Order-insensitive at the key level. */
export function canonicalHash(obj: unknown): string {
  return createHash("sha256")
    .update(canonicalJson(obj), "utf8")
    .digest("hex");
}

export function canonicalJson(obj: unknown): string {
  return JSON.stringify(sortDeep(obj));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortDeep((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/** Load the candidate baseline, or null when no candidate exists yet. */
export function loadCandidate(): CandidateBaseline | null {
  if (!existsSync(CANDIDATE_PATH)) return null;
  const raw = readFileSync(CANDIDATE_PATH, "utf8");
  return JSON.parse(raw) as CandidateBaseline;
}

/**
 * Write (or update) the candidate baseline.
 *
 * Merge semantics: an operator may add or replace only its own top-level keys.
 * It may never drop a key another operator already wrote, and it may never
 * change parent_seal_hash — that is the link back to the read-only center.
 */
export function writeCandidate(
  operator: string,
  patch: Partial<CandidateBaseline>,
  parentSealHash: string,
): { path: string; hash: string; candidate: CandidateBaseline } {
  const prior = loadCandidate();
  if (prior && prior.parent_seal_hash !== parentSealHash) {
    throw new Error(
      `candidate baseline parent_seal_hash mismatch: candidate has ${prior.parent_seal_hash}, caller passed ${parentSealHash}`,
    );
  }

  const merged: CandidateBaseline = {
    candidate_id: "2026-10-25-week7",
    week: "2026-W44",
    written_at: new Date().toISOString(),
    ratings: [] as TeamRating[],
    params: { mu: 0, tau: 1, sigma: 13.5, hfa: 2.0 } as PoolingParams,
    ...(prior ?? {}),
    ...patch,
    parent_seal_hash: parentSealHash,
    operators_applied: Array.from(
      new Set([...(prior?.operators_applied ?? []), operator]),
    ).sort(),
  };

  mkdirSync(dirname(CANDIDATE_PATH), { recursive: true });
  writeFileSync(CANDIDATE_PATH, JSON.stringify(merged, null, 2), "utf8");
  return { path: CANDIDATE_PATH, hash: canonicalHash(merged), candidate: merged };
}

/** Convenience: hash the candidate as it currently sits on disk. */
export function candidateHash(): string | null {
  const c = loadCandidate();
  return c ? canonicalHash(c) : null;
}

export type { CandidateBaseline, ConformalResult };
