"use client";

/**
 * LogoMarkInline — the 2026 Galaxy signal mark as a lightweight inline SVG.
 *
 * The mark is the brand-family symbol shared by Galaxy Sports Edge (the site)
 * and Galaxy Sports Network (the company): a bold split orbital ring (the market
 * in motion, open so it never reads as a coin or an "O"), a sharp edge blade
 * slicing through it (our read cutting the market), a signal core at the
 * crossing, and a ping (the moment of detection).
 *
 * Used wherever we need the mark without an HTTP request: loading states, error
 * pages, badges, the cold-open flash. Pass `color` for a monochrome lockup
 * (e.g. ink-on-white); otherwise it renders in full brand color. `kinetic` opts
 * into the one-shot draw-on (honors prefers-reduced-motion via .logo-mark-kinetic).
 */

export function LogoMarkInline({
  size = 64,
  className = "",
  pulse = false,
  glow = false,
  kinetic = false,
  color,
}: {
  size?: number;
  className?: string;
  pulse?: boolean;
  glow?: boolean;
  /** One-shot draw-on "lock" sequence; honors prefers-reduced-motion. */
  kinetic?: boolean;
  /** Monochrome override (every element uses this color). */
  color?: string;
}) {
  const ring = color ?? "#31353F";
  const blade = color ?? "#EDE8E0";
  const core = color ?? "#EDE8E0";
  const ping = color ?? "#FF4D2E";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={`${className}${kinetic ? " logo-mark-kinetic" : ""}`.trim()}
      style={{
        animation: pulse ? "logo-mark-pulse 2.4s ease-in-out infinite" : undefined,
        filter: glow ? "drop-shadow(0 0 12px rgba(255,77,46,0.5))" : undefined,
      }}
    >
      {/* Field orbit — outer ring + thick arc + core + signal ping */}
      <circle cx="32" cy="32" r="27" fill="none" stroke={ring} strokeWidth="2" />
      <ellipse
        cx="32"
        cy="32"
        rx="27"
        ry="10"
        fill="none"
        stroke={blade}
        strokeWidth="1.8"
        transform="rotate(-24 32 32)"
        opacity="0.5"
      />
      <path d="M53 21.5 A27 27 0 0 1 46 52" fill="none" stroke={blade} strokeWidth="5" />
      <circle cx="32" cy="32" r="7" fill={core} />
      <circle cx="10" cy="40" r="3.5" fill={ping} />
    </svg>
  );
}
