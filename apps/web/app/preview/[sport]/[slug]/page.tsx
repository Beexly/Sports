/**
 * /preview/[sport]/[slug] — programmatic SEO matchup preview page.
 *
 * One page per game. The slug encodes "away-team-vs-home-team" (URL-safe). On
 * page load we find the matching Game row, attach the best published pick if one
 * exists, then spread the result from buildMatchupPreview() for metadata + JSON-LD.
 *
 * Graceful degradation: if the DB is unavailable or the game isn't found, returns
 * 404. If no pick exists yet the page still renders matchup details + JSON-LD.
 *
 * Two independent server-side gates layer on this page, in order:
 *
 * 1. Record-integrity gate (readiness + freshness + data quality): picks are
 *    attached only when the public-picks readiness gate is open, the odds feed
 *    is provably fresh for this sport, and the game clears the public
 *    data-quality floor. Every published market claim must survive
 *    `projectPublicMarket` — a candidate that cannot be canonically projected
 *    is never surfaced, in HTML, metadata, or JSON-LD.
 *
 * 2. Paywall (CLAUDE.md rule #3 — server-side only): this is a PUBLIC surface,
 *    but two of its values are the platform's paid metrics, gated for FREE on
 *    the board (`/api/picks`), the audit route (#103), and the game room (#109):
 *
 *     - line movement (`canSeeLineMovement`) — the Pro-tier market read, and
 *     - the confidence score (`canSeeConfidence`) — the paid number on every pick.
 *
 *    The viewer's entitlements are resolved server-side (anonymous → FREE,
 *    fail-closed) BEFORE any paid value is selected — the pick query itself only
 *    fetches `confidence` for entitled viewers — and the paid values are
 *    rendered ONLY past the gate, including the meta description and FAQ
 *    JSON-LD, which are part of the same anonymous document. Un-entitled
 *    viewers get an honest locked hint, never the numbers.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { notFound } from "next/navigation";
import Script from "next/script";
import { db } from "@sports/db";
import {
  buildMatchupPreview,
  type MatchupPreviewInput,
  type MatchupPick,
} from "@/lib/seo/sports-jsonld";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import {
  formatMarketDelta,
  normalizeMarketPoint,
} from "@sports/types";
import {
  projectPublicMarket,
  type PublicMarketProjection,
} from "@/lib/market/project-public-market";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  getFreshPublicOddsSportKeys,
  isPublicPicksSurfaceStale,
} from "@/lib/data-reliability/public-freshness-gate";
import { MIN_PUBLIC_PICK_DATA_QUALITY_SCORE } from "@/lib/public-picks-quality";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";

const PREVIEW_PICK_CANDIDATE_LIMIT = 10;

// Per-viewer gating means this page can never be served from a shared static /
// full-route cache — a cached Pro render would hand the paid metrics to the next
// anonymous visitor. Mirrors /room/[gameId] (#109).
export const dynamic = "force-dynamic";

// ── helpers ──────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function loadGameForSlug(
  sport: string,
  slug: string,
  includeConfidence: boolean,
) {
  const vsIdx = slug.indexOf("-vs-");
  if (vsIdx === -1) return null;
  const awayPart = slug.slice(0, vsIdx);
  const homePart = slug.slice(vsIdx + 4); // "-vs-".length === 4

  const gates = getReadinessGates();
  let canExposePick = gates.canExposePublicPicks;
  let freshSportKeys: Set<string> | null = null;
  if (canExposePick && gates.forceNoBetIfStale) {
    const [stale, freshSports] = await Promise.all([
      isPublicPicksSurfaceStale().catch(() => true),
      getFreshPublicOddsSportKeys().catch(() => null),
    ]);
    if (stale || !freshSports || freshSports.size === 0) {
      canExposePick = false;
    } else {
      freshSportKeys = freshSports;
    }
  }

  // Pull recent + upcoming games for the sport (bounded query — no full scan)
  try {
    const candidates = await db.game.findMany({
      where: {
        sportId: sport,
        status: { in: ["SCHEDULED", "LIVE", "FINAL"] },
      },
      orderBy: { commenceTime: "desc" },
      take: 500,
      include: {
        sport: { select: { name: true, key: true } },
        picks: {
          where: {
            isPublished: true,
            isBootstrap: false, // never expose bootstrap-era picks publicly (mirrors /api/picks)
            tier: "FREE",
            // Production seed-row exclusion (defense-in-depth) — drop dev seed
            // rows tagged modelVersion="v5.0.0-seed" only in production; no-op in
            // dev/test. Mirrors excludeSeedInProd in app/api/picks/route.ts.
            ...(process.env.NODE_ENV === "production"
              ? { NOT: { modelVersion: "v5.0.0-seed" } }
              : {}),
          },
          orderBy: { confidence: "desc" },
          take: PREVIEW_PICK_CANDIDATE_LIMIT,
          // The confidence number is the paid metric (`canSeeConfidence`, #114):
          // it is SELECTED only for entitled viewers — the anonymous/FREE query
          // never even fetches it. reasoningShort is the free teaser the board
          // serves to FREE, so it is fetched for every viewer.
          select: includeConfidence
            ? {
                pickType: true,
                selection: true,
                line: true,
                reasoningShort: true,
                confidence: true,
              }
            : {
                pickType: true,
                selection: true,
                line: true,
                reasoningShort: true,
              },
        },
      },
    });
    const game = candidates.find(
      (candidate) =>
        slugify(candidate.awayTeamName) === awayPart &&
        slugify(candidate.homeTeamName) === homePart,
    );
    if (!game) return null;
    const pickBoundaryOpen =
      canExposePick &&
      game.dataQualityScore >= MIN_PUBLIC_PICK_DATA_QUALITY_SCORE &&
      (freshSportKeys === null || freshSportKeys.has(game.sport.key));
    return pickBoundaryOpen ? game : { ...game, picks: [] };
  } catch {
    return null; // DB unavailable — render 404 rather than 500
  }
}

type LoadedGame = NonNullable<Awaited<ReturnType<typeof loadGameForSlug>>>;

interface ProjectedPreviewPick {
  readonly market: PublicMarketProjection;
  /** Paid metric — null whenever the viewer's query did not fetch it. */
  readonly confidence: number | null;
  /** Free teaser (board parity) — safe for every viewer. */
  readonly reasoningShort: string;
}

