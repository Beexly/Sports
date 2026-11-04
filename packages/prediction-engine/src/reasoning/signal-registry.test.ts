import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { registerDeclarations, SIGNAL_FAMILIES, type SignalDeclaration } from "./signal-registry.js";

function resolveSourceFile(filename: string): string {
  const candidates = [
    resolve(process.cwd(), "packages/ingestion-pipeline/src", filename),
    resolve(process.cwd(), "../ingestion-pipeline/src", filename),
    resolve(__dirname, "../../../ingestion-pipeline/src", filename),
    resolve("C:/c/wt-week8-forensic/packages/ingestion-pipeline/src", filename),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error(`Could not resolve ${filename} across candidates`);
  return found;
}

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
      resolveSourceFile("signal-registry-definitions.ts"),
      resolveSourceFile("signal-registry-extensions.ts"),
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
