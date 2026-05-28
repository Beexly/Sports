"use client";
import Link from "next/link";

/**
 * Admin dashboard — quick links into the operator surface.
 *
 * The richer operational view lives at /cockpit (Jarvis launch
 * observatory). This page is a thin landing that points there and
 * links every cockpit subroute.
 */

const COCKPIT_LINKS: ReadonlyArray<{ href: string; label: string; hint: string }> = [
  { href: "/cockpit", label: "Jarvis Launch Observatory", hint: "Launch readiness, health tiles, recommended actions" },
  { href: "/cockpit/history", label: "Pick ledger", hint: "Every pick with full eligibility + risk attribution" },
  { href: "/cockpit/brief", label: "Daily brief", hint: "Internal composer" },
  { href: "/cockpit/calibration", label: "Calibration", hint: "Internal-only, read-only" },
  { href: "/cockpit/sources", label: "Sources", hint: "Source coverage" },
];

export function DashboardView() {
  return (
    <div className="flex min-h-screen flex-col bg-carbon p-8 text-gray-200">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-white">Admin dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">
            The richer operational view is at <Link href="/cockpit" className="text-brand-400 hover:text-brand-300">/cockpit</Link>.
            This page is a quick landing into the operator surface.
          </p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2">
          {COCKPIT_LINKS.map(({ href, label, hint }) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl border border-mineral bg-gray-900/60 p-4 transition-colors hover:border-gray-700 hover:bg-gray-900"
            >
              <p className="font-semibold text-white">{label}</p>
              <p className="mt-1 text-xs text-gray-500">{hint}</p>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-xs text-gray-500">
          To exit dev-mode bypass, unset <code className="rounded bg-gray-800 px-1 py-0.5 text-gray-300">DEV_FAKE_ADMIN</code> and configure real Google OAuth.
        </p>
      </div>
    </div>
  );
}

export default DashboardView;
