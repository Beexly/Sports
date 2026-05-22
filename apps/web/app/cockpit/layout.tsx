import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Footer } from "@/components/ui/footer";

/**
 * Cockpit layout — admin-only, internal-only.
 *
 * Reuses the existing `session.user.role !== "ADMIN"` pattern from
 * apps/web/app/admin/*. Visitors without an admin session are bounced
 * to /auth/signin. There is no public link to /cockpit from the public
 * nav by design.
 */

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

const NAV: ReadonlyArray<{ href: string; label: string; hint: string }> = [
  { href: "/cockpit", label: "Overview", hint: "Jarvis launch assessment" },
  { href: "/cockpit/history", label: "History", hint: "Pick forensic ledger" },
  { href: "/cockpit/agents", label: "Agents", hint: "Six operator roles" },
  { href: "/cockpit/tasks", label: "Tasks", hint: "Queue by status" },
  { href: "/cockpit/review", label: "Review", hint: "Needs-review + blocked" },
  { href: "/cockpit/media", label: "Media", hint: "Draft content workflow" },
  { href: "/cockpit/promotions", label: "Promotions", hint: "Bobby · sportsbook offers" },
  { href: "/cockpit/promo-desk", label: "Promo Desk", hint: "Operator registry" },
  { href: "/cockpit/market-twin", label: "Market Twin", hint: "Upcoming board posture" },
  { href: "/cockpit/losses", label: "Losses", hint: "Autopsy authoring queue" },
  { href: "/cockpit/brief", label: "Daily brief", hint: "Today's slate snapshot" },
  { href: "/cockpit/calibration", label: "Calibration", hint: "Model accountability" },
  { href: "/cockpit/content", label: "Content", hint: "Ava · draft-only engine" },
  { href: "/cockpit/sources", label: "Sources", hint: "Source intelligence" },
];

export default async function CockpitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/auth/signin?callbackUrl=/cockpit");
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span
              className="rounded-md bg-yellow-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-yellow-300"
              aria-label="Internal operator surface"
            >
              Cockpit · Internal
            </span>
            <span className="text-sm text-gray-500">Sports Intelligence OS</span>
          </div>
          <div className="text-xs text-gray-500">
            Signed in as <span className="text-gray-300">{session.user.email}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside
          className="hidden w-56 shrink-0 flex-col gap-1 md:flex"
          aria-label="Cockpit navigation"
        >
          {NAV.map(({ href, label, hint }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-lg border border-transparent px-3 py-2 transition-colors hover:border-gray-800 hover:bg-gray-900/60"
            >
              <p className="text-sm font-medium text-gray-200 group-hover:text-white">
                {label}
              </p>
              <p className="text-[11px] text-gray-600 group-hover:text-gray-500">
                {hint}
              </p>
            </Link>
          ))}
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <Footer />
    </div>
  );
}
