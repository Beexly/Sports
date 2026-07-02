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
import { BRAND_COLORS } from "@/lib/brand";

const sideHex = (side: "over" | "under") => (side === "over" ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta);

export function PropsEdge({ lines = PROPS }: { lines?: readonly Prop[] }) {
  const reads = useMemo(() => lines.map(readProp).sort((a, b) => b.edge - a.edge), [lines]);
  const [entry, setEntry] = useState<Set<string>>(new Set());

  if (reads.length === 0) {
    return (
      <div className="surface-card p-8 text-center">
        <p className="text-sm text-ink-300">No pick&apos;em lines are connected right now.</p>
        <p className="mx-auto mt-2 max-w-md text-[11px] leading-relaxed text-ink-500">
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
          <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Power-Play entry</p>
          <p className="mt-1 text-xs text-ink-400">Add 2-6 legs. Every leg must hit. We show your true odds and EV.</p>

          {entryReads.length === 0 && (
            <p className="mt-5 text-sm text-ink-500">Tap a prop's <span style={{ color: BRAND_COLORS.orbitalCyan }}>+</span> to build an entry.</p>
          )}

          {entryReads.length > 0 && (
            <ul className="mt-4 space-y-2">
              {entryReads.map((r) => (
                <li key={r.prop.id} className="flex items-center gap-2 text-xs">
                  <span className="rounded px-1.5 py-0.5 font-bold uppercase" style={{ color: sideHex(r.side), background: `${sideHex(r.side)}18` }}>{r.side}</span>
                  <span className="flex-1 truncate text-white">{r.prop.player} <span className="text-ink-500">{r.prop.market} {r.prop.line}</span></span>
                  <span className="font-mono text-ink-400">{Math.round(r.pSide * 100)}%</span>
                  <button type="button" onClick={() => toggle(r.prop.id)} className="px-1 text-ink-600 hover:text-white" aria-label="remove">×</button>
                </li>
              ))}
            </ul>
          )}

          {ev && (
            <div className="mt-5 border-t pt-4" style={{ borderColor: BRAND_COLORS.steelGray }}>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Metric label="True odds" value={`${(ev.combinedP * 100).toFixed(1)}%`} />
                <Metric label="Pays" value={`${ev.payout}×`} />
                <Metric label="EV / $1" value={`${ev.ev >= 0 ? "+" : ""}${ev.ev.toFixed(2)}`} hex={ev.ev > 0.08 ? BRAND_COLORS.orbitalCyan : ev.ev > -0.05 ? BRAND_COLORS.ionWhite : BRAND_COLORS.ionMagenta} />
              </div>
              <p className="mt-3 text-center text-xs">
                <span className="rounded-full px-3 py-1 font-semibold uppercase tracking-wider" style={{ background: ev.verdict === "+EV" ? `${BRAND_COLORS.orbitalCyan}1f` : ev.verdict === "thin" ? "rgba(255,255,255,0.07)" : `${BRAND_COLORS.ionMagenta}1f`, color: ev.verdict === "+EV" ? BRAND_COLORS.orbitalCyan : ev.verdict === "thin" ? BRAND_COLORS.ionWhite : BRAND_COLORS.ionMagenta }}>
                  {ev.verdict === "+EV" ? "Positive expected value" : ev.verdict === "thin" ? "Thin: near break-even" : "Negative EV: the book wins this one"}
                </span>
              </p>
              <p className="mt-3 text-[10px] leading-relaxed text-ink-600">
                Combined probability is the product of each leg on our recommended side, the reason big entries rarely pay. We surface the math the slip hides.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, hex }: { label: string; value: string; hex?: string }) {
  return (
    <div>
      <p className="font-mono text-lg font-semibold" style={{ color: hex ?? "#fff" }}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-ink-600">{label}</p>
    </div>
  );
}

function PropRow({ r, active, onToggle }: { r: PropRead; active: boolean; onToggle: () => void }) {
  const hex = sideHex(r.side);
  const alt = r.bestAlt;
  return (
    <div className="surface-card flex items-center gap-3 p-3" style={{ borderColor: active ? hex : undefined, boxShadow: active ? `0 0 0 1px ${hex}` : undefined }}>
      <button
        type="button"
        onClick={onToggle}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors"
        style={{ background: active ? hex : "rgba(255,255,255,0.06)", color: active ? BRAND_COLORS.obsidianBlack : "#fff" }}
        aria-label={active ? "remove from entry" : "add to entry"}
      >
        {active ? "✓" : "+"}
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">
          {r.prop.player} <span className="text-ink-500 font-normal">{r.prop.team} · {r.prop.market}</span>
        </p>
        <p className="text-[11px] text-ink-400">
          Line <span className="font-mono text-ink-300">{r.prop.line}</span> · our number <span className="font-mono" style={{ color: hex }}>{r.prop.mean}</span> · {r.note}
        </p>
      </div>

      {/* pick + conviction */}
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-sm font-bold uppercase" style={{ color: hex }}>{r.side} {Math.round(r.pSide * 100)}%</p>
        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div className="h-full rounded-full" style={{ width: `${Math.round(r.edge * 100)}%`, background: hex }} />
        </div>
      </div>

      {/* best alt */}
      {alt && (
        <div className="hidden shrink-0 border-l pl-3 text-right md:block" style={{ borderColor: BRAND_COLORS.steelGray }} title="The alt line where edge × payout pays best">
          <p className="text-[10px] uppercase tracking-wider text-ink-600">Best alt</p>
          <p className="text-xs text-white">{r.side} <span className="font-mono">{alt.line}</span> @ <span className="font-mono" style={{ color: BRAND_COLORS.softUltraviolet }}>{alt.mult}×</span></p>
          <p className="font-mono text-[10px]" style={{ color: alt.ev >= 0 ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta }}>
            EV {alt.ev >= 0 ? "+" : ""}{alt.ev.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}
