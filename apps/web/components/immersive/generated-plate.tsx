"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getPlate } from "@/lib/visual-production/asset-manifest";

/**
 * GeneratedPlate — the integration point for AI-generated atmosphere.
 *
 * Doctrine: generate atmosphere, render truth. Paints a generated still and/or
 * motion plate as a decorative background BEHIND app-rendered content. It always
 * paints a CSS gradient base first, so:
 *   - if no asset is committed yet, it's just the gradient (zero risk to wire early);
 *   - if the image/video fails to load, the gradient remains;
 *   - under prefers-reduced-motion, the video never mounts (still/gradient only);
 *   - it never blocks first paint (video is a client-only enhancement).
 *
 * Pass `assetId` to resolve gradient/still/motion from the manifest, or pass them
 * explicitly. Purely decorative (aria-hidden); all truth is rendered on top.
 */
export interface GeneratedPlateProps {
  /** Manifest id to resolve gradient/still/motion from. */
  readonly assetId?: string;
  /** Explicit CSS background (overrides the resolved gradient). */
  readonly gradient?: string;
  readonly still?: string;
  readonly motion?: string;
  readonly className?: string;
  /**
   * Load the still eagerly. Set this ONLY for a plate that paints the first
   * viewport (e.g. the homepage hero) so the LCP background is not lazy-gated;
   * everything below the fold keeps the lazy default.
   */
  readonly eager?: boolean;
}

export function GeneratedPlate({ assetId, gradient, still, motion, className, eager = false }: GeneratedPlateProps) {
  const resolved = assetId ? getPlate(assetId) : undefined;
  const bg = gradient ?? resolved?.gradient ?? "transparent";
  const stillSrc = still ?? resolved?.still;
  const motionSrc = motion ?? resolved?.motion;

  const [motionOk, setMotionOk] = useState(false);
  useEffect(() => {
    if (!motionSrc) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionOk(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [motionSrc]);

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}>
      <div className="absolute inset-0" style={{ background: bg }} />
      {stillSrc && (
        <Image
          src={stillSrc}
          alt=""
          // Presentational only — no layout shift, so fill + sizes is the safest
          // fit for a decorative background plate. next/image applies AVIF/WebP
          // + responsive resizing (configured at next.config.mjs:58-61) which the
          // raw image element was bypassing (P16-02). `eager` maps to `priority`
          // so the homepage hero LCP background is not lazy-gated.
          fill
          sizes="100vw"
          priority={eager}
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          style={{ width: "100%", height: "100%" }}
        />
      )}
      {motionSrc && motionOk && (
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          src={motionSrc}
          poster={stillSrc}
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