/**
 * First candidate that survives canonical market projection. A pick whose
 * market claim cannot be projected (off-tick line, drifted selection text) is
 * never published — in HTML, metadata, or JSON-LD.
 */
function selectProjectedPick(game: LoadedGame): ProjectedPreviewPick | null {
  for (const raw of game.picks) {
    const market = projectPublicMarket({
      pickType: String(raw.pickType),
      selection: raw.selection,
      line: raw.line,
      sport: game.sport.name,
      homeTeam: game.homeTeamName,
      awayTeam: game.awayTeamName,
      openingSpread: game.openingSpread,
      openingTotal: game.openingTotal,
    });
    if (market) {
      // `confidence` exists on the row only when the entitled query fetched it.
      const confidence = (raw as { confidence?: unknown }).confidence;
      return {
        market,
        confidence: typeof confidence === "number" ? confidence : null,
        reasoningShort: raw.reasoningShort,
      };
    }
  }
  return null;
}

function toMatchupInput(
  sport: string,
  game: LoadedGame,
  canSeeConfidence: boolean,
): MatchupPreviewInput {
  const projected = selectProjectedPick(game);
  const base = {
    sport,
    homeTeam: game.homeTeamName,
    awayTeam: game.awayTeamName,
    startTimeIso: game.commenceTime.toISOString(),
  };
  if (!projected) return { ...base, pick: null };

  const { market } = projected;

  if (canSeeConfidence && projected.confidence != null) {
    // Entitled viewers (PRO/ELITE): the full canonical pick, confidence included.
    const pick: MatchupPick = {
      type: market.pickType,
      selection: market.selection,
      line: market.line,
      confidence: projected.confidence,
    };
    return { ...base, pick };
  }

  // Un-entitled viewers (anonymous → FREE, fail-closed): the confidence number
  // is the paid metric (`canSeeConfidence` — board, audit route, game room).
  // Never hand it to the SEO builder: `buildMatchupPreview` would embed it in
  // the meta description and the FAQ JSON-LD of the anonymous document. Keep
  // the free-visible facts (canonical selection / market) via a page-built FAQ
  // that mirrors `defaultMatchupFaq` minus the confidence clause.
  return {
    ...base,
    pick: null,
    faq: [
      {
        q: `Who is favored in ${game.awayTeamName} vs ${game.homeTeamName}?`,
        a: `Our model's lean: ${market.selection} (${market.pickType.toLowerCase()}). The confidence score is part of Pro.`,
      },
      {
        q: `When do ${game.awayTeamName} and ${game.homeTeamName} play?`,
        a: `Scheduled for ${base.startTimeIso}.`,
      },
    ],
  };
}

