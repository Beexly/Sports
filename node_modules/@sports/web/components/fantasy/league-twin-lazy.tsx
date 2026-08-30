"use client";

/**
 * Lazy boundary for the League Twin galaxy — three.js is deferred out of the
 * route's first-load JS via dynamic ssr:false. A gradient placeholder stands in
 * while the chunk loads.
 */

import dynamic from "next/dynamic";
import { BRAND_COLORS } from "@/lib/brand";

function Fallback() {
  return (
    <div
      aria-hidden="true"
      className="surface-card h-[58vh] min-h-[360px] w-full"
      style={{ background: `radial-gradient(55% 70% at 50% 45%, ${BRAND_COLORS.softUltraviolet}14, transparent 62%), radial-gradient(40% 55% at 70% 32%, ${BRAND_COLORS.orbitalCyan}0e, transparent 65%), ${BRAND_COLORS.obsidianBlack}` }}
    />
  );
}

const Inner = dynamic(
  () => import("./league-twin-galaxy").then((m) => ({ default: m.LeagueTwinGalaxy })),
  { ssr: false, loading: () => <Fallback /> },
);

export function LeagueTwinLazy() {
  return <Inner />;
}
