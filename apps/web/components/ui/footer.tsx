import Link from "next/link";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Picks", href: "/picks" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Performance", href: "/performance" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {/* Logo + tagline */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex w-fit items-center gap-2 group">
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
              <span className="text-lg font-bold text-white">
                SportsPicks <span className="text-brand-400">Pro</span>
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-gray-400">
              Data-driven sports analysis powered by real-time odds, sharp line
              movement, and algorithmic scoring — updated every 30 minutes.
            </p>
          </div>

          {/* Navigation links */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Navigation
            </h3>
            <nav className="flex flex-col gap-2" aria-label="Footer navigation">
              {NAV_LINKS.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="w-fit text-sm text-gray-400 transition-colors hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Legal / disclaimer */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Disclaimer
            </h3>
            <p className="text-xs leading-relaxed text-gray-500">
              SportsPicks Pro provides data-driven analysis for informational
              purposes only. We do not guarantee outcomes. Please gamble
              responsibly.
            </p>
            <p className="text-xs leading-relaxed text-gray-600">
              If you or someone you know has a gambling problem, call{" "}
              <a
                href="tel:1-800-522-4700"
                className="text-gray-500 underline underline-offset-2 hover:text-gray-300"
              >
                1-800-522-4700
              </a>{" "}
              (National Problem Gambling Helpline).
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-6 sm:flex-row">
          <p className="text-xs text-gray-600">
            &copy; 2026 SportsPicks Pro. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="text-xs text-gray-600 transition-colors hover:text-gray-400"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-xs text-gray-600 transition-colors hover:text-gray-400"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
