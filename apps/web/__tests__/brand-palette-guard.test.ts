import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, join, extname } from "node:path";

/**
 * Off-palette hex guard.
 *
 * The official Galaxy Sports Edge Brand Bible v1.0 fixes the signal palette to
 * exact hexes. Earlier builds carried near-miss values that are NOT in the
 * bible (a magenta that was a touch off, an ultraviolet a shade cool, an
 * obsidian/white/carbon that were one tick off). This guard fails the build if
 * any of those retired values creep back into the styled source — color is
 * signal, never an approximation.
 */

const webRoot = resolve(__dirname, "..");
const SCAN_DIRS = ["app", "components", "lib", "styles"];
const SCAN_EXT = new Set([".ts", ".tsx", ".css"]);

// Retired near-miss values -> their approved Brand Bible replacement.
const RETIRED: Record<string, string> = {
  "#FF2DD6": "#FF38C7 (Ion Magenta)",
  "#7A5CFF": "#7B61FF (Soft Ultraviolet)",
  "#050608": "#05070B (Obsidian Black)",
  "#F6F7FA": "#F5F7FF (Starlight White)",
  "#100D1D": "#0D1117 (Cosmic Gray)",
  "#04060a": "#05070B (Obsidian Black)",
};

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(full, out);
    } else if (SCAN_EXT.has(extname(name))) {
      out.push(full);
    }
  }
}

describe("Brand palette guard", () => {
  const files: string[] = [];
  for (const d of SCAN_DIRS) walk(resolve(webRoot, d), files);

  it("scans the styled source tree", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  for (const [retired, replacement] of Object.entries(RETIRED)) {
    it(`never reintroduces retired ${retired} (use ${replacement})`, () => {
      const needle = retired.toLowerCase();
      const offenders = files.filter((f) =>
        readFileSync(f, "utf8").toLowerCase().includes(needle),
      );
      expect(offenders, `Retired hex ${retired} found in:\n${offenders.join("\n")}`).toEqual([]);
    });
  }
});
