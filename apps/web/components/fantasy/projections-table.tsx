"use client";

/**
 * ProjectionsTable — the LineStar-style slate view.
 *
 * Columns a DFS player actually sorts on: salary, projection, value
 * (points per $1k), floor/ceiling, projected ownership (pOwn%), and
 * leverage. Click a header to sort. Lock/exclude from the row.
 *
 * Mirrors the LineStar Projections page structure (scraped 2026-09-12).
 * On the sample slate the names are fictional and the badge says so.
 */

import { useMemo, useState } from "react";
import { DFS_POS_HEX, leverage, type DfsPlayer } from "@/lib/fantasy/dfs-slate";

type SortKey = "name" | "pos" | "salary" | "proj" | "value" | "own" | "lev" | "ceiling" | "form" | "matchup";

const COLUMNS: { key: SortKey; label: string; numeric: boolean; title: string }[] = [
  { key: "name", label: "Player", numeric: false, title: "Name and matchup" },
  { key: "pos", label: "Pos", numeric: false, title: "Position" },
  { key: "salary", label: "Sal", numeric: true, title: "DraftKings salary" },
  { key: "proj", label: "Proj", numeric: true, title: "Projected points" },
  { key: "value", label: "Val", numeric: true, title: "Points per $1k salary" },
  { key: "ceiling", label: "Ceil", numeric: true, title: "Ceiling points" },
  { key: "form", label: "L5", numeric: true, title: "Last 5 games, points per game" },
  { key: "matchup", label: "M/U", numeric: true, title: "Matchup impact: opponent rank vs this position, 0-100" },
  { key: "own", label: "pOwn%", numeric: true, title: "Projected field ownership" },
  { key: "lev", label: "Lev", numeric: true, title: "Leverage: ceiling vs ownership" },
];

function valuePerK(p: DfsPlayer): number {
  return p.salary > 0 ? (p.proj / p.salary) * 1000 : 0;
}

