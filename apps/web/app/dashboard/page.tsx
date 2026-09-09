import Link from "next/link";
import { auth } from "@/lib/auth";
import { db, isStubMode, isDemoPicksEnabled } from "@sports/db";
import { resolveEffectivePerformanceGate } from "@/lib/ops/effective-performance-gate";
import { getReadinessGates } from "@sports/prediction-engine";
import { evaluatePublicPerformancePolicy } from "@/lib/performance/public-performance-policy";
import { loadPublicClvPolicy } from "@/lib/performance/public-clv-policy";

import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BillingNoticeBanner } from "@/components/ui/billing-notice-banner";
import { ManageSubscriptionButton } from "@/components/ui/manage-subscription-button";
import { getBillingNotice } from "@/lib/billing/notice";
import { getUserEntitlements } from "@/lib/entitlements";
import { reconcileUserEntitlement } from "@/lib/billing/reconcile-entitlements";
import { BRAND_NAME } from "@/lib/brand";
import { getCurrentPricingPhase } from "@/lib/pricing/pricing-phases";
import { NUMERIC_TEXT_CLASS } from "@/lib/format/stat";
import { subDays, format, startOfDay, endOfDay } from "date-fns";
import { comparePicksByRanking } from "@/lib/ranking/sort-key";

export const dynamic = "force-dynamic";

