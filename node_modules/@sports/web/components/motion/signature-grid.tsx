/**
 * SignatureGrid — the brand's repeating visual motif.
 *
 * A subtle radar / data-grid pattern composed in pure SVG so it stays crisp
 * at any size and has zero animation cost when idle. Used as a backdrop
 * behind hero compositions and section anchors to give the site the
 * "luxury OS / cinematic dashboard" texture the design brief calls for.
 *
 * The grid is intentionally fading — strongest in the center, dissolving
 * to nothing at the edges — so it feels like part of an atmosphere rather
 * than a stamped background.
 */

import type { CSSProperties } from "react";

export interface SignatureGridProps {
  /** Optional className for sizing/positioning the wrapper. */
  className?: string;
  /** Override the base opacity. Default: 0.18. */
  opacity?: number;
  /** Render with a slow rotation so it feels alive. Default: false. */
  rotate?: boolean;
}

export function SignatureGrid({
  className = "",
  opacity = 0.18,
  rotate = false,
}: SignatureGridProps) {
  const style: CSSProperties = rotate
    ? { animation: "signature-spin 90s linear infinite", opacity }
    : { opacity };

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 select-none ${className}`}
      style={style}
    >
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        <defs>
          {/* Soft circular vignette that fades the grid to the edges */}
          <radialGradient id="sg-fade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="60%" stopColor="#fff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="sg-mask">
            <rect width="1000" height="1000" fill="url(#sg-fade)" />
          </mask>

          {/* Repeated grid pattern */}
          <pattern
            id="sg-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>

        {/* The grid, masked to fade outward */}
        <rect
          width="1000"
          height="1000"
          fill="url(#sg-grid)"
          mask="url(#sg-mask)"
        />

        {/* Three concentric "radar" rings as the focal motif */}
        <g mask="url(#sg-mask)" stroke="rgba(0,229,255,0.5)" fill="none">
          <circle cx="500" cy="500" r="120" strokeWidth="0.8" />
          <circle cx="500" cy="500" r="240" strokeWidth="0.5" />
          <circle cx="500" cy="500" r="360" strokeWidth="0.3" />
          {/* Crosshair */}
          <line x1="500" y1="380" x2="500" y2="620" strokeWidth="0.4" />
          <line x1="380" y1="500" x2="620" y2="500" strokeWidth="0.4" />
        </g>

        {/* A few accent dots on the rings to feel like data points */}
        <g mask="url(#sg-mask)" fill="rgba(0,229,255,0.9)">
          <circle cx="620" cy="500" r="2.5" />
          <circle cx="430" cy="580" r="2" />
          <circle cx="500" cy="380" r="1.6" />
          <circle cx="380" cy="500" r="1.6" />
        </g>
      </svg>
    </div>
  );
}

/**
 * AmbientGlow — a soft, slowly drifting blob of color used behind hero
 * compositions. Pure CSS animation. Respects reduced-motion via globals.
 */
export function AmbientGlow({
  className = "",
  color = "rgba(0,229,255,0.16)",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div
        className="absolute left-[10%] top-[-20%] h-[55vh] w-[55vh] rounded-full blur-3xl"
        style={{
          background: color,
          animation: "ambient-drift 22s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute right-[5%] top-[35%] h-[35vh] w-[35vh] rounded-full blur-3xl"
        style={{
          background: "rgba(0,168,191,0.10)",
          animation:
            "ambient-drift 28s ease-in-out infinite alternate-reverse",
        }}
      />
    </div>
  );
}