export function ProjectionsTable({
  players,
  locks,
  excludes,
  onToggleLock,
  onToggleExclude,
  isLive = false,
}: {
  players: readonly DfsPlayer[];
  locks: ReadonlySet<string>;
  excludes: ReadonlySet<string>;
  onToggleLock: (id: string) => void;
  onToggleExclude: (id: string) => void;
  isLive?: boolean;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "proj", dir: -1 });

  const rows = useMemo(() => {
    const mapped = players.map((p) => ({
      p,
      value: valuePerK(p),
      lev: leverage(p),
    }));
    mapped.sort((a, b) => {
      const k = sort.key;
      let cmp = 0;
      if (k === "name") cmp = a.p.name.localeCompare(b.p.name);
      else if (k === "pos") cmp = a.p.pos.localeCompare(b.p.pos);
      else if (k === "salary") cmp = a.p.salary - b.p.salary;
      else if (k === "proj") cmp = a.p.proj - b.p.proj;
      else if (k === "value") cmp = a.value - b.value;
      else if (k === "own") cmp = a.p.own - b.p.own;
      else if (k === "lev") cmp = a.lev - b.lev;
      else if (k === "ceiling") cmp = a.p.ceiling - b.p.ceiling;
      else if (k === "form") cmp = (a.p.formL5 ?? -1) - (b.p.formL5 ?? -1);
      else if (k === "matchup") cmp = (a.p.matchupImpact ?? -1) - (b.p.matchupImpact ?? -1);
      return cmp * sort.dir;
    });
    return mapped;
  }, [players, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 }));
  };

  return (
    <div className="surface-card overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mineral px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ion-2">
          Projections · {players.length} players
        </p>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={
            isLive
              ? { background: "rgba(255,77,46,0.14)", color: "#FF4D2E" }
              : { background: "rgba(196,191,182,0.12)", color: "#C4BFB6" }
          }
        >
          {isLive ? "Live salaries" : "Sample slate"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mineral/70 text-left">
              <th className="w-8 px-2" />
              {COLUMNS.map((c) => (
                <th key={c.key} className="px-2 py-2" title={c.title}>
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className={`font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${
                      sort.key === c.key ? "text-orbital-cyan" : "text-ion-3 hover:text-ion-1"
                    }`}
                  >
                    {c.label}
                    {sort.key === c.key ? (sort.dir === -1 ? " ↓" : " ↑") : ""}
                  </button>
                </th>
              ))}
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, value, lev }) => {
              const locked = locks.has(p.id);
              const excluded = excludes.has(p.id);
              const phex = DFS_POS_HEX[p.pos];
              return (
                <tr
                  key={p.id}
                  className={`border-b border-mineral/40 transition-colors ${
                    excluded ? "opacity-35" : locked ? "bg-orbital-cyan/[0.06]" : "hover:bg-eclipse/40"
                  }`}
                >
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={locked}
                      onChange={() => onToggleLock(p.id)}
                      aria-label={`Pin ${p.name}`}
                      className="h-3.5 w-3.5 accent-[#FF4D2E]"
                    />
                  </td>
                  <td className="max-w-[10rem] truncate px-2 py-1.5 text-ion-white" title={`${p.name} vs ${p.opp}`}>
                    {p.name}
                    <span className="ml-1.5 text-[10px] text-ion-3">{p.team} vs {p.opp}</span>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="rounded px-1 py-0.5 font-mono text-[9px] font-bold" style={{ color: phex, background: `${phex}1c` }}>
                      {p.pos}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 font-mono tabular-nums text-ion-1">${(p.salary / 1000).toFixed(1)}k</td>
                  <td className="px-2 py-1.5 font-mono font-semibold tabular-nums text-ion-white">{p.proj.toFixed(1)}</td>
                  <td className="px-2 py-1.5 font-mono tabular-nums text-ion-1">{value.toFixed(2)}</td>
                  <td className="px-2 py-1.5 font-mono tabular-nums text-ion-2">{p.ceiling.toFixed(1)}</td>
                  <td className="px-2 py-1.5 font-mono tabular-nums text-ion-1" title="Last 5 games, points per game">
                    {p.formL5 != null ? p.formL5.toFixed(1) : <span className="text-ion-3">n/a</span>}
                  </td>
                  <td
                    className="px-2 py-1.5 font-mono tabular-nums"
                    style={{
                      color:
                        p.matchupImpact == null
                          ? "var(--ion-3)"
                          : p.matchupImpact >= 60
                            ? "#FF4D2E"
                            : p.matchupImpact <= 40
                              ? "#C4BFB6"
                              : "var(--ion-1)",
                    }}
                    title="Matchup impact: opponent rank vs this position, 0-100. Higher = softer."
                  >
                    {p.matchupImpact != null ? Math.round(p.matchupImpact) : <span className="text-ion-3">n/a</span>}
                  </td>
                  <td className="px-2 py-1.5 font-mono tabular-nums text-ion-1">{(p.own * 100).toFixed(1)}%</td>
                  <td
                    className="px-2 py-1.5 font-mono font-semibold tabular-nums"
                    style={{ color: lev >= 0.35 ? "#FF4D2E" : lev <= 0.15 ? "#C4BFB6" : "#EDE8E0" }}
                    title="Leverage: ceiling vs ownership. Higher = more contrarian upside."
                  >
                    {lev.toFixed(2)}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => onToggleExclude(p.id)}
                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                        excluded ? "text-alert" : "text-ion-3 hover:text-alert"
                      }`}
                      aria-label={`Exclude ${p.name}`}
                    >
                      {excluded ? "Excluded" : "Exclude"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-mineral px-4 py-2 text-[11px] text-ion-3">
        Val = points per $1k. Lev = ceiling vs ownership (higher is more contrarian upside).
        Check to pin a player into every lineup. Exclude removes them.
      </p>
    </div>
  );
}
