import type { EngineGameProjection } from "@/lib/board/engine-board";

/**
 * One game's engine projections. Presentational only: the loader has
 * already decided this row may be shown, and every number here is the
 * model's own projection for the game — projected margin, projected
 * total, projected team totals. There is deliberately no book price,
 * no comparison, and no action on this card: a projection is an
 * estimate published before the game, not something to act on.
 */
export function EngineBoardCard({
  game,
  kickoffLabel,
}: {
  game: EngineGameProjection;
  kickoffLabel: string;
}): JSX.Element {
  const margin = Math.abs(game.projectedMarginHome);
  const marginText =
    game.projectedMarginHome === 0
      ? "Projected even"
      : game.projectedMarginHome < 0
        ? `${game.homeTeam} by ${margin}`
        : `${game.awayTeam} by ${margin}`;

  return (
    <article className="border border-titanium bg-carbon/45 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-3">
            Kickoff {kickoffLabel}
          </p>
          <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-ion-white">
            {game.matchup}
          </h3>
          <p className="mt-1 text-sm text-ion-2">{marginText}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-3">
            Projected total
          </p>
          <p className="mt-1 font-display text-4xl font-semibold tabular-nums text-ion-white">
            {game.projectedTotal}
          </p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-titanium pt-4">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-3">
            {game.awayTeam} projected
          </dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-ion-white">
            {game.projectedAwayTotal}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-3">
            {game.homeTeam} projected
          </dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums text-ion-white">
            {game.projectedHomeTotal}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-ion-3">
        Projection only. Not a pick and not a recommendation.
      </p>
    </article>
  );
}
