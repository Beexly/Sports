"use client";

/**
 * DfsOptimizer — the glass-box DFS lineup builder.
 *
 * Cash / GPP / Leverage objectives, QB stacking, locks & excludes, and N unique
 * lineups with real exposure control — every lineup shipped with its salary,
 * stack, total field-ownership, and a leverage score. The reasoning LineStar
 * buries, surfaced. Illustrative slate.
 *
 * Layout: the generated lineups are the hero (left, widest column, best lineup
 * first and largest); the build controls, CSV import, and exposure sit in a
 * secondary rail; the full projections table runs underneath at full width.
 */

import { useMemo, useState } from "react";
import { DFS_SLATE, DFS_SLOTS, SALARY_CAP, DFS_POS_HEX, type DfsPlayer } from "@/lib/fantasy/dfs-slate";
import { generateLineups, type Mode, type GenResult, type LineupMetrics } from "@/lib/fantasy/dfs-optimizer";
import { DkImportPanel } from "@/components/fantasy/dk-import-panel";
import { ProjectionsTable } from "@/components/fantasy/projections-table";
import { PracticeSlateTag } from "@/components/fantasy/practice-slate-tag";
import { FantasyStat } from "@/components/fantasy/fantasy-stat";

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

  const exportCsv = (r: GenResult) => {
    // DK Classic CSV: one row per lineup, slot order matches DFS_SLOTS.
    const header = DFS_SLOTS.join(",");
    const rows = r.lineups.map((lu) => lu.players.map((p) => `"${p.name}"`).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gse-lineups-${r.lineups.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeMode = MODES.find((m) => m.key === mode)!;

  return (
    <div className="space-y-6">
      {/* sample-mode marker: renders only while the default sample pool is in
          use (`imported` is false). Fictional names must never read as real
          players, so the tag stays until a DK CSV replaces the pool. */}
      {!imported && (
        <div className="flex flex-wrap items-center gap-3">
          <PracticeSlateTag testId="dfs-practice-slate" />
          <p className="text-xs text-ion-2">
            To optimize today&apos;s real slate, export the player CSV from DraftKings and import it.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        {/* ── Hero: the lineups ─────────────────────────────────────── */}
        <div className="min-w-0 space-y-4">
          {/* partial-result notice — generation stopped under the current search
              pressure (locks/excludes/salary/stack/decay retries). That is NOT a
              proof that no other feasible set exists, so the copy says stopped
              and shows returned-vs-requested, never "exhausted". */}
          {result?.partial && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-caution/30 bg-caution/5 px-4 py-3">
              <span className="rounded-full bg-caution px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-obsidian">
                partial
              </span>
              <p className="min-w-0 flex-1 text-xs text-ion-1">
                Only <strong className="text-ion-white">{result.lineups.length} of {result.requested} requested</strong> lineups generated. The search
                stopped under the current locks, salary cap, and exposure target. This is not proof no other combination exists: request fewer lineups or loosen pins/fades and generate again.
              </p>
            </div>
          )}

          {result === null && (
            <div className="surface-card flex min-h-[16rem] flex-col items-start justify-center gap-3 p-8">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ion-2">Your lineups</p>
              <p className="max-w-md font-display text-2xl text-ion-white">Press Generate to build lineups from the current pool.</p>
              <p className="text-xs text-ion-2">{activeMode.label} · Cap ${SALARY_CAP.toLocaleString()}</p>
            </div>
          )}
          {result !== null && !result.lineups.length && <div className="surface-card p-6 text-sm text-ion-1">No lineup fits the constraints. Loosen your locks or excludes.</div>}

          {result?.lineups.map((lu, idx) => (
            <LineupCard key={idx} index={idx} players={lu.players} m={lu.metrics} hero={idx === 0} />
          ))}
        </div>

        {/* ── Secondary rail: build controls, import, exposure ─────── */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="surface-card space-y-4 p-4">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ion-2">Build</p>
            <div>
              <div className="flex rounded-full border border-mineral p-0.5" style={{ background: "rgba(255,255,255,0.05)" }}>
                {MODES.map((m) => {
                  const active = mode === m.key;
                  return (
                    <button key={m.key} type="button" onClick={() => setMode(m.key)} title={m.blurb} aria-pressed={active}
                      className="flex-1 rounded-full px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none"
                      style={{ color: active ? "var(--obsidian)" : "var(--ion-1)", background: active ? "var(--orbital-cyan)" : "transparent" }}>
                      {m.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-ion-2">{activeMode.blurb}</p>
            </div>

            <label className="flex items-center justify-between gap-2 text-sm text-ion-1">
              QB stack
              <input type="checkbox" checked={stack} onChange={(e) => setStack(e.target.checked)} className="accent-orbital-cyan" />
            </label>
            <label className="block text-sm text-ion-1">
              <span className="flex items-center justify-between">
                Lineups
                <span className="font-mono tabular-nums text-ion-white">{count}</span>
              </span>
              <input type="range" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} className="mt-1 w-full accent-orbital-cyan" />
            </label>
            <label className="block text-sm text-ion-1" title="No player appears in more than this share of lineups">
              <span className="flex items-center justify-between">
                Max exposure
                <span className="font-mono tabular-nums text-ion-white">{maxExp}%</span>
              </span>
              <input type="range" min={10} max={100} step={5} value={maxExp} onChange={(e) => setMaxExp(Number(e.target.value))} className="mt-1 w-full accent-orbital-cyan" />
            </label>

            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => run()} disabled={busy} className="btn btn-primary w-full justify-center disabled:opacity-60">
                {busy ? "Solving…" : "Generate lineups"}
              </button>
              {result && result.lineups.length > 0 && (
                <button
                  type="button"
                  onClick={() => exportCsv(result)}
                  className="btn btn-ghost w-full justify-center"
                  aria-label="Export lineups as CSV"
                >
                  Export CSV ({result.lineups.length})
                </button>
              )}
            </div>
            <p className="font-mono text-[11px] tabular-nums text-ion-2">
              Cap ${SALARY_CAP.toLocaleString()}
              {imported && <span className="text-orbital-cyan"> · DK slate, {slate.length} players</span>}
            </p>
          </div>

          <DkImportPanel onImport={onImport} onReset={onReset} imported={imported} />

          {result && result.exposure.length > 0 && (
            <div className="surface-card p-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ion-2">Exposure · {result.lineups.length} lineups</p>
              <p className="mb-3 mt-1 text-[11px] text-ion-2">Target {Math.round(result.exposureTarget * 100)}%. Shares below are realized, not capped.</p>
              <div className="max-h-[40vh] space-y-1.5 overflow-y-auto">
                {result.exposure.map((e) => (
                  <div key={e.id} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 truncate text-xs text-ion-1">{e.name}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div className="h-full rounded-full" style={{ width: `${e.pct}%`, background: DFS_POS_HEX[e.pos] }} />
                    </div>
                    <span className="w-9 text-right font-mono text-[10px] tabular-nums text-ion-2">{e.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <ProjectionsTable
        players={pool}
        locks={locks}
        excludes={excludes}
        onToggleLock={(id) => toggle(locks, setLocks, id)}
        onToggleExclude={(id) => toggle(excludes, setExcludes, id)}
        isLive={imported}
      />
    </div>
  );
}

/**
 * One generated lineup. The first (best) lineup renders as the hero: the total
 * Projection is the largest number on the page, with salary used beside it.
 */
function LineupCard({
  index,
  players,
  m,
  hero,
}: {
  index: number;
  players: readonly DfsPlayer[];
  m: LineupMetrics;
  hero: boolean;
}) {
  const left = SALARY_CAP - m.salary;
  const over = left < 0;
  return (
    <div className="surface-card overflow-hidden p-0">
      <div className={`flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-mineral ${hero ? "px-5 py-5" : "px-4 py-3"}`}>
        <div>
          <p className={`font-mono text-[11px] uppercase tracking-[0.16em] text-ion-1 ${hero ? "mb-4" : "mb-2"}`}>
            Lineup {index + 1}
            {m.stacked > 0 && <span className="text-ultraviolet"> · {m.stackTeam} stack ×{m.stacked}</span>}
          </p>
          <FantasyStat
            label="Projection"
            value={m.proj}
            size={hero ? "xl" : "lg"}
            tone="var(--orbital-cyan)"
            title="Total projected points"
          />
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          {/* over the cap is a broken lineup — alert, never plasma */}
          <FantasyStat
            label="Salary"
            value={`$${m.salary.toLocaleString()}`}
            sub={<span className={over ? "text-alert" : undefined}>{`$${left.toLocaleString()} left`}</span>}
            size="sm"
            align="right"
          />
          <FantasyStat label="Ceiling" value={m.ceiling} size="sm" align="right" tone="var(--ultraviolet)" />
          {/* leverage is the upside read — plasma celebrates, it never warns */}
          <FantasyStat label="Leverage" value={m.leverageScore} size="sm" align="right" tone="var(--plasma)" />
          <FantasyStat label="Ownership" value={`${m.totalOwn}%`} size="sm" align="right" title="Total projected field ownership" />
        </div>
      </div>
      {/* live salary-cap meter */}
      <div className={hero ? "px-5 pt-3" : "px-4 pt-2.5"}>
        <div className="h-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (m.salary / SALARY_CAP) * 100)}%`, background: over ? "var(--alert)" : "var(--orbital-cyan)" }} />
        </div>
      </div>
      <ul className={`grid sm:grid-cols-2 sm:gap-x-6 ${hero ? "px-5 pb-4 pt-2" : "px-4 pb-3 pt-1.5"}`}>
        {players.map((p, j) => {
          const c = DFS_POS_HEX[p.pos];
          const inStack = m.stackTeam && p.team === m.stackTeam && p.pos !== "DST";
          return (
            <li key={p.id + j} className="flex h-9 items-center gap-3 border-b border-mineral/40">
              <span className="w-9 shrink-0 font-mono text-[10px] font-bold" style={{ color: c }}>{DFS_SLOTS[j]}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-ion-white">
                {p.name}
                {inStack && <span title="Part of the stack" className="text-ultraviolet"> ◆</span>}
                <span className="ml-1.5 font-mono text-[10px] text-ion-2">{p.team}</span>
              </span>
              <span className="w-14 shrink-0 text-right font-mono text-[11px] tabular-nums text-ion-2">${(p.salary / 1000).toFixed(1)}k</span>
              <span className="w-10 shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-ion-white" title="Projection">{p.proj.toFixed(1)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
