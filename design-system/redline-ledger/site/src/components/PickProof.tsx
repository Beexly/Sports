import type { PickData } from "../data/week8";

export function PickProof({ pick, rank }: { pick: PickData; rank: number }) {
  return (
    <article className="card pick-proof" aria-label={`${pick.selection} ${pick.price}`}>
      <div className="pick-rank num">R/{String(rank).padStart(2, "0")}</div>
      <div className="pick-identity">
        <p className="pick-matchup">{pick.league} · {pick.matchup}</p>
        <h3>{pick.selection} <span className="pick-price num">{pick.price}</span></h3>
        <p className="pick-note">Post-reasoning model compared with de-vig market probability.</p>
      </div>
      <dl className="pick-metrics">
        <div>
          <dt>Model</dt>
          <dd className="num">{pick.modelProbability.toFixed(2)}%</dd>
        </div>
        <div>
          <dt>Market</dt>
          <dd className="num">{pick.marketProbability.toFixed(2)}%</dd>
        </div>
        <div className="pick-edge">
          <dt>Edge</dt>
          <dd className="primary-number">+{pick.edge.toFixed(2)}%</dd>
        </div>
      </dl>
    </article>
  );
}
