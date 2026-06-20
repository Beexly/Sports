"use client";

/**
 * MontageEntrance — Galaxy Sports Edge's single cinematic cold-open.
 *
 * One breathtaking arrival, ~3.6s, then it dissolves to reveal the site. A real
 * motion plate (home-hero-cosmos) runs behind disciplined chrome word-slams that
 * climax on the brand mark + "We detect. You decide." No fabricated stats, no
 * chaotic neon — premium impact, not arcade.
 *
 * Sequence:
 *   0.00s — Black; motion plate fades up behind it
 *   0.12s — White flash + mark
 *   0.35s — "GALAXY" slam (ice) + shake
 *   0.80s — flick: SIGNAL DETECTED
 *   1.20s — "SPORTS" slam (plasma) + shake
 *   1.65s — flick: NOISE FILTERED
 *   2.05s — "EDGE" slam (ice) + cyan burst ring
 *   2.50s — brand mark resolves + tagline, particle shimmer
 *   3.60s — dissolve to site
 *
 * This is the ONLY front-door sequence (the slow doctrine intro was retired).
 * Plays once per session (localStorage). Skippable on any interaction.
 * Reduced motion → instant dissolve, no video, no audio.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { LogoMarkInline } from "@/components/brand/logo-mark-inline";

const SEEN_KEY = "gse-montage-seen-v2";
/** Legacy cinematic-intro flag, still set so any stragglers stay bypassed. */
const CINEMATIC_SEEN_KEY = "gse-entrance-seen-v1";

// Tight, choreographed pacing (~3.3s). No dead air between beats: each slam is
// answered by a flicker before the next word lands.
const PHASES = [
  { at: 0, id: "black" },
  { at: 110, id: "flash" },
  { at: 320, id: "galaxy" },
  { at: 640, id: "stat1" },
  { at: 1040, id: "sports" },
  { at: 1360, id: "stat2" },
  { at: 1720, id: "edge" },
  { at: 2160, id: "resolve" },
  { at: 3300, id: "done" },
] as const;

