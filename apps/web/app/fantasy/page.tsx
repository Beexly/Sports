import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { PracticeSlateTag } from "@/components/fantasy/practice-slate-tag";
import { NUMERIC_TEXT_CLASS } from "@/lib/format/stat";
import { loadSourceLiveEvidence } from "@/lib/data-sources/live-evidence";

export const dynamic = "force-dynamic";

/** Legacy deep-links (`/fantasy?tool=trade`) predate the dedicated tool
 * routes; honor them forever so no shared link ever strands on the hub. */
const LEGACY_TOOL_ROUTES: Record<string, string> = {
  draft: "/fantasy/draft",
  bestball: "/fantasy/bestball",
  lineup: "/fantasy/lineup",
  waivers: "/fantasy/waivers",
  trade: "/fantasy/trade",
  dfs: "/fantasy/dfs",
  props: "/fantasy/props",
  connect: "/fantasy/connect",
  academy: "/fantasy/academy",
  contests: "/fantasy/contests",
};

export const metadata: Metadata = {
  title: "Fantasy Tools",
  description:
    "Start-sit, waivers, trades, DFS, and pick'em. Real roster data when you connect; honest sample data when you don't.",
  alternates: { canonical: "/fantasy" },
};

/**
 * Honest status vocabulary (ASTRA A-7, owner item 7), simplified for the
 * customer: a tool is either Live (real public data, working today) or it opens
 * on a Practice slate of clearly tagged sample players. "Partly live" tools
 * (a DK CSV import, a real pool once projections are on) still open on the
 * sample pool, so they carry the Practice slate tag too. Projection-driven
 * advice stays gated behind a licensed feed, server-side; the tag is the
 * visible half of that rule.
 */
type ToolStatus = "live" | "partly live" | "sample";
type Tool = {
  readonly title: string;
  readonly purpose: string;
  readonly href: string;
  readonly status: ToolStatus;
  readonly featured?: boolean;
};
const TOOL_DIRECTORY: readonly Tool[] = [
  { title: "Optimizer", purpose: "DFS, start/sit, and draft in one workspace. Import your DraftKings CSV for today's real slate.", href: "/optimizer", status: "partly live", featured: true },
  { title: "Pick'em Edge", purpose: "Our Projection against the posted line, with the best alt and its value per $1.", href: "/fantasy/props", status: "sample" },
  { title: "Best Ball", purpose: "Draft for ceiling, stacks, and bye structure, ranked by GSE Score.", href: "/fantasy/bestball", status: "partly live" },
  { title: "Waiver & FAAB", purpose: "Ranked adds with a FAAB bid that re-prices to your budget.", href: "/fantasy/waivers", status: "sample" },
  { title: "Trade Analyzer", purpose: "Both sides valued on GSE Score, with the reasoning behind the verdict.", href: "/fantasy/trade", status: "sample" },
  { title: "League Twin", purpose: "Your roster as a galaxy: projection, usage, risk, and byes at a glance.", href: "/fantasy/league-twin", status: "sample" },
  { title: "GM Ledger", purpose: "Your decisions committed before kickoff, graded on process, not luck.", href: "/fantasy/gm-ledger", status: "sample" },
  { title: "Human Performance", purpose: "Venue surface, weather, and official injury status from public sources.", href: "/human", status: "live" },
];

