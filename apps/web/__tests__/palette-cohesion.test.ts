import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

/**
 * Palette cohesion guard.
 *
 * The whole app (cockpit + consumer + admin) was migrated off legacy Tailwind
 * gray/slate and raw "casino" hues (red/green/yellow/amber/rose/orange/etc.)
 * onto the Galaxy design tokens (ion / titanium / obsidian / eclipse / carbon /
 * verify / alert / caution / ultraviolet / orbital-cyan / plasma). This test
 * stops them from creeping back in as new code lands — the same source-scrape
 * discipline the a11y/nav guards use.
 *
 * If you add a genuinely light-themed surface (the `paper` scale) that needs a
 * light gray, or a documented third-party brand color, add the exact
 * `path -> token` to ALLOWLIST with a one-line reason.
 */

const webRoot = resolve(__dirname, "..");
const SCAN_DIRS = ["app", "components"].map((d) => resolve(webRoot, d));

// Intentional, reviewed exceptions. Keyed by repo-relative path → set of
// allowed token strings.
const ALLOWLIST: Record<string, ReadonlySet<string>> = {
  // The Google sign-in button is a white (light) button per Google's own
  // brand guidelines; its hover is a light gray.
  "app/auth/signin/page.tsx": new Set(["hover:bg-gray-100"]),
  // Twitter/Discord platform icons — third-party brand colors, not status.
  "app/cockpit/bot-outbox/page.tsx": new Set([
    "border-sky-500/40",
    "bg-sky-500/10",
    "text-sky-200",
    "border-indigo-500/40",
    "bg-indigo-500/10",
    "text-indigo-200",
  ]),
  // Budget escalation ladder (green/yellow/orange/red/hard_cap) — orange is a
  // deliberate distinct tier between caution and alert; collapsing it into
  // either loses a meaningful distinction. Flagged for a product-owner token
  // decision (see WORLD_CLASS_REDESIGN_PLAN.md), not a mechanical fix.
  "app/cockpit/api-costs/page.tsx": new Set([
    "border-orange-500/30",
    "bg-orange-950/40",
    "text-orange-200",
  ]),
};

const STALE =
  /\b(?:text|bg|border|divide|ring|from|to|via|placeholder|shadow|fill|stroke|hover:bg|hover:text|hover:border|focus:border|focus:ring)-(?:gray|slate|zinc|neutral|stone|green|yellow|emerald|orange|red|rose|pink|fuchsia|blue|purple|violet|indigo|cyan|sky|teal|lime|amber)-\d{2,3}(?:\/\d+)?\b/g;

function listTsx(dir: string): string[] {
  const acc: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) acc.push(...listTsx(p));
    else if (name.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

const FILES = SCAN_DIRS.flatMap(listTsx);

describe("design-token palette cohesion", () => {
  it("scans a meaningful number of surfaces", () => {
    expect(FILES.length).toBeGreaterThan(100);
  });

  it("uses design tokens, not legacy gray/slate, across app + components", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const rel = relative(webRoot, file).replace(/\\/g, "/");
      const allowed = ALLOWLIST[rel] ?? new Set<string>();
      const src = readFileSync(file, "utf8");
      for (const match of src.match(STALE) ?? []) {
        if (!allowed.has(match)) offenders.push(`${rel}: ${match}`);
      }
    }
    expect(
      offenders,
      `Legacy gray/slate found — migrate to design tokens (ion/titanium/obsidian/` +
        `eclipse/carbon) or, for a real light-theme surface, add to ALLOWLIST:\n` +
        offenders.join("\n")
    ).toEqual([]);
  });
});
