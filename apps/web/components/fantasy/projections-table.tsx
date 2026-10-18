"use client";

/**
 * ProjectionsTable — the LineStar-style slate view.
 *
 * Columns a DFS player actually sorts on, in the fantasy suite's one column
 * order: Player · Pos · Projection · Ceiling · Leverage · Matchup, then the
 * DFS-specific salary, value (points per $1k), projected ownership, and last-5
 * form. Click a header to sort. Lock/exclude from the row. Numerals are
 * right-aligned and every abbreviated header carries its full word as a title.
 *
 * Mirrors the LineStar Projections page structure (scraped 2026-09-12).
 * On the sample slate the names are fictional and the badge says so.
 */

import { useMemo, useState } from "react";
import { DFS_POS_HEX, leverage, type DfsPlayer } from "@/lib/fantasy/dfs-slate";
import { PracticeSlateTag } from "@/components/fantasy/practice-slate-tag";

type SortKey = "name" | "pos" | "salary" | "proj" | "value" | "own" | "lev" | "ceiling" | "form" | "matchup";

const COLUMNS: { key: SortKey; label: string; numeric: boolean; title: string }[] = [
  { key: "name", label: "Player", numeric: false, title: "Player, team, and opponent" },
  { key: "pos", label: "Pos", numeric: false, title: "Position" },
  { key: "proj", label: "Proj", numeric: true, title: "Projection: projected points" },
  { key: "ceiling", label: "Ceiling", numeric: true, title: "Ceiling: upside points" },
  { key: "lev", label: "Leverage", numeric: true, title: "Leverage: ceiling vs ownership. Higher is more contrarian upside." },
  { key: "matchup", label: "Matchup", numeric: true, title: "Matchup: opponent rank vs this position, 0-100. Higher is softer." },
  { key: "salary", label: "Salary", numeric: true, title: "DraftKings salary" },
  { key: "value", label: "Value", numeric: true, title: "Value: projected points per $1k of salary" },
  { key: "own", label: "Own%", numeric: true, title: "Projected field ownership" },
  { key: "form", label: "L5", numeric: true, title: "Last 5 games, points per game" },
];

function valuePerK(p: DfsPlayer): number {
  return p.salary > 0 ? (p.proj / p.salary) * 1000 : 0;
}

const CELL = "h-9 px-2.5 font-mono tabular-nums whitespace-nowrap";

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
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ion-1">
          Player pool <span className="text-ion-2">· {players.length} players</span>
        </p>
        <div className="flex items-center gap-3">
          <p className="hidden text-[11px] text-ion-2 sm:block">Check to pin into every lineup. Exclude removes.</p>
          {isLive ? (
            <span className="rounded-full bg-orbital-cyan/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-orbital-cyan">
              Live salaries
            </span>
          ) : (
            <PracticeSlateTag />
          )}
        </div>
      </div>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-eclipse">
            <tr className="border-b border-mineral">
              <th scope="col" className="w-8 px-2"><span className="sr-only">Pin</span></th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`h-9 px-2.5 ${c.numeric ? "text-right" : "text-left"}`}
                  title={c.title}
                  aria-sort={sort.key === c.key ? (sort.dir === -1 ? "descending" : "ascending") : undefined}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className={`font-mono text-[10px] font-semibold uppercase tracking-[0.12em] ${
                      sort.key === c.key ? "text-orbital-cyan" : "text-ion-2 hover:text-ion-white"
                    }`}
                  >
                    {c.label}
                    {sort.key === c.key ? (sort.dir === -1 ? " ↓" : " ↑") : ""}
                  </button>
                </th>
              ))}
              <th scope="col" className="px-2"><span className="sr-only">Exclude</span></th>
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
                  <td className="h-9 px-2">
                    <input
                      type="checkbox"
                      checked={locked}
                      onChange={() => onToggleLock(p.id)}
                      aria-label={`Pin ${p.name}`}
                      className="h-3.5 w-3.5 accent-orbital-cyan"
                    />
                  </td>
                  <td className="h-9 max-w-[12rem] truncate px-2.5 text-ion-white" title={`${p.name}, ${p.team} vs ${p.opp}`}>
                    {p.name}
                    <span className="ml-1.5 font-mono text-[10px] text-ion-2">{p.team} v {p.opp}</span>
                  </td>
                  <td className="h-9 px-2.5">
                    <span className="rounded px-1 py-0.5 font-mono text-[9px] font-bold" style={{ color: phex, background: `${phex}1c` }}>
                      {p.pos}
                    </span>
                  </td>
                  <td className={`${CELL} text-right font-semibold text-ion-white`}>{p.proj.toFixed(1)}</td>
                  <td className={`${CELL} text-right text-ion-1`}>{p.ceiling.toFixed(1)}</td>
                  <td
                    className={`${CELL} text-right`}
                    style={{ color: lev >= 0.35 ? "#FF4D2E" : lev <= 0.15 ? "#C4BFB6" : "#EDE8E0" }}
                  >
                    {lev.toFixed(2)}
                  </td>
                  <td
                    className={`${CELL} text-right`}
                    style={{
                      color:
                        p.matchupImpact == null
                          ? "var(--ion-2)"
                          : p.matchupImpact >= 60
                            ? "#FF4D2E"
                            : p.matchupImpact <= 40
                              ? "#C4BFB6"
                              : "var(--ion-1)",
                    }}
                  >
                    {p.matchupImpact != null ? Math.round(p.matchupImpact) : "n/a"}
                  </td>
                  <td className={`${CELL} text-right text-ion-1`}>${(p.salary / 1000).toFixed(1)}k</td>
                  <td className={`${CELL} text-right text-ion-1`}>{value.toFixed(2)}</td>
                  <td className={`${CELL} text-right text-ion-1`}>{(p.own * 100).toFixed(1)}%</td>
                  <td className={`${CELL} text-right ${p.formL5 != null ? "text-ion-1" : "text-ion-2"}`}>
                    {p.formL5 != null ? p.formL5.toFixed(1) : "n/a"}
                  </td>
                  <td className="h-9 px-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => onToggleExclude(p.id)}
                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                        excluded ? "text-alert" : "text-ion-2 hover:text-alert"
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
    </div>
  );
}
