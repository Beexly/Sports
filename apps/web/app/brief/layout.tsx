import type { Metadata } from "next";

/**
 * /brief layout — internal preview surface during launch. Not indexable.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function BriefLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
