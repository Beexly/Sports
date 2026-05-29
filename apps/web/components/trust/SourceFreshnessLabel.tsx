import type {
  SourceKey,
  FreshnessKey,
} from "@/lib/trust/source-labels";
import { SOURCE_LABELS, FRESHNESS_LABELS } from "@/lib/trust/source-labels";

interface Props {
  source: SourceKey;
  freshness: FreshnessKey;
  className?: string;
}

const FRESHNESS_COLOR: Record<FreshnessKey, string> = {
  live: "text-emerald-400",
  fresh: "text-emerald-300",
  today: "text-blue-400",
  stale: "text-amber-400",
  sample: "text-violet-400",
  unknown: "text-gray-500",
};

export function SourceFreshnessLabel({ source, freshness, className = "" }: Props) {
  return (
    <span
      className={["inline-flex items-center gap-1.5", className].join(" ")}
      aria-label={`Source: ${SOURCE_LABELS[source]}, Freshness: ${FRESHNESS_LABELS[freshness]}`}
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-500">
        {SOURCE_LABELS[source]}
      </span>
      <span aria-hidden="true" className="text-gray-700">·</span>
      <span className={["font-mono text-[9px] uppercase tracking-[0.16em]", FRESHNESS_COLOR[freshness]].join(" ")}>
        {FRESHNESS_LABELS[freshness]}
      </span>
    </span>
  );
}
