import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";

// ─────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Command Center — Galaxy Sports Edge",
  description:
    "Your sports intelligence operations panel. Watchlists, bet log, exposure monitoring, and tilt detection — built for bettors who treat bankroll like a portfolio.",
  alternates: { canonical: "/command" },
};

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────
// Dashboard preview cards
// ─────────────────────────────────────────────

const DASHBOARD_CARDS = [
  {
    id: "watchlist",
    label: "Watchlist",
    icon: (
      <WatchlistIcon />
    ),
    description:
      "Track specific games, players, or markets. Get alerts when signals change.",
  },
  {
    id: "bet-log",
    label: "Bet Log",
    icon: (
      <BetLogIcon />
    ),
    description:
      "Manual bet entry. Track your actual results against Galaxy's signals. ROI calculation coming.",
  },
  {
    id: "exposure",
    label: "Exposure Monitor",
    icon: (
      <ExposureIcon />
    ),
    description:
      "How much action are you putting on similar markets? Concentration warnings.",
  },
  {
    id: "tilt",
    label: "Tilt Check",
    icon: (
      <TiltIcon />
    ),
    description:
      "Behavioral flags: over-betting after losses, chasing lines, ignoring no-bet signals.",
  },
] as const;

const COMING_FEATURES = [
  "Sportsbook sync (manual import first)",
  "CLV tracking per bet",
  "Parlay exposure monitor",
  "Weekly performance summary email",
  "Behavioral scoring (are you following your own rules?)",
] as const;

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function CommandPage() {
  const session = await auth().catch(() => null);
  const entitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : null;

  const isElite = entitlements?.tier === "ELITE";

  return (
    <div className="flex min-h-screen flex-col bg-carbon">
      <Nav />

      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">

          {/* ── Hero ─────────────────────────────────── */}
          <header className="mb-16">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-blue-500/40 bg-blue-950/50 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400">
                Elite Access
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Command Center
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-gray-400">
              Your personal sports intelligence operations panel. Watchlists. Bet log.
              Exposure dashboard. Tilt detection.
            </p>
          </header>

          {/* ── Dashboard preview cards ───────────────── */}
          <section aria-label="Dashboard modules" className="mb-16">
            <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Dashboard Modules
            </p>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {DASHBOARD_CARDS.map((card) => (
                <div
                  key={card.id}
                  className="relative flex flex-col gap-4 rounded-2xl border border-mineral bg-gray-900/60 p-6"
                >
                  {/* Coming soon ribbon */}
                  <div className="absolute right-4 top-4">
                    <span className="rounded-full border border-slate-700 bg-gray-900 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                      Coming soon
                    </span>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/80 text-slate-400">
                    {card.icon}
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-white">{card.label}</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
                      {card.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Why Command Exists ────────────────────── */}
          <section
            aria-label="Philosophy"
            className="mb-16 rounded-2xl border border-slate-800 bg-slate-900/40 p-8"
          >
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              Why Command Exists
            </p>
            <p className="max-w-3xl text-base leading-relaxed text-gray-300">
              The best bettors treat this like portfolio management. Galaxy Command gives you
              the operational layer: open positions, risk concentration, decision history, and
              behavioral discipline.
            </p>
          </section>

          {/* ── Access gate ───────────────────────────── */}
          <section aria-label="Access" className="mb-16">
            {isElite ? (
              <div className="flex flex-col items-start gap-4 rounded-2xl border border-blue-600/40 bg-blue-950/20 p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-blue-400">
                  Elite Member
                </p>
                <h2 className="text-xl font-bold text-white">
                  You have full Command Center access.
                </h2>
                <p className="text-sm text-gray-400">
                  The full dashboard will be available here as modules ship.
                </p>
                <button
                  disabled
                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-blue-700/50 px-5 py-2.5 text-sm font-semibold text-blue-300"
                  aria-label="Command Center — launching soon"
                >
                  Open Command
                  <ChevronRightIcon />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-4 rounded-2xl border border-mineral bg-gray-900/60 p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  Access Required
                </p>
                <h2 className="text-xl font-bold text-white">
                  Command Center is an Elite feature.
                </h2>
                <p className="text-sm leading-relaxed text-gray-400">
                  Upgrade to Elite to unlock the full operations panel — watchlists, bet log,
                  exposure monitoring, and tilt detection.
                </p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  View Elite plans
                  <ChevronRightIcon />
                </Link>
              </div>
            )}
          </section>

          {/* ── Coming features ───────────────────────── */}
          <section aria-label="Roadmap" className="mb-16">
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
              On the Roadmap
            </p>

            <ul className="flex flex-col gap-3">
              {COMING_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-gray-400">
                  <span
                    aria-hidden="true"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </section>

          <RiskDisclosure variant="compact" className="mt-4" />
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────

function WatchlistIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  );
}

function BetLogIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
      />
    </svg>
  );
}

function ExposureIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
      />
    </svg>
  );
}

function TiltIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}
