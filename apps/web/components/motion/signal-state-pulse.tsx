"use client";

/**
 * SignalStatePulse — Board state, made visible.
 *
 * A pulsing orb whose rhythm and intensity reflect the live state of the board.
 * When rows are active, it beats like a heart. When the board is empty, it
 * breathes slowly — a quiet promise that the room is still watching.
 *
 * Props:
 *  - intensity: 0–1, where 0 = empty/board quiet, 1 = maximum activity
 *  - size: pixel diameter (default 32)
 */

export function SignalStatePulse({
  intensity = 0.5,
  size = 32,
}: {
  intensity?: number;
  size?: number;
}) {
  // Map intensity to animation speed: 0 → 4s cycle, 1 → 1.2s cycle
  const duration = 4 - intensity * 2.8;
  const glowIntensity = 0.3 + intensity * 0.5;

  return (
    <span
      className="relative inline-flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `rgba(0, 229, 255, ${0.08 + intensity * 0.12})`,
        border: `1px solid rgba(0, 229, 255, ${0.25 + intensity * 0.35})`,
      }}
    >
      {/* Outer pulse ring */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          animation: `signal-pulse-ring ${duration}s ease-in-out infinite`,
          background: `radial-gradient(circle, rgba(0,229,255,${glowIntensity}) 0%, transparent 70%)`,
        }}
      />
      {/* Middle pulse ring (offset) */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          animation: `signal-pulse-ring ${duration * 0.7}s ease-in-out infinite`,
          animationDelay: `${duration * 0.3}s`,
          background: `radial-gradient(circle, rgba(123,97,255,${glowIntensity * 0.6}) 0%, transparent 60%)`,
        }}
      />
      {/* Core dot */}
      <span
        className="relative rounded-full bg-orbital-cyan"
        style={{
          width: size * 0.35,
          height: size * 0.35,
          boxShadow: `0 0 ${size * 0.4}px ${size * 0.15}px rgba(0,229,255,${0.4 + intensity * 0.4})`,
          animation: `signal-pulse-core ${duration * 0.5}s ease-in-out infinite`,
        }}
      />
    </span>
  );
}
