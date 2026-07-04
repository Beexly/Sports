import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

class NodeFileReader {
  result = null;
  onloadend = null;
  onerror = null;

  readAsArrayBuffer(blob) {
    blob
      .arrayBuffer()
      .then((buffer) => {
        this.result = buffer;
        if (this.onloadend) this.onloadend({ target: this });
      })
      .catch((error) => {
        if (this.onerror) this.onerror(error);
      });
  }
}

globalThis.FileReader = NodeFileReader;

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const outputDir = path.join(repoRoot, "apps", "web", "public", "galaxy-dynasty", "assets");
const chunkOutputDir = path.join(outputDir, "chunks");

const lumenSettings = {
  giQuality: 0.78,
  reflectionQuality: 0.58,
  surfaceCacheResolution: 64,
  screenProbeCount: 5,
  finalGatherRays: 24,
  traceDistance: 52,
  temporalBlend: 0.86,
  bloomStrength: 0.52,
  bloomRadius: 0.36,
  bloomThreshold: 0.22,
  sdfSteps: 28,
};

const naniteStreaming = {
  clusterTriangleBudget: 128,
  virtualMemoryBudgetMb: 48,
  chunkMemoryBudgetMb: 4,
  maxAsyncChunkLoads: 2,
  pixelErrorThreshold: 38,
  rNaniteMaxPixelsPerEdge: 42,
  rNaniteStreamingNumInitialRootPages: 4,
};

const districts = [
  { label: "Rookie Plaza", x: 0, z: -10, color: 0xf4c95d },
  { label: "The Beat", x: -13, z: -4, color: 0x00e5ff },
  { label: "Blacktop", x: 14, z: -2, color: 0xf4c95d },
  { label: "Depths", x: -9, z: 12, color: 0xff2dd6 },
  { label: "Vault", x: 12, z: 13, color: 0x7a5cff },
];

const chunkSpecs = [
  { id: "north-academy", x: 0, z: -34, color: 0x00e5ff, seed: 0 },
  { id: "east-blacktop", x: 34, z: -6, color: 0xf4c95d, seed: 1 },
  { id: "south-vault", x: 10, z: 35, color: 0x7a5cff, seed: 2 },
  { id: "west-depths", x: -34, z: 11, color: 0xff2dd6, seed: 3 },
];

function material(name, color, emissive = 0x000000, intensity = 0) {
  const mat = new THREE.MeshStandardMaterial({
    name,
    color,
    emissive,
    emissiveIntensity: intensity,
    roughness: 0.52,
    metalness: 0.22,
  });
  return mat;
}

const asphalt = material("GD_asphalt_wet_night", 0x080b12);
const sidewalk = material("GD_sidewalk_blue_stone", 0x273043);
const gold = material("GD_route_gold_emissive", 0xf4c95d, 0xf4c95d, 0.44);
const cyan = material("GD_cyan_neon_emissive", 0x00e5ff, 0x00e5ff, 0.62);
const violet = material("GD_depth_violet_emissive", 0x7a5cff, 0x7a5cff, 0.42);
const buildingMat = material("GD_midnight_tower_shell", 0x121a2b, 0x030814, 0.12);
const windowMat = material("GD_window_surface_cache", 0x10243f, 0x00e5ff, 0.34);
const vehicleMat = material("GD_low_vehicle_body", 0x0e1525, 0x000000, 0);
const avatarMat = material("GD_avatar_coat", 0x111827);
const skinMat = material("GD_avatar_skin", 0xd7b88c);

