import Link from "next/link";
import Image from "next/image";
import { BRAND_NAME } from "@/lib/brand";

/**
 * BrandLockup — the official Galaxy Sports Edge horizontal lockup.
 *
 * Renders the approved chrome emblem (Brand Bible v1.0) alongside the
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
        <Image
          // The pre-sized 180px emblem downsamples much crisper than the full
          // raster re-encoded to 40px; quality=100 stops the optimizer from
          // muddying the chrome gloss at this tiny render size.
          src="/brand/gse-emblem-180.png"
          alt=""
          width={40}
          height={40}
          quality={100}
          priority
          className="brand-emblem-img"
        />
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
