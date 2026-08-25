"use client";

/**
 * ThermalVision — See conviction as temperature.
 *
 * A global toggle that transforms the entire interface into a heatmap
 * of model confidence. Hot picks pulse red. Cold picks fade to ice.
 * Uncertainty shows as static noise. The entire site becomes a thermal
 * imaging camera for sports intelligence.
 *
 * Implemented as a CSS filter + overlay system. No canvas needed.
 * The effect reads data-thermal attributes on DOM elements.
 */

import { useEffect, useState } from "react";

/**
 * Should the ThermalVision toggle be mounted at all?
 *
 * The docstring above describes a heatmap driven by `data-thermal` attributes.
 * That binding does not exist: no element anywhere under `app/` or
 * `components/` carries a `data-thermal` attribute, and `ThermalBadge` — the
 * piece that would paint per-pick temperature — has zero importers. Toggling
 * the control today does exactly one thing: paints a faint
 * `mix-blend-mode: overlay` gradient over the viewport. It does not turn the
 * interface into a confidence heatmap.
 *
 * So this is an unfinished development affordance, not a shipped feature — and
 * it was mounting a ~25px cyan pill at `fixed bottom-6 left-6` over the
 * bottom-left of EVERY page at EVERY breakpoint. On a phone, minutes before
 * kickoff, that reads as a leftover dev toggle floating on top of the product.
 *
 * Nothing is removed: the component, its overlay and ThermalBadge all stay
 * intact so the data binding can be finished. It is simply not mounted in
 * production until then.
 */
export function shouldMountThermalVision(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return nodeEnv !== "production";
}

export function ThermalVision({
  active = false,
  onToggle,
}: {
  active?: boolean;
  onToggle?: (v: boolean) => void;
}) {
  const [enabled, setEnabled] = useState(active);

  useEffect(() => {
    setEnabled(active);
  }, [active]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    onToggle?.(next);
  };

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={enabled}
        // Hidden below `md` even in development: on a phone this pill sits on
        // top of real content in the bottom-left corner with nothing to move
        // it out of the way.
        className="fixed bottom-6 left-6 z-50 hidden items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-all duration-300 md:flex"
        style={{
          borderColor: enabled ? "rgba(255,56,199,0.5)" : "rgba(0,229,255,0.3)",
          background: enabled ? "rgba(255,56,199,0.1)" : "rgba(0,229,255,0.06)",
          color: enabled ? "#FF38C7" : "#00E5FF",
          boxShadow: enabled
            ? "0 0 16px rgba(255,56,199,0.2)"
            : "0 0 12px rgba(0,229,255,0.1)",
        }}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{
            background: enabled
              ? "linear-gradient(180deg, #FF38C7, #FFB454)"
              : "linear-gradient(180deg, #00E5FF, #7B61FF)",
            animation: enabled ? "thermal-pulse-hot 1.5s ease-in-out infinite" : "thermal-pulse-cold 3s ease-in-out infinite",
          }}
        />
        {enabled ? "Thermal ON" : "Thermal"}
      </button>

      {/* Thermal overlay */}
      {enabled && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[45]"
          style={{
            mixBlendMode: "overlay",
            background:
              "radial-gradient(ellipse 60% 50% at 70% 30%, rgba(255,56,199,0.08), transparent 60%), " +
              "radial-gradient(ellipse 50% 40% at 30% 70%, rgba(0,229,255,0.06), transparent 55%)",
            animation: "thermal-breathe 4s ease-in-out infinite",
          }}
        />
      )}
    </>
  );
}

/**
 * ThermalBadge — Apply to any element to give it thermal coloring.
 *
 * temperature: -1 (ice cold) to 1 (white hot)
 */
export function ThermalBadge({
  temperature = 0,
  children,
  className = "",
}: {
  temperature?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const isHot = temperature > 0.3;
  const isCold = temperature < -0.3;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-all duration-500 ${className}`}
      style={{
        background: isHot
          ? `rgba(255,56,199,${0.08 + temperature * 0.15})`
          : isCold
            ? `rgba(0,229,255,${0.08 + Math.abs(temperature) * 0.15})`
            : "rgba(123,97,255,0.06)",
        border: `1px solid ${isHot
          ? `rgba(255,56,199,${0.2 + temperature * 0.3})`
          : isCold
            ? `rgba(0,229,255,${0.2 + Math.abs(temperature) * 0.3})`
            : "rgba(123,97,255,0.15)"}`,
        color: isHot
          ? `rgba(255,${180 - temperature * 80},${214 - temperature * 50},1)`
          : isCold
            ? `rgba(${0 + Math.abs(temperature) * 80},${229 - Math.abs(temperature) * 50},255,1)`
            : "#8B97AB",
        boxShadow: isHot
          ? `0 0 ${8 + temperature * 12}px rgba(255,56,199,${0.15 + temperature * 0.2})`
          : isCold
            ? `0 0 ${8 + Math.abs(temperature) * 12}px rgba(0,229,255,${0.15 + Math.abs(temperature) * 0.2})`
            : "none",
      }}
    >
      <span
        className="h-1 w-1 rounded-full"
        style={{
          background: isHot ? "#FF38C7" : isCold ? "#00E5FF" : "#7B61FF",
          animation: isHot
            ? "thermal-pulse-hot 1.2s ease-in-out infinite"
            : isCold
              ? "thermal-pulse-cold 2.4s ease-in-out infinite"
              : "none",
        }}
      />
      {children}
    </span>
  );
}
