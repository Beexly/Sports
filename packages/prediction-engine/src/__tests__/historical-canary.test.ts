import { describe, it, expect } from "vitest";
import { buildContextualBitmask288, type GameContextBitmaskInput } from "../mcp/bitmask-schema";
import { NE_CHI_20261022_BITMASK_INPUT } from "../mcp/bitmask-schema";

const GAMES: readonly { id: string; spread: number; wind: number }[] = [
  { id: "2024-09-08-BAL-KC", spread: 3, wind: 8 },
  { id: "2024-10-06-DAL-PIT", spread: 2.5, wind: 11 },
  { id: "2024-11-03-CHI-ARI", spread: 1, wind: 6 },
  { id: "2024-12-01-DET-GB", spread: 3.5, wind: 18 },
  { id: "2025-09-07-PHI-GB", spread: 1.5, wind: 9 },
  { id: "2025-10-05-NE-BUF", spread: 6.5, wind: 14 },
  { id: "2025-11-02-KC-BUF", spread: 2.5, wind: 7 },
  { id: "2025-12-07-CHI-GB", spread: 3, wind: 16 },
  { id: "2026-09-13-DET-CHI", spread: 4.5, wind: 10 },
  { id: "2026-10-22-NE-CHI", spread: 3, wind: 5.1 },
];

describe("10-game historical canary", () => {
  it("hashes every card and keeps the 2026-10-22 digest pinned", () => {
    const pinned = buildContextualBitmask288(NE_CHI_20261022_BITMASK_INPUT).sha256Digest;
    const seen = new Set<string>();
    for (const g of GAMES) {
      const input: GameContextBitmaskInput = {
        ...NE_CHI_20261022_BITMASK_INPUT,
        gameId: g.id,
        windSpeedMph: g.wind,
        spreadLineAbs: g.spread,
        qbRushPropHookInDangerZone: g.id === "2026-10-22-NE-CHI",
      };
      const receipt = buildContextualBitmask288(input);
      expect(receipt.sha256Digest).toMatch(/^[a-f0-9]{64}$/);
      seen.add(receipt.sha256Digest);
    }
    expect(seen.size).toBeGreaterThan(1);
    const replay = buildContextualBitmask288(NE_CHI_20261022_BITMASK_INPUT);
    expect(replay.sha256Digest).toBe(pinned);
  });
});
