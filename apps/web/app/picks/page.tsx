import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import type { PublicPick, PickType, PickResult } from "@sports/types";
import Link from "next/link";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface PicksPageProps {
  searchParams: { sport?: string; date?: string };
}

interface PicksResponse {
  success: boolean;
  data: PublicPick[];
  meta: {
    tier: string;
    total: number;
    date: string;
  };
}

// ─────────────────────────────────────────────
// Data fetching
// ─────────────────────────────────────────────

async function fetchPicks(sport?: string, date?: string): Promise<PicksResponse> {
  const appUrl =
    process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
  const params = new URLSearchParams();
  if (sport) params.set("sport", sport);
  if (date) params.set("date", date);

  const url = `${appUrl}/api/picks${params.toString() ? `?${params}` : ""}`;

  const res = await fetch(url, {
    // always fresh on the server — picks update every 30 min
    next: { revalidate: 1800 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch picks: ${res.status}`);
  }

  return res.json() as Promise<PicksResponse>;
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function PicksPage({ searchParams }: PicksPageProps) {
  const { sport, date } = searchParams;

  const session = await auth();
  const entitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : {
        tier: "FREE" as const,
        canSeePremiumPicks: false,
        canSeeConfidence: false,
        canSeeLineMovement: false,
        canGetAlerts: false,
        dailyPickLimit: 1 as number | null,
      };

  const isFreeTier = entitlements.tier === "FREE";

  let picks: PublicPick[] = [];
  let fetchError: string | null = null;
  let metaDate = date ?? new Date().toISOString().split("T")[0]!;

  try {
    const response = await fetchPicks(sport, date);
    picks = response.data;
    metaDate = response.meta.date;
  } catch (err) {
    fetchError =
      err instanceof Error ? err.message : "Failed to load picks.";
  }

  const SPORTS = [
    { key: "", label: "All Sports" },
    { key: "nfl", label: "NFL" },
    { key: "nba", label: "NBA" },
    { key: "mlb", label: "MLB" },
    { key: "nhl", label: "NHL" },
    { key: "ncaaf", label: "NCAAF" },
    { key: "ncaab", label: "NCAAB" },
    { key: "soccer", label: "Soccer" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Nav />

      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Today&apos;s Picks
            </h1>
            <p className="mt-2 text-gray-400">
              Algorithmic picks ranked by confidence — updated every 30 minutes.
            </p>
          </div>

          {/* Paywall Banner */}
          {isFreeTier && (
            <PaywallBanner hasAccount={!!session?.user} />
          )}

          {/* Filters */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Sport selector */}
            <div className="flex flex-wrap gap-2">
              {SPORTS.map(({ key, label }) => {
                const isActive = (sport ?? "") === key;
                const params = new URLSearchParams();
                if (key) params.set("sport", key);
                if (date) params.set("date", date);
                const href = `/picks${params.toString() ? `?${params}` : ""}`;
                return (
                  <Link
                    key={key}
                    href={href}
                    className={[
                      "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white",
                    ].join(" ")}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            {/* Date picker */}
            <div className="sm:ml-auto">
              <DatePickerForm currentDate={metaDate} currentSport={sport} />
            </div>
          </div>

          {/* Error state */}
          {fetchError && (
            <div className="rounded-xl border border-red-800/60 bg-red-950/40 p-6 text-center">
              <p className="text-sm font-medium text-red-400">{fetchError}</p>
              <p className="mt-1 text-xs text-red-500/70">
                Please refresh the page or try again shortly.
              </p>
            </div>
          )}

          {/* Empty state */}
          {!fetchError && picks.length === 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-800">
                <svg
                  className="h-7 w-7 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                  />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white">
                No picks for this date
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Picks are generated daily based on available games and odds.
                Check back tomorrow or select a different date.
              </p>
            </div>
          )}

          {/* Picks grid */}
          {!fetchError && picks.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {picks.map((pick) => (
                <PickCard
                  key={pick.id}
                  pick={pick}
                  canSeeConfidence={entitlements.canSeeConfidence}
                />
              ))}
            </div>
          )}

          {/* Bottom upgrade CTA */}
          {isFreeTier && picks.length > 0 && (
            <div className="mt-10 rounded-xl border border-brand-800 bg-brand-950/30 p-6 text-center">
              <p className="text-sm font-semibold text-brand-200">
                You&apos;re seeing {entitlements.dailyPickLimit ?? 1} free pick
                per day. Upgrade to unlock all picks with confidence scores and
                full reasoning.
              </p>
              <Link
                href="/pricing"
                className="mt-4 inline-flex rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
              >
                Upgrade to Pro — $19/mo
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────
// PickCard
// ─────────────────────────────────────────────

function PickCard({
  pick,
  canSeeConfidence,
}: {
  pick: PublicPick;
  canSeeConfidence: boolean;
}) {
  const gameTime = new Date(pick.game.commenceTime).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-5 transition-shadow hover:shadow-lg hover:shadow-black/40">
      {/* Sport + tier badges */}
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-semibold text-gray-300">
          {pick.game.sport}
        </span>
        <div className="flex items-center gap-2">
          <TierBadge tier={pick.tier} />
          <ResultBadge result={pick.result} />
        </div>
      </div>

      {/* Matchup */}
      <div>
        <p className="text-xs text-gray-500">{gameTime}</p>
        <div className="mt-1.5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">
              {pick.game.awayTeam}
            </p>
            <p className="text-xs text-gray-500">@</p>
            <p className="text-sm font-semibold text-white">
              {pick.game.homeTeam}
            </p>
          </div>
          <PickTypeBadge type={pick.pickType} />
        </div>
      </div>

      {/* Selection */}
      <div className="rounded-lg bg-gray-800/60 px-4 py-3">
        <p className="text-xs font-medium text-gray-500">Pick</p>
        <p className="mt-0.5 text-lg font-bold text-white">{pick.selection}</p>
        {pick.line !== 0 && (
          <p className="mt-0.5 text-xs text-gray-500">
            Line: {pick.line > 0 ? "+" : ""}
            {pick.line}
          </p>
        )}
      </div>

      {/* Confidence */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Confidence</span>
        {canSeeConfidence && pick.confidence !== null ? (
          <ConfidenceBadge confidence={pick.confidence} />
        ) : (
          <span className="flex items-center gap-1 text-xs text-gray-600">
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
        )}
      </div>

      {/* Reasoning */}
      <p className="text-xs leading-relaxed text-gray-500">{pick.reasoning}</p>
    </article>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function TierBadge({ tier }: { tier: "FREE" | "PREMIUM" }) {
  if (tier === "FREE") {
    return (
      <span className="rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-semibold text-green-400">
        Free
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-yellow-900/40 px-2 py-0.5 text-xs font-semibold text-yellow-400">
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
  );
}

function PickTypeBadge({ type }: { type: PickType }) {
  const colors: Record<PickType, string> = {
    SPREAD: "bg-blue-900/40 text-blue-400",
    MONEYLINE: "bg-purple-900/40 text-purple-400",
    TOTAL: "bg-orange-900/40 text-orange-400",
  };
  const labels: Record<PickType, string> = {
    SPREAD: "Spread",
    MONEYLINE: "ML",
    TOTAL: "Total",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[type]}`}>
      {labels[type]}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  let color = "text-gray-400 bg-gray-800";
  let label = "Lean";
  if (confidence >= 80) {
    color = "text-green-400 bg-green-900/40";
    label = "Strong";
  } else if (confidence >= 70) {
    color = "text-brand-400 bg-brand-900/40";
    label = "Good";
  } else if (confidence >= 60) {
    color = "text-yellow-400 bg-yellow-900/40";
    label = "Moderate";
  }

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${color}`}>
      {confidence}% &middot; {label}
    </span>
  );
}

function ResultBadge({ result }: { result: PickResult }) {
  if (result === "PENDING") return null;

  const styles: Record<Exclude<PickResult, "PENDING">, string> = {
    WIN: "bg-green-900/50 text-green-400",
    LOSS: "bg-red-900/50 text-red-400",
    PUSH: "bg-gray-800 text-gray-400",
    VOID: "bg-gray-800 text-gray-500",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${styles[result as Exclude<PickResult, "PENDING">]}`}>
      {result}
    </span>
  );
}

