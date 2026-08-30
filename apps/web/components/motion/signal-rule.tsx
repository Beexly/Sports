/**
 * SignalRule — a section divider that carries a signal.
 *
 * The brand's hairline rule with a pulse of light traveling along it,
 * like data moving down the page. Server-renderable, CSS-only,
 * compositor-only; reduced motion leaves the static hairline.
 */

import { BRAND_COLORS } from "@/lib/brand";

export function SignalRule({ className }: { className?: string }) {
  return (
    <div aria-hidden className={`relative h-px w-full overflow-hidden ${className ?? ""}`}>
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(90deg, transparent, var(--mineral, #211A33), transparent)" }}
      />
      <span
        className="gse-cine-anim absolute top-0 h-px w-40"
        style={{
          background: `linear-gradient(90deg, transparent, ${BRAND_COLORS.orbitalCyan}, transparent)`,
          animation: "gse-signal-travel 7s ease-in-out infinite",
          willChange: "transform",
        }}
      />
    </div>
  );
}