export function MontageEntrance() {
  const [phase, setPhase] = useState<string>("black");
  const [done, setDone] = useState(false);
  const [bedOn, setBedOn] = useState(false);
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
    // Accessibility always wins: reduced motion gets no cold-open.
    if (reduced) {
      setDone(true);
      return;
    }

    const search = window.location.search;
    // ?intro=play force-replays the cold-open, overriding the once-per-session
    // gate, so it can always be re-triggered (e.g. the footer "Replay intro").
    const forcePlay = search.includes("intro=play");

    let seen = false;
    try {
      // Per-SESSION gating (not localStorage): every genuine visit gets the
      // hype, while in-session navigation does not replay it.
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* ignore */
    }

    if (!forcePlay && (seen || search.includes("intro=skip"))) {
      setDone(true);
      return;
    }

    try {
      sessionStorage.setItem(SEEN_KEY, "1");
      sessionStorage.setItem(CINEMATIC_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }

    // Motion plate fades up immediately for cinematic depth.
    setBedOn(true);

    // Best-effort sting — browser autoplay policy gates this; it only sounds for
    // visitors who have already interacted with the domain, and never under
    // reduced motion (handled above). No HTML autoPlay attribute is used.
    try {
      const audio = new Audio("/audio/montage-hype.m4a");
      audio.volume = 0.55;
      audio.play().catch(() => {
        /* blocked by autoplay policy — stay silent */
      });
      audioRef.current = audio;
    } catch {
      /* ignore */
    }

    for (const p of PHASES) {
      timers.current.push(window.setTimeout(() => setPhase(p.id), p.at));
    }

    // Climax shimmer — a restrained particle bloom behind the brand mark.
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const w = (canvas.width = window.innerWidth);
        const h = (canvas.height = window.innerHeight);
        const particles = Array.from({ length: 160 }, () => {
          // Color-tuned decay: cool signal (cyan) dissipates fast, warm residue
          // (plasma) lingers, ultraviolet sits between. Subliminal stratification.
          const r = Math.random();
          const [color, decay] =
            r > 0.6
              ? ["0,229,255", 0.02 + Math.random() * 0.018]
              : r > 0.5
                ? ["122,92,255", 0.012 + Math.random() * 0.014]
                : ["255,45,214", 0.008 + Math.random() * 0.012];
          return {
            x: w / 2,
            y: h / 2,
            vx: (Math.random() - 0.5) * 13,
            vy: (Math.random() - 0.5) * 13,
            life: 1,
            decay,
            color,
            size: 1 + Math.random() * 2.5,
          };
        });
        let raf = 0;
        const draw = () => {
          ctx.fillStyle = "rgba(5,6,8,0.16)";
          ctx.fillRect(0, 0, w, h);
          let alive = false;
          for (const p of particles) {
            if (p.life <= 0) continue;
            alive = true;
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.97;
            p.vy *= 0.97;
            p.life -= p.decay;
            ctx.fillStyle = `rgba(${p.color}, ${p.life})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
          }
          if (alive) raf = requestAnimationFrame(draw);
        };
        // Let the brand mark land and breathe (~200ms) before the bloom.
        timers.current.push(window.setTimeout(() => { raf = requestAnimationFrame(draw); }, 2360));
        return () => cancelAnimationFrame(raf);
      }
    }

    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  // Skip on any interaction.
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
  const galaxy = show(["galaxy", "stat1", "sports", "stat2", "edge", "resolve"]);
  const sports = show(["sports", "stat2", "edge", "resolve"]);
  const edge = show(["edge", "resolve"]);
  const resolve = show(["resolve"]);

  return (
    <div
      className="fixed inset-0 z-[80] overflow-hidden"
      style={{ background: "#050608" }}
      onClick={finish}
      role="dialog"
      aria-label="Entering Galaxy Sports Edge"
    >
      {/* Cinematic motion bed: real footage, dimmed, behind the type. The fade
          eases out so the bed falls back as the words advance. */}
      <video
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out"
        style={{ opacity: bedOn && !resolve ? 0.5 : bedOn ? 0.32 : 0 }}
        src="/immersive/home-hero-cosmos.mp4"
        poster="/immersive/home-hero-cosmos.webp"
        muted
        autoPlay
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(5,6,8,0.35), rgba(5,6,8,0.82) 78%)",
        }}
      />

      {/* White flash */}
      {flash && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "#ffffff", animation: "montage-flash 0.25s ease-out forwards" }}
        >
          <LogoMarkInline size={120} color="#050608" className="opacity-90" />
        </div>
      )}

      {/* GALAXY slam */}
      {galaxy && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ animation: "montage-shake 0.15s ease-out" }}>
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
              filter: "drop-shadow(0 0 40px rgba(0,229,255,0.45)) drop-shadow(0 4px 20px rgba(0,0,0,0.8))",
              animation: "montage-slam 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              opacity: 0,
            }}
          >
            GALAXY
          </span>
        </div>
      )}

      {/* flick: SIGNAL DETECTED */}
      {show(["stat1", "sports", "stat2", "edge", "resolve"]) && (
        <div
          className="absolute left-1/2 top-[62%] -translate-x-1/2 font-mono"
          style={{
            fontSize: "clamp(0.7rem, 2vw, 1.2rem)",
            letterSpacing: "0.32em",
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
        <div className="absolute inset-0 flex items-center justify-center" style={{ animation: "montage-shake 0.12s ease-out 0.1s" }}>
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
              filter: "drop-shadow(0 0 40px rgba(255,45,214,0.35)) drop-shadow(0 4px 20px rgba(0,0,0,0.8))",
              animation: "montage-slam 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards",
              opacity: 0,
            }}
          >
            SPORTS
          </span>
        </div>
      )}

      {/* flick: NOISE FILTERED */}
      {show(["stat2", "edge", "resolve"]) && (
        <div
          className="absolute left-1/2 top-[62%] -translate-x-1/2 font-mono"
          style={{
            fontSize: "clamp(0.7rem, 2vw, 1.2rem)",
            letterSpacing: "0.32em",
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
          <div className="absolute inset-0 flex items-center justify-center" style={{ animation: "montage-shake 0.15s ease-out 0.2s" }}>
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
                filter: "drop-shadow(0 0 50px rgba(0,229,255,0.55)) drop-shadow(0 4px 20px rgba(0,0,0,0.8))",
                animation: "montage-slam 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards",
                opacity: 0,
              }}
            >
              EDGE
            </span>
          </div>
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

      {/* RESOLVE — brand mark + tagline, the calm confident landing. */}
      {resolve && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ animation: "montage-fade-in 0.6s ease-out forwards", opacity: 0 }}
        >
          <LogoMarkInline size={96} glow className="opacity-95" />
          <p
            className="mt-6 font-arch text-ion-white"
            style={{ fontSize: "clamp(1.6rem, 5vw, 3rem)", letterSpacing: "0.12em" }}
          >
            GALAXY SPORTS EDGE
          </p>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.34em] text-orbital-cyan">
            We detect. You decide.
          </p>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-ion-2">
            Press any key to enter
          </p>
        </div>
      )}

      {/* Particle shimmer canvas (climax only). */}
      {resolve && <canvas ref={canvasRef} className="absolute inset-0" style={{ pointerEvents: "none" }} />}

      {/* Skip — always available. */}
      <button
        type="button"
        onClick={finish}
        className="absolute right-5 top-5 z-10 rounded-full border border-mineral px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ion-2 transition-colors hover:text-ion-white"
      >
        Skip ▸
      </button>
    </div>
  );
}
