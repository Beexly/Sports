import { GlowLayer } from "@babylonjs/core/Layers/glowLayer.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import { PointLight } from "@babylonjs/core/Lights/pointLight.js";
import type { Scene } from "@babylonjs/core/scene.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { createSpatialEntity, type SpatialEntitySpec } from "./entities.js";
import { createSpatialMaterial, WEATHER_OVERLAY_COLORS } from "./materials.js";

export interface RookiePlazaWorldSpec {
  readonly weatherId: keyof typeof WEATHER_OVERLAY_COLORS;
  readonly entities: readonly SpatialEntitySpec[];
  readonly gates: readonly SpatialEntitySpec[];
}

export interface RookiePlazaWorld {
  readonly meshes: readonly AbstractMesh[];
  readonly player: AbstractMesh | null;
}

export function createRookiePlazaWorld(scene: Scene, spec: RookiePlazaWorldSpec): RookiePlazaWorld {
  const meshes: AbstractMesh[] = [];
  const glow = new GlowLayer("rookie-plaza-glow", scene);
  glow.intensity = 0.24;

  const floor = MeshBuilder.CreateGround("rookie-plaza-field-grid", { width: 15, height: 15, subdivisions: 24 }, scene);
  floor.material = createSpatialMaterial(scene, "obsidian");
  meshes.push(floor);

  const gridMaterial = createSpatialMaterial(scene, "grid", 0.72);
  const centerLineMaterial = createSpatialMaterial(scene, "signalCyan", 0.82);
  for (let index = -3; index <= 3; index += 1) {
    const offset = index * 1.8;
    const northSouth = MeshBuilder.CreateBox(`rookie-plaza-lane-ns-${index}`, { width: 0.018, height: 0.018, depth: 13.2 }, scene);
    northSouth.position.set(offset, 0.035, 0);
    northSouth.material = index === 0 ? centerLineMaterial : gridMaterial;
    meshes.push(northSouth);

    const eastWest = MeshBuilder.CreateBox(`rookie-plaza-lane-ew-${index}`, { width: 13.2, height: 0.018, depth: 0.018 }, scene);
    eastWest.position.set(0, 0.038, offset);
    eastWest.material = index === 0 ? centerLineMaterial : gridMaterial;
    meshes.push(eastWest);
  }

  const ring = MeshBuilder.CreateTorus("central-signal-ring", { diameter: 4.2, thickness: 0.035, tessellation: 96 }, scene);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  ring.material = createSpatialMaterial(scene, "stadiumGold");
  meshes.push(ring);

  const innerRing = MeshBuilder.CreateTorus("central-verify-ring", { diameter: 2.15, thickness: 0.026, tessellation: 80 }, scene);
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.y = 0.075;
  innerRing.material = createSpatialMaterial(scene, "verifyTeal");
  meshes.push(innerRing);

  const railMaterial = createSpatialMaterial(scene, "glass", 0.92);
  const railSpecs = [
    ["north", 0, -7.18, 14.2, 0.12] as const,
    ["south", 0, 7.18, 14.2, 0.12] as const,
    ["west", -7.18, 0, 0.12, 14.2] as const,
    ["east", 7.18, 0, 0.12, 14.2] as const,
  ];
  for (const [name, x, z, width, depth] of railSpecs) {
    const rail = MeshBuilder.CreateBox(`rookie-plaza-boundary-rail-${name}`, { width, height: 0.18, depth }, scene);
    rail.position.set(x, 0.15, z);
    rail.material = railMaterial;
    meshes.push(rail);
  }

  const mastMaterial = createSpatialMaterial(scene, "grid", 0.96);
  const lampMaterial = createSpatialMaterial(scene, "cardGlow", 0.86);
  const mastPositions = [
    [-6.7, -6.7],
    [6.7, -6.7],
    [-6.7, 6.7],
    [6.7, 6.7],
  ] as const;
  for (const [index, position] of mastPositions.entries()) {
    const mast = MeshBuilder.CreateCylinder(`rookie-plaza-light-mast-${index}`, { height: 2.4, diameter: 0.08, tessellation: 12 }, scene);
    mast.position.set(position[0], 1.22, position[1]);
    mast.material = mastMaterial;
    meshes.push(mast);

    const lamp = MeshBuilder.CreateBox(`rookie-plaza-light-bank-${index}`, { width: 0.72, height: 0.16, depth: 0.22 }, scene);
    lamp.position.set(position[0] * 0.96, 2.44, position[1] * 0.96);
    lamp.rotation.y = Math.atan2(-position[0], -position[1]);
    lamp.material = lampMaterial;
    meshes.push(lamp);
  }

  const weatherLight = new PointLight("rookie-weather-light", new Vector3(0, 5.8, -2.5), scene);
  weatherLight.diffuse = scene.fogColor;
  weatherLight.intensity = 4.2;

  for (const gate of spec.gates) meshes.push(createSpatialEntity(scene, gate));
  for (const entity of spec.entities) meshes.push(createSpatialEntity(scene, entity));

  const player = meshes.find((mesh) => mesh.metadata?.kind === "player") ?? null;
  return { meshes, player };
}

export const ROOKIE_PLAZA_COLLISION_BOUNDS = {
  minX: -6.4,
  maxX: 6.4,
  minZ: -6.4,
  maxZ: 6.4,
} as const;
