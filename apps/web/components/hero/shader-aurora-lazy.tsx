"use client";

/**
 * Lazy boundary for the ShaderAurora background — deferred out of first-load JS
 * via dynamic ssr:false (it's decorative, client-only WebGL). A static brand
 * gradient stands in while the chunk loads, then the aurora fades in.
 */

import dynamic from "next/dynamic";
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
  return <Inner className={className} />;
}
