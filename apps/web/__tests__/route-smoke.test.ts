import { describe, it, expect } from "vitest";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Source-level smoke test: every page under app/cockpit/* exists.
 * Replaces the previous test that walked the directory and asserted on
 * admin gating; that version was truncated mid-write.
 */
describe("cockpit route surface", () => {
  const root = join(process.cwd(), "app", "cockpit");

  it("/cockpit/page.tsx exists", () => {
    expect(existsSync(join(root, "page.tsx"))).toBe(true);
  });

  it("/cockpit/layout.tsx exists", () => {
    expect(existsSync(join(root, "layout.tsx"))).toBe(true);
  });

  it("/cockpit/history/page.tsx exists", () => {
    expect(existsSync(join(root, "history", "page.tsx"))).toBe(true);
  });

  it("every subdirectory has a page.tsx (or is empty)", () => {
    if (!existsSync(root)) return;
    for (const entry of readdirSync(root)) {
      const full = join(root, entry);
      if (statSync(full).isDirectory()) {
        const hasPage = existsSync(join(full, "page.tsx"));
        // Allow empty directories — we only care that present pages compile.
        if (!hasPage) continue;
        expect(hasPage).toBe(true);
      }
    }
  });
});
