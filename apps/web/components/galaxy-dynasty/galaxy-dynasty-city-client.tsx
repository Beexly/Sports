"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MutableRefObject, PointerEvent } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { RookiePlazaSnapshot } from "@/lib/galaxy-dynasty/rookie-plaza-room";
import type { RigidBody, World as RapierWorld } from "@dimforge/rapier3d-compat";

type DistrictId = "plaza" | "beat" | "blacktop" | "depths" | "vault";
type ThreeGroup = InstanceType<typeof THREE.Group>;
type ThreeMaterial = InstanceType<typeof THREE.Material>;
type ThreeObject3D = InstanceType<typeof THREE.Object3D>;
type ThreePerspectiveCamera = InstanceType<typeof THREE.PerspectiveCamera>;
type ThreeScene = InstanceType<typeof THREE.Scene>;
type ThreeVector3 = InstanceType<typeof THREE.Vector3>;

interface DistrictAnchor {
  readonly id: DistrictId;
  readonly label: string;
  readonly role: string;
  readonly position: ThreeVector3;
  readonly color: number;
}

interface TouchVector {
  readonly x: number;
  readonly y: number;
}

interface CampusChunk {
  readonly id: string;
  readonly center: ThreeVector3;
  readonly radius: number;
  readonly root: ThreeGroup;
  readonly highDetail: ThreeObject3D;
  readonly lowDetail: ThreeObject3D;
  loaded: boolean;
}

interface StreamingStats {
  readonly loaded: number;
  readonly highDetail: number;
  readonly total: number;
}

interface ParticleField {
  readonly points: InstanceType<typeof THREE.Points>;
  readonly positions: Float32Array;
  readonly velocities: Float32Array;
}

interface PhysicsLink {
  readonly mesh: ThreeObject3D;
  readonly body: RigidBody;
}

interface PhysicsBridge {
  readonly world: RapierWorld;
  readonly links: readonly PhysicsLink[];
  step: (delta: number, elapsed: number) => void;
  dispose: () => void;
}

interface GalaxyWorld {
  readonly scene: ThreeScene;
  readonly city: ThreeGroup;
  readonly neon: readonly ThreeMaterial[];
  readonly chunks: readonly CampusChunk[];
  readonly particles: ParticleField;
  assetRoot: ThreeGroup | null;
}

const CITY_KIT_ASSET = {
  id: "rookie-plaza-city-kit",
  url: "/galaxy-dynasty/assets/rookie-plaza-city-kit.glb",
  license: "original-repo-generated",
  memoryBudgetMb: 24,
  clusterBudget: 128,
} as const;

const DISTRICTS: readonly [DistrictAnchor, ...DistrictAnchor[]] = [
  { id: "plaza", label: "Rookie Plaza", role: "Quests / NPCs", position: new THREE.Vector3(0, 0, -10), color: 0xf4c95d },
  { id: "beat", label: "The Beat", role: "Broadcast Wall", position: new THREE.Vector3(-13, 0, -4), color: 0x00e5ff },
  { id: "blacktop", label: "Blacktop", role: "Signal Sprint", position: new THREE.Vector3(14, 0, -2), color: 0xf4c95d },
  { id: "depths", label: "Depths", role: "Public Trap", position: new THREE.Vector3(-9, 0, 12), color: 0xff2dd6 },
  { id: "vault", label: "Vault", role: "Collection / Proof", position: new THREE.Vector3(12, 0, 13), color: 0x7a5cff },
];

