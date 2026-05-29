/**
 * PickEvidenceSection — shared EvidenceCard-backed provenance primitive.
 *
 * Replaces the bespoke "Galaxy model" hard-coded rows in PickCard and
 * FullPickCard. Composes SourceFreshnessLabel from the trust layer so
 * both card types share the same evidence anatomy as EvidenceCard.
 *
 * Constitution #9: when kind="pick", failureCase is required by type.
 * Server-safe (no "use client").
 */

import { SourceFreshnessLabel } from "@/components/trust";
import type { EvidenceSource, EvidenceFreshness } from "@/components/ui/evidence-card";

type PickEvidenceSectionBase = {
  source: EvidenceSource;
  freshness: EvidenceFreshness;
  modelVersion?: string;
  className?: string;
};

export type PickEvidenceSectionProps =
  | (PickEvidenceSectionBase & { kind?: "signal" | "no-bet" })
  | (PickEvidenceSectionBase & { kind: "pick"; failureCase: string });

/** Convert dataFreshnessAt age in minutes to an EvidenceFreshness bucket. */
export function ageToFreshness(ageMinutes: number | null): EvidenceFreshness {
  if (ageMinutes === null) return "unknown";
  if (ageMinutes < 5) return "live";
  if (ageMinutes < 120) return "fresh";
  if (ageMinutes < 1440) return "today";
  return "stale";
}

export function PickEvidenceSection(props: PickEvidenceSectionProps) {
  const { source, freshness, modelVersion, className = "" } = props;
  const isPickKind = props.kind === "pick";

  return (
    <div className={["space-y-2", className].join(" ")}>
      <div className="flex items-center justify-between border-t border-mineral/60 pt-2">
        <SourceFreshnessLabel source={source} freshness={freshness} />
        {modelVersion && (
          <span className="font-mono text-[8px] text-gray-700">{modelVersion}</span>
        )}
      </div>

      {isPickKind && "failureCase" in props && (
        <div className="rounded border border-amber-800/30 bg-amber-950/20 px-3 py-2">
          <p className="mb-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-amber-600">
            What would change this read
          </p>
          <p className="text-[11px] leading-relaxed text-amber-300/80">
            {props.failureCase}
          </p>
        </div>
      )}
    </div>
  );
}
