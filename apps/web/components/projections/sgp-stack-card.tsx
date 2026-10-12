import type { SgpStackProjection } from "@/lib/projections/sgp-projections";

/**
 * One projected same-game stack. Presentational only: the loader has
 * already decided this row may be shown, and the only number here is the
 * model's projected probability. There is deliberately no price, no
 * comparison, and no action on this card — a projection is an estimate
 * published before the game, not something to act on.
 */
export function SgpStackCard({
  stack,
  rank,
}: {
  stack: SgpStackProjection;
  rank: number;
}): JSX.Element {
  const percent = `${(stack.projectedProbability * 100).toFixed(1)}%`;
  return (
    <article className="border border-titanium bg-carbon/45 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-3">
            Rank {rank} in this game
          </p>
          <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-ion-white">
            {stack.teamName}
          </h3>
          <p className="mt-1 text-sm text-ion-2">
            Quarterback and receiver stack
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-3">
            Projected chance
          </p>
          <p className="mt-1 font-display text-4xl font-semibold tabular-nums text-ion-white">
            {percent}
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-1.5 border-t border-titanium pt-4">
        {stack.legs.map((leg) => (
          <li key={leg} className="text-sm leading-6 text-ion-2">
            {leg}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ion-3">
        Projection only. Not a pick and not a recommendation.
      </p>
    </article>
  );
}
