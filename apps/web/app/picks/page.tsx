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

const PICKS_TITLE = "Today's Board - Sports Picks With Reasoning Attached";
const PICKS_DESCRIPTION =
  "Live sports signals scored against the live board: spread, total, moneyline, with the full factor trail behind every pick. NFL, NCAAF, NBA, NCAAB, MLB, NHL, MLS. No certainty theater — just the reasoning.";

export const metadata: Metadata = {
  title: PICKS_TITLE,
  description: PICKS_DESCRIPTION,
  alternates: { canonical: "/picks" },
  openGraph: {
    title: PICKS_TITLE,
    description: PICKS_DESCRIPTION,
    url: "/picks",
    type: "website",
    siteName: "Galaxy Sports Edge",
  },
  twitter: { card: "summary_large_image", title: PICKS_TITLE, description: PICKS_DESCRIPTION },
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
        canSeeConfidence: true,
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

  const totalAvailableToday =
    picksResult.status === "fulfilled"
      ? (picksResult.value.meta.totalAvailableToday ?? picks.length)
      : picks.length;
  const hiddenCount = isFreeTier ? Math.max(0, totalAvailableToday - picks.length) : 0;

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
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Nav />

      {/* ── Cinematic hero header ───────────────────────────── */}
      <div
        className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Atmospheric glow layer */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% -10%, rgba(0,229,255,0.12), transparent 65%), radial-gradient(ellipse 50% 50% at 80% 30%, rgba(255,45,214,0.07), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-5xl">
          {demoActive && (
            <div data-testid="sample-data-banner-picks" role="status" aria-live="polite" className="mb-6 flex items-start gap-3 rounded-xl border border-caution/40 bg-caution/10 p-3 text-xs">
              <span className="mt-0.5 rounded-md bg-caution/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-caution">Sample data</span>
              <p className="flex-1 leading-relaxed text-caution/90">These picks are deterministic samples shown while live ingestion is being wired up. They never settle, they never count toward a verified record, and no win-rate claim is published from them.</p>
            </div>
          )}
          {/* Eyebrow */}
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-orbital-cyan"
              style={{ border: "1px solid rgba(0,229,255,0.3)", background: "rgba(0,229,255,0.08)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-orbital-cyan animate-live-pulse" aria-hidden="true" />
              Live · Today&apos;s Board
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500 sm:block">
              {metaDate}
            </span>
          </div>
          {/* Headline */}
          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            <span className="block">Scored. Gated.</span>
            <span className="block" style={{ background: "linear-gradient(90deg, #00E5FF 0%, #7A5CFF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Published with receipts.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-400">
            Every signal here cleared the gate: real odds data, model score,
            and the reason it passed — not just a headline and a direction.
          </p>
          {/* Stats strip */}
          <div className="mt-6 flex flex-wrap gap-3">
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(8,6,20,0.6)" }}
            >
              <span className="font-mono text-xs text-ink-500 uppercase tracking-[0.14em]">Published</span>
              <span className="font-bold tabular-nums text-white">{picks.length}</span>
            </div>
            {isFreeTier && totalAvailableToday > picks.length && (
              <div className="flex items-center gap-2 rounded-lg border border-plasma/30 bg-plasma/5 px-3 py-2">
                <span className="font-mono text-xs text-plasma/80 uppercase tracking-[0.14em]">Hidden (Pro)</span>
                <span className="font-bold tabular-nums text-plasma">{totalAvailableToday - picks.length}</span>
              </div>
            )}
            {isPro && (
              <div className="flex items-center gap-2 rounded-lg border border-verify/30 bg-verify/5 px-3 py-2">
                <span className="font-mono text-xs text-verify/80 uppercase tracking-[0.14em]">Full access</span>
                <svg className="h-3.5 w-3.5 text-verify" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">

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
                    className="inline-flex min-h-11 items-center rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors"
                    style={isActive
                      ? { borderColor: "#00E5FF", background: "#00E5FF", color: "#05060A", boxShadow: "0 0 18px rgba(0,229,255,0.35)" }
                      : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(8,6,20,0.75)", color: "rgba(255,255,255,0.7)" }
                    }
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
                    className="inline-flex min-h-11 items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
                    style={isActive
                      ? { borderColor: "#FF2DD6", background: "#FF2DD6", color: "#05060A", boxShadow: "0 0 18px rgba(255,45,214,0.35)" }
                      : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(8,6,20,0.75)", color: "rgba(255,255,255,0.7)" }
                    }
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
            <div className="rounded-xl border border-alert/60 bg-alert/10 p-6 text-center">
              <p className="text-sm font-medium text-alert">{fetchError}</p>
              <p className="mt-1 text-xs text-alert/70">
                Please refresh the page or try again shortly.
              </p>
            </div>
          )}

          {/* Bootstrap empty state */}
          {!fetchError && bootstrapState && picks.length === 0 && (
            <div
              className="rounded-xl p-8 text-center"
              style={{ border: "1px solid rgba(0,229,255,0.25)", background: "rgba(0,229,255,0.04)", boxShadow: "0 0 28px rgba(0,229,255,0.10)" }}
            >
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ border: "1px solid rgba(0,229,255,0.3)", background: "rgba(0,229,255,0.08)" }}
              >
                <svg
                  className="h-7 w-7 text-orbital-cyan"
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
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-orbital-cyan">
                Signal gate collecting
              </p>
              <h3 className="mt-3 text-lg font-semibold text-white">
                The board is live. Public picks are still gated.
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink-400">
                Galaxy Sports Edge is ingesting odds and settlement history
                before publishing customer-facing picks. This keeps the record
                clean and keeps weak signals off the board.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/methodology"
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-orbital-cyan transition-colors"
                  style={{ border: "1px solid rgba(0,229,255,0.3)", background: "rgba(0,229,255,0.08)" }}
                >
                  Read methodology
                </Link>
                <Link
                  href="/vault"
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-300 transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(8,6,20,0.75)" }}
                >
                  View The Vault
                </Link>
              </div>
            </div>
          )}

          {/* Empty state — no picks for date */}
          {!fetchError && !bootstrapState && picks.length === 0 && (
            <div
              className="rounded-xl p-12 text-center"
              style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(8,6,20,0.6)" }}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.08]">
                <svg
                  className="h-7 w-7 text-ink-400"
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
              <p className="mt-2 text-sm text-ink-500">
                We only publish when the stack earns it. Some slates don&apos;t
                clear the gates — that&apos;s the point.
              </p>
            </div>
          )}

          {/* Picks grid */}
          {!fetchError && picks.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {picks.map((pick, i) => (
                <PickCard
                  key={pick.id}
                  pick={pick}
                  index={i}
                  canSeeConfidence={entitlements.canSeeConfidence || pick.tier === "FREE"}
                  canSeeEdgeScore={entitlements.canSeeEdgeScore ?? false}
                  canSeeFactorBreakdown={entitlements.canSeeFactorBreakdown ?? false}
                />
              ))}
            </div>
          )}

          {/* Locked pick teasers for free users: show what's hidden */}
          {isFreeTier && hiddenCount > 0 && !fetchError && (
            <LockedPickGrid hiddenCount={hiddenCount} />
          )}

          {/* Bottom upgrade CTA for free users */}
          {isFreeTier && picks.length > 0 && (
            <div
              className="mt-10 rounded-xl p-6 text-center"
              style={{ border: "1px solid rgba(0,229,255,0.35)", background: "rgba(0,229,255,0.04)" }}
            >
              <p className="text-sm font-semibold text-orbital-cyan">
                You&apos;re seeing {entitlements.dailyPickLimit ?? 2} free picks per day, with confidence.
              </p>
              <p className="mt-1 text-xs text-ink-400">
                Pro unlocks every signal and the full factor trail behind each one.
                Edge Index is public on every pick.
              </p>
              <Link
                href="/pricing"
                className="mt-4 inline-flex rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors"
                style={{ background: "#00E5FF", color: "#05060A" }}
              >
                Upgrade to Pro / $14.99/mo
              </Link>
            </div>
          )}

          {/* PRO conversion teaser for elite features */}
          {isPro && entitlements.tier === "PRO" && picks.length > 0 && (
            <div className="mt-8 rounded-xl border border-ultraviolet/30 bg-ultraviolet/10 p-4 text-center">
              <p className="text-xs text-ultraviolet">
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
    <div
      className="mb-6 rounded-xl px-5 py-4"
      style={{ border: "1px solid rgba(0,229,255,0.18)", background: "rgba(5,6,10,0.8)", boxShadow: "0 0 28px rgba(0,229,255,0.08)" }}
    >
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
          <div
            className="rounded-lg px-3 py-2"
            style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(8,6,20,0.75)" }}
          >
            <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">{record.period}</span>
            <span className="text-xs font-bold text-verify">{record.wins}W</span>
            <span className="mx-1 text-xs text-ink-500">/</span>
            <span className="text-xs font-bold text-alert">{record.losses}L</span>
            {record.pushes > 0 && (
              <>
                <span className="mx-1 text-xs text-ink-500">/</span>
                <span className="text-xs font-semibold text-ink-400">{record.pushes}P</span>
              </>
            )}
          </div>
        )}

        {/* Last updated */}
        {lastUpdated && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-orbital-cyan shadow-[0_0_10px_rgba(0,229,255,0.9)]" aria-hidden="true" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orbital-cyan">Updated {lastUpdated}</span>
          </div>
        )}
      </div>

      {/* Sport breakdown */}
      {slate.sportBreakdown.length > 1 && (
        <div
          className="mt-3 flex flex-wrap gap-2 pt-3"
          style={{ borderTop: "1px solid rgba(0,229,255,0.10)" }}
        >
          {slate.sportBreakdown.map(({ sport, pickCount }) => (
            <Link
              key={sport}
              href={`/picks?sport=${sport.toLowerCase()}`}
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-orbital-cyan transition-colors"
              style={{ border: "1px solid rgba(0,229,255,0.25)", background: "rgba(0,229,255,0.08)" }}
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
    <div
      className="min-w-[108px] rounded-lg px-3 py-2 text-left"
      style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(8,6,20,0.75)" }}
    >
      <p className={`text-lg font-bold ${highlight ? "text-plasma" : "text-white"}`}>
        {value}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Locked pick teasers — shows free users what's hidden
// ─────────────────────────────────────────────

function LockedPickCard() {
  return (
    <Link
      href="/pricing"
      aria-label="Unlock this signal — upgrade to Pro"
      className="group relative overflow-hidden rounded-2xl p-5 transition-colors"
      style={{ border: "1px solid rgba(0,229,255,0.18)", background: "rgba(8,6,20,0.4)" }}
    >
      {/* Blur overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-obsidian/70 backdrop-blur-[3px]">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          style={{ border: "1px solid rgba(0,229,255,0.4)", background: "rgba(0,229,255,0.08)" }}
        >
          <svg className="h-4 w-4 text-orbital-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <span className="text-xs font-semibold text-orbital-cyan">Pro signal</span>
      </div>
      {/* Blurred pick shape behind */}
      <div className="space-y-3" aria-hidden="true">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              <div className="h-4 w-10 rounded bg-white/[0.06]" />
              <div className="h-4 w-20 rounded bg-white/[0.04]" />
            </div>
            <div className="h-5 w-40 rounded bg-white/[0.05]" />
            <div className="h-3.5 w-28 rounded bg-white/[0.03]" />
          </div>
          <div className="space-y-1.5 text-right">
            <div className="h-5 w-16 rounded-full bg-white/[0.05]" />
            <div className="h-3.5 w-12 rounded bg-white/[0.03]" />
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/[0.03]" />
        <div className="space-y-1">
          <div className="h-3 w-full rounded bg-white/[0.02]" />
          <div className="h-3 w-4/5 rounded bg-white/[0.02]" />
        </div>
      </div>
    </Link>
  );
}

function LockedPickGrid({ hiddenCount }: { hiddenCount: number }) {
  const showCount = Math.min(hiddenCount, 4);
  return (
    <div className="mt-5" data-testid="locked-pick-grid">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
          {hiddenCount} more signal{hiddenCount === 1 ? "" : "s"} today · Pro required
        </p>
        <Link
          href="/pricing"
          className="text-xs font-semibold text-orbital-cyan transition-colors hover:text-orbital-cyan/80"
        >
          Unlock all →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {Array.from({ length: showCount }).map((_, i) => (
          <LockedPickCard key={i} />
        ))}
      </div>
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
      className="mb-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-caution/50 bg-caution/10 p-5 sm:flex-row sm:items-center"
    >
      <div>
        <p className="text-sm font-semibold text-caution">{headline}</p>
        <p className="mt-0.5 text-xs text-caution/80">
          Pro and Elite unlock every signal and the full factor trail behind each one.
        </p>
      </div>
      <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
        {!hasAccount && (
          <Link
            href="/auth/signin"
            className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-xs font-medium text-ink-300 transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)" }}
          >
            Sign in
          </Link>
        )}
        <Link
          href="/pricing"
          className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-xs font-semibold transition-colors"
          style={{ background: "#00E5FF", color: "#05060A" }}
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
      className="mb-6 rounded-xl p-4"
      style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(8,6,20,0.5)" }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p
            id="picks-trust-heading"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-300"
          >
            Trust context
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">
            Picks only appear after the gate clears. The methodology page
            explains what enters the score, what stays hidden, and why some
            slates publish no pick.
          </p>
        </div>
        <Link
          href="/methodology"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-orbital-cyan transition-colors"
          style={{ border: "1px solid rgba(0,229,255,0.3)", background: "rgba(0,229,255,0.08)" }}
        >
          Read methodology
        </Link>
      </div>
      <RiskDisclosure
        variant="card"
        includePastPerformance
        className="mt-4 border-white/10 bg-obsidian/50"
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
      <label htmlFor="date" className="sr-only text-xs text-ink-500">Date</label>
      <input
        id="date"
        type="date"
        name="date"
        defaultValue={currentDate}
        className="min-h-11 rounded-lg px-3 py-1.5 text-sm text-ink-300 focus:outline-none focus:ring-1 focus:ring-orbital-cyan"
        style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)" }}
      />
      <button
        type="submit"
        className="min-h-11 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-300 transition-colors hover:text-white"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        Apply date
      </button>
    </form>
  );
}
