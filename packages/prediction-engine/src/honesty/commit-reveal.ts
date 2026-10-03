/**
 * First-party commit-reveal for the public pick ledger.
 *
 * Inspired by sooth's commit-reveal idea, not a port (no SPDX on that repo).
 * Uses the existing glass-receipts FNV-1a fingerprint so the chain and the
 * commitment speak the same language.
 *
 * PUBLIC SURFACE is inert unless PUBLIC_PICKS_ENABLED=true. Core commit/reveal
 * functions always run so tests can prove the math without flipping the flag.
 * Do not treat a successful local reveal as a license to publish picks.
 */

import { fingerprintPayload } from "./glass-receipts.js";

export interface PickCommitmentBody {
  readonly pickId: string;
  readonly sport: string;
  readonly market: string;
  readonly selection: string;
  readonly modelVersion: string;
  readonly committedAt: string;
  readonly line: string;
  readonly edgeIndex: string;
}

export interface PickCommitment {
  readonly commitment: string;
  readonly salt: string;
  readonly committedAt: string;
}

export function isPublicPicksEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env["PUBLIC_PICKS_ENABLED"] === "true";
}

function canonicalBody(body: PickCommitmentBody, salt: string): string {
  return [
    body.pickId,
    body.sport,
    body.market,
    body.selection,
    body.modelVersion,
    body.committedAt,
    body.line,
    body.edgeIndex,
    salt,
  ].join("|");
}

/** Bind a pick at lock time. Salt is caller-supplied so tests stay deterministic. */
export function commitPick(body: PickCommitmentBody, salt: string): PickCommitment {
  if (!salt) {
    throw new Error("commitPick: salt required (do not invent one).");
  }
  return {
    commitment: fingerprintPayload(canonicalBody(body, salt)),
    salt,
    committedAt: body.committedAt,
  };
}

/** Recompute the commitment; true iff the revealed body+salt match. */
export function revealPick(
  commitment: string,
  body: PickCommitmentBody,
  salt: string,
): boolean {
  if (!commitment || !salt) return false;
  return fingerprintPayload(canonicalBody(body, salt)) === commitment;
}

/**
 * Public-ledger wrapper. Returns null while PUBLIC_PICKS_ENABLED is off so a
 * caller cannot accidentally publish a commitment on a dark flag.
 */
export function publicCommitPick(
  body: PickCommitmentBody,
  salt: string,
  env: Record<string, string | undefined> = process.env,
): PickCommitment | null {
  if (!isPublicPicksEnabled(env)) return null;
  return commitPick(body, salt);
}
