import Link from "next/link";

/**
 * NoBetGateChapter — restraint as the system's proudest output.
 *
 * The gate aperture (gw-gate-ring) holds the center; around it, the real
 * categories of reasons a row gets held. Copy doctrine: "Sometimes the
 * sharpest pick is no pick." Server component; the ring's breathing stops
 * under reduced motion and the composition reads identically.
 */

const GATE_REASONS = [
  {
    title: "Freshness failed",
    body: "An input is older than the decision deserves. Old data argues; it doesn't testify.",
    tone: "text-caution",
  },
  {
    title: "Price below threshold",
    body: "The edge existed at a number the market no longer offers. A good read at a bad price is a bad decision.",
    tone: "text-plasma",
  },
  {
    title: "Model disagreement",
    body: "When our own models split wide, that width is information, and the information says wait.",
    tone: "text-ultraviolet",
  },
  {
    title: "Trust gate closed",
    body: "A source went stale or a check failed. Nothing publishes on inputs we can't defend.",
    tone: "text-alert",
  },
] as const;

export function NoBetGateChapter(): JSX.Element {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
      {/* the gate */}
      <div className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center">
        <span aria-hidden className="gw-gate-ring absolute inset-0" />
        <span aria-hidden className="absolute inset-6 rounded-full border border-mineral" />
        <span aria-hidden className="absolute inset-12 rounded-full border border-mineral/60" />
        <div className="relative text-center">
          <p className="gw-text-glow-white font-display text-5xl font-semibold tracking-tight text-ion-white">
            NO BET
          </p>
          <p className="gw-text-glow-alert mt-2 font-mono text-[10px] uppercase tracking-[0.3em] text-alert">
            gate closed · pass logged
          </p>
        </div>
      </div>

      {/* the doctrine */}
      <div>
        <p className="font-display text-2xl font-semibold leading-snug text-ion-white sm:text-3xl">
          Sometimes the sharpest pick is no pick.
        </p>
        <p className="mt-4 max-w-xl text-sm leading-7 text-ion-1">
          Most products treat an empty board as a failure to hide. Galaxy treats
          it as the system working. Every held row is a decision with reasons
          attached: recorded, public, and accountable, exactly like a
          published one.
        </p>
        <dl className="mt-7 grid gap-4 sm:grid-cols-2">
          {GATE_REASONS.map((reason) => (
            <div key={reason.title} className="rounded-ds-md border border-mineral bg-eclipse p-4">
              <dt className={`font-mono text-[10px] uppercase tracking-[0.18em] ${reason.tone}`}>
                {reason.title}
              </dt>
              <dd className="mt-2 text-sm leading-6 text-ion">{reason.body}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/board" className="text-sm font-semibold text-orbital-cyan hover:text-ion-white">
            See today&apos;s gate decisions ▸
          </Link>
          <Link href="/methodology" className="text-sm font-semibold text-ion-1 hover:text-ion-white">
            How the gates work
          </Link>
        </div>
      </div>
    </div>
  );
}
