/**
 * Tests for the player-identity crosswalk (`apps/web/lib/ops/player-crosswalk.ts`).
 *
 * The contract: a gsisId the `players` table knows resolves to the internal
 * playerId; anything else resolves to null — never a guessed id. Batch
 * resolution reports misses separately so the join gap stays visible.
 */
import { describe, it, expect } from "vitest";
import {
  resolvePlayerByGsis,
  resolveGsisByPlayer,
  resolveManyGsis,
  type CrosswalkDb,
} from "@/lib/ops/player-crosswalk";

function fakeDb(): CrosswalkDb {
  const rows = [
    { id: "pl-1", gsisId: "00-0031234", fullName: "Test Player" },
    { id: "pl-2", gsisId: "00-0023456", fullName: "Other Player" },
  ];
  return {
    player: {
      async findUnique({ where }: { where: { gsisId: string } | { id: string } }) {
        const hit =
          "gsisId" in where
            ? rows.find((r) => r.gsisId === where.gsisId)
            : rows.find((r) => r.id === where.id);
        return hit ? { ...hit } : null;
      },
    },
  };
}

describe("player crosswalk", () => {
  it("resolves a known gsisId to the internal playerId", async () => {
    const hit = await resolvePlayerByGsis(fakeDb(), "00-0031234");
    expect(hit).toEqual({ playerId: "pl-1", gsisId: "00-0031234", fullName: "Test Player" });
  });

  it("returns null for an unknown gsisId — never a guess", async () => {
    expect(await resolvePlayerByGsis(fakeDb(), "00-0000000")).toBeNull();
    expect(await resolvePlayerByGsis(fakeDb(), "")).toBeNull();
    expect(await resolvePlayerByGsis(fakeDb(), "   ")).toBeNull();
  });

  it("resolves an internal playerId back to its gsisId", async () => {
    const hit = await resolveGsisByPlayer(fakeDb(), "pl-2");
    expect(hit).toEqual({ playerId: "pl-2", gsisId: "00-0023456", fullName: "Other Player" });
  });

  it("returns null for an unknown playerId", async () => {
    expect(await resolveGsisByPlayer(fakeDb(), "pl-nope")).toBeNull();
  });

  it("batch resolution separates hits from misses and dedupes", async () => {
    const { hits, misses } = await resolveManyGsis(fakeDb(), [
      "00-0031234",
      "00-0000000",
      "00-0031234", // duplicate
      "00-0023456",
    ]);
    expect(hits.size).toBe(2);
    expect(hits.get("00-0031234")?.playerId).toBe("pl-1");
    expect(misses).toEqual(["00-0000000"]);
  });
});
