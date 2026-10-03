"use client";

/**
 * Lazy boundary for the ConsensusEngine3D galaxy.
 *
 * The galaxy is a decorative, aria-hidden WebGL scene that only ever runs
 * client-side — so we defer three.js (~150kB) out of the route's first-load JS
 * with a dynamic, ssr:false import. A brand-matched gradient stands in while the
 * chunk loads; on /intelligence the cinematic entrance covers the screen during
 * that window, so the hand-off is invisible. Pure Core-Web-Vitals win, nothing
 * lost (the scene carries no SSR content).
 */

import dynamic from "next/dynamic";
import { BRAND_COLORS } from "@/lib/brand";
import { LogoMarkInline } from "@/components/brand/logo-mark-inline";

function GalaxyFallback() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full items-center justify-center"
      style={{
        background: `radial-gradient(60% 80% at 50% 46%, ${BRAND_COLORS.orbitalCyan}14, transparent 60%), radial-gradient(40% 60% at 70% 35%, ${BRAND_COLORS.softUltraviolet}10, transparent 65%), ${BRAND_COLORS.obsidianBlack}`,
      }}
    >
      <LogoMarkInline size={48} pulse glow />
    </div>
  );
}

const Inner = dynamic(
  () => import("./consensus-engine-3d").then((m) => ({ default: m.ConsensusEngine3D })),
  { ssr: false, loading: () => <GalaxyFallback /> },
);

export function ConsensusEngine3DLazy() {
  return <Inner />;
}
