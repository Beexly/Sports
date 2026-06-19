import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { scanText } from "@sports/galaxy-engine";

/**
 * BRAND LANGUAGE LAW enforcement (bible §6) over every Galaxy Dynasty surface.
 *
 * Scans all /galaxy pages, components, and lib for the forbidden public
 * vocabulary using the engine's canonical scanner. Complements the existing GSE
 * public-copy scanners (which target the marketing surface). The Galaxy slice
 * must be clean of casino/wager/lock/guarantee/etc. language.
 */

const webRoot = resolve(__dirname, "..");

const TARGET_DIRS = [
  "app/galaxy",
  "components/galaxy",
  "lib/galaxy",
];

function walk(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(e)) out.push(full);
  }
  return out;
}

describe("Galaxy Dynasty — Brand Language Law over all surfaces", () => {
  const files = TARGET_DIRS.flatMap((d) => walk(resolve(webRoot, d)));

  it("finds Galaxy source files to scan", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  for (const file of files) {
    const rel = file.slice(webRoot.length + 1);
    it(`${rel} contains no forbidden public vocabulary`, () => {
      const text = readFileSync(file, "utf8");
      const hits = scanText(text);
      if (hits.length > 0) {
        const summary = hits.map((h) => `"${h.term}" @${h.index} — ${h.why}`).join("; ");
        throw new Error(`${rel}: ${summary}`);
      }
      expect(hits.length).toBe(0);
    });
  }
});
