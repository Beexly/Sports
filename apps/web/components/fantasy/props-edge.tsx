"use client";

/**
 * PropsEdge — the pick'em edge advisor.
 *
 * Reads third-party pick'em lines (Underdog / DK Pick6 style) and shows where our
 * model disagrees: P(side), the conviction, and the most valuable ALT line — the
 * line/multiplier where edge × payout pays best. Build a Power-Play entry and see
 * its true combined probability and EV before you ever stake a dollar.
 */

import { useMemo, useState } from "react";
import { PROPS, readProp, evalEntry, type Prop, type PropRead } from "@/lib/fantasy/props";

// Side identity (not semantic outcome): over = cyan, under = plasma — the two
// poles of a call, mirroring trade-analyzer's give/get. Signed EV reads use
// verify/alert; plasma is never a negative.
const sideTone = (side: "over" | "under") => (side === "over" ? "var(--orbital-cyan)" : "var(--plasma)");

export function PropsEdge({ lines = PROPS }: { lines?: readonly Prop[] }) {
  const reads = useMemo(() => lines.map(readProp).sort((a, b) => b.edge - a.edge), [lines]);
  const [entry, setEntry] = useState<Set<string>>(new Set());

  if (reads.length === 0) {
    return (
      <div className="surface-card p-8 text-center">
        <p className="text-sm text-ion-1">No pick&apos;em lines are connected right now.</p>
        <p className="mx-auto mt-2 max-w-md text-[11px] leading-relaxed text-ion-2">
          The Pick&apos;em Edge reads a licensed lines feed (obtained under agreement, never scraped). Until
          one is connected it shows the illustrative slate, never fabricated live lines.
        </p>
      </div>
    );
  }

  const inEntry = (id: string) => entry.has(id);
  const toggle = (id: string) => {
    const n = new Set(entry);
    if (n.has(id)) n.delete(id);
    else if (n.size < 6) n.add(id);
    setEntry(n);
  };

  const entryReads = reads.filter((r) => entry.has(r.prop.id));
  const ev = entryReads.length >= 2 ? evalEntry(entryReads) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
      {/* board */}
      <div className="space-y-2.5">
        {reads.map((r) => (
          <PropRow key={r.prop.id} r={r} active={inEntry(r.prop.id)} onToggle={() => toggle(r.prop.id)} />
        ))}
      </div>

      {/* entry builder */}
      <div className="lg:sticky lg:top-24 self-start">
        <div className="surface-card p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ion-2">Power-Play entry</p>
          <p className="mt-1 text-xs text-ion-1">Add 2-6 legs. Every leg must hit. We show your true odds and EV.</p>

          {entryReads.length === 0 && (
            <p className="mt-5 text-sm text-ion-2">Tap a prop's <span className="text-orbital-cyan">+</span> to build an entry.</p>
          )}

          {entryReads.length > 0 && (
            <ul className="mt-4 space-y-2">
              {entryReads.map((r) => (
                <li key={r.prop.id} className="flex items-center gap-2 text-xs">
                  <span className="rounded px-1.5 py-0.5 font-mono font-bold uppercase" style={{ color: sideTone(r.side), background: `color-mix(in srgb, ${sideTone(r.side)} 9%, transparent)` }}>{r.side}</span>
                  <span className="flex-1 truncate text-ion-white">{r.prop.player} <span className="text-ion-2">{r.prop.market} {r.prop.line}</span></span>
                  <span className="font-mono tabular-nums text-ion-1">{Math.round(r.pSide * 100)}%</span>
                  <button type="button" onClick={() => toggle(r.prop.id)} className="px-1 text-ion-2 hover:text-ion-white" aria-label="remove">×</button>
                </li>
              ))}
            </ul>
          )}

          {ev && (
            <div className="mt-5 border-t border-mineral pt-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <Metric label="True odds" value={`${(ev.combinedP * 100).toFixed(1)}%`} />
                <Metric label="Pays" value={`${ev.payout}×`} />
                {/* Signed EV — verify when positive, alert when negative, neutral in between. */}
                <Metric label="EV / $1" value={`${ev.ev >= 0 ? "+" : ""}${ev.ev.toFixed(2)}`} tone={ev.ev > 0.08 ? "var(--verify)" : ev.ev > -0.05 ? "var(--ion-white)" : "var(--alert)"} />
              </div>
              <p className="mt-3 text-center text-xs">
                <span className="rounded-full px-3 py-1 font-semibold uppercase tracking-wider" style={{ background: ev.verdict === "+EV" ? "color-mix(in srgb, var(--verify) 12%, transparent)" : ev.verdict === "thin" ? "rgba(255,255,255,0.07)" : "color-mix(in srgb, var(--alert) 12%, transparent)", color: ev.verdict === "+EV" ? "var(--verify)" : ev.verdict === "thin" ? "var(--ion-white)" : "var(--alert)" }}>
                  {ev.verdict === "+EV" ? "Model-favored (illustrative, not a guarantee)" : ev.verdict === "thin" ? "Thin edge (near break-even)" : "Model-unfavored (illustrative)"}
                </span>
              </p>
              <p className="mt-3 text-[10px] leading-relaxed text-ion-2">
                Combined probability is the product of each leg on our recommended side, the reason big entries rarely pay. We surface the math the slip hides.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="font-mono text-lg font-semibold tabular-nums" style={{ color: tone ?? "var(--ion-white)" }}>{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-wider text-ion-2">{label}</p>
    </div>
  );
}

function PropRow({ r, active, onToggle }: { r: PropRead; active: boolean; onToggle: () => void }) {
  const tone = sideTone(r.side);
  const alt = r.bestAlt;
  return (
    <div className="surface-card flex items-center gap-3 p-3" style={{ borderColor: active ? tone : undefined, boxShadow: active ? `0 0 0 1px ${tone}` : undefined }}>
      <button
        type="button"
        onClick={onToggle}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors"
        style={{ background: active ? tone : "rgba(255,255,255,0.06)", color: active ? "var(--obsidian)" : "var(--ion-white)" }}
        aria-label={active ? "remove from entry" : "add to entry"}
      >
        {active ? "✓" : "+"}
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ion-white">
          {r.prop.player} <span className="font-normal text-ion-2">{r.prop.team} · {r.prop.market}</span>
        </p>
        <p className="text-[11px] text-ion-1">
          Line <span className="font-mono tabular-nums text-ion-1">{r.prop.line}</span> · our number <span className="font-mono tabular-nums" style={{ color: tone }}>{r.prop.mean}</span> · {r.note}
        </p>
      </div>

      {/* pick + conviction */}
      <div className="hidden shrink-0 text-right sm:block">
        <p className="font-mono text-sm font-bold uppercase tabular-nums" style={{ color: tone }}>{r.side} {Math.round(r.pSide * 100)}%</p>
        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div className="h-full rounded-full" style={{ width: `${Math.round(r.edge * 100)}%`, background: tone }} />
        </div>
      </div>

      {/* best alt */}
      {alt && (
        <div className="hidden shrink-0 border-l border-mineral pl-3 text-right md:block" title="The alt line where edge × payout pays best">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ion-2">Best alt</p>
          <p className="text-xs text-ion-white">{r.side} <span className="font-mono tabular-nums">{alt.line}</span> @ <span className="font-mono tabular-nums text-ultraviolet">{alt.mult}×</span></p>
          {/* signed EV: verify up, alert down — never plasma for a negative */}
          <p className={`font-mono text-[10px] tabular-nums ${alt.ev >= 0 ? "text-verify" : "text-alert"}`}>
            EV {alt.ev >= 0 ? "+" : ""}{alt.ev.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}
