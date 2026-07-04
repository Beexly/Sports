export interface RookiePlazaRoute {
  readonly id: string;
  readonly label: string;
  readonly status: "active" | "queued";
  readonly x: number;
  readonly z: number;
}

export interface RookiePlazaSnapshot {
  readonly roomId: "rookie-plaza";
  readonly roomLabel: string;
  readonly transport: "next-in-memory-room";
  readonly connectedPlayers: number;
  readonly serverTick: number;
  readonly routes: readonly RookiePlazaRoute[];
  readonly beatWall: {
    readonly source: "broadcast-wall";
    readonly bpm: number;
    readonly intensity: number;
  };
  readonly engine: {
    readonly streaming: "world-partition-local";
    readonly nanite: "priority-glb-chunks-pixel-lod";
    readonly lumen: "sdf-surface-cache-probes";
    readonly physics: "rapier-local";
    readonly vfx: "three-particles";
    readonly audio: "webaudio-metasynth";
    readonly pcg: "instanced-campus-props";
  };
}

interface RookiePlazaRoomStore {
  tick: number;
  lastSeenAt: number;
}

interface RookiePlazaGlobal {
  galaxyRookiePlazaRoom?: RookiePlazaRoomStore;
}

const routes: readonly RookiePlazaRoute[] = [
  { id: "rookie-plaza", label: "Rookie Plaza quest board", status: "active", x: 0, z: -10 },
  { id: "beat", label: "Beat Broadcast Wall", status: "active", x: -13, z: -4 },
  { id: "blacktop", label: "Blacktop signal sprint", status: "active", x: 14, z: -2 },
  { id: "depths", label: "Depths public trap", status: "queued", x: -9, z: 12 },
  { id: "vault", label: "Vault proof collection", status: "queued", x: 12, z: 13 },
];

export function getRookiePlazaSnapshot(now = Date.now()): RookiePlazaSnapshot {
  const roomGlobal = globalThis as typeof globalThis & RookiePlazaGlobal;
  const store = roomGlobal.galaxyRookiePlazaRoom ?? { tick: 0, lastSeenAt: now };
  store.tick += 1;
  store.lastSeenAt = now;
  roomGlobal.galaxyRookiePlazaRoom = store;

  return {
    roomId: "rookie-plaza",
    roomLabel: "Rookie Plaza live local room",
    transport: "next-in-memory-room",
    connectedPlayers: 1,
    serverTick: store.tick,
    routes,
    beatWall: {
      source: "broadcast-wall",
      bpm: 92 + (store.tick % 16),
      intensity: Number((0.62 + (store.tick % 5) * 0.06).toFixed(2)),
    },
    engine: {
      streaming: "world-partition-local",
      nanite: "priority-glb-chunks-pixel-lod",
      lumen: "sdf-surface-cache-probes",
      physics: "rapier-local",
      vfx: "three-particles",
      audio: "webaudio-metasynth",
      pcg: "instanced-campus-props",
    },
  };
}
