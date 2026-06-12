"use client";

/**
 * LineupOptimizer — the optimal start/sit, with the leverage of every call and a
 * what-if toggle (mark a player out and watch the lineup re-solve). Illustrative.
 */

import { useMemo, useState } from "react";
import { POS_HEX, type Player, type Pos } from "@/lib/fantasy/players";
import { DEFAULT_ROSTER_IDS, rosterFromIds, sampleRoster, optimize, startReason } from "@/lib/fantasy/lineup";
import { importRoster, type RosterImportResult } from "@/lib/fantasy/roster-import";
import { matchupGrade } from "@/lib/fantasy/matchup";
import { activePlayerPool } from "@/lib/integrations/projections";
import { BRAND_COLORS } from "@/lib/brand";
import { LivePoolEmpty } from "@/components/fantasy/live-pool-empty";

const VERDICT_HEX = { anchor: BRAND_COLORS.orbitalCyan, start: BRAND_COLORS.softUltraviolet, close: BRAND_COLORS.ionMagenta } as const;
const MATCHUP_HEX = { "Cream puff": BRAND_COLORS.orbitalCyan, Favorable: BRAND_COLORS.orbitalCyan, Neutral: "#9fb3c8", Tough: "#E0A800", "Brick wall": BRAND_COLORS.ionMagenta } as const;

/**
 * @param pool When provided, the LIVE graded pool resolved server-side — the
 * roster is sampled from it and projections are real. When omitted, the tool runs
 * on the illustrative default (the demo, unchanged).
 */
export function LineupOptimizer({ pool }: { pool?: readonly Player[] } = {}) {
  const live = pool != null;
  const [imported, setImported] = useState<RosterImportResult | null>(null);
  const [pasteText, setPasteText] = useState("");
  const matchPool = useMemo(() => pool ?? activePlayerPool(), [pool]);
  const fullRoster = useMemo(
    () =>
      imported && imported.matched.length > 0
        ? imported.matched
        : live
          ? sampleRoster(pool!)
          : rosterFromIds(DEFAULT_ROSTER_IDS),
    [imported, live, pool],
  );
  const [out, setOut] = useState<Set<string>>(new Set());
  /** team → opponent team code (user-editable per-game). Empty = no matchup grade shown. */
  const [opponents, setOpponents] = useState<Map<string, string>>(new Map());
  const roster = useMemo(() => fullRoster.filter((p) => !out.has(p.id)), [fullRoster, out]);
  const opt = useMemo(() => optimize(roster), [roster]);
  const toggleOut = (id: string) => setOut((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const setOpponent = (team: string, opp: string) => setOpponents((m) => { const n = new Map(m); if (opp.trim()) n.set(team, opp.trim().toUpperCase()); else n.delete(team); return n; });

  // Live but the graded pool came back empty/unavailable — be honest, never
  // silently fall back to illustrative data presented as live.
  if (live && fullRoster.length === 0) return <LivePoolEmpty />;

  return (
    <div>
      {/* Universal roster import — works for ESPN/Yahoo/anything via paste. */}
      <details className="group mb-6 rounded-ds-md border border-mineral/70 bg-eclipse/60">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: BRAND_COLORS.orbitalCyan }}>
            Import roster
          </span>
          <span className="text-sm text-ink-300">
            {imported && imported.matched.length > 0
              ? `${imported.matched.length} players imported${imported.unmatched.length > 0 ? ` · ${imported.unmatched.length} unmatched` : ""}`
              : "Paste your roster from ESPN, Yahoo, Sleeper, or anywhere — one player per line."}
          </span>
          <span aria-hidden="true" className="ml-auto text-ink-500 transition-transform group-open:rotate-90">›</span>
        </summary>
        <div className="border-t border-mineral/60 px-4 py-4">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={5}
            placeholder={"Patrick Mahomes QB (KC)\n2. Bijan Robinson - RB\n..."}
            className="w-full rounded-md border border-mineral bg-obsidian/60 p-3 font-mono text-xs text-ink-200 placeholder:text-ink-600 focus:border-ink-400 focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => setImported(importRoster(pasteText, matchPool))}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-obsidian"
              style={{ backgroundColor: BRAND_COLORS.orbitalCyan }}
            >
              Match players
            </button>
            {imported && (
              <button onClick={() => { setImported(null); setPasteText(""); }} className="text-xs text-ink-400 underline underline-offset-4">
                Back to sample roster
              </button>
            )}
          </div>
          {imported && imported.unmatched.length > 0 && (
            <p className="mt-2 text-xs text-ink-400">
              Not in the current player pool (skipped, never guessed): {imported.unmatched.join(", ")}
            </p>
          )}
        </div>
      </details>

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
            const opp = opponents.get(call.player.team);
            const mg = opp ? matchupGrade(call.player.team, call.player.pos as Pos, opp) : null;
            const mhex = mg ? MATCHUP_HEX[mg.label] : null;
            return (
              <div key={call.slot + call.player.id} className="border-b last:border-b-0" style={{ borderColor: BRAND_COLORS.steelGray }}>
                <div className="flex items-center gap-3 px-5 py-3">
                  <span className="w-10 shrink-0 font-mono text-[11px] font-bold text-ink-400">{call.slot}</span>
                  <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold" style={{ color: c, background: `${c}18` }}>{call.player.pos}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{call.player.name}
                      <span className="ml-1.5 font-mono text-[10px] text-ink-600">{call.player.team}</span>
                    </p>
                    <p className="text-[11px] text-ink-500">{startReason(call)}</p>
                    {mg && <p className="mt-0.5 text-[11px] font-semibold" style={{ color: mhex ?? undefined }}>vs {mg.opponent} — {mg.label} · {mg.ptaPerGame} pts/g allowed</p>}
                  </div>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ color: vc, background: `${vc}14`, border: `1px solid ${vc}44` }}>{call.verdict}</span>
                  <span className="w-10 shrink-0 text-right font-mono text-sm text-white">{call.player.proj}</span>
                </div>
                {/* Opponent input — one per team, shared across all players on that team */}
                <div className="flex items-center gap-1.5 border-t px-5 py-1.5" style={{ borderColor: `${BRAND_COLORS.steelGray}44`, background: "rgba(255,255,255,0.02)" }}>
                  <span className="text-[9px] uppercase tracking-wider text-ink-600">vs</span>
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="OPP"
                    value={opponents.get(call.player.team) ?? ""}
                    onChange={(e) => setOpponent(call.player.team, e.target.value)}
                    className="w-12 rounded border bg-transparent px-1.5 py-0.5 font-mono text-[10px] uppercase text-white placeholder:text-ink-700 focus:outline-none"
                    style={{ borderColor: BRAND_COLORS.steelGray }}
                    aria-label={`Opponent for ${call.player.team}`}
                  />
                  <span className="text-[9px] text-ink-700">Enter 3-letter opponent code</span>
                </div>
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
            {[...fullRoster].sort((a, b) => b.proj - a.proj).map((pl) => {
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
    </div>
  );
}
