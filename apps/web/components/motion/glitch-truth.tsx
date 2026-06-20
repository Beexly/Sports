"use client";

/**
 * GlitchTruth — Electromagnetic interference as honesty.
 *
 * When data is stale, uncertain, or conflicting, the UI doesn't hide it
 * behind a polite banner. It shows electromagnetic interference:
 *  - Scan lines drifting across the surface
 *  - Chromatic aberration (RGB split) at edges
 *  - Subtle horizontal displacement bands
 *  - Static noise intensity mapped to uncertainty level
 *
 * Props:
 *  - level: 0–1, where 0 = clean, 1 = heavy interference
 *  - trigger: boolean, whether to show the effect at all
 */

export function GlitchTruth({
  level = 0.3,
  trigger = false,
}: {
  level?: number;
  trigger?: boolean;
}) {
  if (!trigger || level < 0.05) return null;

  const scanOpacity = Math.min(0.15, level * 0.2);
  const chromaStrength = Math.min(4, level * 6);
  const noiseOpacity = Math.min(0.08, level * 0.1);
  const bandCount = Math.floor(level * 5) + 1;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60]"
      style={{
        mixBlendMode: "screen",
        opacity: Math.min(1, level * 1.5),
      }}
    >
      {/* Scan lines */}
      <div
        className="absolute inset-0"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.03) 2px, rgba(0,229,255,0.03) 4px)",
          animation: "glitch-scan 8s linear infinite",
          opacity: scanOpacity,
        }}
      />

      {/* Chromatic aberration layers */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: `inset ${chromaStrength}px 0 ${chromaStrength * 2}px rgba(255,45,214,0.04), inset -${chromaStrength}px 0 ${chromaStrength * 2}px rgba(0,229,255,0.04)`,
        }}
      />

      {/* Displacement bands */}
      {Array.from({ length: bandCount }).map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0"
          style={{
            top: `${20 + i * 15}%`,
            height: `${1 + Math.random() * 3}px`,
            background: `rgba(0,229,255,${0.03 + level * 0.05})`,
            transform: `translateX(${Math.sin(i * 2.5) * level * 8}px)`,
            animation: `glitch-band ${2 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}

      {/* Static noise */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
          opacity: noiseOpacity,
          animation: "glitch-noise 0.15s steps(2) infinite",
        }}
      />
    </div>
  );
}
