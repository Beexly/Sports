import type { Metadata } from "next";

/**
 * /admin layout — operator-facing only. Robots-disallowed in /robots.txt,
 * but we also set noindex/nofollow meta so any externally-linked admin URL
 * cannot leak into Google's index without crawl.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
