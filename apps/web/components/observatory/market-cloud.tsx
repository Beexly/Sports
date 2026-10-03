import {
  cloudGeometry,
  WIDE_SPREAD_PP,
} from "@/lib/market/simulation-cloud-geometry";
import { NUMERIC_TEXT_CLASS, formatRatioAsPercent } from "@/lib/format/stat";

/**
 * Market Cloud — distribution, not fake certainty.
 *
 * One dot per book: that book's own no-vig P(home). The spread between dots
 * is the market's real disagreement — never an invented variance parameter,
 * never a Monte Carlo over assumed inputs. The axis zooms to the data but
 * its endpoints are labeled, so the zoom can't lie. Renders nothing under
 * two samples.
 *
 * (Distinct from the illustrative Poisson SimulationCloud teaching tool: this
 * one plots REAL captured book prices.)
 */

export function MarketCloud({
  probs,
  consensus,
}: {
  readonly probs: readonly number[];
  readonly consensus: number;
}) {
  const geo = cloudGeometry(probs, consensus);
  if (!geo) return null;

  const wide = geo.spreadPp >= WIDE_SPREAD_PP;
  return (
    <div data-testid="market-cloud" className="mt-2">
      <div className={`flex items-center justify-between text-[10px] uppercase tracking-wider text-ion-3 ${NUMERIC_TEXT_CLASS}`}>
        <span>{formatRatioAsPercent(geo.loProb)}</span>
        <span>
          P(home) cloud · one dot per book ·{" "}
          <span className={wide ? "text-plasma" : "text-ion-2"}>
            spread {geo.spreadPp}pp
          </span>
        </span>
        <span>{formatRatioAsPercent(geo.hiProb)}</span>
      </div>
      <div className="relative mt-1 h-3 rounded-full bg-mineral/40">
        <span
          aria-hidden
          title="consensus (median across books)"
          className="absolute top-0 h-3 w-px bg-orbital-cyan"
          style={{ left: `${geo.consensusLeftPct}%` }}
        />
        {geo.dots.map((dot, i) => (
          <span
            key={`${dot.prob}-${i}`}
            title={`one book's no-vig P(home): ${formatRatioAsPercent(dot.prob)}`}
            className={`absolute top-1 h-1 w-1 -translate-x-1/2 rounded-full ${wide ? "bg-plasma" : "bg-ion-1"}`}
            style={{ left: `${dot.leftPct}%` }}
          />
        ))}
      </div>
    </div>
  );
}
