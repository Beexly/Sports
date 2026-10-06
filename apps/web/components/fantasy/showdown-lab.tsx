"use client";

/**
 * ShowdownLab — the single-game room (wave 4 issue #805).
 *
 * Cinematic presentation of an exact-over-a-bounded-pool showdown solve. The
 * format's structural facts are on the surface, not buried in the solver: the
 * 1.5x captain multiplier on BOTH points and salary, the six-slot shape, the
 * two-team requirement, and the salary the captain actually consumed.
 *
 * What it refuses to do: call the alternates a proven top-k (they are re-solves),
 * hide the search bound, or render a lineup when no legal one exists.
 */

import { useMemo } from "react";
import {
  SHOWDOWN_RULES,
  bestShowdownLineups,
  showdownAlternates,
  type ShowdownLineup,
} from "@/lib/fantasy/showdown";
import { SHOWDOWN_GAME_LABEL, SHOWDOWN_SLATE } from "@/lib/fantasy/showdown-slate";

const salaryText = (n: number): string => `$${n.toLocaleString("en-US")}`;

function PlayerChip({
  name,
  pos,
  team,
  captain,
  muted,
}: {
  name: string;
  pos: string;
  team: string;
  captain?: boolean;
  muted?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
        captain
          ? "border-plasma/50 bg-plasma/15 text-plasma"
          : muted
            ? "border-ion-1/15 bg-ion-1/5 text-ion-3"
            : "border-ion-1/20 bg-ion-1/5 text-ion-1"
      }`}
    >
      {captain && <span className="font-mono text-[10px] font-bold">CPT</span>}
      <span className="text-ion-white">{name}</span>
      <span className="text-[10px] uppercase tracking-wider text-ion-3">
        {pos} · {team}
      </span>
    </span>
  );
}

function LineupCard({ lineup, rank }: { lineup: ShowdownLineup; rank: number }) {
  const captainSalary = lineup.captain.salary * SHOWDOWN_RULES.captainMultiplier;
  return (
    <article
      data-testid="showdown-lineup"
      className="surface-card group relative overflow-hidden p-4"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-16 h-32 bg-gradient-to-b from-plasma/15 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-ion-3">
          Lineup {rank}
        </span>
        <span className="ml-auto font-mono text-xs text-ion-2">
          {salaryText(lineup.salary)} / {salaryText(SHOWDOWN_RULES.salaryCap)}
        </span>
      </div>

      <p className="relative mt-2 font-mono text-2xl text-ion-white">
        {lineup.proj.toFixed(1)}
        <span className="ml-1 text-xs text-ion-3">proj</span>
      </p>
      <p className="relative text-[11px] text-ion-3">
        ceiling {lineup.ceiling.toFixed(1)}
      </p>

      <div className="relative mt-3 flex flex-wrap gap-1.5">
        <PlayerChip
          name={lineup.captain.name}
          pos={lineup.captain.pos}
          team={lineup.captain.team}
          captain
        />
        {lineup.flex.map((p) => (
          <PlayerChip key={p.id} name={p.name} pos={p.pos} team={p.team} muted />
        ))}
      </div>

      <p className="relative mt-3 font-mono text-[10px] text-ion-3">
        captain salary {salaryText(captainSalary)} ×{SHOWDOWN_RULES.captainMultiplier} applied
      </p>
    </article>
  );
}

export function ShowdownLab() {
  const { best, alternates } = useMemo(
    () => ({
      best: bestShowdownLineups(SHOWDOWN_SLATE, 1),
      alternates: showdownAlternates(SHOWDOWN_SLATE, 4),
    }),
    [],
  );

  const top = best.lineups[0] ?? null;
  const cards = top ? [top, ...alternates.lineups.filter((l) => l.key !== top.key)] : [];

  return (
    <div className="space-y-4" data-testid="showdown-lab">
      <section className="surface-card relative overflow-hidden p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-plasma/10 via-transparent to-orbital-cyan/10"
        />
        <div className="relative flex flex-wrap items-start gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-ion-3">
              Single game · {SHOWDOWN_GAME_LABEL}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ion-white">
              Showdown room
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-ion-2">
              One captain at {SHOWDOWN_RULES.captainMultiplier}× points and{" "}
              {SHOWDOWN_RULES.captainMultiplier}× salary, five flex, both teams represented.
            </p>
          </div>
          <span
            data-testid="showdown-source"
            className="ml-auto rounded-full bg-caution/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-caution"
          >
            Source: fictional (illustrative)
          </span>
        </div>

        <dl className="relative mt-5 grid gap-2 sm:grid-cols-4">
          {(
            [
              ["Roster", `1 CPT + ${SHOWDOWN_RULES.flexSlots} FLEX`],
              ["Capt. multiplier", `${SHOWDOWN_RULES.captainMultiplier}× points & salary`],
              ["Salary cap", salaryText(SHOWDOWN_RULES.salaryCap)],
              ["Teams", "Both required"],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-lg border border-ion-1/20 bg-ion-1/5 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-[0.16em] text-ion-3">{label}</dt>
              <dd className="mt-0.5 font-mono text-sm text-ion-white">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {cards.length === 0 ? (
        <p
          data-testid="showdown-empty"
          className="surface-card px-4 py-8 text-sm text-ion-2"
        >
          {best.reason ?? "No legal showdown lineup exists for this pool."}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map((l, i) => (
            <LineupCard key={l.key} lineup={l} rank={i + 1} />
          ))}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-ion-3">
        Searched {best.poolSize} players · {best.captainCandidates} captain candidates ·{" "}
        {best.combosEvaluated.toLocaleString("en-US")} roster combinations evaluated.{" "}
        {best.poolBound ??
          "The whole pool fit inside the search bound, so the solve is exact over it."}{" "}
        {alternates.reason}
      </p>
    </div>
  );
}

export default ShowdownLab;