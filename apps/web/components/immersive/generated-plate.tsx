"use client";

import { useEffect, useState } from "react";

/**
 * GeneratedPlate — the integration point for AI-generated atmosphere.
 *
 * Doctrine: generate atmosphere, render truth. This paints a generated still
 * and/or motion plate as a decorative background BEHIND app-rendered content.
 * It always paints a CSS gradient base first, so:
 *   - if no asset is committed yet, it's just the gradient (zero risk to wire early);
 *   - if the image/video fails to load, the gradient remains;
 *   - under prefers-reduced-motion, the video never mounts (still/gradient only);
 *   - it never blocks first paint (video is a client-only enhancement).
 *
 * It is purely decorative (aria-hidden). All truth — claims, stats, labels — is
 * rendered by the app on top of this, never inside the generated media.
 */
export interface GeneratedPlateProps {
  /** CSS background value always painted as the base/fallback. Required. */
  readonly gradient: string;
  /** Optional generated still, committed under /public/immersive. */
  readonly still?: string;
  /** Optional generated motion (looping video). Autoplays only if motion is allowed. */
  readonly motion?: string;
  /** Decorative alt — kept empty; the plate is aria-hidden. */
  readonly className?: string;
}

export function GeneratedPlate({ gradient, still, motion, className }: GeneratedPlateProps) {
  const [motionOk, setMotionOk] = useState(false);

  useEffect(() => {
    if (!motion) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionOk(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [motion]);

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}>
      {/* Base + fallback — always painted. */}
      <div className="absolute inset-0" style={{ background: gradient }} />
      {/* Generated still — progressive. */}
      {still && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={still} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" loading="lazy" decoding="async" />
      )}
      {/* Generated motion — client-only, reduced-motion-gated. */}
      {motion && motionOk && (
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          src={motion}
          poster={still}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
        />
      )}
    </div>
  );
}
