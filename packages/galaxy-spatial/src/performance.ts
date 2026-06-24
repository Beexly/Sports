export interface SpatialPerformanceBudget {
  readonly mode: "mobile" | "desktop" | "low-power";
  readonly maxMeshes: number;
  readonly maxLights: number;
  readonly maxParticles: number;
  readonly targetFps: number;
  readonly fallbackTriggers: readonly string[];
}

export const PERFORMANCE_BUDGETS: readonly SpatialPerformanceBudget[] = [
  { mode: "mobile", maxMeshes: 90, maxLights: 4, maxParticles: 200, targetFps: 45, fallbackTriggers: ["low-fps-10s", "webgl-context-lost", "reduced-motion"] },
  { mode: "desktop", maxMeshes: 220, maxLights: 8, maxParticles: 900, targetFps: 60, fallbackTriggers: ["webgl-context-lost", "renderer-init-failed"] },
  { mode: "low-power", maxMeshes: 45, maxLights: 2, maxParticles: 0, targetFps: 30, fallbackTriggers: ["battery-saver", "reduced-motion", "low-memory"] },
];
