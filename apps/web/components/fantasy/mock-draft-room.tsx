"use client";

/**
 * MockDraftRoom — practice snake drafts against AI opponents.
 *
 * Setup → Draft (your turn / AI auto-advances) → Results with grade.
 * Works on any injected pool: illustrative demo or live nflverse feed.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PLAYERS, POSITIONS, POS_HEX, vor, tier, playerById, type Player, type Pos } from "@/lib/fantasy/players";
import {
  initMockDraft, advanceAI, userPick, gradeDraft, isUserPick,
  DEFAULT_CONFIG,
  type MockDraftConfig, type MockDraftState,
} from "@/lib/fantasy/mock-draft";
import { BRAND_COLORS } from "@/lib/brand";
import { LivePoolEmpty } from "@/components/fantasy/live-pool-empty";

interface Props {
  pool?: readonly Player[];
}

type Phase = "setup" | "draft" | "results";
type Filter = Pos | "ALL";

const GRADE_COLOR: Record<string, string> = {
  "A+": BRAND_COLORS.orbitalCyan, A: BRAND_COLORS.orbitalCyan, "A-": BRAND_COLORS.orbitalCyan,
  "B+": BRAND_COLORS.softUltraviolet, B: BRAND_COLORS.softUltraviolet, "B-": BRAND_COLORS.softUltraviolet,
  "C+": "#E0A800", C: "#E0A800", F: BRAND_COLORS.ionMagenta,
};

export function MockDraftRoom({ pool }: Props) {
  const universe = useMemo(() => pool ?? PLAYERS, [pool]);

  const [phase, setPhase] = useState<Phase>("setup");
  const [cfg, setCfg] = useState<MockDraftConfig>(DEFAULT_CONFIG);
  const [state, setState] = useState<MockDraftState | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");

  const boardRef = useRef<HTMLDivElement>(null);

  // Start / restart
  const startDraft = useCallback((newCfg: MockDraftConfig) => {
    const init = initMockDraft(newCfg, universe);
    const ready = advanceAI(init, universe);
    setState(ready);
    setPhase("draft");
    setFilter("ALL");
    setSearch("");
  }, [universe]);

  // Scroll to top of board on each user turn
  useEffect(() => {
    if (phase === "draft") boardRef.current?.scrollTo({ top: 0 });
  }, [state?.nextOverall, phase]);

  // Finish
  useEffect(() => {
    if (state?.finished) setPhase("results");
  }, [state?.finished]);

  // Live but the graded pool is empty/unavailable — honest empty state, matching
  // DraftAssistant's guard. Without this, a live-but-empty [] pool would silently
  // fall through to `universe`'s `pool ?? PLAYERS` only for `null`/`undefined`,
  // leaving an empty draft board with no explanation instead of the same honest
  // "source unavailable" message the Draft Assistant tab already shows.
  if (pool != null && pool.length === 0) return <LivePoolEmpty />;

  // ── Setup screen ────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="space-y-6">
        <div className="surface-card p-6 space-y-5 max-w-lg">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Mock Draft Setup</p>

          <div className="space-y-1">
            <label className="text-[11px] text-ink-400">League size</label>
            <div className="flex gap-2 flex-wrap">
              {([8, 10, 12] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCfg((c) => ({ ...c, teams: n, userSlot: Math.min(c.userSlot, n) }))}
                  className="rounded-md px-4 py-2 text-sm font-semibold transition-colors"
                  style={{
                    background: cfg.teams === n ? BRAND_COLORS.softUltraviolet : "rgba(255,255,255,0.06)",
                    color: cfg.teams === n ? BRAND_COLORS.obsidianBlack : "var(--ion-3,#8b9bb4)",
                    border: `1px solid ${cfg.teams === n ? BRAND_COLORS.softUltraviolet : BRAND_COLORS.steelGray}`,
                  }}
                >
                  {n} teams
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-ink-400">Rounds</label>
            <div className="flex gap-2 flex-wrap">
              {[10, 12, 15, 16].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCfg((c) => ({ ...c, rounds: n }))}
                  className="rounded-md px-4 py-2 text-sm font-semibold transition-colors"
                  style={{
                    background: cfg.rounds === n ? BRAND_COLORS.softUltraviolet : "rgba(255,255,255,0.06)",
                    color: cfg.rounds === n ? BRAND_COLORS.obsidianBlack : "var(--ion-3,#8b9bb4)",
                    border: `1px solid ${cfg.rounds === n ? BRAND_COLORS.softUltraviolet : BRAND_COLORS.steelGray}`,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-ink-400">Your draft slot (1 = first pick)</label>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: cfg.teams }, (_, i) => i + 1).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setCfg((c) => ({ ...c, userSlot: slot }))}
                  className="h-8 w-8 rounded-full text-xs font-bold transition-colors"
                  style={{
                    background: cfg.userSlot === slot ? BRAND_COLORS.orbitalCyan : "rgba(255,255,255,0.06)",
                    color: cfg.userSlot === slot ? BRAND_COLORS.obsidianBlack : "var(--ion-3,#8b9bb4)",
                    border: `1px solid ${cfg.userSlot === slot ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.steelGray}`,
                  }}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => startDraft(cfg)}
            className="btn btn-primary w-full"
          >
            Start Mock Draft →
          </button>
        </div>

        <p className="text-xs text-ink-500 max-w-md">
          AI opponents pick from the top available by VOR with a small variance window — each mock plays differently. Your picks appear in real time; results are graded on VOR total, positional balance, and bye-week risk.
        </p>
      </div>
    );
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  if (phase === "results" && state) {
    const userIndex = cfg.userSlot - 1;
    const userIds = state.rosters.get(userIndex) ?? [];
    const userPlayers = userIds.map((id) => playerById(id, universe)).filter(Boolean) as Player[];
    const grade = gradeDraft(userIds, universe, cfg);

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="font-display text-5xl font-black"
            style={{ color: GRADE_COLOR[grade.letter] ?? BRAND_COLORS.orbitalCyan }}
          >
            {grade.letter}
          </span>
          <div>
            <p className="text-sm text-white font-semibold">Draft Grade</p>
            <p className="text-xs text-ink-400 font-mono">{grade.vorTotal} total VOR · {grade.positionalBalance}</p>
          </div>
          <button
            type="button"
            onClick={() => { setState(null); setPhase("setup"); }}
            className="ml-auto btn btn-ghost btn-sm"
          >
            New mock
          </button>
        </div>

        {state.endedEarly && (
          <div
            className="surface-card p-3 text-xs leading-relaxed text-ink-300"
            style={{ boxShadow: `inset 0 0 0 1px ${BRAND_COLORS.ionMagenta}33` }}
            role="status"
          >
            Draft ended early — the player pool ran out before all {cfg.rounds} rounds could fill
            ({state.picks.length} picks made). Grade reflects the roster actually drafted.
          </div>
        )}

        {grade.highlights.length > 0 && (
          <div className="surface-card p-4 space-y-1.5">
            {grade.highlights.map((h, i) => (
              <p key={i} className="flex gap-2 text-xs text-ink-300">
                <span style={{ color: BRAND_COLORS.orbitalCyan }}>↳</span><span>{h}</span>
              </p>
            ))}
          </div>
        )}

        <div className="surface-card overflow-hidden p-0">
          <div className="border-b px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-ink-500" style={{ borderColor: BRAND_COLORS.steelGray }}>
            Your roster · {cfg.rounds} picks
          </div>
          {userPlayers.map((p, i) => {
            const c = POS_HEX[p.pos];
            return (
              <div key={p.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b px-4 py-2.5 last:border-b-0" style={{ borderColor: `${BRAND_COLORS.steelGray}60` }}>
                <span className="font-mono text-[11px] text-ink-600">{i + 1}.</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded px-1 py-0.5 font-mono text-[9px] font-bold" style={{ color: c, background: `${c}18` }}>{p.pos}</span>
                    <span className="text-sm text-white font-semibold">{p.name}</span>
                    {p.injury !== "healthy" && <span style={{ color: BRAND_COLORS.ionMagenta }} title={p.injury}>⚠</span>}
                  </div>
                  <p className="font-mono text-[10px] text-ink-500">{p.team} · Bye {p.bye} · {p.role}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm" style={{ color: c }}>+{Math.max(0, vor(p, universe))}</p>
                  <p className="font-mono text-[10px] text-ink-500">T{tier(p, universe)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Draft screen ─────────────────────────────────────────────────────────────
  if (!state) return null;

  const userIndex = cfg.userSlot - 1;
  const myTurn = isUserPick(state.nextOverall, cfg);
  const totalPickCount = cfg.teams * cfg.rounds;
  const currentRound = Math.ceil(state.nextOverall / cfg.teams);
  const pickInRound = ((state.nextOverall - 1) % cfg.teams) + 1;

  const available = universe.filter((p) => state.available.has(p.id));
  const boardFiltered = available
    .filter((p) => (filter === "ALL" || p.pos === filter) && (!search || p.name.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => vor(b, universe) - vor(a, universe));

  const userIds = state.rosters.get(userIndex) ?? [];
  const myPicks = userIds.map((id) => playerById(id, universe)).filter(Boolean) as Player[];

  // Recent picks (last 8)
  const recentPicks = [...state.picks].reverse().slice(0, 8);

  const onPick = (id: string) => {
    if (!myTurn || !state.available.has(id)) return;
    setState((s) => s ? userPick(s, id, universe) : s);
  };

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3" style={{ borderColor: myTurn ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.steelGray, background: myTurn ? `${BRAND_COLORS.orbitalCyan}0c` : "transparent" }}>
        <div>
          <p className="text-xs font-semibold" style={{ color: myTurn ? BRAND_COLORS.orbitalCyan : "white" }}>
            {myTurn ? "Your pick!" : "AI is picking…"}
          </p>
          <p className="font-mono text-[11px] text-ink-500">Round {currentRound} · Pick {pickInRound} · Overall {state.nextOverall}/{totalPickCount}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => { setState(null); setPhase("setup"); }} className="text-[11px] text-ink-500 hover:text-white">Exit</button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Board */}
        <div className="space-y-3">
          {/* Filters + search */}
          <div className="flex flex-wrap items-center gap-2">
            {(["ALL", ...POSITIONS] as Filter[]).map((f) => {
              const active = filter === f;
              const c = f === "ALL" ? BRAND_COLORS.orbitalCyan : POS_HEX[f];
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: active ? BRAND_COLORS.obsidianBlack : "var(--ion-3,#8b9bb4)", background: active ? c : "rgba(255,255,255,0.05)", border: `1px solid ${active ? c : BRAND_COLORS.steelGray}` }}
                >
                  {f}
                </button>
              );
            })}
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ml-auto rounded-md border bg-transparent px-3 py-1 text-xs text-white placeholder:text-ink-600 focus:outline-none"
              style={{ borderColor: BRAND_COLORS.steelGray, width: "10rem" }}
            />
          </div>

          <div ref={boardRef} className="surface-card overflow-hidden p-0 max-h-[58vh] overflow-y-auto">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-ink-500 sticky top-0 bg-[var(--surface-card,#0c1018)]" style={{ borderColor: BRAND_COLORS.steelGray }}>
              <span>Player</span><span className="text-right">VOR · T</span><span className="text-right">Pick</span>
            </div>
            {boardFiltered.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-400">No players at this filter.</p>
            ) : boardFiltered.map((p) => {
              const c = POS_HEX[p.pos];
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b px-4 py-2.5 last:border-b-0 transition-colors"
                  style={{ borderColor: `${BRAND_COLORS.steelGray}55`, opacity: myTurn ? 1 : 0.7 }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded px-1 py-0.5 font-mono text-[9px] font-bold" style={{ color: c, background: `${c}18` }}>{p.pos}</span>
                      <span className="text-sm text-white">{p.name}</span>
                      {p.injury !== "healthy" && <span style={{ color: BRAND_COLORS.ionMagenta }} title={p.injury}>⚠</span>}
                    </div>
                    <p className="font-mono text-[10px] text-ink-600">{p.team} · Bye {p.bye}</p>
                  </div>
                  <div className="text-right font-mono text-sm" style={{ color: c }}>
                    +{vor(p, universe)} · T{tier(p, universe)}
                  </div>
                  <button
                    type="button"
                    onClick={() => onPick(p.id)}
                    disabled={!myTurn}
                    className="rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ background: myTurn ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.steelGray, color: myTurn ? BRAND_COLORS.obsidianBlack : "#6b7785" }}
                  >
                    Draft
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right sidebar: recent picks + my roster */}
        <div className="space-y-4">
          {/* Recent picks */}
          <div className="surface-card p-4">
            <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-ink-500">Recent picks</p>
            {recentPicks.length === 0 ? (
              <p className="text-xs text-ink-500">Draft starting…</p>
            ) : recentPicks.map((pick) => {
              const p = playerById(pick.playerId, universe);
              if (!p) return null;
              const isMe = pick.teamIndex === userIndex;
              const c = POS_HEX[p.pos];
              return (
                <div key={pick.overall} className="flex items-center gap-2 py-1">
                  <span className="font-mono text-[10px] text-ink-600 w-6 shrink-0">{pick.overall}.</span>
                  <span className="rounded px-1 py-0.5 font-mono text-[9px] font-bold shrink-0" style={{ color: c, background: `${c}18` }}>{p.pos}</span>
                  <span className="flex-1 text-xs truncate" style={{ color: isMe ? BRAND_COLORS.orbitalCyan : "var(--ion-3,#8b9bb4)", fontWeight: isMe ? 600 : 400 }}>{p.name}</span>
                  {isMe && <span className="text-[9px] font-bold uppercase" style={{ color: BRAND_COLORS.orbitalCyan }}>you</span>}
                </div>
              );
            })}
          </div>

          {/* My roster */}
          <div className="surface-card p-4">
            <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-ink-500">Your roster · {myPicks.length} picks</p>
            {myPicks.length === 0 ? (
              <p className="text-xs text-ink-500">Make your first pick.</p>
            ) : myPicks.map((p, i) => {
              const c = POS_HEX[p.pos];
              return (
                <div key={p.id} className="flex items-center gap-2 py-1">
                  <span className="font-mono text-[10px] text-ink-600 w-4 shrink-0">{i + 1}.</span>
                  <span className="rounded px-1 py-0.5 font-mono text-[9px] font-bold shrink-0" style={{ color: c, background: `${c}18` }}>{p.pos}</span>
                  <span className="flex-1 text-xs text-white truncate">{p.name}</span>
                  <span className="font-mono text-[10px]" style={{ color: c }}>+{Math.max(0, vor(p, universe))}</span>
                </div>
              );
            })}
          </div>

          {/* Pick count */}
          <div className="flex items-center gap-2">
            <div className="h-1 flex-1 rounded-full bg-white/10">
              <div
                className="h-1 rounded-full transition-all duration-300"
                style={{ width: `${((state.picks.length) / totalPickCount) * 100}%`, background: BRAND_COLORS.orbitalCyan }}
              />
            </div>
            <span className="font-mono text-[11px] text-ink-500">{state.picks.length}/{totalPickCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
