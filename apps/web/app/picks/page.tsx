import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { PickCard } from "@/components/picks/pick-card";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import type { PublicPick, DailySlate } from "@sports/types";
import Link from "next/link";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface PicksPageProps {
  searchParams: { sport?: string; date?: string; grade?: string };
}

interface PicksResponse {
  success: boolean;
  data: PublicPick[];
  meta: { tier: string; total: number; date: string };
}

// ─────────────────────────────────────────────
// Data fetching
// ─────────────────────────────────────────────

async function fetchAllPicks(
  sport?: string,
  date?: string,
  grade?: string
): Promise<PicksResponse> {
  const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
  const params = new URLSearchParams();
  if (sport) params.set("sport", sport);
  if (date) params.set("date", date);
  if (grade) params.set("grade", grade);
  // Request all picks for the page (limit is server-enforced per entitlement)
  params.set("limit", "200");
  const url = `${appUrl}/api/picks${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`Failed to fetch picks: ${res.status}`);
  return res.json() as Promise<PicksResponse>;
}

async function fetchSlate(): Promise<DailySlate | null> {
  try {
    const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/picks/daily-slate`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    const body = await res.json() as { success: boolean; data: DailySlate };
    return body.data ?? null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function PicksPage({ searchParams }: PicksPageProps) {
  const { sport, date, grade } = searchParams;

  const session = await auth();
  const entitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : {
        tier: "FREE" as const,
        canSeePremiumPicks: false,
        canSeeConfidence: false,
        canSeeLineMovement: false,
        canSeeFactorBreakdown: false,
        canSeeEdgeScore: false,
        canGetAlerts: false,
        dailyPickLimit: 1 as number | null,
      };

  const isPro = entitlements.tier === "PRO" || entitlements.tier === "ELITE";
  const isFreeTier = entitlements.tier === "FREE";

  const [slateResult, picksResult] = await Promise.allSettled([
    fetchSlate(),
    fetchAllPicks(sport, date, grade),
  ]);

  const slate = slateResult.status === "fulfilled" ? slateResult.value : null;
  const picks: PublicPick[] =
    picksResult.status === "fulfilled" ? picksResult.value.data : [];
  const fetchError =
    picksResult.status === "rejected"
      ? (picksResult.reason instanceof Error
          ? picksResult.reason.message
          : "Failed to load picks.")
      : null;
  const metaDate =
    picksResult.status === "fulfilled"
      ? picksResult.value.meta.date
      : (date ?? new Date().toISOString().split("T")[0]!);

  // For free tier, only show 1 pick (limit enforced server-side in API too)
  const visiblePicks = isFreeTier ? picks.slice(0, 1) : picks;

  // High-confidence section: picks with confidence ≥ 70 (only PRO+ see actual scores)
  const highConfPicks = isPro
    ? picks.filter((p) => p.confidence !== null && p.confidence >= 70).slice(0, 4)
    : [];

  const SPORTS = [
    { key: "", label: "All" },
    { key: "nfl", label: "NFL" },
    { key: "nba", label: "NBA" },
    { key: "mlb", label: "MLB" },
    { key: "nhl", label: "NHL" },
    { key: "ncaaf", label: "NCAAF" },
    { key: "ncaab", label: "NCAAB" },
  ];

  const GRADES = [
    { key: "", label: "All Grades" },
    { key: "ELITE_PLAY", label: "Elite Play" },
    { key: "STRONG_PLAY", label: "Strong Play" },
    { key: "SOLID_PLAY", label: "Solid Play" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Nav />

      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-8">

          {/* Page header */}
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  Today&apos;s Picks
                </h1>
                <p className="mt-1.5 text-sm text-gray-400">
                  Algorithmic picks scored by consensus, edge, and market depth — updated every 30 minutes.
                </p>
              </div>
              {slate && (
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-2xl font-bold text-white">{slate.totalPicks}</p>
                  <p className="text-xs text-gray-500">picks today</p>
                </div>
              )}
            </div>
          </div>

          {/* Daily Slate Bar */}
          {slate && <SlateBar slate={slate} />}

          {/* High Confidence section — PRO+ only, shown when data exists */}
          {isPro && highConfPicks.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <span className="h-4 w-0.5 rounded-full bg-blue-500" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-white">High Confidence</h2>
                <span className="rounded-full bg-blue-900/30 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                  {highConfPicks.length} picks · 70+ confidence
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {highConfPicks.map((pick) => (
                  <PickCard
                    key={pick.id}
                    pick={pick}
                    canSeeConfidence={entitlements.canSeeConfidence}
                    canSeeEdgeScore={entitlements.canSeeEdgeScore ?? false}
                    canSeeFactorBreakdown={entitlements.canSeeFactorBreakdown ?? false}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Paywall Banner */}
          {isFreeTier && <PaywallBanner hasAccount={!!session?.user} totalPicks={slate?.totalPicks ?? picks.length} />}

          {/* Filters row */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {SPORTS.map(({ key, label }) => {
                const isActive = (sport ?? "") === key;
                const p = new URLSearchParams();
                if (key) p.set("sport", key);
                if (date) p.set("date", date);
                if (grade) p.set("grade", grade);
                return (
                  <Link
                    key={key}
                    href={`/picks${p.toString() ? `?${p}` : ""}`}
                    className={[
                      "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white",
                    ].join(" ")}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isPro && GRADES.map(({ key, label }) => {
                const isActive = (grade ?? "") === key;
                const p = new URLSearchParams();
                if (sport) p.set("sport", sport);
                if (date) p.set("date", date);
                if (key) p.set("grade", key);
                return (
                  <Link
                    key={key}
                    href={`/picks${p.toString() ? `?${p}` : ""}`}
                    className={[
                      "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                      isActive
                        ? "bg-yellow-400/20 text-yellow-300 ring-1 ring-yellow-600/40"
                        : "bg-gray-800/60 text-gray-500 hover:text-gray-300",
                    ].join(" ")}
                  >
                    {label}
                  </Link>
                );
              })}

              <div className="ml-auto">
                <DatePickerForm currentDate={metaDate} currentSport={sport} currentGrade={grade} />
              </div>
            </div>
          </div>

          {/* Error state */}
          {fetchError && (
            <div className="rounded-xl border border-red-800/60 bg-red-950/40 p-6 text-center">
              <p className="text-sm font-medium text-red-400">{fetchError}</p>
              <p className="mt-1 text-xs text-red-500/70">Please refresh or try again shortly.</p>
            </div>
          )}

          {/* Empty state */}
          {!fetchError && picks.length === 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-800">
                <svg className="h-7 w-7 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white">No picks for this date</h3>
              <p className="mt-2 text-sm text-gray-500">Picks are generated daily based on available games and odds.</p>
            </div>
          )}

          {/* All picks section header */}
          {!fetchError && visiblePicks.length > 0 && (
            <section>
              {isPro && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-4 w-0.5 rounded-full bg-gray-500" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-white">All Picks</h2>
                  <span className="text-[10px] text-gray-500">{picks.length} total</span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {visiblePicks.map((pick) => (
                  <PickCard
                    key={pick.id}
                    pick={pick}
                    canSeeConfidence={entitlements.canSeeConfidence}
                    canSeeEdgeScore={entitlements.canSeeEdgeScore ?? false}
                    canSeeFactorBreakdown={entitlements.canSeeFactorBreakdown ?? false}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Upgrade CTA for free users */}
          {isFreeTier && picks.length > 0 && (
            <div className="rounded-xl border border-blue-800/40 bg-gradient-to-b from-blue-950/30 to-gray-900/20 p-8 text-center">
              <p className="text-base font-semibold text-white">
                {(slate?.totalPicks ?? picks.length) - 1} more picks available today
              </p>
              <p className="mt-1.5 text-sm text-gray-400">
                Upgrade to Pro to unlock all picks, confidence scores, factor breakdowns, and edge scores.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/pricing"
                  className="rounded-lg bg-blue-600 px-8 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  Upgrade to Pro — $19/mo
                </Link>
                <Link
                  href="/pricing"
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  See all plans
                </Link>
              </div>
            </div>
          )}

          {/* PRO → Elite upsell */}
          {isPro && entitlements.tier === "PRO" && picks.length > 0 && (
            <div className="rounded-xl border border-purple-800/30 bg-purple-950/10 p-4 text-center">
              <p className="text-xs text-purple-400">
                Early access, daily alerts, and advanced analytics —{" "}
                <Link href="/pricing" className="font-semibold underline underline-offset-2">
                  Upgrade to Elite
                </Link>
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────
// Daily Slate Bar
// ─────────────────────────────────────────────

function SlateBar({ slate }: { slate: DailySlate }) {
  const record = slate.recentRecord;
  const lastUpdated = slate.lastUpdatedAt
    ? new Date(slate.lastUpdatedAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : null;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <StatPill label="Games Today" value={String(slate.totalGames)} />
        <StatPill label="Total Picks" value={String(slate.totalPicks)} />
        <StatPill label="Premium" value={String(slate.premiumPickCount)} highlight />

        {record && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">{record.period}:</span>
            <span className="text-xs font-bold text-green-400">{record.wins}W</span>
            <span className="text-xs text-gray-600">–</span>
            <span className="text-xs font-bold text-red-400">{record.losses}L</span>
            {record.pushes > 0 && (
              <>
                <span className="text-xs text-gray-600">–</span>
                <span className="text-xs font-semibold text-gray-400">{record.pushes}P</span>
              </>
            )}
          </div>
        )}

        {lastUpdated && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" aria-hidden="true" />
            <span className="text-[10px] text-gray-500">Updated {lastUpdated}</span>
          </div>
        )}
      </div>

      {slate.sportBreakdown.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-800/60 pt-3">
          {slate.sportBreakdown.map(({ sport, pickCount }) => (
            <Link
              key={sport}
              href={`/picks?sport=${sport.toLowerCase()}`}
              className="rounded-full bg-gray-800/60 px-2.5 py-0.5 text-[10px] font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            >
              {sport} · {pickCount}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className={`text-xl font-bold ${highlight ? "text-yellow-400" : "text-white"}`}>
        {value}
      </p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Paywall Banner
// ─────────────────────────────────────────────

function PaywallBanner({ hasAccount, totalPicks }: { hasAccount: boolean; totalPicks: number }) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-yellow-800/40 bg-gradient-to-r from-yellow-950/40 to-gray-900/40 p-5 sm:flex-row sm:items-center">
      <div>
        <p className="text-sm font-semibold text-yellow-200">Free plan · 1 pick per day</p>
        <p className="mt-0.5 text-xs text-yellow-700">
          {totalPicks > 1 ? `${totalPicks - 1} more picks available today — ` : ""}
          Upgrade to see confidence scores, factor breakdowns, and all picks.
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
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
        >
          Upgrade — $19/mo
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Date picker form
// ─────────────────────────────────────────────

function DatePickerForm({
  currentDate,
  currentSport,
  currentGrade,
}: {
  currentDate: string;
  currentSport?: string;
  currentGrade?: string;
}) {
  return (
    <form method="get" action="/picks" className="flex items-center gap-2">
      {currentSport && <input type="hidden" name="sport" value={currentSport} />}
      {currentGrade && <input type="hidden" name="grade" value={currentGrade} />}
      <label htmlFor="date" className="sr-only">Date</label>
      <input
        id="date"
        type="date"
        name="date"
        defaultValue={currentDate}
        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
