import { describe, expect, it } from "vitest";
import { getRookiePlazaSnapshot } from "@/lib/galaxy-dynasty/rookie-plaza-room";

describe("Galaxy Dynasty Rookie Plaza room", () => {
  it("returns a live local room snapshot with active hub routes and Beat Wall state", () => {
    const first = getRookiePlazaSnapshot(1_772_600_000_000);
    const second = getRookiePlazaSnapshot(1_772_600_005_000);

    expect(first.roomId).toBe("rookie-plaza");
    expect(first.connectedPlayers).toBe(1);
    expect(first.routes.some((route) => route.id === "beat" && route.status === "active")).toBe(true);
    expect(first.engine).toEqual({
      streaming: "world-partition-local",
      nanite: "priority-glb-chunks-pixel-lod",
      lumen: "sdf-surface-cache-probes",
      physics: "rapier-local",
      vfx: "three-particles",
      audio: "webaudio-metasynth",
      pcg: "instanced-campus-props",
    });
    expect(second.serverTick).toBeGreaterThan(first.serverTick);
    expect(second.beatWall.bpm).toBeGreaterThanOrEqual(92);
  });
});
