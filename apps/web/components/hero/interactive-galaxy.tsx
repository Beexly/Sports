"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type GalaxyPoint = {
  x: number;
  y: number;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function buildGalaxy(count: number, radius: number) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  const palette = ["#00E5FF", "#FF2DD6", "#A78BFA", "#F6F7FA"] as const;

  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    const arm = i % 5;
    const spin = arm * ((Math.PI * 2) / 5);
    const distance = Math.pow(Math.random(), 0.58) * radius;
    const angle = spin + distance * 0.42 + (Math.random() - 0.5) * 0.55;
    const height = (Math.random() - 0.5) * (radius * 0.15) * (1 - distance / radius);
    const noise = Math.pow(Math.random(), 2.2) * 42;

    positions[i3] = Math.cos(angle) * distance + (Math.random() - 0.5) * noise;
    positions[i3 + 1] = height + (Math.random() - 0.5) * 18;
    positions[i3 + 2] = Math.sin(angle) * distance + (Math.random() - 0.5) * noise;

    const chosen = palette[(i + arm) % palette.length] ?? palette[0];
    color.set(chosen);
    const fade = 0.54 + Math.random() * 0.46;
    colors[i3] = color.r * fade;
    colors[i3 + 1] = color.g * fade;
    colors[i3 + 2] = color.b * fade;
  }

  return { positions, colors };
}

export function InteractiveGalaxy() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<GalaxyPoint>({ x: 0, y: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let frame = 0;
    let disposed = false;
    const reduced = prefersReducedMotion();
    const isMobile = window.innerWidth < 720;
    const particleCount = isMobile ? 1500 : 3600;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 2000);
    camera.position.set(0, 78, 310);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: true,
      powerPreference: isMobile ? "low-power" : "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    mount.appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    const { positions, colors } = buildGalaxy(particleCount, isMobile ? 190 : 265);
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: isMobile ? 2.8 : 2.35,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const stars = new THREE.Points(geometry, material);
    stars.rotation.set(0.34, -0.18, -0.16);
    scene.add(stars);

    const coreGeometry = new THREE.SphereGeometry(isMobile ? 15 : 20, 32, 16);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xff2dd6,
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(core);

    const ringGeometry = new THREE.RingGeometry(isMobile ? 82 : 108, isMobile ? 84 : 111, 160);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.set(1.18, 0.22, -0.72);
    scene.add(ring);

    const outerRingGeometry = new THREE.RingGeometry(isMobile ? 128 : 168, isMobile ? 130 : 171, 192);
    const outerRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial);
    outerRing.rotation.set(1.04, -0.28, 0.48);
    scene.add(outerRing);

    const setSize = () => {
      if (disposed) return;
      const { width, height } = mount.getBoundingClientRect();
      const safeWidth = Math.max(1, width);
      const safeHeight = Math.max(1, height);
      camera.aspect = safeWidth / safeHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(safeWidth, safeHeight, false);
    };

    const observer = new ResizeObserver(setSize);
    observer.observe(mount);
    setSize();

    const handlePointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      pointerRef.current = {
        x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
        y: ((event.clientY - rect.top) / rect.height - 0.5) * 2,
      };
    };

    const handlePointerLeave = () => {
      pointerRef.current = { x: 0, y: 0 };
    };

    mount.addEventListener("pointermove", handlePointerMove, { passive: true });
    mount.addEventListener("pointerleave", handlePointerLeave);

    const render = () => {
      const pointer = pointerRef.current;
      const motion = reduced ? 0.0014 : 0.0038;
      stars.rotation.y += motion;
      stars.rotation.x += (0.34 + pointer.y * 0.1 - stars.rotation.x) * 0.035;
      stars.rotation.z += (-0.16 + pointer.x * 0.08 - stars.rotation.z) * 0.035;
      ring.rotation.z += reduced ? 0.002 : 0.006;
      outerRing.rotation.z -= reduced ? 0.0014 : 0.0045;
      core.scale.setScalar(1 + Math.sin(Date.now() * (reduced ? 0.0012 : 0.0026)) * 0.12);
      camera.position.x += (pointer.x * 18 - camera.position.x) * 0.035;
      camera.position.y += (78 - pointer.y * 14 - camera.position.y) * 0.035;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);

      if (!disposed) {
        frame = window.requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      mount.removeEventListener("pointermove", handlePointerMove);
      mount.removeEventListener("pointerleave", handlePointerLeave);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      outerRingGeometry.dispose();
      outerRingMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="interactive-galaxy"
      data-testid="interactive-galaxy"
      aria-hidden="true"
    />
  );
}
