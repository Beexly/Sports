import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Stub-mode contract — source-level invariants.
 *
 * The cockpit and the dashboard both rely on @sports/db exporting:
 *   - `db` — the Prisma client (or its stub fallback)
 *   - `isStubMode()` — a boolean accessor for whether the stub is active
 *
 * The Jarvis cockpit page reads isStubMode() to decorate the header with
 * a "Stub Mode · No DB" badge; the Jarvis loader uses it to append a
 * safety warning. If isStubMode is removed or renamed, both surfaces
 * stop telling the operator the truth about the data they're seeing.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");

function read(p: string): string {
  return readFileSync(resolve(repoRoot, p), "utf8");
}

describe("@sports/db stub-mode contract", () => {
  it("packages/db exports isStubMode", () => {
    const src = read("packages/db/src/index.ts");
    expect(src).toMatch(/export\s+function\s+isStubMode/);
    expect(src).toMatch(/:\s*boolean/);
  });

  it("cockpit overview page imports isStubMode from @sports/db", () => {
    const src = read("apps/web/app/cockpit/page.tsx");
    expect(src).toMatch(/import[\s\S]*isStubMode[\s\S]*from\s+["']@sports\/db["']/);
  });

  it("cockpit overview page renders a 'Stub Mode' indicator when isStubMode() is true", () => {
    const src = read("apps/web/app/cockpit/page.tsx");
    expect(src).toMatch(/isStubMode\(\)/);
    expect(src).toMatch(/Stub Mode/);
  });

  it("Jarvis loader surfaces a safety warning when isStubMode is active", () => {
    const src = read("apps/web/lib/cockpit/jarvis-data.ts");
    expect(src).toMatch(/isStubMode\(\)/);
    expect(src).toMatch(/safetyWarnings/);
  });

  it("Jarvis loader prepends the stub-mode warning (so it appears first in the list)", () => {
    const src = read("apps/web/lib/cockpit/jarvis-data.ts");
    // The INVARIANT is prepend-not-append: the operator must see "stub mode
    // active" before everything else. Assert that behavior rather than one
    // spelling of it — the loader legitimately hoists `const stub = isStubMode()`
    // once at the top and branches on the variable hundreds of lines later, which
    // a proximity regex against `isStubMode()` cannot see through.
    expect(src).toMatch(/isStubMode\(\)/);
    expect(
      /if\s*\(\s*stub\s*\)\s*\{[\s\S]{0,80}safetyWarnings\.unshift\(/.test(src) ||
        /isStubMode\(\)[\s\S]{0,200}safetyWarnings\.unshift\(/.test(src),
      "stub-mode warning should be prepended via .unshift so it surfaces first"
    ).toBe(true);
    // The real regression to catch: switching any safety warning to .push would
    // bury it below pre-existing warnings. There must be no append path at all.
    expect(
      /safetyWarnings\.push\(/.test(src),
      "safety warnings must never be appended with .push — that buries them"
    ).toBe(false);
  });

  it("the stub-mode warning text mentions DATABASE_URL so the operator knows what to fix", () => {
    const src = read("apps/web/lib/cockpit/jarvis-data.ts");
    expect(src).toMatch(/DATABASE_URL/);
  });
});
