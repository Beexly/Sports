"use client";

/**
 * SignalRoomAtmosphere — The living command room, portable.
 *
 * Drops the Signal Core WebGL overlay + grid field + spine onto any page.
 * Configurable intensity so dense data pages get full treatment and
 * lighter pages get just the ambient glow.
 *
 * Modes:
 *  - "full": WebGL overlay + grid field + spine (homepage, deck)
 *  - "ambient": Grid field + subtle glow only (content pages)
 *  - "minimal": Spine only (light pages)
 */

import { SignalCoreLazy } from "@/components/hero/signal-core-lazy";
import { SignalSpine } from "@/components/motion/signal-spine";

export function SignalRoomAtmosphere({
  mode = "ambient",
  className = "",
}: {
  mode?: "full" | "ambient" | "minimal";
  className?: string;
}) {
  return (
    <>
      {mode !== "minimal" && (
        <div
          aria-hidden
          className={`pointer-events-none fixed inset-0 z-0 ${className}`}
        >
          {/* Grid field drift */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(0, 229, 255, 0.018) 1px, transparent 1px), " +
                "linear-gradient(to bottom, rgba(0, 229, 255, 0.018) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse at center, black 15%, transparent 75%)",
              animation: "grid-field-drift 30s linear infinite",
            }}
          />
          {/* Ambient volumetric glow */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 70% 20%, rgba(0,229,255,0.04), transparent 60%), " +
                "radial-gradient(ellipse 50% 30% at 20% 80%, rgba(123,97,255,0.04), transparent 60%)",
            }}
          />
        </div>
      )}

      {mode === "full" && (
        <div aria-hidden className="absolute inset-0 -z-10">
          <SignalCoreLazy />
        </div>
      )}

      <SignalSpine />
    </>
  );
}
