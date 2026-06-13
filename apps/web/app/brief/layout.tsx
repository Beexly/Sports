import type { Metadata } from "next";

/**
 * /brief layout — public daily summary surface. Now indexable.
 */
export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export default function BriefLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
