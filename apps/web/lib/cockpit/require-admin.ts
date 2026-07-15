/**
 * Server-side authorization gate shared by every Cockpit page.
 *
 * Cockpit routes must call this before loading owner-only data so neither an
 * unauthenticated visitor nor a signed-in non-admin can reach the surface.
 */
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Redirects requests that do not carry an authenticated ADMIN session. */
export async function requireCockpitAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/cockpit");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }
}
