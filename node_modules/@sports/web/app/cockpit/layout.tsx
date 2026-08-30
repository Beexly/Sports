import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Footer } from "@/components/ui/footer";
import { CockpitNav, type CockpitNavGroup } from "@/components/cockpit/cockpit-nav";
import { CockpitCommandPalette } from "@/components/cockpit/cockpit-command-palette";

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

// Grouped into scannable buckets; the client <CockpitNav> renders these with a
// live active-page indicator. Every href literal stays here so the nav-coverage
// test can pin one entry per implemented cockpit page.
const NAV: ReadonlyArray<CockpitNavGroup> = [
  {
    section: "Command",
    items: [
      { href: "/cockpit", label: "Overview", hint: "Jarvis launch assessment" },
      { href: "/cockpit/command-center", label: "Command Center", hint: "Ranked owner attention" },
      { href: "/cockpit/brief", label: "Daily brief", hint: "Today's slate snapshot" },
      { href: "/cockpit/tasks", label: "Tasks", hint: "Queue by status" },
      { href: "/cockpit/review", label: "Review", hint: "Needs-review + blocked" },
    ],
  },
  {
    section: "Picks & proof",
    items: [
      { href: "/cockpit/history", label: "History", hint: "Pick forensic ledger" },
      { href: "/cockpit/market-twin", label: "Market Twin", hint: "Upcoming board posture" },
      { href: "/cockpit/losses", label: "Losses", hint: "Autopsy authoring queue" },
      { href: "/cockpit/calibration", label: "Calibration", hint: "Model accountability" },
    ],
  },
  {
    section: "Agents & memory",
    items: [
      { href: "/cockpit/agents", label: "Agents", hint: "Six operator roles" },
      { href: "/cockpit/memory", label: "Memory", hint: "Memory review queue" },
      { href: "/cockpit/nova", label: "NOVA", hint: "Founder OS overview" },
    ],
  },
  {
    section: "Content & promo",
    items: [
      { href: "/cockpit/media", label: "Media", hint: "Draft content workflow" },
      { href: "/cockpit/content", label: "Content", hint: "Ava · draft-only engine" },
      { href: "/cockpit/studio", label: "Studio", hint: "Creator asset workspace" },
      { href: "/cockpit/journal", label: "Journal", hint: "Weekly model essay" },
      { href: "/cockpit/film-room", label: "Film Room", hint: "Visual production · spend-gated" },
      { href: "/cockpit/promotions", label: "Promotions", hint: "Bobby · sportsbook offers" },
      { href: "/cockpit/promo-desk", label: "Promo Desk", hint: "Operator registry" },
      { href: "/cockpit/bot-outbox", label: "Bot Outbox", hint: "Draft event planner" },
    ],
  },
  {
    section: "Signals & sources",
    items: [
      { href: "/cockpit/sources", label: "Sources", hint: "Source intelligence" },
      { href: "/cockpit/airwave", label: "Airwave", hint: "Pundit claim review" },
      { href: "/cockpit/listener-log", label: "Listener Log", hint: "Manual broadcast claim entry" },
      { href: "/cockpit/moderation", label: "Moderation", hint: "Community room queue" },
    ],
  },
  {
    section: "Ops",
    items: [
      { href: "/cockpit/integrity", label: "Integrity", hint: "Built/Wired/Proven/Public-safe ledger" },
      { href: "/cockpit/api-costs", label: "API Costs", hint: "Claude budget monitor" },
      { href: "/cockpit/synthetic-monitoring", label: "Synthetic Monitoring", hint: "Production probes" },
      { href: "/cockpit/settlement-hold", label: "Settlement Hold", hint: "Needs adjudication worklist" },
    ],
  },
];

export default async function CockpitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/cockpit");
  }
  // Surface the deployment's operator allow-list state. An empty ADMIN_EMAILS
  // means owner access is riding on DB roles alone — flag it until the env
  // var lands in Vercel.
  const adminEmailsConfigured = (process.env["ADMIN_EMAILS"] ?? "").trim().length > 0;
  // Signed in but not an operator: render a terminal screen. Redirecting
  // back to signin here looped forever (signin bounces signed-in users to
  // callbackUrl) — the exact ERR_TOO_MANY_REDIRECTS the owner hit.
  if (session.user.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-obsidian/60 px-6 text-center">
        <p className="rounded-md bg-caution/40 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-caution">
          Cockpit · Operators only
        </p>
        <h1 className="text-2xl font-bold text-ion-white">This flight deck needs an operator badge.</h1>
        <p className="max-w-md text-sm text-ion-2">
          You&apos;re signed in as {session.user.email ?? "a member"}, but this account doesn&apos;t
          have operator access. If this is your platform, grant your email the operator role
          (ADMIN_EMAILS) and reload.
        </p>
        <Link href="/" className="rounded-lg border border-titanium/40 px-4 py-2 text-xs text-ion-1 hover:bg-carbon/60">
          ← Back to the Galaxy
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-obsidian/60">
      <header className="border-b border-titanium/40 bg-obsidian/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span
              className="rounded-md bg-caution/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-caution"
              aria-label="Internal operator surface"
            >
              Cockpit · Internal
            </span>
            <span className="text-sm text-ion-3">Sports Intelligence OS</span>
            {!adminEmailsConfigured && (
              <span
                className="rounded-md border border-caution/60 bg-caution/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-caution"
                title="This deployment has no ADMIN_EMAILS env var — operator access relies on DB roles only. Set it in Vercel."
              >
                ADMIN_EMAILS unset
              </span>
            )}
          </div>
          <div className="text-xs text-ion-3">
            Signed in as <span className="text-ion-1">{session.user.email}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside
          className="hidden w-56 shrink-0 md:block"
          aria-label="Cockpit navigation"
        >
          <CockpitNav nav={NAV} />
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <CockpitCommandPalette />

      <Footer />
    </div>
  );
}
