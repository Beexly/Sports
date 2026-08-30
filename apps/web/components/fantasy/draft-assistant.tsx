"use client";

/**
 * DraftAssistant — an interactive, glass-box draft board.
 *
 * Mark players as drafted-by-you or off-the-board; the engine recommends your
 * next pick with the reasons (need, tier cliff, value, bye risk), tracks your
 * roster vs. starter requirements, flags bye stacking, surfaces positional
 * scarcity + live run alerts from the pick order, and overlays the market ADP
 * column — real FFC ADP rides on live pool rows by default (cleared feed,
 * attribution required), and a user CSV import overrides it. We never scrape
 * ADP from sources that prohibit it.
 */

import { useMemo, useRef, useState } from "react";
import { PLAYERS, POSITIONS, POS_HEX, vor, tier, playerById, type Pos, type Player } from "@/lib/fantasy/players";
import {
  recommend, rosterNeeds, STARTERS,
  positionalScarcity, detectRuns, parseAdpCsv, valueVsAdp, marketAdpMap, valueVsMarket,
  type AdpLabel, type ScarcityLevel,
} from "@/lib/fantasy/draft";
import { LivePoolEmpty } from "@/components/fantasy/live-pool-empty";
import { FantasyUpsell } from "@/components/fantasy/fantasy-upsell";
import { FREE_BOARD_DEPTH } from "@/lib/fantasy/free-trial";

type Filter = Pos | "ALL";

// Semantic tones (design tokens): scarcity is a caution/alert ladder, ADP value
// is a data read (cyan/ultraviolet), reach is a warning. Never plasma for a
// negative state.
const LEVEL_DOT: Record<ScarcityLevel, string> = { critical: "var(--alert)", tight: "var(--caution)", ok: "var(--mineral-hi)" };
const ADP_TONE: Record<AdpLabel, string> = { steal: "var(--orbital-cyan)", value: "var(--ultraviolet)", "on-time": "var(--ion-1)", reach: "var(--alert)", none: "var(--ion-2)" };

/**
 * Free trial: show the top of the board + one recommendation. The full board and the
 * full recommendation set are part of the paid Fantasy suite (a real trial, not a lock).
 * The trial is enforced SERVER-SIDE — a FREE viewer is handed only the trial subset of a
 * live pool (see `poolForViewer`); this client cap is the matching presentation.
 *
 * @param pool When provided, the (viewer-gated) graded pool resolved server-side. When
 * omitted, the tool runs on the illustrative default. VOR/tier baselines are computed
 * against this universe.
 * @param canUseFantasyFull Server-provided entitlement. Defaults FALSE (fail-closed): a
 * caller that forgets it gets the capped trial board, never the full paid suite.
 */
