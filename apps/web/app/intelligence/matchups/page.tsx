import type { Metadata } from "next";
import Link from "next/link";
import { IntelligenceSubnav } from "@/components/intelligence/intelligence-subnav";
import { Atmosphere } from "@/components/ui/atmosphere";
import { Footer } from "@/components/ui/footer";
import { KpiCard } from "@/components/ui/kpi-card";
import { Nav } from "@/components/ui/nav";
import { PageHero } from "@/components/ui/page-hero";
import { SourceError } from "@/components/ui/source-error";
import { UpsellGate } from "@/components/ui/upsell-gate";
import { Reveal } from "@/components/motion/reveal";
import { AmbientGlow, SignatureGrid } from "@/components/motion/signature-grid";
import { DivergingBar, PercentileBar, SignalChip } from "@/components/ui/dataviz";
import { canAccess, getViewerTier } from "@/lib/access";
import { ratingTierClass, type SignalTone } from "@/lib/intelligence/colors";
import { loadMatchupEngine, type MatchupGrade, type MatchupRow } from "@/lib/intelligence/matchup";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // four heavy nflverse loads (model + schedule + env + charting)

export const metadata: Metadata = {
  title: "Matchup Engine — the GSE Rating, adjusted for this week",
  description:
    "Every player's GSE Rating, adjusted for who he actually lines up against this week — built from the opponent's defensive EPA, coverage, pass rush and pace. Base grade, matchup delta, and a one-line read of the draw.",
  alternates: { canonical: "/intelligence/matchups" },
};

// How many rows FREE viewers see in full before the PRO gate. The top slice is a
// genuine teaser (the very best matchups of the week); the full board is PRO.
const FREE_ROWS = 6;

/** Map a matchup grade to the shared dark-safe signal tone. */
function gradeTone(grade: MatchupGrade): SignalTone {
  if (grade === "favorable") return "good";
  if (grade === "tough") return "bad";
  return "neutral";
}

const GRADE_LABEL: Record<MatchupGrade, string> = {
  favorable: "Favorable",
  neutral: "Neutral",
  tough: "Tough",
  unknown: "No read",
};

/**
 * One matchup row. Pure presentational — server-safe (the dataviz primitives have
 * no "use client" and carry their own a11y). Renders base rating, the matchup
 * chip + diverging delta bar, opponent, adjusted read, and the one-line note.
 */
function MatchupCard({ row }: { row: MatchupRow }): JSX.Element {
  const tone = gradeTone(row.grade);
  return (
    <li className="flex flex-col gap-3 rounded-ds-md border border-surface-line bg-surface-raised p-4 sm:flex-row sm:items-center sm:gap-5">
      {/* Identity */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-ion-white">{row.name}</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-ion-2">
            {row.position} · {row.team}
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-ion-1">{row.note}</p>
      </div>

      {/* Opponent */}
      <div className="flex shrink-0 flex-col items-start sm:w-24 sm:items-center">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ion-2">Opponent</span>
        <span className="font-mono text-sm text-ion-white">{row.opponent ?? "—"}</span>
      </div>

      {/* Base rating */}
      <div className="flex shrink-0 flex-col items-start sm:w-28 sm:items-center">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ion-2">Base GSE</span>
        <span className={`font-numerals text-2xl font-semibold tabular-nums ${ratingTierClass(row.baseRating)}`}>
          {row.baseRating}
        </span>
      </div>

      {/* Matchup delta + chip */}
      <div className="flex shrink-0 flex-col items-start gap-1 sm:w-44 sm:items-center">
        <SignalChip label={GRADE_LABEL[row.grade]} tone={tone} title="Matchup grade vs this opponent" />
        <DivergingBar value={row.matchupDelta} domain={12} digits={1} tone={tone} />
      </div>

      {/* Adjusted read */}
      <div className="flex shrink-0 flex-col items-start sm:w-28 sm:items-center">
        <span className="font-mono text-[10px] uppercase tracking-wider text-ion-2">This week</span>
        <PercentileBar pct={row.adjustedRating} tone={tone} />
      </div>
    </li>
  );
}

/** A labeled section of matchup rows. */
function MatchupList({ rows }: { rows: readonly MatchupRow[] }): JSX.Element {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <MatchupCard key={row.playerId} row={row} />
      ))}
    </ul>
  );
}

/**
 * The matchup board. FREE viewers see the top FREE_ROWS in full, then the rest of
 * the board blurred behind a PRO gate (an honest teaser — the best matchups are
 * visible, the depth is the paid value). PRO/ELITE/ADMIN see the whole board.
 */
