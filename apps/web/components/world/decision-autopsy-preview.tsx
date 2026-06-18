import Link from "next/link";

/**
 * DecisionAutopsyPreview — the evidence trail a finished decision leaves.
 *
 * An x-ray timeline: original signal → market movement → caveat → result →
 * lesson. The shape of a real autopsy from /performance/losses, rendered with
 * placeholder-free, explicitly illustrative content (no teams, no odds
 * claims). Server component; markers are static color semantics, no motion.
 */

const TRAIL = [
  {
    stamp: "T-0 · published",
    title: "Original signal",
    body: "Edge cleared every gate: fresh inputs, acceptable price, model agreement. Confidence recorded at publication, not after.",
    marker: "bg-orbital-cyan",
  },
  {
    stamp: "T+2h · market",
    title: "Line moved against",
    body: "The market drifted away from our number. Movement is logged as evidence, whichever way it points.",
    marker: "bg-plasma",
  },
  {
    stamp: "T+4h · caveat",
    title: "Caveat flagged",
    body: "A late availability change landed after publication. The row was annotated in place — never silently edited.",
    marker: "bg-caution",
  },
  {
    stamp: "Final",
    title: "Result settled",
    body: "The row lost. The loss goes in the public record next to every win, graded on the decision, not the bounce.",
    marker: "bg-alert",
  },
  {
    stamp: "Review",
    title: "What was learned",
    body: "Late-window availability risk now weighs heavier in that market type. The model version notes the change.",
    marker: "bg-ion-white",
  },
] as const;

export function DecisionAutopsyPreview(): JSX.Element {
  return (
    <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
      <div>
        <p className="font-display text-2xl font-semibold leading-snug text-white sm:text-3xl">
          Losses don&apos;t get deleted.
          <br />
          They get dissected.
        </p>
        <p className="mt-4 max-w-md text-sm leading-7 text-ink-300">
          Every settled decision leaves a trail: what the system believed, what
          the market did, what changed, and what the engine learned. Good
          process with a bad outcome is respected; a lucky win is flagged.
        </p>
        <Link
          href="/performance/losses"
          className="mt-6 inline-block text-sm font-semibold text-orbital-cyan hover:text-white"
        >
          Open the autopsy room ▸
        </Link>
      </div>

      <ol className="relative space-y-0 border-l border-white/[0.08] pl-6">
        <p className="mb-4 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-400">
          Anatomy of a settled decision — illustrative trail
        </p>
        {TRAIL.map((item) => (
          <li key={item.title} className="relative pb-6 last:pb-0">
            <span
              aria-hidden
              className={`absolute -left-[1.84rem] top-1.5 h-2.5 w-2.5 rounded-full ${item.marker}`}
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">{item.stamp}</p>
            <p className="mt-1 text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-1 text-sm leading-6 text-ink-300">{item.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