export function DraftAssistant({ pool, canUseFantasyFull = false }: { pool?: readonly Player[]; canUseFantasyFull?: boolean } = {}) {
  const universe = useMemo(() => pool ?? PLAYERS, [pool]);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState<string[]>([]); // every id removed, in pick order
  const [filter, setFilter] = useState<Filter>("ALL");
  const [adp, setAdp] = useState<Map<string, number>>(new Map());
  const [adpName, setAdpName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const myPlayers = useMemo(() => [...mine].map((id) => playerById(id, universe)!).filter(Boolean), [mine, universe]);
  const available = useMemo(() => universe.filter((p) => !mine.has(p.id) && !gone.has(p.id)), [mine, gone, universe]);
  // The default market column: real FFC ADP riding on live pool rows. A user CSV
  // import (adp) always overrides it.
  const marketAdp = useMemo(() => marketAdpMap(universe), [universe]);
  const activeAdp = adp.size > 0 ? adp : marketAdp;
  const recs = useMemo(() => recommend(available, myPlayers, canUseFantasyFull ? 4 : 1, universe), [available, myPlayers, universe, canUseFantasyFull]);
  const needs = useMemo(() => rosterNeeds(myPlayers), [myPlayers]);
  const scarcity = useMemo(() => positionalScarcity(available, universe), [available, universe]);
  const runs = useMemo(
    () => detectRuns(order.map((id) => playerById(id, universe)?.pos).filter((p): p is Pos => Boolean(p))),
    [order, universe],
  );
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
    <div className="space-y-4">
      {/* run alerts */}
      {runs.length > 0 && (
        <div className="rounded-lg border border-caution/30 bg-caution/5 p-3">
          {runs.map((r) => (
            <p key={r.pos} className="flex items-center gap-2 text-xs text-caution">
              <span aria-hidden className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-caution" /><span>{r.message}</span>
            </p>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* ── Board ── */}
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {(["ALL", ...POSITIONS] as Filter[]).map((f) => {
                const active = filter === f;
                const c = f === "ALL" ? "var(--orbital-cyan)" : POS_HEX[f];
                return (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(f)}
                    className="rounded-full px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none"
                    style={{ color: active ? "var(--obsidian)" : "var(--ion-1)", background: active ? c : "rgba(255,255,255,0.05)", border: `1px solid ${active ? c : "var(--mineral)"}` }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={reset} className="font-mono text-[11px] uppercase tracking-[0.14em] text-ion-2 hover:text-ion-white focus-visible:outline-none">Reset draft</button>
          </div>

          {/* ADP import (legal path) */}
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-mineral p-2.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ion-2">ADP overlay</span>
            <label className="cursor-pointer rounded-md bg-ultraviolet px-2.5 py-1 text-[11px] font-semibold text-obsidian hover:bg-ultraviolet-glow">
              Import CSV
              <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" onChange={onAdpFile} className="hidden" />
            </label>
            {adpName ? (
              <>
                <span className="text-[11px] text-ion-1">{adpName}</span>
                <button type="button" onClick={clearAdp} className="text-[11px] text-ion-2 hover:text-ion-white">clear</button>
              </>
            ) : marketAdp.size > 0 ? (
              <span className="text-[11px] text-ion-2">ADP via FantasyFootballCalculator.com ({marketAdp.size} players, updated daily). Import a CSV to override. <span className="font-mono text-ion-1">name,adp</span></span>
            ) : (
              <span className="text-[11px] text-ion-2">Bring your own ADP. We don&apos;t scrape it from sources that prohibit it. <span className="font-mono text-ion-1">name,adp</span></span>
            )}
          </div>

          <div className="surface-card overflow-hidden p-0">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-mineral px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ion-2">
              <span>Player</span><span className="text-right">VOR · Tier{activeAdp.size > 0 ? " · ADP" : ""}</span><span className="text-right">Action</span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {boardCapped.length === 0 ? (
                <p className="px-4 py-6 text-sm text-ion-1">No players left at this filter.</p>
              ) : boardCapped.map((pl) => {
                const c = POS_HEX[pl.pos];
                const av = activeAdp.size > 0 ? valueVsAdp(pl, activeAdp, currentPick) : null;
                const mv = adp.size === 0 ? valueVsMarket(pl) : null; // our-rank-vs-market read (live pool only)
                // Badge flag: the illustrative pool's own `injury`, or the live
                // Sleeper DISPLAY flag (`injuryDisplay`) — display-only, never a
                // scoring input on live rows.
                const injuryFlag = pl.injuryDisplay ?? pl.injury;
                return (
                  <div key={pl.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-mineral px-4 py-2.5 last:border-b-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold" style={{ color: c, background: `${c}18` }}>{pl.pos}</span>
                        <span className="truncate text-sm font-semibold text-ion-white">{pl.name}</span>
                        {injuryFlag !== "healthy" && (
                          <span title={injuryFlag} className="rounded bg-alert/15 px-1 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-alert">
                            {injuryFlag === "questionable" ? "Q" : "OUT"}
                          </span>
                        )}
                        {av && av.label !== "none" && av.label !== "on-time" && (
                          <span className="rounded px-1 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider" style={{ color: ADP_TONE[av.label], background: `color-mix(in srgb, ${ADP_TONE[av.label]} 11%, transparent)` }}>{av.label}</span>
                        )}
                        {mv && mv.label !== "none" && mv.label !== "on-time" && (
                          <span title={`Our rank vs market ADP: ${mv.delta! >= 0 ? "+" : ""}${mv.delta}`} className="rounded px-1 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider" style={{ color: ADP_TONE[mv.label], background: `color-mix(in srgb, ${ADP_TONE[mv.label]} 11%, transparent)` }}>mkt {mv.label}</span>
                        )}
                      </div>
                      {/* bye <= 0 = no bye joined (live rows without an FFC match): show nothing, there is no Week 0 */}
                      <p className="mt-0.5 font-mono text-[11px] text-ion-2">{pl.team}{pl.bye > 0 ? ` · Bye ${pl.bye}` : ""} · {pl.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm tabular-nums" style={{ color: c }}>{vor(pl, universe) >= 0 ? "+" : ""}{vor(pl, universe)}</p>
                      <p className="font-mono text-[11px] tabular-nums text-ion-2">T{tier(pl, universe)}{av?.adp != null ? ` · ${av.adp}` : ""}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button type="button" onClick={() => draftMine(pl.id)} className="rounded-md bg-orbital-cyan px-2.5 py-1 text-[11px] font-semibold text-obsidian">Draft</button>
                      <button type="button" onClick={() => markGone(pl.id)} className="rounded-md border border-mineral px-2 py-1 text-[11px] text-ion-1 hover:text-ion-white">Gone</button>
                    </div>
                  </div>
                );
              })}
              {!canUseFantasyFull && board.length > FREE_BOARD_DEPTH && (
                <p className="border-t border-mineral px-4 py-3 text-center text-xs text-ion-2">
                  Top {FREE_BOARD_DEPTH} shown. The full board is in the Fantasy suite.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Brain: recommendation + scarcity + my roster ── */}
        <div className="space-y-4">
          {!canUseFantasyFull && <FantasyUpsell />}
          {/* recommendation */}
          <div className="surface-card relative overflow-hidden p-5" aria-live="polite">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-orbital-cyan/10 blur-3xl" />
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-orbital-cyan">On the clock · recommended · pick {currentPick}</p>
            {recs.length === 0 ? (
              <p className="mt-3 text-sm text-ion-1">Draft board is empty.</p>
            ) : (
              <>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-display text-lg text-ion-white">{recs[0]!.player.name}</p>
                    <p className="font-mono text-[11px] text-ion-2">{recs[0]!.player.pos} · {recs[0]!.player.team}{recs[0]!.player.bye > 0 ? ` · Bye ${recs[0]!.player.bye}` : ""}</p>
                  </div>
                  <button type="button" onClick={() => draftMine(recs[0]!.player.id)} className="btn btn-primary">Draft</button>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {recs[0]!.reasons.map((r, i) => (
                    <li key={i} className="flex gap-2 text-xs leading-relaxed text-ion-1">
                      <span aria-hidden className="text-orbital-cyan">↳</span><span>{r}</span>
                    </li>
                  ))}
                </ul>
                {recs.length > 1 && (
                  <div className="mt-4 border-t border-mineral pt-3">
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ion-2">Alternatives</p>
                    {recs.slice(1).map((r) => (
                      <button key={r.player.id} type="button" onClick={() => draftMine(r.player.id)} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate/60">
                        <span className="text-sm text-ion-white">{r.player.name} <span className="font-mono text-[10px] text-ion-2">{r.player.pos}</span></span>
                        <span className="font-mono text-[11px] tabular-nums" style={{ color: POS_HEX[r.player.pos] }}>+{vor(r.player, universe)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* positional scarcity */}
          <div className="surface-card p-5">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ion-2">Positional scarcity</p>
            <div className="space-y-2">
              {scarcity.map((s) => (
                <div key={s.pos} className="flex items-center gap-3">
                  <span className="w-8 shrink-0 font-mono text-xs font-bold" style={{ color: POS_HEX[s.pos] }}>{s.pos}</span>
                  <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: LEVEL_DOT[s.level] }} title={s.level} />
                  <span className="flex-1 text-xs text-ion-1">
                    {s.topTierLeft} in T{s.topTier} · {s.startersLeft} startable left
                  </span>
                  {s.level === "critical" && <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-alert">cliff</span>}
                  {s.level === "tight" && <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-caution">tight</span>}
                </div>
              ))}
            </div>
          </div>

          {/* my roster + needs */}
          <div className="surface-card p-5">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ion-2">Your roster · {myPlayers.length} picks</p>
            <div className="space-y-2">
              {POSITIONS.map((pos) => {
                const got = myPlayers.filter((p) => p.pos === pos);
                const need = needs.find((n) => n.pos === pos)!;
                const c = POS_HEX[pos];
                return (
                  <div key={pos} className="flex items-start gap-3">
                    <span className="mt-0.5 w-8 shrink-0 font-mono text-xs font-bold" style={{ color: c }}>{pos}</span>
                    <span className="w-12 shrink-0 font-mono text-[11px] tabular-nums text-ion-2">{got.length}/{STARTERS[pos]}{need.need > 0 ? " ·need" : ""}</span>
                    <span className="flex-1 text-xs text-ion-1">
                      {got.length ? got.map((p) => p.name).join(", ") : <span className="text-ion-3">—</span>}
                    </span>
                  </div>
                );
              })}
            </div>
            {(() => {
              // bye <= 0 rows carry no bye info (unjoined live rows) — they can
              // never form a real Week stack.
              const byeCounts = myPlayers.filter((p) => p.bye > 0).reduce<Record<number, number>>((m, p) => { m[p.bye] = (m[p.bye] ?? 0) + 1; return m; }, {});
              const stacked = Object.entries(byeCounts).filter(([, n]) => n >= 3);
              if (!stacked.length) return null;
              return (
                <p className="mt-3 border-t border-mineral pt-3 text-xs text-alert">
                  Bye stack: {stacked.map(([wk, n]) => `${n} on Week ${wk}`).join(" · ")}
                </p>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
