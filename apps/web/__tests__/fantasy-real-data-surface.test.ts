import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

describe("Fantasy real-data entry surface", () => {
  const page = read("app/fantasy/page.tsx");

  it("uses live source evidence instead of presenting fantasy tools as live on placeholders", () => {
    expect(page).toMatch(/loadSourceLiveEvidence/);
    expect(page).toMatch(/Real NFL usage backbone/);
    expect(page).toMatch(/Player-stat rows/);
    expect(page).toMatch(/Accepted research/);
    expect(page).toMatch(/Rejected narratives/);
    // Public/private doctrine (2026-09-28): the source catalog is an internal
    // surface — the public fantasy page must not link to or name it.
    expect(page).not.toMatch(/Data sources/);
    expect(page).not.toMatch(/\/api\/sources\/catalog/);
    expect(page).toMatch(/Baseline map/);
    expect(page).toMatch(/LineStar \/ Elite baseline/);
  });

  it("keeps projection-driven fantasy advice gated", () => {
    expect(page).toMatch(/No fake projections/);
    expect(page).toMatch(/projection-driven lineup, waiver, trade, DFS, or pick'em/);
    expect(page).toMatch(/Projections/);
    expect(page).toMatch(/gated/);
  });
});
