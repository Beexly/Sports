"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOutAction } from "@/lib/auth-actions";

interface MobileNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

export function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center md:hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? (
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 top-16 z-40 bg-gray-950/95 backdrop-blur-sm md:hidden">
          <div className="flex flex-col gap-1 p-4">
            <MobileLink href="/picks" onClick={() => setOpen(false)}>
              Picks
            </MobileLink>
            <MobileLink href="/performance" onClick={() => setOpen(false)}>
              Performance
            </MobileLink>
            <MobileLink href="/blog" onClick={() => setOpen(false)}>
              Blog
            </MobileLink>

            <div className="my-3 border-t border-gray-800" />

            {user ? (
              <>
                <div className="flex items-center gap-3 rounded-lg px-4 py-3">
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-gray-700">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name ?? "User"}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-brand-700 text-sm font-semibold text-white">
                        {user.name?.[0]?.toUpperCase() ?? "U"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {user.name ?? "User"}
                    </p>
                    <p className="truncate text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
                <MobileLink href="/dashboard" onClick={() => setOpen(false)}>
                  Dashboard
                </MobileLink>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    onClick={() => setOpen(false)}
                    className="w-full rounded-lg px-4 py-3 text-left text-base font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <MobileLink href="/auth/signin" onClick={() => setOpen(false)}>
                  Sign In
                </MobileLink>
                <Link
                  href="/pricing"
                  onClick={() => setOpen(false)}
                  className="mt-1 rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-lg px-4 py-3 text-base font-medium text-gray-200 transition-colors hover:bg-gray-800 hover:text-white"
    >
      {children}
    </Link>
  );
}
