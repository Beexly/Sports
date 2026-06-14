"use client";

/**
 * DfsOptimizer — the glass-box DFS lineup builder.
 *
 * Cash / GPP / Leverage objectives, QB stacking, locks & excludes, and N unique
 * lineups with real exposure control — every lineup shipped with its salary,
 * stack, total field-ownership, and a leverage score. The reasoning LineStar
 * buries, surfaced. Illustrative slate.
 */

import { useEffect, useMemo, useState } from "react";
import { DFS_SLATE, DFS_SLOTS, SALARY_CAP, DFS_POS_HEX, leverage, type DfsPlayer } from "@/lib/fantasy/dfs-slate";
import { generateLineups, type Mode, type GenResult } from "@/lib/fantasy/dfs-optimizer";
import { DkImportPanel } from "@/components/fantasy/dk-import-panel";
import { BRAND_COLORS } from "@/lib/brand";

const MODES: { key: Mode; label: string; blurb: string }[] = [
  { key: "cash", label: "Cash", blurb: "Maximise projection — the safest median." },
  { key: "gpp", label: "GPP", blurb: "Maximise ceiling — win the tournament." },
  { key: "leverage", label: "Leverage", blurb: "Contrarian ceiling vs. ownership — the edge." },
];

export function DfsOptimizer() {
  const [mode, setMode] = useState<Mode>("gpp");
  const [stack, setStack] = useState(true);
  const [count, setCount] = useState(3);
  const [locks, setLocks] = useState<Set<string>>(new Set());
  const [excludes, setExcludes] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<GenResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [slate, setSlate] = useState<DfsPlayer[]>(() => [...DFS_SLATE]);
  const [imported, setImported] = useState(false);

  const run = (s: DfsPlayer[] = slate) => {
    setBusy(true);
    // let the button paint, then compute (synchronous but quick)
    setTimeout(() => {
      setResult(generateLineups({ mode, stack, locks, excludes }, count, 0.6, s));
      setBusy(false);
    }, 10);
  };
  // initial build
  useEffect(() => { setResult(generateLineups({ mode: "gpp", stack: true, locks: new Set(), excludes: new Set() }, 3, 0.6, DFS_SLATE)); }, []);

  const onImport = (players: DfsPlayer[]) => {
    setSlate(players); setImported(true); setLocks(new Set()); setExcludes(new Set()); run(players);
  };
  const onReset = () => {
    const base = [...DFS_SLATE]; setSlate(base); setImported(false); setLocks(new Set()); setExcludes(new Set()); run(base);
  };

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const n = new Set(set); if (n.has(id)) n.delete(id); else n.add(id); setter(n);
  };

  const pool = useMemo(() => [...slate].sort((a, b) => b.salary - a.salary), [slate]);

  const activeBlurb = MODES.find((m) => m.key === mode)!.blurb;

  return (
    <div className="space-y-6">
      {/* sample-mode banner — fictional names must never read as real players */}
      {!imported && (
        <div className="flex flex-wrap items-start gap-3 rounded-xl border border-mineral bg-eclipse/50 px-4 py-3.5">
          <span
            className="mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ background: BRAND_COLORS.ionMagenta, color: BRAND_COLORS.obsidianBlack }}
          >
            sample slate
          </span>
          <p className="text-sm leading-relaxed text-ink-300">
            These are <strong className="font-semibold text-ion-white">fictional players</strong> with
            illustrative numbers — by design, so no fake stats ever attach to a real athlete. To
            optimize the real slate today, export the player CSV from DraftKings and import it below.
          </p>
        </div>
      )}

      {/* controls — one calm bar, labeled and breathable */}
      <div className="surface-card p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:flex-wrap lg:items-end">
          {/* objective */}
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">Objective</p>
            <div className="inline-flex rounded-full border border-mineral bg-void/40 p-1">
              {MODES.map((m) => {
                const active = mode === m.key;
                return (
                  <button key={m.key} type="button" onClick={() => setMode(m.key)} title={m.blurb}
                    className="rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none"
                    style={{ color: active ? BRAND_COLORS.obsidianBlack : "var(--ion-2,#c8d2dd)", background: active ? BRAND_COLORS.orbitalCyan : "transparent" }}>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* stacking */}
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">Stacking</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-mineral bg-void/40 px-4 py-1.5 text-sm text-ink-200">
              <input type="checkbox" checked={stack} onChange={(e) => setStack(e.target.checked)} className="accent-[#00E5FF]" />
              QB stack
            </label>
          </div>

          {/* count */}
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">Lineups</p>
            <div className="inline-flex items-center gap-3 rounded-full border border-mineral bg-void/40 px-4 py-1.5">
              <input type="range" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-28 accent-[#00E5FF]" />
              <span className="w-6 text-center font-mono text-sm text-ion-white">{count}</span>
            </div>
          </div>

          <button type="button" onClick={() => run()} disabled={busy} className="btn btn-primary lg:ml-auto disabled:opacity-60">
            {busy ? "Solving…" : "Generate lineups"}
          </button>
        </div>

        <p className="mt-4 border-t border-mineral pt-3 text-xs text-ink-400">
          {activeBlurb}
          <span className="text-ink-500"> · Salary cap ${SALARY_CAP.toLocaleString()}</span>
          {imported && <span className="text-orbital-cyan"> · imported DK slate ({slate.length} players)</span>}
        </p>
      </div>

      <DkImportPanel onImport={onImport} onReset={onReset} imported={imported} />

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1.05fr]">
        {/* lineups */}
        <div className="space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
            Lineups{result?.lineups.length ? ` · ${result.lineups.length}` : ""}
          </p>
          {result?.lineups.map((lu, idx) => {
            const m = lu.metrics;
            const left = SALARY_CAP - m.salary;
            const over = left < 0;
            return (
              <div key={idx} className="surface-card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mineral px-4 py-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-400">
                    Lineup {idx + 1}
                    {m.stacked > 0 && (
                      <span style={{ color: BRAND_COLORS.softUltraviolet }}> · {m.stackTeam} stack ×{m.stacked}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-4 font-mono text-[11px] text-ink-300">
                    <span>
                      ${m.salary.toLocaleString()}{" "}
                      <span className={over ? "text-ion-magenta" : "text-ink-500"}>(${left.toLocaleString()} left)</span>
                    </span>
                    <span className="text-ion-white">{m.proj} <span className="text-ink-500">proj</span></span>
                    <span style={{ color: BRAND_COLORS.softUltraviolet }}>{m.ceiling} <span className="text-ink-500">ceil</span></span>
                  </div>
                </div>
                {/* live salary-cap meter */}
                <div className="px-4 pt-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-void">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (m.salary / SALARY_CAP) * 100)}%`, background: over ? BRAND_COLORS.ionMagenta : BRAND_COLORS.orbitalCyan }} />
                  </div>
                </div>
                <div className="grid grid-cols-1 p-2 sm:grid-cols-3">
                  {lu.players.map((p, j) => {
                    const c = DFS_POS_HEX[p.pos];
                    const inStack = m.stackTeam && p.team === m.stackTeam && p.pos !== "DST";
                    return (
                      <div key={p.id + j} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
                        <span className="w-9 shrink-0 font-mono text-[10px] font-bold" style={{ color: c }}>{DFS_SLOTS[j]}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ion-white">
                            {p.name}
                            {inStack && <span title="stack" style={{ color: BRAND_COLORS.softUltraviolet }}> ◆</span>}
                          </p>
                          <p className="font-mono text-[10px] text-ink-500">${p.salary} · {Math.round(p.own * 100)}% own</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-mineral px-4 py-3 text-xs text-ink-400">
                  <span>Total ownership <strong className="font-semibold text-ion-white">{m.totalOwn}%</strong></span>
                  <span>Leverage <strong className="font-semibold" style={{ color: BRAND_COLORS.ionMagenta }}>{m.leverageScore}</strong></span>
                  <span>Floor–ceiling <strong className="font-semibold text-ion-white">{m.floor}–{m.ceiling}</strong></span>
                </div>
              </div>
            );
          })}
          {!result?.lineups.length && <div className="surface-card p-6 text-sm text-ink-400">No lineup fits the constraints — loosen your locks or excludes.</div>}
        </div>

        {/* exposure + pool */}
        <div className="space-y-4">
          {result && result.exposure.length > 0 && (
            <div className="surface-card p-5">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
                Exposure across {result.lineups.length} lineups
              </p>
              <div className="max-h-[40vh] space-y-2 overflow-y-auto pr-1">
                {result.exposure.map((e) => (
                  <div key={e.id} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-xs text-ink-300">{e.name}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-void">
                      <div className="h-full rounded-full" style={{ width: `${e.pct}%`, background: DFS_POS_HEX[e.pos] }} />
                    </div>
                    <span className="w-9 text-right font-mono text-[11px] text-ink-400">{e.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="surface-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">Player pool · {pool.length}</p>
              <p className="font-mono text-[11px] text-ink-500">
                <span className="text-orbital-cyan">★ {locks.size} pinned</span>
                <span className="text-ink-600"> · </span>
                <span className="text-ion-magenta">✕ {excludes.size} faded</span>
              </p>
            </div>
            <div className="max-h-[60vh] space-y-0.5 overflow-y-auto pr-1">
              {pool.map((p: DfsPlayer) => {
                const c = DFS_POS_HEX[p.pos];
                const locked = locks.has(p.id); const fade = excludes.has(p.id);
                return (
                  <div key={p.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03]" style={{ opacity: fade ? 0.45 : 1, background: locked ? `${BRAND_COLORS.orbitalCyan}12` : undefined }}>
                    <span className="w-9 shrink-0 rounded px-1.5 py-0.5 text-center font-mono text-[10px] font-bold" style={{ color: c, background: `${c}18` }}>{p.pos}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ion-white">{p.name}</span>
                    <span className="font-mono text-[11px] text-ink-400">${p.salary}</span>
                    <span className="w-8 text-right font-mono text-[11px]" style={{ color: BRAND_COLORS.ionMagenta }} title="leverage">{leverage(p).toFixed(1)}</span>
                    <button type="button" onClick={() => toggle(locks, setLocks, p.id)} title="pin" className="px-1 text-base leading-none transition-colors" style={{ color: locked ? BRAND_COLORS.orbitalCyan : "var(--ion-4,#4b5563)" }}>★</button>
                    <button type="button" onClick={() => toggle(excludes, setExcludes, p.id)} title="fade" className="px-1 text-base leading-none transition-colors" style={{ color: fade ? BRAND_COLORS.ionMagenta : "var(--ion-4,#4b5563)" }}>✕</button>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 border-t border-mineral pt-3 text-[11px] leading-relaxed text-ink-500">
              The <span className="text-ion-magenta">magenta</span> number is leverage (ceiling vs. ownership).
              Pin with ★, fade with ✕, then Generate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
