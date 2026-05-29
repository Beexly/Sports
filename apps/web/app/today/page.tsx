import Link from "next/link";
import type { Metadata } from "next";
import { startOfDay, endOfDay, format } from "date-fns";
import { db, isStubMode, isDemoPicksEnabled } from "@sports/db";
import type { PickType, PickTier } from "@sports/db";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { loadBoardState } from "@/lib/board/state";
import { loadBoardPasses } from "@/lib/board/passes";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { TrustStrip } from "@/components/trust";
import { NextBestSurface } from "@/components/experience/NextBestSurface";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Today's Board — Galaxy Sports Edge",
  description:
    "Daily sports intelligence briefing. Scored picks, board passes, market signals — everything you need before the first game.",
  alternates: { canonical: "/today" },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface TodayPick {
  id: string;
  gameId: string;
  matchup: string;
  sport: string;
  selection: string;
  line: number;
  confidence: number;
  pickType: PickType;
  tier: PickTier;
  isFeatured: boolean;
  pickGrade: string;
  commenceTime: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeLabel(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function confidenceLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Elite", color: "text-green-400" };
  if (score >= 65) return { label: "High", color: "text-brand-400" };
  if (score >= 50) return { label: "Moderate", color: "text-yellow-400" };
  return { label: "Low", color: "text-gray-400" };
}

function pickTypeColor(type: PickType): string {
  if (type === "SPREAD") return "text-blue-400";
  if (type === "MONEYLINE") return "text-purple-400";
  if (type === "TOTAL") return "text-orange-400";
  return "text-gray-400";
}

function pickTypeBg(type: PickType): string {
  if (type === "SPREAD") return "bg-blue-950/40 border-blue-900/40";
  if (type === "MONEYLINE") return "bg-purple-950/40 border-purple-900/40";
  if (type === "TOTAL") return "bg-orange-950/40 border-orange-900/40";
  return "bg-gray-900/40 border-gray-800";
}

function tierBadge(tier: PickTier): { classes: string; label: string } {
  if (tier === "FREE") {
    return { classes: "bg-gray-700 text-gray-300", label: "FREE" };
  }
  // PREMIUM maps to both PRO/ELITE display — the schema uses FREE/PREMIUM
  return {
    classes: "bg-purple-900/30 text-purple-300 border border-purple-700/30",
    label: "PREMIUM",
  };
}

function boardStatusLabel(state: {
  bootstrap: boolean;
  openPicks: number;
}): { label: string; color: string; dot: string } {
  if (isStubMode() && isDemoPicksEnabled()) {
    return { label: "DEMO", color: "text-yellow-400", dot: "bg-yellow-400" };
  }
  if (state.bootstrap) {
    return { label: "BOOTSTRAP", color: "text-gray-400", dot: "bg-gray-400" };
  }
  if (state.openPicks > 0) {
    return { label: "OPEN", color: "text-green-400", dot: "bg-green-400" };
  }
  return { label: "CLOSED", color: "text-gray-500", dot: "bg-gray-500" };
}

function confidenceBar(score: number): JSX.Element {
  const pct = Math.min(100, Math.max(0, score));
  const { color } = confidenceLabel(score);
  // Map text color to fill color
  const fillColor =
    score >= 80
      ? "bg-green-400"
      : score >= 65
        ? "bg-cyan-400"
        : score >= 50
          ? "bg-yellow-400"
          : "bg-gray-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-gray-800">
        <div
          className={`h-full rounded-full ${fillColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`font-mono text-xs font-bold tabular-nums ${color}`}>
        {score}
      </span>
    </div>
  );
}

// ─── Data loading ──────────────────────────────────────────────────────────────

async function loadTodayPicks(): Promise<TodayPick[]> {
  const now = new Date();
  const raw = await db.pick
    .findMany({
      where: {
        isPublished: true,
        generatedAt: { gte: startOfDay(now), lte: endOfDay(now) },
      },
      include: { game: { include: { sport: { select: { name: true } } } } },
      orderBy: [{ isFeatured: "desc" }, { confidence: "desc" }],
      take: 12,
    })
    .catch(() => []);

  return raw.map((pick): TodayPick => ({
    id: pick.id,
    gameId: pick.gameId,
    matchup: `${pick.game.awayTeamName} @ ${pick.game.homeTeamName}`,
    sport: pick.game.sport.name,
    selection: pick.selection,
    line: pick.line,
    confidence: pick.confidence,
    pickType: pick.pickType,
    tier: pick.tier,
    isFeatured: pick.isFeatured,
    pickGrade: pick.pickGrade,
    commenceTime: pick.game.commenceTime,
  }));
}

async function loadTodayGameCount(): Promise<number> {
  const now = new Date();
  return db.game
    .count({
      where: {
        commenceTime: { gte: startOfDay(now), lte: endOfDay(now) },
      },
    })
    .catch(() => 0);
}

async function loadSettledPickCount(): Promise<number> {
  return db.pick
    .count({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: ["WIN", "LOSS", "PUSH"] },
      },
    })
    .catch(() => 0);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TodayPage(): Promise<JSX.Element> {
  const now = new Date();

  const [stateResult, passesResult, calibrationResult, todayPicks, gameCount, settledCount] =
    await Promise.all([
      loadBoardState(now),
      loadBoardPasses(now),
      loadPublicCalibrationReport(now),
      loadTodayPicks(),
      loadTodayGameCount(),
      loadSettledPickCount(),
    ]);

  const state = stateResult.data;
  const passes = passesResult.data.passes;
  const calibration = calibrationResult.data;
  const isSample =
    stateResult.meta.isSampleData ||
    passesResult.meta.isSampleData ||
    calibrationResult.meta.isSampleData;

  const boardStatus = boardStatusLabel(state);
  const todayLabel = format(now, "EEEE, MMMM d");

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-carbon text-gray-100">
      <Nav />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">

        <TrustStrip
          surfaceId="today"
          source="galaxy-model"
          freshness={isSample ? "sample" : "fresh"}
          surfaceKind="habit-loop"
          tier="all"
          uncertainty={isSample ? "sample" : "live"}
          showMethodology
          showResponsiblePlay
        />

        {/* ── Demo / Preview Banner ─────────────────────────────────────── */}
        {isSample && (
          <div className="flex flex-col gap-2 border border-cyan-900 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-100 sm:flex-row sm:items-center">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ion-blue">
              Preview mode
            </span>
            <span className="break-words sm:ml-3">
              Showing deterministic sample board data while live ingestion is unavailable. No
              real wager recommendations are being made.
            </span>
          </div>
        )}

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="border-b border-mineral pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
            Intelligence Briefing
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
            {todayLabel}{" "}
            <span className="text-gray-500">·</span>{" "}
            Today&apos;s Board
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400">
            Scored picks, board passes, and market signals — curated each morning before
            the first game. Every card is backed by live odds data and a calibrated model.
          </p>
        </section>

        {/* ── Live Stats Strip ──────────────────────────────────────────── */}
        <section
          aria-label="Live board stats"
          className="grid grid-cols-2 gap-px sm:grid-cols-4"
        >
          <StatChip label="Games today" value={String(gameCount)} />
          <StatChip label="Picks published" value={String(state.openPicks)} />
          <StatChip
            label="Board status"
            value={boardStatus.label}
            valueClass={boardStatus.color}
            dot={boardStatus.dot}
          />
          <StatChip
            label="Last updated"
            value={timeLabel(state.lastRefresh)}
          />
        </section>

        {/* ── Today's Picks ─────────────────────────────────────────────── */}
        <section aria-label="Today's picks">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ion-blue">
                Today&apos;s Picks
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white">
                Published this slate
              </h2>
            </div>
            <Link
              href="/picks"
              className="inline-flex min-h-9 items-center justify-center rounded border border-gray-700 px-4 text-xs font-semibold text-gray-300 hover:border-cyan-400 hover:text-cyan-100"
            >
              Full picks list →
            </Link>
          </div>

          {todayPicks.length === 0 ? (
            <EmptyPicksState />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {todayPicks.map((pick) => (
                <PickCard key={pick.id} pick={pick} />
              ))}
            </div>
          )}
        </section>

        {/* ── Bottom Grid: Calibration Pulse + Board Passes ─────────────── */}
        <section className="grid gap-6 lg:grid-cols-[0.6fr_1fr]">

          {/* Calibration Pulse */}
          <div className="border border-mineral bg-gray-900/45 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ion-blue">
              Calibration Pulse
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">
              {calibration.isCollecting ? "Signal Collecting" : "Active Calibration"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              {calibration.publicMessage}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-3">
              <CalibrationMetric
                label="Settled picks"
                value={String(settledCount)}
              />
              <CalibrationMetric
                label="Brier score"
                value={
                  calibration.brierScore === null
                    ? "Collecting"
                    : String(calibration.brierScore)
                }
              />
            </dl>

            {calibration.isCollecting && (
              <div className="mt-4 flex items-center gap-2 rounded border border-cyan-900/50 bg-cyan-950/20 px-3 py-2">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                <span className="text-xs text-cyan-300">
                  Building history from canonical picks
                </span>
              </div>
            )}

            <p className="mt-4 text-xs text-gray-600">
              Updated {timeLabel(calibration.updatedAt)} · Model {state.modelVersion}
            </p>
          </div>

          {/* Board Passes */}
          <div className="border border-mineral bg-gray-900/45 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ion-blue">
                  Board Passes
                </p>
                <h2 className="mt-2 text-xl font-bold text-white">
                  Evaluated, no edge found
                </h2>
              </div>
              <div className="rounded border border-mineral bg-carbon/60 px-3 py-1.5 text-center">
                <p className="font-mono text-lg font-bold text-white">
                  {passes.length}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-wider text-gray-500">
                  passed
                </p>
              </div>
            </div>

            <p className="mt-3 text-sm text-gray-400">
              {passes.length === 0
                ? "No passes recorded for today's slate yet."
                : `${passes.length} game${passes.length === 1 ? "" : "s"} evaluated — none cleared the publish threshold. Passes are logged to keep the process auditable.`}
            </p>

            {passes.length > 0 && (
              <div className="mt-4 divide-y divide-gray-800 border border-mineral">
                {passes.slice(0, 5).map((row) => (
                  <div
                    key={row.id}
                    className="grid gap-1 px-3 py-3 sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {row.matchup}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">{row.sport}</p>
                    </div>
                    <p className="text-xs text-gray-400 sm:text-right">
                      {row.reason}
                    </p>
                  </div>
                ))}
                {passes.length > 5 && (
                  <div className="px-3 py-2">
                    <Link
                      href="/board"
                      className="text-xs text-ion-blue hover:underline"
                    >
                      View all {passes.length} passes on the board →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <section className="border border-mineral bg-gray-900/30 p-6 text-center sm:p-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
            Full Access
          </p>
          <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
            See every pick, confidence score, and line movement
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-400">
            Free picks update daily. Pro and Elite tiers unlock full confidence
            scoring, edge indices, and early-access picks before market open.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/picks"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-ion-blue px-6 text-sm font-bold text-carbon hover:opacity-90 sm:w-auto"
            >
              Browse today&apos;s picks
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-gray-700 px-6 text-sm font-bold text-gray-200 hover:border-cyan-400 hover:text-cyan-100 sm:w-auto"
            >
              See plans
            </Link>
          </div>
        </section>

        {/* ── Intelligence Hub Nav ──────────────────────────────────────── */}
        <section className="border-t border-mineral pt-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-600">
            Where to go next
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                href: "/no-bet",
                title: "No-Bet Engine",
                desc: "What the model skipped today and why. Read the passes before any bet.",
                accent: "text-amber-400",
              },
              {
                href: "/market-gravity",
                title: "Market Gravity",
                desc: "Line movement, book disagreement, and market signals — live.",
                accent: "text-orange-400",
              },
              {
                href: "/academy",
                title: "Galaxy Academy",
                desc: "Learn the doctrine behind the picks. Signal, risk, and discipline.",
                accent: "text-indigo-400",
              },
              {
                href: "/tracker",
                title: "Bet Tracker",
                desc: "Log your bets. Track CLV. Review your process, not just your results.",
                accent: "text-emerald-400",
              },
            ].map(({ href, title, desc, accent }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col rounded-xl border border-mineral bg-gray-900/40 p-4 transition-colors hover:border-gray-600"
              >
                <span className={`font-mono text-[10px] uppercase tracking-[0.2em] ${accent}`}>
                  {title}
                </span>
                <p className="mt-2 flex-1 text-xs leading-5 text-gray-500 group-hover:text-gray-400">
                  {desc}
                </p>
                <span className="mt-3 font-mono text-[10px] text-ion-blue">Open →</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="flex justify-center pb-4 pt-2">
          <Link
            href="/methodology"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-600 hover:text-ion-blue"
          >
            Scoring methodology →
          </Link>
        </div>

        <RiskDisclosure variant="compact" className="text-center" />

        <NextBestSurface route="/today" className="justify-center" />
      </main>

      <Footer />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  valueClass,
  dot,
}: {
  label: string;
  value: string;
  valueClass?: string;
  dot?: string;
}): JSX.Element {
  return (
    <div className="min-h-16 border border-mineral bg-gray-900/60 px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-1.5">
        {dot && (
          <span
            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dot}`}
          />
        )}
        <p className={`break-words text-base font-semibold text-white ${valueClass ?? ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function PickCard({ pick }: { pick: TodayPick }): JSX.Element {
  const conf = confidenceLabel(pick.confidence);
  const typeBg = pickTypeBg(pick.pickType);
  const typeColor = pickTypeColor(pick.pickType);
  const badge = tierBadge(pick.tier);

  return (
    <article
      className={[
        "relative flex flex-col gap-4 border p-4",
        pick.isFeatured
          ? "border-ion-blue/30 bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-cyan-950/20"
          : "border-mineral bg-gray-900/55",
      ].join(" ")}
    >
      {pick.isFeatured && (
        <span className="absolute right-3 top-3 font-mono text-[9px] font-bold uppercase tracking-widest text-ion-blue">
          Featured
        </span>
      )}

      {/* Sport + matchup */}
      <div className="pr-14">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500">
          {pick.sport} · {timeLabel(pick.commenceTime)}
        </p>
        <h3 className="mt-1 text-sm font-semibold leading-snug text-white">
          {pick.matchup}
        </h3>
      </div>

      {/* Selection pill */}
      <div
        className={`inline-flex self-start rounded border px-2.5 py-1.5 ${typeBg}`}
      >
        <div>
          <p className={`font-mono text-[9px] uppercase tracking-widest ${typeColor}`}>
            {pick.pickType}
          </p>
          <p className="mt-0.5 text-sm font-bold text-white">{pick.selection}</p>
        </div>
      </div>

      {/* Confidence bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-wider text-gray-500">
            Confidence
          </span>
          <span className={`font-mono text-[10px] font-semibold ${conf.color}`}>
            {conf.label}
          </span>
        </div>
        {confidenceBar(pick.confidence)}
      </div>

      {/* Tier badge + link */}
      <div className="flex items-center justify-between">
        <span
          className={`rounded px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${badge.classes}`}
        >
          {badge.label}
        </span>
        <Link
          href={`/room/${pick.gameId}`}
          className="text-xs font-semibold text-ion-blue hover:underline"
        >
          View room →
        </Link>
      </div>
    </article>
  );
}

function EmptyPicksState(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-mineral bg-gray-900/30 py-14 text-center">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
        No picks yet
      </span>
      <p className="max-w-sm text-sm text-gray-400">
        No picks have been published for today&apos;s slate. Check back after the
        scoring pipeline completes its morning run.
      </p>
      <Link
        href="/board"
        className="mt-2 text-xs font-semibold text-ion-blue hover:underline"
      >
        See what&apos;s being scored now →
      </Link>
    </div>
  );
}

function CalibrationMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="border border-mineral bg-carbon/55 p-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold text-white">{value}</dd>
    </div>
  );
}
