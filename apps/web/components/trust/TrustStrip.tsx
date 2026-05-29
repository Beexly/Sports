import type { SourceKey, FreshnessKey } from "@/lib/trust/source-labels";
import type { SurfaceKind } from "@/lib/galaxy/kernel/surfaces";
import type { UncertaintyStateKind } from "./UncertaintyState";
import { SourceFreshnessLabel } from "./SourceFreshnessLabel";
import { ActionabilityLabel } from "./ActionabilityLabel";
import { UncertaintyState } from "./UncertaintyState";
import { MethodologyLink } from "./MethodologyLink";
import { ResponsiblePlayLink } from "./ResponsiblePlayLink";

interface Props {
  /** Surface ID for the data-trust-strip attribute (C44 test hook). */
  surfaceId: string;
  source: SourceKey;
  freshness: FreshnessKey;
  surfaceKind: SurfaceKind;
  tier: "free" | "pro" | "elite" | "all" | "operator";
  uncertainty: UncertaintyStateKind;
  /** Show methodology link (betting-adjacent surfaces require it). */
  showMethodology?: boolean;
  /** Show responsible play link (betting-adjacent surfaces require it). */
  showResponsiblePlay?: boolean;
  className?: string;
}

/**
 * TrustStrip — a single inline row of trust primitives.
 *
 * Server-safe (no client-side state). Renders at the fold of every
 * betting-adjacent surface per the Trust UX Standard (C28).
 *
 * The data-trust-strip attribute is the C44 test hook — TrustStrip
 * presence test asserts this attribute exists on surfaces that require it.
 */
export function TrustStrip({
  surfaceId,
  source,
  freshness,
  surfaceKind,
  tier,
  uncertainty,
  showMethodology = false,
  showResponsiblePlay = false,
  className = "",
}: Props) {
  return (
    <div
      data-trust-strip={surfaceId}
      className={[
        "flex flex-wrap items-center gap-x-4 gap-y-2",
        className,
      ].join(" ")}
      aria-label="Evidence and trust indicators"
    >
      <SourceFreshnessLabel source={source} freshness={freshness} />

      <span aria-hidden="true" className="hidden text-gray-700 sm:inline">·</span>

      <UncertaintyState kind={uncertainty} />

      <span aria-hidden="true" className="hidden text-gray-700 sm:inline">·</span>

      <ActionabilityLabel surfaceKind={surfaceKind} tier={tier} />

      {showMethodology && (
        <>
          <span aria-hidden="true" className="hidden text-gray-700 sm:inline">·</span>
          <MethodologyLink />
        </>
      )}

      {showResponsiblePlay && (
        <>
          <span aria-hidden="true" className="hidden text-gray-700 sm:inline">·</span>
          <ResponsiblePlayLink />
        </>
      )}
    </div>
  );
}
