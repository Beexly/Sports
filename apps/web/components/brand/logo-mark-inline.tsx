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
  const ring = color ?? "#00E5FF";
  const blade = color ?? "#F6F7FA";
  const core = color ?? "#FF2DD6";
  const ping = color ?? "#7A5CFF";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={`${className}${kinetic ? " logo-mark-kinetic" : ""}`.trim()}
      style={{
        animation: pulse ? "logo-mark-pulse 2.4s ease-in-out infinite" : undefined,
        filter: glow ? "drop-shadow(0 0 12px rgba(0,229,255,0.5))" : undefined,
      }}
    >
      {/* Split orbital ring — open via the dash gaps so it never reads as a coin */}
      <circle
        cx="32"
        cy="32"
        r="18"
        fill="none"
        stroke={ring}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="43.5 13"
        transform="rotate(20 32 32)"
      />
      {/* Edge blade — a sharp read slicing through the market */}
      <polygon points="50,14 33.84,33.84 14,50 30.16,30.16" fill={blade} />
      {/* Signal core at the crossing */}
      <circle cx="32" cy="32" r="4.4" fill={core} />
      {/* Ping — the moment of detection */}
      <circle cx="45" cy="17" r="2.3" fill={ping} />
    </svg>
  );
}
