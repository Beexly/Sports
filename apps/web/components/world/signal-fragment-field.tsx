/**
 * SignalFragmentField — noise resolving into signal, the world's core gesture.
 *
 * Left: fragmented market inputs drifting in the void (magenta = distortion,
 * amber = incomplete, silver = raw). Center: the signal beam. Right: the same
 * inputs after the engine structures them — receipts with a freshness stamp.
 *
 * Pure CSS server component: drift/beam animations come from gw- utilities and
 * stop under reduced motion while every word stays readable.
 */

const NOISE: readonly { text: string; tone: "heat" | "caution" | "raw"; drift: string }[] = [
  { text: "“everyone is on the over”", tone: "heat", drift: "gw-drift" },
  { text: "steam move… or trap?", tone: "raw", drift: "gw-drift-2" },
  { text: "revenge-game narrative", tone: "heat", drift: "gw-drift-3" },
  { text: "unconfirmed injury rumor", tone: "caution", drift: "gw-drift-2" },
  { text: "hot-take radio segment", tone: "heat", drift: "gw-drift" },
  { text: "five books, five prices", tone: "raw", drift: "gw-drift-3" },
  { text: "“can’t-miss” thread", tone: "heat", drift: "gw-drift-2" },
  { text: "yesterday’s line, quoted today", tone: "caution", drift: "gw-drift" },
] as const;

const STRUCTURED: readonly { label: string; value: string }[] = [
  { label: "Priced input", value: "odds normalized across books" },
  { label: "Availability", value: "injury status — confirmed only" },
  { label: "Line history", value: "open → now, with timestamps" },
  { label: "Model read", value: "probability + disagreement width" },
  { label: "Public pressure", value: "measured, not retold" },
  { label: "Freshness", value: "every input carries its age" },
] as const;

const NOISE_TONE: Record<"heat" | "caution" | "raw", string> = {
  heat: "border-plasma/50 text-plasma gw-ring-heat",
  caution: "border-caution/50 text-caution gw-ring-caution",
  raw: "border-white/[0.08] text-ink-300",
};

export function SignalFragmentField(): JSX.Element {
  return (
    <div className="grid items-stretch gap-8 lg:grid-cols-[1fr_auto_1fr]">
      {/* fragments */}
      <div className="relative min-h-64 overflow-hidden rounded-ds-lg border border-white/[0.08] bg-void p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-plasma">
          The market, as you receive it
        </p>
        <div className="mt-4 flex flex-wrap content-start gap-3">
          {NOISE.map((n) => (
            <span
              key={n.text}
              className={`inline-block rounded-ds-sm border px-3 py-1.5 font-mono text-xs ${NOISE_TONE[n.tone]} ${n.drift}`}
            >
              {n.text}
            </span>
          ))}
        </div>
        <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-400">
          noise · narrative · stale price · distortion
        </p>
      </div>

      {/* the beam */}
      <div aria-hidden className="relative hidden w-px justify-self-center lg:block">
        <div className="gw-beam absolute inset-y-0 w-px" />
        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ion-white shadow-[0_0_18px_4px_rgba(0,229,255,0.6)]" />
      </div>
      {/* mobile: the beam continues the journey downward between the panels */}
      <div aria-hidden className="relative mx-auto h-16 w-px lg:hidden">
        <div className="gw-beam absolute inset-y-0 w-px" />
      </div>

      {/* structured intelligence */}
      <div className="rounded-ds-lg border border-white/[0.08] bg-white/[0.04] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orbital-cyan">
          The market, as the engine reads it
        </p>
        <dl className="mt-4">
          {STRUCTURED.map((row) => (
            <div key={row.label} className="gw-receipt">
              <dt className="text-ink-400">{row.label}</dt>
              <dd className="text-right text-white">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs leading-5 text-ink-300">
          Same game, same day — one version argues, the other is structured,
          timestamped, and accountable.
        </p>
      </div>
    </div>
  );
}
