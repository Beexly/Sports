import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { BRAND_COLORS } from "@/lib/brand";
import { loadSourceLiveEvidence } from "@/lib/data-sources/live-evidence";

export const dynamic = "force-dynamic";

/** Legacy deep-links (`/fantasy?tool=trade`) predate the dedicated tool
 * routes; honor them forever so no shared link ever strands on the hub. */
const LEGACY_TOOL_ROUTES: Record<string, string> = {
  draft: "/fantasy/draft",
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
  title: "Galaxy Fantasy - Real Roster First",
  description:
    "Galaxy Fantasy starts with read-only roster sync and stays gated until live player projections are connected. No fictional projections are presented as live advice.",
  alternates: { canonical: "/fantasy" },
};

const LIVE_FIRST = [
  {
    title: "Read-only roster sync",
    href: "/fantasy/connect",
    status: "Live path",
    body: "League connect uses public read-only data. No league writes, no OAuth handoff, no autonomous moves.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    title: "Player projections provider",
    href: "/integrations",
    status: "Required",
    body: "Lineups, waivers, DFS, and trades stay gated until a real projections source is enabled.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    title: "Live usage layer",
    href: "/trends",
    status: "Building",
    body: "Snap share, player weeks, injuries, depth charts, and rosters become the free-first base layer.",
    accent: "#FFB454",
  },
] as const;

type ToolStatus = "live" | "partly live" | "gated";
const TOOL_DIRECTORY: readonly (readonly [string, string, string, ToolStatus])[] = [
  ["Optimizer — DFS · Start/Sit · Draft", "One workspace, one contest switch. Salaries and projections stay gated; the draft board (tiers, VOR, scarcity, run alerts, your ADP CSV) runs on the illustrative pool now.", "/optimizer", "partly live"],
  ["Human Performance", "Public confidence-band layer — venue surface, weather, official injury status. Live now; never a body claim.", "/human", "live"],
  ["Waiver & FAAB", "Needs roster sync, projections, injuries, and league market context.", "/fantasy/waivers", "gated"],
  ["Trade Analyzer", "Needs live player values and roster context.", "/fantasy/trade", "gated"],
  ["Pick'em Edge", "Needs live pick'em lines and alt-line pricing.", "/fantasy/props", "gated"],
  ["League Twin", "Can render a real roster after sync; advice waits for projections.", "/fantasy/league-twin", "gated"],
  ["GM Ledger", "Proof mechanics are real; live decision history requires user roster events.", "/fantasy/gm-ledger", "gated"],
] as const;

const STATUS_CONFIG: Record<ToolStatus, { color: string; label: string }> = {
  live: { color: BRAND_COLORS.orbitalCyan, label: "live" },
  "partly live": { color: BRAND_COLORS.softUltraviolet, label: "partly live" },
  gated: { color: "rgba(255,255,255,0.30)", label: "gated" },
};

