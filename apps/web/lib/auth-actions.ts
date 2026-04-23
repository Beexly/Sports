"use server";

import { signOut as nextAuthSignOut } from "./auth";

/**
 * Server action that signs the user out and redirects home.
 *
 * Exported from a "use server" file so client components (like the mobile
 * nav) can bind it to a <form action={...}>. Re-using `signOut` directly
 * from lib/auth in a client component tree fails because NextAuth's export
 * cannot cross the RSC boundary.
 */
export async function signOutAction(): Promise<void> {
  await nextAuthSignOut({ redirectTo: "/" });
}
