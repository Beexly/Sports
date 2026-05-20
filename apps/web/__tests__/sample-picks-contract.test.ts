import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Session A's demo-picks pipeline contract.
 *
 * `isDemoPicksEnabled()` + `getSamplePicks()` live in
 * `packages/db/src/sample-picks.ts` and are wired through
 * `packages/db/src/index.ts`. The dashboard imports both helpers and
 * gates rendering on `isDemoPicksEnabled() && isStubMode()`.
 *
 * Pin the contract so a future refactor doesn't strip the gating.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");

function read(p: string): string {
  return readFileSync(resolve(repoRoot, p), "utf8");
}

describe("sample-picks pipeline contract", () => {
  it("packages/db/src/sample-picks.ts exports isDemoPicksEnabled and getSamplePicks", () => {
    const src = read("packages/db/src/sample-picks.ts");
    expect(src).toMatch(/export\s+function\s+isDemoPicksEnabled/);
    expect(src).toMatch(/getSamplePicks|SAMPLE_PICK_COUNT/);
  });

  it("isDemoPicksEnabled keys off the DEMO_PICKS_ENABLED env var", () => {
    const src = read("packages/db/src/sample-picks.ts");
    expect(src).toMatch(/DEMO_PICKS_ENABLED.*===\s*"true"/);
  });

  it("packages/db/src/index.ts re-exports the helpers", () => {
    const src = read("packages/db/src/index.ts");
    expect(src).toMatch(/export\s*\{[^}]*isDemoPicksEnabled/);
    expect(src).toMatch(/getSamplePicks|SAMPLE_PICK_COUNT/);
  });

  it("the sample-picks file documents the safety guard (never live in production)", () => {
    const src = read("packages/db/src/sample-picks.ts");
    expect(src).toMatch(/Never active in production|stub.*demo mode only|sample picks.*never/i);
  });

  it("samples are flagged so no fake win-rate leaks (result=PENDING)", () => {
    const src = read("packages/db/src/sample-picks.ts");
    expect(src).toMatch(/Result is always PENDING|result.*PENDING/);
  });

  it("the dashboard gates demo rendering on isDemoPicksEnabled && stubMode", () => {
    const src = read("apps/web/app/dashboard/page.tsx");
    expect(src).toMatch(/isDemoPicksEnabled\(\)\s*&&\s*stubMode/);
  });
});
