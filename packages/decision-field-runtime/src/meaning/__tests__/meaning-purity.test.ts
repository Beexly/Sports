/**
 * Meaning Compiler — purity guard. The compiler must be deterministic and fixture-safe: no clock, no
 * randomness, no network, no env. (Math.imul in the id hash is fine; Math.random is not.)
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

// Resolved from the repo root (vitest runs there); avoids import.meta so the package tsc stays happy.
const meaningDir = resolve(process.cwd(), "packages/decision-field-runtime/src/meaning");
const BANNED = /\bDate\.now\b|\bMath\.random\b|\bnew Date\(|\bfetch\(|\bprocess\.env\b|\bsetTimeout\b/;

describe("meaning/* is pure and deterministic", () => {
  const files = readdirSync(meaningDir).filter((f) => f.endsWith(".ts"));

  it("scans more than one source file", () => {
    expect(files.length).toBeGreaterThan(1);
  });

  for (const f of files) {
    it(`${f} contains no clock/random/network/env`, () => {
      const src = readFileSync(resolve(meaningDir, f), "utf8");
      const hit = src.match(BANNED);
      if (hit) throw new Error(`${f} contains forbidden non-determinism: "${hit[0]}"`);
      expect(hit).toBeNull();
    });
  }
});