/**
 * Meta description for un-entitled viewers — `buildMatchupMetadata`'s exact
 * template minus the paid confidence clause, so the free-visible pick facts
 * (canonical selection + line) stay in the SERP snippet without leaking the
 * number. Uses the same projected market as the page body: an unprojectable
 * candidate never reaches the snippet either.
 */
function freeSafeDescription(sport: string, game: LoadedGame): string {
  const projected = selectProjectedPick(game);
  const sportUpper = sport.toUpperCase();
  const lead = projected
    ? `${projected.market.selection}.`
    : "Model read, line, and matchup context.";
  return `${sportUpper}: ${game.awayTeamName} at ${game.homeTeamName}. ${lead} Data-backed, no hype.`.slice(
    0,
    300,
  );
}

// ── Next.js route exports ─────────────────────────────────────────────────────

interface Props {
  params: Promise<{ sport: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sport, slug } = await params;
  // Entitlements FIRST (anonymous → FREE, fail-closed): the loader's pick query
  // fetches the paid confidence column only for entitled viewers.
  const viewer = await getViewerEntitlements();
  const game = await loadGameForSlug(sport, slug, viewer.canSeeConfidence);
  if (!game) return { title: "Preview not found" };

  const input = toMatchupInput(sport, game, viewer.canSeeConfidence);
  const preview = buildMatchupPreview(input);
  // Entitled viewers keep the existing description (confidence included);
  // everyone else — crawlers are anonymous → FREE — gets the free-safe variant.
  const description = viewer.canSeeConfidence
    ? preview.metadata.description
    : freeSafeDescription(sport, game);

