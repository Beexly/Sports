export type CameraPresetId =
  | "runescape-isometric"
  | "third-person-follow"
  | "broadcast-wall"
  | "market-orbit"
  | "card-gallery"
  | "tunnel-approach"
  | "cockpit-overview"
  | "minimap-orthographic";

export interface CameraPreset {
  readonly id: CameraPresetId;
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly fov: number;
}

export const CAMERA_PRESETS: readonly CameraPreset[] = [
  { id: "runescape-isometric", position: [8, 9, 8], target: [0, 0, 0], fov: 42 },
  { id: "third-person-follow", position: [0, 4, 8], target: [0, 1, 0], fov: 50 },
  { id: "broadcast-wall", position: [0, 3, 10], target: [0, 2, 0], fov: 38 },
  { id: "market-orbit", position: [0, 10, 14], target: [0, 0, 0], fov: 46 },
  { id: "card-gallery", position: [0, 2.8, 6], target: [0, 1.4, 0], fov: 36 },
  { id: "tunnel-approach", position: [0, 2.2, 9], target: [0, 1.2, -4], fov: 44 },
  { id: "cockpit-overview", position: [0, 14, 10], target: [0, 0, 0], fov: 52 },
  { id: "minimap-orthographic", position: [0, 20, 0], target: [0, 0, 0], fov: 30 },
];
