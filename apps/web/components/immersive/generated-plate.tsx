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
 *   - it never blocks first paint (video is deferred past it; see below).
 *
 * Pass `assetId` to resolve gradient/still/motion from the manifest, or pass them
 * explicitly. Purely decorative (aria-hidden); all truth is rendered on top.
 *
 * Performance:
 *   - The still is served via next/image (AVIF/WebP negotiation, no layout
 *     shift). On the hero instance pass `priority` so the LCP element loads
 *     eagerly with high fetch priority instead of lazily.
 *   - The looping video is HEAVY (multi-MB). preload is "none", but autoPlay
 *     starts fetching the instant it mounts, so we delay the MOUNT itself until
 *     after first paint — the video never competes with the LCP image for
 *     bandwidth, on any route.
 */
export interface GeneratedPlateProps {
  /** Manifest id to resolve gradient/still/motion from. */
  readonly assetId?: string;
  /** Explicit CSS background (overrides the resolved gradient). */
  readonly gradient?: string;
  readonly still?: string;
  readonly motion?: string;
  readonly className?: string;
  /** Set on the above-the-fold hero instance: the still is the LCP element, so
   *  load it eagerly with high fetch priority rather than lazily. */
  readonly priority?: boolean;
}

export function GeneratedPlate({ assetId, gradient, still, motion, className, priority }: GeneratedPlateProps) {
  const resolved = assetId ? getPlate(assetId) : undefined;
  const bg = gradient ?? resolved?.gradient ?? "transparent";
  const stillSrc = still ?? resolved?.still;
  const motionSrc = motion ?? resolved?.motion;

  const [motionOk, setMotionOk] = useState(false);
  useEffect(() => {
    if (!motionSrc) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setMotionOk(!mq.matches);
    let timer = 0;
    if (!mq.matches) {
      // Defer the heavy video mount past first paint so it can't contend with
      // the LCP image / hero JS for bandwidth.
      timer = window.setTimeout(() => setMotionOk(true), 2500);
    }
    mq.addEventListener("change", onChange);
    return () => {
      if (timer) window.clearTimeout(timer);
      mq.removeEventListener("change", onChange);
    };
  }, [motionSrc]);

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}>
      <div className="absolute inset-0" style={{ background: bg }} />
      {stillSrc && (
        <Image
          src={stillSrc}
          alt=""
          fill
          sizes="100vw"
          priority={priority}
          className="object-cover opacity-90"
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
