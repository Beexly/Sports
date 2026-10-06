import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { registerDeclarations, SIGNAL_FAMILIES, type SignalDeclaration } from "./signal-registry.js";

function declaration(id: string, deprecated = false): SignalDeclaration {
  return {
    signalId: id,
    family: "EFFICIENCY",
    evidenceTimestamp: "ISO-8601",
    weightSemantics: "trustWeight",
    deprecated,
  };
}

describe("signal registry", () => {
  it("rejects a duplicate and keeps a deprecated declaration", () => {
    expect(() => registerDeclarations([declaration("a"), declaration("a")])).toThrow(/duplicate/);
    const kept = registerDeclarations([declaration("old", true)]);
    expect(kept[0]?.deprecated).toBe(true);
    expect(SIGNAL_FAMILIES).toHaveLength(8);
  });

  it("finds every id declared in the live registry sources, once", () => {
    const files = [
      resolve(process.cwd(), "../ingestion-pipeline/src/signal-registry-definitions.ts"),
      resolve(process.cwd(), "../ingestion-pipeline/src/signal-registry-extensions.ts"),
    ];
    const ids: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/^\s+id: "([^"]+)"/gm)) ids.push(match[1]!);
    }
    expect(ids.length).toBeGreaterThan(8);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
