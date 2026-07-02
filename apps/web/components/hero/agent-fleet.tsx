"use client";

/**
 * AgentFleet — The constellation of running systems.
 *
 * A canvas-based particle field where each dot represents an active agent
 * or service. Dots orbit slowly in a 3D-ish space, connected by hair-thin
 * signal lines when near. Occasional magenta pulses indicate attention-needed
 * nodes. The fleet responds to mouse proximity — nodes near the cursor glow
 * brighter and their connections intensify.
 *
 * Pure canvas, no React re-renders during animation. Reduced motion → static.
 */

import { useEffect, useRef } from "react";

interface Agent {
  x: number;
  y: number;
  z: number; // depth 0–1
  vx: number;
  vy: number;
  orbitAngle: number;
  orbitRadius: number;
  orbitSpeed: number;
  pulsePhase: number;
  needsAttention: boolean;
  size: number;
}

const AGENT_COUNT = 24;
const CONNECTION_DIST = 120;
const COLORS = {
  cyan: "0, 229, 255",
  violet: "122, 92, 255",
  magenta: "255, 45, 214",
  amber: "255, 180, 84",
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function AgentFleet({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0, h = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.floor(rect.width * dpr);
      h = Math.floor(rect.height * dpr);
      canvas.width = w;
      canvas.height = h;
    };
    resize();

    const mouse = { x: -1000, y: -1000 };
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) * dpr;
      mouse.y = (e.clientY - rect.top) * dpr;
    };
    const onLeave = () => { mouse.x = -1000; mouse.y = -1000; };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    // Initialize agents in a constellation pattern
    const agents: Agent[] = Array.from({ length: AGENT_COUNT }, (_, i) => {
      const angle = (i / AGENT_COUNT) * Math.PI * 2;
      const radius = i === 0 ? 140 : 80 + Math.random() * 160; // Agent 0 is the sentinel
      return {
        x: w / 2 + Math.cos(angle) * radius,
        y: h / 2 + Math.sin(angle) * radius * 0.6,
        z: Math.random(),
        vx: 0,
        vy: 0,
        orbitAngle: angle,
        orbitRadius: radius,
        orbitSpeed: 0.0003 + Math.random() * 0.0005,
        pulsePhase: Math.random() * Math.PI * 2,
        needsAttention: Math.random() < 0.08, // ~2 agents need attention
        size: 1.5 + Math.random() * 2,
      };
    });

    let raf = 0;
    let time = 0;
    let onScreen = true;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      time += reduced ? 0 : 1;

      // Update positions
      if (!reduced) {
        for (const a of agents) {
          a.orbitAngle += a.orbitSpeed;
          const targetX = w / 2 + Math.cos(a.orbitAngle) * a.orbitRadius;
          const targetY = h / 2 + Math.sin(a.orbitAngle) * a.orbitRadius * 0.6;
          a.x += (targetX - a.x) * 0.02;
          a.y += (targetY - a.y) * 0.02;
        }
      }

      // Draw connections
      for (let i = 0; i < agents.length; i++) {
        for (let j = i + 1; j < agents.length; j++) {
          const a = agents[i]!;
          const b = agents[j]!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.15;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${COLORS.violet}, ${alpha})`;
            ctx.lineWidth = 0.5 * dpr;
            ctx.stroke();
          }
        }
      }

      // Draw agents
      for (let i = 0; i < agents.length; i++) {
        const a = agents[i]!;
        const mouseDx = mouse.x - a.x;
        const mouseDy = mouse.y - a.y;
        const mouseDist = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);
        const mouseGlow = Math.max(0, 1 - mouseDist / 150) * 0.6;

        const depthAlpha = 0.4 + a.z * 0.6;
        const pulse = a.needsAttention
          ? 0.5 + 0.5 * Math.sin(time * 0.05 + a.pulsePhase)
          : 0.3 + 0.2 * Math.sin(time * 0.02 + a.pulsePhase);

        const baseColor = a.needsAttention ? COLORS.magenta : COLORS.cyan;
        const size = a.size * dpr * (1 + mouseGlow * 0.5);

        // Glow
        const glowSize = size * (3 + pulse * 2 + mouseGlow * 4);
        const grad = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, glowSize);
        grad.addColorStop(0, `rgba(${baseColor}, ${depthAlpha * pulse})`);
        grad.addColorStop(1, `rgba(${baseColor}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(a.x, a.y, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Core dot (or mark for the sentinel)
        if (i === 0) {
          // Draw the GSE mark as the sentinel agent
          ctx.save();
          ctx.translate(a.x, a.y);
          ctx.scale(size * 0.5, size * 0.5);
          ctx.strokeStyle = `rgba(${baseColor}, ${depthAlpha * (0.8 + mouseGlow)})`;
          ctx.fillStyle = `rgba(${baseColor}, ${depthAlpha * (0.8 + mouseGlow)})`;
          ctx.lineWidth = 2;
          // Orbit arc
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0.8, 5.5);
          ctx.stroke();
          // Edge vector
          ctx.beginPath();
          ctx.moveTo(-6, -6);
          ctx.lineTo(6, 6);
          ctx.stroke();
          // Signal point
          ctx.beginPath();
          ctx.arc(2, 0, 2, 0, Math.PI * 2);
          ctx.fillStyle = "#FF38C7";
          ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = `rgba(${baseColor}, ${depthAlpha * (0.8 + mouseGlow)})`;
          ctx.beginPath();
          ctx.arc(a.x, a.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Under reduced motion the scene is static: draw a single frame and stop
      // re-arming, instead of clearing + redrawing (and the O(n^2) connection
      // pass) every frame forever, including offscreen and in hidden tabs.
      if (!reduced && !document.hidden && onScreen) {
        raf = requestAnimationFrame(draw);
      }
    };

    raf = requestAnimationFrame(draw);

    // Pause the loop when the tab is hidden; resume on return.
    const onVisibility = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else if (!reduced && onScreen && !raf) {
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Pause when the canvas scrolls off-screen; resume when it returns.
    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              onScreen = entries[0]?.isIntersecting ?? true;
              if (!onScreen) {
                if (raf) cancelAnimationFrame(raf);
                raf = 0;
              } else if (!reduced && !document.hidden && !raf) {
                raf = requestAnimationFrame(draw);
              }
            },
            { threshold: 0 },
          )
        : null;
    io?.observe(canvas);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      io?.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
