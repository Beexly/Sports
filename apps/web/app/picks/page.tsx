import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { isStubMode, isDemoPicksEnabled } from "@sports/db";
import { Footer } from "@/components/ui/footer";
import { PickCard } from "@/components/picks/pick-card";
import { LineFreshnessBadge } from "@/components/picks/line-freshness-badge";
import { freshestLineTimestamp } from "@/lib/picks/line-freshness";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { getCurrentPricingPhase } from "@/lib/pricing/pricing-phases";
import type { PublicPick, DailySlate, SubscriptionTier } from "@sports/types";
import Link from "next/link";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Today's Board: Sports Picks With Reasoning Attached",
  description:
    "Signals scored against the live board: spread, total, moneyline, with the full factor trail behind every pick. NFL, NCAAF, NBA, NCAAB, MLB, NHL, MLS. No certainty theater, just the reasoning.",
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
    /** Which gate darkened the board: history-gated launch vs stale-data pause. */
    kind: "gated" | "stale";
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
      reason?: string;
      hint?: string;
    } | null;

    // Both graceful dark states share the shape: the bootstrap/history gate
    // (bootstrapMode) and the stale-data kill switch (reason: "stale_data",
    // distinct body since the 2026-07-10 incident). Render both as a calm
    // board state, never an error page.
    if (body?.bootstrapMode || body?.reason === "stale_data") {
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
          kind: body?.reason === "stale_data" ? "stale" : "gated",
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
  // Teaser-board viewers: anyone WITHOUT the full paid board (FREE and
  // FANTASY alike) — drives the daily-limit banner + Pro upgrade prompts so a
  // Fantasy subscriber never sees a silently truncated board.
  const isFreeTier = !entitlements.canSeePremiumPicks;
  const hasAccount = Boolean(session?.user);
  // Phase-derived prices so this page can never advertise a rate checkout
  // won't honor when PRICING_PHASE advances (same source as /pricing).
  const phase = getCurrentPricingPhase();

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
  // Daily-limit transparency straight off the API meta (read-only — the server
  // owns these numbers). totalAvailableToday counts the FULL published slate for
  // this view (free + premium, respecting the active sport filter); the free
  // board is truncated to the teaser. We only render counts the API returns.
  const meta =
    picksResult.status === "fulfilled" ? picksResult.value.meta : null;
  const totalAvailableToday = meta?.totalAvailableToday ?? null;
  const hitDailyLimit = meta?.hitDailyLimit ?? false;

  const SPORTS = [
    { key: "", label: "All" },
    { key: "nfl", label: "NFL" },
    { key: "nba", label: "NBA" },
    { key: "mlb", label: "MLB" },
    { key: "nhl", label: "NHL" },
    { key: "ncaaf", label: "NCAAF" },
    { key: "ncaab", label: "NCAAB" },
    { key: "mls", label: "MLS" },
  ];

  const GRADES = [
    { key: "", label: "All Grades" },
    { key: "ELITE_PLAY", label: "Elite Play" },
    { key: "STRONG_PLAY", label: "Strong Play" },
    { key: "SOLID_PLAY", label: "Solid Play" },
  ];

  // Human label for an active sport filter, so an empty board blames the sport
  // (not "this date") when a filter is what produced it. Null when unfiltered
  // or the key is unknown — never a fabricated sport name.
  const activeSportLabel = sport
    ? (SPORTS.find((s) => s.key === sport.toLowerCase())?.label ?? null)
    : null;
  // The free teaser size is the single source of truth for "how many picks a
  // free viewer sees" — entitlements, never a hardcoded absolute.
  const teaserSize = entitlements.dailyPickLimit ?? 2;
  // Free board is empty while the API reports picks WERE published today for
  // this view (they're premium-tier, or premium-only for the active sport):
  // show the locked upgrade state, not "nothing published for this date".
  const lockedByPaywall =
    isFreeTier &&
    picks.length === 0 &&
    totalAvailableToday !== null &&
    totalAvailableToday > 0;

  const demoActive = isStubMode() && isDemoPicksEnabled();
  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Nav />

      <main id="main-content" className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
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
            <p className="mt-1.5 text-sm text-ion-2">
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
              totalAvailableToday={totalAvailableToday}
              hitDailyLimit={hitDailyLimit}
              dailyPickLimit={entitlements.dailyPickLimit}
              tier={entitlements.tier}
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
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "inline-flex min-h-11 items-center rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors",
                      isActive
                        ? "border-cyan-300 bg-cyan-400 text-eclipse shadow-[0_0_18px_rgba(34,211,238,0.35)]"
                        : "border-titanium bg-carbon text-ion-1 hover:border-cyan-400 hover:text-white",
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
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "inline-flex min-h-11 items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                      isActive
                        ? "border-fuchsia-300 bg-fuchsia-400 text-eclipse shadow-[0_0_18px_rgba(217,70,239,0.35)]"
                        : "border-titanium bg-carbon text-ion-1 hover:border-fuchsia-400 hover:text-white",
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
            <div className="rounded-xl border border-alert/40 bg-alert/10 p-6 text-center">
              <p className="text-sm font-medium text-alert">{fetchError}</p>
              <p className="mt-1 text-xs text-alert">
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
                {bootstrapState.kind === "stale"
                  ? "Freshness guard active"
                  : "Signal gate collecting"}
              </p>
              <h2 className="mt-3 text-lg font-semibold text-white">
                {bootstrapState.kind === "stale"
                  ? "The board is paused while fresh odds land."
                  : "The board is live. Public picks are still gated."}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ion-2">
                {bootstrapState.kind === "stale"
                  ? "Our freshness guard holds the board rather than show you " +
                    "lines that have gone stale. It reopens automatically on the " +
                    "next successful odds refresh — no stale data, ever."
                  : "We're building up odds and settlement history before we " +
                    "publish picks. That keeps the record clean and weak signals " +
                    "off the board."}
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/methodology"
                  className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition-colors hover:border-cyan-300 hover:bg-cyan-300 hover:text-eclipse"
                >
                  Read methodology
                </Link>
                <Link
                  href="/vault"
                  className="rounded-lg border border-titanium bg-carbon px-4 py-2 text-sm font-semibold text-ion-1 transition-colors hover:border-fuchsia-300 hover:text-white"
                >
                  View The Vault
                </Link>
              </div>
            </div>
          )}

          {/* Locked / upgrade state — the free board is empty but the API
              reports picks WERE published today for this view (premium-tier, or
              premium-only for the active sport). Surface the real published
              count from the API meta (never a fabricated number) and route to
              Pro, instead of falsely claiming nothing was published. */}
          {!fetchError && !bootstrapState && lockedByPaywall && (
            <div
              data-testid="picks-locked-upgrade"
              className="rounded-xl border border-blue-800/40 bg-blue-950/20 p-8 text-center"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-300">
                Full board is a Pro feature
              </p>
              <h2 className="mt-3 text-lg font-semibold text-white">
                {totalAvailableToday}{" "}
                {totalAvailableToday === 1 ? "pick" : "picks"} published for this date.
                Upgrade to Pro to see them.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ion-2">
                Free includes a daily teaser of up to {teaserSize} picks with the
                public Edge Index and no confidence scores. Pro unlocks the full
                board plus the confidence score, the full factor trail, and line
                movement behind each pick.
              </p>
              <Link
                href="/pricing"
                className="mt-6 inline-flex rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                {`Upgrade to Pro · $${phase.pro.monthly}/mo`}
              </Link>
            </div>
          )}

          {/* Empty state — genuinely nothing to show for this view. Reflect the
              active SPORT filter when one is applied, so an empty board never
              blames "this date" when a sport filter is what emptied it. */}
          {!fetchError && !bootstrapState && picks.length === 0 && !lockedByPaywall && (
            <div className="rounded-xl border border-titanium bg-carbon/60 p-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-titanium">
                <svg
                  className="h-7 w-7 text-ion-2"
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
              <h2 className="text-base font-semibold text-white">
                {activeSportLabel
                  ? `No ${activeSportLabel} signals published for this date`
                  : "No signals published for this date"}
              </h2>
              <p className="mt-2 text-sm text-ion-3">
                {activeSportLabel
                  ? `Nothing on the ${activeSportLabel} board cleared the gate for this date. Try another sport or another date.`
                  : "We only publish when the stack earns it. Some slates don't clear the gates. That's the point."}
              </p>
            </div>
          )}

          {/* Picks grid */}
          {!fetchError && picks.length > 0 && (
            <>
              {(() => {
                // Honest line-age badge: renders only when a real upstream
                // timestamp exists on today's picks (never a fake "just now").
                const freshest = freshestLineTimestamp(picks);
                return freshest ? (
                  <div className="mb-4">
                    <LineFreshnessBadge freshestIso={freshest} />
                  </div>
                ) : null;
              })()}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {picks.map((pick) => (
                <PickCard
                  key={pick.id}
                  pick={pick}
                  canSeeConfidence={entitlements.canSeeConfidence}
                  canSeeEdgeScore={entitlements.canSeeEdgeScore ?? false}
                  canSeeFactorBreakdown={entitlements.canSeeFactorBreakdown ?? false}
                />
              ))}
            </div>
            </>
          )}

          {/* Bottom upgrade CTA for free users — states the true model: the
              free board is a daily teaser (Edge Index only, no confidence
              scores), and Pro unlocks the full board. teaserSize comes from
              entitlements.dailyPickLimit, not a hardcoded absolute. */}
          {isFreeTier && picks.length > 0 && (
            <div className="mt-10 rounded-xl border border-blue-800/40 bg-blue-950/20 p-6 text-center">
              <p className="text-sm font-semibold text-blue-200">
                {hasAccount
                  ? entitlements.tier !== "FREE"
                    ? `Your plan sees the daily teaser on the betting board: up to ${teaserSize} picks with the public Edge Index, no confidence scores.`
                    : `You're on Free: a daily teaser of up to ${teaserSize} picks with the public Edge Index, no confidence scores.`
                  : `Today's free teaser: up to ${teaserSize} picks with the public Edge Index, no confidence scores.`}
              </p>
              <p className="mt-1 text-xs text-blue-300">
                Pro unlocks the full board plus the confidence score, the full factor trail, and line movement behind each pick.
              </p>
              <Link
                href="/pricing"
                className="mt-4 inline-flex rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                {`Upgrade to Pro · $${phase.pro.monthly}/mo`}
              </Link>
            </div>
          )}

          {/* PRO conversion teaser for elite features */}
          {isPro && entitlements.tier === "PRO" && picks.length > 0 && (
            <div className="mt-8 rounded-xl border border-purple-800/30 bg-purple-950/10 p-4 text-center">
              <p className="text-xs text-purple-400">
                Want real-time email and push alerts on every signal?{" "}
                <Link href="/pricing" className="font-semibold underline underline-offset-2">
                  {`Upgrade to Elite · $${phase.elite.monthly}/mo`}
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
    <div className="mb-6 rounded-xl border border-cyan-400/20 bg-obsidian/80 px-5 py-4 shadow-[0_0_28px_rgba(8,145,178,0.12)]">
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
          <div className="rounded-lg border border-titanium bg-carbon px-3 py-2">
            <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ion-2">{record.period}</span>
            <span className="text-xs font-bold text-orbital-cyan">{record.wins}W</span>
            <span className="mx-1 text-xs text-ion-3">/</span>
            <span className="text-xs font-bold text-alert">{record.losses}L</span>
            {record.pushes > 0 && (
              <>
                <span className="mx-1 text-xs text-ion-3">/</span>
                <span className="text-xs font-semibold text-ion-2">{record.pushes}P</span>
              </>
            )}
          </div>
        )}

        {/* Last updated */}
        {lastUpdated && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-orbital-cyan shadow-[0_0_10px_rgba(0,229,255,0.6)]" aria-hidden="true" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orbital-cyan">Updated {lastUpdated}</span>
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
              className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-100 transition-colors hover:border-cyan-300 hover:bg-cyan-300 hover:text-eclipse"
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
    <div className="min-w-[108px] rounded-lg border border-titanium bg-carbon px-3 py-2 text-left">
      <p className={`text-lg font-bold ${highlight ? "text-fuchsia-300" : "text-white"}`}>
        {value}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ion-2">{label}</p>
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
  dailyPickLimit,
  tier,
}: {
  hasAccount: boolean;
  totalAvailableToday: number | null;
  hitDailyLimit: boolean;
  dailyPickLimit: number | null;
  tier: SubscriptionTier;
}) {
  // True copy for the free board: it's a small daily TEASER (Edge Index only,
  // no confidence scores), not the full board. teaserSize is the entitlement's
  // dailyPickLimit — the same number the server enforces — so the banner can
  // never contradict the paywall. We present the teaser as an "up to N" CAP,
  // never an exact count: on a low- or zero-pick day the board renders fewer
  // than the limit, and an exact count would contradict the empty/locked state
  // on the same page. The published-slate line says "this date" (never "today"),
  // because the date picker / ?date= can select a non-today slate. When more
  // picks were published than the teaser shows, surface the real published count
  // and route to Pro.
  const teaserSize = dailyPickLimit ?? 2;
  // A paid non-Pro plan (FANTASY) sees only the betting teaser too — but it is
  // NOT the Free plan, so it must never be labeled "You're on Free". Give it
  // neutral limited-board wording instead.
  const isPaidTeaser = tier !== "FREE";
  const headline =
    hitDailyLimit && totalAvailableToday !== null && totalAvailableToday > teaserSize
      ? `${totalAvailableToday} picks published for this date. Upgrade to Pro to see the full board.`
      : hasAccount
        ? isPaidTeaser
          ? `Your plan sees the daily teaser on the betting board: up to ${teaserSize} picks, with the public Edge Index and no confidence scores.`
          : `You're on Free: a daily teaser of up to ${teaserSize} picks, with the public Edge Index and no confidence scores.`
        : `You're seeing today's free teaser: up to ${teaserSize} picks, with the public Edge Index and no confidence scores.`;
  return (
    <div
      data-testid="paywall-banner"
      className="mb-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-yellow-800/50 bg-yellow-950/30 p-5 sm:flex-row sm:items-center"
    >
      <div>
        <p className="text-sm font-semibold text-yellow-300">{headline}</p>
        <p className="mt-0.5 text-xs text-yellow-300/80">
          Pro and Elite add confidence scores, the full factor trail, line movement, and the tools.
        </p>
      </div>
      <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
        {!hasAccount && (
          <Link
            href="/auth/signin?callbackUrl=%2Fpicks"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-titanium bg-titanium px-4 py-2 text-xs font-medium text-ion-1 transition-colors hover:bg-titanium"
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
      className="mb-6 rounded-xl border border-titanium bg-carbon/50 p-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p
            id="picks-trust-heading"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-ion-1"
          >
            Trust context
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ion-1">
            Picks only appear after the gate clears. The methodology page
            explains what enters the score, what stays hidden, and why some
            slates publish no pick.
          </p>
        </div>
        <Link
          href="/methodology"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition-colors hover:border-cyan-300 hover:bg-cyan-300 hover:text-eclipse"
        >
          Read methodology
        </Link>
      </div>
      <RiskDisclosure
        variant="card"
        includePastPerformance
        className="mt-4 border-titanium bg-obsidian/50"
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
      <label htmlFor="date" className="sr-only text-xs text-ion-3">Date</label>
      <input
        id="date"
        type="date"
        name="date"
        defaultValue={currentDate}
        className="min-h-11 rounded-lg border border-titanium bg-titanium px-3 py-1.5 text-sm text-ion-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="min-h-11 rounded-lg bg-titanium px-3 py-1.5 text-sm font-medium text-ion-1 transition-colors hover:bg-titanium hover:text-white"
      >
        Apply date
      </button>
    </form>
  );
}
