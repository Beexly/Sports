"use client";

/**
 * LogoMarkInline — The canonical GSE orbital mark as a lightweight inline SVG.
 *
 * Used everywhere we need the mark without an HTTP request:
 * loading states, error pages, easter eggs, small badges.
 * Accepts size, color overrides, and pulse animation.
 */

export function LogoMarkInline({
  size = 64,
  className = "",
  pulse = false,
  glow = false,
  color = "url(#logo-grad)",
}: {
  size?: number;
  className?: string;
  pulse?: boolean;
  glow?: boolean;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      style={{
        animation: pulse ? "logo-mark-pulse 2.4s ease-in-out infinite" : undefined,
        filter: glow ? "drop-shadow(0 0 12px rgba(0,229,255,0.5))" : undefined,
      }}
    >
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="55%" stopColor="#7A5CFF" />
          <stop offset="100%" stopColor="#FF2DD6" />
        </linearGradient>
      </defs>
      {/* Orbit arc — open at top */}
      <path
        d="M11 38C8 25 18 12 32 12c9.8 0 18 6.7 20.3 15.7"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Edge vector */}
      <line x1="10" y1="16" x2="54" y2="50" stroke={color} strokeWidth="3" strokeLinecap="round" />
      {/* Signal point */}
      <circle cx="34" cy="30" r="4" fill="#FF2DD6" />
      <circle cx="34" cy="30" r="1.5" fill="#F6F7FA" />
    </svg>
  );
}
