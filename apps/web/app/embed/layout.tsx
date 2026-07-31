import type { ReactNode } from "react";

/**
 * Minimal embed shell — no site nav/footer chrome. Branding is inside widgets.
 * (Root layout still owns <html>/<body>.)
 */
export default function EmbedLayout({ children }: { children: ReactNode }): JSX.Element {
  return <div className="min-h-0 bg-obsidian text-ion-white antialiased">{children}</div>;
}