function MatchupBoard({ rows, unlocked }: { rows: readonly MatchupRow[]; unlocked: boolean }): JSX.Element {
  if (unlocked) {
    return <MatchupList rows={rows} />;
  }
  const free = rows.slice(0, FREE_ROWS);
  const gated = rows.slice(FREE_ROWS);
  return (
    <div className="flex flex-col gap-8">
      <MatchupList rows={free} />
      {gated.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-orbital-cyan">
              The full slate
            </p>
            <h2 className="text-xl font-semibold text-ion-white">Every matchup, ranked.</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-ion-1">
              You're seeing this week's top matchups. The complete board — every player, every draw,
              adjusted top to bottom — is part of PRO.
            </p>
          </div>
          <UpsellGate locked tier="PRO" label="every matchup, ranked">
            <MatchupList rows={gated} />
          </UpsellGate>
        </div>
      ) : null}
    </div>
  );
}

/**
 * /intelligence/matchups — the weekly Matchup Engine.
 *
 * Turns the season-long GSE Rating into a game-specific edge: each player's base
 * rating, a matchup delta from the opponent's real defensive context (EPA,
 * coverage, pass rush, pace), the favorable/tough grade, and a one-line read. The
 * base rating is never re-graded — the delta is a weekly presentation adjustment.
 *
 * FREE sees the top slice; the full board is behind a PRO UpsellGate (tier read on
 * the server). Honest empty states when the gating sources can't be reached.
 * Aesthetically aligned to the premium dark motion look (ambient glow + signature
 * grid behind the hero, Reveal on scroll-in). Real data only.
 */
export default async function MatchupsPage(): Promise<JSX.Element> {
  const [tier, engineResult] = await Promise.all([
    getViewerTier(),
    loadMatchupEngine().then(
      (value) => ({ ok: true as const, value }),
      (reason) => ({ ok: false as const, reason }),
    ),
  ]);
  const unlocked = canAccess(tier, "PRO");

  let board: JSX.Element;
  let kpis: JSX.Element | null = null;

  if (!engineResult.ok || engineResult.value.status === "source-error") {
    const reason = !engineResult.ok
      ? engineResult.reason instanceof Error
        ? engineResult.reason.message
        : "UNKNOWN"
      : engineResult.value.error ?? "UNKNOWN";
    board = (
      <SourceError
        kicker="Source error"
        title="The matchup board isn't loading right now."
        reason={`The Matchup Engine reads from live nflverse data and it couldn't be reached. We'd rather show you nothing than a matchup read we can't stand behind — check back shortly.`}
      >
        <p className="font-mono text-xs leading-5 text-ion-2">{reason}</p>
      </SourceError>
    );
  } else {
    const engine = engineResult.value;
    kpis = (
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Week"
          value={engine.week ?? "—"}
          sublabel={`${engine.season} season`}
        />
        <KpiCard
          label="Games covered"
          value={engine.gamesCovered}
          sublabel="opponents paired from the schedule"
        />
        <KpiCard
          label="Matchups read"
          value={engine.matchupsRead}
          sublabel="players with real opponent context"
        />
      </div>
    );
    board = <MatchupBoard rows={engine.rows} unlocked={unlocked} />;
  }

  return (
    <div className="min-h-screen bg-surface-base text-ion-white">
      <Atmosphere />
      <Nav />
      <IntelligenceSubnav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        {/* HERO — ambient glow + signature radar drift behind the weekly pitch. */}
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-ds-lg">
            <AmbientGlow className="-z-10" />
            <SignatureGrid className="-z-10" opacity={0.1} rotate />
            <div className="relative z-10">
              <PageHero
                variant="dark"
                eyebrow="Matchup Engine"
                title="The rating, adjusted for this week."
                description={
                  <>
                    The GSE Rating grades a player against his position all season. The Matchup Engine
                    adds the piece the season-long number can't: who he actually lines up against this
                    week. We read the opponent's defensive EPA, coverage, pass rush and pace, then nudge
                    the rating — favorable or tough — and tell you why in a line. The base grade is the
                    season; the delta is the draw.
                  </>
                }
                actions={
                  <Link
                    href="/intelligence/rating"
                    className="inline-flex min-h-9 items-center justify-center rounded-ds-sm border border-surface-line px-3 py-2 text-xs font-semibold text-ion-2 hover:border-surface-line-strong hover:text-ion-white"
                  >
                    See the base GSE Rating
                  </Link>
                }
              />
            </div>
          </div>
        </Reveal>

        {kpis ? <Reveal delay={80}>{kpis}</Reveal> : null}

        <Reveal delay={140}>
          <section className="flex min-w-0 flex-col gap-6" aria-label="Matchup board">
            {board}
          </section>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}
