/**
 * Cross-language golden-digest fixture — TypeScript side.
 *
 * Mirrors canonical_payload.py. Both must hash the SAME payload to the SAME
 * SHA-256 or the Tuesday v1.0 seal is not verifiable across runtimes.
 *
 * The canonicalize() here is copied verbatim in behaviour from
 * src/public-baseline/cadence.ts — key-sorted, comma/colon separated,
 * JSON.stringify for primitives. Do NOT "improve" it; the Python mirror and
 * the golden digest both depend on this exact byte layout.
 */

import { createHash } from "node:crypto";

export const FIXTURE_PAYLOAD = {
  week: "2026-W44",
  payload: {
    teamRatings: { ATL: 0.0, SF: 2.5, KC: 1.0, SEA: -0.5 },
    costMatrixC: [
      [0.0, 1.0],
      [1.0, 0.0],
    ],
    tau: 0.0321,
    epaDropoffTable: {
      QB1: 0.78,
      QB_QUESTIONABLE: 0.8106,
      RB1: 0.85,
      WR1: 0.82,
      TE1: 0.84,
    },
    nested: { list: [1, 2.0, 3.5], empty: {}, none: null },
  },
} as const;

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map((v) => canonicalize(v)).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(",")}}`;
}

export function canonicalHash(obj: unknown): string {
  return createHash("sha256").update(canonicalize(obj)).digest("hex");
}

export const TS_DIGEST = canonicalHash(FIXTURE_PAYLOAD);