export default async function FantasyHubPage({
  searchParams,
}: {
  searchParams?: { tool?: string };
}): Promise<JSX.Element> {
  const requestedTool = searchParams?.tool?.toLowerCase();
  if (requestedTool && LEGACY_TOOL_ROUTES[requestedTool]) {
    redirect(LEGACY_TOOL_ROUTES[requestedTool]!);
  }

  // The evidence read is NOT awaited here any more. It lives in <LiveEvidenceGrid/>
  // behind a Suspense boundary, because it is a decorative four-card status strip
  // and it was gating the ENTIRE page render: loadSourceLiveEvidence pulls four
  // nflverse datasets SEQUENTIALLY (deliberately — running them concurrently
  // OOM-killed the instance) with a 15s budget each, so a cold serverless instance
  // took 13-15s to return ANY html. Measured on production 2026-09-11: cold
  // 13.8s, warm 0.25s over five consecutive hits. The cold case is exactly what a
  // marketing surge produces, since scaling out creates fresh instances whose
  // first request pays it. Streaming the strip means the page paints immediately
  // and only the cards wait.
  return (
    <div className="relative isolate flex min-h-screen flex-col bg-obsidian">
      <GeneratedPlate assetId="fantasy-constellation" className="-z-10 opacity-25" />
      <Nav />
      <main id="main-content" className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="px-4 pb-12 pt-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-orbital-cyan">Galaxy Fantasy</p>
            <h1 className="mt-3 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
              Real roster first. No fake projections.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
              The same rule as our picks: if the data is not real, we say so. Connect your league for
              your real roster. Projections stay on a Practice slate of sample players until a licensed
              feed is connected, and every sample screen is tagged.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/fantasy/connect" className="btn btn-primary">
                Connect your league
              </Link>
              <Link href="/optimizer" className="btn btn-ghost">
                Open the Optimizer
              </Link>
              <Link href="/launch" className="px-2 text-sm font-semibold text-orbital-cyan hover:text-ion-white">
                Founding launch →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Tools: the hub's main content ────────────────────────── */}
        <section className="border-t border-mineral px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <h2 className="font-display text-3xl font-semibold text-ion-white">Tools</h2>
              <Link href="/fantasy/baseline" className="text-sm font-semibold text-orbital-cyan hover:text-ion-white">
                LineStar / Elite baseline
              </Link>
            </div>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TOOL_DIRECTORY.map((tool) => (
                <li key={tool.title} className={tool.featured ? "sm:col-span-2" : undefined}>
                  <Link
                    href={tool.href}
                    className="surface-card group flex h-full min-h-[10rem] flex-col p-5 transition-colors hover:border-orbital-cyan/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3
                        className={`font-semibold text-ion-white group-hover:text-orbital-cyan ${
                          tool.featured ? "font-display text-2xl" : "text-lg"
                        }`}
                      >
                        {tool.title}
                      </h3>
                      {tool.status === "live" ? (
                        <span className="rounded-full bg-orbital-cyan/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orbital-cyan">
                          Live
                        </span>
                      ) : (
                        <PracticeSlateTag />
                      )}
                    </div>
                    <p className="mt-2 flex-1 text-sm leading-6 text-ion-1">{tool.purpose}</p>
                    <span className="mt-4 text-sm font-semibold text-orbital-cyan">Open →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Evidence: the real data layer underneath the tools ────── */}
        <section className="border-t border-mineral px-4 pb-20 pt-12 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-orbital-cyan">
                Real NFL usage backbone
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-ion-white">
                Fantasy starts with rows, then earns recommendations.
              </h2>
              <p className="mt-3 text-sm leading-6 text-ion-1">
                We already read live player-week usage, roster, and schedule files. That proves usage
                context and rejects weak narratives today. It does not unlock
                projection-driven lineup, waiver, trade, DFS, or pick'em advice until those provider
                feeds are live.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                <Link href="/nflverse" className="text-orbital-cyan hover:text-ion-white">
                  NFLverse Pulse
                </Link>
                <Link href="/trends" className="text-orbital-cyan hover:text-ion-white">
                  Trend Lab
                </Link>
                <Link href="/api/sources/catalog" className="text-orbital-cyan hover:text-ion-white">
                  Data sources
                </Link>
                <Link href="/fantasy/baseline" className="text-orbital-cyan hover:text-ion-white">
                  Baseline map
                </Link>
              </div>
            </div>
            <Suspense fallback={<EvidenceGridPlaceholder />}>
              <LiveEvidenceGrid />
            </Suspense>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function formatCount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

/**
 * The four-card live-evidence strip, STREAMED. It is its own async component so
 * the page shell never waits on four sequential nflverse dataset pulls — see the
 * note in FantasyHubPage for the measured cost. The placeholder keeps the same
 * grid geometry so the layout does not jump when the real cards arrive.
 */
async function LiveEvidenceGrid(): Promise<JSX.Element> {
  const evidence = await loadSourceLiveEvidence({ timeoutMs: 15000 });
  const qbAgeLift = evidence.summary.qbAge34Lift;
  const qbAgeLiftLabel = typeof qbAgeLift === "number" ? `${formatPercent(qbAgeLift)} lift` : "—";
  const latestWeek =
    evidence.summary.latestUsageSeason && evidence.summary.latestUsageWeek
      ? `${evidence.summary.latestUsageSeason} W${evidence.summary.latestUsageWeek}`
      : "—";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <EvidenceMetric
        label="Player-stat rows"
        value={formatCount(evidence.summary.usagePlayerStatsRows)}
        detail="Read-only weekly source release pulls."
      />
      <EvidenceMetric
        label="Latest usage week"
        value={latestWeek}
        detail={`${formatCount(evidence.summary.latestWeekPlayerRows)} player rows in the latest REG week.`}
      />
      <EvidenceMetric
        label="Accepted research"
        value={qbAgeLiftLabel}
        detail={`${formatCount(evidence.summary.cohortObservations)} team-week observations for QB-age/RB target share.`}
      />
      <EvidenceMetric
        label="Rejected narratives"
        value={evidence.summary.birthdayUsageConclusion ?? "—"}
        detail={`${formatCount(evidence.summary.birthdayWindowObservations)} birthday-window and ${formatCount(evidence.summary.careerMilestone50Observations)} milestone observations.`}
      />
    </div>
  );
}

/**
 * The Suspense fallback: same grid, same card count, same geometry, so streaming
 * in the real cards cannot shift the hero. aria-hidden because it is a status
 * placeholder, not content.
 */
function EvidenceGridPlaceholder(): JSX.Element {
  return (
    <div className="grid gap-3 sm:grid-cols-2" aria-hidden="true">
      <EvidenceMetric label="Player-stat rows" value="…" detail="Reading live sources." />
      <EvidenceMetric label="Latest usage week" value="…" detail="Reading live sources." />
      <EvidenceMetric label="Accepted research" value="…" detail="Reading live sources." />
      <EvidenceMetric label="Rejected narratives" value="…" detail="Reading live sources." />
    </div>
  );
}

/** Same stat pattern as the tools: small mono label above a tabular numeral. */
function EvidenceMetric({ label, value, detail }: { label: string; value: string; detail: string }): JSX.Element {
  return (
    <div className="surface-card p-4">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ion-2">{label}</p>
      <p className={`mt-2 text-2xl font-semibold leading-none text-ion-white ${NUMERIC_TEXT_CLASS}`}>{value}</p>
      <p className="mt-2 text-xs leading-5 text-ion-2">{detail}</p>
    </div>
  );
}
