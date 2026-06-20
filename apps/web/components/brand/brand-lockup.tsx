import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";

function GalaxyMark() {
  return (
    <svg className="brand-mark-svg" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {/* Split orbital ring */}
      <circle
        className="brand-mark-orbit"
        cx="32"
        cy="32"
        r="18"
        fill="none"
        strokeDasharray="43.5 13"
        transform="rotate(20 32 32)"
      />
      {/* Edge blade slicing through */}
      <polygon className="brand-mark-vector" points="50,14 33.84,33.84 14,50 30.16,30.16" />
      {/* Signal core + ping */}
      <circle className="brand-mark-core" cx="32" cy="32" r="4.4" />
      <circle className="brand-mark-ping" cx="45" cy="17" r="2.3" />
    </svg>
  );
}

export function BrandLockup({ compact = false, kinetic = true }: { compact?: boolean; kinetic?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand-lockup${compact ? " brand-lockup-compact" : ""}${kinetic ? " brand-lockup-kinetic" : ""}`}
      aria-label={`${BRAND_NAME} home`}
    >
      <span className="brand-mark">
        <GalaxyMark />
      </span>
      <span className="brand-wordmark">
        <span className="brand-gse">GSE</span>
        {!compact && (
          <span className="brand-full">
            <span>Galaxy</span>
            <span>Sports Edge</span>
          </span>
        )}
      </span>
    </Link>
  );
}
