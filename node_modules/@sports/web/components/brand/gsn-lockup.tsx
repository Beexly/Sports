/**
 * GsnLockup — the Galaxy Sports Network identity.
 *
 * GSN is the company/network behind the Galaxy Sports Edge product. It shares
 * the brand-family signal mark (the split ring + edge blade) and carries the
 * Network wordmark. Used on the broadcast (The Beat), the Studio, and anywhere
 * the network identity belongs. `bug` renders the compact on-air corner mark.
 */

import { LogoMarkInline } from "@/components/brand/logo-mark-inline";
import { GSN_MONOGRAM, GSN_NAME } from "@/lib/brand";

export function GsnLockup({
  variant = "full",
  size = 26,
  className = "",
}: {
  /** full = mark + "Galaxy Sports Network"; bug = mark + "GSN" (on-air corner). */
  variant?: "full" | "bug";
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMarkInline size={size} />
      {variant === "bug" ? (
        <span className="font-arch text-sm font-black tracking-[0.04em] text-ion-white">{GSN_MONOGRAM}</span>
      ) : (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.24em] text-ion-white">
            Galaxy Sports
          </span>
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.24em] text-orbital-cyan">
            Network
          </span>
        </span>
      )}
      <span className="sr-only">{GSN_NAME}</span>
    </span>
  );
}