export function GalaxyDynastyCityClient() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const keysRef = useRef(new Set<string>());
  const touchVectorRef = useRef<TouchVector>({ x: 0, y: 0 });
  const audioContextRef = useRef<AudioContext | null>(null);
  const [touchEnabled, setTouchEnabled] = useState(false);
  const [touchDisplay, setTouchDisplay] = useState<TouchVector>({ x: 0, y: 0 });
  const [nearestDistrict, setNearestDistrict] = useState<DistrictAnchor>(() => DISTRICTS[0]);
  const [speedLabel, setSpeedLabel] = useState("Walk");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [roomStatus, setRoomStatus] = useState("Room sync pending");
  const [engineStatus, setEngineStatus] = useState("Streaming boot");

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const sync = () => setTouchEnabled(coarse.matches);
    sync();
    coarse.addEventListener("change", sync);
    return () => coarse.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    let alive = true;
    const syncRoom = async () => {
      try {
        const response = await fetch("/api/galaxy/rookie-plaza", { cache: "no-store" });
        if (!response.ok) return;
        const snapshot = (await response.json()) as RookiePlazaSnapshot;
        if (alive) setRoomStatus(`Room tick ${snapshot.serverTick} · ${snapshot.beatWall.bpm} bpm`);
      } catch {
        if (alive) setRoomStatus("Room sync offline");
      }
    };
    void syncRoom();
    const intervalId = window.setInterval(() => void syncRoom(), 5000);
    return () => {
      alive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070d);
    scene.fog = new THREE.FogExp2(0x060914, 0.026);

    const camera = new THREE.PerspectiveCamera(58, mount.clientWidth / mount.clientHeight, 0.1, 240);
    camera.position.set(0, 6.6, 10);

    const world = buildGalaxyCity(scene);
    void hydrateGalaxyAssets(scene, world);
    const player = createPlayerAvatar();
    player.position.set(0, 0.9, 7.5);
    scene.add(player);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(mount.clientWidth, mount.clientHeight), 0.44, 0.32, 0.26);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const playerState = {
      velocity: new THREE.Vector3(),
      facing: 0,
      verticalVelocity: 0,
      grounded: true,
    };

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let physicsBridge: PhysicsBridge | null = null;
    let nextEngineHudAt = 0;

    void createRapierPhysics(scene).then((bridge) => {
      if (disposed) {
        bridge.dispose();
        return;
      }
      physicsBridge = bridge;
      setEngineStatus("Rapier motion online");
    });

    const onKeyDown = (event: KeyboardEvent) => {
      keysRef.current.add(event.code);
      if (event.code === "Space" && playerState.grounded) {
        playerState.verticalVelocity = 6.8;
        playerState.grounded = false;
      }
      if (event.code === "KeyE") playBeatPulse(audioContextRef, 0.65);
    };
    const onKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.code);
    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      composer.setSize(mount.clientWidth, mount.clientHeight);
      bloom.setSize(mount.clientWidth, mount.clientHeight);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", onResize);

    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      updatePlayer(player, playerState, keysRef.current, touchVectorRef.current, delta);
      keepInsideCity(player.position);
      updateCamera(camera, player, playerState.facing, delta);
      const streamingStats = updateCity(world, player.position, camera, clock.elapsedTime);
      physicsBridge?.step(delta, clock.elapsedTime);
      const nearest = findNearestDistrict(player.position);
      setNearestDistrict((current) => (current.id === nearest.id ? current : nearest));
      const joystickMoving = Math.hypot(touchVectorRef.current.x, touchVectorRef.current.y) > 0.12;
      setSpeedLabel(keysRef.current.has("ShiftLeft") || keysRef.current.has("ShiftRight") ? "Sprint" : joystickMoving ? "Move" : "Walk");
      if (clock.elapsedTime >= nextEngineHudAt) {
        nextEngineHudAt = clock.elapsedTime + 0.5;
        setEngineStatus(
          `Chunks ${streamingStats.loaded}/${streamingStats.total} · LOD ${streamingStats.highDetail} high · Rapier ${
            physicsBridge?.links.length ?? 0
          } bodies`,
        );
      }
      composer.render();
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
      physicsBridge?.dispose();
      composer.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <main style={styles.shell}>
      <div ref={mountRef} aria-label="Galaxy Dynasty GTA-style city prototype" style={styles.viewport} />
      <div style={styles.topHud}>
        <div style={styles.brand}>GALAXY DYNASTY</div>
        <div style={{ ...styles.statusLine, ...(touchEnabled ? styles.statusLineMobile : undefined) }}>
          <span>{speedLabel}</span>
          {touchEnabled ? <span>Touch move</span> : <span>WASD move</span>}
          {!touchEnabled && <span>Shift sprint</span>}
          {!touchEnabled && <span>Space jump</span>}
          <span>E pulse</span>
          <span style={styles.roomChip}>{roomStatus}</span>
          <span aria-label="Galaxy engine status" style={styles.roomChip}>
            {engineStatus}
          </span>
        </div>
      </div>
      <div style={{ ...styles.minimap, ...(touchEnabled ? styles.minimapMobile : undefined) }} aria-label="District minimap">
        {DISTRICTS.map((district) => (
          <span
            key={district.id}
            style={{
              ...styles.mapDot,
              left: `${50 + district.position.x * 2.4}%`,
              top: `${50 + district.position.z * 2.1}%`,
              background: `#${district.color.toString(16).padStart(6, "0")}`,
            }}
            title={district.label}
          />
        ))}
        <span style={styles.playerDot} />
      </div>
      <div style={{ ...styles.prompt, ...(touchEnabled ? styles.promptMobile : undefined) }}>
        <div style={styles.promptKicker}>NEAREST ROUTE</div>
        <strong>{nearestDistrict.label}</strong>
        <span>{nearestDistrict.role}</span>
      </div>
      <div style={{ ...styles.beatPanel, ...(touchEnabled ? styles.beatPanelMobile : undefined) }}>
        <button
          type="button"
          onClick={() => {
            setAudioEnabled((value) => !value);
            playBeatPulse(audioContextRef, 0.72);
          }}
          style={styles.panelButton}
        >
          {audioEnabled ? "Pulse Audio On" : "Enable Beat Pulse"}
        </button>
        <button type="button" onClick={() => playBeatPulse(audioContextRef, 0.92)} style={styles.panelButton}>
          Strike Broadcast
        </button>
      </div>
      {touchEnabled && (
        <div
          aria-label="Mobile movement joystick"
          style={styles.joystick}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setTouchDisplay(updateTouchVector(event, touchVectorRef));
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) setTouchDisplay(updateTouchVector(event, touchVectorRef));
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture(event.pointerId);
            touchVectorRef.current = { x: 0, y: 0 };
            setTouchDisplay({ x: 0, y: 0 });
          }}
          onPointerCancel={() => {
            touchVectorRef.current = { x: 0, y: 0 };
            setTouchDisplay({ x: 0, y: 0 });
          }}
        >
          <span
            style={{
              ...styles.joystickKnob,
              transform: `translate(calc(-50% + ${touchDisplay.x * 34}px), calc(-50% + ${touchDisplay.y * 34}px))`,
            }}
          />
        </div>
      )}
    </main>
  );
}

