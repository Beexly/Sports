import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";

export interface GhostPathPoint {
  readonly x: number;
  readonly z: number;
}

export function pulseMesh(mesh: AbstractMesh, elapsed: number, amount = 0.06): void {
  const scale = 1 + Math.sin(elapsed * 2.4) * amount;
  mesh.scaling.set(scale, scale, scale);
}

export function moveGhostAlongPath(mesh: AbstractMesh, path: readonly GhostPathPoint[], elapsed: number): void {
  if (path.length < 2) return;
  const segment = Math.floor(elapsed * 0.35) % path.length;
  const next = (segment + 1) % path.length;
  const t = (elapsed * 0.35) % 1;
  const a = path[segment]!;
  const b = path[next]!;
  mesh.position.x = a.x + (b.x - a.x) * t;
  mesh.position.z = a.z + (b.z - a.z) * t;
}
