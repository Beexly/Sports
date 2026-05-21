import type { Metadata } from "next";

/**
 * /auth layout — sign-in / error surfaces. Not indexable to keep
 * authentication endpoints out of search results.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