function buildGalaxyCity(scene: ThreeScene): GalaxyWorld {
  const city = new THREE.Group();
  scene.add(city);

  const hemi = new THREE.HemisphereLight(0x8fb6ff, 0x090a12, 1.15);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xdde7ff, 3.4);
  moon.position.set(-9, 18, 7);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  scene.add(moon);

  const asphalt = new THREE.MeshStandardMaterial({ color: 0x111723, roughness: 0.88, metalness: 0.08 });
  const sidewalk = new THREE.MeshStandardMaterial({ color: 0x242b38, roughness: 0.78, metalness: 0.12 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xf4c95d, emissive: 0x4a3300, roughness: 0.42, metalness: 0.35 });
  const cyan = new THREE.MeshStandardMaterial({ color: 0x20d6ff, emissive: 0x007788, roughness: 0.36, metalness: 0.25 });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(44, 0.12, 44), asphalt);
  floor.receiveShadow = true;
  floor.position.y = -0.08;
  floor.userData.streamRadius = 64;
  city.add(floor);

  addRoad(city, 0, 0, 44, 5.2, 0);
  addRoad(city, 0, 0, 5.2, 44, Math.PI / 2);
  addRoad(city, -12, 8, 22, 3.6, -0.28);
  addRoad(city, 13, -7, 20, 3.6, 0.32);

  for (let offset = -20; offset <= 20; offset += 4) {
    addLaneMark(city, offset, 0, 1.5, 0.06, gold);
    addLaneMark(city, 0, offset, 0.06, 1.5, gold);
  }

  const sidewalkBlocks = [
    [-13, -13, 12, 9],
    [13, -14, 12, 8],
    [-15, 14, 10, 9],
    [14, 14, 12, 10],
    [0, -16, 9, 7],
    [0, 16, 8, 7],
  ] as const;
  for (const [x, z, width, depth] of sidewalkBlocks) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, depth), sidewalk);
    block.position.set(x, 0.02, z);
    block.receiveShadow = true;
    block.userData.streamRadius = 46;
    city.add(block);
  }

  const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0x121a2b, roughness: 0.58, metalness: 0.35 });
  const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x10243f, emissive: 0x071b35, roughness: 0.28, metalness: 0.65 });
  const buildingPositions = [
    [-18, -17, 4, 10, 5],
    [-11, -18, 5, 7, 4],
    [12, -18, 6, 12, 5],
    [19, -10, 4, 8, 4],
    [-18, 11, 5, 11, 5],
    [-9, 17, 6, 8, 4],
    [10, 17, 5, 10, 5],
    [18, 14, 5, 7, 4],
  ] as const;
  for (const [x, z, width, height, depth] of buildingPositions) {
    const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), buildingMaterial);
    building.position.set(x, height / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    building.userData.streamRadius = 48;
    city.add(building);
    addWindowGrid(city, x, z - depth / 2 - 0.02, width, height, glassMaterial);
  }

  for (const district of DISTRICTS) addDistrictGate(city, district, cyan);
  addQuestDressing(city);
  addNpcCrowd(city);
  addVehicles(city);
  addBeatTower(city);
  const chunks = createCampusChunks();
  const particles = createParticleField();
  scene.add(particles.points);

  return { scene, city, neon: [cyan, gold], chunks, particles, assetRoot: null };
}

function createCampusChunks(): readonly CampusChunk[] {
  const specs = [
    ["north-academy", 0, -34, 0x00e5ff],
    ["east-blacktop", 34, -6, 0xf4c95d],
    ["south-vault", 10, 35, 0x7a5cff],
    ["west-depths", -34, 11, 0xff2dd6],
  ] as const;
  return specs.map(([id, x, z, color], index) => createCampusChunk(id, new THREE.Vector3(x, 0, z), color, index));
}

