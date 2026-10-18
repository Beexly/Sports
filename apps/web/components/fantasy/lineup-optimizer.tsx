"use client";

/**
 * LineupOptimizer — the optimal start/sit, with the leverage of every call and a
 * what-if toggle (mark a player out and watch the lineup re-solve). Illustrative.
 */

import { useMemo, useState } from "react";
import { POS_HEX, type Player } from "@/lib/fantasy/players";
import { DEFAULT_ROSTER_IDS, rosterFromIds, sampleRoster, optimize, startReason } from "@/lib/fantasy/lineup";
import { LivePoolEmpty } from "@/components/fantasy/live-pool-empty";
import { FantasyStat } from "@/components/fantasy/fantasy-stat";

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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      {/* optimal lineup: the total Projection is the hero number */}
      <div className="surface-card overflow-hidden p-0">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-mineral px-5 py-5">
          <div>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-ion-1">Optimal lineup</p>
            <FantasyStat label="Projection" value={opt.total} size="xl" tone="var(--orbital-cyan)" title="Total projected points" />
          </div>
          <div className="grid grid-cols-2 gap-x-6">
            <FantasyStat label="Floor" value={opt.floor} size="sm" align="right" tone="var(--ion-1)" />
            <FantasyStat label="Ceiling" value={opt.ceiling} size="sm" align="right" tone="var(--ultraviolet)" />
          </div>
        </div>
        <ul>
          {opt.starters.map((call) => {
            const c = POS_HEX[call.player.pos];
            const vc = VERDICT_TONE[call.verdict];
            return (
              <li key={call.slot + call.player.id} className="flex min-h-[3.25rem] items-center gap-3 border-b border-mineral/60 px-5 py-2 last:border-b-0">
                <span className="w-10 shrink-0 font-mono text-[11px] font-bold text-ion-2">{call.slot}</span>
                <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold" style={{ color: c, background: `${c}18` }}>{call.player.pos}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ion-white">{call.player.name}</p>
                  <p className="truncate text-[11px] text-ion-2">{startReason(call)}</p>
                </div>
                <span className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase" style={{ color: vc, background: `color-mix(in srgb, ${vc} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${vc} 27%, transparent)` }}>{call.verdict}</span>
                <span className="w-12 shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-ion-white" title="Projection">{call.player.proj}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* roster + what-if */}
      <div className="space-y-4">
        <div className="surface-card p-5">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ion-1">Roster</p>
            <p className="text-[11px] text-ion-2">Tap a player to mark out. The lineup re-solves.</p>
          </div>
          <div className="space-y-0.5">
            {[...fullRoster].sort((a, b) => b.proj - a.proj).map((pl) => {
              const isOut = out.has(pl.id);
              const isStarter = opt.starters.some((c) => c.player.id === pl.id);
              const c = POS_HEX[pl.pos];
              return (
                <button key={pl.id} type="button" onClick={() => toggleOut(pl.id)} aria-pressed={isOut} className="flex h-9 w-full items-center justify-between gap-2 rounded-lg px-2 text-left hover:bg-slate/60 focus-visible:outline-none" style={{ opacity: isOut ? 0.4 : 1 }}>
                  <span className="flex items-center gap-2 truncate">
                    <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold" style={{ color: c, background: `${c}18` }}>{pl.pos}</span>
                    <span className={`truncate text-sm ${isOut ? "text-ion-3 line-through" : "text-ion-white"}`}>{pl.name}</span>
                    {isStarter && !isOut && <span className="font-mono text-[9px] uppercase tracking-wider text-orbital-cyan">start</span>}
                  </span>
                  <span className="w-12 text-right font-mono text-[11px] tabular-nums text-ion-1" title="Projection">{isOut ? "OUT" : pl.proj}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
