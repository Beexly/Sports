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
  small_sample: "Small sample: fewer than 30 settled cases behind this band.",
  low_evidence: "Evidence health was low when these picks scored.",
  stale_data: "Source data was older than 24 hours at read time.",
  regime_shift: "Conditions look unlike the model's training window.",
  wide_interval: "The band is wide. Read the range, not the midpoint.",
};

const RELIABILITY_COPY: Record<ReliabilityTier, { label: string; read: string; tone: string }> = {
  high: {
    label: "High reliability",
    read: "The band is tight and clean. It deserves weight.",
    tone: "text-orbital-cyan",
  },
  moderate: {
    label: "Moderate reliability",
    read: "The band is informative. Mind its width before leaning on it.",
    tone: "text-ion-white",
  },
  low: {
    label: "Low reliability",
    read: "Wide band. Treat the number as directional, not definitive.",
    tone: "text-caution",
  },
  insufficient: {
    label: "Insufficient history",
    read: "Not enough settled picks to publish a band we'd stand behind.",
    tone: "text-ion-2",
  },
};

export interface HonestBandProps {
  /** Overall observed win rate over decided picks, 0–1. */
  readonly observedRate: number;
  /** Settled sample size behind the rate. */
  readonly sampleSize: number;
  /** Optional exact interval (Clopper-Pearson). When omitted, Wilson from assessUncertainty. */
  readonly intervalLow?: number | null;
  readonly intervalHigh?: number | null;
  readonly method?: "wilson" | "clopper-pearson";
}

export function HonestBand({
  observedRate,
  sampleSize,
  intervalLow,
  intervalHigh,
  method = "wilson",
}: HonestBandProps) {
  const d: UncertaintyDisclosure = assessUncertainty({
    probability: observedRate,
    sampleSize,
  });
  const meta = RELIABILITY_COPY[d.reliability];
  const low = intervalLow ?? d.intervalLow;
  const high = intervalHigh ?? d.intervalHigh;
  const lowPct = Math.round(low * 100);
  const widthPct = Math.max(1, Math.round((high - low) * 100));
  const methodLabel =
    method === "clopper-pearson"
      ? "The honest band: 95% Clopper-Pearson interval, not a point claim"
      : "The honest band: 95% interval, not a point claim";

  return (
    <div
      data-testid="honest-band"
      className="rounded-xl border border-titanium bg-eclipse/40 p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-ion-2">
          {methodLabel}
        </p>
        <span
          className={`text-[11px] font-semibold uppercase tracking-widest ${meta.tone}`}
        >
          {meta.label}
        </span>
      </div>

      {d.reliability === "insufficient" ? (
        <p className="mt-3 text-sm leading-relaxed text-ion-1">{meta.read}</p>
      ) : (
        <>
          <p className={`mt-3 text-sm text-ion ${NUMERIC_TEXT_CLASS}`}>
            {formatRatioAsPercent(low)} ·{" "}
            <span className="font-semibold text-ion-white">
              {formatRatioAsPercent(d.probability)}
            </span>{" "}
            · {formatRatioAsPercent(high)}
            <span className="ml-2 text-xs text-ion-2">
              over {formatCount(sampleSize)} settled picks
            </span>
          </p>

          {/* Band visualization: track 0–100%, the interval as the lit region. */}
          <div
            aria-hidden="true"
            className="relative mt-3 h-2 overflow-hidden rounded-full bg-titanium"
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

          <p className="mt-3 text-xs leading-relaxed text-ion-1">{meta.read}</p>
        </>
      )}

      {d.flags.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-titanium/60 pt-3">
          {d.flags.map((flag) => (
            <li
              key={flag}
              className="flex gap-2 text-[11px] leading-relaxed text-ion-2"
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
