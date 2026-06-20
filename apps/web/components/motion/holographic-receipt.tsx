"use client";

/**
 * HolographicReceipt — A thermal-printed intelligence ticket.
 *
 * Transforms accountability/receipt cards into physical artifacts from
 * the machine. Features:
 *  - Perforated top edge (tear-off style)
 *  - Thermal paper texture with faint grid
 *  - Holographic sheen that shifts with mouse movement
 *  - Typewriter-style data printing
 *  - "VOID" watermark that appears under extreme tilt
 *
 * Used for every receipt, trust ledger entry, and settled pick.
 */

import { useRef, useState, type ReactNode } from "react";

export function HolographicReceipt({
  children,
  className = "",
  stamp,
  hologram = true,
}: {
  children: ReactNode;
  className?: string;
  stamp?: "verified" | "gated" | "settled" | "pending";
  hologram?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [sheen, setSheen] = useState({ x: 50, y: 50, tilt: 0 });

  const onMove = (e: React.MouseEvent) => {
    if (!hologram || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const tilt = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
    setSheen({ x, y, tilt });
  };

  const onLeave = () => setSheen({ x: 50, y: 50, tilt: 0 });

  const stampColor =
    stamp === "verified"
      ? "#00E5FF"
      : stamp === "gated"
        ? "#FF2DD6"
        : stamp === "settled"
          ? "#5FD9A3"
          : "#7A5CFF";

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`group relative overflow-hidden rounded-ds-sm ${className}`}
      style={{
        transform: `perspective(600px) rotateY(${sheen.tilt}deg)`,
        transition: "transform 0.15s ease-out",
        willChange: "transform",
      }}
    >
      {/* Thermal paper base */}
      <div
        className="relative border border-mineral/60 bg-carbon p-5"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.015) 1px, transparent 1px), " +
            "linear-gradient(to bottom, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {/* Perforated top edge */}
        <div
          aria-hidden
          className="absolute left-0 right-0 top-0 h-2"
          style={{
            background:
              "repeating-linear-gradient(90deg, transparent, transparent 6px, rgba(255,255,255,0.08) 6px, rgba(255,255,255,0.08) 8px, transparent 8px, transparent 14px)",
            maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
          }}
        />

        {/* Holographic sheen overlay */}
        {hologram && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: `radial-gradient(ellipse 80% 80% at ${sheen.x}% ${sheen.y}%, rgba(0,229,255,0.08) 0%, rgba(122,92,255,0.05) 40%, transparent 70%)`,
              mixBlendMode: "overlay",
            }}
          />
        )}

        {/* Iridescent stripe */}
        {hologram && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-30"
            style={{
              background: `linear-gradient(${105 + sheen.tilt * 2}deg, transparent 30%, rgba(0,229,255,0.06) 40%, rgba(255,45,214,0.06) 50%, rgba(122,92,255,0.06) 60%, transparent 70%)`,
            }}
          />
        )}

        {/* VOID watermark on extreme tilt */}
        {hologram && Math.abs(sheen.tilt) > 5 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03]"
          >
            <span
              className="font-arch"
              style={{
                fontSize: "clamp(3rem, 10vw, 6rem)",
                color: "#F6F7FA",
                transform: `rotate(${-sheen.tilt * 0.5}deg)`,
              }}
            >
              VOID
            </span>
          </div>
        )}

        {/* Content */}
        <div className="relative z-10">{children}</div>

        {/* Bottom stamp */}
        {stamp && (
          <div className="relative z-10 mt-4 flex items-center gap-2 border-t border-dashed border-mineral/40 pt-3">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: stampColor,
                boxShadow: `0 0 8px 2px ${stampColor}66`,
              }}
            />
            <span
              className="font-mono text-[9px] uppercase tracking-[0.25em]"
              style={{ color: stampColor }}
            >
              {stamp} · galaxy sports edge
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
