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
 * Accessible: leg toggles are real aria-pressed buttons with the global focus
 * ring; the computed vitals live in an aria-live region; no motion dependency.
 *
 * Color doctrine: verdicts escalate cyan → ultraviolet → caution → alert.
 * Plasma is never used as a negative; risk load reads as caution, structural
 * cost as caution, and outright negative EV as alert (always paired with a
 * sign or a word, never color alone).
 */

import { useMemo, useState } from "react";
import {
  SAMPLE_LEGS, GROUP_LABELS, computeVitals, decimalToAmerican, type ParlayVerdict,
} from "@/lib/parlay/parlay";
import { NUMERIC_TEXT_CLASS } from "@/lib/format/stat";

const product = (xs: number[]) => xs.reduce((a, b) => a * b, 1);
const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Verdict tone map — presentation only; the verdict itself comes from the lib. */
const VERDICT_TONE: Record<ParlayVerdict, { text: string; badge: string; glow: string }> = {
  Empty: { text: "text-ion-2", badge: "border-mineral text-ion-1", glow: "bg-transparent" },
  Balanced: { text: "text-orbital-cyan", badge: "border-orbital-cyan/40 bg-orbital-cyan/10 text-orbital-cyan", glow: "bg-orbital-cyan/10" },
  Stretched: { text: "text-ultraviolet", badge: "border-ultraviolet/40 bg-ultraviolet/10 text-ultraviolet", glow: "bg-ultraviolet/10" },
  Brittle: { text: "text-caution", badge: "border-caution/40 bg-caution/10 text-caution", glow: "bg-caution/10" },
  Mutated: { text: "text-alert", badge: "border-alert/40 bg-alert/10 text-alert", glow: "bg-alert/10" },
};

function Gene({ label, value, barClass }: { label: string; value: number; barClass: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-ion-2">{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-mineral/40">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: pct(value) }} />
      </div>
    </div>
  );
}

export function ParlayGenome() {
  const [active, setActive] = useState<Set<string>>(() => new Set(SAMPLE_LEGS.map((l) => l.id)));

  const activeLegs = useMemo(() => SAMPLE_LEGS.filter((l) => active.has(l.id)), [active]);
  const vitals = useMemo(() => computeVitals(activeLegs), [activeLegs]);
  const tone = VERDICT_TONE[vitals.verdict];

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
          <p className={`font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
            The ticket · {vitals.count}/{SAMPLE_LEGS.length} legs
          </p>
          <button
            type="button"
            onClick={reset}
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-ion-1 transition-colors hover:text-ion-white"
          >
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
                className={`surface-card block w-full p-4 text-left transition-all ${on ? "" : "opacity-45"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ion-2">{l.market}</span>
                      {corr && (
                        <span className="rounded-full border border-caution/40 bg-caution/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-caution">
                          {GROUP_LABELS[l.group!] ?? l.group}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-ion-white">{l.label}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono text-sm tabular-nums ${on ? "text-orbital-cyan" : "text-ion-3"}`}>
                      {decimalToAmerican(l.priceDecimal)}
                    </p>
                    <p className="font-mono text-xs tabular-nums text-ion-2">{pct(l.winProb)} fair</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  <Gene label="Volatility" value={l.volatility} barClass="bg-ultraviolet" />
                  <Gene label="Public exp." value={l.publicExposure} barClass="bg-caution" />
                  <Gene label="Injury dep." value={l.injuryDependency} barClass="bg-caution" />
                  <Gene label="Line value" value={l.lineValue} barClass="bg-orbital-cyan" />
                </div>
                <p className={`mt-2 font-mono text-[10px] uppercase tracking-[0.12em] ${on ? "text-orbital-cyan" : "text-ion-2"}`}>
                  {on ? "In ticket · tap to remove" : "Removed · tap to add"}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Vitals (the surgeon) ── */}
      <div className="space-y-4">
        <div aria-live="polite" className="surface-card relative overflow-hidden p-6">
          <div aria-hidden className={`pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full blur-3xl ${tone.glow}`} />
          <div className="relative flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">Ticket vitals</p>
            <span className={`rounded-full border px-3 py-1 text-sm font-bold ${tone.badge}`}>
              {vitals.verdict}
            </span>
          </div>

          <div className="relative mt-5 grid grid-cols-2 gap-x-5 gap-y-4">
            <Vital label="Survivability" value={pct(vitals.survivability)} sub="chance all legs hit" toneClass="text-orbital-cyan" />
            <Vital label="Expected value" value={`${(vitals.ev * 100).toFixed(1)}%`} sub="per $1 staked" toneClass={evPositive ? "text-orbital-cyan" : "text-alert"} />
            <Vital label="Headline payout" value={`${vitals.payoutDecimal ? vitals.payoutDecimal.toFixed(2) : "0"}×`} sub={`${decimalToAmerican(vitals.payoutDecimal)} American`} toneClass="text-ion-white" />
            <Vital label="Fair payout" value={`${vitals.fairPayoutDecimal ? vitals.fairPayoutDecimal.toFixed(2) : "0"}×`} sub="zero-vig break-even" toneClass="text-ultraviolet" />
            <Vital label="House edge" value={pct(vitals.houseEdge)} sub="compounded across legs" toneClass="text-caution" />
            <Vital label="Dependency Coefficient" value={vitals.count ? vitals.dependencyCoefficient.toFixed(2) : "—"} sub={vitals.correlated.length ? `${vitals.correlated.length} same-game tie${vitals.correlated.length > 1 ? "s" : ""}: structural, not statistical` : "every leg independent"} toneClass={vitals.correlated.length ? "text-caution" : "text-orbital-cyan"} />
          </div>
        </div>

        {/* surgery suggestions */}
        <div className="surface-card p-5">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">Surgeon&apos;s notes</p>
          <ul className="space-y-2.5">
            {vitals.suggestions.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-ion-1">
                <span aria-hidden className={tone.text}>↳</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
          {single && vitals.count > 1 && (
            <div className="mt-4 rounded-lg border border-mineral bg-carbon/60 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ion-2">If you played these as singles instead</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ion-1">
                Average expected value <strong className={`${NUMERIC_TEXT_CLASS} text-ion-white`}>{(single.avgEv * 100).toFixed(1)}%</strong> per leg, and a{" "}
                <strong className={`${NUMERIC_TEXT_CLASS} text-ion-white`}>{pct(single.someReturn)}</strong> chance at least one returns, versus a{" "}
                <strong className={`${NUMERIC_TEXT_CLASS} text-alert`}>{pct(1 - vitals.survivability)}</strong> chance the parlay returns nothing.
                The multiplied payout is the multiplied risk.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Vital({ label, value, sub, toneClass }: { label: string; value: string; sub: string; toneClass: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ion-2">{label}</p>
      <p className={`mt-0.5 ${NUMERIC_TEXT_CLASS} text-2xl font-semibold ${toneClass}`}>{value}</p>
      <p className="text-xs text-ion-2">{sub}</p>
    </div>
  );
}
