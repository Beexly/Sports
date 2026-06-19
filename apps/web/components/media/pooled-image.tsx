"use client";

/**
 * PooledImage — client component for generative brand illustration.
 *
 * Renders the first URL from the image pool as a lazy <img>.
 * On failure, advances to the next provider via onError.
 * When all providers are exhausted, renders a branded CSS gradient block
 * (obsidian → ultraviolet/cyan) with the alt text — NEVER a broken image.
 *
 * Integrity:
 *   - Images are GENERATIVE / ABSTRACT / BRAND ART only.
 *   - Never presented as real photos of real players, games, or events.
 *   - Never fabricates stats or real-world outcomes.
 *   - Labeled as "Brand illustration" in the UI for honesty.
 *   - Keyless: no API credentials required.
 */

import { useState } from "react";
import { imageSourcePool, BRANDED_FALLBACK_ID, type ImagePoolOpts } from "@/lib/media/image-pool";

export interface PooledImageProps {
  /** Generative text prompt — abstract/thematic, never "real photo of X". */
  prompt: string;
  /** Pixel width passed to providers. Default: 1200. */
  width?: number;
  /** Pixel height passed to providers. Default: 630. */
  height?: number;
  /** Accessible alt text. Shown in the brand gradient fallback too. */
  alt: string;
  /** Optional additional className for the outer wrapper. */
  className?: string;
  /** Optional seed for deterministic rendering. */
  seed?: number;
}

/**
 * Branded cosmic gradient fallback — obsidian → ultraviolet → cyan.
 * Rendered when ALL URL providers fail. Never a broken image.
 */
function BrandedFallback({ alt, className }: { alt: string; className?: string }) {
  return (
    <div
      className={className}
      role="img"
      aria-label={alt}
      style={{
        background:
          "linear-gradient(135deg, #050608 0%, #1a1230 35%, #7A5CFF22 65%, #00E5FF1a 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        padding: "1.5rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Radial accent — cyan glow top-left */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 50% at 20% 10%, rgba(0,229,255,0.10), transparent 70%), " +
            "radial-gradient(ellipse 50% 60% at 80% 90%, rgba(122,92,255,0.12), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      {/* Diamond glyph */}
      <span
        aria-hidden="true"
        style={{
          fontSize: "2rem",
          color: "rgba(0,229,255,0.35)",
          fontFamily: "sans-serif",
          lineHeight: 1,
          position: "relative",
        }}
      >
        ◆
      </span>
      {/* Alt text */}
      <p
        style={{
          color: "rgba(246,247,250,0.45)",
          fontSize: "0.72rem",
          fontFamily: "monospace",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          textAlign: "center",
          maxWidth: "80%",
          position: "relative",
          margin: 0,
        }}
      >
        {alt}
      </p>
      {/* Honesty label */}
      <p
        style={{
          color: "rgba(246,247,250,0.22)",
          fontSize: "0.62rem",
          fontFamily: "monospace",
          textTransform: "uppercase",
          letterSpacing: "0.10em",
          position: "relative",
          margin: 0,
        }}
      >
        Brand illustration
      </p>
    </div>
  );
}

/**
 * Renders a generative brand illustration using the free image pool.
 * Progressively fails over through providers; final fallback is a
 * branded CSS gradient — never a broken image.
 *
 * NOTE: Images are abstract/generative brand art only. They are NOT
 * real photos of real players, events, or games.
 */
export function PooledImage({
  prompt,
  width = 1200,
  height = 630,
  alt,
  className,
  seed,
}: PooledImageProps) {
  const opts: ImagePoolOpts = { width, height, ...(seed !== undefined ? { seed } : {}) };
  const pool = imageSourcePool(prompt, opts);

  // Index into pool — starts at 0 (first real provider)
  const [providerIndex, setProviderIndex] = useState(0);

  const current = pool[providerIndex];

  // If we've advanced past all providers, or if the current entry is the
  // branded fallback sentinel, render the CSS gradient block.
  if (!current || current.id === BRANDED_FALLBACK_ID) {
    return <BrandedFallback alt={alt} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current.url}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      className={className}
      onError={() => {
        // Advance to the next provider on failure
        setProviderIndex((prev) => prev + 1);
      }}
      style={{ display: "block" }}
    />
  );
}
