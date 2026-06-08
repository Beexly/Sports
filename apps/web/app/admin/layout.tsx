import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * /admin layout — operator-facing only. Robots-disallowed in /robots.txt,
 * but we also set noindex/nofollow meta so any externally-linked admin URL
 * cannot leak into Google's index without crawl.
 *
 * Auth is enforced at the layout level as defense-in-depth; each page also
 * checks independently so a future page cannot accidentally omit the guard.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/auth/signin?callbackUrl=/admin");
  }

  return <>{children}</>;
}
