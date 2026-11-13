/**
 * Two-doctrines board renderer - shared by /, /board and /picks.
 * Server component (no client hooks): the doctrine is composed server-side.
 *
 * Zone 1 = PLAY rows with integer confidence XX/100.
 * Zone 2 = PASS rows with plain-language reasons.
 * PASS-only is a proud, fully-rendered state - never an error or "n/a".
 */

import Link from "next/link";
import { STALENESS_LAW, type DoctrineBoard } from "@/lib/board/staleness-law";

export function DoctrineBoardView({
  board,
  compact = false,
}: {
  board: DoctrineBoard;
  compact?: boolean;
}): JSX.Element {
  return (
    <div data-testid="doctrine-board" data-posture={board.posture}>
      {/* Posture header */}
      <div className="surface-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex rounded-md border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] ${
              board.posture === "PLAYS"
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                : "border-mineral bg-eclipse text-ion-1"
            }`}
            data-testid="doctrine-posture"
          >
            {board.posture === "PLAYS" ? "Zone 1 · Plays live" : "Zone 2 · Pass doctrine"}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">
            {board.zone1.length} plays · {board.zone2.length} passes
          </span>
        </div>
        <h2 className="mt-4 font-display text-3xl uppercase tracking-tight text-ion-white sm:text-4xl">
          {board.headline}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ion-1">{board.subline}</p>
      </div>

      {/* Zone 1 - plays */}
      {board.zone1.length > 0 ? (
        <section className="mt-6" data-testid="zone-1-plays">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-300">
            Zone 1 · Official plays
          </h3>
          <div className="mt-3 grid gap-3">
            {board.zone1.map((row) => (
              <div
                key={`${row.gameId}-${row.market}`}
                className="surface-card flex flex-wrap items-center justify-between gap-3 p-4"
                data-testid="play-row"
              >
                <div>
                  <div className="font-semibold text-ion-white">{row.matchup}</div>
                  <div className="mt-0.5 font-mono text-xs text-ion-2">
                    {row.selection ?? "Members see the side and line"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">
                    Confidence
                  </div>
                  <div className="font-display text-2xl text-emerald-300" data-testid="play-confidence">
                    {row.confidenceLabel}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Zone 2 - passes */}
      {board.zone2.length > 0 ? (
        <section className="mt-6" data-testid="zone-2-passes">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ion-1">
            Zone 2 · Transparent passes
          </h3>
          <div className="mt-3 grid gap-2">
            {board.zone2.slice(0, compact ? 6 : 24).map((row) => (
              <div
                key={row.gameId}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-mineral bg-eclipse/50 px-4 py-3"
                data-testid="pass-row"
              >
                <span className="text-sm font-semibold text-ion-white">{row.matchup}</span>
                <span className="text-xs leading-relaxed text-ion-2">{row.reason}</span>
              </div>
            ))}
          </div>
          {compact && board.zone2.length > 6 ? (
            <Link href="/board" className="mt-3 inline-block font-mono text-xs text-emerald-300">
              See all {board.zone2.length} passes on the board
            </Link>
          ) : null}
        </section>
      ) : null}

      {/* The law itself */}
      {!compact ? (
        <section className="mt-8 surface-card p-6" data-testid="staleness-law">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ion-1">
            The staleness law
          </h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-ion-2">
            {STALENESS_LAW.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}