function createCampusChunk(id: string, center: ThreeVector3, color: number, seed: number): CampusChunk {
  const root = new THREE.Group();
  root.name = `WorldPartition_${id}`;
  root.position.copy(center);
  root.userData.clusterNode = { id, childIds: [`${id}:props`, `${id}:routes`, `${id}:signals`], clusterBudget: CITY_KIT_ASSET.clusterBudget };

  const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x151d28, roughness: 0.74, metalness: 0.14 });
  const platform = new THREE.Mesh(new THREE.BoxGeometry(17, 0.16, 14), platformMaterial);
  platform.position.y = -0.04;
  platform.receiveShadow = true;
  root.add(platform);

  const highMaterial = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.34, roughness: 0.32, metalness: 0.42 });
  const lowMaterial = new THREE.MeshStandardMaterial({ color: 0x263247, emissive: color, emissiveIntensity: 0.12, roughness: 0.8 });
  const highDetail = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.34, 3), highMaterial, 18);
  const lowDetail = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), lowMaterial, 18);
  highDetail.name = `NaniteHigh_${id}`;
  lowDetail.name = `NaniteLow_${id}`;

  const routeMaterial = new THREE.MeshStandardMaterial({ color: 0xf4c95d, emissive: 0xf4c95d, emissiveIntensity: 0.34 });
  for (let i = 0; i < 18; i += 1) {
    const angle = seed + i * 1.618;
    const radius = 3.5 + ((i * 7 + seed) % 5);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.75;
    const y = 0.42 + ((i + seed) % 4) * 0.18;
    const scale = 0.5 + ((i + seed) % 5) * 0.12;
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(scale, scale, scale));
    highDetail.setMatrixAt(i, matrix);
    lowDetail.setMatrixAt(i, matrix);
    if (i % 6 === 0) {
      const route = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 6.6), routeMaterial);
      route.position.set(x * 0.5, 0.12, z * 0.5);
      route.rotation.y = angle;
      root.add(route);
    }
  }
  highDetail.instanceMatrix.needsUpdate = true;
  lowDetail.instanceMatrix.needsUpdate = true;
  root.add(highDetail, lowDetail);

  const districtLink = DISTRICTS[seed % DISTRICTS.length]?.position.clone().sub(center) ?? DISTRICTS[0].position.clone().sub(center);
  const road = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, Math.max(8, districtLink.length() * 0.44)), routeMaterial);
  road.position.set(-districtLink.x * 0.22, 0.1, -districtLink.z * 0.22);
  road.rotation.y = Math.atan2(districtLink.x, districtLink.z);
  root.add(road);

  return {
    id,
    center,
    radius: 34,
    root,
    highDetail,
    lowDetail,
    loaded: false,
  };
}

function createParticleField(): ParticleField {
  const count = 260;
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const radius = 1.6 + (i % 19) * 0.08;
    const angle = i * 2.39996;
    positions[i * 3] = -13 + Math.cos(angle) * radius;
    positions[i * 3 + 1] = 1.2 + (i % 11) * 0.18;
    positions[i * 3 + 2] = -4 + Math.sin(angle) * radius;
    velocities[i * 3] = Math.cos(angle) * 0.08;
    velocities[i * 3 + 1] = 0.18 + (i % 5) * 0.018;
    velocities[i * 3 + 2] = Math.sin(angle) * 0.08;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0x00e5ff,
    size: 0.08,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.name = "NiagaraStyle_BeatParticles";
  return { points, positions, velocities };
}

async function createRapierPhysics(scene: ThreeScene): Promise<PhysicsBridge> {
  const RAPIER = await import("@dimforge/rapier3d-compat");
  await RAPIER.init();
  const physicsWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  physicsWorld.createCollider(RAPIER.ColliderDesc.cuboid(22, 0.1, 22).setTranslation(0, -0.12, 0));
  physicsWorld.createCollider(RAPIER.ColliderDesc.cuboid(0.1, 2, 22).setTranslation(-22, 1, 0));
  physicsWorld.createCollider(RAPIER.ColliderDesc.cuboid(0.1, 2, 22).setTranslation(22, 1, 0));
  physicsWorld.createCollider(RAPIER.ColliderDesc.cuboid(22, 2, 0.1).setTranslation(0, 1, -22));
  physicsWorld.createCollider(RAPIER.ColliderDesc.cuboid(22, 2, 0.1).setTranslation(0, 1, 22));

  const material = new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.44, roughness: 0.42 });
  const links: PhysicsLink[] = [];
  const startingPositions = [
    [-3.8, 2.2, -2.8],
    [3.6, 2.6, -3.1],
    [-2.5, 2.9, 3.2],
    [4.2, 3.1, 3.8],
    [0.6, 3.4, -6.2],
  ] as const;

  for (const [index, position] of startingPositions.entries()) {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 2), material.clone());
    mesh.name = `RapierSignalBody_${index}`;
    mesh.castShadow = true;
    mesh.position.set(position[0], position[1], position[2]);
    scene.add(mesh);
    const body = physicsWorld.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position[0], position[1], position[2])
        .setLinvel((index % 2 === 0 ? 0.8 : -0.7) + index * 0.04, 0.4, 0.5 - index * 0.08),
    );
    physicsWorld.createCollider(RAPIER.ColliderDesc.ball(0.32), body);
    links.push({ mesh, body });
  }

  return {
    world: physicsWorld,
    links,
    step(delta: number, elapsed: number) {
      physicsWorld.timestep = THREE.MathUtils.clamp(delta, 1 / 120, 1 / 30);
      physicsWorld.step();
      for (const [index, link] of links.entries()) {
        const translation = link.body.translation();
        if (translation.y < 0.32 || Math.abs(translation.x) > 20 || Math.abs(translation.z) > 20) {
          const resetX = -4 + index * 2;
          link.body.setTranslation({ x: resetX, y: 2.4 + index * 0.28, z: -2 + Math.sin(elapsed + index) * 3 }, true);
          link.body.setLinvel({ x: index % 2 === 0 ? 0.7 : -0.7, y: 0.6, z: 0.32 }, true);
        }
        const next = link.body.translation();
        link.mesh.position.set(next.x, next.y, next.z);
      }
    },
    dispose() {
      for (const link of links) scene.remove(link.mesh);
      physicsWorld.free();
    },
  };
}

