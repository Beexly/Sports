"use client";

/**
 * LineupOptimizer — the optimal start/sit, with the leverage of every call and a
 * what-if toggle (mark a player out and watch the lineup re-solve). Illustrative.
 */

import { useMemo, useState } from "react";
import { POS_HEX, type Player } from "@/lib/fantasy/players";
import { DEFAULT_ROSTER_IDS, rosterFromIds, sampleRoster, optimize, startReason } from "@/lib/fantasy/lineup";
import { LivePoolEmpty } from "@/components/fantasy/live-pool-empty";

// Verdict tones (design tokens): anchor = data-certain (cyan), start = model
// call (ultraviolet), close = borderline call (caution). Never plasma for a
// borderline/negative read.
const VERDICT_TONE = { anchor: "var(--orbital-cyan)", start: "var(--ultraviolet)", close: "var(--caution)" } as const;

/**
 * @param pool When provided, the LIVE graded pool resolved server-side — the
 * roster is sampled from it and projections are real. When omitted, the tool runs
 * on the illustrative default (the demo, unchanged).
 */
export function LineupOptimizer({ pool }: { pool?: readonly Player[] } = {}) {
  const live = pool != null;
  const fullRoster = useMemo(
    () => (live ? sampleRoster(pool!) : rosterFromIds(DEFAULT_ROSTER_IDS)),
    [live, pool],
  );
  const [out, setOut] = useState<Set<string>>(new Set());
  const roster = useMemo(() => fullRoster.filter((p) => !out.has(p.id)), [fullRoster, out]);
  const opt = useMemo(() => optimize(roster), [roster]);
  const toggleOut = (id: string) => setOut((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // Live but the graded pool came back empty/unavailable — be honest, never
  // silently fall back to illustrative data presented as live.
  if (live && fullRoster.length === 0) return <LivePoolEmpty />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      {/* optimal lineup */}
      <div className="surface-card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-mineral px-5 py-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ion-2">Optimal lineup</p>
          <p className="font-mono text-sm tabular-nums text-orbital-cyan">{opt.total} proj</p>
        </div>
        <div>
          {opt.starters.map((call) => {
            const c = POS_HEX[call.player.pos];
            const vc = VERDICT_TONE[call.verdict];
            return (
              <div key={call.slot + call.player.id} className="flex items-center gap-3 border-b border-mineral px-5 py-3 last:border-b-0">
                <span className="w-10 shrink-0 font-mono text-[11px] font-bold text-ion-2">{call.slot}</span>
                <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold" style={{ color: c, background: `${c}18` }}>{call.player.pos}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ion-white">{call.player.name}</p>
                  <p className="text-[11px] text-ion-2">{startReason(call)}</p>
                </div>
                <span className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase" style={{ color: vc, background: `color-mix(in srgb, ${vc} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${vc} 27%, transparent)` }}>{call.verdict}</span>
                <span className="w-10 shrink-0 text-right font-mono text-sm tabular-nums text-ion-white">{call.player.proj}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* bench + totals + what-if */}
      <div className="space-y-4">
        <div className="surface-card p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ion-2">Projected band</p>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div><p className="font-numerals text-2xl font-semibold tabular-nums text-ion-1">{opt.floor}</p><p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">floor</p></div>
            <div><p className="font-numerals text-2xl font-semibold tabular-nums text-ion-white">{opt.total}</p><p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">median</p></div>
            <div><p className="font-numerals text-2xl font-semibold tabular-nums text-orbital-cyan">{opt.ceiling}</p><p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">ceiling</p></div>
          </div>
        </div>

        <div className="surface-card p-5">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ion-2">Bench · tap any player to mark out</p>
          <div className="space-y-1.5">
            {[...fullRoster].sort((a, b) => b.proj - a.proj).map((pl) => {
              const isOut = out.has(pl.id);
              const isStarter = opt.starters.some((c) => c.player.id === pl.id);
              const c = POS_HEX[pl.pos];
              return (
                <button key={pl.id} type="button" onClick={() => toggleOut(pl.id)} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate/60 focus-visible:outline-none" style={{ opacity: isOut ? 0.4 : 1 }}>
                  <span className="flex items-center gap-2 truncate">
                    <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold" style={{ color: c, background: `${c}18` }}>{pl.pos}</span>
                    <span className={`truncate text-sm ${isOut ? "text-ion-3 line-through" : "text-ion-white"}`}>{pl.name}</span>
                    {isStarter && !isOut && <span className="font-mono text-[9px] uppercase tracking-wider text-orbital-cyan">start</span>}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-ion-2">{isOut ? "OUT" : pl.proj}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-ion-2">Marking a player out re-solves the optimal lineup instantly.</p>
        </div>
      </div>
    </div>
  );
}
