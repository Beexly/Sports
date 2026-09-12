import Link from "next/link";
import { LogoMarkInline } from "@/components/brand/logo-mark-inline";
import { BRAND_NAME } from "@/lib/brand";

/**
 * BrandLockup — the official Galaxy Sports Edge horizontal lockup.
 *
 * Renders the NEBULA v7 true-break mark (inline SVG: bone blade, ember core)
 * alongside the wordmark...[truncated]
 * "GALAXY SPORTS EDGE" wordmark set in Exo 2 with the signal-fade gradient
 * (cyan -> magenta -> violet) and the signal underline. Horizontal only —
 * the wordmark never stacks. `compact` collapses to emblem + "GSE" for the
 * tightest rails. `kinetic` plays a one-shot arrival sting on full page load
 * (disabled under prefers-reduced-motion).
 */
export function BrandLockup({
  compact = false,
  kinetic = true,
}: {
  compact?: boolean;
  kinetic?: boolean;
}) {
  return (
    <Link
      href="/"
      className={`brand-lockup${compact ? " brand-lockup-compact" : ""}${kinetic ? " brand-lockup-kinetic" : ""}`}
      aria-label={`${BRAND_NAME} home`}
    >
      <span className="brand-emblem">
        <LogoMarkInline size={40} kinetic={kinetic} />
      </span>
      <span className="brand-wordmark">
        <span className="brand-wordmark-text">
          {compact ? "GSE" : "Galaxy Sports Edge"}
        </span>
        {!compact && <span className="brand-wordmark-underline" aria-hidden="true" />}
      </span>
    </Link>
  );
}
