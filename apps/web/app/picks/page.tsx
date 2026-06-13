import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { isStubMode, isDemoPicksEnabled } from "@sports/db";
import { Footer } from "@/components/ui/footer";
import { PickCard } from "@/components/picks/pick-card";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import type { PublicPick, DailySlate } from "@sports/types";
import Link from "next/link";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Today's Board - Sports Picks With Reasoning Attached",
  description:
    "Live sports signals scored against the live board: spread, total, moneyline, with the full factor trail behind every pick. NFL, NCAAF, NBA, NCAAB, MLB, NHL, MLS. No certainty theater — just the reasoning.",
  alternates: { canonical: "/picks" },
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface PicksPageProps {
  searchParams: { sport?: string; date?: string; grade?: string };
}

interface PicksResponse {
  success: boolean;
  data: PublicPick[];
  meta: {
    tier: string;
    total: number;
    date: string;
    totalAvailableToday?: number;
    hitDailyLimit?: boolean;
  };
  bootstrap?: {
    message: string;
    hint?: string;
  };
}

function getRequestOrigin(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) {
    return process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
  }
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

// ─────────────────────────────────────────────
// Data fetching
// ─────────────────────────────────────────────

async function fetchPicks(
  sport?: string,
  date?: string,
  grade?: string,
  authenticated = false
): Promise<PicksResponse> {
  const appUrl = getRequestOrigin();
  const params = new URLSearchParams();
  if (sport) params.set("sport", sport);
  if (date) params.set("date", date);
  if (grade) params.set("grade", grade);
  const url = `${appUrl}/api/picks${params.toString() ? `?${params}` : ""}`;
  // Members must reach /api/picks with their session so the server tier
  // gate returns their entitled view — and that response must never land
  // in the shared data cache. Anonymous traffic keeps the cached fetch.
  const res = authenticated
    ? await fetch(url, {
        cache: "no-store",
        headers: { cookie: headers().get("cookie") ?? "" },
      })
    : await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) {
    const body = await res.json().catch(() => null) as {
      error?: string;
      bootstrapMode?: boolean;
      hint?: string;
    } | null;

    if (body?.bootstrapMode) {
      return {
        success: false,
        data: [],
        meta: {
          tier: "FREE",
          total: 0,
          date: date ?? new Date().toISOString().split("T")[0]!,
        },
        bootstrap: {
          message: body.error ?? "Today's Board is collecting live history.",
          hint: body.hint,
        },
      };
    }

    throw new Error(`Failed to fetch picks: ${res.status}`);
  }
  return res.json() as Promise<PicksResponse>;
}

