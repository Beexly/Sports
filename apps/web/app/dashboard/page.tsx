import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { db } from "@sports/db";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { ManageSubscriptionButton } from "@/components/ui/manage-subscription-button";
import type { PickResult, PickType } from "@sports/types";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface RecentPick {
  id: string;
  selection: string;
  pickType: PickType;
  confidence: number;
  result: PickResult;
  generatedAt: Date;
  game: {
    homeTeamName: string;
    awayTeamName: string;
    sport: { name: string };
  };
}

// ─────────────────────────────────────────────
// Page (Server Component — protected)
// ─────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/dashboard");
  }

  const user = session.user;

  const [entitlements, subscription, recentPicks, todayPicksCount] =
    await Promise.all([
      getUserEntitlements(user.id),
      db.subscription.findUnique({
        where: { userId: user.id },
        select: {
          tier: true,
          status: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          stripeCustomerId: true,
        },
      }),
      // last 14 days of picks — for pick history
      db.pick.findMany({
        where: {
          isPublished: true,
          result: { not: "PENDING" },
          generatedAt: {
            gte: subDays(new Date(), 14),
          },
        },
        include: {
          game: {
            include: { sport: { select: { name: true } } },
          },
        },
        orderBy: { generatedAt: "desc" },
        take: 10,
      }) as Promise<RecentPick[]>,
      // today's picks count
      db.pick.count({
        where: {
          isPublished: true,
          generatedAt: {
            gte: startOfDay(new Date()),
            lte: endOfDay(new Date()),
          },
        },
      }),
    ]);

  const tierLabel =
    entitlements.tier === "FREE"
      ? "Free"
      : entitlements.tier === "PRO"
      ? "Pro"
      : "Elite";

  const tierColors: Record<string, string> = {
    FREE: "bg-gray-700 text-gray-300",
    PRO: "bg-brand-700 text-brand-200",
    ELITE: "bg-yellow-800/60 text-yellow-300",
  };

  const totalSettled = recentPicks.length;
  const wins = recentPicks.filter((p: RecentPick) => p.result === "WIN").length;
  const losses = recentPicks.filter((p: RecentPick) => p.result === "LOSS").length;
  const pushes = recentPicks.filter((p: RecentPick) => p.result === "PUSH").length;
  const winRate =
    totalSettled > 0 ? Math.round((wins / (totalSettled - pushes || 1)) * 100) : null;

  const hasStripeCustomer = !!subscription?.stripeCustomerId;

  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Nav />

      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-gray-700">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? "User avatar"}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-brand-700 text-lg font-bold text-white">
                    {user.name?.[0]?.toUpperCase() ??
                      user.email?.[0]?.toUpperCase() ??
                      "U"}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {user.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Dashboard"}
                </h1>
                <p className="text-sm text-gray-400">{user.email}</p>
              </div>
            </div>

            <span
              className={[
                "rounded-full px-3 py-1 text-sm font-semibold",
                tierColors[entitlements.tier],
              ].join(" ")}
            >
              {tierLabel} Plan
            </span>
          </div>

          {/* Upgrade nudge for free tier */}
          {entitlements.tier === "FREE" && (
            <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-brand-800 bg-brand-950/30 p-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-brand-300">
                  You&apos;re on the Free plan
                </p>
                <p className="mt-0.5 text-xs text-brand-500">
                  Upgrade to unlock unlimited picks, confidence scores, and
                  full reasoning.
                </p>
              </div>
              <Link
                href="/pricing"
                className="shrink-0 rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
              >
                Upgrade to Pro
              </Link>
            </div>
          )}

          {/* Stats row */}
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Today's Picks" value={todayPicksCount.toString()} />
            <StatCard
              label="Platform 14d"
              value={`${wins}W–${losses}L${pushes > 0 ? `–${pushes}P` : ""}`}
            />
            <StatCard
              label="Platform Win Rate (14d)"
              value={winRate !== null ? `${winRate}%` : "—"}
              highlight={winRate !== null && winRate >= 55}
            />
            <StatCard label="Tier" value={tierLabel} />
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left column: subscription card */}
            <div className="flex flex-col gap-6 lg:col-span-1">
              <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-500">
                  Subscription
                </h2>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Plan</span>
                    <span
                      className={[
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        tierColors[entitlements.tier],
                      ].join(" ")}
                    >
                      {tierLabel}
                    </span>
                  </div>

                  {subscription?.status && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Status</span>
                      <SubscriptionStatusBadge
                        status={subscription.status}
                      />
                    </div>
                  )}

                  {subscription?.currentPeriodEnd && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">
                        {subscription.cancelAtPeriodEnd
                          ? "Cancels on"
                          : "Renews on"}
                      </span>
                      <span className="text-sm text-gray-300">
                        {format(subscription.currentPeriodEnd, "MMM d, yyyy")}
                      </span>
                    </div>
                  )}

                  {subscription?.cancelAtPeriodEnd && (
                    <p className="rounded-lg bg-yellow-950/40 p-2 text-xs text-yellow-500">
                      Your subscription is set to cancel at the end of the
                      billing period.
                    </p>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  {entitlements.tier === "FREE" ? (
                    <Link
                      href="/pricing"
                      className="block w-full rounded-xl bg-brand-600 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-500"
                    >
                      Upgrade Plan
                    </Link>
                  ) : (
                    hasStripeCustomer && (
                      <ManageSubscriptionButton />
                    )
                  )}
                </div>
              </section>

              {/* Quick links */}
              <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-500">
                  Quick Links
                </h2>
                <nav className="flex flex-col gap-1">
                  {[
                    { href: "/picks", label: "Today's Picks" },
                    { href: "/performance", label: "Track Record" },
                    { href: "/pricing", label: "View Plans" },
                    { href: "/blog", label: "Analysis Blog" },
                  ].map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                    >
                      {label}
                      <svg
                        className="h-4 w-4 text-gray-700"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m8.25 4.5 7.5 7.5-7.5 7.5"
                        />
                      </svg>
                    </Link>
                  ))}
                </nav>
              </section>
            </div>

            {/* Right column: recent picks */}
            <div className="lg:col-span-2">
              <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">
                    Recent Pick History
                  </h2>
                  <Link
                    href="/picks"
                    className="text-xs text-brand-400 hover:text-brand-300"
                  >
                    View all →
                  </Link>
                </div>

                {recentPicks.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-500">
                      No settled picks yet. Check back after today&apos;s games.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-gray-800">
                    {recentPicks.map((pick: RecentPick) => (
                      <div
                        key={pick.id}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {pick.selection}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {pick.game.awayTeamName} @ {pick.game.homeTeamName}{" "}
                            &middot; {pick.game.sport.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {format(pick.generatedAt, "MMM d")}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {entitlements.canSeeConfidence && (
                            <span className="hidden text-xs text-gray-600 sm:block">
                              {pick.confidence}%
                            </span>
                          )}
                          <PickResultBadge result={pick.result} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={[
          "mt-1 text-2xl font-bold",
          highlight ? "text-green-400" : "text-white",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function SubscriptionStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-green-900/40 text-green-400",
    TRIALING: "bg-brand-900/40 text-brand-400",
    PAST_DUE: "bg-red-900/40 text-red-400",
    CANCELED: "bg-gray-800 text-gray-500",
    INCOMPLETE: "bg-yellow-900/40 text-yellow-400",
    PAUSED: "bg-gray-800 text-gray-400",
  };
  return (
    <span
      className={[
        "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
        styles[status] ?? "bg-gray-800 text-gray-400",
      ].join(" ")}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function PickResultBadge({ result }: { result: PickResult }) {
  const styles: Record<string, string> = {
    WIN: "bg-green-900/50 text-green-400",
    LOSS: "bg-red-900/50 text-red-400",
    PUSH: "bg-gray-800 text-gray-400",
    VOID: "bg-gray-800 text-gray-500",
    PENDING: "bg-gray-800 text-gray-500",
  };
  return (
    <span
      className={[
        "rounded-full px-2.5 py-0.5 text-xs font-bold",
        styles[result] ?? "bg-gray-800 text-gray-400",
      ].join(" ")}
    >
      {result}
    </span>
  );
}

// ManageSubscriptionButton is imported from components/ui/manage-subscription-button.tsx
// It is a client component that POSTs to /api/subscriptions/portal and redirects.
