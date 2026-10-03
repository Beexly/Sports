import Link from "next/link";

/**
 * WorldWaypoints — the module index of the Galaxy public world.
 *
 * A horizontal strip of numbered waypoints under the hero: the journey's map.
 * Gives the "moving through modules" feel without breaking normal navigation —
 * plain anchor links, keyboard reachable, scrollable on mobile.
 */

const WAYPOINTS = [
  { n: "01", label: "Galaxy Twin", href: "#twin" },
  { n: "02", label: "Signal vs Noise", href: "#signal" },
  { n: "03", label: "Market Mirage", href: "#mirage" },
  { n: "04", label: "No-Bet Gate", href: "#gate" },
  { n: "05", label: "Autopsy", href: "#autopsy" },
  { n: "06", label: "Parlay MRI", href: "#mri" },
  { n: "07", label: "GSN · The Beat", href: "#gsn" },
  { n: "08", label: "Cost of Noise", href: "#noise" },
  { n: "09", label: "Receipts", href: "#receipts" },
] as const;

export function WorldWaypoints(): JSX.Element {
  return (
    <nav aria-label="World modules" className="relative border-t border-mineral/60">
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
        <span className="mr-2 shrink-0 font-mono text-[9px] uppercase tracking-[0.24em] text-ion-2">
          The world ▸
        </span>
        {WAYPOINTS.map((wp) => (
          <Link
            key={wp.n}
            href={wp.href}
            className="group flex shrink-0 items-baseline gap-1.5 rounded-ds-sm px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-1 transition-colors hover:bg-eclipse hover:text-ion-white"
          >
            <span className="text-orbital-cyan/80 group-hover:text-orbital-cyan">{wp.n}</span>
            {wp.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
