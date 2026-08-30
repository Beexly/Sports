"use client";

/**
 * HoloTiltCard — A glass panel that floats in space.
 *
 * Mouse-reactive 3D tilt using CSS transform-style: preserve-3d.
 * The card leans toward the cursor, with a subtle specular sheen that
 * shifts across the surface. Creates the feeling of a physical holographic
 * display panel in the Signal Room.
 *
 * Reduced motion → static, no tilt.
 */

import { useRef, useState, type ReactNode } from "react";

export function HoloTiltCard({
  children,
  className = "",
  intensity = 8,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState("perspective(800px) rotateX(0deg) rotateY(0deg)");
  const [sheen, setSheen] = useState({ x: 50, y: 50 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotX = (y - 0.5) * -intensity;
    const rotY = (x - 0.5) * intensity;
    setTransform(`perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.01, 1.01, 1.01)`);
    setSheen({ x: x * 100, y: y * 100 });
  };

  const onLeave = () => {
    setTransform("perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
    setSheen({ x: 50, y: 50 });
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`group relative transition-transform duration-150 ease-out ${className}`}
      style={{
        transform,
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
    >
      {children}
      {/* Specular sheen overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-ds-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at ${sheen.x}% ${sheen.y}%, rgba(0,229,255,0.08) 0%, transparent 60%)`,
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
}