export default async function FantasyHubPage({
  searchParams,
}: {
  searchParams?: { tool?: string };
}): Promise<JSX.Element> {
  const requestedTool = searchParams?.tool?.toLowerCase();
  if (requestedTool && LEGACY_TOOL_ROUTES[requestedTool]) {
    redirect(LEGACY_TOOL_ROUTES[requestedTool]!);
  }

  const evidence = await loadSourceLiveEvidence({ timeoutMs: 15000 });
  const qbAgeLift = evidence.summary.qbAge34Lift;
  const qbAgeLiftLabel = typeof qbAgeLift === "number" ? `${formatPercent(qbAgeLift)} lift` : "UNKNOWN";
  const latestWeek =
    evidence.summary.latestUsageSeason && evidence.summary.latestUsageWeek
      ? `${evidence.summary.latestUsageSeason} W${evidence.summary.latestUsageWeek}`
      : "UNKNOWN";

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Nav />
      <main className="flex-1">

        {/* Cinematic hero */}
        <section className="relative isolate overflow-hidden px-4 pb-14 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem]"
            style={{
              background: `radial-gradient(55% 70% at 50% 0%, ${BRAND_COLORS.softUltraviolet}12, transparent 60%), radial-gradient(35% 50% at 85% 20%, ${BRAND_COLORS.orbitalCyan}0d, transparent 65%)`,
            }}
          />
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.6fr] lg:items-end">
            <div>
              <Reveal>
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{
                    color: BRAND_COLORS.softUltraviolet,
                    borderColor: `${BRAND_COLORS.softUltraviolet}30`,
                    backgroundColor: `${BRAND_COLORS.softUltraviolet}0d`,
                  }}
                >
                  Galaxy Fantasy
                </span>
              </Reveal>
              <Reveal delay={80}>
                <h1
                  className="mt-5 max-w-4xl font-display text-balance text-white"
                  style={{ fontSize: "clamp(2.4rem, 7vw, 4.5rem)", lineHeight: 1.0, letterSpacing: "-0.02em" }}
                >
                  Real roster first.{" "}
                  <span
                    style={{
                      background: `linear-gradient(90deg, ${BRAND_COLORS.softUltraviolet} 0%, ${BRAND_COLORS.orbitalCyan} 100%)`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    No fake projections.
                  </span>
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-300">
                  Galaxy Fantasy is being rebuilt around the same rule as the picks product:
                  if the data is not real, the advice stays locked. Connect your real
                  league roster now — projection-driven recommendations open only after the
                  live data layer clears.
                </p>
              </Reveal>
              <Reveal delay={220}>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/fantasy/connect" className="btn btn-primary">
                    Connect your league
                  </Link>
                  <Link href="/optimizer" className="btn btn-ghost">
                    Open the Optimizer
                  </Link>
                  <Link href="/trends" className="btn btn-ghost">
                    View Trend Lab
                  </Link>
                </div>
              </Reveal>
            </div>

            <Reveal delay={180}>
              <div
                className="overflow-hidden rounded-2xl border p-5"
                style={{
                  borderColor: `${BRAND_COLORS.softUltraviolet}22`,
                  background: `linear-gradient(135deg, ${BRAND_COLORS.softUltraviolet}06 0%, rgba(18,14,36,0.9) 100%)`,
                }}
              >
                <div
                  className="mb-4 h-0.5 w-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${BRAND_COLORS.softUltraviolet}, transparent 70%)` }}
                  aria-hidden="true"
                />
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{ color: BRAND_COLORS.softUltraviolet }}
                >
                  Fantasy readiness
                </p>
                <dl className="mt-5 grid grid-cols-3 gap-3">
                  <ReadinessMetric label="Roster" value="sync" accent={BRAND_COLORS.orbitalCyan} />
                  <ReadinessMetric label="Projections" value="gated" accent="rgba(255,255,255,0.30)" />
                  <ReadinessMetric label="Actions" value="no-write" accent={BRAND_COLORS.softUltraviolet} />
                </dl>
                <p className="mt-4 text-sm leading-6 text-ink-400">
                  This page no longer presents fictional player pools as the primary product.
                  The public path is data-first.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Live NFL usage backbone */}
        <section className="px-4 py-12 sm:px-6 lg:px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <div>
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  Real NFL usage backbone
                </p>
                <h2
                  className="mt-3 font-display text-white"
                  style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", lineHeight: 1.1, letterSpacing: "-0.01em" }}
                >
                  Fantasy starts with rows, then earns recommendations.
                </h2>
                <p className="mt-4 text-sm leading-7 text-ink-300">
                  The free-first layer is already reading live player-week usage, roster, and
                  schedule files. It can prove usage context and reject weak narrative angles today;
                  it still cannot unlock projection-driven lineup, waiver, trade, DFS, or pick&apos;em
                  advice until those provider feeds are live.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/nflverse" className="btn btn-ghost">
                    NFLverse Pulse
                  </Link>
                  <Link href="/api/sources/catalog" className="btn btn-ghost">
                    Source JSON
                  </Link>
                  <Link href="/fantasy/baseline" className="btn btn-ghost">
                    Baseline map
                  </Link>
                </div>
              </div>
            </Reveal>

            <Stagger className="grid gap-3 sm:grid-cols-2" step={60}>
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
                accent={BRAND_COLORS.orbitalCyan}
              />
              <EvidenceMetric
                label="Rejected narratives"
                value={evidence.summary.birthdayUsageConclusion ?? "UNKNOWN"}
                detail={`${formatCount(evidence.summary.birthdayWindowObservations)} birthday-window and ${formatCount(evidence.summary.careerMilestone50Observations)} milestone observations.`}
                accent="#FF6470"
              />
            </Stagger>
          </div>
        </section>

        {/* Live-first build order */}
        <section className="px-4 py-12 sm:px-6 lg:px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <h2
                className="font-display text-white"
                style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", lineHeight: 1.1, letterSpacing: "-0.01em" }}
              >
                Live-first build order
              </h2>
            </Reveal>
            <Stagger className="mt-7 grid gap-5 lg:grid-cols-3" step={80}>
              {LIVE_FIRST.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group flex min-h-56 flex-col overflow-hidden rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1"
                  style={{
                    borderColor: `${item.accent}22`,
                    background: `linear-gradient(135deg, ${item.accent}06 0%, rgba(18,14,36,0.7) 100%)`,
                  }}
                >
                  <div
                    className="mb-3 h-0.5 w-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${item.accent}, transparent 70%)` }}
                    aria-hidden="true"
                  />
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.18em]"
                    style={{ color: item.accent }}
                  >
                    {item.status}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-ink-300">{item.body}</p>
                  <span
                    className="mt-5 text-sm font-semibold transition-colors group-hover:text-white"
                    style={{ color: item.accent }}
                  >
                    Open →
                  </span>
                </Link>
              ))}
            </Stagger>
          </div>
        </section>

        {/* Tool directory */}
        <section className="px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h2
                    className="font-display text-white"
                    style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", lineHeight: 1.1, letterSpacing: "-0.01em" }}
                  >
                    Every tool, with its honest status
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-400">
                    One directory, no dead ends. Each tool links straight through and shows whether it&apos;s
                    live, partly live, or gated on a real data feed — never a design delay, never a fictional input.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm font-semibold">
                  <Link
                    href="/fantasy/baseline"
                    className="transition-colors hover:text-white"
                    style={{ color: BRAND_COLORS.orbitalCyan }}
                  >
                    LineStar / Elite baseline
                  </Link>
                  <Link
                    href="/integrations"
                    className="transition-colors hover:text-white"
                    style={{ color: BRAND_COLORS.orbitalCyan }}
                  >
                    Data requirements
                  </Link>
                </div>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div
                className="mt-7 overflow-hidden rounded-2xl border"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  background: "rgba(8,6,20,0.5)",
                }}
              >
                {TOOL_DIRECTORY.map(([tool, requirement, href, status], i) => {
                  const cfg = STATUS_CONFIG[status];
                  return (
                    <Link
                      key={tool}
                      href={href}
                      className="group grid gap-3 px-5 py-4 transition-colors hover:bg-white/[0.03] sm:grid-cols-[0.42fr_1fr_auto] sm:items-center"
                      style={{ borderBottom: i < TOOL_DIRECTORY.length - 1 ? "1px solid rgba(255,255,255,0.06)" : undefined }}
                    >
                      <p
                        className="font-semibold text-white transition-colors"
                        style={{ color: "white" }}
                      >
                        {tool}
                      </p>
                      <p className="text-sm leading-6 text-ink-400">{requirement}</p>
                      <span
                        className="font-mono text-[10px] uppercase tracking-[0.16em]"
                        style={{ color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function formatCount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "UNKNOWN";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

function EvidenceMetric({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: string;
}): JSX.Element {
  return (
    <div
      className="overflow-hidden rounded-xl border p-4"
      style={{
        borderColor: accent ? `${accent}28` : "rgba(255,255,255,0.08)",
        background: accent ? `${accent}06` : "rgba(255,255,255,0.025)",
      }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">{label}</p>
      <p
        className="mt-2 font-numerals text-2xl font-semibold tabular-nums"
        style={{ color: accent ?? "white" }}
      >
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-ink-500">{detail}</p>
    </div>
  );
}

function ReadinessMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}): JSX.Element {
  return (
    <div
      className="overflow-hidden rounded-lg border px-3 py-2"
      style={{
        borderColor: accent ? `${accent}30` : "rgba(255,255,255,0.09)",
        background: accent ? `${accent}08` : "rgba(255,255,255,0.03)",
      }}
    >
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">{label}</dt>
      <dd
        className="mt-1 font-numerals text-lg font-semibold"
        style={{ color: accent ?? "white" }}
      >
        {value}
      </dd>
    </div>
  );
}