async function fetchSlate(): Promise<DailySlate | null> {
  try {
    const appUrl = getRequestOrigin();
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
        canSeeEdgeScore: true,
        canGetAlerts: false,
        dailyPickLimit: 2 as number | null,
      };

  const isPro = entitlements.tier === "PRO" || entitlements.tier === "ELITE";
  const isFreeTier = entitlements.tier === "FREE";

  const [slateResult, picksResult] = await Promise.allSettled([
    fetchSlate(),
    fetchPicks(sport, date, grade, Boolean(session?.user?.id)),
  ]);

  const slate = slateResult.status === "fulfilled" ? slateResult.value : null;
  const picks: PublicPick[] =
    picksResult.status === "fulfilled" ? picksResult.value.data : [];
  const bootstrapState =
    picksResult.status === "fulfilled" ? picksResult.value.bootstrap : null;
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

  const demoActive = isStubMode() && isDemoPicksEnabled();
  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Nav />

      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">

          {demoActive && (
            <div data-testid="sample-data-banner-picks" role="status" aria-live="polite" className="mb-4 flex items-start gap-3 rounded-xl border border-yellow-900 bg-yellow-950/30 p-3 text-xs">
              <span className="mt-0.5 rounded-md bg-yellow-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-yellow-300">Sample data</span>
              <p className="flex-1 text-yellow-200/90 leading-relaxed">These picks are deterministic samples shown while live ingestion is being wired up. They never settle, they never count toward a verified record, and no win-rate claim is published from them.</p>
            </div>
          )}
          {/* Header */}
          <div className="mb-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-300">
              Today&apos;s Board
            </p>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-white">
              Today&apos;s sports signals.
            </h1>
            <p className="mt-1.5 text-sm text-gray-400">
              Every signal published today, with price, timing, risk, and the
              reason it cleared the gate.
            </p>
          </div>

          {/* Daily Slate Bar */}
          {slate && <SlateBar slate={slate} />}

          {/* Paywall Banner */}
          {isFreeTier && (
            <PaywallBanner
              hasAccount={!!session?.user}
              totalAvailableToday={
                picksResult.status === "fulfilled"
                  ? picksResult.value.meta.totalAvailableToday ?? null
                  : null
              }
              hitDailyLimit={
                picksResult.status === "fulfilled"
                  ? picksResult.value.meta.hitDailyLimit ?? false
                  : false
              }
            />
          )}

          <PicksTrustStrip />

          {/* Filters row */}
          <div className="mb-6 flex flex-col gap-3">
            {/* Sport tabs */}
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
                      "inline-flex min-h-11 items-center rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors",
                      isActive
                        ? "border-cyan-300 bg-cyan-400 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.35)]"
                        : "border-gray-700 bg-gray-900 text-gray-200 hover:border-cyan-400 hover:text-white",
                    ].join(" ")}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            {/* Grade filter + date picker */}
            <div className="flex flex-wrap items-center gap-2">
              {GRADES.map(({ key, label }) => {
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
                      "inline-flex min-h-11 items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                      isActive
                        ? "border-fuchsia-300 bg-fuchsia-400 text-slate-950 shadow-[0_0_18px_rgba(217,70,239,0.35)]"
                        : "border-gray-700 bg-gray-900 text-gray-200 hover:border-fuchsia-400 hover:text-white",
                    ].join(" ")}
                  >
                    {label}
                  </Link>
                );
              })}

              <div className="w-full sm:ml-auto sm:w-auto">
                <DatePickerForm currentDate={metaDate} currentSport={sport} currentGrade={grade} />
              </div>
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
          {!fetchError && bootstrapState && picks.length === 0 && (
            <div className="rounded-xl border border-cyan-400/25 bg-cyan-950/10 p-8 text-center shadow-[0_0_28px_rgba(34,211,238,0.10)]">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10">
                <svg
                  className="h-7 w-7 text-cyan-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.5h4.5L10 6l4 12 2.5-4.5H21"
                  />
                </svg>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-200">
                Signal gate collecting
              </p>
              <h3 className="mt-3 text-lg font-semibold text-white">
                The board is live. Public picks are still gated.
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-400">
                Galaxy Sports Edge is ingesting odds and settlement history
                before publishing customer-facing picks. This keeps the record
                clean and keeps weak signals off the board.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/methodology"
                  className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition-colors hover:border-cyan-300 hover:bg-cyan-300 hover:text-slate-950"
                >
                  Read methodology
                </Link>
                <Link
                  href="/vault"
                  className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:border-fuchsia-300 hover:text-white"
                >
                  View The Vault
                </Link>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!fetchError && !bootstrapState && picks.length === 0 && (
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-800">
                <svg
                  className="h-7 w-7 text-gray-400"
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
              <h3 className="text-base font-semibold text-white">No signals published for this date</h3>
              <p className="mt-2 text-sm text-gray-500">
                We only publish when the stack earns it. Some slates don&apos;t
                clear the gates — that&apos;s the point.
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
                  canSeeConfidence={entitlements.canSeeConfidence || pick.tier === "FREE"}
                  canSeeEdgeScore={entitlements.canSeeEdgeScore ?? false}
                  canSeeFactorBreakdown={entitlements.canSeeFactorBreakdown ?? false}
                />
              ))}
            </div>
          )}

          {/* Bottom upgrade CTA for free users */}
          {isFreeTier && picks.length > 0 && (
            <div className="mt-10 rounded-xl border border-blue-800/40 bg-blue-950/20 p-6 text-center">
              <p className="text-sm font-semibold text-blue-200">
                You&apos;re seeing {entitlements.dailyPickLimit ?? 2} free picks per day, with confidence.
              </p>
              <p className="mt-1 text-xs text-blue-400/70">
                Pro unlocks every signal and the full factor trail behind each one.
                Edge Index is public on every pick.
              </p>
              <Link
                href="/pricing"
                className="mt-4 inline-flex rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                Upgrade to Pro / $14.99/mo
              </Link>
            </div>
          )}

          {/* PRO conversion teaser for elite features */}
          {isPro && entitlements.tier === "PRO" && picks.length > 0 && (
            <div className="mt-8 rounded-xl border border-purple-800/30 bg-purple-950/10 p-4 text-center">
              <p className="text-xs text-purple-400">
                Want real-time email and push alerts on every signal?{" "}
                <Link href="/pricing" className="font-semibold underline underline-offset-2">
                  Upgrade to Elite / $24.99/mo
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
    <div className="mb-6 rounded-xl border border-cyan-400/20 bg-slate-950/80 px-5 py-4 shadow-[0_0_28px_rgba(8,145,178,0.12)]">
      <div className="flex flex-wrap items-center gap-3">
        {/* Games / picks */}
        <StatPill label="Games Today" value={String(slate.totalGames)} />
        <StatPill label="Total Picks" value={String(slate.totalPicks)} />
        <StatPill
          label="Premium Picks"
          value={String(slate.premiumPickCount)}
          highlight
        />

        {/* Recent record */}
        {record && (
          <div className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2">
            <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">{record.period}</span>
            <span className="text-xs font-bold text-green-400">{record.wins}W</span>
            <span className="mx-1 text-xs text-gray-500">/</span>
            <span className="text-xs font-bold text-red-400">{record.losses}L</span>
            {record.pushes > 0 && (
              <>
                <span className="mx-1 text-xs text-gray-500">/</span>
                <span className="text-xs font-semibold text-gray-400">{record.pushes}P</span>
              </>
            )}
          </div>
        )}

        {/* Last updated */}
        {lastUpdated && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.9)]" aria-hidden="true" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">Updated {lastUpdated}</span>
          </div>
        )}
      </div>

      {/* Sport breakdown */}
      {slate.sportBreakdown.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-cyan-400/10 pt-3">
          {slate.sportBreakdown.map(({ sport, pickCount }) => (
            <Link
              key={sport}
              href={`/picks?sport=${sport.toLowerCase()}`}
              className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-100 transition-colors hover:border-cyan-300 hover:bg-cyan-300 hover:text-slate-950"
            >
              {sport} {pickCount}
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
    <div className="min-w-[108px] rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-left">
      <p className={`text-lg font-bold ${highlight ? "text-fuchsia-300" : "text-white"}`}>
        {value}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Paywall Banner
// ─────────────────────────────────────────────

function PaywallBanner({
  hasAccount,
  totalAvailableToday,
  hitDailyLimit,
}: {
  hasAccount: boolean;
  totalAvailableToday: number | null;
  hitDailyLimit: boolean;
}) {
  const headline =
    hitDailyLimit && totalAvailableToday !== null && totalAvailableToday > 2
      ? `${totalAvailableToday} signals published today — you're seeing 2`
      : "You're on Free — two signals a day, with confidence";
  return (
    <div
      data-testid="paywall-banner"
      className="mb-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-yellow-800/50 bg-yellow-950/30 p-5 sm:flex-row sm:items-center"
    >
      <div>
        <p className="text-sm font-semibold text-yellow-300">{headline}</p>
        <p className="mt-0.5 text-xs text-yellow-300/80">
          Pro and Elite unlock every signal and the full factor trail behind each one.
        </p>
      </div>
      <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
        {!hasAccount && (
          <Link
            href="/auth/signin"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700"
          >
            Sign in
          </Link>
        )}
        <Link
          href="/pricing"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
        >
          See plans
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Date picker
// ─────────────────────────────────────────────

function PicksTrustStrip() {
  return (
    <section
      data-testid="picks-trust-strip"
      aria-labelledby="picks-trust-heading"
      className="mb-6 rounded-xl border border-gray-800 bg-gray-900/50 p-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p
            id="picks-trust-heading"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-ion-1"
          >
            Trust context
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-300">
            Picks only appear after the gate clears. The methodology page
            explains what enters the score, what stays hidden, and why some
            slates publish no pick.
          </p>
        </div>
        <Link
          href="/methodology"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition-colors hover:border-cyan-300 hover:bg-cyan-300 hover:text-slate-950"
        >
          Read methodology
        </Link>
      </div>
      <RiskDisclosure
        variant="card"
        includePastPerformance
        className="mt-4 border-gray-800 bg-gray-950/50"
      />
    </section>
  );
}

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
    <form method="get" action="/picks" className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      {currentSport && <input type="hidden" name="sport" value={currentSport} />}
      {currentGrade && <input type="hidden" name="grade" value={currentGrade} />}
      <label htmlFor="date" className="sr-only text-xs text-gray-500">Date</label>
      <input
        id="date"
        type="date"
        name="date"
        defaultValue={currentDate}
        className="min-h-11 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="min-h-11 rounded-lg bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
      >
        Apply date
      </button>
    </form>
  );
}
