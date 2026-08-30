"use client";

/**
 * BestBallBoard — an interactive, glass-box best-ball draft board.
 *
 * Best ball is draft-only (no in-season moves), so the "brain" optimizes for what
 * actually wins: weekly ceiling/spike, QB↔catcher stack correlation, and bye/
 * positional structure. Mark players drafted-by-you or off-the-board; the engine
 * recommends your next pick with reasons and grades your roster on those axes.
 * The market ADP column defaults to real FFC ADP riding on live pool rows
 * (cleared feed, attribution required); a user CSV import overrides it. We never
 * scrape ADP from sources that prohibit it. Reads the active pool, so it runs on
 * the cleared live graded pool the moment projections are flipped on.
 */

import { useMemo, useRef, useState } from "react";
import { PLAYERS, POSITIONS, POS_HEX, vor, tier, playerById, type Pos, type Player } from "@/lib/fantasy/players";
import { parseAdpCsv, valueVsAdp, marketAdpMap, valueVsMarket, type AdpLabel } from "@/lib/fantasy/draft";
import { rosterNeedsNext, evaluateBestBallRoster, type StructureStatus } from "@/lib/fantasy/bestball";
import { LivePoolEmpty } from "@/components/fantasy/live-pool-empty";
import { FantasyUpsell } from "@/components/fantasy/fantasy-upsell";
import { FREE_BOARD_DEPTH } from "@/lib/fantasy/free-trial";

type Filter = Pos | "ALL";

// Semantic tones (design tokens): ADP value is a data read (cyan/ultraviolet),
// reach is a warning, and structure shortfall is an alert. Never plasma for a
// negative state.
const ADP_TONE: Record<AdpLabel, string> = { steal: "var(--orbital-cyan)", value: "var(--ultraviolet)", "on-time": "var(--ion-1)", reach: "var(--alert)", none: "var(--ion-2)" };
const STATUS_DOT: Record<StructureStatus, string> = { short: "var(--alert)", "on-target": "var(--verify)", heavy: "var(--caution)" };

/**
 * Free trial: show the top of the board + one recommendation. The full board and the
 * full recommendation set are part of the paid Fantasy suite (a real trial, not a lock).
 * The trial is enforced SERVER-SIDE — a FREE viewer is handed only the trial subset of a
 * live pool (see `poolForViewer`); this client cap is the matching presentation.
 *
 * @param pool When provided, the (viewer-gated) graded pool resolved server-side. When
 * omitted, the tool runs on the illustrative default (the demo, unchanged).
 * @param canUseFantasyFull Server-provided entitlement. Defaults FALSE (fail-closed): a
 * caller that forgets it gets the capped trial board, never the full paid suite.
 */
export function BestBallBoard({ pool, canUseFantasyFull = false }: { pool?: readonly Player[]; canUseFantasyFull?: boolean } = {}) {
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
  // The default market column: real FFC ADP riding on live pool rows. A user CSV
  // import (adp) always overrides it.
  const marketAdp = useMemo(() => marketAdpMap(universe), [universe]);
  const activeAdp = adp.size > 0 ? adp : marketAdp;
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

      {/* ── Best-ball brain ── */}
      <div className="space-y-4">
        {!canUseFantasyFull && <FantasyUpsell />}
        {/* next pick */}
        <div className="surface-card relative overflow-hidden p-5" aria-live="polite">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-orbital-cyan/10 blur-3xl" />
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-orbital-cyan">What this roster needs next · pick {currentPick}</p>
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

        {/* roster strength */}
        <div className="surface-card p-5">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ion-2">Roster strength · {evalr.rosterSize} picks</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Spike upside is a positive metric — plasma is the celebration accent here, never a warning. */}
            {([["Ceiling", evalr.ceiling, "text-orbital-cyan"], ["Spike upside", evalr.spike, "text-plasma"], ["Projection", evalr.projection, "text-ion-1"], ["Stack score", evalr.stackScore, "text-ultraviolet"]] as const).map(([label, val, tone]) => (
              <div key={label}>
                <p className={`font-mono text-lg tabular-nums ${tone}`}>{val}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-ion-2">{label}</p>
              </div>
            ))}
          </div>
          {evalr.stacks.length > 0 && (
            <div className="mt-3 border-t border-mineral pt-3">
              <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ion-2">Stacks</p>
              {evalr.stacks.map((s) => (
                <p key={s.qb.id} className="text-xs text-ion-1">
                  <span style={{ color: POS_HEX.QB }}>{s.qb.name}</span> + {s.catchers.map((c) => c.name).join(", ")}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* structure vs targets */}
        <div className="surface-card p-5">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ion-2">Roster construction</p>
          <div className="space-y-2">
            {evalr.structure.map((s) => (
              <div key={s.pos} className="flex items-center gap-3">
                <span className="w-8 shrink-0 font-mono text-xs font-bold" style={{ color: POS_HEX[s.pos] }}>{s.pos}</span>
                <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_DOT[s.status] }} title={s.status} />
                <span className="w-14 shrink-0 font-mono text-[11px] tabular-nums text-ion-2">{s.have}/{s.target}</span>
                <span className={`flex-1 text-[11px] ${s.status === "short" ? "text-alert" : "text-ion-1"}`}>
                  {s.status === "short" ? "still short of target" : s.status === "heavy" ? "over target: depth" : "at target"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* bye fragility */}
        {evalr.byeRisks.length > 0 && (
          <div className="surface-card p-5">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-alert">Bye fragility</p>
            <p className="mb-2 text-[11px] text-ion-2">Best ball has no waivers. These weeks you can&apos;t field a full lineup at a position:</p>
            <ul className="space-y-1">
              {evalr.byeRisks.map((r) => (
                <li key={`${r.week}-${r.pos}`} className="text-xs text-ion-1">
                  Week {r.week}: {r.onBye} {r.pos} on bye. Only {r.available} left, need {r.starters}.
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
