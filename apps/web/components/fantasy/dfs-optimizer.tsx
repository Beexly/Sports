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

  return (
    <div className="space-y-6">
      {/* controls */}
      <div className="surface-card flex flex-wrap items-center gap-4 p-4">
        <div className="flex rounded-full p-0.5" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND_COLORS.steelGray}` }}>
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <button key={m.key} type="button" onClick={() => setMode(m.key)} title={m.blurb}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none"
                style={{ color: active ? BRAND_COLORS.obsidianBlack : "var(--ion-2,#c8d2dd)", background: active ? BRAND_COLORS.orbitalCyan : "transparent" }}>
                {m.label}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-300">
          <input type="checkbox" checked={stack} onChange={(e) => setStack(e.target.checked)} className="accent-cyan-400" />
          QB stack
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-300">
          Lineups
          <input type="range" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} className="accent-cyan-400" />
          <span className="w-6 font-mono text-sm text-white">{count}</span>
        </label>
        <button type="button" onClick={() => run()} disabled={busy} className="btn btn-primary ml-auto disabled:opacity-60">
          {busy ? "Solving…" : "Generate lineups"}
        </button>
      </div>
      <p className="-mt-3 text-xs text-ink-500">
        {MODES.find((m) => m.key === mode)!.blurb} · Cap ${SALARY_CAP.toLocaleString()}
        {imported && <span style={{ color: BRAND_COLORS.orbitalCyan }}> · imported DK slate ({slate.length} players)</span>}
      </p>

      <DkImportPanel onImport={onImport} onReset={onReset} imported={imported} />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* lineups */}
        <div className="space-y-4">
          {result?.lineups.map((lu, idx) => {
            const m = lu.metrics;
            const left = SALARY_CAP - m.salary;
            return (
              <div key={idx} className="surface-card overflow-hidden p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5" style={{ borderColor: BRAND_COLORS.steelGray }}>
                  <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Lineup {idx + 1}{m.stacked > 0 && <span style={{ color: BRAND_COLORS.softUltraviolet }}> · {m.stackTeam} stack ×{m.stacked}</span>}</p>
                  <div className="flex items-center gap-4 font-mono text-[11px]">
                    <span className="text-ink-400">${m.salary.toLocaleString()} <span className="text-ink-600">(${left} left)</span></span>
                    <span style={{ color: BRAND_COLORS.orbitalCyan }}>{m.proj} proj</span>
                    <span style={{ color: BRAND_COLORS.softUltraviolet }}>{m.ceiling} ceil</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3">
                  {lu.players.map((p, j) => {
                    const c = DFS_POS_HEX[p.pos];
                    const inStack = m.stackTeam && p.team === m.stackTeam && p.pos !== "DST";
                    return (
                      <div key={p.id + j} className="flex items-center gap-2 border-b border-r px-3 py-2" style={{ borderColor: `${BRAND_COLORS.steelGray}80` }}>
                        <span className="w-8 shrink-0 font-mono text-[9px] font-bold" style={{ color: c }}>{DFS_SLOTS[j]}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-white">{p.name}{inStack && <span title="stack" style={{ color: BRAND_COLORS.softUltraviolet }}> ◆</span>}</p>
                          <p className="font-mono text-[9px] text-ink-500">${p.salary} · {Math.round(p.own * 100)}%own</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 text-[11px] text-ink-400">
                  <span>Total ownership <strong className="text-white">{m.totalOwn}%</strong></span>
                  <span>Leverage <strong style={{ color: BRAND_COLORS.ionMagenta }}>{m.leverageScore}</strong></span>
                  <span>Floor–ceiling <strong className="text-white">{m.floor}–{m.ceiling}</strong></span>
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
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-ink-500">Exposure across {result.lineups.length} lineups</p>
              <div className="space-y-1.5">
                {result.exposure.slice(0, 10).map((e) => (
                  <div key={e.id} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 truncate text-xs text-ink-300">{e.name}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div className="h-full rounded-full" style={{ width: `${e.pct}%`, background: DFS_POS_HEX[e.pos] }} />
                    </div>
                    <span className="w-9 text-right font-mono text-[10px] text-ink-500">{e.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="surface-card p-5">
            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-ink-500">Slate · ★ pin · ✕ fade</p>
            <div className="max-h-[44vh] space-y-0.5 overflow-y-auto">
              {pool.map((p: DfsPlayer) => {
                const c = DFS_POS_HEX[p.pos];
                const locked = locks.has(p.id); const fade = excludes.has(p.id);
                return (
                  <div key={p.id} className="flex items-center gap-2 rounded px-1.5 py-1" style={{ opacity: fade ? 0.4 : 1 }}>
                    <span className="rounded px-1 py-0.5 font-mono text-[9px] font-bold" style={{ color: c, background: `${c}18` }}>{p.pos}</span>
                    <span className="flex-1 truncate text-xs text-white">{p.name}</span>
                    <span className="font-mono text-[10px] text-ink-500">${p.salary}</span>
                    <span className="w-8 text-right font-mono text-[10px]" style={{ color: BRAND_COLORS.ionMagenta }}>{leverage(p).toFixed(1)}</span>
                    <button type="button" onClick={() => toggle(locks, setLocks, p.id)} title="pin" className="px-1 text-[11px]" style={{ color: locked ? BRAND_COLORS.orbitalCyan : "var(--ion-4,#4b5563)" }}>★</button>
                    <button type="button" onClick={() => toggle(excludes, setExcludes, p.id)} title="fade" className="px-1 text-[11px]" style={{ color: fade ? BRAND_COLORS.ionMagenta : "var(--ion-4,#4b5563)" }}>✕</button>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-ink-600">Rightmost number is leverage (ceiling vs. ownership). Pin/fade, then Generate.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
