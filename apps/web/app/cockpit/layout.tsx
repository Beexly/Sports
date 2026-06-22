import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Footer } from "@/components/ui/footer";
import { CockpitNav, type CockpitNavGroup } from "@/components/cockpit/cockpit-nav";

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
    section: "Decision OS",
    items: [
      { href: "/cockpit/decision-os", label: "Decision OS", hint: "Universal intelligence index" },
      { href: "/cockpit/data-excellence", label: "Data Excellence", hint: "Quality · integrity · health" },
      { href: "/cockpit/decision-graph", label: "Decision Graph", hint: "Ontology + relationships" },
      { href: "/cockpit/evidence-engine", label: "Evidence Engine", hint: "Claim → verdict + courtroom" },
      { href: "/cockpit/jarvis-os", label: "Jarvis OS", hint: "Copilot mode contracts" },
      { href: "/cockpit/agents-os", label: "Agents OS", hint: "Constrained agent council" },
      { href: "/cockpit/revenue-os", label: "Revenue OS", hint: "Trust-gated funnel" },
      { href: "/cockpit/product-os", label: "Product OS", hint: "Opportunity · launch · moat" },
      { href: "/cockpit/page-intelligence", label: "Page Intelligence", hint: "Thinking-website contracts" },
      { href: "/cockpit/claim-safety", label: "Claim Safety", hint: "Public-claim + rights gates" },
    ],
  },
  {
    section: "Research OS",
    items: [
      { href: "/cockpit/build-board", label: "Build Board", hint: "Ranked next moves" },
      { href: "/cockpit/trust-loop", label: "Trust Loop", hint: "Devig→verdict→receipt→CLV" },
      { href: "/cockpit/forecasting-lab", label: "Forecasting Lab", hint: "Calibration + scoreline model" },
      { href: "/cockpit/competitor-intel", label: "Competitor Intel", hint: "40+ field + gap board" },
      { href: "/cockpit/autonomy", label: "Autonomy", hint: "Self-learning + drift gates" },
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
      { href: "/cockpit/api-costs", label: "API Costs", hint: "Claude budget monitor" },
      { href: "/cockpit/synthetic-monitoring", label: "Synthetic Monitoring", hint: "Production probes" },
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
        <p className="rounded-md bg-yellow-900/40 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-yellow-300">
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
              className="rounded-md bg-yellow-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-yellow-300"
              aria-label="Internal operator surface"
            >
              Cockpit · Internal
            </span>
            <span className="text-sm text-ion-3">Sports Intelligence OS</span>
            {!adminEmailsConfigured && (
              <span
                className="rounded-md border border-amber-700/60 bg-amber-900/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300"
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

      <Footer />
    </div>
  );
}
