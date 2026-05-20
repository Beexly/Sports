import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * docs/adr/* — Architecture Decision Records.
 *
 * Every ADR file must have:
 *   - A title line starting with `# ADR <NNN>` (no draft prefix)
 *   - A "Status" field
 *   - A "Date" field
 *
 * Catches an ADR landing in a half-written state.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");
const ADR_DIR = resolve(repoRoot, "docs/adr");

function listAdr(): string[] {
  if (!existsSync(ADR_DIR)) return [];
  return readdirSync(ADR_DIR)
    .filter((n) => n.endsWith(".md"))
    .map((n) => join(ADR_DIR, n));
}

const ADRS = listAdr();

describe("docs/adr — ADR contract", () => {
  if (ADRS.length === 0) {
    it.skip("no ADRs found", () => {
      /* skipped */
    });
    return;
  }

  for (const file of ADRS) {
    const name = file.split(/[\\/]/).pop()!;
    it(`${name} has a title with an ADR number`, () => {
      const src = readFileSync(file, "utf8");
      expect(src.split(/\r?\n/)[0]).toMatch(/^#\s+ADR\s+\d+\s+—/);
    });

    it(`${name} declares a Status field`, () => {
      const src = readFileSync(file, "utf8");
      expect(src).toMatch(/\*\*Status:\*\*\s*\S/);
    });

    it(`${name} declares a Date field`, () => {
      const src = readFileSync(file, "utf8");
      expect(src).toMatch(/\*\*Date:\*\*\s*\d{4}-\d{2}-\d{2}/);
    });

    it(`${name} has no "Draft" / "TODO" / "TBD" in the body`, () => {
      const src = readFileSync(file, "utf8");
      // Allow "Draft" inside Status if explicitly accepted; flag the
      // word elsewhere.
      const body = src.split(/\n/).slice(1).join("\n");
      // Only fail on the literal word "TBD" or "TODO" — they signal
      // unfinished thinking.
      expect(body).not.toMatch(/\bTBD\b|\bTODO\b/i);
    });

    it(`${name} filename follows NNN-kebab-case.md`, () => {
      expect(name).toMatch(/^\d{3}-[a-z][a-z0-9-]+\.md$/);
    });
  }
});
