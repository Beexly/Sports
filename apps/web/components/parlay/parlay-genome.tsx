"use client";

/**
 * ParlayGenome — the interactive Portfolio Surgeon.
 *
 * Toggle illustrative legs in/out and watch the ticket's vitals move in real
 * time: survivability, headline vs fair payout, expected value, the compounded
 * house edge, hidden same-game correlation, and a structural verdict. Surgery
 * suggestions explain what to cut and why; a singles comparison shows the
 * payout illusion. Risk education on illustrative data — transparent math.
 *
 * Accessible: leg toggles are real aria-pressed buttons; the vitals are plain
 * text; no motion dependency.
 */

import { useMemo, useState } from "react";
import {
  SAMPLE_LEGS, GROUP_LABELS, computeVitals, decimalToAmerican, VERDICT_HEX,
} from "@/lib/parlay/parlay";
import { BRAND_COLORS } from "@/lib/brand";

const product = (xs: number[]) => xs.reduce((a, b) => a * b, 1);
const pct = (n: number) => `${Math.round(n * 100)}%`;

function Gene({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-[10px] uppercase tracking-wider text-ink-500">{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full" style={{ width: pct(value), background: color }} />
      </div>
    </div>
  );
}

export function ParlayGenome() {
  const [active, setActive] = useState<Set<string>>(() => new Set(SAMPLE_LEGS.map((l) => l.id)));

  const activeLegs = useMemo(() => SAMPLE_LEGS.filter((l) => active.has(l.id)), [active]);
  const vitals = useMemo(() => computeVitals(activeLegs), [activeLegs]);
  const verdictColor = VERDICT_HEX[vitals.verdict];

  // legs that are part of an active correlated group
  const correlatedIds = useMemo(() => {
    const s = new Set<string>();
    for (const c of vitals.correlated) for (const l of c.legs) s.add(l.id);
    return s;
  }, [vitals]);

  // singles comparison
  const single = useMemo(() => {
    if (!activeLegs.length) return null;
    const evs = activeLegs.map((l) => l.winProb * l.priceDecimal - 1);
    const avgEv = evs.reduce((a, b) => a + b, 0) / evs.length;
    const someReturn = 1 - product(activeLegs.map((l) => 1 - l.winProb));
    return { avgEv, someReturn };
  }, [activeLegs]);

  const toggle = (id: string) =>
    setActive((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const reset = () => setActive(new Set(SAMPLE_LEGS.map((l) => l.id)));

  const evPositive = vitals.ev >= 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      {/* ── Legs (the genome) ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-500">The ticket · {vitals.count}/{SAMPLE_LEGS.length} legs</p>
          <button type="button" onClick={reset} className="text-[11px] uppercase tracking-wider text-ink-400 transition-colors hover:text-white focus-visible:outline-none">
            Reset ticket
          </button>
        </div>
        <div className="space-y-2.5">
          {SAMPLE_LEGS.map((l) => {
            const on = active.has(l.id);
            const corr = on && correlatedIds.has(l.id);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => toggle(l.id)}
                aria-pressed={on}
                className="surface-card block w-full p-4 text-left transition-all focus-visible:outline-none"
                style={{ opacity: on ? 1 : 0.45, boxShadow: on ? `inset 0 0 0 1px ${BRAND_COLORS.steelGray}` : "none" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-500">{l.market}</span>
                      {corr && (
                        <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ color: BRAND_COLORS.ionMagenta, background: `${BRAND_COLORS.ionMagenta}14`, border: `1px solid ${BRAND_COLORS.ionMagenta}44` }}>
                          ⛓ {GROUP_LABELS[l.group!] ?? l.group}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-white">{l.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm" style={{ color: on ? BRAND_COLORS.orbitalCyan : "var(--ion-3,#6b7785)" }}>{decimalToAmerican(l.priceDecimal)}</p>
                    <p className="font-mono text-[10px] text-ink-500">{pct(l.winProb)} fair</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  <Gene label="Volatility" value={l.volatility} color={BRAND_COLORS.softUltraviolet} />
                  <Gene label="Public exp." value={l.publicExposure} color={BRAND_COLORS.ionMagenta} />
                  <Gene label="Injury dep." value={l.injuryDependency} color={BRAND_COLORS.ionMagenta} />
                  <Gene label="Line value" value={l.lineValue} color={BRAND_COLORS.orbitalCyan} />
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-wider" style={{ color: on ? BRAND_COLORS.orbitalCyan : "var(--ion-3,#6b7785)" }}>
                  {on ? "In ticket — tap to remove" : "Removed — tap to add"}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Vitals (the surgeon) ── */}
      <div className="space-y-4">
        <div className="surface-card relative overflow-hidden p-6">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full blur-3xl" style={{ background: `${verdictColor}1f` }} />
          <div className="relative flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Ticket vitals</p>
            <span className="rounded-full px-3 py-1 text-sm font-bold" style={{ color: verdictColor, background: `${verdictColor}14`, border: `1px solid ${verdictColor}55` }}>
              {vitals.verdict}
            </span>
          </div>

          <div className="relative mt-5 grid grid-cols-2 gap-x-5 gap-y-4">
            <Vital label="Survivability" value={pct(vitals.survivability)} sub="chance all legs hit" color={BRAND_COLORS.orbitalCyan} />
            <Vital label="Expected value" value={`${(vitals.ev * 100).toFixed(1)}%`} sub="per $1 staked" color={evPositive ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta} />
            <Vital label="Headline payout" value={`${vitals.payoutDecimal ? vitals.payoutDecimal.toFixed(2) : "0"}×`} sub={`${decimalToAmerican(vitals.payoutDecimal)} American`} color={BRAND_COLORS.ionWhite} />
            <Vital label="Fair payout" value={`${vitals.fairPayoutDecimal ? vitals.fairPayoutDecimal.toFixed(2) : "0"}×`} sub="zero-vig break-even" color={BRAND_COLORS.softUltraviolet} />
            <Vital label="House edge" value={pct(vitals.houseEdge)} sub="compounded across legs" color={BRAND_COLORS.ionMagenta} />
            <Vital label="Dependency" value={vitals.correlated.length ? `${vitals.correlated.length} group${vitals.correlated.length > 1 ? "s" : ""}` : "None"} sub="dependency coefficient — hidden same-game ties" color={vitals.correlated.length ? BRAND_COLORS.ionMagenta : BRAND_COLORS.orbitalCyan} />
          </div>
        </div>

        {/* surgery suggestions */}
        <div className="surface-card p-5">
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-ink-500">Surgeon&apos;s notes</p>
          <ul className="space-y-2.5">
            {vitals.suggestions.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-300">
                <span aria-hidden style={{ color: verdictColor }}>↳</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
          {single && vitals.count > 1 && (
            <div className="mt-4 rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BRAND_COLORS.steelGray}` }}>
              <p className="text-[11px] uppercase tracking-wider text-ink-500">If you played these as singles instead</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-300">
                Average expected value <strong className="text-white">{(single.avgEv * 100).toFixed(1)}%</strong> per leg, and a{" "}
                <strong className="text-white">{pct(single.someReturn)}</strong> chance at least one returns — versus a{" "}
                <strong style={{ color: BRAND_COLORS.ionMagenta }}>{pct(1 - vitals.survivability)}</strong> chance the parlay returns nothing.
                The multiplied payout is the multiplied risk.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Vital({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-0.5 font-display text-2xl" style={{ color }}>{value}</p>
      <p className="text-[10px] text-ink-500">{sub}</p>
    </div>
  );
}