function addRoad(group: ThreeGroup, x: number, z: number, width: number, depth: number, rotation: number) {
  const road = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.05, depth),
    new THREE.MeshStandardMaterial({ color: 0x070a10, roughness: 0.92, metalness: 0.05 }),
  );
  road.position.set(x, 0.02, z);
  road.rotation.y = rotation;
  road.receiveShadow = true;
  road.userData.streamRadius = 62;
  group.add(road);
}

function addLaneMark(group: ThreeGroup, x: number, z: number, width: number, depth: number, material: ThreeMaterial) {
  const mark = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, depth), material);
  mark.position.set(x, 0.09, z);
  mark.userData.streamRadius = 52;
  group.add(mark);
}

function addWindowGrid(group: ThreeGroup, x: number, z: number, width: number, height: number, material: ThreeMaterial) {
  for (let row = 1; row < height - 1; row += 1.4) {
    for (let col = -width / 2 + 0.55; col < width / 2; col += 1.05) {
      const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.04), material);
      windowMesh.position.set(x + col, row, z);
      windowMesh.userData.streamRadius = 34;
      group.add(windowMesh);
    }
  }
}

function addDistrictGate(group: ThreeGroup, district: DistrictAnchor, accent: ThreeMaterial) {
  const base = new THREE.Group();
  base.position.copy(district.position);
  const pylonMaterial = new THREE.MeshStandardMaterial({
    color: 0x10182a,
    emissive: district.color,
    emissiveIntensity: 0.12,
    roughness: 0.44,
    metalness: 0.48,
  });
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 0.5), pylonMaterial);
  const right = left.clone();
  left.position.set(-1.2, 1.6, 0);
  right.position.set(1.2, 1.6, 0);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.36, 0.58), accent);
  lintel.position.set(0, 3.2, 0);
  const sign = makeTextSign(district.label, district.role, district.color);
  sign.position.set(0, 2.35, -0.32);
  base.add(left, right, lintel, sign);
  base.userData.streamRadius = 42;
  group.add(base);

  const light = new THREE.PointLight(district.color, 12, 10);
  light.position.set(district.position.x, 3.5, district.position.z);
  group.add(light);
}

function addQuestDressing(group: ThreeGroup) {
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x2a3142, roughness: 0.66, metalness: 0.28 });
  const boardMaterial = new THREE.MeshStandardMaterial({ color: 0x151d30, emissive: 0xf4c95d, emissiveIntensity: 0.16, roughness: 0.5 });
  const routeMaterial = new THREE.MeshStandardMaterial({ color: 0xf4c95d, emissive: 0xf4c95d, emissiveIntensity: 0.48 });
  const benches = [
    [-5.2, -3.6, 0.2],
    [5.6, -3.1, -0.1],
    [-4.8, 5.1, Math.PI],
    [5.1, 4.8, Math.PI],
  ] as const;
  for (const [x, z, rotation] of benches) {
    const bench = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.44), railMaterial);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.54, 0.12), railMaterial);
    back.position.set(0, 0.34, 0.25);
    bench.add(seat, back);
    bench.position.set(x, 0.42, z);
    bench.rotation.y = rotation;
    bench.userData.streamRadius = 30;
    group.add(bench);
  }

  for (const district of DISTRICTS) {
    const route = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, district.position.distanceTo(new THREE.Vector3(0, 0, 0))), routeMaterial);
    route.position.set(district.position.x / 2, 0.13, district.position.z / 2);
    route.rotation.y = Math.atan2(district.position.x, district.position.z);
    route.userData.streamRadius = 42;
    group.add(route);
  }

  const kioskPositions = [
    [-2.6, -4.2],
    [2.8, -4.1],
    [-2.2, 4.3],
    [2.5, 4.4],
  ] as const;
  for (const [x, z] of kioskPositions) {
    const kiosk = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 12), railMaterial);
    post.position.y = 0.62;
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.72, 0.1), boardMaterial);
    board.position.y = 1.28;
    kiosk.add(post, board);
    kiosk.position.set(x, 0, z);
    kiosk.lookAt(0, 0, 0);
    kiosk.userData.streamRadius = 32;
    group.add(kiosk);
  }
}

function makeTextSign(title: string, subtitle: string, color: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#05070d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = `#${color.toString(16).padStart(6, "0")}`;
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    ctx.fillStyle = "#f5f7ff";
    ctx.font = "700 42px sans-serif";
    ctx.fillText(title, 32, 82);
    ctx.fillStyle = "#9fb0d2";
    ctx.font = "500 26px sans-serif";
    ctx.fillText(subtitle, 32, 126);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  return new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.98), material);
}

