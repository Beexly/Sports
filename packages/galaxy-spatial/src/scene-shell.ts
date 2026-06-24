import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera.js";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { Scene } from "@babylonjs/core/scene.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";

export type SpatialQualityMode = "low" | "medium" | "high";

export interface GalaxySpatialSceneOptions {
  readonly qualityMode?: SpatialQualityMode;
  readonly reducedMotion?: boolean;
  readonly clearColor?: string;
  readonly cameraTarget?: readonly [number, number, number];
}

export interface GalaxySpatialScene {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly camera: ArcRotateCamera;
  readonly resize: () => void;
  readonly start: (onFrame?: (delta: number) => void) => void;
  readonly dispose: () => void;
}

export function hasBrowserCanvasSupport(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined" && typeof HTMLCanvasElement !== "undefined";
}

export function createGalaxySpatialScene(
  canvas: HTMLCanvasElement,
  options: GalaxySpatialSceneOptions = {},
): GalaxySpatialScene {
  if (!hasBrowserCanvasSupport()) {
    throw new Error("Galaxy Spatial OS requires a browser canvas.");
  }

  const quality = options.qualityMode ?? "medium";
  const engine = new Engine(canvas, quality !== "low", {
    preserveDrawingBuffer: false,
    stencil: true,
    powerPreference: quality === "low" ? "low-power" : "high-performance",
  });
  engine.setHardwareScalingLevel(quality === "high" ? 1 : quality === "medium" ? 1.25 : 1.75);

  const scene = new Scene(engine);
  scene.clearColor = Color4.FromHexString(options.clearColor ?? "#05070dff");
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = quality === "low" ? 0.018 : 0.011;
  scene.fogColor = Color3.FromHexString("#101a2d");

  const target = options.cameraTarget ?? [0, 0.6, 0];
  const camera = new ArcRotateCamera("galaxy-camera", -Math.PI / 4, Math.PI / 3.1, 12, new Vector3(target[0], target[1], target[2]), scene);
  camera.lowerRadiusLimit = 6;
  camera.upperRadiusLimit = 18;
  camera.wheelPrecision = 60;
  camera.panningSensibility = 0;
  camera.attachControl(canvas, true);

  const light = new HemisphericLight("galaxy-hemi", new Vector3(0, 1, 0.2), scene);
  light.intensity = 0.72;

  let last = performance.now();
  let disposed = false;

  const resize = () => engine.resize();
  const start = (onFrame?: (delta: number) => void) => {
    resize();
    engine.runRenderLoop(() => {
      if (disposed) return;
      const now = performance.now();
      const delta = options.reducedMotion ? 0 : Math.min((now - last) / 1000, 0.05);
      last = now;
      onFrame?.(delta);
      scene.render();
    });
  };

  const dispose = () => {
    disposed = true;
    engine.stopRenderLoop();
    scene.dispose();
    engine.dispose();
  };

  return { engine, scene, camera, resize, start, dispose };
}
