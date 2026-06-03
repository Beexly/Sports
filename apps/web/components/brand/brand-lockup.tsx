import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";

export function GalaxyMark() {
  return (
    <svg className="brand-mark-svg" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path className="brand-mark-orbit" d="M11 38C8 25 18 12 32 12c9.8 0 18 6.7 20.3 15.7" />
      <path className="brand-mark-orbit brand-mark-orbit-secondary" d="M53 25c3 13-7 27-21 27-8.7 0-16.2-5.4-19.3-13" />
      <path className="brand-mark-vector" d="M10 16l44 34" />
      <path className="brand-mark-vector brand-mark-vector-cyan" d="M18 51l30-39" />
      <circle className="brand-mark-core" cx="34" cy="30" r="6" />
      <circle className="brand-mark-ping" cx="48" cy="15" r="3" />
    </svg>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand-lockup${compact ? " brand-lockup-compact" : ""}`}
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
