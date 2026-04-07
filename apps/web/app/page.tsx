import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

// ─────────────────────────────────────────────
// Static data for locked preview picks
// ─────────────────────────────────────────────
const FEATURED_PICKS = [
  {
    id: "1",
    sport: "NFL",
    awayTeam: "Kansas City Chiefs",
    homeTeam: "Baltimore Ravens",
    gameTime: "Sun, Apr 13 · 4:25 PM",
    pickType: "SPREAD",
    selection: "Chiefs -3.5",
    tier: "PREMIUM",
  },
  {
    id: "2",
    sport: "NBA",
    awayTeam: "Boston Celtics",
    homeTeam: "Golden State Warriors",
    gameTime: "Sat, Apr 12 · 9:30 PM",
    pickType: "TOTAL",
    selection: "OVER 224.5",
    tier: "PREMIUM",
  },
  {
    id: "3",
    sport: "MLB",
    awayTeam: "New York Yankees",
    homeTeam: "Houston Astros",
    gameTime: "Fri, Apr 11 · 8:05 PM",
    pickType: "MONEYLINE",
    selection: "Yankees ML",
    tier: "FREE",
  },
] as const;

const TESTIMONIALS = [
  {
    quote:
      "Finally a picks service that shows its work. The confidence scores and reasoning actually explain why each pick was made.",
    name: "Marcus T.",
    handle: "@marcust_bets",
    tier: "Pro Member",
  },
  {
    quote:
      "The track record is published publicly so you can verify every result. That transparency is what separates SportsPicks Pro from the noise.",
    name: "Jennifer R.",
    handle: "@jr_sportsfan",
    tier: "Elite Member",
  },
  {
    quote:
      "The odds are updated every 30 minutes so I always know when there's line movement worth acting on.",
    name: "Derek M.",
    handle: "@derekm",
    tier: "Pro Member",
  },
];

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Nav />

      <main className="flex-1">
        {/* ── Hero ──────────────────────────────── */}
        <section className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6 lg:px-8">
          {/* background glow */}
          <div
            className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl"
            aria-hidden="true"
          >
            <div
              className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-brand-600 to-brand-400 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            />
          </div>

          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-800 bg-brand-950/50 px-4 py-1.5 text-xs font-medium text-brand-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
              </span>
              Odds updated every 30 minutes
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Data-Driven Sports Picks,{" "}
              <span className="bg-gradient-to-r from-brand-400 to-blue-300 bg-clip-text text-transparent">
                Powered by Real Odds
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400">
              Our algorithm ingests live lines from dozens of sportsbooks, scores
              every matchup for edge, and surfaces the highest-confidence picks
              — with full reasoning published for every selection.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/picks"
                className="w-full rounded-xl bg-brand-600 px-8 py-3.5 text-center text-base font-semibold text-white shadow-lg shadow-brand-900/40 transition-colors hover:bg-brand-500 sm:w-auto"
              >
                Get Free Picks
              </Link>
              <Link
                href="/pricing"
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-8 py-3.5 text-center text-base font-semibold text-gray-200 transition-colors hover:border-gray-600 hover:bg-gray-800 sm:w-auto"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* ── Stats bar ─────────────────────────── */}
        <section className="border-y border-gray-800 bg-gray-900/50">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                {
                  label: "Sports Covered",
                  value: "7",
                  description: "NFL, NBA, MLB, NHL, NCAAF, NCAAB, Soccer",
                },
                {
                  label: "Updated Every",
                  value: "30 Min",
                  description: "Live line movement tracked continuously",
                },
                {
                  label: "Track Record",
                  value: "Published",
                  description: "Every result documented publicly",
                },
              ].map(({ label, value, description }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1 text-center"
                >
                  <dt className="text-sm font-medium text-gray-500">{label}</dt>
                  <dd className="text-3xl font-extrabold text-white">{value}</dd>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── How It Works ──────────────────────── */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                How It Works
              </h2>
              <p className="mt-3 text-gray-400">
                No black boxes — every step of our process is transparent.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "We Ingest Real Odds",
                  description:
                    "Our data pipeline pulls live lines from dozens of sportsbooks every 30 minutes — spreads, totals, and moneylines across 7 sports. No simulated data, no stale numbers.",
                  icon: (
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                      />
                    </svg>
                  ),
                },
                {
                  step: "02",
                  title: "Algorithm Scores Every Game",
                  description:
                    "Our model calculates implied probabilities, detects sharp line movement, and scores each side for positive expected value. Confidence is expressed as a 0–100 score.",
                  icon: (
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                      />
                    </svg>
                  ),
                },
                {
                  step: "03",
                  title: "You Get Ranked Picks",
                  description:
                    "Picks are ranked by confidence and delivered to your dashboard daily. Free users see one pick per day; Pro and Elite subscribers get unlimited access with full reasoning.",
                  icon: (
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                      />
                    </svg>
                  ),
                },
              ].map(({ step, title, description, icon }) => (
                <div
                  key={step}
                  className="relative flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900/60 p-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600/20 text-brand-400">
                      {icon}
                    </div>
                    <span className="text-4xl font-extrabold text-gray-800 select-none">
                      {step}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                  <p className="text-sm leading-relaxed text-gray-400">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Featured Picks Preview ─────────────── */}
        <section className="bg-gray-900/40 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">
                  Today&apos;s Top Picks
                </h2>
                <p className="mt-2 text-gray-400">
                  Unlock all picks with a Pro or Elite subscription.
                </p>
              </div>
              <Link
                href="/picks"
                className="shrink-0 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-700"
              >
                View All Picks →
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURED_PICKS.map((pick) => (
                <LockedPickCard key={pick.id} pick={pick} />
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-brand-800 bg-brand-950/30 p-6 text-center">
              <p className="text-sm font-medium text-brand-300">
                Unlock unlimited picks, confidence scores, and full reasoning
              </p>
              <Link
                href="/pricing"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
              >
                Upgrade to Pro — from $19/mo
              </Link>
            </div>
          </div>
        </section>

        {/* ── Social Proof ──────────────────────── */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Trusted by Serious Bettors
            </h2>
            <p className="mt-3 text-center text-gray-400">
              Thousands of sports bettors rely on our data-driven analysis.
            </p>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {TESTIMONIALS.map(({ quote, name, handle, tier }) => (
                <figure
                  key={handle}
                  className="flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900/60 p-6"
                >
                  <blockquote className="flex-1 text-sm leading-relaxed text-gray-300">
                    &ldquo;{quote}&rdquo;
                  </blockquote>
                  <figcaption className="flex items-center gap-3 border-t border-gray-800 pt-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
                      {name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{name}</p>
                      <p className="text-xs text-gray-500">
                        {handle} &middot;{" "}
                        <span className="text-brand-400">{tier}</span>
                      </p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────── */}
        <section className="border-t border-gray-800 bg-gray-900/40 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Start with a free pick today
            </h2>
            <p className="mt-4 text-gray-400">
              No credit card required. Get one free pick per day, or upgrade for
              unlimited access.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/auth/signin"
                className="w-full rounded-xl bg-brand-600 px-8 py-3.5 text-center text-base font-semibold text-white transition-colors hover:bg-brand-500 sm:w-auto"
              >
                Get Free Picks
              </Link>
              <Link
                href="/pricing"
                className="w-full rounded-xl border border-gray-700 px-8 py-3.5 text-center text-base font-semibold text-gray-300 transition-colors hover:border-gray-600 hover:text-white sm:w-auto"
              >
                See All Plans
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

type LockedPickCardProps = {
  pick: {
    id: string;
    sport: string;
    awayTeam: string;
    homeTeam: string;
    gameTime: string;
    pickType: string;
    selection: string;
    tier: "FREE" | "PREMIUM";
  };
};

function LockedPickCard({ pick }: LockedPickCardProps) {
  const isPremium = pick.tier === "PREMIUM";

  return (
    <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 p-5">
      {/* Sport badge */}
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-semibold text-gray-300">
          {pick.sport}
        </span>
        {isPremium ? (
          <span className="flex items-center gap-1 rounded-full bg-yellow-900/40 px-2.5 py-0.5 text-xs font-semibold text-yellow-400">
            <svg
              className="h-3 w-3"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 1a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L10 13.187l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L2.818 7.125a.75.75 0 01.416-1.28l4.21-.61L9.327 1.42A.75.75 0 0110 1z"
                clipRule="evenodd"
              />
            </svg>
            Premium
          </span>
        ) : (
          <span className="rounded-full bg-green-900/40 px-2.5 py-0.5 text-xs font-semibold text-green-400">
            Free
          </span>
        )}
      </div>

      {/* Matchup */}
      <div>
        <p className="text-xs text-gray-500">{pick.gameTime}</p>
        <p className="mt-1 text-sm font-medium text-gray-200">
          {pick.awayTeam}
        </p>
        <p className="text-xs text-gray-500">vs</p>
        <p className="text-sm font-medium text-gray-200">{pick.homeTeam}</p>
      </div>

      {/* Pick details */}
      <div className="rounded-lg bg-gray-800/60 p-3">
        <p className="text-xs text-gray-500">{pick.pickType}</p>
        {isPremium ? (
          <div className="mt-1 flex items-center gap-2">
            <svg
              className="h-4 w-4 shrink-0 text-gray-600"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-semibold text-gray-500">
              Unlock with Pro
            </span>
          </div>
        ) : (
          <p className="mt-1 text-base font-bold text-white">{pick.selection}</p>
        )}
      </div>

      {/* Confidence (always locked on homepage) */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>Confidence</span>
        <span className="flex items-center gap-1 text-gray-600">
          <svg
            className="h-3.5 w-3.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
              clipRule="evenodd"
            />
          </svg>
          Pro only
        </span>
      </div>

      {/* Overlay blur for premium on the entire card edge */}
      {isPremium && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-yellow-800/30" />
      )}
    </div>
  );
}
