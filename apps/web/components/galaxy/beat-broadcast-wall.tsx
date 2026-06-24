"use client";

import { useEffect, useRef, useState } from "react";
import { GALAXY } from "@/lib/galaxy/theme";

type SpatialModule = typeof import("@sports/galaxy-spatial");

export interface BeatPulse {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly intensity: number;
}

export function BeatBroadcastWall({ pulses }: { pulses: readonly BeatPulse[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [fallback, setFallback] = useState(false);
  const [selectedId, setSelectedId] = useState(pulses[0]?.id ?? "");
  const [soundOn, setSoundOn] = useState(false);
  const selected = pulses.find((pulse) => pulse.id === selectedId) ?? pulses[0];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cleanup: (() => void) | null = null;
    let mounted = true;

    void import("@sports/galaxy-spatial")
      .then(async (spatial: SpatialModule) => {
        if (!mounted) return;
        const babylon = await Promise.all([
          import("@babylonjs/core/Meshes/meshBuilder.js"),
          import("@babylonjs/core/Maths/math.color.js"),
          import("@babylonjs/core/Maths/math.vector.js"),
          import("@babylonjs/core/Lights/pointLight.js"),
        ]);
        const [{ MeshBuilder }, { Color3 }, { Vector3 }, { PointLight }] = babylon;
        const shell = spatial.createGalaxySpatialScene(canvas, { clearColor: "#05070dff" });
        shell.camera.radius = 8.8;
        shell.camera.beta = Math.PI / 2.7;
        const wall = MeshBuilder.CreateBox("beat-broadcast-wall", { width: 8, height: 3.2, depth: 0.18 }, shell.scene);
        wall.position.z = -2.2;
        wall.position.y = 1.8;
        wall.material = spatial.createSpatialMaterial(shell.scene, "glass", 0.86);
        const floor = MeshBuilder.CreateGround("beat-broadcast-ledger-floor", { width: 9, height: 6, subdivisions: 12 }, shell.scene);
        floor.position.z = 0.2;
        floor.material = spatial.createSpatialMaterial(shell.scene, "obsidian", 0.94);
        const light = new PointLight("beat-pulse-light", new Vector3(0, 3, -1.5), shell.scene);
        light.diffuse = Color3.FromHexString(GALAXY.cyan);
        light.intensity = 18;

        pulses.forEach((pulse, index) => {
          const tower = MeshBuilder.CreateBox(`pulse-${pulse.id}`, { width: 0.48, height: 0.8 + pulse.intensity * 2.4, depth: 0.48 }, shell.scene);
          tower.position.x = -3 + index * 1.5;
          tower.position.y = tower.scaling.y + 0.45;
          tower.position.z = -1.4;
          tower.material = spatial.createSpatialMaterial(shell.scene, index === 0 ? "stadiumGold" : index === 1 ? "signalCyan" : "verifyTeal");
          tower.metadata = { pulseId: pulse.id };
        });

        spatial.BEAT_BROADCAST_VISUALS.forEach((visual, index) => {
          const token = visual.kind.includes("ring")
            ? "stadiumGold"
            : visual.kind.includes("trail")
              ? "verifyTeal"
              : visual.kind.includes("fog")
                ? "ultraviolet"
                : visual.kind.includes("source")
                  ? "signalCyan"
                  : "cyberMagenta";
          const mesh =
            visual.kind.includes("ring") || visual.kind === "broadcast-wave"
              ? MeshBuilder.CreateTorus(`beat-${visual.id}`, { diameter: 1.2 + visual.intensity * 2.4, thickness: 0.035, tessellation: 72 }, shell.scene)
              : visual.kind.includes("trail")
                ? MeshBuilder.CreateBox(`beat-${visual.id}`, { width: 1.6, height: 0.08, depth: 0.08 }, shell.scene)
                : visual.kind.includes("tower")
                  ? MeshBuilder.CreateCylinder(`beat-${visual.id}`, { height: 1.2 + visual.intensity * 2, diameter: 0.34, tessellation: 12 }, shell.scene)
                  : MeshBuilder.CreateSphere(`beat-${visual.id}`, { diameter: 0.42 + visual.intensity * 0.55, segments: 16 }, shell.scene);
          mesh.position = new Vector3(visual.position[0], visual.position[1], visual.position[2]);
          if (visual.kind.includes("ring") || visual.kind === "broadcast-wave") mesh.rotation.x = Math.PI / 2;
          if (visual.kind.includes("trail")) mesh.rotation.y = index % 2 === 0 ? 0.34 : -0.34;
          mesh.material = spatial.createSpatialMaterial(shell.scene, token, visual.kind.includes("fog") ? 0.34 : 0.82);
          mesh.metadata = { visualId: visual.id, kind: visual.kind };
        });

        let elapsed = 0;
        shell.start((delta) => {
          elapsed += delta;
          for (const mesh of shell.scene.meshes) {
            if (String(mesh.name).startsWith("pulse-")) spatial.pulseMesh(mesh, elapsed, 0.04);
            if (String(mesh.name).startsWith("beat-")) spatial.pulseMesh(mesh, elapsed + mesh.name.length * 0.11, 0.025);
          }
        });
        shell.resize();
        cleanup = () => shell.dispose();
      })
      .catch(() => setFallback(true));

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [pulses]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
      <section style={{ position: "relative", minHeight: 440, border: `1px solid ${GALAXY.cyan}66`, borderRadius: 14, overflow: "hidden", background: "#05070d" }}>
        <canvas ref={canvasRef} aria-label="The Beat Broadcast Wall spatial instrument" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        {fallback && <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${GALAXY.deepBlue}44, ${GALAXY.void})` }} />}
        <div style={{ position: "absolute", left: 14, top: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {pulses.map((pulse) => (
            <button
              key={pulse.id}
              type="button"
              onClick={() => {
                setSelectedId(pulse.id);
                if (soundOn) playBeatPulse(audioContextRef, pulse.intensity);
              }}
              style={buttonStyle(selectedId === pulse.id ? GALAXY.gold : GALAXY.cyan)}
            >
              {pulse.label}
            </button>
          ))}
        </div>
        <div style={{ position: "absolute", left: 14, bottom: 14, display: "flex", gap: 8, flexWrap: "wrap", maxWidth: "calc(100% - 28px)" }}>
          {spatialLayerLabels.map((label) => (
            <span key={label} style={{ border: `1px solid ${GALAXY.border}`, borderRadius: 999, padding: "5px 8px", background: "#05070dcc", color: GALAXY.textMuted, fontSize: 11 }}>
              {label}
            </span>
          ))}
        </div>
      </section>
      <aside style={{ border: `1px solid ${GALAXY.border}`, borderRadius: 14, background: GALAXY.panel, padding: 16 }}>
        <div style={{ fontSize: 11, color: GALAXY.textMuted, letterSpacing: 1.2 }}>SOURCE LEDGER</div>
        <h2 style={{ margin: "6px 0", fontSize: 20 }}>{selected?.label ?? "Beat Pulse"}</h2>
        <p style={{ color: GALAXY.textMuted, fontSize: 13, lineHeight: 1.45 }}>{selected?.detail ?? "No pulse selected."}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button
            type="button"
            onClick={() => {
              setSoundOn((value) => !value);
              if (selected) playBeatPulse(audioContextRef, selected.intensity);
            }}
            style={buttonStyle(soundOn ? GALAXY.gold : GALAXY.border)}
          >
            {soundOn ? "Pulse Audio On" : "Enable Pulse Audio"}
          </button>
          <button
            type="button"
            onClick={() => selected && playBeatPulse(audioContextRef, selected.intensity)}
            style={buttonStyle(GALAXY.cyan)}
          >
            Strike Pulse
          </button>
        </div>
        <div style={{ marginTop: 12, color: GALAXY.cyan, fontSize: 12 }}>No fake stats. No team marks. Weather and route context only.</div>
      </aside>
    </div>
  );
}

const spatialLayerLabels = [
  "Ledger backplane",
  "Broadcast rings",
  "Urgency towers",
  "Calibration rings",
  "Route trails",
] as const;

function buttonStyle(accent: string): React.CSSProperties {
  return {
    border: `1px solid ${accent}77`,
    background: `${accent}1f`,
    color: GALAXY.text,
    borderRadius: 10,
    padding: "8px 10px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
  };
}

function playBeatPulse(audioContextRef: React.MutableRefObject<AudioContext | null>, intensity: number): void {
  if (typeof window === "undefined") return;
  const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextCtor) return;
  const context = audioContextRef.current ?? new AudioContextCtor();
  audioContextRef.current = context;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 144 + Math.round(intensity * 220);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.055 + intensity * 0.08, context.currentTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.24);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
