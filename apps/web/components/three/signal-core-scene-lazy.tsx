"use client";

/**
 * Lazy boundary for SignalCoreScene.
 *
 * Decorative, aria-hidden WebGL that runs only client-side — deferred out of the
 * route's first-load JS via dynamic ssr:false so react-three-fiber, three and
 * postprocessing never block initial paint. A brand gradient stands in while the
 * chunk loads, then the scene fades in. Nothing SSR-bound is lost.
 *
 * Follows the established pattern of components/hero/interactive-galaxy-lazy.tsx.
 */

import dynamic from "next/dynamic";
import { BRAND_COLORS } from "@/lib/brand";

function SignalCoreFallback() {
  return (
    <div
      aria-hidden="true"
      className="h-full w-full"
      style={{
        background: `radial-gradient(50% 60% at 50% 45%, ${BRAND_COLORS.softUltraviolet}14, transparent 62%), radial-gradient(38% 52% at 66% 34%, ${BRAND_COLORS.orbitalCyan}10, transparent 64%), ${BRAND_COLORS.obsidianBlack}`,
      }}
    />
  );
}

const Inner = dynamic(
  () => import("./signal-core-scene").then((m) => ({ default: m.SignalCoreScene })),
  { ssr: false, loading: () => <SignalCoreFallback /> },
);

export function SignalCoreSceneLazy({ className }: { className?: string }) {
  return <Inner className={className} />;
}
