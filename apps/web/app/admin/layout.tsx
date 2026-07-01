import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * /admin layout — operator-facing only. Robots-disallowed in /robots.txt,
 * but we also set noindex/nofollow meta so any externally-linked admin URL
 * cannot leak into Google's index without crawl.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense-in-depth segment gate. Every /admin/* page already checks
  // `session.user.role === "ADMIN"` inline, but middleware only verifies a
  // session COOKIE exists (any signed-in user passes), so protection rested
  // entirely on 37 hand-rolled per-page checks with no backstop — a single
  // future page that forgets the check would be reachable by any authenticated
  // non-admin. Gate the whole segment here (mirroring /cockpit/layout.tsx) so
  // the per-page checks become redundant belt-and-suspenders, not the only line
  // of defense. redirect() throws, so children never render for non-admins.
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }
  return <>{children}</>;
}
