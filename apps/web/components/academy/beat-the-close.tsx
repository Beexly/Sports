"use client";

/**
 * BEAT THE CLOSE — the Academy's line-trading arcade.
 *
 * TRAINING SIMULATION: every matchup, line, and signal is synthetic —
 * fictional sector teams, generated markets, clearly labeled. The game
 * teaches one skill: reading signals and timing your entry against where
 * the market will CLOSE. Score is pure CLV — process, not luck.
 *
 * Round flow: an opening line posts → market intel arrives tick by tick,
 * each moving the live price → TAKE the current number any time, or PASS.
 * At the close, your taken number is graded against the closing line.
 * Numbers that beat the close score; chasing steam gets punished; a PASS on
 * a market that ran away from you scores as correct restraint.
 *
 * Deterministic rounds (no RNG at render), localStorage best score.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { BRAND_COLORS } from "@/lib/brand";

const BEST_KEY = "gse-beat-the-close-best-v1";
const TICK_MS = 2600;

const cyan = BRAND_COLORS.orbitalCyan;
const mag = BRAND_COLORS.ionMagenta;
const uv = BRAND_COLORS.softUltraviolet;

interface Tick {
  /** market intel headline shown to the player */
  readonly intel: string;
  /** points the live line moves when this intel lands (favorite perspective) */
  readonly move: number;
}

interface Round {
  readonly id: string;
  /** fictional sector matchup — synthetic by design */
  readonly matchup: string;
  readonly open: number;
  readonly ticks: readonly Tick[];
  /** final move applied after the last tick (the part you can't see coming) */
  readonly closeDrift: number;
}

/** Synthetic markets. Negative numbers = favorite price; moves are additive. */
const ROUNDS: readonly Round[] = [
  {
    id: "r1",
    matchup: "NOVA @ DRIFT",
    open: -3.5,
    ticks: [
      { intel: "Beat reporter: DRIFT's starting pivot limited in practice", move: -0.5 },
      { intel: "Respected money confirmed on NOVA at two shops", move: -0.5 },
      { intel: "Public split posts 71% on NOVA", move: -0.5 },
      { intel: "DRIFT pivot upgraded to probable", move: +0.5 },
    ],
    closeDrift: -0.5,
  },
  {
    id: "r2",
    matchup: "HALO @ VECTOR",
    open: -6.5,
    ticks: [
      { intel: "Steam: VECTOR -6.5 → -7.5 across the market in minutes", move: -1.0 },
      { intel: "Two more books follow to -7.5", move: 0 },
      { intel: "Buyback: sharp money takes the +7.5 hook", move: +0.5 },
      { intel: "Weather system trending over the dome — no factor", move: 0 },
    ],
    closeDrift: +0.5,
  },
  {
    id: "r3",
    matchup: "ONYX @ PULSE",
    open: -2.5,
    ticks: [
      { intel: "Quiet board — limits still low", move: 0 },
      { intel: "ONYX road fade chatter on the feeds (narrative only)", move: 0 },
      { intel: "Limits rise; first real money lands on PULSE", move: -0.5 },
      { intel: "Market crosses the key number to -3", move: -0.5 },
    ],
    closeDrift: -0.5,
  },
  {
    id: "r4",
    matchup: "CINDER @ APEX",
    open: -9.5,
    ticks: [
      { intel: "APEX rotation rumors — nothing confirmed", move: +0.5 },
      { intel: "Rumors denied by the room; line snaps back", move: -0.5 },
      { intel: "Public piles on APEX at 78%", move: -0.5 },
      { intel: "Sharp buyback on CINDER +10.5 at full limits", move: +1.0 },
    ],
    closeDrift: +0.5,
  },
  {
    id: "r5",
    matchup: "QUASAR @ RIDGE",
    open: -4.5,
    ticks: [
      { intel: "RIDGE's edge protector questionable on the report", move: -0.5 },
      { intel: "Market shrugs — limits doubled, number holds", move: 0 },
      { intel: "Respected origination on QUASAR confirmed", move: -0.5 },
      { intel: "Late public wave on QUASAR", move: -0.5 },
    ],
    closeDrift: -0.5,
  },
  {
    id: "r6",
    matchup: "EMBER @ SOL",
    open: -1.5,
    ticks: [
      { intel: "Coin-flip board, both rooms healthy", move: 0 },
      { intel: "Sharp split — respected money on BOTH sides at different numbers", move: +0.5 },
      { intel: "Market drifts back through pick'em territory", move: +1.0 },
      { intel: "Total board frozen at several shops (uncertainty signal)", move: +0.5 },
    ],
    closeDrift: +0.5,
  },
] as const;

