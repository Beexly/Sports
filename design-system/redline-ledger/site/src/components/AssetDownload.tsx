import type { ReactNode } from "react";

export function AssetDownload({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a className="asset-download" href={href} aria-label={label} download>
      {children}<span aria-hidden="true"> ↓</span>
    </a>
  );
}