function addNpcCrowd(group: ThreeGroup) {
  const positions = [
    [-4, 0, -7],
    [-2, 0, -8.5],
    [3.5, 0, -6],
    [6, 0, 2],
    [-6, 0, 4.5],
    [1.5, 0, 10],
  ] as const;
  positions.forEach((position, index) => {
    const npc = createCitizen(index % 2 === 0 ? 0x00e5ff : 0x7a5cff);
    npc.position.set(position[0], 0.86, position[2]);
    npc.rotation.y = index * 0.7;
    group.add(npc);
  });
}

function addVehicles(group: ThreeGroup) {
  const carMaterial = new THREE.MeshStandardMaterial({ color: 0x0e1525, roughness: 0.45, metalness: 0.55 });
  const glowMaterial = new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.4 });
  const positions = [
    [-7, 0.25, 1.8, 0.1],
    [8, 0.25, -1.8, Math.PI],
    [15, 0.25, -8, -0.35],
  ] as const;
  for (const [x, y, z, rotation] of positions) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.52, 1.2), carMaterial);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.44, 0.92), carMaterial);
    cabin.position.y = 0.46;
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.76), glowMaterial);
    headlight.position.set(-1.22, 0.05, 0);
    car.add(body, cabin, headlight);
    car.position.set(x, y, z);
    car.rotation.y = rotation;
    group.add(car);
  }
}

function addBeatTower(group: ThreeGroup) {
  const tower = new THREE.Group();
  tower.position.set(-13, 0, -4);
  const material = new THREE.MeshStandardMaterial({ color: 0x071827, emissive: 0x00e5ff, emissiveIntensity: 0.28, roughness: 0.38, metalness: 0.5 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3, 0.3), material);
  wall.position.y = 1.8;
  tower.add(wall);
  for (let i = 0; i < 5; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.65 + i * 0.18, 0.018, 8, 64),
      new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.2 - i * 0.12 }),
    );
    ring.position.set(-1.8 + i * 0.9, 1.2 + Math.sin(i) * 0.45, -0.35);
    ring.rotation.x = Math.PI / 2;
    ring.name = "beat-ring";
    tower.add(ring);
  }
  for (let i = 0; i < 16; i += 1) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.5 + (i % 5) * 0.18, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xf4c95d, emissive: 0xf4c95d, emissiveIntensity: 0.72 }),
    );
    bar.position.set(-1.8 + i * 0.24, 1.58, -0.55);
    bar.name = "beat-waveform-bar";
    tower.add(bar);
  }
  tower.userData.streamRadius = 44;
  group.add(tower);
}

function createPlayerAvatar() {
  const group = createCitizen(0xf4c95d);
  group.name = "Galaxy Dynasty player";
  group.scale.setScalar(1.08);
  return group;
}

function createCitizen(accentColor: number) {
  const group = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5, metalness: 0.22 });
  const accent = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.22 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd7b88c, roughness: 0.58, metalness: 0.05 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.72, 8, 16), coat);
  torso.position.y = 0.32;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18), skin);
  head.position.y = 0.98;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.16), accent);
  visor.position.set(0, 1.03, -0.17);
  const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.54, 6, 10), coat);
  const rightLeg = leftLeg.clone();
  leftLeg.position.set(-0.14, -0.34, 0);
  rightLeg.position.set(0.14, -0.34, 0);
  const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.18, 0.34), accent);
  shoulders.position.y = 0.68;
  group.add(torso, head, visor, leftLeg, rightLeg, shoulders);
  return group;
}

function updatePlayer(
  player: ThreeGroup,
  state: { velocity: ThreeVector3; facing: number; verticalVelocity: number; grounded: boolean },
  keys: ReadonlySet<string>,
  touch: TouchVector,
  delta: number,
) {
  const input = new THREE.Vector3(
    (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) + touch.x,
    0,
    (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) + touch.y,
  );
  if (input.lengthSq() > 1) input.normalize();
  const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight");
  const targetSpeed = sprint ? 8.5 : 4.4;
  const targetVelocity = input.multiplyScalar(targetSpeed);
  const acceleration = 1 - Math.exp(-10 * delta);
  state.velocity.lerp(targetVelocity, acceleration);
  player.position.x += state.velocity.x * delta;
  player.position.z += state.velocity.z * delta;

  if (state.velocity.lengthSq() > 0.04) {
    const targetFacing = Math.atan2(state.velocity.x, state.velocity.z);
    state.facing = dampAngle(state.facing, targetFacing, 12, delta);
    player.rotation.y = state.facing;
  }

  state.verticalVelocity -= 18 * delta;
  player.position.y += state.verticalVelocity * delta;
  if (player.position.y <= 0.9) {
    player.position.y = 0.9;
    state.verticalVelocity = 0;
    state.grounded = true;
  }
}

function updateCamera(camera: ThreePerspectiveCamera, player: ThreeGroup, facing: number, delta: number) {
  const behind = new THREE.Vector3(Math.sin(facing) * -7.2, 5.1, Math.cos(facing) * -7.2);
  const desired = player.position.clone().add(behind);
  const alpha = 1 - Math.exp(-5.6 * delta);
  camera.position.lerp(desired, alpha);
  const lookTarget = player.position.clone().add(new THREE.Vector3(0, 1.25, 0));
  camera.lookAt(lookTarget);
}

