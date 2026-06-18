import {
  assessUncertainty,
  type LimitationFlag,
  type ReliabilityTier,
  type UncertaintyDisclosure,
} from "@sports/prediction-engine";
import {
  NUMERIC_TEXT_CLASS,
  formatCount,
  formatRatioAsPercent,
} from "@/lib/format/stat";

/**
 * The Honest Band — the uncertainty disclosure the engine always computed but
 * never showed (assessUncertainty: Wilson 95% interval + reliability tier +
 * limitation flags). A trust product leads with the band, not the midpoint:
 * "when NOT to trust us" is the most on-brand sentence we can render.
 *
 * Flags arrive as tokens; this surface maps them to vetted copy only — no
 * free-text from the engine reaches the page.
 */

const FLAG_COPY: Record<LimitationFlag, string> = {
  small_sample: "Small sample — fewer than 30 settled cases behind this band.",
  low_evidence: "Evidence health was low when these picks scored.",
  stale_data: "Source data was older than 24 hours at read time.",
  regime_shift: "Conditions look unlike the model's training window.",
  wide_interval: "The band is wide — read the range, not the midpoint.",
};

const RELIABILITY_COPY: Record<ReliabilityTier, { label: string; read: string; tone: string }> = {
  high: {
    label: "High reliability",
    read: "The band is tight and clean. It deserves weight.",
    tone: "text-orbital-cyan",
  },
  moderate: {
    label: "Moderate reliability",
    read: "The band is informative — mind its width before leaning on it.",
    tone: "text-white",
  },
  low: {
    label: "Low reliability",
    read: "Wide band. Treat the number as directional, not definitive.",
    tone: "text-caution",
  },
  insufficient: {
    label: "Insufficient history",
    read: "Not enough settled picks to publish a band we'd stand behind.",
    tone: "text-ink-400",
  },
};

export interface HonestBandProps {
  /** Overall observed win rate over decided picks, 0–1. */
  readonly observedRate: number;
  /** Settled sample size behind the rate. */
  readonly sampleSize: number;
}

export function HonestBand({ observedRate, sampleSize }: HonestBandProps) {
  const d: UncertaintyDisclosure = assessUncertainty({
    probability: observedRate,
    sampleSize,
  });
  const meta = RELIABILITY_COPY[d.reliability];
  const lowPct = Math.round(d.intervalLow * 100);
  const widthPct = Math.max(1, Math.round(d.intervalWidth * 100));

  return (
    <div
      data-testid="honest-band"
      className="rounded-xl border border-white/[0.10] bg-white/[0.04]/40 p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">
          The honest band — 95% interval, not a point claim
        </p>
        <span
          className={`text-[11px] font-semibold uppercase tracking-widest ${meta.tone}`}
        >
          {meta.label}
        </span>
      </div>

      {d.reliability === "insufficient" ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-300">{meta.read}</p>
      ) : (
        <>
          <p className={`mt-3 text-sm text-ion ${NUMERIC_TEXT_CLASS}`}>
            {formatRatioAsPercent(d.intervalLow)} —{" "}
            <span className="font-semibold text-white">
              {formatRatioAsPercent(d.probability)}
            </span>{" "}
            — {formatRatioAsPercent(d.intervalHigh)}
            <span className="ml-2 text-xs text-ink-400">
              over {formatCount(sampleSize)} settled picks
            </span>
          </p>

          {/* Band visualization: track 0–100%, the interval as the lit region. */}
          <div
            aria-hidden="true"
            className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]"
          >
            <div
              className="absolute top-0 h-full rounded-full bg-orbital-cyan/30"
              style={{ left: `${lowPct}%`, width: `${widthPct}%` }}
            />
            <div
              className="absolute top-0 h-full w-0.5 bg-ion-white/80"
              style={{ left: `${Math.round(d.probability * 100)}%` }}
            />
          </div>

          <p className="mt-3 text-xs leading-relaxed text-ink-300">{meta.read}</p>
        </>
      )}

      {d.flags.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3">
          {d.flags.map((flag) => (
            <li
              key={flag}
              className="flex gap-2 text-[11px] leading-relaxed text-ink-300"
            >
              <span aria-hidden="true" className="text-caution">
                ⚠
              </span>
              {FLAG_COPY[flag]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
