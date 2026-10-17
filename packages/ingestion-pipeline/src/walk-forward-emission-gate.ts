/**
 * Emission gate. passed === true is the only open state.
 * A missing file, a parse error, or passed: false all block.
 * Tests that still need to exercise minting pass an explicit override.
 * This module does not write Pick rows.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type EmissionGate = { readonly passed: boolean };

const CANDIDATES = [
  join(process.cwd(), "walk-forward-gate.json"),
  join(process.cwd(), "packages", "ingestion-pipeline", "walk-forward-gate.json"),
];

export function readEmissionGate(): EmissionGate {
  for (const path of CANDIDATES) {
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8")) as { passed?: unknown };
      return { passed: parsed.passed === true };
    } catch {
      // try the next path; a missing file is closed
    }
  }
  return { passed: false };
}

export function emissionBlocked(override?: EmissionGate): boolean {
  const gate = override ?? readEmissionGate();
  return gate.passed !== true;
}

export function zeroEmissionNote(): string {
  return "emission gate closed: 0 picks, 0 parlays, 0 DFS. No moneyline upsert from independent fairs.";
}
