"use client";

/**
 * DfsOptimizer — the glass-box DFS lineup builder.
 *
 * Cash / GPP / Leverage objectives, QB stacking, locks & excludes, and N unique
 * lineups with real exposure control — every lineup shipped with its salary,
 * stack, total field-ownership, and a leverage score. The reasoning LineStar
 * buries, surfaced. Illustrative slate.
 */

import { useMemo, useState } from "react";
import { DFS_SLATE, DFS_SLOTS, SALARY_CAP, DFS_POS_HEX, type DfsPlayer } from "@/lib/fantasy/dfs-slate";
import { generateLineups, type Mode, type GenResult } from "@/lib/fantasy/dfs-optimizer";
import { DkImportPanel } from "@/components/fantasy/dk-import-panel";
import { ProjectionsTable } from "@/components/fantasy/projections-table";

const MODES: { key: Mode; label: string; blurb: string }[] = [
  { key: "cash", label: "Cash", blurb: "Maximise projection: highest median." },
  { key: "gpp", label: "GPP", blurb: "Maximise ceiling: highest upside." },
  { key: "leverage", label: "Leverage", blurb: "Contrarian ceiling vs. ownership: low-owned upside." },
];

export function DfsOptimizer() {
  const [mode, setMode] = useState<Mode>("gpp");
  const [stack, setStack] = useState(true);
  const [count, setCount] = useState(3);
  const [maxExp, setMaxExp] = useState(100);
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
      // maxExp is a 1-100 percent; the engine takes a 0-1 fraction.
      setResult(generateLineups({ mode, stack, locks, excludes }, count, maxExp / 100, s));
      setBusy(false);
    }, 10);
  };
  // No auto-generate on mount: fictional sample lineups are never presented
  // unasked. The user presses Generate explicitly (customer-data contract).

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
      {/* sample-mode banner — fictional names must never read as real players.
          Caution tone (semantic): a data-honesty warning, never plasma. */}
      {!imported && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-caution/30 bg-caution/5 px-4 py-3">
          <span className="rounded-full bg-caution px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-obsidian">
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
        <div className="flex rounded-full border border-mineral p-0.5" style={{ background: "rgba(255,255,255,0.05)" }}>
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <button key={m.key} type="button" onClick={() => setMode(m.key)} title={m.blurb} aria-pressed={active}
                className="rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none"
                style={{ color: active ? "var(--obsidian)" : "var(--ion-1)", background: active ? "var(--orbital-cyan)" : "transparent" }}>
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
        <label className="flex items-center gap-2 text-sm text-ion-1" title="No player appears in more than this share of lineups">
          Max exposure
          <input type="range" min={10} max={100} step={5} value={maxExp} onChange={(e) => setMaxExp(Number(e.target.value))} className="accent-orbital-cyan" />
          <span className="w-10 font-mono text-sm text-ion-white">{maxExp}%</span>
        </label>
        <button type="button" onClick={() => run()} disabled={busy} className="btn btn-primary ml-auto disabled:opacity-60">
          {busy ? "Solving…" : "Generate lineups"}
        </button>
        {result && result.lineups.length > 0 && (
          <button
            type="button"
            onClick={() => {
              // DK Classic CSV: one row per lineup, slot order matches DFS_SLOTS.
              const header = DFS_SLOTS.join(",");
              const rows = result.lineups.map((lu) =>
                lu.players.map((p) => `"${p.name}"`).join(","),
              );
              const csv = [header, ...rows].join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `gse-lineups-${result.lineups.length}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="btn btn-ghost"
            aria-label="Export lineups as CSV"
          >
            Export CSV ({result.lineups.length})
          </button>
        )}
      </div>
      <p className="-mt-3 text-xs text-ion-2">
        {MODES.find((m) => m.key === mode)!.blurb} · Cap ${SALARY_CAP.toLocaleString()}
        {imported && <span className="text-orbital-cyan"> · imported DK slate ({slate.length} players)</span>}
      </p>

      <DkImportPanel onImport={onImport} onReset={onReset} imported={imported} />

      {/* partial-result notice — generation stopped under the current search
          pressure (locks/excludes/salary/stack/decay retries). That is NOT a
          proof that no other feasible set exists, so the copy says stopped
          and shows returned-vs-requested, never "exhausted". */}
      {result?.partial && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-caution/30 bg-caution/5 px-4 py-3">
          <span className="rounded-full bg-caution px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-obsidian">
            partial
          </span>
          <p className="text-xs text-ion-1">
            Only <strong className="text-ion-white">{result.lineups.length} of {result.requested} requested</strong> lineups generated — the search
            stopped under the current locks, salary cap, and exposure target. This is not proof no other combination exists: request fewer lineups or loosen pins/fades and generate again.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1.05fr]">
        {/* lineups */}
        <div className="space-y-4">
          {result?.lineups.map((lu, idx) => {
            const m = lu.metrics;
            const left = SALARY_CAP - m.salary;
            return (
              <div key={idx} className="surface-card overflow-hidden p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mineral px-4 py-2.5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ion-2">Lineup {idx + 1}{m.stacked > 0 && <span className="text-ultraviolet"> · {m.stackTeam} stack ×{m.stacked}</span>}</p>
                  <div className="flex items-center gap-4 font-mono text-[11px] tabular-nums">
                    {/* over the cap is a broken lineup — alert, never plasma */}
                    <span className="text-ion-1">${m.salary.toLocaleString()} <span className={left < 0 ? "text-alert" : "text-ion-2"}>(${left.toLocaleString()} left)</span></span>
                    <span className="text-orbital-cyan">{m.proj} proj</span>
                    <span className="text-ultraviolet">{m.ceiling} ceil</span>
                  </div>
                </div>
                {/* live salary-cap meter */}
                <div className="px-4 pb-2 pt-2">
                  <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (m.salary / SALARY_CAP) * 100)}%`, background: left < 0 ? "var(--alert)" : "var(--orbital-cyan)" }} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3">
                  {lu.players.map((p, j) => {
                    const c = DFS_POS_HEX[p.pos];
                    const inStack = m.stackTeam && p.team === m.stackTeam && p.pos !== "DST";
                    return (
                      <div key={p.id + j} className="flex items-center gap-2 border-b border-r border-mineral/50 px-3 py-2">
                        <span className="w-8 shrink-0 font-mono text-[9px] font-bold" style={{ color: c }}>{DFS_SLOTS[j]}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-ion-white">{p.name}{inStack && <span title="stack" className="text-ultraviolet"> ◆</span>}</p>
                          <p className="font-mono text-[9px] tabular-nums text-ion-2">${p.salary} · {Math.round(p.own * 100)}%own</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 text-[11px] text-ion-1">
                  <span>Total ownership <strong className="text-ion-white">{m.totalOwn}%</strong></span>
                  {/* leverage is the upside read — plasma celebrates, it never warns */}
                  <span>Leverage <strong className="text-plasma">{m.leverageScore}</strong></span>
                  <span>Floor-ceiling <strong className="text-ion-white">{m.floor}-{m.ceiling}</strong></span>
                </div>
              </div>
            );
          })}
          {result === null && <div className="surface-card p-6 text-sm text-ion-1">Press Generate to build lineups from the current pool.</div>}
          {result !== null && !result.lineups.length && <div className="surface-card p-6 text-sm text-ion-1">No lineup fits the constraints. Loosen your locks or excludes.</div>}
        </div>

        {/* exposure + pool */}
        <div className="space-y-4">
          {result && result.exposure.length > 0 && (
            <div className="surface-card p-5">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ion-2">Exposure across {result.lineups.length} lineups · target {Math.round(result.exposureTarget * 100)}% (shares below are realized, not capped)</p>
              <div className="max-h-[40vh] space-y-1.5 overflow-y-auto">
                {result.exposure.map((e) => (
                  <div key={e.id} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 truncate text-xs text-ion-1">{e.name}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div className="h-full rounded-full" style={{ width: `${e.pct}%`, background: DFS_POS_HEX[e.pos] }} />
                    </div>
                    <span className="w-9 text-right font-mono text-[10px] tabular-nums text-ion-2">{e.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ProjectionsTable
            players={pool}
            locks={locks}
            excludes={excludes}
            onToggleLock={(id) => toggle(locks, setLocks, id)}
            onToggleExclude={(id) => toggle(excludes, setExcludes, id)}
            isLive={imported}
          />
        </div>
      </div>
    </div>
  );
}
