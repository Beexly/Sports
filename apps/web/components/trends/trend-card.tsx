import type { FormRecord, GameTrend, TeamTrend } from "@/lib/trends/load-trends";

/**
 * TrendCard — one upcoming game's form / venue / head-to-head / rest /
 * line-movement read, in the scores24 spirit but on our own settled data.
 *
 * Pure presentational. Every trend that lacks enough settled games renders an
 * honest "not enough history" state instead of a fabricated streak.
 */

function tipTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function FormMeter({ label, form }: { label: string; form: FormRecord | null }) {
  if (!form) {
    return (
      <div className="trend-meter trend-meter--empty">
        <span className="trend-meter__label">{label}</span>
        <span className="trend-meter__thin">Not enough settled games yet</span>
      </div>
    );
  }
  return (
    <div className="trend-meter">
      <div className="trend-meter__head">
        <span className="trend-meter__label">{label}</span>
        <span className="trend-meter__record">
          {form.wins}–{form.losses}
          {form.pushes > 0 ? `–${form.pushes}` : ""} ATS
        </span>
      </div>
      <div
        className="trend-meter__bar"
        role="img"
        aria-label={`${form.coverPct}% against the spread over the last ${form.sampleSize} games`}
      >
        <span
          className="trend-meter__fill"
          style={{ width: `${form.coverPct}%` }}
        />
      </div>
      <span className="trend-meter__pct">
        {form.coverPct}% cover · last {form.sampleSize}
      </span>
    </div>
  );
}

function TeamColumn({ trend, venueLabel }: { trend: TeamTrend; venueLabel: string }) {
  return (
    <div className="trend-team">
      <div className="trend-team__name">{trend.team}</div>
      <FormMeter label="Recent ATS" form={trend.form} />
      <FormMeter label={venueLabel} form={trend.venueForm} />
      <div className="trend-team__meta">
        {trend.restDays !== null ? (
          <span className="trend-chip">
            {trend.restDays} {trend.restDays === 1 ? "day" : "days"} rest
          </span>
        ) : null}
        {trend.backToBack ? (
          <span className="trend-chip trend-chip--warn">Back-to-back</span>
        ) : null}
      </div>
    </div>
  );
}

export function TrendCard({ game }: { game: GameTrend }) {
  return (
    <article className="trend-card surface-card" data-testid="trend-card">
      <header className="trend-card__head">
        <span className="trend-card__sport">{game.sport}</span>
        <span className="trend-card__time">{tipTime(game.commenceTime)}</span>
      </header>
      <h3 className="trend-card__matchup">{game.matchup}</h3>

      {game.hasSignal ? (
        <>
          <div className="trend-card__grid">
            <TeamColumn trend={game.away} venueLabel="On the road" />
            <TeamColumn trend={game.home} venueLabel="At home" />
          </div>

          <div className="trend-card__foot">
            {game.headToHead ? (
              <span className="trend-chip">
                H2H: {game.home.team} {game.headToHead.wins}–
                {game.headToHead.losses} ATS (last {game.headToHead.sampleSize})
              </span>
            ) : (
              <span className="trend-chip trend-chip--muted">
                No head-to-head history yet
              </span>
            )}
            {game.lineMovementSpread !== null ? (
              <span className="trend-chip">
                Line move: {game.lineMovementSpread > 0 ? "+" : ""}
                {game.lineMovementSpread.toFixed(1)}
              </span>
            ) : null}
          </div>
        </>
      ) : (
        <p className="trend-card__thin" data-testid="trend-card-empty">
          We don&apos;t have enough settled games on these teams to show a trend
          yet. We&apos;d rather show nothing than invent a streak.
        </p>
      )}
    </article>
  );
}
