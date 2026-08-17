import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";

/**
 * DoorCard — a signal-map door. A console cell rendered as a link with an
 * index, label, decision blurb, live stat, and action arrow.
 *
 * Shared between the homepage page module and the Suspense-bounded
 * NflverseLabDoor component.
 */
export function DoorCard({
  index,
  label,
  decides,
  stat,
  action,
  href,
  accent = false,
  bar,
}: {
  index: number;
  label: string;
  decides: string;
  stat: string;
  action: string;
  href: string;
  accent?: boolean;
  /** Optional two-segment micro-bar: shows magnitude, not just text. */
  bar?: { a: number; b: number };
}): JSX.Element {
  const showBar = bar && bar.a + bar.b > 0;
  const aPct = showBar ? Math.round((bar.a / (bar.a + bar.b)) * 100) : 0;
  return (
    <Reveal delay={index * 70} className="flex">
      <Link
        href={href}
        className="group relative flex w-full flex-col gap-4 bg-eclipse p-6 transition-colors duration-300 hover:bg-carbon"
      >
        {/* accent rail. Draws across the top on hover (left origin) */}
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-mineral" />
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-orbital-cyan transition-transform duration-500 ease-out group-hover:scale-x-100"
        />

        {/* header rail. Index + status dot */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.3em] text-ion-2 tabular-nums">
            {String(index).padStart(2, "0")}
          </span>
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${accent ? "bg-orbital-cyan" : "bg-soft-ultraviolet"} opacity-60 transition-opacity group-hover:opacity-100`}
          />
        </div>

        <p className="font-display text-2xl font-semibold leading-tight text-ion-white">{label}</p>
        <p className="flex-1 text-sm leading-6 text-ion-1">{decides}</p>

        {/* live readout */}
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-orbital-cyan tabular-nums">{stat}</p>

        {/* micro-bar: show the split, do not just say it */}
        {showBar && (
          <span aria-hidden className="flex h-1 overflow-hidden rounded-full bg-mineral">
            <span className="h-full bg-orbital-cyan" style={{ width: `${aPct}%` }} />
            <span className="h-full flex-1 bg-plasma/70" />
          </span>
        )}

        <p className="flex items-center gap-1.5 border-t border-mineral/70 pt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ion-2 transition-colors group-hover:text-ion-white">
          {action}
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </p>
      </Link>
    </Reveal>
  );
}
