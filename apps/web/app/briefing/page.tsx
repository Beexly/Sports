import Link from "next/link";
import type { Metadata } from "next";
import { format, startOfDay, endOfDay } from "date-fns";
import { db } from "@sports/db";
import { auth } from "@/lib/auth";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { loadBoardPasses } from "@/lib/board/passes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Personal Briefing — Galaxy Sports Edge",
  description:
    "Your daily sports intelligence briefing. What changed, what matters, what to ignore, exposure check, and recommended learning — personalized to your Galaxy activity.",
  alternates: { canonical: "/briefing" },
};

// ─── Academy modules (rotated by day) ─────────────────────────────────────────

const ACADEMY_MODULES = [
  {
    slug: "line-movement",
    title: "Reading Line Movement",
    summary:
      "How to interpret sharp money vs. public pressure in opening-to-closing line shifts.",
    relevantWhen: "lines moved",
  },
  {
    slug: "market-efficiency",
    title: "Market Efficiency Thresholds",
    summary:
      "Why efficient markets produce no-edge outcomes and how to spot when the market is wrong.",
    relevantWhen: "passes today",
  },
  {
    slug: "confidence-calibration",
    title: "Confidence Score Calibration",
    summary:
      "What confidence 70 vs. 85 means in practice — and why it's not a win probability.",
    relevantWhen: "general",
  },
  {
    slug: "kelly-criterion",
    title: "Unit Sizing & Kelly Criterion",
    summary:
      "How to size bets relative to edge and bankroll without over-exposing on high-confidence spots.",
    relevantWhen: "general",
  },
  {
    slug: "closing-line-value",
    title: "Closing Line Value",
    summary:
      "Why CLV is the most reliable leading indicator of a sharp bettor's long-term performance.",
    relevantWhen: "general",
  },
  {
    slug: "public-betting-traps",
    title: "Public Betting Traps",
    summary:
      "How high public action inflates lines and creates situations where fading is correct.",
    relevantWhen: "public action",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickDayModule(
  hasLineMovement: boolean,
  dayOfYear: number,
): (typeof ACADEMY_MODULES)[number] {
  if (hasLineMovement) return ACADEMY_MODULES[0]!;
  return ACADEMY_MODULES[dayOfYear % ACADEMY_MODULES.length]!;
}

function confidenceLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Elite", color: "text-green-400" };
  if (score >= 65) return { label: "High", color: "text-ion-blue" };
  if (score >= 50) return { label: "Moderate", color: "text-yellow-400" };
  return { label: "Low", color: "text-gray-400" };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BriefingPage(): Promise<JSX.Element> {
  const now = new Date();
  const session = await auth().catch(() => null);
  const user = session?.user ?? null;

  const todayLabel = format(now, "EEEE, MMMM d");
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000,
  );

  // Load top pick for "What Matters"
  const topPickToday = await db.pick
    .findFirst({
      where: {
        isPublished: true,
        generatedAt: {
          gte: startOfDay(now),
          lte: endOfDay(now),
        },
      },
      orderBy: { confidence: "desc" },
      include: { game: { include: { sport: { select: { name: true } } } } },
    })
    .catch(() => null);

  // Load passes for "What to Ignore"
  const passesResult = await loadBoardPasses(now);
  const passes = passesResult.data.passes;
  const isSample = passesResult.meta.isSampleData;

  // Determine academy module based on context
  const hasLineMovement = passes.some((p) =>
    p.reason.toLowerCase().includes("line") || p.reason.toLowerCase().includes("movement"),
  );
  const academyModule = pickDayModule(hasLineMovement, dayOfYear);

  const topConf = topPickToday
    ? confidenceLabel(topPickToday.confidence)
    : null;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-carbon text-gray-100">
      <Nav />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">

        {/* ── Sample banner ─────────────────────────────────────────────── */}
        {isSample && (
          <div className="flex flex-col gap-2 border border-cyan-900 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-100 sm:flex-row sm:items-center">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ion-blue">
              Preview mode
            </span>
            <span className="break-words sm:ml-3">
              Showing sample data while live ingestion is unavailable. No real
              wager recommendations are being made.
            </span>
          </div>
        )}

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="border-b border-mineral pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
            Personal Intelligence · {todayLabel}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
            What matters today.{" "}
            <span className="text-gray-500">What to ignore.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400">
            Your briefing aggregates signals from Today&apos;s Board, Market
            Gravity, Rumor Radar, and your Tracker into one daily read.
          </p>

          {!user && (
            <div className="mt-6 flex items-center gap-4 border border-mineral bg-gray-900/50 px-4 py-3">
              <div className="h-2 w-2 shrink-0 rounded-full bg-ion-blue" />
              <p className="text-sm text-gray-400">
                <Link
                  href="/auth/signin"
                  className="font-semibold text-ion-blue hover:underline"
                >
                  Sign in
                </Link>{" "}
                to personalize your briefing — watchlist alerts, exposure
                checks, and saved picks.
              </p>
            </div>
          )}
        </section>

        {/* ── Briefing sections ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-8">

          {/* 01 — What Changed */}
          <BriefingCard
            index="01"
            label="What Changed"
            description="Line movements, new signals, and updated evidence since your last briefing."
          >
            {user ? (
              <div className="flex flex-col gap-3 border border-mineral bg-gray-900/30 p-5">
                <p className="text-sm leading-6 text-gray-400">
                  No tracked watchlist items yet. Open Today&apos;s Board and
                  save picks to your watchlist to see movement here.
                </p>
                <Link
                  href="/today"
                  className="self-start text-xs font-semibold text-ion-blue hover:underline"
                >
                  Go to Today&apos;s Board →
                </Link>
              </div>
            ) : (
              <AuthPromptInline action="track line movements and watchlist alerts" />
            )}
          </BriefingCard>

          {/* 02 — What Matters */}
          <BriefingCard
            index="02"
            label="What Matters"
            description="Today's highest-signal opportunity identified by the model."
          >
            {topPickToday ? (
              <div className="border border-mineral bg-gray-900/30 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500">
                      {topPickToday.game.sport.name}
                    </p>
                    <h3 className="mt-1 text-base font-bold text-white">
                      {topPickToday.game.awayTeamName} @{" "}
                      {topPickToday.game.homeTeamName}
                    </h3>
                    <p className="mt-1 text-sm text-gray-300">
                      {topPickToday.selection}
                    </p>
                  </div>
                  {topConf && (
                    <div className="text-right">
                      <p className={`text-xl font-black tabular-nums ${topConf.color}`}>
                        {topPickToday.confidence}
                      </p>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-gray-500">
                        {topConf.label}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Link
                    href={`/room/${topPickToday.gameId}`}
                    className="inline-flex min-h-8 items-center justify-center rounded border border-gray-700 px-3 text-xs font-semibold text-gray-200 hover:border-ion-blue hover:text-ion-blue"
                  >
                    Open game room →
                  </Link>
                  <Link
                    href="/picks"
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    See all picks
                  </Link>
                </div>
              </div>
            ) : (
              <div className="border border-mineral bg-gray-900/30 p-5">
                <p className="text-sm text-gray-400">
                  No picks have been published for today&apos;s slate yet. The
                  scoring pipeline runs each morning — check back after the
                  first game locks.
                </p>
                <Link
                  href="/board"
                  className="mt-3 inline-block text-xs font-semibold text-ion-blue hover:underline"
                >
                  See what&apos;s being scored →
                </Link>
              </div>
            )}
          </BriefingCard>

          {/* 03 — What to Ignore */}
          <BriefingCard
            index="03"
            label="What to Ignore"
            description="High-public-action games where Galaxy's model found insufficient edge."
          >
            <div className="flex flex-col gap-4">
              <p className="text-sm leading-6 text-gray-400">
                The most disciplined move is often no action. These games drew
                attention today, but the signal wasn&apos;t there.
              </p>
              {passes.length > 0 ? (
                <div className="divide-y divide-gray-800 border border-mineral">
                  {passes.slice(0, 5).map((row) => (
                    <div
                      key={row.id}
                      className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_auto]"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {row.matchup}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-gray-500">
                          {row.sport}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 sm:text-right">
                        {row.reason}
                      </p>
                    </div>
                  ))}
                  {passes.length > 5 && (
                    <div className="px-4 py-3">
                      <Link
                        href="/no-bet"
                        className="text-xs font-semibold text-ion-blue hover:underline"
                      >
                        View full pass list on No-Bet Engine →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-mineral bg-gray-900/30 px-4 py-4">
                  <p className="text-sm text-gray-500">
                    No passes logged for today&apos;s slate yet. Check back
                    after the pipeline completes its morning evaluation.
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Link
                  href="/no-bet"
                  className="text-xs font-semibold text-ion-blue hover:underline"
                >
                  Learn how the No-Bet Engine works →
                </Link>
              </div>
            </div>
          </BriefingCard>

          {/* 04 — Exposure Check */}
          <BriefingCard
            index="04"
            label="Exposure Check"
            description="A check of your open action to flag over-concentration."
          >
            {user ? (
              <div className="border border-mineral bg-gray-900/30 p-5">
                <p className="text-sm leading-6 text-gray-400">
                  Add your bets to the Tracker to see exposure analysis here.
                  Are you betting too many games in one sport? One night?
                </p>
                <Link
                  href="/tracker"
                  className="mt-3 inline-flex min-h-8 items-center justify-center rounded border border-gray-700 px-3 text-xs font-semibold text-gray-200 hover:border-ion-blue hover:text-ion-blue"
                >
                  Open Tracker →
                </Link>
              </div>
            ) : (
              <AuthPromptInline action="view exposure analysis across your open bets" />
            )}
          </BriefingCard>

          {/* 05 — Recommended Learning */}
          <BriefingCard
            index="05"
            label="Recommended Learning"
            description="Based on today's board, one Academy module that's relevant to what's happening."
          >
            <div className="border border-mineral bg-gray-900/30 p-5">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500">
                Today&apos;s module
              </p>
              <h3 className="mt-2 text-base font-bold text-white">
                {academyModule.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                {academyModule.summary}
              </p>
              <Link
                href={`/academy#${academyModule.slug}`}
                className="mt-4 inline-flex min-h-8 items-center justify-center rounded border border-gray-700 px-3 text-xs font-semibold text-gray-200 hover:border-ion-blue hover:text-ion-blue"
              >
                Read in Academy →
              </Link>
            </div>
          </BriefingCard>
        </div>

        {/* ── Quick links strip ──────────────────────────────────────────── */}
        <section
          aria-label="Quick links"
          className="border border-mineral bg-gray-900/30 p-5"
        >
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ion-blue">
            Jump to
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Today's Board", href: "/today" },
              { label: "Open Picks", href: "/picks" },
              { label: "Tracker", href: "/tracker" },
              { label: "Academy", href: "/academy" },
              { label: "Reports", href: "/reports" },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex min-h-8 items-center justify-center rounded border border-gray-700 px-3 text-xs font-semibold text-gray-300 hover:border-ion-blue hover:text-ion-blue"
              >
                {label}
              </Link>
            ))}
          </div>
        </section>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>

      <Footer />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BriefingCard({
  index,
  label,
  description,
  children,
}: {
  index: string;
  label: string;
  description: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="border border-mineral bg-gray-900/20">
      <div className="border-b border-mineral px-5 py-4">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-gray-600">
            {index}
          </span>
          <h2 className="text-base font-bold text-white">{label}</h2>
        </div>
        <p className="mt-1 pl-7 text-xs leading-5 text-gray-400">
          {description}
        </p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function AuthPromptInline({ action }: { action: string }): JSX.Element {
  return (
    <div className="flex flex-col gap-3 border border-mineral bg-gray-900/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-400">
        Sign in to {action}.
      </p>
      <Link
        href="/auth/signin"
        className="inline-flex min-h-8 shrink-0 items-center justify-center rounded border border-gray-700 px-3 text-xs font-semibold text-gray-200 hover:border-ion-blue hover:text-ion-blue"
      >
        Sign in →
      </Link>
    </div>
  );
}
