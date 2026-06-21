/**
 * MissionControlHow — a concise, three-beat "how this works" strip.
 *
 * No reading required: three glanceable beats (a signal lands, it hits your
 * roster, the move surfaces with its edge) connected by the signal fade. Server
 * component, zero JS, reduced-motion safe. Sits at the very top of Mission
 * Control so a first-time visitor understands the surface in one look.
 */

interface Beat {
  readonly k: string;
  readonly glyph: string;
  readonly label: string;
  readonly line: string;
  readonly tone: string;
}

const BEATS: readonly Beat[] = [
  {
    k: "01",
    glyph: "◣",
    label: "Signal urgency",
    line: "A breaking signal lands, ranked by how fast it moves a price.",
    tone: "text-orbital-cyan",
  },
  {
    k: "02",
    glyph: "◉",
    label: "Roster impact",
    line: "We map it to your roster and your slate, not the whole league.",
    tone: "text-plasma",
  },
  {
    k: "03",
    glyph: "▶",
    label: "The move",
    line: "The action surfaces with the edge attached, linked to the tool.",
    tone: "text-ultraviolet",
  },
];

export function MissionControlHow(): JSX.Element {
  return (
    <section
      aria-label="How Mission Control works"
      className="relative overflow-hidden rounded-ds-lg border border-mineral bg-eclipse/40 p-5 sm:p-6"
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-signal-fade" />
      <div className="flex items-center gap-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ion-2">How this works</p>
        <span aria-hidden className="h-px flex-1" style={{ backgroundImage: "var(--signal-fade)", opacity: 0.4 }} />
      </div>
      <ol className="mt-4 grid gap-4 sm:grid-cols-3">
        {BEATS.map((b, i) => (
          <li key={b.k} className="relative flex gap-3">
            <span className={`font-numerals text-2xl font-bold leading-none ${b.tone}`} aria-hidden>
              {b.glyph}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-2">
                <span className="font-mono text-[10px] tabular-nums text-ion-2">{b.k}</span>
                <span className="text-sm font-semibold text-ion-white">{b.label}</span>
              </p>
              <p className="mt-1 text-xs leading-5 text-ion-1">{b.line}</p>
            </div>
            {i < BEATS.length - 1 && (
              <span
                aria-hidden
                className="pointer-events-none absolute -right-2 top-2 hidden text-ion-3 sm:block"
              >
                →
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
