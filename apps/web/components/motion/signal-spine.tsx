"use client";

/**
 * SignalSpine — The journey tracer.
 *
 * A fixed-position vertical signal line that traces the visitor's scroll
 * progress down the page. As you scroll, the spine fills from ultraviolet
 * (noise) through violet (processing) to cyan (signal), with data packets
 * traveling along it and occasional magenta fracture pulses.
 *
 * This makes the entire homepage feel like one continuous journey through
 * the Signal Room — from the Observatory at the top, through the Evidence
 * Vault, to the Gate at the bottom.
 *
 * Uses CSS custom properties for performant updates (no React re-renders
 * on scroll). Reduced motion → static filled line.
 */

import { useEffect, useRef } from "react";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function SignalSpine() {
  const spineRef = useRef<HTMLDivElement | null>(null);
  const packetsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const spine = spineRef.current;
    const packets = packetsRef.current;
    if (!spine || !packets) return;

    let raf = 0;
    let progress = 0;

    const update = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      progress = docHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / docHeight)) : 0;
      spine.style.setProperty("--spine-progress", String(progress));
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-4 top-0 z-40 hidden h-full w-1 lg:left-6 lg:block"
    >
      {/* The spine track — faint baseline */}
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-mineral/30" />

      {/* The filled spine — grows with scroll */}
      <div
        ref={spineRef}
        className="absolute left-1/2 top-0 w-px -translate-x-1/2 origin-top"
        style={{
          height: "calc(var(--spine-progress, 0) * 100%)",
          background:
            "linear-gradient(180deg, #7A5CFF 0%, #00E5FF 60%, #5BEEFF 100%)",
          boxShadow: "0 0 12px rgba(0,229,255,0.4), 0 0 4px rgba(122,92,255,0.6)",
          transition: "height 0.1s linear",
        }}
      />

      {/* Traveling data packets */}
      <div ref={packetsRef} className="absolute inset-0 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
            style={{
              background: i % 2 === 0 ? "#00E5FF" : "#7A5CFF",
              boxShadow: `0 0 8px 2px ${i % 2 === 0 ? "rgba(0,229,255,0.6)" : "rgba(122,92,255,0.5)"}`,
              animation: `spine-packet-${i} ${6 + i * 2}s linear infinite`,
              animationDelay: `${i * 1.5}s`,
              opacity: 0.8,
            }}
          />
        ))}
      </div>

      {/* The gate marker at bottom — the GSE mark, watching */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <svg width="16" height="16" viewBox="0 0 64 64" fill="none" className="opacity-60">
          <path
            d="M11 38C8 25 18 12 32 12c9.8 0 18 6.7 20.3 15.7"
            stroke="rgba(255,45,214,0.7)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <line x1="10" y1="16" x2="54" y2="50" stroke="rgba(255,45,214,0.7)" strokeWidth="4" strokeLinecap="round" />
          <circle cx="34" cy="30" r="5" fill="#FF2DD6" />
        </svg>
      </div>
    </div>
  );
}
