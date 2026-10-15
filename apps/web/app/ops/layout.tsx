import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * /ops layout — operator-facing only. Robots-disallowed in /robots.txt,
 * and noindex/nofollow meta is set here so any externally-linked ops URL
 * cannot leak into a search index. Not linked from public navigation; the
 * public surface stays projections + rankings only.
 *
 * Segment gate mirrors /admin and /cockpit: middleware verifies only that
 * a session cookie exists, so the ADMIN role check lives here (and again
 * in the page) as the substantive line of defense.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }
  return <>{children}</>;
}
