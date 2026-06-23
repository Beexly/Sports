"use client";

/**
 * BestBallBoard — an interactive, glass-box best-ball draft board.
 *
 * Best ball is draft-only (no in-season moves), so the "brain" optimizes for what
 * actually wins: weekly ceiling/spike, QB↔catcher stack correlation, and bye/
 * positional structure. Mark players drafted-by-you or off-the-board; the engine
 * recommends your next pick with reasons and grades your roster on those axes.
 * Overlay your own ADP CSV (the legal path — never scraped). Reads the active pool,
 * so it runs on the cleared live graded pool the moment projections are flipped on.
 */

import { useMemo, useRef, useState } from "react";
import { PLAYERS, POSITIONS, POS_HEX, vor, tier, playerById, type Pos, type Player } from "@/lib/fantasy/players";
import { parseAdpCsv, valueVsAdp, type AdpLabel } from "@/lib/fantasy/draft";
import { rosterNeedsNext, evaluateBestBallRoster, type StructureStatus } from "@/lib/fantasy/bestball";
import { BRAND_COLORS } from "@/lib/brand";
import { LivePoolEmpty } from "@/components/fantasy/live-pool-empty";
import { FantasyUpsell } from "@/components/fantasy/fantasy-upsell";

type Filter = Pos | "ALL";

const ADP_HEX: Record<AdpLabel, string> = { steal: BRAND_COLORS.orbitalCyan, value: BRAND_COLORS.softUltraviolet, "on-time": "#9fb3c8", reach: BRAND_COLORS.ionMagenta, none: "#6b7785" };
const STATUS_HEX: Record<StructureStatus, string> = { short: BRAND_COLORS.ionMagenta, "on-target": BRAND_COLORS.orbitalCyan, heavy: "#E0A800" };

// Free trial: show the top of the board + one recommendation. The full board and the
// full recommendation set are part of the paid Fantasy suite (a real trial, not a lock).
const FREE_BOARD_DEPTH = 12;

/**
 * @param pool When provided, the LIVE graded pool resolved server-side. When
 * omitted, the tool runs on the illustrative default (the demo, unchanged).
 */
