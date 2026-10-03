/**
 * ShootingStars — occasional meteors across any dark section.
 *
 * Server-renderable (no client JS): deterministic golden-angle placement,
 * pure CSS animation with long quiet gaps so it reads as weather, not a
 * screensaver. Compositor-only (transform + opacity). Reduced motion is
 * silenced by the global gse-cine-anim override.
 *
 * Mount inside any `relative overflow-hidden` section.
 */

import { BRAND_COLORS } from "@/lib/brand";

const METEORS: readonly { top: number; left: number; delay: number; duration: number; hue: string }[] =
  Array.from({ length: 5 }, (_, i) => ({
    top: ((i * 137.508) % 70) + 4,
    left: ((i * 61.803) % 60) + 10,
    delay: i * 7.3 + 2,
    duration: 1.4 + (i % 3) * 0.35,
    hue: i % 3 === 0 ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionWhite,
  }));

export function ShootingStars() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {METEORS.map((m, i) => (
        <span
          key={i}
          className="gse-cine-anim absolute h-px w-28"
          style={{
            top: `${m.top}%`,
            left: `${m.left}%`,
            background: `linear-gradient(90deg, ${m.hue}, transparent)`,
            opacity: 0,
            animation: `gse-meteor ${m.duration}s ease-in infinite`,
            animationDelay: `${m.delay}s`,
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}
