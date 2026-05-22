import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const page = fs.readFileSync(path.join(repoRoot, "apps/web/app/room/[gameId]/page.tsx"), "utf8");
const loader = fs.readFileSync(path.join(repoRoot, "apps/web/lib/game-room/load.ts"), "utf8");

describe("Game Intelligence Room v0", () => {
  it("ships the Phase 3 read-only panels without Model Court chat", () => {
    expect(page).toContain("Game Intelligence Room");
    expect(page).toContain("Market Pulse");
    expect(page).toContain("Slate Weather");
    expect(page).toContain("Evidence Timeline");
    expect(page).toContain("What Would Change Our Mind");
    expect(page).toContain("Lens Switcher");
    expect(page).toContain("Galaxy Memory");
    expect(page).not.toMatch(/Ask This Game|Ask The Slate|Model Court/);
  });

  it("loads through Intelligence Graph and the deterministic pre-mortem builder", () => {
    expect(loader).toMatch(/buildGameIntelligenceNode/);
    expect(loader).toMatch(/buildSlateWeather/);
    expect(loader).toMatch(/projectForLens/);
    expect(loader).toMatch(/buildPickPremortemNote/);
  });

  it("filters out bootstrap and seed picks from the room loader", () => {
    expect(loader).toMatch(/isBootstrap:\s*false/);
    expect(loader).toMatch(/modelVersion:\s*"v5\.0\.0-seed"/);
    expect(loader).toMatch(/isPublished:\s*true/);
  });
});