function PaywallBanner({ hasAccount }: { hasAccount: boolean }) {
  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-yellow-800/50 bg-yellow-950/30 p-5 sm:flex-row sm:items-center">
      <div>
        <p className="text-sm font-semibold text-yellow-300">
          You&apos;re on the Free plan
        </p>
        <p className="mt-0.5 text-xs text-yellow-600">
          Upgrade to Pro or Elite to unlock all picks, confidence scores, and
          detailed reasoning.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {!hasAccount && (
          <Link
            href="/auth/signin"
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700"
          >
            Sign In
          </Link>
        )}
        <Link
          href="/pricing"
          className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-500"
        >
          Upgrade Now
        </Link>
      </div>
    </div>
  );
}

// Client date picker rendered as a progressive-enhancement form
function DatePickerForm({
  currentDate,
  currentSport,
}: {
  currentDate: string;
  currentSport?: string;
}) {
  return (
    <form method="get" action="/picks" className="flex items-center gap-2">
      {currentSport && (
        <input type="hidden" name="sport" value={currentSport} />
      )}
      <label htmlFor="date" className="text-xs text-gray-500 sr-only">
        Date
      </label>
      <input
        id="date"
        type="date"
        name="date"
        defaultValue={currentDate}
        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <button
        type="submit"
        className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
      >
        Go
      </button>
    </form>
  );
}
