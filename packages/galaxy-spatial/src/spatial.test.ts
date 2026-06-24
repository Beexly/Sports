import { describe, expect, it } from "vitest";
import {
  CAMERA_PRESETS,
  BEAT_BROADCAST_INSTRUMENT_LAYERS,
  BEAT_BROADCAST_VISUALS,
  GALAXY_FINAL_ASSET_SLOTS,
  INPUT_CONTRACT,
  PERFORMANCE_BUDGETS,
  ROOKIE_PLAZA_COLLISION_BOUNDS,
  ROOKIE_PLAZA_ASSET_KIT,
  SPATIAL_COLORS,
  WEATHER_OVERLAY_COLORS,
  hasBrowserCanvasSupport,
  scoreSpatialQuality,
  summarizeFinalAssetReadiness,
} from "./index.js";
import pkg from "../package.json";

describe("Galaxy Spatial OS", () => {
  it("imports without browser globals", () => {
    expect(hasBrowserCanvasSupport()).toBe(false);
  });

  it("declares material tokens, camera presets, input, and fallbacks", () => {
    expect(SPATIAL_COLORS.stadiumGold).toBeTruthy();
    expect(SPATIAL_COLORS.verifyTeal).toBeTruthy();
    expect(WEATHER_OVERLAY_COLORS.rookie_heat).toBe(SPATIAL_COLORS.stadiumGold);
    expect(CAMERA_PRESETS.map((preset) => preset.id)).toContain("runescape-isometric");
    expect(INPUT_CONTRACT.keyboard.KeyW).toBe("move-up");
    expect(INPUT_CONTRACT.smoothing.maxSpeed).toBeGreaterThan(0);
    expect(ROOKIE_PLAZA_COLLISION_BOUNDS.maxX).toBeGreaterThan(ROOKIE_PLAZA_COLLISION_BOUNDS.minX);
    expect(BEAT_BROADCAST_VISUALS.map((visual) => visual.kind)).toContain("broadcast-wave");
    expect(BEAT_BROADCAST_VISUALS.length).toBeGreaterThanOrEqual(8);
    expect(BEAT_BROADCAST_INSTRUMENT_LAYERS).toContain("route-trails");
    expect(ROOKIE_PLAZA_ASSET_KIT.filter((asset) => asset.shipped).length).toBeGreaterThanOrEqual(7);
    expect(ROOKIE_PLAZA_ASSET_KIT.some((asset) => asset.implementation === "authored-asset-needed" && !asset.shipped)).toBe(true);
    expect(GALAXY_FINAL_ASSET_SLOTS.map((slot) => slot.id)).toContain("rookie-plaza-environment-glb");
    expect(PERFORMANCE_BUDGETS.every((budget) => budget.fallbackTriggers.length > 0)).toBe(true);
  });

  it("keeps final art behind explicit license, IP, performance, and acceptance gates", () => {
    const readiness = summarizeFinalAssetReadiness();
    expect(readiness.totalSlots).toBeGreaterThanOrEqual(5);
    expect(readiness.requiredSlots).toBe(3);
    expect(readiness.readyForPublicLaunch).toBe(false);
    expect(readiness.blockers).toEqual(
      expect.arrayContaining(["rookie-plaza-environment-glb", "rookie-character-set-glb", "beat-wall-instrument-glb"]),
    );
  });

  it("is Babylon-first and does not depend on Three as the spatial engine", () => {
    expect(pkg.dependencies["@babylonjs/core"]).toBeTruthy();
    expect("three" in pkg.dependencies).toBe(false);
  });

  it("fails quality when a scene reads as gray-box or unsafe", () => {
    const failed = scoreSpatialQuality({
      visualQuality: 3,
      brandFit: 5,
      interactionClarity: 4,
      performance: 4,
      fallback: 4,
      ipSafety: 5,
      complianceSafety: 5,
      notGrayBox: 2,
    });
    expect(failed.passed).toBe(false);
    expect(failed.blockers).toEqual(expect.arrayContaining(["visualQuality", "notGrayBox"]));
  });
});
