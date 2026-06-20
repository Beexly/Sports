"use client";

/**
 * MontageEntrance — A 2009 Call of Duty-style cinematic cold open.
 *
 * Pure adrenaline. 5 seconds of impact frames, chrome text slams,
 * stat flashes, and an explosive particle finish. Skippable on any
 * interaction. Plays once per session via localStorage.
 *
 * Sequence:
 *   0.0s — Black
 *   0.1s — WHITE FLASH + deep bass hit
 *   0.3s — "GALAXY" chrome slam with screen shake
 *   0.8s — Quick stat flash: "SIGNAL DETECTED"
 *   1.2s — "SPORTS" chrome slam
 *   1.5s — Quick stat flash: "NOISE FILTERED"
 *   1.8s — "EDGE" chrome slam + cyan glow burst
 *   2.2s — Three rapid HUD stat flashes
 *   2.8s — Slow hold: "THE INTELLIGENCE REVOLUTION"
 *   3.5s — Particle explosion outward
 *   4.0s — Fade to site
 *
 * Reduced motion → instant dissolve.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { LogoMarkInline } from "@/components/brand/logo-mark-inline";

const SEEN_KEY = "gse-montage-seen-v2";
const CINEMATIC_SEEN_KEY = "gse-entrance-seen-v1";
const PHASES = [
  { at: 0, id: "black" },
  { at: 100, id: "flash" },
  { at: 300, id: "galaxy" },
  { at: 800, id: "stat1" },
  { at: 1200, id: "sports" },
  { at: 1500, id: "stat2" },
  { at: 1800, id: "edge" },
  { at: 2200, id: "hud" },
  { at: 2800, id: "hold" },
  { at: 3500, id: "explode" },
  { at: 4200, id: "done" },
] as const;

export function MontageEntrance() {
  const [phase, setPhase] = useState<string>("black");
  const [done, setDone] = useState(false);
  const timers = useRef<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);

  const finish = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setDone(true);
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch { /* ignore */ }

    if (seen || reduced || window.location.search.includes("intro=skip")) {
      setDone(true);
      return;
    }

    try {
      localStorage.setItem(SEEN_KEY, "1");
      localStorage.setItem(CINEMATIC_SEEN_KEY, "1");
    } catch { /* ignore */ }

    // Play hype track
    const audio = new Audio("/audio/montage-hype.m4a");
    audio.volume = 0.6;
    audio.play().catch(() => { /* ignore autoplay policy */ });
    audioRef.current = audio;

    for (const p of PHASES) {
      timers.current.push(
        window.setTimeout(() => setPhase(p.id), p.at)
      );
    }

    // Explosion canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const w = canvas.width = window.innerWidth;
        const h = canvas.height = window.innerHeight;
        const particles = Array.from({ length: 200 }, () => ({
          x: w / 2,
          y: h / 2,
          vx: (Math.random() - 0.5) * 15,
          vy: (Math.random() - 0.5) * 15,
          life: 1,
          decay: 0.01 + Math.random() * 0.02,
          color: Math.random() > 0.6 ? "0,229,255" : Math.random() > 0.5 ? "122,92,255" : "255,45,214",
          size: 1 + Math.random() * 3,
        }));

        let raf = 0;
        const draw = () => {
          ctx.fillStyle = "rgba(5,6,8,0.15)";
          ctx.fillRect(0, 0, w, h);
          let alive = false;
          for (const p of particles) {
            if (p.life <= 0) continue;
            alive = true;
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life -= p.decay;
            ctx.fillStyle = `rgba(${p.color}, ${p.life})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
          }
          if (alive) raf = requestAnimationFrame(draw);
        };
        const startExplosion = () => {
          raf = requestAnimationFrame(draw);
        };
        timers.current.push(window.setTimeout(startExplosion, 3500));
        return () => cancelAnimationFrame(raf);
      }
    }

    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  // Skip on any interaction
  useEffect(() => {
    if (done) return;
    const skip = () => finish();
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("click", skip, { once: true });
    window.addEventListener("touchstart", skip, { once: true });
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("click", skip);
      window.removeEventListener("touchstart", skip);
    };
  }, [done, finish]);

  if (done) return null;

  const show = (ids: string[]) => ids.includes(phase);
  const flash = show(["flash"]);
  const galaxy = show(["galaxy", "stat1", "sports", "stat2", "edge", "hud", "hold", "explode"]);
  const sports = show(["sports", "stat2", "edge", "hud", "hold", "explode"]);
  const edge = show(["edge", "hud", "hold", "explode"]);
  const hud = show(["hud", "hold", "explode"]);
  const hold = show(["hold", "explode"]);
  const explode = show(["explode"]);

  return (
    <div
      className="fixed inset-0 z-[80] overflow-hidden"
      style={{ background: "#050608" }}
      onClick={finish}
    >
      {/* White flash */}
      {flash && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: "#ffffff",
            animation: "montage-flash 0.25s ease-out forwards",
          }}
        >
          <LogoMarkInline size={120} color="#050608" className="opacity-90" />
        </div>
      )}

      {/* GALAXY slam */}
      {galaxy && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            animation: "montage-shake 0.15s ease-out",
          }}
        >
          <span
            className="font-arch"
            style={{
              fontSize: "clamp(4rem, 18vw, 14rem)",
              lineHeight: 0.85,
              letterSpacing: "0.06em",
              background: "linear-gradient(180deg, #FFFFFF 0%, #E8FBFF 30%, #8FECFF 60%, #00E5FF 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter: "drop-shadow(0 0 40px rgba(0,229,255,0.5)) drop-shadow(0 4px 20px rgba(0,0,0,0.8))",
              animation: "montage-slam 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              opacity: 0,
            }}
          >
            GALAXY
          </span>
        </div>
      )}

      {/* STAT 1: SIGNAL DETECTED */}
      {show(["stat1", "sports", "stat2", "edge", "hud", "hold", "explode"]) && (
        <div
          className="absolute left-1/2 top-[62%] -translate-x-1/2 font-mono"
          style={{
            fontSize: "clamp(0.7rem, 2vw, 1.2rem)",
            letterSpacing: "0.3em",
            color: "#00E5FF",
            textShadow: "0 0 20px rgba(0,229,255,0.8)",
            animation: "montage-stat-flicker 0.3s ease-out forwards",
            opacity: 0,
          }}
        >
          SIGNAL DETECTED
        </div>
      )}

      {/* SPORTS slam */}
      {sports && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ animation: "montage-shake 0.12s ease-out 0.1s" }}
        >
          <span
            className="font-arch"
            style={{
              fontSize: "clamp(4rem, 18vw, 14rem)",
              lineHeight: 0.85,
              letterSpacing: "0.06em",
              background: "linear-gradient(180deg, #FFFFFF 0%, #FFB8EE 30%, #FF2DD6 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter: "drop-shadow(0 0 40px rgba(255,45,214,0.4)) drop-shadow(0 4px 20px rgba(0,0,0,0.8))",
              animation: "montage-slam 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards",
              opacity: 0,
            }}
          >
            SPORTS
          </span>
        </div>
      )}

      {/* STAT 2: NOISE FILTERED */}
      {show(["stat2", "edge", "hud", "hold", "explode"]) && (
        <div
          className="absolute left-1/2 top-[62%] -translate-x-1/2 font-mono"
          style={{
            fontSize: "clamp(0.7rem, 2vw, 1.2rem)",
            letterSpacing: "0.3em",
            color: "#7A5CFF",
            textShadow: "0 0 20px rgba(122,92,255,0.8)",
            animation: "montage-stat-flicker 0.3s ease-out 0.4s forwards",
            opacity: 0,
          }}
        >
          NOISE FILTERED
        </div>
      )}

      {/* EDGE slam + cyan burst */}
      {edge && (
        <>
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ animation: "montage-shake 0.15s ease-out 0.2s" }}
          >
            <span
              className="font-arch"
              style={{
                fontSize: "clamp(4rem, 18vw, 14rem)",
                lineHeight: 0.85,
                letterSpacing: "0.06em",
                background: "linear-gradient(180deg, #FFFFFF 0%, #E8FBFF 30%, #00E5FF 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                filter: "drop-shadow(0 0 50px rgba(0,229,255,0.6)) drop-shadow(0 4px 20px rgba(0,0,0,0.8))",
                animation: "montage-slam 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards",
                opacity: 0,
              }}
            >
              EDGE
            </span>
          </div>
          {/* Cyan burst ring */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: "200vmax",
              height: "200vmax",
              border: "2px solid rgba(0,229,255,0.3)",
              animation: "montage-burst-ring 0.8s ease-out 0.8s forwards",
              opacity: 0,
            }}
          />
        </>
      )}

      {/* HUD stat flashes */}
      {hud && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid gap-4 text-center">
            {[
              { label: "DATA INTAKE", value: "12 LANES", color: "#00E5FF" },
              { label: "MODELS ACTIVE", value: "3 ENGINES", color: "#7A5CFF" },
              { label: "TRUST SCORE", value: "96.4%", color: "#FF2DD6" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="font-mono"
                style={{
                  animation: `montage-hud-slide 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${0.2 + i * 0.15}s forwards`,
                  opacity: 0,
                  transform: "translateX(-30px)",
                }}
              >
                <span style={{ fontSize: 11, letterSpacing: "0.25em", color: stat.color }}>
                  {stat.label}
                </span>
                <span
                  className="ml-4 font-arch"
                  style={{
                    fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
                    color: "#F6F7FA",
                    textShadow: `0 0 20px ${stat.color}66`,
                  }}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HOLD: The Intelligence Revolution */}
      {hold && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            animation: "montage-fade-in 0.6s ease-out forwards",
            opacity: 0,
          }}
        >
          <p
            className="font-display text-balance text-ion-white"
            style={{
              fontSize: "clamp(1.2rem, 3.5vw, 2.5rem)",
              lineHeight: 1.15,
              textShadow: "0 2px 30px rgba(0,0,0,0.8)",
            }}
          >
            The{" "}
            <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
              intelligence
            </span>{" "}
            revolution.
          </p>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-ion-2">
            Press any key to enter
          </p>
        </div>
      )}

      {/* Particle explosion canvas */}
      {explode && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{ pointerEvents: "none" }}
        />
      )}
    </div>
  );
}
