"use client";

/**
 * Lazy boundary for the ShaderAurora background.
 *
 * The aurora is decorative client-only WebGL that runs a continuous rAF loop.
 * It's the above-the-fold hero background, so it can't be scroll-gated — but its
 * render loop must not burn the main thread / GPU during the critical
 * interaction window. So:
 *   - it's out of first-load JS (dynamic ssr:false),
 *   - the static brand gradient (AuroraFallback) carries first paint, and
 *   - the live shader only MOUNTS after first paint settles (a short defer) or
 *     on the first user interaction, and NEVER under prefers-reduced-motion.
 * The gradient is a faithful stand-in, so nothing is lost for users who never
 * trigger the mount.
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { BRAND_COLORS } from "@/lib/brand";

function AuroraFallback() {
  return (
    <div
      aria-hidden="true"
      className="h-full w-full"
      style={{
        background: `radial-gradient(60% 80% at 30% 20%, ${BRAND_COLORS.softUltraviolet}20, transparent 60%), radial-gradient(50% 70% at 78% 30%, ${BRAND_COLORS.orbitalCyan}12, transparent 62%), radial-gradient(60% 80% at 50% 100%, ${BRAND_COLORS.ionMagenta}0e, transparent 60%), ${BRAND_COLORS.obsidianBlack}`,
      }}
    />
  );
}

const Inner = dynamic(
  () => import("./shader-aurora").then((m) => ({ default: m.ShaderAurora })),
  { ssr: false, loading: () => <AuroraFallback /> },
);

export function ShaderAuroraLazy({ className }: { className?: string }) {
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

  return mount ? <Inner className={className} /> : <AuroraFallback />;
}
