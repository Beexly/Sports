"use client";

/**
 * Lazy boundary for the ConsensusConstellation galaxy.
 *
 * The constellation is decorative client-only WebGL that runs a continuous rAF
 * loop. When used as a hero backdrop it can't be scroll-gated — but its render
 * loop must not burn the main thread / GPU during the critical interaction
 * window. So, mirroring the ShaderAurora boundary:
 *   - it's out of first-load JS (dynamic ssr:false),
 *   - a static brand gradient (ConstellationFallback) carries first paint, and
 *   - the live galaxy only MOUNTS after first paint settles (a short defer) or
 *     on the first user interaction, and NEVER under prefers-reduced-motion.
 * The gradient is a faithful stand-in, so nothing is lost for users who never
 * trigger the mount.
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { BRAND_COLORS } from "@/lib/brand";

function ConstellationFallback() {
  return (
    <div
      aria-hidden="true"
      className="h-full w-full"
      style={{
        background: `radial-gradient(55% 60% at 50% 45%, ${BRAND_COLORS.orbitalCyan}18, transparent 60%), radial-gradient(45% 55% at 30% 70%, ${BRAND_COLORS.softUltraviolet}14, transparent 62%), radial-gradient(40% 50% at 75% 35%, ${BRAND_COLORS.ionMagenta}0e, transparent 60%), ${BRAND_COLORS.obsidianBlack}`,
      }}
    />
  );
}

const Inner = dynamic(
  () => import("./consensus-constellation").then((m) => ({ default: m.ConsensusConstellation })),
  { ssr: false, loading: () => <ConstellationFallback /> },
);

export function ConsensusConstellationLazy() {
  const [mount, setMount] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // gradient only
    let done = false;
    const enable = () => {
      if (done) return;
      done = true;
      setMount(true);
    };
    // Defer past first paint so the WebGL rAF loop doesn't contend during the
    // critical interaction window; first interaction promotes it immediately.
    const timer = window.setTimeout(enable, 1500);
    window.addEventListener("pointerdown", enable, { once: true });
    window.addEventListener("keydown", enable, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", enable);
      window.removeEventListener("keydown", enable);
    };
  }, []);

  return mount ? <Inner /> : <ConstellationFallback />;
}
