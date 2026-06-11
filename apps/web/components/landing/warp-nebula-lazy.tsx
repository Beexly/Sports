"use client";

/**
 * Lazy boundary for the WarpNebula particle tier — deferred out of first-load
 * JS (dynamic ssr:false). While the chunk loads, the CSS warp underneath is
 * the scene; the nebula fades in over it when ready. Decorative only.
 */

import dynamic from "next/dynamic";

const Inner = dynamic(
  () => import("./warp-nebula").then((m) => ({ default: m.WarpNebula })),
  { ssr: false, loading: () => null },
);

export function WarpNebulaLazy({ mode }: { mode: "warp" | "idle" }) {
  return <Inner mode={mode} />;
}
