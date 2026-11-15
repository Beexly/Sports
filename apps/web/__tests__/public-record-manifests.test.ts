import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PUBLIC_RECORD_AS_OF,
  PUBLIC_RECORD_COUNTS,
  PUBLIC_RECORD_LINE,
  PUBLIC_RECORD_UNITS,
  PUBLIC_RECORD_POLICY,
  SUPERSEDED_RECORD_NOTE,
} from "@/lib/ledger/public-record";
import { formatUnits, formatWlp, verifiedLedger } from "@/lib/ledger/verified-ledger-view";
import { buildGlobalSearchAndAiJsonLd } from "@/lib/seo/ai-agent-and-search-seo";

/**
 * Public record manifests — the surfaces a search engine, an LLM crawler or a
 * first-time visitor reads before anything else.
 *
 * Defect this pins (2026-11-15): `/llms.txt`, `/llms-full.txt`,
 * `/.well-known/ai-plugin.json`, `/props` and `/research` printed
 * "47-19-1 (71.2% ...)" as the OFFICIAL VERIFIED record. 47-19-1 is the
 * superseded 2026-11-02 all-in snapshot; 71.2% is a win rate the calibration
 * law forbids publishing until 200 CLV-backed plays are settled. The record
 * itself was the inflation, and it was being fed to the crawlers.
 */

const webRoot = resolve(__dirname, "..");

function source(relPath: string): string {
  return readFileSync(resolve(webRoot, relPath), "utf8");
}

const MANIFESTS = [
  { name: "/llms.txt", path: "app/llms.txt/route.ts" },
  { name: "/llms-full.txt", path: "app/llms-full.txt/route.ts" },
  { name: "/.well-known/ai-plugin.json", path: "app/.well-known/ai-plugin.json/route.ts" },
  { name: "/props", path: "app/props/page.tsx" },
  { name: "/research", path: "app/research/page.tsx" },
  { name: "site-wide JSON-LD", path: "lib/seo/ai-agent-and-search-seo.ts" },
] as const;

describe("public record manifests derive from the verified ledger", () => {
  it("computes the public line from the artifact, not from a string someone typed", () => {
    expect(PUBLIC_RECORD_COUNTS).toBe(formatWlp(verifiedLedger.official.wlp));
    expect(PUBLIC_RECORD_UNITS).toBe(formatUnits(verifiedLedger.official.units.total));
    expect(PUBLIC_RECORD_AS_OF).toBe(verifiedLedger.generatedAt.slice(0, 10));
    expect(PUBLIC_RECORD_LINE).toContain(PUBLIC_RECORD_COUNTS);
    expect(PUBLIC_RECORD_LINE).toContain(PUBLIC_RECORD_UNITS);
    expect(PUBLIC_RECORD_LINE).toContain(PUBLIC_RECORD_AS_OF);
  });

  it("never prints a win-rate percentage while the 200-bet gate is locked", () => {
    const gate = verifiedLedger.official.gate;
    if (!gate.unlocked) {
      expect(PUBLIC_RECORD_LINE).not.toMatch(/%/);
      expect(PUBLIC_RECORD_POLICY).not.toMatch(/%/);
    }
    expect(PUBLIC_RECORD_LINE).toMatch(/win rate locked|win rate/i);
    expect(PUBLIC_RECORD_LINE).toContain(`${gate.clvBackedSettled}/${gate.target}`);
  });

  it("keeps the superseded snapshot labelled as superseded, never as the record", () => {
    expect(SUPERSEDED_RECORD_NOTE).toContain("47-19-1");
    expect(SUPERSEDED_RECORD_NOTE).toMatch(/superseded/i);
    expect(SUPERSEDED_RECORD_NOTE).toMatch(/historical anchor/i);
  });

  it.each(MANIFESTS)("$name imports the derived line instead of hardcoding the record", ({ path }) => {
    const src = source(path);
    // Must consume the shared module — a hand-typed record cannot drift back in.
    expect(src).toMatch(/@\/lib\/ledger\/public-record/);
    // The superseded snapshot may not appear at all on these surfaces once
    // they render the derived line; if a future edit re-adds it, it has to
    // carry the label from SUPERSEDED_RECORD_NOTE.
    expect(src).not.toMatch(/47-19-1/);
    // And no surface may hand-type a win-rate percentage next to a record.
    expect(src).not.toMatch(/\d{1,3}(?:\.\d+)?%\s*win/i);
    expect(src).not.toMatch(/record[^"\n]{0,40}\d{1,3}\.\d%/i);
  });

  it("the site-wide JSON-LD Dataset node carries the derived record and its artifact date", () => {
    const graph = buildGlobalSearchAndAiJsonLd("https://www.galaxysportsedge.com")["@graph"];
    const dataset = graph.find((node) => (node as Record<string, unknown>)["@type"] === "Dataset") as
      | { description: string; dateModified: string }
      | undefined;
    expect(dataset).toBeTruthy();
    expect(dataset!.description).toContain(PUBLIC_RECORD_LINE);
    expect(dataset!.dateModified).toBe(PUBLIC_RECORD_AS_OF);
    expect(JSON.stringify(dataset)).not.toMatch(/73\.5%/);
    expect(JSON.stringify(dataset)).not.toMatch(/36-13-1/);
  });

  it("the record module itself holds no literal W-L record or win percentage", () => {
    const src = source("lib/ledger/public-record.ts");
    const codeOnly = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
      // The labelled historical anchor is the ONLY place the superseded
      // snapshot may be typed, and it is pinned by the test above.
      .replace(/SUPERSEDED_RECORD_NOTE\s*=[\s\S]*?`;/g, "");
    expect(codeOnly).not.toMatch(/\b\d{1,3}-\d{1,3}-\d{1,3}\b/);
    expect(codeOnly).not.toMatch(/\d{1,3}(?:\.\d+)?\s*%/);
  });
});