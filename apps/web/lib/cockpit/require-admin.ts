/**
 * Per-page cockpit auth — defense-in-depth for G-1.
 */
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Redirect any non-ADMIN visitor out of a cockpit page.
 *
 * The cockpit layout gates the tree, but a PAGE's RSC payload can be requested
 * without the parent layout re-running (client-side navigation fetches only
 * the changed segment), so layout-only auth leaves page data reachable in
 * edge cases the layout never sees. Every cockpit page therefore calls this
 * at the top of its server component: unauthenticated visitors bounce to
 * sign-in (same as the layout), authenticated non-admins bounce to the public
 * home. Enforced by the cockpit-page-auth source scan — a new page that
 * forgets this fails CI.
 */
export async function requireCockpitAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/cockpit");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }
}
