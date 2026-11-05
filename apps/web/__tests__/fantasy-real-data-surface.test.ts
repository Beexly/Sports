import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

describe("Fantasy real-data entry surface", () => {
  const page = read("app/fantasy/page.tsx");

  it("presents season-long tools as under construction instead of live on placeholders", () => {
    // The hub was rebuilt (GALAXY PICKS + DFS only): it no longer renders the
    // old evidence strip that pinned loadSourceLiveEvidence and its usage-
    // backbone headings, and no code links to /fantasy?tool= any more. What
    // the hub must still guarantee is that no tool presents itself as live.
    expect(page).toMatch(/Under Construction · Galaxy Picks/);
    expect(page).toMatch(/href="\/packages"/);
    expect(page).toMatch(/href="\/fantasy\/dfs"/);
    expect(page).toMatch(/Real roster first/);
    expect(page).toMatch(/Connect your league/);
    // Public/private doctrine (2026-09-28): the source catalog is an internal
    // surface — the public fantasy page must not link to or name it.
    expect(page).not.toMatch(/Data sources/);
    expect(page).not.toMatch(/\/api\/sources\/catalog/);
    expect(page).toMatch(/Baseline map/);
    expect(page).toMatch(/LineStar \/ Elite baseline/);
  });

  it("keeps projection-driven fantasy advice gated", () => {
    expect(page).toMatch(/No fake projections/);
    // The apostrophe in pick'em is a JSX entity in source (pick&apos;em), so the
    // regex allows the entity/quote spellings rather than the raw character.
    expect(page).toMatch(/projection-driven lineup, waiver, trade, DFS, or pick.{0,8}em/);
    expect(page).toMatch(/Projections/);
    expect(page).toMatch(/gated/);
  });
});
