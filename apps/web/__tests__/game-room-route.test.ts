import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const page = fs.readFileSync(path.join(repoRoot, "apps/web/app/room/[gameId]/page.tsx"), "utf8");
const loader = fs.readFileSync(path.join(repoRoot, "apps/web/lib/game-room/load.ts"), "utf8");
const boardPage = fs.readFileSync(path.join(repoRoot, "apps/web/app/board/page.tsx"), "utf8");
const ledgerPage = fs.readFileSync(path.join(repoRoot, "apps/web/app/ledger/page.tsx"), "utf8");

describe("Game Intelligence Room v0", () => {
  it("ships the Phase 3 read-only panels without Model Court chat", () => {
    expect(page).toContain("Game Intelligence Room");
    expect(page).toContain("Market Pulse");
    expect(page).toContain("Slate Weather");
    expect(page).toContain("Evidence Timeline");
    expect(page).toContain("What Would Change Our Mind");
    expect(page).toContain("Lens Switcher");
    expect(page).toContain("Galaxy Memory");
    expect(page).toContain("IntelligencePlayback");
    expect(page).toContain("Intelligence Playback");
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

  it("is discoverable from board and ledger surfaces", () => {
    expect(boardPage).toContain("href={`/room/${row.gameId}`}");
    expect(ledgerPage).toContain("href={`/room/${row.gameId}`}");
  });

  it("offers an in-content onward path so the room is not a dead end", () => {
    expect(page).toContain("Where This Goes Next");
    expect(page).toContain('href="/ledger"');
    expect(page).toContain('href="/performance"');
    expect(page).toContain('href="/methodology"');
    expect(page).toContain('href="/responsible-play"');
  });

  it("frames restraint without forced action or banned language", () => {
    expect(page).toMatch(/No edge, no pick/);
    expect(page).not.toMatch(/\bguaranteed\b|\block of the day\b|\brisk-free\b|\bsure thing\b/i);
  });
});
