import { describe, expect, it } from "vitest";
import { comparePlayers, loadPlayers } from "@/lib/statking/product";

/**
 * Compare-page player resolution honesty.
 *
 * `comparePlayers` falls back to the first/second player in the roster when an
 * ID does not resolve. That fallback is intentional and is NOT changed here —
 * `DO_NOT_BREAK.md` protects player-ID resolution and the product loader
 * contracts.
 *
 * What IS pinned is that the fallback is now REPORTED. Before, an unresolvable
 * ID produced a confident, fully-rendered side-by-side of two players the user
 * never asked for, with nothing on the page indicating a substitution had
 * happened — the compare surface answering a different question than the one
 * posed. These tests exist so that silence cannot come back.
 */

describe("comparePlayers — resolution is reported, not silent", () => {
  it("flags both sides as resolved for real IDs", () => {
    const players = loadPlayers();
    const a = players[0]!;
    const b = players[1]!;

    const c = comparePlayers(a.player_id, b.player_id);

    expect(c.aResolved).toBe(true);
    expect(c.bResolved).toBe(true);
    expect(c.a.player_id).toBe(a.player_id);
    expect(c.b.player_id).toBe(b.player_id);
  });

  it("flags an unresolvable A and still returns a usable comparison", () => {
    const realB = loadPlayers()[1]!;
    const c = comparePlayers("does-not-exist", realB.player_id);

    expect(c.aResolved).toBe(false);
    expect(c.bResolved).toBe(true);
    // The fallback still happened — behaviour is unchanged, only disclosed.
    expect(c.a).toBeDefined();
    expect(c.categories.length).toBeGreaterThan(0);
  });

  it("flags an unresolvable B", () => {
    const realA = loadPlayers()[0]!;
    const c = comparePlayers(realA.player_id, "nope-not-a-player");

    expect(c.aResolved).toBe(true);
    expect(c.bResolved).toBe(false);
  });

  it("flags both when neither resolves", () => {
    const c = comparePlayers("ghost-1", "ghost-2");

    expect(c.aResolved).toBe(false);
    expect(c.bResolved).toBe(false);
  });

  it("echoes the requested IDs back so the page can name what was missed", () => {
    const c = comparePlayers("ghost-1", "ghost-2");

    expect(c.requestedAId).toBe("ghost-1");
    expect(c.requestedBId).toBe("ghost-2");
  });

  it("does NOT change the fallback itself — the same stand-ins as before", () => {
    const players = loadPlayers();
    const c = comparePlayers("ghost-1", "ghost-2");

    // Pins the protected resolution contract: first and second roster entries.
    expect(c.a.player_id).toBe(players[0]!.player_id);
    expect(c.b.player_id).toBe(players[1]!.player_id);
  });
});