type TodayPick = {
  id: string;
  pickType: string;
  selection: string;
  line: number;
  confidence: number;
  edgeScore: number;
  pickGrade: string;
  riskLevel: string;
  reasoningShort: string;
  isFeatured: boolean;
  result: string;
  generatedAt: Date;
  factorBreakdown?: unknown;
  game: {
    homeTeamName: string;
    awayTeamName: string;
    commenceTime: Date;
    sport: { name: string };
  };
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { upgraded?: string };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian text-ion-1">
        <div className="rounded-2xl border border-mineral bg-carbon/60 p-8 text-center">
          <h1 className="text-2xl font-black tracking-tight text-ion-white">Sign in required</h1>
          <p className="mt-2 text-sm text-ion-1">
            The customer dashboard requires an authenticated session.
          </p>
          <Link
            href="/auth/signin?callbackUrl=/dashboard"
            className="mt-5 inline-block rounded-xl bg-plasma px-5 py-2 text-sm font-semibold text-plasma-ink transition-colors hover:bg-plasma-glow"
          >
            Continue to sign in
          </Link>
        </div>
      </div>
    );
  }

  const user = session.user;
  const gates = getReadinessGates();
  const effectivePerf = await resolveEffectivePerformanceGate();
  const recentSince = subDays(new Date(), 14);
  const stubMode = isStubMode();
  const demoActive = isDemoPicksEnabled() && stubMode;

  // Production seed-row exclusion (defense-in-depth), mirroring
  // lib/dashboard/load-performance.ts. The dev seed tags rows with
  // modelVersion="v5.0.0-seed"; in production there should be zero, but these
  // inline counts feed the member-facing Today's Picks list and the canonical
  // settled/win/loss/push totals, so a stray seed row must not leak into them.
  // Empty spread in dev/test → behavior unchanged.
  const excludeSeedInProd =
    process.env.NODE_ENV === "production"
      ? { NOT: { modelVersion: "v5.0.0-seed" } }
      : {};

  // Self-healing backstop for a slow/failed billing webhook. When the member has
  // just returned from Stripe checkout (?upgraded=true), positively confirm their
  // live Stripe subscription and grant the paid tier NOW, before we read
  // entitlements below — so access is immediate even if the webhook never landed.
  // Strictly confirm-or-grant: it never revokes on this surface and never throws.
  if (searchParams?.upgraded === "true") {
    await reconcileUserEntitlement(user.id);
  }

  // Server-side tier gate (rule #3): FREE members see their 1 daily FREE
  // pick without confidence; PRO+ sees the full slate with confidence.
  const entitlements = await getUserEntitlements(user.id);
  const phaseName = getCurrentPricingPhase().name;

  // A ZERO A CUSTOMER CANNOT DISTINGUISH FROM AN OUTAGE IS A FALSE STATEMENT
  // (C-179). Every count below fails soft so one dead query cannot take down a
  // signed-in member's dashboard - which is right - but the fallbacks are 0 and
  // [], so a database outage rendered "0 settled, 0 wins, no picks today" and a
  // member read it as an empty account rather than a broken load. /board and
  // /picks already say DB_UNREACHABLE out loud; this surface did not.
  //
  // The flag is set by the fallback itself, so it cannot drift from the catches
  // it describes: adding a query without routing its catch through here is the
  // only way to reintroduce a silent zero, and the test pins the count.
  // C-205a. THREE questions, not one, because the banner makes a CLAIM about
  // counts. `dbDegraded` answers "did anything fail"; `countsDegraded` answers
  // "did a COUNT fail". Raising the counts banner on a list-only failure told
  // members that displayed counts had fallen back to zero when every count had
  // in fact succeeded - a false statement, inside the fix whose whole purpose
  // is not making false statements. The banner now says only what failed.
  let dbDegraded = false;
  let countsDegraded = false;
  const softZero = (): number => {
    dbDegraded = true;
    countsDegraded = true;
    return 0;
  };
  // The list needs its OWN flag, not just the shared one. `dbDegraded` drives a
  // banner that talks about COUNTS reading zero; the list below renders a
  // different positive claim - "No picks published yet today" - and an empty
  // array from a failed findMany is indistinguishable from a genuinely empty
  // slate. Worse, the count query is independent, so a lone list failure prints
  // "Today's Picks 6" directly above "No picks published yet today". Same
  // defect class as C-179, one surface deeper than that fix reached.
  let todayPicksDegraded = false;
  const softTodayPicks = (): TodayPick[] => {
    dbDegraded = true;
    todayPicksDegraded = true;
    return [];
  };

  // A THIRD flag, for the counts that become a PUBLISHED RECORD (C-201).
  // `softZero` is right for a display count - a zero next to a banner is a
  // degraded number a reader can discount. It is NOT right for the inputs to
  // evaluatePublicPerformancePolicy, because those get COMBINED: if
  // canonicalSettledCount succeeds with a real total while canonicalWins fails
  // to its fallback, the page renders a zero-win record and the win rate that
  // follows from it, as a statement of record. A fabricated performance claim
  // is the single worst output this product can produce, and mixing one real
  // count with one fallback zero manufactures one. (Written without a literal
  // percentage on purpose: no-unsupported-performance-claims reads any
  // hardcoded percent beside "win rate" on a customer page as a claim, and it
  // is right to - the guard does not know a comment from a headline.)
  // So the record is withheld entirely if ANY of its inputs failed.
  //
  // C-216, found in review. TWO corrections to the C-201 shape above.
  //
  // (a) SCOPE. Every count that reaches evaluatePublicPerformancePolicy is a
  // record input, not just the five that form the W-L-P-V string. The recent-
  // window pair drives the ALL_RECENT_PICKS_BOOTSTRAP blocker, and that blocker
  // is written `recentTotal > 0 && recentBootstrap === recentTotal` - so a
  // failed recentTotalCount falling back to 0 does not merely lose a number, it
  // SATISFIES the blocker's guard and the gate opens. A partial outage was
  // therefore able to publish a performance record whose required history was
  // unreadable, which is the exact failure C-201 was written to stop, reached
  // by a different door. The pending/bootstrap pair feeds the operator message
  // for the same policy call. All four move here.
  //
  // (b) The banner's CLAIM. softPerfZero used to raise countsDegraded, which
  // makes the banner tell a member that "some counts below are showing zero".
  // None of these counts is rendered as a number: the record reads
  // "Unavailable" and the win rate reads an em-less dash. Saying the visible
  // counts fell back when the one visible count read fine is a false statement,
  // the same C-205a defect one flag over. countsDegraded now belongs to
  // softZero alone, which after this change guards exactly one displayed count.
  let perfDegraded = false;
  const softPerfZero = (): number => {
    dbDegraded = true;
    perfDegraded = true;
    return 0;
  };

  const [
    todayPicks,
    todayPicksCount,
    canonicalSettledCount,
    canonicalWins,
    canonicalLosses,
    canonicalPushes,
    canonicalVoids,
    canonicalPendingCount,
    bootstrapSettledCount,
    recentTotalCount,
    recentBootstrapCount,
    billingNotice,
  ] = await Promise.all([
    db.pick
      .findMany({
        where: {
          isPublished: true,
          isBootstrap: false,
          ...excludeSeedInProd,
          generatedAt: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) },
          ...(entitlements.canSeePremiumPicks ? {} : { tier: "FREE" }),
        },
        include: { game: { include: { sport: { select: { name: true } } } } },
        orderBy: [{ generatedAt: "desc" }],
        take: entitlements.canSeePremiumPicks ? 24 : (entitlements.dailyPickLimit ?? 1),
      })
      .then((rows) =>
        [...rows]
          .sort(comparePicksByRanking)
          .slice(0, entitlements.canSeePremiumPicks ? 6 : (entitlements.dailyPickLimit ?? 1)),
      )
      .catch(softTodayPicks),
    db.pick
      .count({
        where: {
          isPublished: true,
          // isBootstrap: false to MATCH THE LIST ABOVE (C-241, Devin). The list
          // excludes bootstrap rows and this count did not, so a member could
          // read "Today's Picks 7" directly above a slate showing fewer - the
          // same "count above an empty list" defect the comment at the top of
          // this file describes, but always-on rather than only during a DB
          // failure. Every other count in this block already carries the flag;
          // this one was the exception. A number that does not correspond to
          // what is shown beneath it is a fabricated stat.
          isBootstrap: false,
          ...excludeSeedInProd,
          generatedAt: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) },
        },
      })
      .catch(softZero),
    db.pick
      .count({
        where: {
          result: { in: ["WIN", "LOSS", "PUSH"] },
          isPublished: true,
          isBootstrap: false,
          ...excludeSeedInProd,
        },
      })
      .catch(softPerfZero),
    db.pick.count({ where: { result: "WIN", isPublished: true, isBootstrap: false, ...excludeSeedInProd } }).catch(softPerfZero),
    db.pick.count({ where: { result: "LOSS", isPublished: true, isBootstrap: false, ...excludeSeedInProd } }).catch(softPerfZero),
    db.pick.count({ where: { result: "PUSH", isPublished: true, isBootstrap: false, ...excludeSeedInProd } }).catch(softPerfZero),
    db.pick.count({ where: { result: "VOID", isPublished: true, isBootstrap: false, ...excludeSeedInProd } }).catch(softPerfZero),
    db.pick.count({ where: { result: "PENDING", isPublished: true, isBootstrap: false, ...excludeSeedInProd } }).catch(softPerfZero),
    db.pick
      .count({
        where: {
          result: { in: ["WIN", "LOSS", "PUSH"] },
          isPublished: true,
          isBootstrap: true,
        },
      })
      .catch(softPerfZero),
    // The recent-window pair: policy inputs, never displayed. A zero here is
    // not a small number, it is the ALL_RECENT_PICKS_BOOTSTRAP blocker's
    // off-switch (C-216).
    db.pick.count({ where: { generatedAt: { gte: recentSince } } }).catch(softPerfZero),
    db.pick.count({ where: { generatedAt: { gte: recentSince }, isBootstrap: true } }).catch(softPerfZero),
    getBillingNotice(user.id),
  ]);

  // Loaded independently, not folded into the Promise.all array above: that
  // array's correctness already depends on strict positional ordering
  // (documented failure mode — see dashboard-load-performance.test.ts), and
  // the CLV policy has its own dedicated loader. Fail OPEN to the same
  // gated/NOT_READY shape on a DB error rather than losing the whole page.
  const clvPolicy = await loadPublicClvPolicy(db, {
    canExposePerformanceStats: effectivePerf.canExposePerformanceStats,
    minGradedForPublic: gates.minSettledPicksForLearning,
  }).catch(() => null);

  const performancePolicy = evaluatePublicPerformancePolicy({
    canExposePerformanceStats: effectivePerf.canExposePerformanceStats,
    minSettledPicksForLearning: gates.minSettledPicksForLearning,
    canonicalSettledCount,
    bootstrapCount: bootstrapSettledCount,
    pendingCount: canonicalPendingCount,
    canonicalWins,
    canonicalLosses,
    canonicalPushes,
    canonicalVoids,
    recentTotalCount,
    recentBootstrapCount,
    clv: clvPolicy,
  });

  // perfDegraded withholds the record even when the gate would expose it: a
  // partial outage must read as "not available", never as a real record.
  const performanceVisible = performancePolicy.canExposePerformanceStats && !perfDegraded;
  const recordDisplay = perfDegraded
    ? "Unavailable"
    : performanceVisible
      ? performancePolicy.publicRecord
      : "Collecting…";
  const winRateDisplay =
    performanceVisible && performancePolicy.publicWinRate !== null
      ? `${performancePolicy.publicWinRate}%`
      : "—";

  // C-246, Devin. `publicMessage` comes out of the SAME policy call as the
  // record, fed by the same counts softPerfZero falls back to ZERO. C-201 and
  // C-216 established that the record is withheld entirely if any of those
  // inputs failed, because one real count mixed with one fallback zero
  // manufactures a claim - and then the message from that identical policy
  // object was rendered anyway, in two places, describing a sample size and a
  // gate status derived from zeros. One field over from the defect those rows
  // fixed. A member during an outage read "Unavailable" in the record card and
  // baseline-collection progress immediately beneath it.
  //
  // The replacement names what actually failed and refuses to characterise the
  // sample, because the sample is exactly what we could not read.
  const performanceMessage = perfDegraded
    ? "We could not read the settled-pick counts just now, so there is nothing to report about the verified record or the baseline. That is a read failure on our side, not a statement about the sample."
    : performancePolicy.publicMessage;
  const winRateHighlight =
    performanceVisible &&
    performancePolicy.publicWinRate !== null &&
    performancePolicy.publicWinRate >= 55;
  // The band label is assembled by evaluatePublicPerformancePolicy() so the
  // confidence level travels with the interval it describes. Never rebuild it here.
  const winRateSubtext = performanceVisible
    ? performancePolicy.publicWinRateCiLabel
    : null;
  // S1 — the headline slot: CLV beat-close rate, or an explicit not-ready
  // state. Rendered above win-rate on purpose (never in place of it — win
  // rate stays as a secondary field below). See headlineMetric's own
  // docstring for why: win rate is gameable by pick selection, CLV is the
  // sharp-credible signal touts almost never show.
  const headline = performancePolicy.headlineMetric;

  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <header className="border-b border-mineral/60 bg-obsidian/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-sm font-semibold text-ion-white">
            {BRAND_NAME}
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-ion-2">
            <Link href="/picks" className="inline-flex min-h-11 items-center py-2 hover:text-ion-white">Picks</Link>
            <Link href="/performance" className="inline-flex min-h-11 items-center py-2 hover:text-ion-white">Performance</Link>
            <Link href="/pricing" className="inline-flex min-h-11 items-center py-2 hover:text-ion-white">Pricing</Link>
            <span aria-hidden="true" className="hidden text-mineral-hi sm:inline">|</span>
            <span className="max-w-[45vw] truncate text-ion-2">{user.email}</span>
          </nav>
        </div>
      </header>

      <main id="main-content" className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {dbDegraded && (
            <div
              role="status"
              className="mb-6 flex flex-col gap-2 rounded-lg border border-alert/40 bg-alert/10 px-4 py-3 text-sm text-ion-1 sm:flex-row sm:items-center"
            >
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-alert">
                Data store unreachable
              </span>
              <span className="break-words sm:ml-3">
                {countsDegraded
                  ? "At least one query did not respond, so some counts below are showing zero because they could not be read - not because they are zero. Nothing here has been changed."
                  : "A query did not respond. The counts below did read correctly; the section that could not load says so where it appears. Nothing here has been changed."}
              </span>
            </div>
          )}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-orbital-cyan">
                Member dashboard
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-ion-white">
                {user.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Dashboard"}
              </h1>
              <p className="mt-1 text-sm text-ion-2">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {demoActive && (
                <span
                  data-testid="dashboard-sample-mode"
                  aria-label="Sample mode: picks are deterministic samples, not live data"
                  className="rounded-md bg-caution/15 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-caution"
                  title="Stub mode + demo samples: picks shown are deterministic samples, not live model output."
                >
                  Sample mode
                </span>
              )}
              <span className="rounded-full bg-titanium px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ion-1">
                {user.role === "ADMIN" ? "Admin" : "Member"}
              </span>
            </div>
          </div>

          {demoActive && <SampleDataBanner />}

          {/* Purchase-success moment: Stripe checkout returns to
              /dashboard?upgraded=true. One-time (URL-param-driven) banner that
              confirms the locked founding rate and points at what just unlocked
              — first-session activation is the strongest churn lever. */}
          {/* The success banner is gated on the RESOLVED entitlement, not the URL
              param: a buyer whose webhook is still retrying (or who typed the URL)
              must never be told access is live when the board will show the free
              tier. The pending state below is what they see instead. */}
          {searchParams?.upgraded === "true" && entitlements.tier === "FREE" && (
            <div
              data-testid="upgrade-pending-banner"
              className="mb-6 rounded-xl border border-ion-2/50 bg-ion-2/10 p-5"
            >
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ion-1">
                Payment received. Activating your plan.
              </p>
              <p className="mt-2 text-sm font-semibold text-ion-white">
                Your access is being confirmed with the payment processor.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ion-1">
                This usually completes within a minute. Refresh this page; if it still shows
                the free tier after a few minutes, reply to your receipt email or use the
                contact page and we will confirm it by hand.
              </p>
            </div>
          )}
          {searchParams?.upgraded === "true" && entitlements.tier !== "FREE" && (
            <div
              data-testid="upgrade-success-banner"
              className="mb-6 rounded-xl border border-verify/50 bg-verify/10 p-5"
            >
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-verify">
                Subscription active
              </p>
              <p className="mt-2 text-sm font-semibold text-ion-white">
                You&apos;re in — at the {phaseName} rate, locked for the life of your
                subscription.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ion-1">
                {entitlements.tier === "FANTASY"
                  ? "The fantasy suite is now live on your account."
                  : "Confidence scores, the full factor trail, and line movement are now live on every pick."}
                {entitlements.tier === "ELITE"
                  ? " Email and push alerts on your followed picks — delivered when they grade — are included with Elite."
                  : ""}
              </p>
              <Link
                href="/picks"
                className="mt-3 inline-flex rounded-lg bg-verify px-4 py-2 text-xs font-semibold text-obsidian transition-colors hover:bg-verify/80"
              >
                See today&apos;s board →
              </Link>
            </div>
          )}

          {billingNotice && <BillingNoticeBanner notice={billingNotice} />}

          {entitlements.tier !== "FREE" && (
            <div
              data-testid="billing-management-section"
              className="mb-6 rounded-2xl border border-mineral-hi bg-carbon/80 p-6"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">
                  Billing
                </h2>
              </div>
              <p className="mb-4 text-sm text-ion-2">
                Update your card, change your plan, or cancel your subscription
                anytime via the Stripe customer portal.
              </p>
              <div className="w-full max-w-xs">
                <ManageSubscriptionButton />
              </div>
            </div>
          )}

          {performanceVisible && (
            <div
              data-testid="performance-headline"
              className="mb-4 rounded-xl border border-mineral bg-carbon/60 p-4"
            >
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ion-2">
                Headline
              </p>
              <p className={`mt-1.5 text-sm text-ion-white ${NUMERIC_TEXT_CLASS}`}>{headline.label}</p>
            </div>
          )}

          <div className="mb-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* "Published Today", not "Today's Picks" (C-246, Devin). The card
                carried the SAME label as the list heading two blocks below it
                while counting a different thing: the card is every published
                pick, the list is the slice this viewer can act on - capped at
                the teaser limit for FREE and at six for PRO. So the two numbers
                legitimately differ, for two separate reasons, under one name.
                C-241 aligned the count's FILTERS with the list and left that
                alone; this is the half that was still misread.
                The count itself is unchanged, because neither candidate number
                is wrong: capping it at the list's length would hide from a FREE
                member that a fuller board exists, and would drop a PRO member's
                total to six. What was wrong was calling both of them the same
                thing. */}
            <StatCard label="Published Today" value={todayPicksCount.toString()} />
            <StatCard label="Verified Record" value={recordDisplay} />
            <StatCard label="Win Rate" value={winRateDisplay} highlight={winRateHighlight} subtext={winRateSubtext} />
            <StatCard
              label="Tier"
              value={
                user.role === "ADMIN"
                  ? "Admin"
                  : entitlements.tier.charAt(0) + entitlements.tier.slice(1).toLowerCase()
              }
            />
          </div>

          {!performanceVisible && (
            <p
              data-testid="dashboard-performance-collecting"
              className="mb-6 rounded-lg border border-mineral bg-carbon/40 px-4 py-3 text-xs leading-relaxed text-ion-2"
            >
              {performanceMessage}
            </p>
          )}
          {performanceVisible && (
            <p className="mb-6 text-xs text-ion-2">
              Only fully-settled verified picks are counted. Pushes are
              reported separately. Pending and early-period picks are
              excluded.
            </p>
          )}

          {/* Today's picks list — the focal region: what matters now. */}
          <section className="mb-6 rounded-2xl border border-mineral-hi bg-carbon/80 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">
                Today's picks
              </h2>
              <Link
                href="/picks"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-orbital-cyan transition-colors hover:text-orbital-cyan-glow"
              >
                View all →
              </Link>
            </div>
            {todayPicksDegraded ? (
              <p role="status" className="py-6 text-center text-sm text-ion-2">
                Today&rsquo;s picks could not be read - the query did not
                respond. This is not an empty board; try again shortly.
              </p>
            ) : todayPicks.length === 0 ? (
              <p className="py-6 text-center text-sm text-ion-2">
                No picks published yet today. The board fills in as games clear
                the model — check back closer to game time.
              </p>
            ) : (
              <ul className="divide-y divide-mineral/60">
                {todayPicks.map((p) => (
                  <PickRow key={p.id} pick={p} showConfidence={entitlements.canSeeConfidence} />
                ))}
              </ul>
            )}
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-mineral bg-carbon/60 p-6">
              <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">
                Quick links
              </h2>
              <nav className="flex flex-col gap-1">
                {[
                  { href: "/picks", label: "Today's Picks" },
                  { href: "/performance", label: "Performance" },
                  { href: "/pricing", label: "View Plans" },
                  { href: "/blog", label: "Analysis Blog" },
                ].map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-ion-1 transition-colors hover:bg-titanium hover:text-ion-white"
                  >
                    {label}
                    <span aria-hidden="true" className="text-ion-2">{`→`}</span>
                  </Link>
                ))}
              </nav>
            </section>

            <section className="rounded-2xl border border-mineral bg-carbon/60 p-6">
              <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">
                Where we are
              </h2>
              <p className="text-sm leading-relaxed text-ion-1">{performanceMessage}</p>
              <p className="mt-3 text-xs leading-relaxed text-ion-2">
                {/* "are running" is an OBSERVATION, and during a count outage
                    we have not observed it - the read that would tell us is
                    the one that just failed. The two sentences after it are
                    policy, true whatever the database says, so they stay. */}
                {!perfDegraded && "Pick generation, ingestion, and settlement are running. "}
                Your verified record will populate as canonical picks
                settle. We do not publish a win rate until we have a
                meaningful sample.
              </p>
              <p
                data-testid="dashboard-last-sync"
                className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ion-2"
              >
                As of {format(new Date(), "MMM d, yyyy · h:mm a")}
              </p>
            </section>
          </div>

          <div className="mt-8">
            <RiskDisclosure variant="card" includePastPerformance />
          </div>
        </div>
      </main>
    </div>
  );
}

