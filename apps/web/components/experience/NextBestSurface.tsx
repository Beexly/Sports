import Link from "next/link";
import { resolveNextBest } from "@/lib/experience/runtime-resolver";
import type { UserMode } from "@/lib/experience/user-modes";
import type { MaturityStage } from "@/lib/decision-quality/maturity";

interface Props {
  /** Current route — used to personalize the next-step suggestion. */
  route: string;
  /** User mode from cookie, if set. Defaults to returning-scan. */
  userMode?: UserMode;
  /** Maturity stage from cookie, if set. Defaults to learner. */
  maturityStage?: MaturityStage;
  className?: string;
}

/**
 * NextBestSurface — server-rendered next-step suggestion driven by the
 * Experience Orchestrator and kernel surface registry.
 *
 * No user data is fetched. Mode and maturity come from the calling page
 * (read from cookies if available, otherwise defaults).
 */
export function NextBestSurface({ route, userMode, maturityStage, className = "" }: Props) {
  const resolved = resolveNextBest({ route, userMode, maturityStage });

  return (
    <div
      className={[
        "flex flex-wrap items-center gap-x-4 gap-y-2",
        className,
      ].join(" ")}
      aria-label="Suggested next step"
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500">
        Next
      </span>

      <Link
        href={resolved.primaryHref}
        className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent-300 hover:text-accent-200 transition-colors underline-offset-2 hover:underline"
      >
        {resolved.primaryLabel} →
      </Link>

      {!resolved.suppressUpsell && (
        <>
          <span aria-hidden="true" className="text-gray-700">·</span>
          <Link
            href={resolved.secondaryHref}
            className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-500 hover:text-gray-300 transition-colors"
          >
            {resolved.secondaryLabel}
          </Link>
        </>
      )}
    </div>
  );
}
