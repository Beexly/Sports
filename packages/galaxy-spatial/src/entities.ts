import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import type { Scene } from "@babylonjs/core/scene.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { createSpatialMaterial, type SpatialMaterialToken } from "./materials.js";

export type SpatialEntityKind = "player" | "npc" | "ghost" | "door" | "item" | "card" | "quest-marker" | "boss-marker" | "portal" | "transit-marker";

export interface SpatialEntitySpec {
  readonly id: string;
  readonly label: string;
  readonly kind: SpatialEntityKind;
  readonly position: readonly [number, number, number];
  readonly token: SpatialMaterialToken;
}

export function createSpatialEntity(scene: Scene, spec: SpatialEntitySpec): AbstractMesh {
  const mesh =
    spec.kind === "player"
      ? MeshBuilder.CreateCapsule(spec.id, { height: 1.25, radius: 0.26, tessellation: 10 }, scene)
      : spec.kind === "door" || spec.kind === "portal"
        ? MeshBuilder.CreateBox(spec.id, { width: 1.2, height: 1.9, depth: 0.28 }, scene)
        : spec.kind === "quest-marker" || spec.kind === "boss-marker" || spec.kind === "transit-marker"
          ? MeshBuilder.CreateTorus(spec.id, { diameter: 1.1, thickness: 0.04, tessellation: 48 }, scene)
          : MeshBuilder.CreateCylinder(spec.id, { height: 0.95, diameterTop: 0.32, diameterBottom: 0.44, tessellation: 10 }, scene);
  mesh.position = new Vector3(spec.position[0], spec.position[1], spec.position[2]);
  mesh.material = createSpatialMaterial(scene, spec.token, spec.kind === "ghost" ? 0.62 : 1);
  mesh.metadata = { galaxyEntityId: spec.id, label: spec.label, kind: spec.kind };
  decorateSpatialEntity(scene, mesh, spec);
  return mesh;
}

function decorateSpatialEntity(scene: Scene, mesh: AbstractMesh, spec: SpatialEntitySpec): void {
  if (spec.kind === "npc" || spec.kind === "ghost") {
    const head = MeshBuilder.CreateSphere(`${spec.id}-head`, { diameter: 0.34, segments: 12 }, scene);
    head.parent = mesh;
    head.position.y = 0.58;
    head.material = createSpatialMaterial(scene, spec.kind === "ghost" ? "ultraviolet" : "stadiumGold", spec.kind === "ghost" ? 0.58 : 0.92);

    const signalHalo = MeshBuilder.CreateTorus(`${spec.id}-signal-halo`, { diameter: 0.72, thickness: 0.025, tessellation: 36 }, scene);
    signalHalo.parent = mesh;
    signalHalo.position.y = 0.82;
    signalHalo.rotation.x = Math.PI / 2;
    signalHalo.material = createSpatialMaterial(scene, spec.kind === "ghost" ? "ultraviolet" : "signalCyan", spec.kind === "ghost" ? 0.48 : 0.78);
  }

  if (spec.kind === "door" || spec.kind === "portal") {
    const lintel = MeshBuilder.CreateBox(`${spec.id}-lintel`, { width: 1.55, height: 0.18, depth: 0.36 }, scene);
    lintel.parent = mesh;
    lintel.position.y = 1.02;
    lintel.material = createSpatialMaterial(scene, "stadiumGold", 0.88);

    const beacon = MeshBuilder.CreateSphere(`${spec.id}-beacon`, { diameter: 0.28, segments: 12 }, scene);
    beacon.parent = mesh;
    beacon.position.y = 1.28;
    beacon.material = createSpatialMaterial(scene, spec.token, 0.92);
  }

  if (spec.kind === "quest-marker" || spec.kind === "boss-marker" || spec.kind === "transit-marker") {
    const pylon = MeshBuilder.CreateCylinder(`${spec.id}-pylon`, { height: 1.25, diameter: 0.16, tessellation: 10 }, scene);
    pylon.parent = mesh;
    pylon.position.y = 0.62;
    pylon.material = createSpatialMaterial(scene, spec.token, spec.kind === "boss-marker" ? 0.92 : 0.74);
  }

  if (spec.kind === "player") {
    const base = MeshBuilder.CreateTorus(`${spec.id}-control-base`, { diameter: 0.82, thickness: 0.035, tessellation: 48 }, scene);
    base.parent = mesh;
    base.position.y = -0.62;
    base.rotation.x = Math.PI / 2;
    base.material = createSpatialMaterial(scene, "stadiumGold", 0.72);
  }
}