function updateCity(world: GalaxyWorld, playerPosition: ThreeVector3, camera: ThreePerspectiveCamera, elapsed: number): StreamingStats {
  const activeCity = world.assetRoot ?? world.city;
  const streamingStats = updateWorldPartition(world, playerPosition, camera);
  updateParticleField(world.particles, elapsed);
  activeCity.traverse((object: ThreeObject3D) => {
    const streamRadius = typeof object.userData.streamRadius === "number" ? object.userData.streamRadius : 44;
    object.visible = object.position.distanceTo(playerPosition) < streamRadius || object.name.includes("Floor");
    if (
      object instanceof THREE.Mesh &&
      object.material instanceof THREE.MeshStandardMaterial &&
      object.material.emissiveIntensity > 0.2
    ) {
      object.material.emissiveIntensity = 0.32 + Math.sin(elapsed * 2.2 + object.id) * 0.08;
      if (object.name === "beat-waveform-bar") object.scale.y = 0.72 + Math.sin(elapsed * 5.6 + object.id) * 0.3;
      if (object.name === "beat-ring") object.scale.setScalar(1 + Math.sin(elapsed * 2.8 + object.id) * 0.08);
    }
  });
  activeCity.position.x = THREE.MathUtils.clamp(-playerPosition.x * 0.015, -0.18, 0.18);
  return streamingStats;
}

function updateWorldPartition(world: GalaxyWorld, playerPosition: ThreeVector3, camera: ThreePerspectiveCamera): StreamingStats {
  camera.updateMatrixWorld();
  const projection = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const frustum = new THREE.Frustum().setFromProjectionMatrix(projection);
  let loaded = 0;
  let highDetail = 0;

  for (const chunk of world.chunks) {
    const distance = chunk.center.distanceTo(playerPosition);
    const shouldLoad = distance < chunk.radius * 1.65;
    if (shouldLoad && !chunk.loaded) {
      world.scene.add(chunk.root);
      chunk.loaded = true;
    } else if (!shouldLoad && chunk.loaded) {
      world.scene.remove(chunk.root);
      chunk.loaded = false;
    }
    if (!chunk.loaded) continue;

    loaded += 1;
    const visible = frustum.intersectsSphere(new THREE.Sphere(chunk.center, chunk.radius));
    chunk.root.visible = visible;
    const pixelSize = estimateProjectedPixelSize(camera, chunk.center, chunk.radius);
    const useHighDetail = visible && pixelSize > 42;
    chunk.highDetail.visible = useHighDetail;
    chunk.lowDetail.visible = visible && !useHighDetail;
    if (useHighDetail) highDetail += 1;
  }

  return { loaded, highDetail, total: world.chunks.length };
}

function estimateProjectedPixelSize(camera: ThreePerspectiveCamera, center: ThreeVector3, radius: number) {
  const distance = Math.max(1, camera.position.distanceTo(center));
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  return (radius / distance) * (window.innerHeight / Math.tan(verticalFov / 2));
}

function updateParticleField(field: ParticleField, elapsed: number) {
  for (let i = 0; i < field.positions.length / 3; i += 1) {
    const offset = i * 3;
    const x = field.positions[offset] ?? -13;
    const y = field.positions[offset + 1] ?? 1.2;
    const z = field.positions[offset + 2] ?? -4;
    field.positions[offset] = x + (field.velocities[offset] ?? 0) * 0.016;
    field.positions[offset + 1] = y + Math.sin(elapsed * 2.4 + i) * 0.0015 + (field.velocities[offset + 1] ?? 0) * 0.002;
    field.positions[offset + 2] = z + (field.velocities[offset + 2] ?? 0) * 0.016;

    const dx = (field.positions[offset] ?? -13) + 13;
    const dz = (field.positions[offset + 2] ?? -4) + 4;
    if (Math.hypot(dx, dz) > 3.6 || (field.positions[offset + 1] ?? 0) > 4.2) {
      const angle = i * 2.39996 + elapsed * 0.18;
      const radius = 1.2 + (i % 17) * 0.09;
      field.positions[offset] = -13 + Math.cos(angle) * radius;
      field.positions[offset + 1] = 1.1 + (i % 9) * 0.14;
      field.positions[offset + 2] = -4 + Math.sin(angle) * radius;
    }
  }
  const position = field.points.geometry.getAttribute("position");
  if (position instanceof THREE.BufferAttribute) position.needsUpdate = true;
}