type Phase = "brief" | "live" | "report" | "final";

interface RoundResult {
  readonly matchup: string;
  readonly action: "TAKE" | "PASS";
  readonly locked: number | null;
  readonly close: number;
  readonly clv: number;
  readonly points: number;
  readonly read: string;
}

const ARCADE_RANKS = [
  { name: "Window Clerk", min: -Infinity },
  { name: "Line Reader", min: 4 },
  { name: "Steam Catcher", min: 8 },
  { name: "Close Beater", min: 13 },
  { name: "Market Ghost", min: 18 },
] as const;

function rankFor(points: number): string {
  let out: string = ARCADE_RANKS[0]!.name;
  for (const r of ARCADE_RANKS) if (points >= r.min) out = r.name;
  return out;
}

function lineAfter(round: Round, ticksShown: number): number {
  let line = round.open;
  for (let i = 0; i < ticksShown; i++) line += round.ticks[i]!.move;
  return Math.round(line * 2) / 2;
}

function closeOf(round: Round): number {
  return Math.round((lineAfter(round, round.ticks.length) + round.closeDrift) * 2) / 2;
}

/**
 * Grade a round on CLV, favorite-side convention: you are always pricing
 * the FAVORITE, so taking a smaller give (e.g. -3.5 when it closes -4.5)
 * beat the close by +1.0.
 */
function grade(round: Round, action: "TAKE" | "PASS", locked: number | null): RoundResult {
  const close = closeOf(round);
  if (action === "PASS" || locked === null) {
    const totalMove = close - round.open;
    // Passing a market that closed WORSE than the open (more expensive to
    // enter late) is correct restraint; passing a market that improved
    // means you left value on the table.
    const points = totalMove <= -0.5 ? 2 : totalMove >= 0.5 ? 0 : 1;
    const read =
      points === 2
        ? "Correct restraint — the number only got worse. Passing was the +EV move."
        : points === 0
          ? "The market came TO you and you let it pass — entries that improve are gifts."
          : "Flat market. A pass costs nothing here.";
    return { matchup: round.matchup, action, locked: null, close, clv: 0, points, read };
  }
  const clv = Math.round((close - locked) * 2) / 2; // close minus your number; took -3.5, closed -4.5 → -1.0 → you beat it
  const beat = -clv; // positive = you beat the close
  const points = beat >= 1 ? 5 : beat >= 0.5 ? 4 : beat === 0 ? 2 : beat <= -1 ? 0 : 1;
  const read =
    beat >= 0.5
      ? `Beat the close by ${beat.toFixed(1)} — you priced it before the market finished agreeing.`
      : beat === 0
        ? "Matched the close. No edge surrendered, none gained."
        : `Lost ${Math.abs(beat).toFixed(1)} to the close — you paid for information that was already in the price.`;
  return { matchup: round.matchup, action, locked, close, clv: beat, points, read };
}

