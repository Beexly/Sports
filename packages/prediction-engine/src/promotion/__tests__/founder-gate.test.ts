/**
 * Contract §5 invariant #6 — "Founder gate": the module exports NO function
 * that touches MODEL_VERSION, and the decision's verdict is ELIGIBLE or
 * NOT_ELIGIBLE and nothing else. Applying a promotion to a live model
 * remains a separate, founder-applied step outside this module.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Verdict } from "../types.js";

// __dirname (CommonJS) rather than import.meta.url — this package's
// tsconfig targets module: CommonJS, where import.meta is not allowed.
const PROMOTION_DIR = dirname(__dirname);

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "__tests__") continue; // the grep is over the module's own source, not this test suite
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (entry.name.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("founder gate — MODEL_VERSION is never touched by this module", () => {
  it("grep: zero occurrences of MODEL_VERSION across every promotion source file", () => {
    const files = listSourceFiles(PROMOTION_DIR);
    expect(files.length).toBeGreaterThan(0);

    const hits: { file: string; line: number; text: string }[] = [];
    for (const file of files) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (line.includes("MODEL_VERSION")) {
          hits.push({ file, line: i + 1, text: line.trim() });
        }
      });
    }

    expect(hits).toEqual([]);
  });

  it("Verdict is a closed union of exactly ELIGIBLE | NOT_ELIGIBLE (compile-time exhaustiveness)", () => {
    function assertVerdict(v: Verdict): "ok" {
      switch (v) {
        case "ELIGIBLE":
          return "ok";
        case "NOT_ELIGIBLE":
          return "ok";
        default: {
          // If Verdict ever grows a third member (e.g. an auto-apply
          // variant), this line stops compiling — that's the point.
          const exhaustive: never = v;
          return exhaustive;
        }
      }
    }
    expect(assertVerdict("ELIGIBLE")).toBe("ok");
    expect(assertVerdict("NOT_ELIGIBLE")).toBe("ok");
  });
});