export function BestBallBoard({ pool, canUseFantasyFull = true }: { pool?: readonly Player[]; canUseFantasyFull?: boolean } = {}) {
  const universe = useMemo(() => pool ?? PLAYERS, [pool]);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [adp, setAdp] = useState<Map<string, number>>(new Map());
  const [adpName, setAdpName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const myPlayers = useMemo(() => [...mine].map((id) => playerById(id, universe)!).filter(Boolean), [mine, universe]);
  const available = useMemo(() => universe.filter((p) => !mine.has(p.id) && !gone.has(p.id)), [mine, gone, universe]);
  const recs = useMemo(() => rosterNeedsNext(available, myPlayers, canUseFantasyFull ? 4 : 1, universe), [available, myPlayers, universe, canUseFantasyFull]);
  const evalr = useMemo(() => evaluateBestBallRoster(myPlayers), [myPlayers]);
  const currentPick = order.length + 1;

  const board = useMemo(
    () => available.filter((p) => filter === "ALL" || p.pos === filter).sort((a, b) => vor(b, universe) - vor(a, universe)),
    [available, filter, universe],
  );
  const boardCapped = useMemo(
    () => (canUseFantasyFull ? board : board.slice(0, FREE_BOARD_DEPTH)),
    [board, canUseFantasyFull],
  );

  const draftMine = (id: string) => { setMine((s) => new Set(s).add(id)); setOrder((o) => [...o, id]); };
  const markGone = (id: string) => { setGone((s) => new Set(s).add(id)); setOrder((o) => [...o, id]); };
  const reset = () => { setMine(new Set()); setGone(new Set()); setOrder([]); };

  const onAdpFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = parseAdpCsv(await file.text());
      setAdp(parsed);
      setAdpName(`${file.name} · ${parsed.size} players`);
    } catch {
      setAdpName("Could not read that file");
    }
  };
  const clearAdp = () => { setAdp(new Map()); setAdpName(null); if (fileRef.current) fileRef.current.value = ""; };

  // Live but the graded pool is empty/unavailable — honest empty state.
  if (pool != null && pool.length === 0) return <LivePoolEmpty />;

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
                  aria-pressed={active}
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

        {/* ADP import (legal path) */}
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border p-2.5" style={{ borderColor: BRAND_COLORS.steelGray }}>
          <span className="text-[10px] uppercase tracking-wider text-ink-500">ADP overlay</span>
          <label className="cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-semibold" style={{ color: BRAND_COLORS.obsidianBlack, background: BRAND_COLORS.softUltraviolet }}>
            Import CSV
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" onChange={onAdpFile} className="hidden" />
          </label>
          {adpName ? (
            <>
              <span className="text-[11px] text-ink-300">{adpName}</span>
              <button type="button" onClick={clearAdp} className="text-[11px] text-ink-500 hover:text-white">clear</button>
            </>
          ) : (
            <span className="text-[10px] text-ink-600">Bring your own ADP — we don&apos;t scrape it from the books that publish it. <span className="text-ink-500">name,adp</span></span>
          )}
        </div>

        <div className="surface-card overflow-hidden p-0">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-ink-500" style={{ borderColor: BRAND_COLORS.steelGray }}>
            <span>Player</span><span className="text-right">VOR · Tier{adp.size > 0 ? " · ADP" : ""}</span><span className="text-right">Action</span>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {boardCapped.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-400">No players left at this filter.</p>
            ) : boardCapped.map((pl) => {
              const c = POS_HEX[pl.pos];
              const av = adp.size > 0 ? valueVsAdp(pl, adp, currentPick) : null;
              return (
                <div key={pl.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b px-4 py-2.5 last:border-b-0" style={{ borderColor: BRAND_COLORS.steelGray }}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold" style={{ color: c, background: `${c}18` }}>{pl.pos}</span>
                      <span className="truncate text-sm font-semibold text-white">{pl.name}</span>
                      {pl.injury !== "healthy" && <span title={pl.injury} style={{ color: BRAND_COLORS.ionMagenta }}>⚠</span>}
                      {av && av.label !== "none" && av.label !== "on-time" && (
                        <span className="rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ color: ADP_HEX[av.label], background: `${ADP_HEX[av.label]}1c` }}>{av.label}</span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-ink-500">{pl.team} · Bye {pl.bye} · {pl.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm" style={{ color: c }}>{vor(pl, universe) >= 0 ? "+" : ""}{vor(pl, universe)}</p>
                    <p className="font-mono text-[10px] text-ink-500">T{tier(pl, universe)}{av?.adp != null ? ` · ${av.adp}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button type="button" onClick={() => draftMine(pl.id)} className="rounded-md px-2.5 py-1 text-[11px] font-semibold" style={{ color: BRAND_COLORS.obsidianBlack, background: BRAND_COLORS.orbitalCyan }}>Draft</button>
                    <button type="button" onClick={() => markGone(pl.id)} className="rounded-md px-2 py-1 text-[11px] text-ink-400 hover:text-white" style={{ border: `1px solid ${BRAND_COLORS.steelGray}` }}>Gone</button>
                  </div>
                </div>
              );
            })}
            {!canUseFantasyFull && board.length > FREE_BOARD_DEPTH && (
              <p className="border-t px-4 py-3 text-center text-xs text-ink-400" style={{ borderColor: BRAND_COLORS.steelGray }}>
                Top {FREE_BOARD_DEPTH} of {board.length} shown — the full board is in the Fantasy suite.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Best-ball brain ── */}
      <div className="space-y-4">
        {!canUseFantasyFull && <FantasyUpsell />}
        {/* next pick */}
        <div className="surface-card relative overflow-hidden p-5" aria-live="polite">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full blur-3xl" style={{ background: `${BRAND_COLORS.orbitalCyan}1f` }} />
          <p className="text-xs uppercase tracking-[0.16em]" style={{ color: BRAND_COLORS.orbitalCyan }}>What this roster needs next · pick {currentPick}</p>
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
                      <span className="font-mono text-[11px]" style={{ color: POS_HEX[r.player.pos] }}>+{vor(r.player, universe)}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* roster strength */}
        <div className="surface-card p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-ink-500">Roster strength · {evalr.rosterSize} picks</p>
          <div className="grid grid-cols-2 gap-3">
            {([["Ceiling", evalr.ceiling, BRAND_COLORS.orbitalCyan], ["Spike upside", evalr.spike, BRAND_COLORS.ionMagenta], ["Projection", evalr.projection, "#9fb3c8"], ["Stack score", evalr.stackScore, BRAND_COLORS.softUltraviolet]] as const).map(([label, val, c]) => (
              <div key={label}>
                <p className="font-mono text-lg" style={{ color: c }}>{val}</p>
                <p className="text-[10px] uppercase tracking-wider text-ink-500">{label}</p>
              </div>
            ))}
          </div>
          {evalr.stacks.length > 0 && (
            <div className="mt-3 border-t pt-3" style={{ borderColor: BRAND_COLORS.steelGray }}>
              <p className="mb-1.5 text-[10px] uppercase tracking-wider text-ink-500">Stacks</p>
              {evalr.stacks.map((s) => (
                <p key={s.qb.id} className="text-xs text-ink-300">
                  <span style={{ color: POS_HEX.QB }}>{s.qb.name}</span> + {s.catchers.map((c) => c.name).join(", ")}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* structure vs targets */}
        <div className="surface-card p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-ink-500">Roster construction</p>
          <div className="space-y-2">
            {evalr.structure.map((s) => (
              <div key={s.pos} className="flex items-center gap-3">
                <span className="w-8 shrink-0 font-mono text-xs font-bold" style={{ color: POS_HEX[s.pos] }}>{s.pos}</span>
                <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_HEX[s.status] }} title={s.status} />
                <span className="w-14 shrink-0 font-mono text-[11px] text-ink-500">{s.have}/{s.target}</span>
                <span className="flex-1 text-[11px]" style={{ color: s.status === "short" ? BRAND_COLORS.ionMagenta : "var(--ink-400,#8a96a3)" }}>
                  {s.status === "short" ? "still short of target" : s.status === "heavy" ? "over target — depth" : "at target"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* bye fragility */}
        {evalr.byeRisks.length > 0 && (
          <div className="surface-card p-5">
            <p className="mb-2 text-xs uppercase tracking-[0.16em]" style={{ color: BRAND_COLORS.ionMagenta }}>Bye fragility</p>
            <p className="mb-2 text-[11px] text-ink-500">Best ball has no waivers — these weeks you can&apos;t field a full lineup at a position:</p>
            <ul className="space-y-1">
              {evalr.byeRisks.map((r) => (
                <li key={`${r.week}-${r.pos}`} className="text-xs text-ink-300">
                  Week {r.week}: {r.onBye} {r.pos} on bye — only {r.available} left, need {r.starters}.
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
