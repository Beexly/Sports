import { describe, expect, it } from "vitest";
import {
  getRookiePlazaDailyRoute,
  getRookiePlazaInventory,
  getRookiePlazaQuestLog,
  getRookiePlazaState,
  recordRookiePlazaPresence,
  updateRookiePlazaPosition,
} from "@/lib/galaxy/rookie-plaza";

describe("Rookie Plaza contract", () => {
  it("exposes the first playable town state without a profile", () => {
    const state = getRookiePlazaState(null);
    expect(state.activeWeather.weatherName).toBeTruthy();
    expect(state.quests[0]?.id).toBe("first-signal");
    expect(state.quests.length).toBeGreaterThanOrEqual(20);
    expect(state.skills.length).toBe(10);
    expect(state.npcStates.length).toBeGreaterThanOrEqual(12);
    expect(state.inventory.length).toBeGreaterThanOrEqual(25);
    expect(state.inventory.map((item) => item.id)).toContain("rookie-signal-card");
    expect(state.npcStates.map((npc) => npc.id)).toContain("coach-signal");
    expect(state.districtDoors.some((door) => door.href === "/galaxy/war-room")).toBe(true);
    expect(state.ghostPresence.length).toBeGreaterThanOrEqual(7);
    expect(state.blacktopGames.some((game) => game.id === "signal-sprint" && game.mode === "playable")).toBe(true);
    expect(state.bosses.length).toBeGreaterThanOrEqual(5);
    expect(state.reputation.length).toBeGreaterThanOrEqual(7);
    expect(state.presenceRoom.players.some((player) => player.ghost)).toBe(true);
  });

  it("keeps inventory and quest helpers aligned to the same starter route", () => {
    expect(getRookiePlazaInventory().map((item) => item.id)).toContain("war-room-pass");
    expect(getRookiePlazaQuestLog().map((quest) => quest.id)).toContain("first-signal");
    expect(getRookiePlazaDailyRoute(null).length).toBeGreaterThan(0);
  });

  it("keeps Rookie Plaza presence live through load, movement, and heartbeat events", () => {
    const joined = recordRookiePlazaPresence("contract-rookie", "load");
    expect(joined.presenceRoom?.players.some((player) => player.sessionId === "contract-rookie")).toBe(true);

    const moved = updateRookiePlazaPosition("contract-rookie", { x: 99, y: 1, z: -99 });
    const player = moved.presenceRoom?.players.find((entry) => entry.sessionId === "contract-rookie");
    expect(player?.x).toBe(6.5);
    expect(player?.z).toBe(-6.5);

    const heartbeat = recordRookiePlazaPresence("contract-rookie", "heartbeat");
    expect(heartbeat.presenceRoom?.players.find((entry) => entry.sessionId === "contract-rookie")?.signal).toBe("heartbeat");
  });

  it("bounds local presence and sanitizes untrusted session labels", () => {
    for (let index = 0; index < 24; index += 1) {
      recordRookiePlazaPresence(`contract-overflow-${index}`, "load");
    }
    const snapshot = updateRookiePlazaPosition("   ", { x: 99, y: -4, z: Number.NaN }).presenceRoom;
    expect(snapshot?.players.length).toBeLessThanOrEqual(16);
    const anonymous = snapshot?.players.find((entry) => entry.sessionId === "anonymous-rookie");
    expect(anonymous?.x).toBe(6.5);
    expect(anonymous?.y).toBe(0);
    expect(anonymous?.z).toBe(-6.5);
  });
});