function mesh(name, geometry, mat, position, scale, rotationY = 0) {
  const item = new THREE.Mesh(geometry, mat);
  item.name = name;
  item.position.set(position[0], position[1], position[2]);
  item.scale.set(scale[0], scale[1], scale[2]);
  item.rotation.y = rotationY;
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

function addBuilding(group, x, z, width, height, depth) {
  group.add(mesh(`GD_Tower_${x}_${z}`, new THREE.BoxGeometry(1, 1, 1), buildingMat, [x, height / 2, z], [width, height, depth]));
  for (let row = 1.1; row < height - 0.8; row += 1.3) {
    for (let col = -width / 2 + 0.55; col < width / 2; col += 1.05) {
      group.add(mesh(`GD_Window_${x}_${z}_${row.toFixed(1)}_${col.toFixed(1)}`, new THREE.BoxGeometry(0.34, 0.42, 0.05), windowMat, [x + col, row, z - depth / 2 - 0.04], [1, 1, 1]));
    }
  }
}

function addGate(group, district) {
  const gate = new THREE.Group();
  gate.name = `GD_Gate_${district.label.replace(/\s+/g, "_")}`;
  gate.position.set(district.x, 0, district.z);
  const accent = material(`GD_gate_${district.label}_accent`, district.color, district.color, 0.52);
  gate.add(mesh("GD_GatePylon_L", new THREE.BoxGeometry(0.5, 3.2, 0.5), accent, [-1.2, 1.6, 0], [1, 1, 1]));
  gate.add(mesh("GD_GatePylon_R", new THREE.BoxGeometry(0.5, 3.2, 0.5), accent, [1.2, 1.6, 0], [1, 1, 1]));
  gate.add(mesh("GD_GateLintel", new THREE.BoxGeometry(3.2, 0.36, 0.58), accent, [0, 3.2, 0], [1, 1, 1]));
  gate.add(mesh("GD_GateQuestBoard", new THREE.BoxGeometry(2.2, 0.72, 0.12), gold, [0, 2.24, -0.36], [1, 1, 1]));
  group.add(gate);
}

function addCitizen(group, name, x, z, accentMat) {
  const citizen = new THREE.Group();
  citizen.name = name;
  citizen.position.set(x, 0.9, z);
  citizen.add(mesh(`${name}_torso`, new THREE.CapsuleGeometry(0.34, 0.72, 8, 16), avatarMat, [0, 0.32, 0], [1, 1, 1]));
  citizen.add(mesh(`${name}_head`, new THREE.SphereGeometry(0.24, 18, 18), skinMat, [0, 0.98, 0], [1, 1, 1]));
  citizen.add(mesh(`${name}_visor`, new THREE.BoxGeometry(0.42, 0.08, 0.16), accentMat, [0, 1.03, -0.17], [1, 1, 1]));
  citizen.add(mesh(`${name}_shoulders`, new THREE.BoxGeometry(0.82, 0.18, 0.34), accentMat, [0, 0.68, 0], [1, 1, 1]));
  citizen.add(mesh(`${name}_left_leg`, new THREE.CapsuleGeometry(0.11, 0.54, 6, 10), avatarMat, [-0.14, -0.34, 0], [1, 1, 1]));
  citizen.add(mesh(`${name}_right_leg`, new THREE.CapsuleGeometry(0.11, 0.54, 6, 10), avatarMat, [0.14, -0.34, 0], [1, 1, 1]));
  group.add(citizen);
}

function addVehicle(group, x, z, rotationY) {
  const car = new THREE.Group();
  car.name = `GD_Vehicle_${x}_${z}`;
  car.position.set(x, 0.25, z);
  car.rotation.y = rotationY;
  car.add(mesh("GD_VehicleBody", new THREE.BoxGeometry(2.4, 0.52, 1.2), vehicleMat, [0, 0, 0], [1, 1, 1]));
  car.add(mesh("GD_VehicleCabin", new THREE.BoxGeometry(1.25, 0.44, 0.92), vehicleMat, [0.15, 0.46, 0], [1, 1, 1]));
  car.add(mesh("GD_VehicleHeadlight", new THREE.BoxGeometry(0.08, 0.1, 0.76), cyan, [-1.22, 0.05, 0], [1, 1, 1]));
  group.add(car);
}

function createStreamingChunk(spec) {
  const chunk = new THREE.Group();
  chunk.name = `GD_WorldPartition_${spec.id}`;
  chunk.userData = {
    clusterNode: {
      id: spec.id,
      childIds: [`${spec.id}:props`, `${spec.id}:routes`, `${spec.id}:signals`],
      clusterBudget: naniteStreaming.clusterTriangleBudget,
      rootPage: spec.seed % naniteStreaming.rNaniteStreamingNumInitialRootPages,
    },
  };

  const platformMat = material(`GD_${spec.id}_platform`, 0x151d28, 0x02060c, 0.12);
  const accent = material(`GD_${spec.id}_emissive_cluster`, spec.color, spec.color, 0.46);
  const shadow = material(`GD_${spec.id}_low_cluster`, 0x263247, spec.color, 0.14);
  chunk.add(mesh(`GD_${spec.id}_walkable_platform`, new THREE.BoxGeometry(17, 0.16, 14), platformMat, [0, -0.04, 0], [1, 1, 1]));

  for (let i = 0; i < 18; i += 1) {
    const angle = spec.seed + i * 1.618;
    const radius = 3.5 + ((i * 7 + spec.seed) % 5);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.75;
    const y = 0.42 + ((i + spec.seed) % 4) * 0.18;
    const scale = 0.5 + ((i + spec.seed) % 5) * 0.12;
    const geo = i % 2 === 0 ? new THREE.IcosahedronGeometry(0.34, 3) : new THREE.BoxGeometry(0.62, 0.62, 0.62);
    const mat = i % 2 === 0 ? accent : shadow;
    chunk.add(mesh(`GD_${spec.id}_cluster_${i}`, geo, mat, [x, y, z], [scale, scale, scale], angle));
    if (i % 6 === 0) {
      chunk.add(mesh(`GD_${spec.id}_pcg_route_${i}`, new THREE.BoxGeometry(0.12, 0.05, 6.6), gold, [x * 0.5, 0.12, z * 0.5], [1, 1, 1], angle));
    }
  }

  for (let i = 0; i < 4; i += 1) {
    const towerHeight = 1.8 + ((i + spec.seed) % 3) * 0.85;
    chunk.add(
      mesh(
        `GD_${spec.id}_distant_tower_${i}`,
        new THREE.BoxGeometry(1, 1, 1),
        platformMat,
        [-5.8 + i * 3.7, towerHeight / 2, 4.6 - (i % 2) * 2.8],
        [1.1, towerHeight, 1.1],
      ),
    );
  }

  return chunk;
}

async function exportGlb(object, filePath) {
  const exporter = new GLTFExporter();
  const glb = await new Promise((resolve, reject) => {
    exporter.parse(object, resolve, reject, { binary: true, trs: true, onlyVisible: true });
  });

  if (!(glb instanceof ArrayBuffer)) {
    throw new TypeError("Expected GLTFExporter to return binary ArrayBuffer output.");
  }

  await writeFile(filePath, Buffer.from(glb));
}

const scene = new THREE.Scene();
const city = new THREE.Group();
city.name = "GD_Rookie_Plaza_GLB_Kit";
scene.add(city);

city.add(mesh("GD_Floor_Walkable_Blacktop", new THREE.BoxGeometry(44, 0.12, 44), asphalt, [0, -0.08, 0], [1, 1, 1]));
city.add(mesh("GD_Road_Main_EW", new THREE.BoxGeometry(44, 0.05, 5.2), asphalt, [0, 0.02, 0], [1, 1, 1]));
city.add(mesh("GD_Road_Main_NS", new THREE.BoxGeometry(5.2, 0.05, 44), asphalt, [0, 0.03, 0], [1, 1, 1]));
for (let offset = -20; offset <= 20; offset += 4) {
  city.add(mesh(`GD_RouteStripe_EW_${offset}`, new THREE.BoxGeometry(1.5, 0.08, 0.06), gold, [offset, 0.09, 0], [1, 1, 1]));
  city.add(mesh(`GD_RouteStripe_NS_${offset}`, new THREE.BoxGeometry(0.06, 0.08, 1.5), gold, [0, 0.09, offset], [1, 1, 1]));
}

for (const block of [
  [-13, -13, 12, 9],
  [13, -14, 12, 8],
  [-15, 14, 10, 9],
  [14, 14, 12, 10],
  [0, -16, 9, 7],
  [0, 16, 8, 7],
]) {
  city.add(mesh(`GD_Sidewalk_${block[0]}_${block[1]}`, new THREE.BoxGeometry(block[2], 0.18, block[3]), sidewalk, [block[0], 0.02, block[1]], [1, 1, 1]));
}

for (const building of [
  [-18, -17, 4, 10, 5],
  [-11, -18, 5, 7, 4],
  [12, -18, 6, 12, 5],
  [19, -10, 4, 8, 4],
  [-18, 11, 5, 11, 5],
  [-9, 17, 6, 8, 4],
  [10, 17, 5, 10, 5],
  [18, 14, 5, 7, 4],
]) {
  addBuilding(city, building[0], building[1], building[2], building[3], building[4]);
}

for (const district of districts) addGate(city, district);
for (const district of districts) {
  const length = Math.hypot(district.x, district.z);
  city.add(mesh(`GD_RuneScape_Readable_Route_${district.label.replace(/\s+/g, "_")}`, new THREE.BoxGeometry(0.18, 0.06, length), gold, [district.x / 2, 0.13, district.z / 2], [1, 1, 1], Math.atan2(district.x, district.z)));
}

for (const npc of [
  ["GD_NPC_QuestScout", -4, -7, cyan],
  ["GD_NPC_BeatRunner", -2, -8.5, violet],
  ["GD_NPC_BlacktopCourier", 3.5, -6, gold],
  ["GD_NPC_DepthsWitness", -6, 4.5, violet],
]) {
  addCitizen(city, npc[0], npc[1], npc[2], npc[3]);
}

addVehicle(city, -7, 1.8, 0.1);
addVehicle(city, 8, -1.8, Math.PI);
addVehicle(city, 15, -8, -0.35);

const beatWall = new THREE.Group();
beatWall.name = "GD_Beat_Broadcast_Wall_Spatial_Instrument";
beatWall.position.set(-13, 0, -4);
beatWall.add(mesh("GD_BeatWall_Frame", new THREE.BoxGeometry(4.6, 3, 0.3), cyan, [0, 1.8, 0], [1, 1, 1]));
for (let i = 0; i < 16; i += 1) {
  beatWall.add(mesh("beat-waveform-bar", new THREE.BoxGeometry(0.12, 0.5 + (i % 5) * 0.18, 0.08), gold, [-1.8 + i * 0.24, 1.58, -0.55], [1, 1, 1]));
}
city.add(beatWall);

await mkdir(chunkOutputDir, { recursive: true });
await exportGlb(city, path.join(outputDir, "rookie-plaza-city-kit.glb"));
for (const chunkSpec of chunkSpecs) {
  await exportGlb(createStreamingChunk(chunkSpec), path.join(chunkOutputDir, `${chunkSpec.id}.glb`));
}
await writeFile(
  path.join(outputDir, "higgsfield-manifest.json"),
  JSON.stringify(
    {
      name: "Galaxy Dynasty Rookie Plaza HIGGSFIELD manifest",
      generatedAt: new Date().toISOString(),
      source: "Original in-repo procedural GLB kit generated from scripts/galaxy-dynasty/generate-city-kit.mjs",
      license: "Project-owned original mesh data; no external GTA clone assets or code copied.",
      runtime: {
        format: "glb",
        renderer: "three",
        lighting: "dynamic-emissive-bloom-fog-tone-mapped-lumen-style",
        lumenSettings,
        ue5InspiredSystems: [
          "world-partition-distance-streaming",
          "lumen-style-sdf-surface-cache-and-screen-probes",
          "nanite-style-cluster-dag-and-pixel-lod",
          "nanite-style-priority-glb-chunk-streaming",
          "rapier-chaos-style-rigid-body-props",
          "niagara-style-three-particles",
          "metasounds-style-webaudio-synth",
          "pcg-instanced-campus-props-and-routes",
        ],
        streaming: {
          clusterTriangleBudget: naniteStreaming.clusterTriangleBudget,
          virtualMemoryBudgetMb: naniteStreaming.virtualMemoryBudgetMb,
          chunkMemoryBudgetMb: naniteStreaming.chunkMemoryBudgetMb,
          maxAsyncChunkLoads: naniteStreaming.maxAsyncChunkLoads,
          pixelErrorThreshold: naniteStreaming.pixelErrorThreshold,
          rNaniteMaxPixelsPerEdge: naniteStreaming.rNaniteMaxPixelsPerEdge,
          rNaniteStreamingNumInitialRootPages: naniteStreaming.rNaniteStreamingNumInitialRootPages,
          maxInitialMemoryMb: 24,
          culling: "distance-priority Object3D visibility plus camera frustum checks",
          lod: "projected pixel-size high/low instanced cluster switching",
          worldPartitionChunks: chunkSpecs.map((chunk) => chunk.id),
          priorityChunkUrls: chunkSpecs.map((chunk) => `/galaxy-dynasty/assets/chunks/${chunk.id}.glb`),
          compressionDecision: "uncompressed local kit now; Draco or Meshopt reserved for larger imported packs",
        },
      },
      assets: [
        {
          id: "rookie-plaza-city-kit",
          url: "/galaxy-dynasty/assets/rookie-plaza-city-kit.glb",
          purpose: "walkable plaza, streets, gates, NPC silhouettes, vehicles, Beat Wall",
        },
        ...chunkSpecs.map((chunk) => ({
          id: `world-partition-${chunk.id}`,
          url: `/galaxy-dynasty/assets/chunks/${chunk.id}.glb`,
          purpose: "priority-loaded Nanite-style campus chunk GLB for distance and pixel LOD streaming",
        })),
      ],
    },
    null,
    2,
  ),
);

console.log(`Generated ${path.join(outputDir, "rookie-plaza-city-kit.glb")}`);
console.log(`Generated ${chunkSpecs.length} streaming chunk GLBs in ${chunkOutputDir}`);
