"use client";

/**
 * DraftAssistant — an interactive, glass-box draft board.
 *
 * Mark players as drafted-by-you or off-the-board; the engine recommends your
 * next pick with the reasons (need, tier cliff, value, bye risk), tracks your
 * roster against starter requirements, and flags bye stacking. Illustrative pool.
 */

import { useMemo, useState } from "react";
import { PLAYERS, POSITIONS, POS_HEX, vor, tier, playerById, type Pos } from "@/lib/fantasy/players";
import { recommend, rosterNeeds, STARTERS } from "@/lib/fantasy/draft";
import { BRAND_COLORS } from "@/lib/brand";

type Filter = Pos | "ALL";

export function DraftAssistant() {
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("ALL");

  const myPlayers = useMemo(() => [...mine].map((id) => playerById(id)!).filter(Boolean), [mine]);
  const available = useMemo(() => PLAYERS.filter((p) => !mine.has(p.id) && !gone.has(p.id)), [mine, gone]);
  const recs = useMemo(() => recommend(available, myPlayers, 4), [available, myPlayers]);
  const needs = useMemo(() => rosterNeeds(myPlayers), [myPlayers]);

  const board = useMemo(
    () => available.filter((p) => filter === "ALL" || p.pos === filter).sort((a, b) => vor(b) - vor(a)),
    [available, filter],
  );

  const draftMine = (id: string) => setMine((s) => new Set(s).add(id));
  const markGone = (id: string) => setGone((s) => new Set(s).add(id));
  const reset = () => { setMine(new Set()); setGone(new Set()); };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* ── Board ── */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {(["ALL", ...POSITIONS] as Filter[]).map((f) => {
              const active = filter === f;
              const c = f === "ALL" ? BRAND_COLORS.orbitalCyan : POS_HEX[f];
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none"
                  style={{ color: active ? BRAND_COLORS.obsidianBlack : "var(--ion-2,#c8d2dd)", background: active ? c : "rgba(255,255,255,0.05)", border: `1px solid ${active ? c : BRAND_COLORS.steelGray}` }}
                >
                  {f}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={reset} className="text-[11px] uppercase tracking-wider text-ink-400 hover:text-white focus-visible:outline-none">Reset draft</button>
        </div>

        <div className="surface-card overflow-hidden p-0">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-ink-500" style={{ borderColor: BRAND_COLORS.steelGray }}>
            <span>Player</span><span className="text-right">VOR · Tier</span><span className="text-right">Action</span>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {board.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-400">No players left at this filter.</p>
            ) : board.map((pl) => {
              const c = POS_HEX[pl.pos];
              return (
                <div key={pl.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b px-4 py-2.5 last:border-b-0" style={{ borderColor: BRAND_COLORS.steelGray }}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold" style={{ color: c, background: `${c}18` }}>{pl.pos}</span>
                      <span className="truncate text-sm font-semibold text-white">{pl.name}</span>
                      {pl.injury !== "healthy" && <span title={pl.injury} style={{ color: BRAND_COLORS.ionMagenta }}>⚠</span>}
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-ink-500">{pl.team} · Bye {pl.bye} · {pl.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm" style={{ color: c }}>{vor(pl) >= 0 ? "+" : ""}{vor(pl)}</p>
                    <p className="font-mono text-[10px] text-ink-500">T{tier(pl)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button type="button" onClick={() => draftMine(pl.id)} className="rounded-md px-2.5 py-1 text-[11px] font-semibold" style={{ color: BRAND_COLORS.obsidianBlack, background: BRAND_COLORS.orbitalCyan }}>Draft</button>
                    <button type="button" onClick={() => markGone(pl.id)} className="rounded-md px-2 py-1 text-[11px] text-ink-400 hover:text-white" style={{ border: `1px solid ${BRAND_COLORS.steelGray}` }}>Gone</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Brain: recommendation + my roster ── */}
      <div className="space-y-4">
        {/* recommendation */}
        <div className="surface-card relative overflow-hidden p-5">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full blur-3xl" style={{ background: `${BRAND_COLORS.orbitalCyan}1f` }} />
          <p className="text-xs uppercase tracking-[0.16em]" style={{ color: BRAND_COLORS.orbitalCyan }}>On the clock — recommended</p>
          {recs.length === 0 ? (
            <p className="mt-3 text-sm text-ink-400">Draft board is empty.</p>
          ) : (
            <>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div>
                  <p className="font-display text-lg text-white">{recs[0]!.player.name}</p>
                  <p className="font-mono text-[11px] text-ink-500">{recs[0]!.player.pos} · {recs[0]!.player.team} · Bye {recs[0]!.player.bye}</p>
                </div>
                <button type="button" onClick={() => draftMine(recs[0]!.player.id)} className="btn btn-primary">Draft</button>
              </div>
              <ul className="mt-3 space-y-1.5">
                {recs[0]!.reasons.map((r, i) => (
                  <li key={i} className="flex gap-2 text-xs leading-relaxed text-ink-300">
                    <span aria-hidden style={{ color: BRAND_COLORS.orbitalCyan }}>↳</span><span>{r}</span>
                  </li>
                ))}
              </ul>
              {recs.length > 1 && (
                <div className="mt-4 border-t pt-3" style={{ borderColor: BRAND_COLORS.steelGray }}>
                  <p className="mb-2 text-[10px] uppercase tracking-wider text-ink-500">Alternatives</p>
                  {recs.slice(1).map((r) => (
                    <button key={r.player.id} type="button" onClick={() => draftMine(r.player.id)} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/5">
                      <span className="text-sm text-white">{r.player.name} <span className="font-mono text-[10px] text-ink-500">{r.player.pos}</span></span>
                      <span className="font-mono text-[11px]" style={{ color: POS_HEX[r.player.pos] }}>+{vor(r.player)}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* my roster + needs */}
        <div className="surface-card p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-ink-500">Your roster · {myPlayers.length} picks</p>
          <div className="space-y-2">
            {POSITIONS.map((pos) => {
              const got = myPlayers.filter((p) => p.pos === pos);
              const need = needs.find((n) => n.pos === pos)!;
              const c = POS_HEX[pos];
              return (
                <div key={pos} className="flex items-start gap-3">
                  <span className="mt-0.5 w-8 shrink-0 font-mono text-xs font-bold" style={{ color: c }}>{pos}</span>
                  <span className="w-12 shrink-0 font-mono text-[11px] text-ink-500">{got.length}/{STARTERS[pos]}{need.need > 0 ? " ·need" : ""}</span>
                  <span className="flex-1 text-xs text-ink-300">
                    {got.length ? got.map((p) => p.name).join(", ") : <span className="text-ink-600">—</span>}
                  </span>
                </div>
              );
            })}
          </div>
          {(() => {
            const byeCounts = myPlayers.reduce<Record<number, number>>((m, p) => { m[p.bye] = (m[p.bye] ?? 0) + 1; return m; }, {});
            const stacked = Object.entries(byeCounts).filter(([, n]) => n >= 3);
            if (!stacked.length) return null;
            return (
              <p className="mt-3 border-t pt-3 text-xs" style={{ borderColor: BRAND_COLORS.steelGray, color: BRAND_COLORS.ionMagenta }}>
                ⚠ Bye stack: {stacked.map(([wk, n]) => `${n} on Week ${wk}`).join(" · ")}
              </p>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