async function hydrateGalaxyAssets(scene: ThreeScene, world: GalaxyWorld) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(CITY_KIT_ASSET.url);
  const root = gltf.scene;
  root.name = "HIGGSFIELD Rookie Plaza GLB city kit";
  root.traverse((object: ThreeObject3D) => {
    object.userData.streamRadius = object.name.includes("Window") ? 30 : object.name.includes("Floor") ? 72 : 46;
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  scene.add(root);
  world.assetRoot = root;
  world.city.visible = false;
}

function keepInsideCity(position: ThreeVector3) {
  position.x = THREE.MathUtils.clamp(position.x, -20, 20);
  position.z = THREE.MathUtils.clamp(position.z, -20, 20);
}

function findNearestDistrict(position: ThreeVector3) {
  return DISTRICTS.reduce((best, district) =>
    district.position.distanceToSquared(position) < best.position.distanceToSquared(position) ? district : best,
  );
}

function dampAngle(current: number, target: number, lambda: number, delta: number) {
  const wrapped = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + wrapped * (1 - Math.exp(-lambda * delta));
}

function updateTouchVector(event: PointerEvent<HTMLDivElement>, target: MutableRefObject<TouchVector>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  const length = Math.hypot(x, y);
  target.current = length > 1 ? { x: x / length, y: y / length } : { x, y };
  return target.current;
}

function playBeatPulse(audioContextRef: MutableRefObject<AudioContext | null>, intensity: number) {
  const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextCtor) return;
  const context = audioContextRef.current ?? new AudioContextCtor();
  audioContextRef.current = context;
  if (context.state === "suspended") void context.resume();

  const master = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(520 + intensity * 760, context.currentTime);
  filter.frequency.exponentialRampToValueAtTime(160 + intensity * 280, context.currentTime + 0.32);
  master.gain.setValueAtTime(0.0001, context.currentTime);
  master.gain.exponentialRampToValueAtTime(0.06 + intensity * 0.07, context.currentTime + 0.025);
  master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.34);
  filter.connect(master);
  master.connect(context.destination);

  const oscillator = context.createOscillator();
  oscillator.type = "sawtooth";
  oscillator.frequency.value = 110 + intensity * 280;
  const sub = context.createOscillator();
  sub.type = "sine";
  sub.frequency.value = 48 + intensity * 40;
  oscillator.connect(filter);
  sub.connect(filter);
  oscillator.start();
  sub.start(context.currentTime + 0.015);
  oscillator.stop(context.currentTime + 0.26);
  sub.stop(context.currentTime + 0.34);
}

const styles: Record<string, CSSProperties> = {
  shell: {
    position: "relative",
    minHeight: "100vh",
    background: "#05070d",
    color: "#f5f7ff",
    overflow: "hidden",
  },
  viewport: {
    position: "absolute",
    inset: 0,
  },
  topHud: {
    position: "absolute",
    top: 18,
    left: 18,
    right: 18,
    zIndex: 5,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    pointerEvents: "none",
  },
  brand: {
    border: "1px solid rgba(244,201,93,.42)",
    background: "rgba(5,7,13,.72)",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#f4c95d",
    fontWeight: 900,
    letterSpacing: 1,
  },
  statusLine: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    maxWidth: 520,
    fontSize: 14,
  },
  statusLineMobile: {
    maxWidth: 224,
    gap: 5,
    fontSize: 13,
    lineHeight: 1.25,
  },
  roomChip: {
    flexBasis: "100%",
    textAlign: "right",
    color: "#dbe7ff",
  },
  minimap: {
    position: "absolute",
    left: 18,
    bottom: 18,
    zIndex: 6,
    width: 150,
    height: 150,
    border: "1px solid rgba(0,229,255,.42)",
    borderRadius: 8,
    background: "radial-gradient(circle at 50% 50%, rgba(0,229,255,.16), rgba(5,7,13,.82))",
  },
  minimapMobile: {
    width: 124,
    height: 124,
  },
  mapDot: {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: 999,
    transform: "translate(-50%, -50%)",
    boxShadow: "0 0 18px currentColor",
  },
  playerDot: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 12,
    height: 12,
    borderRadius: 999,
    transform: "translate(-50%, -50%)",
    background: "#fff",
    boxShadow: "0 0 18px #fff",
  },
  prompt: {
    position: "absolute",
    right: 18,
    bottom: 18,
    zIndex: 6,
    display: "grid",
    gap: 3,
    minWidth: 230,
    border: "1px solid rgba(122,92,255,.42)",
    borderRadius: 8,
    background: "rgba(5,7,13,.78)",
    padding: 12,
  },
  promptMobile: {
    minWidth: 0,
    width: 204,
    padding: 10,
  },
  promptKicker: {
    color: "#00e5ff",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 1,
  },
  beatPanel: {
    position: "absolute",
    right: 18,
    top: 92,
    zIndex: 7,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  beatPanelMobile: {
    top: 128,
    left: 18,
    justifyContent: "center",
  },
  panelButton: {
    border: "1px solid rgba(0,229,255,.55)",
    borderRadius: 8,
    background: "rgba(5,7,13,.76)",
    color: "#f5f7ff",
    padding: "9px 10px",
    fontWeight: 800,
    cursor: "pointer",
  },
  joystick: {
    position: "absolute",
    left: 22,
    bottom: 190,
    zIndex: 8,
    width: 118,
    height: 118,
    border: "1px solid rgba(0,229,255,.55)",
    borderRadius: 999,
    background: "rgba(5,7,13,.68)",
    touchAction: "none",
  },
  joystickKnob: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 36,
    height: 36,
    borderRadius: 999,
    background: "#f4c95d",
    boxShadow: "0 0 24px rgba(244,201,93,.55)",
  },
};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
