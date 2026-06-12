"use client";

/**
 * ContestSimulator — Monte Carlo contest simulation in the browser.
 *
 * Pick an optimizer lineup and a contest format; the engine simulates a full
 * field and reports finish distribution, cash probability, win probability,
 * and expected ROI. The glass-box version of what FTN sells.
 */

import { useMemo, useState } from "react";
import { simulateContest, FORMATS, type SimResult } from "@/lib/fantasy/contest-sim";
import { DFS_SLATE } from "@/lib/fantasy/dfs-slate";
import { optimizeOne } from "@/lib/fantasy/dfs-optimizer";
import { BRAND_COLORS } from "@/lib/brand";

const MODES = ["cash", "gpp", "leverage"] as const;
type Mode = (typeof MODES)[number];

const MODE_LABEL: Record<Mode, string> = { cash: "Cash (projection)", gpp: "GPP (ceiling)", leverage: "Leverage (contrarian)" };

export function ContestSimulator() {
  const [formatKey, setFormatKey] = useState<string>("Large GPP");
  const [mode, setMode] = useState<Mode>("gpp");
  const [sims, setSims] = useState(500);
  const [result, setResult] = useState<SimResult | null>(null);
  const [busy, setBusy] = useState(false);

  const run = () => {
    setBusy(true);
    setTimeout(() => {
      const lineup = optimizeOne({ mode, stack: true, locks: new Set(), excludes: new Set() }, undefined, 60);
      if (!lineup) { setBusy(false); return; }
      const format = FORMATS[formatKey]!;
      setResult(simulateContest(lineup, DFS_SLATE, format, sims));
      setBusy(false);
    }, 10);
  };

  const format = FORMATS[formatKey]!;

  return (
    <div className="space-y-6">
      {/* sample banner */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: `${BRAND_COLORS.softUltraviolet}55`, background: `${BRAND_COLORS.softUltraviolet}0d` }}>
        <span className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em]" style={{ background: BRAND_COLORS.softUltraviolet, color: BRAND_COLORS.obsidianBlack }}>
          simulation
        </span>
        <p className="text-xs text-ink-300">
          Runs on the illustrative sample slate — real player salaries and projections unlock when you import a DraftKings CSV in the optimizer.
        </p>
      </div>

      {/* controls */}
      <div className="surface-card flex flex-wrap items-center gap-5 p-5">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-ink-500">Contest format</p>
          <div className="flex gap-1.5">
            {Object.keys(FORMATS).map((k) => {
              const active = formatKey === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFormatKey(k)}
                  className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                  style={{ background: active ? BRAND_COLORS.orbitalCyan : "rgba(255,255,255,0.06)", color: active ? BRAND_COLORS.obsidianBlack : "var(--ion-2,#c8d2dd)" }}
                >
                  {k}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-ink-500">Lineup strategy</p>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            className="rounded-md border bg-transparent px-3 py-1.5 text-sm text-white"
            style={{ borderColor: BRAND_COLORS.steelGray }}
          >
            {MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
          </select>
        </div>

        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-ink-500">Simulations</p>
          <div className="flex items-center gap-2">
            <input type="range" min={100} max={2000} step={100} value={sims} onChange={(e) => setSims(Number(e.target.value))} className="accent-cyan-400" style={{ width: 100 }} />
            <span className="w-12 font-mono text-sm text-white">{sims}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="btn btn-primary ml-auto disabled:opacity-60"
        >
          {busy ? "Simulating…" : "Run simulation"}
        </button>
      </div>

      {/* format info */}
      <div className="flex flex-wrap gap-5 font-mono text-[11px] text-ink-400">
        <span>Buy-in <strong className="text-white">${format.buyin}</strong></span>
        <span>Field <strong className="text-white">{format.entrants}</strong> entries</span>
        <span>Prize pool <strong className="text-white">${format.prizePool}</strong></span>
        <span>Pays top <strong className="text-white">{Math.round(format.topPct * 100)}%</strong></span>
      </div>

      {result && <SimOutput result={result} />}
    </div>
  );
}

function SimOutput({ result }: { result: SimResult }) {
  const roiColor = result.roi >= 1 ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta;
  const DIST_COLORS = [BRAND_COLORS.orbitalCyan, BRAND_COLORS.softUltraviolet, "#FFB547", "#4b5563"];

  return (
    <div className="space-y-5">
      {/* key stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Cash rate", value: `${result.cashPct}%`, color: result.cashPct >= 20 ? BRAND_COLORS.orbitalCyan : undefined },
          { label: "Win rate", value: `${result.winPct}%`, color: result.winPct > 0 ? BRAND_COLORS.softUltraviolet : undefined },
          { label: "ROI", value: `${result.roi.toFixed(2)}×`, color: roiColor },
          { label: "Expected P/L", value: `${result.expectedProfit >= 0 ? "+" : ""}$${result.expectedProfit}`, color: roiColor },
        ].map((s) => (
          <div key={s.label} className="surface-card p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-ink-500">{s.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold" style={{ color: s.color ?? "white" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* finish distribution */}
      <div className="surface-card p-5">
        <p className="mb-4 text-[10px] uppercase tracking-[0.16em] text-ink-500">Finish distribution</p>
        <div className="space-y-3">
          {result.finishDist.map((b, i) => (
            <div key={b.label} className="flex items-center gap-3">
              <span className="w-16 text-xs text-ink-400">{b.label}</span>
              <div className="flex-1 overflow-hidden rounded-full" style={{ height: 8, background: "rgba(255,255,255,0.07)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${b.pct}%`, background: DIST_COLORS[i] ?? "#6b7785" }} />
              </div>
              <span className="w-12 text-right font-mono text-xs" style={{ color: DIST_COLORS[i] ?? "var(--ion-3)" }}>{b.pct}%</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-ink-500">
          Avg finish percentile: <strong className="text-ink-200">{result.avgFinishPct}th</strong> —
          lower means your lineup typically beats more of the field.
        </p>
      </div>

      <p className="text-[11px] leading-relaxed text-ink-600">
        Monte Carlo: {"{sims}"}; each run generates a full random field from the slate and scores everyone through a triangular floor/ceiling draw.
        These are <em>estimates</em>, not guarantees — the real field is smarter, has more information, and concentrates on chalk.
      </p>
    </div>
  );
}
