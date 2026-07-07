import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { scanUnsupportedFableClaims } from "./claim-scanner";

const repoRoot = resolve(__dirname, "..", "..", "..", "..");
const fableDocsRoot = resolve(repoRoot, "docs", "fable");

function collectMarkdownFiles(dir: string): readonly string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((entry) => {
    const fullPath = resolve(dir, entry);
    if (statSync(fullPath).isDirectory()) return collectMarkdownFiles(fullPath);
    return entry.endsWith(".md") ? [fullPath] : [];
  });
}

describe("FABLE docs claim scanner", () => {
  it("blocks unsupported hype terms outside code spans", () => {
    const docs = collectMarkdownFiles(fableDocsRoot);
    expect(docs.length).toBeGreaterThan(0);

    const hits = docs.flatMap((doc) =>
      scanUnsupportedFableClaims(readFileSync(doc, "utf8")).map((hit) => ({
        doc,
        hit,
      }))
    );

    if (hits.length > 0) {
      const summary = hits
        .map(({ doc, hit }) => `${doc}:${hit.line} ${hit.phrase} - ${hit.snippet}`)
        .join("\n");
      throw new Error(`Unsupported FABLE claims found:\n${summary}`);
    }

    expect(hits).toHaveLength(0);
  });
});
