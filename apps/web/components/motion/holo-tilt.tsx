"use client";

/**
 * HoloTilt — holographic card physics for any child.
 *
 * Pointer-driven 3D tilt with a glare sweep that follows the cursor.
 * Writes CSS variables through one rAF-throttled handler (zero React
 * re-renders per mousemove — same contract as the entrance steering).
 * Touch devices and prefers-reduced-motion get the static card untouched.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

export function HoloTilt({
  children,
  maxTilt = 7,
  className,
}: {
  children: ReactNode;
  /** degrees of rotation at the card's edge */
  maxTilt?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const raf = useRef(0);
  const target = useRef<[number, number]>([0, 0]);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setActive(fine && !reduced);
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  if (!active) return <div className={className}>{children}</div>;

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    target.current = [
      ((e.clientX - r.left) / r.width - 0.5) * 2,
      ((e.clientY - r.top) / r.height - 0.5) * 2,
    ];
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const node = ref.current;
      if (!node) return;
      const [x, y] = target.current;
      node.style.setProperty("--ht-rx", `${(-y * maxTilt).toFixed(2)}deg`);
      node.style.setProperty("--ht-ry", `${(x * maxTilt).toFixed(2)}deg`);
      node.style.setProperty("--ht-gx", `${(x * 50 + 50).toFixed(1)}%`);
      node.style.setProperty("--ht-gy", `${(y * 50 + 50).toFixed(1)}%`);
      node.style.setProperty("--ht-glare", "1");
    });
  };

  const onLeave = () => {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--ht-rx", "0deg");
    node.style.setProperty("--ht-ry", "0deg");
    node.style.setProperty("--ht-glare", "0");
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={{ perspective: "900px" }}
    >
      <div
        className="gse-holo-inner relative h-full"
        style={{
          transform: "rotateX(var(--ht-rx, 0deg)) rotateY(var(--ht-ry, 0deg))",
          transition: "transform 180ms ease-out",
          willChange: "transform",
          transformStyle: "preserve-3d",
        }}
      >
        {children}
        {/* glare sweep — follows the cursor across the card face */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            opacity: "calc(var(--ht-glare, 0) * 0.5)",
            transition: "opacity 240ms ease",
            background:
              "radial-gradient(40% 32% at var(--ht-gx, 50%) var(--ht-gy, 50%), rgba(214, 240, 255, 0.16), transparent 70%)",
          }}
        />
      </div>
    </div>
  );
}