export function BeatTheClose() {
  const [phase, setPhase] = useState<Phase>("brief");
  const [roundIdx, setRoundIdx] = useState(0);
  const [ticksShown, setTicksShown] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [best, setBest] = useState<number | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BEST_KEY);
      if (raw !== null) setBest(Number(raw));
    } catch {
      /* ignore */
    }
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const round = ROUNDS[roundIdx]!;
  const live = lineAfter(round, ticksShown);
  const total = results.reduce((n, r) => n + r.points, 0);

  const settle = useCallback(
    (action: "TAKE" | "PASS", locked: number | null) => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      setResults((prev) => [...prev, grade(ROUNDS[roundIdx]!, action, locked)]);
      setPhase("report");
    },
    [roundIdx],
  );

  // Intel drip — one tick at a time; after the last tick the window closes
  // on its own (hesitation is a decision too).
  useEffect(() => {
    if (phase !== "live") return;
    if (ticksShown >= round.ticks.length) {
      timer.current = window.setTimeout(() => settle("PASS", null), TICK_MS);
      return;
    }
    timer.current = window.setTimeout(() => setTicksShown((t) => t + 1), TICK_MS);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [phase, ticksShown, round, settle]);

  const startRound = () => {
    setTicksShown(0);
    setPhase("live");
  };

  const nextRound = () => {
    if (roundIdx + 1 >= ROUNDS.length) {
      const final = results.reduce((n, r) => n + r.points, 0);
      try {
        if (best === null || final > best) {
          localStorage.setItem(BEST_KEY, String(final));
          setBest(final);
        }
      } catch {
        /* ignore */
      }
      setPhase("final");
      return;
    }
    setRoundIdx((i) => i + 1);
    setTicksShown(0);
    setPhase("live");
  };

  const restart = () => {
    setResults([]);
    setRoundIdx(0);
    setTicksShown(0);
    setPhase("brief");
  };

  const last = results[results.length - 1];

  return (
    <div className="surface-card relative overflow-hidden p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: cyan }}>
          beat the close · training simulation
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
          synthetic markets · fictional teams · graded on CLV
        </p>
      </div>

      {phase === "brief" && (
        <div className="mt-6 flex flex-col items-start gap-5">
          <h3 className="font-display text-2xl font-semibold text-white">
            Six markets. One skill: <span style={{ color: cyan }}>time the number</span>.
          </h3>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-300">
            A line opens. Intel lands, the number moves. <strong className="text-white">TAKE</strong>{" "}
            it whenever you like — or <strong className="text-white">PASS</strong>. At the close,
            one grade: did your number beat it? No wins, no losses. Only price.
          </p>
          <div className="flex items-center gap-5">
            <button type="button" onClick={startRound} className="btn btn-primary">
              Open the first market ▸
            </button>
            {best !== null && (
              <span className="font-mono text-xs text-ink-400">
                personal best: <span style={{ color: uv }}>{best} pts</span>
              </span>
            )}
          </div>
        </div>
      )}

      {phase === "live" && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
                market {roundIdx + 1} / {ROUNDS.length}
              </p>
              <p className="mt-1 font-display text-xl font-semibold text-white">{round.matchup}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-400">live line</p>
              <p
                className="gse-cine-anim mt-1 font-mono text-3xl font-bold tabular-nums"
                key={live}
                style={{ color: cyan, animation: "gse-flash-in 400ms ease-out both" }}
              >
                {live > 0 ? `+${live.toFixed(1)}` : live.toFixed(1)}
              </p>
              <p className="font-mono text-[10px] text-ink-500">opened {round.open.toFixed(1)}</p>
            </div>
          </div>

          {/* intel feed */}
          <div className="mt-5 min-h-[7.5rem] space-y-2" aria-live="polite">
            {round.ticks.slice(0, ticksShown).map((t, i) => (
              <p
                key={i}
                className="gse-cine-anim rounded-lg border border-white/[0.08]/50 bg-black/30 px-3.5 py-2 font-mono text-xs text-ink-200"
                style={{ animation: "gse-boot-line 400ms ease-out both" }}
              >
                <span style={{ color: t.move < 0 ? mag : t.move > 0 ? cyan : "inherit" }}>
                  {t.move === 0 ? "·" : t.move < 0 ? "▼" : "▲"}
                </span>{" "}
                {t.intel}
              </p>
            ))}
            {ticksShown === 0 && (
              <p className="px-1 py-2 font-mono text-xs text-ink-500">listening for market intel…</p>
            )}
          </div>

          <div className="mt-5 flex items-center gap-4">
            <button
              type="button"
              onClick={() => settle("TAKE", live)}
              className="rounded-full px-8 py-3.5 text-base font-bold transition-transform duration-150 hover:scale-[1.04]"
              style={{
                color: BRAND_COLORS.obsidianBlack,
                background: `linear-gradient(110deg, ${cyan}, ${uv})`,
                boxShadow: `0 0 32px ${cyan}55`,
              }}
            >
              TAKE {live > 0 ? `+${live.toFixed(1)}` : live.toFixed(1)}
            </button>
            <button
              type="button"
              onClick={() => settle("PASS", null)}
              className="rounded-full border px-6 py-3 text-sm font-semibold text-ink-200 transition-colors hover:text-white"
              style={{ borderColor: `${uv}55` }}
            >
              PASS — no bet
            </button>
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.24em] text-ink-500">
            the window closes after the last intel drop · hesitation is a decision
          </p>
        </div>
      )}

      {phase === "report" && last && (
        <div className="mt-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
            market closed · {last.matchup}
          </p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <p className="font-mono text-sm text-ink-200">
              your action:{" "}
              <span className="font-bold text-white">
                {last.action === "TAKE" && last.locked !== null
                  ? `TAKE ${last.locked > 0 ? "+" : ""}${last.locked.toFixed(1)}`
                  : "PASS"}
              </span>
            </p>
            <p className="font-mono text-sm text-ink-200">
              close: <span className="font-bold" style={{ color: uv }}>{last.close > 0 ? "+" : ""}{last.close.toFixed(1)}</span>
            </p>
            <p className="font-mono text-sm text-ink-200">
              points: <span className="font-bold" style={{ color: last.points >= 4 ? cyan : last.points === 0 ? mag : "#fff" }}>+{last.points}</span>
            </p>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-300">{last.read}</p>
          <button type="button" onClick={nextRound} className="btn btn-primary mt-6">
            {roundIdx + 1 >= ROUNDS.length ? "See your grade ▸" : "Next market ▸"}
          </button>
        </div>
      )}

      {phase === "final" && (
        <div className="mt-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-400">session report</p>
          <p className="mt-2 font-display text-4xl font-bold text-white">
            {total} <span className="text-xl font-normal text-ink-300">/ 30 pts</span>
          </p>
          <p className="mt-1 font-mono text-sm" style={{ color: cyan }}>
            ◆ {rankFor(total)}
          </p>
          <ul className="mt-5 max-w-2xl space-y-1.5">
            {results.map((r, i) => (
              <li key={i} className="flex items-baseline justify-between gap-4 border-b border-white/[0.08]/40 py-1.5 font-mono text-xs text-ink-300">
                <span>{r.matchup}</span>
                <span>
                  {r.action === "TAKE" && r.locked !== null ? `take ${r.locked.toFixed(1)} → close ${r.close.toFixed(1)}` : `pass → close ${r.close.toFixed(1)}`}
                  <span className="ml-3 font-bold" style={{ color: r.points >= 4 ? cyan : r.points === 0 ? mag : "#fff" }}>
                    +{r.points}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {best !== null && (
            <p className="mt-4 font-mono text-xs text-ink-400">
              personal best: <span style={{ color: uv }}>{best} pts</span>
            </p>
          )}
          <button type="button" onClick={restart} className="btn btn-primary mt-6">
            Run it back ▸
          </button>
        </div>
      )}
    </div>
  );
}
