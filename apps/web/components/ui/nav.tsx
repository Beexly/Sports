import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { MobileNav } from "./mobile-nav";

export async function Nav() {
  const session = await auth();
  const user = session?.user ?? null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex shrink-0 items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 transition-colors group-hover:bg-brand-500">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              SportsPicks <span className="text-brand-400">Pro</span>
            </span>
          </Link>
        </div>

        {/* Center nav links — desktop */}
        <div className="hidden items-center gap-1 md:flex">
          <NavLink href="/picks">Picks</NavLink>
          <NavLink href="/performance">Performance</NavLink>
          <NavLink href="/blog">Blog</NavLink>
        </div>

        {/* Right: auth — desktop */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <AuthenticatedMenu user={user} />
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/pricing"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <MobileNav user={user} />
      </nav>
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
    >
      {children}
    </Link>
  );
}

function AuthenticatedMenu({
  user,
}: {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/dashboard"
        className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
      >
        Dashboard
      </Link>
      <Link
        href="/dashboard"
        className="group relative flex items-center gap-2"
        aria-label="Go to dashboard"
      >
        <div className="h-8 w-8 overflow-hidden rounded-full ring-2 ring-gray-700 transition group-hover:ring-brand-500">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name ?? "User avatar"}
              width={32}
              height={32}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand-700 text-sm font-semibold text-white">
              {user.name?.[0]?.toUpperCase() ??
                user.email?.[0]?.toUpperCase() ??
                "U"}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
