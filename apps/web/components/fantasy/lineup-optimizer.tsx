"use client";

/**
 * LineupOptimizer — the optimal start/sit, with the leverage of every call and a
 * what-if toggle (mark a player out and watch the lineup re-solve). Illustrative.
 */

import { useMemo, useState } from "react";
import { POS_HEX } from "@/lib/fantasy/players";
import { DEFAULT_ROSTER_IDS, rosterFromIds, optimize, startReason } from "@/lib/fantasy/lineup";
import { BRAND_COLORS } from "@/lib/brand";

const VERDICT_HEX = { anchor: BRAND_COLORS.orbitalCyan, start: BRAND_COLORS.softUltraviolet, close: BRAND_COLORS.ionMagenta } as const;

export function LineupOptimizer() {
  const [out, setOut] = useState<Set<string>>(new Set());
  const roster = useMemo(() => rosterFromIds(DEFAULT_ROSTER_IDS).filter((p) => !out.has(p.id)), [out]);
  const opt = useMemo(() => optimize(roster), [roster]);
  const toggleOut = (id: string) => setOut((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      {/* optimal lineup */}
      <div className="surface-card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: BRAND_COLORS.steelGray }}>
          <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Optimal lineup</p>
          <p className="font-mono text-sm" style={{ color: BRAND_COLORS.orbitalCyan }}>{opt.total} proj</p>
        </div>
        <div>
          {opt.starters.map((call) => {
            const c = POS_HEX[call.player.pos];
            const vc = VERDICT_HEX[call.verdict];
            return (
              <div key={call.slot + call.player.id} className="flex items-center gap-3 border-b px-5 py-3 last:border-b-0" style={{ borderColor: BRAND_COLORS.steelGray }}>
                <span className="w-10 shrink-0 font-mono text-[11px] font-bold text-ink-400">{call.slot}</span>
                <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold" style={{ color: c, background: `${c}18` }}>{call.player.pos}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{call.player.name}</p>
                  <p className="text-[11px] text-ink-500">{startReason(call)}</p>
                </div>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ color: vc, background: `${vc}14`, border: `1px solid ${vc}44` }}>{call.verdict}</span>
                <span className="w-10 shrink-0 text-right font-mono text-sm text-white">{call.player.proj}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* bench + totals + what-if */}
      <div className="space-y-4">
        <div className="surface-card p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Projected band</p>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div><p className="font-display text-2xl" style={{ color: BRAND_COLORS.ionMagenta }}>{opt.floor}</p><p className="text-[10px] text-ink-500">floor</p></div>
            <div><p className="font-display text-2xl text-white">{opt.total}</p><p className="text-[10px] text-ink-500">median</p></div>
            <div><p className="font-display text-2xl" style={{ color: BRAND_COLORS.orbitalCyan }}>{opt.ceiling}</p><p className="text-[10px] text-ink-500">ceiling</p></div>
          </div>
        </div>

        <div className="surface-card p-5">
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-ink-500">Bench · tap any player to mark out</p>
          <div className="space-y-1.5">
            {[...rosterFromIds(DEFAULT_ROSTER_IDS)].sort((a, b) => b.proj - a.proj).map((pl) => {
              const isOut = out.has(pl.id);
              const isStarter = opt.starters.some((c) => c.player.id === pl.id);
              const c = POS_HEX[pl.pos];
              return (
                <button key={pl.id} type="button" onClick={() => toggleOut(pl.id)} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/5 focus-visible:outline-none" style={{ opacity: isOut ? 0.4 : 1 }}>
                  <span className="flex items-center gap-2 truncate">
                    <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold" style={{ color: c, background: `${c}18` }}>{pl.pos}</span>
                    <span className={`truncate text-sm ${isOut ? "text-ink-500 line-through" : "text-white"}`}>{pl.name}</span>
                    {isStarter && !isOut && <span className="text-[9px] uppercase tracking-wider" style={{ color: BRAND_COLORS.orbitalCyan }}>start</span>}
                  </span>
                  <span className="font-mono text-[11px] text-ink-500">{isOut ? "OUT" : pl.proj}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] text-ink-600">Marking a player out re-solves the optimal lineup instantly.</p>
        </div>
      </div>
    </div>
  );
}
