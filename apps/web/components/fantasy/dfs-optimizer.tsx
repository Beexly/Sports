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
  { key: "cash", label: "Cash", blurb: "Maximise projection: the safest median." },
  { key: "gpp", label: "GPP", blurb: "Maximise ceiling: win the tournament." },
  { key: "leverage", label: "Leverage", blurb: "Contrarian ceiling vs. ownership: the edge." },
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
      {/* sample-mode banner — fictional names must never read as real players */}
      {!imported && (
        <div
          className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3"
          style={{ borderColor: `${BRAND_COLORS.ionMagenta}55`, background: `${BRAND_COLORS.ionMagenta}0d` }}
        >
          <span
            className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ background: BRAND_COLORS.ionMagenta, color: BRAND_COLORS.obsidianBlack }}
          >
            sample slate
          </span>
          <p className="text-xs text-ion-1">
            These are <strong className="text-ion-white">fictional players</strong> with illustrative
            numbers, by design, so no fake stats ever attach to a real athlete. To optimize the
            real slate today: export the player CSV from DraftKings and import it below ⤵
          </p>
        </div>
      )}

      {/* controls */}
      <div className="surface-card flex flex-wrap items-center gap-4 p-4">
        <div className="flex rounded-full p-0.5" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND_COLORS.steelGray}` }}>
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <button key={m.key} type="button" onClick={() => setMode(m.key)} title={m.blurb} aria-pressed={active}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none"
                style={{ color: active ? BRAND_COLORS.obsidianBlack : "var(--ion-1)", background: active ? BRAND_COLORS.orbitalCyan : "transparent" }}>
                {m.label}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-sm text-ion-1">
          <input type="checkbox" checked={stack} onChange={(e) => setStack(e.target.checked)} className="accent-orbital-cyan" />
          QB stack
        </label>
        <label className="flex items-center gap-2 text-sm text-ion-1">
          Lineups
          <input type="range" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} className="accent-orbital-cyan" />
          <span className="w-6 font-mono text-sm text-ion-white">{count}</span>
        </label>
        <button type="button" onClick={() => run()} disabled={busy} className="btn btn-primary ml-auto disabled:opacity-60">
          {busy ? "Solving…" : "Generate lineups"}
        </button>
      </div>
      <p className="-mt-3 text-xs text-ion-2">
        {MODES.find((m) => m.key === mode)!.blurb} · Cap ${SALARY_CAP.toLocaleString()}
        {imported && <span style={{ color: BRAND_COLORS.orbitalCyan }}> · imported DK slate ({slate.length} players)</span>}
      </p>

      <DkImportPanel onImport={onImport} onReset={onReset} imported={imported} />

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1.05fr]">
        {/* lineups */}
        <div className="space-y-4">
          {result?.lineups.map((lu, idx) => {
            const m = lu.metrics;
            const left = SALARY_CAP - m.salary;
            return (
              <div key={idx} className="surface-card overflow-hidden p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5" style={{ borderColor: BRAND_COLORS.steelGray }}>
                  <p className="text-xs uppercase tracking-[0.16em] text-ion-2">Lineup {idx + 1}{m.stacked > 0 && <span style={{ color: BRAND_COLORS.softUltraviolet }}> · {m.stackTeam} stack ×{m.stacked}</span>}</p>
                  <div className="flex items-center gap-4 font-mono text-[11px]">
                    <span className="text-ion-1">${m.salary.toLocaleString()} <span className={left < 0 ? "text-plasma" : "text-ion-2"}>(${left.toLocaleString()} left)</span></span>
                    <span style={{ color: BRAND_COLORS.orbitalCyan }}>{m.proj} proj</span>
                    <span style={{ color: BRAND_COLORS.softUltraviolet }}>{m.ceiling} ceil</span>
                  </div>
                </div>
                {/* live salary-cap meter */}
                <div className="px-4 pb-2 pt-2">
                  <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (m.salary / SALARY_CAP) * 100)}%`, background: left < 0 ? BRAND_COLORS.ionMagenta : BRAND_COLORS.orbitalCyan }} />
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
                          <p className="truncate text-xs font-semibold text-ion-white">{p.name}{inStack && <span title="stack" style={{ color: BRAND_COLORS.softUltraviolet }}> ◆</span>}</p>
                          <p className="font-mono text-[9px] text-ion-2">${p.salary} · {Math.round(p.own * 100)}%own</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 text-[11px] text-ion-1">
                  <span>Total ownership <strong className="text-ion-white">{m.totalOwn}%</strong></span>
                  <span>Leverage <strong style={{ color: BRAND_COLORS.ionMagenta }}>{m.leverageScore}</strong></span>
                  <span>Floor-ceiling <strong className="text-ion-white">{m.floor}-{m.ceiling}</strong></span>
                </div>
              </div>
            );
          })}
          {!result?.lineups.length && <div className="surface-card p-6 text-sm text-ion-1">No lineup fits the constraints. Loosen your locks or excludes.</div>}
        </div>

        {/* exposure + pool */}
        <div className="space-y-4">
          {result && result.exposure.length > 0 && (
            <div className="surface-card p-5">
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-ion-2">Exposure across {result.lineups.length} lineups</p>
              <div className="max-h-[40vh] space-y-1.5 overflow-y-auto">
                {result.exposure.map((e) => (
                  <div key={e.id} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 truncate text-xs text-ion-1">{e.name}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div className="h-full rounded-full" style={{ width: `${e.pct}%`, background: DFS_POS_HEX[e.pos] }} />
                    </div>
                    <span className="w-9 text-right font-mono text-[10px] text-ion-2">{e.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="surface-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.16em] text-ion-2">Slate ({pool.length})</p>
              <p className="font-mono text-[10px] text-ion-2">
                <span style={{ color: BRAND_COLORS.orbitalCyan }}>★ {locks.size} pinned</span>
                {" · "}
                <span style={{ color: BRAND_COLORS.ionMagenta }}>✕ {excludes.size} faded</span>
              </p>
            </div>
            <div className="max-h-[60vh] space-y-0.5 overflow-y-auto">
              {pool.map((p: DfsPlayer) => {
                const c = DFS_POS_HEX[p.pos];
                const locked = locks.has(p.id); const fade = excludes.has(p.id);
                return (
                  <div key={p.id} className="flex items-center gap-2 rounded px-1.5 py-1.5" style={{ opacity: fade ? 0.4 : 1, background: locked ? `${BRAND_COLORS.orbitalCyan}12` : "transparent" }}>
                    <span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold" style={{ color: c, background: `${c}18` }}>{p.pos}</span>
                    <span className="flex-1 truncate text-sm text-ion-white">{p.name}</span>
                    <span className="font-mono text-[11px] text-ion-2">${p.salary}</span>
                    <span className="w-8 text-right font-mono text-[11px]" style={{ color: BRAND_COLORS.ionMagenta }}>{leverage(p).toFixed(1)}</span>
                    <button type="button" onClick={() => toggle(locks, setLocks, p.id)} title="pin" aria-label={`Pin ${p.name}`} aria-pressed={locked} className="px-1 text-sm" style={{ color: locked ? BRAND_COLORS.orbitalCyan : "var(--ion-3)" }}>★</button>
                    <button type="button" onClick={() => toggle(excludes, setExcludes, p.id)} title="fade" aria-label={`Fade ${p.name}`} aria-pressed={fade} className="px-1 text-sm" style={{ color: fade ? BRAND_COLORS.ionMagenta : "var(--ion-3)" }}>✕</button>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-ion-2">Rightmost number is leverage (ceiling vs. ownership). Pin/fade, then Generate.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
