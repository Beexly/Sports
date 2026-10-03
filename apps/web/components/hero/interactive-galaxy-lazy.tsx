"use client";

/**
 * Lazy boundary for the InteractiveGalaxy background.
 *
 * Decorative, aria-hidden WebGL that runs only client-side — deferred out of the
 * route's first-load JS via dynamic ssr:false so three.js doesn't block initial
 * paint. A subtle gradient stands in while the chunk loads, then the galaxy
 * fades in. Nothing SSR-bound is lost.
 */

import dynamic from "next/dynamic";
import { BRAND_COLORS } from "@/lib/brand";

function GalaxyFallback() {
  return (
    <div
      aria-hidden="true"
      className="h-full w-full"
      style={{
        background: `radial-gradient(55% 70% at 50% 40%, ${BRAND_COLORS.softUltraviolet}12, transparent 62%), radial-gradient(40% 55% at 72% 30%, ${BRAND_COLORS.orbitalCyan}0e, transparent 65%), ${BRAND_COLORS.obsidianBlack}`,
      }}
    />
  );
}

const Inner = dynamic(
  () => import("./interactive-galaxy").then((m) => ({ default: m.InteractiveGalaxy })),
  { ssr: false, loading: () => <GalaxyFallback /> },
);

export function InteractiveGalaxyLazy() {
  return <Inner />;
}
