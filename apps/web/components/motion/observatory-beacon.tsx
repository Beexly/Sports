"use client";

/**
 * ObservatoryBeacon — The command room is always within reach.
 *
 * A fixed-position cyan orb that appears once the visitor scrolls past the
 * hero. It pulses gently like a distant star, beckoning the visitor back to
 * the Observatory. Clicking it smooth-scrolls to the top.
 *
 * Desktop only. Hidden when near the top. Respects reduced motion.
 */

import { useEffect, useRef, useState } from "react";

export function ObservatoryBeacon() {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const rafRef = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const threshold = window.innerHeight * 0.6;

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        setVisible(window.scrollY > threshold);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Return to Observatory"
      className="pointer-events-none fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full transition-all duration-500 lg:pointer-events-auto"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
      }}
    >
      {/* Tooltip */}
      <span
        className="rounded-full border border-mineral bg-eclipse px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ion-1 transition-all duration-300"
        style={{
          opacity: hovered ? 1 : 0,
          transform: hovered ? "translateX(0)" : "translateX(8px)",
        }}
      >
        Return to Observatory
      </span>

      {/* The beacon orb */}
      <span
        className="relative flex h-10 w-10 items-center justify-center rounded-full"
        style={{
          background: "rgba(0, 229, 255, 0.12)",
          border: "1px solid rgba(0, 229, 255, 0.35)",
          boxShadow: "0 0 20px rgba(0,229,255,0.15), inset 0 0 12px rgba(0,229,255,0.08)",
        }}
      >
        {/* Pulsing inner glow */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(0,229,255,0.3) 0%, transparent 70%)",
            animation: "observatory-beacon-pulse 3s ease-in-out infinite",
          }}
        />
        {/* Core dot */}
        <span
          className="relative h-2 w-2 rounded-full bg-orbital-cyan"
          style={{
            boxShadow: "0 0 8px 2px rgba(0,229,255,0.6)",
          }}
        />
        {/* Up arrow */}
        <span className="absolute text-orbital-cyan/70" style={{ fontSize: 10, marginTop: -1 }}>
          &#9650;
        </span>
      </span>
    </button>
  );
}
