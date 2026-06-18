import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * Brand color-system integrity across the whole PUBLIC surface.
 *
 * The brand ships a complete semantic token palette (orbital-cyan / ion-blue,
 * plasma, ultraviolet, verify, alert, caution, …). Raw Tailwind color classes
 * (cyan-400, blue-600, green-300, yellow-400, …) are near-duplicate, off-system
 * hues that fracture the design — a win/loss rendered in two different greens,
 * a cyan that isn't the brand cyan. This sweep locks every public page onto the
 * tokens so the drift can't creep back in on a new page.
 *
 * Scope: app/ ** /page.tsx, EXCLUDING the internal /cockpit and /admin consoles
 * (operator tooling, not the customer-facing brand surface).
 */

const appDir = resolve(__dirname, "..", "app");

// Vivid, off-system hues only. Neutrals (gray/slate/…) and decorative gradient
// stops (from-/to-) are out of scope — the brand has token equivalents for the
// vivid signal colors, and those are what fracture the design when raw.
const RAW_COLOR_CLASS =
  /\b(?:bg|text|border|shadow|ring|divide|hover:bg|hover:text|hover:border|focus:border|focus:ring)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|gold)-\d/;

function collectPublicPages(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "cockpit" || entry.name === "admin") continue;
      collectPublicPages(full, acc);
    } else if (entry.name === "page.tsx") {
      acc.push(full);
    }
  }
  return acc;
}

describe("public pages use brand color tokens, not raw Tailwind colors", () => {
  const pages = collectPublicPages(appDir);

  it("finds a meaningful number of public pages to guard", () => {
    expect(pages.length).toBeGreaterThan(20);
  });

  for (const page of pages) {
    const rel = page.slice(page.indexOf("/app/") + 1);
    it(`${rel} has no raw Tailwind color classes`, () => {
      const lines = readFileSync(page, "utf8").split("\n");
      const offenders = lines
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(({ line }) => RAW_COLOR_CLASS.test(line))
        .map(({ n, line }) => `  ${rel}:${n}  ${line.trim().slice(0, 100)}`);
      expect(offenders, `raw color classes found:\n${offenders.join("\n")}`).toEqual([]);
    });
  }
});
