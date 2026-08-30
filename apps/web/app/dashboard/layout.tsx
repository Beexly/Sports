import type { Metadata } from "next";

/**
 * /dashboard layout — authenticated user surface. Robots-disallowed in
 * /robots.txt; this noindex meta is defense-in-depth.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
