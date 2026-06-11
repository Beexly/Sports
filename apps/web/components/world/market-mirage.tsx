"use client";

/**
 * MarketMirageChapter — what looks obvious, degrading under inspection.
 *
 * KIKK True/False translated into market terms: a popular-looking play is
 * presented at full confidence, then the user steps through hidden risk
 * layers (public pressure → price decay → stale context → gate verdict) and
 * watches the "obvious" surface dim as each layer lands.
 *
 * Honesty: the example is explicitly generic and labelled illustrative — a
 * nameless favorite, no real teams, no real odds claims. Interaction is plain
 * buttons (keyboard-first); the dimming uses gw-mirage-layer transitions that
 * collapse cleanly under reduced motion.
 */

import { useState } from "react";

type MirageLayer = {
  id: string;
  step: string;
  title: string;
  body: string;
  tone: "heat" | "caution" | "alert";
};

const LAYERS: readonly MirageLayer[] = [
  {
    id: "pressure",
    step: "Layer 1",
    title: "Public pressure",
    body: "Four of five dollars are on the same side. The story is loud — and the price has been bending toward the noise all day.",
    tone: "heat",
  },
  {
    id: "price",
    step: "Layer 2",
    title: "Price decay",
    body: "The number you'd get now is two points worse than the open. Whatever value existed was paid out to people who moved earlier.",
    tone: "heat",
  },
  {
    id: "context",
    step: "Layer 3",
    title: "Stale context",
    body: "The case for the play cites a rotation that changed yesterday. The narrative is running on old information.",
    tone: "caution",
  },
  {
    id: "verdict",
    step: "Layer 4",
    title: "Gate verdict",
    body: "Distorted price, decayed value, unverified context. The gate closes — and the pass is logged with its reasons.",
    tone: "alert",
  },
] as const;

const TONE_TEXT: Record<MirageLayer["tone"], string> = {
  heat: "text-plasma",
  caution: "text-caution",
  alert: "text-alert",
};
const TONE_BORDER: Record<MirageLayer["tone"], string> = {
  heat: "border-plasma/40",
  caution: "border-caution/40",
  alert: "border-alert/50",
};

export function MarketMirageChapter(): JSX.Element {
  const [revealed, setRevealed] = useState(0);
  const done = revealed >= LAYERS.length;
  // The "obvious" surface dims as truth layers land.
  const surfaceOpacity = 1 - revealed * 0.19;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      {/* the mirage */}
      <div className="relative overflow-hidden rounded-ds-lg border border-mineral bg-void p-6 sm:p-8">
        <div aria-hidden className="gw-starfield" />
        <p className="relative font-mono text-[10px] uppercase tracking-[0.2em] text-ion-2">
          Illustrative scenario — no real game, no real odds
        </p>
        <div
          className="gw-mirage-layer relative mt-6"
          style={{ opacity: surfaceOpacity, filter: done ? "saturate(0.4)" : undefined }}
        >
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-plasma">
            Tonight&apos;s “obvious” play
          </p>
          <p className="gw-chrome-ice mt-3 font-display text-4xl font-semibold leading-none sm:text-5xl">
            The favorite,
            <br />
            minus the points.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-ion-1">
            Everyone agrees. The replies agree. The shows agree. Agreement feels
            like evidence.
          </p>
        </div>
        {done ? (
          <div className="relative mt-8 border-t border-alert/40 pt-5">
            <p className="gw-text-glow-alert font-mono text-xs uppercase tracking-[0.22em] text-alert">Mirage collapsed</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-ion">
              What looked like consensus was distortion. The edge was never the
              pick — it was knowing what not to trust.
            </p>
          </div>
        ) : null}
      </div>

      {/* the layers */}
      <div className="flex flex-col">
        <ol className="space-y-3">
          {LAYERS.map((layer, i) => {
            const shown = i < revealed;
            return (
              <li
                key={layer.id}
                className={`gw-mirage-layer rounded-ds-md border bg-eclipse p-4 ${
                  shown ? TONE_BORDER[layer.tone] : "border-mineral opacity-50"
                }`}
                style={shown ? undefined : { transform: "translateY(2px)" }}
                aria-hidden={!shown}
              >
                <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${shown ? TONE_TEXT[layer.tone] : "text-ion-2"}`}>
                  {layer.step} · {layer.title}
                </p>
                {shown ? <p className="mt-2 text-sm leading-6 text-ion">{layer.body}</p> : null}
              </li>
            );
          })}
        </ol>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {!done ? (
            <button
              type="button"
              onClick={() => setRevealed((r) => Math.min(r + 1, LAYERS.length))}
              className="btn-secondary min-h-11"
            >
              Reveal the next layer ({revealed}/{LAYERS.length})
            </button>
          ) : (
            <button type="button" onClick={() => setRevealed(0)} className="btn-ghost min-h-11">
              Reset the mirage
            </button>
          )}
          <p className="text-xs text-ion-2" role="status">
            {done
              ? "Four layers deep, the obvious play was a pass."
              : "Step through what the surface hides."}
          </p>
        </div>
      </div>
    </div>
  );
}