  return {
    title: preview.metadata.title,
    description,
    alternates: { canonical: preview.metadata.canonical },
    openGraph: {
      title: preview.metadata.title,
      description,
      url: preview.metadata.canonical,
      type: "article",
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: preview.metadata.title,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export default async function PreviewPage({ params }: Props) {
  const { sport, slug } = await params;
  // Resolve the viewer's entitlements server-side (anonymous → FREE, fail-closed)
  // BEFORE anything paid is selected (CLAUDE.md rule #3) — the loader's pick
  // query fetches the paid confidence column only for entitled viewers.
  const viewer = await getViewerEntitlements();
  const game = await loadGameForSlug(sport, slug, viewer.canSeeConfidence);
  if (!game) notFound();

  const input = toMatchupInput(sport, game, viewer.canSeeConfidence);
  const preview = buildMatchupPreview(input);
  const projected = selectProjectedPick(game);
  const openingSpread = normalizeMarketPoint("SPREAD_POINTS", game.sport.name, game.openingSpread);
  const openingTotal = normalizeMarketPoint("TOTAL_POINTS", game.sport.name, game.openingTotal);
  // Line movement is the Pro-tier market read (`canSeeLineMovement`, #114):
  // the value is read ONLY past the gate — un-entitled renders never touch it.
  const spreadMovement = viewer.canSeeLineMovement
    ? normalizeMarketPoint("SPREAD_POINTS", game.sport.name, game.lineMovementSpread)
    : null;

  const gameDate = new Date(game.commenceTime);
  const formattedDate = gameDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = gameDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <>
      {/* Structured data — SportsEvent + BreadcrumbList + FAQPage */}
      {preview.jsonLd.map((block, i) => (
        <Script
          key={i}
          id={`jsonld-preview-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(block) }}
        />
      ))}

      <Nav />

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-ion-2">
            {sport.toUpperCase()} · {formattedDate}
          </p>
          <h1 className="text-3xl font-bold text-ion-white">
            {game.awayTeamName} vs {game.homeTeamName}
          </h1>
          <p className="text-ion-2">{formattedTime}</p>
        </header>

        {/* Model lean */}
        {projected ? (
          <section className="rounded-lg border border-mineral p-6 space-y-2">
            <p className="text-xs uppercase tracking-wide text-ion-2">
              Model Lean
            </p>
            <p className="text-2xl font-semibold">{projected.market.selection}</p>
            {/* The confidence number is the paid metric (`canSeeConfidence` —
                gated for FREE on the board and the game room). Render it ONLY
                past the gate; un-entitled viewers get an honest locked hint,
                never the value. */}
            {viewer.canSeeConfidence && projected.confidence != null ? (
              <p className="text-sm text-ion-2">
                {projected.market.pickType} · Confidence {projected.confidence}/100
              </p>
            ) : (
              <p className="text-sm text-ion-2">
                {projected.market.pickType} ·{" "}
                <Link
                  href="/pricing"
                  className="font-semibold text-orbital-cyan hover:text-ion-white"
                >
                  Confidence unlocks with Pro
                </Link>
              </p>
            )}
            {/* The short reasoning teaser is free-visible (the board serves
                reasoningShort to FREE); the full factor trail never renders here. */}
            {projected.reasoningShort && (
              <p className="text-sm mt-2 text-ion-white">{projected.reasoningShort}</p>
            )}
          </section>
        ) : (
          <section className="rounded-lg border border-mineral p-6">
            <p className="text-sm text-ion-2">
              Model pick not yet available for this matchup. Check back closer to
              game time.
            </p>
          </section>
        )}

        {/* Matchup details */}
        <section className="space-y-3">
          <h2 className="font-semibold text-lg">Matchup Details</h2>
          <dl className="text-sm space-y-1.5">
            <div className="flex gap-2">
              <dt className="text-ion-2 w-28 shrink-0">Away</dt>
              <dd>{game.awayTeamName}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ion-2 w-28 shrink-0">Home</dt>
              <dd>{game.homeTeamName}</dd>
            </div>
            {openingSpread && (
              <div className="flex gap-2">
                <dt className="text-ion-2 w-28 shrink-0">
                  Opening spread
                </dt>
                <dd>
                  {openingSpread.display}
                </dd>
              </div>
            )}
            {openingTotal && (
              <div className="flex gap-2">
                <dt className="text-ion-2 w-28 shrink-0">
                  Total (O/U)
                </dt>
                <dd>{openingTotal.display}</dd>
              </div>
            )}
            {/* Line movement is the Pro-tier market read (`canSeeLineMovement`
                — gated for FREE on the board and the game room, #109). The
                value is read ONLY past the gate; un-entitled viewers always get
                the locked row (never the delta, and no presence/absence signal
                about whether the line has moved). */}
            {viewer.canSeeLineMovement ? (
              spreadMovement &&
              spreadMovement.normalized !== 0 && (
                <div className="flex gap-2">
                  <dt className="text-ion-2 w-28 shrink-0">
                    Line movement
                  </dt>
                  <dd>
                    {formatMarketDelta(spreadMovement.normalized)} (spread)
                  </dd>
                </div>
              )
            ) : (
              <div className="flex gap-2">
                <dt className="text-ion-2 w-28 shrink-0">
                  Line movement
                </dt>
                <dd>
                  <Link
                    href="/pricing"
                    className="font-semibold text-orbital-cyan hover:text-ion-white"
                  >
                    Unlocks with Pro
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* Legal */}
        <p className="text-xs text-ion-2 border-t border-mineral pt-4">
          All model reads are generated from real bookmaker odds data. Not
          financial or gambling advice. Past model performance does not guarantee
          future results.
        </p>
      </main>

      <Footer />
    </>
  );
}