function SampleDataBanner() {
  return (
    <div
      data-testid="sample-data-banner"
      role="status"
      aria-live="polite"
      className="mb-4 flex items-start gap-3 rounded-xl border border-caution/40 bg-caution/10 p-3 text-xs"
    >
      <span className="mt-0.5 rounded-md bg-caution/15 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-caution">
        Sample data
      </span>
      <p className="flex-1 text-caution/90 leading-relaxed">
        These picks are deterministic samples shown while live ingestion is
        being wired up. They never settle, they never count toward a
        verified record, and no win-rate claim is published from them.
      </p>
    </div>
  );
}

/**
 * Confidence ladder (DESIGN.md): 80–100 plasma · 65–79 orbital cyan ·
 * 50–64 ultraviolet · <50 silver. Presentation-only mapping — the number
 * itself is always rendered beside the bar (color is never the sole encoding).
 */
function confidenceBarClass(confidence: number): string {
  if (confidence >= 80) return "bg-plasma/70";
  if (confidence >= 65) return "bg-orbital-cyan/70";
  if (confidence >= 50) return "bg-ultraviolet/70";
  return "bg-ion-1/50";
}

function PickRow({ pick, showConfidence }: { pick: TodayPick; showConfidence: boolean }) {
  const homeAway = `${pick.game.awayTeamName} @ ${pick.game.homeTeamName}`;
  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ion-white">
          <span
            data-testid="dashboard-sport-pill"
            className="mr-2 rounded bg-titanium px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ion-2"
          >
            {pick.game.sport.name}
          </span>
          {pick.selection}
          {pick.isFeatured && (
            <span className="ml-2 rounded bg-plasma/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-plasma-glow">
              Featured
            </span>
          )}
        </p>
        <p className="truncate text-xs text-ion-2">
          {homeAway} ·{" "}
          <span className={NUMERIC_TEXT_CLASS}>
            {format(pick.game.commenceTime, "h:mm a")}
          </span>
        </p>
        <p className="truncate text-xs text-ion-2">
          {pick.reasoningShort}
        </p>
        {showConfidence && (
          <div
            data-testid="confidence-bar"
            aria-label={`Model confidence ${pick.confidence} out of 100 (selection score, not a win probability)`}
            className="mt-1 h-1 w-full overflow-hidden rounded-full bg-titanium"
          >
            <div
              className={`h-full ${confidenceBarClass(pick.confidence)}`}
              style={{ width: `${Math.max(0, Math.min(100, pick.confidence))}%` }}
            />
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        <GradeBadge grade={pick.pickGrade} />
        {/* A score out of 100, never a percent: "%" reads as a win probability,
            which this heuristic is not (the >= 80 tail is measured inverted).
            Same rule as components/picks/pick-card.tsx. */}
        {showConfidence ? (
          <span className={`text-xs text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
            {pick.confidence}/100
          </span>
        ) : (
          <Link
            href="/pricing"
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ultraviolet-glow underline-offset-4 hover:underline"
          >
            Conf · Pro
          </Link>
        )}
        {showConfidence && pick.edgeScore > 0 && (
          <span
            data-testid="edge-score"
            aria-label={`Edge score ${pick.edgeScore.toFixed(1)}`}
            className={`rounded bg-verify/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-verify ${NUMERIC_TEXT_CLASS}`}
          >
            +{pick.edgeScore.toFixed(1)} edge
          </span>
        )}
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
          {pick.riskLevel}
        </span>
      </div>
    </li>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const styles: Record<string, string> = {
    A: "bg-verify/15 text-verify",
    B: "bg-orbital-cyan/15 text-orbital-cyan",
    C: "bg-titanium text-ion-2",
  };
  return (
    <span
      className={[
        "rounded-full px-2 py-0.5 text-xs font-bold",
        styles[grade] ?? "bg-titanium text-ion-2",
      ].join(" ")}
    >
      {grade}
    </span>
  );
}

function StatCard({
  label,
  value,
  highlight,
  subtext,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  subtext?: string | null;
}) {
  return (
    <div className="rounded-xl border border-mineral bg-carbon/60 p-4">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ion-2">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold ${NUMERIC_TEXT_CLASS} ${highlight ? "text-orbital-cyan" : "text-ion-white"}`}>{value}</p>
      {subtext && <p className={`mt-1 text-[11px] text-ion-2 ${NUMERIC_TEXT_CLASS}`}>{subtext}</p>}
    </div>
  );
}
