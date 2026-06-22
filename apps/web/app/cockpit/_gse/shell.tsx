/**
 * Shared presentational primitives for the internal GSE "Decision OS" cockpit
 * browse-pages. Pure server components — no DB, no client state — so they render
 * safely in stub mode and inherit the cockpit layout's admin gate. This folder
 * is underscore-prefixed (`_gse`) so Next.js excludes it from routing.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import type { GseScore, ScoreBand } from "@/lib/gse";

const BAND_TONE_BETTER: Record<ScoreBand, string> = {
  very_low: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  low: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  moderate: "border-titanium/50 bg-obsidian/50 text-ion-1",
  high: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  very_high: "border-emerald-400/50 bg-emerald-400/15 text-emerald-200",
};

const BAND_TONE_RISK: Record<ScoreBand, string> = {
  very_low: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  low: "border-emerald-500/30 bg-emerald-500/5 text-emerald-200",
  moderate: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  high: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  very_high: "border-rose-400/50 bg-rose-400/15 text-rose-200",
};

/** A colorized 0–100 score chip. `riskOriented` flips the palette so a high
 *  risk score reads red, not green. */
export function ScoreBadge({ score, riskOriented = false }: { score: GseScore; riskOriented?: boolean }) {
  const tone = (riskOriented ? BAND_TONE_RISK : BAND_TONE_BETTER)[score.band];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold ${tone}`}
      title={score.rationale.join(" · ")}
    >
      {score.score}
      <span className="opacity-70">{score.band.replace(/_/g, " ")}</span>
    </span>
  );
}

export type PillTone = "neutral" | "good" | "warn" | "bad" | "info";

const PILL_TONE: Record<PillTone, string> = {
  neutral: "border-titanium/50 bg-obsidian/50 text-ion-2",
  good: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  bad: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  info: "border-orbital-cyan/40 bg-orbital-cyan/10 text-orbital-cyan",
};

/** A small labeled chip. */
export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: PillTone }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${PILL_TONE[tone]}`}>
      {children}
    </span>
  );
}

/** A titled content section with an optional blurb. */
export function Section({ title, blurb, children }: { title: string; blurb?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-ion-white">{title}</h2>
        {blurb && <p className="mt-0.5 text-xs text-ion-3">{blurb}</p>}
      </div>
      {children}
    </section>
  );
}

/** A simple bordered table. */
export function Table({ columns, rows }: { columns: readonly string[]; rows: readonly (readonly ReactNode[])[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-titanium/40">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="bg-obsidian/70 text-[10px] uppercase tracking-wide text-ion-3">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 font-semibold">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-titanium/20 align-top text-ion-2">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Page wrapper: kicker badge, title, intro, back link, then the page body. */
export function SystemShell({
  kicker,
  title,
  intro,
  children,
}: {
  kicker: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-md bg-orbital-cyan/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-orbital-cyan">
            {kicker}
          </span>
          <Link
            href="/cockpit/decision-os"
            className="rounded-lg border border-titanium/40 px-3 py-1.5 text-xs text-ion-1 hover:bg-carbon/60"
          >
            Decision OS index
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-ion-white">{title}</h1>
        <p className="max-w-3xl text-sm text-ion-2">{intro}</p>
        <p className="text-[11px] text-ion-3">
          Internal contract browser. Reads typed contracts in <code className="text-ion-2">apps/web/lib/gse/*</code>.
          Worked numbers below are illustrative computations over example inputs — not live data.
        </p>
      </header>
      {children}
    </div>
  );
}
