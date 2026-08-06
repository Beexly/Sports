/**
 * /preview/[sport]/[slug] — programmatic SEO matchup preview page.
 *
 * One page per game. The slug encodes "away-team-vs-home-team" (URL-safe). On
 * page load we find the matching Game row, attach the best published pick if one
 * exists, then spread the result from buildMatchupPreview() for metadata + JSON-LD.
 *
 * URL forms — the [sport] segment accepts two shapes, one canonical:
 *
 *  - CANONICAL: the human sport slug, `slugify(Sport.name)` ("nfl", "nba").
 *    This is the only form the sitemap emits and the only form that renders.
 *  - LEGACY: the Sport cuid (the page used to query `Game.sportId` with the
 *    raw param, so cuid URLs got indexed). Legacy cuids — and non-canonical
 *    casing like "NFL" — 308 (`permanentRedirect`) to the slug form BEFORE any
 *    metadata or HTML is emitted, in both `generateMetadata` and the page, so
 *    link equity transfers and the cuid never reaches an SEO surface. The
 *    legacy handler is kept indefinitely: cuids differ per environment, so no
 *    config-level redirect list is possible. Resolution lives in
 *    `@/lib/preview/sport-resolution` (lowest `Sport.key` wins on slug ties).
 *
 * Graceful degradation: if the DB is unavailable, the sport is unknown, or the
 * game isn't found, returns 404. If no pick exists yet the page still renders
 * matchup details + JSON-LD.
 *
 * Paywall (CLAUDE.md rule #3 — server-side only): this is a PUBLIC surface, but
 * two of its values are the platform's paid metrics, gated for FREE on the board
 * (`/api/picks`), the audit route (#103), and the game room (#109):
 *
 *  - line movement (`canSeeLineMovement`) — the Pro-tier market read, and
 *  - the confidence score (`canSeeConfidence`) — the paid number on every pick.
 *
 * The viewer's entitlements are resolved server-side (anonymous → FREE,
 * fail-closed) and the paid values are selected/rendered ONLY past the gate —
 * including the meta description and FAQ JSON-LD, which are part of the same
 * anonymous document. Un-entitled viewers get an honest locked hint, never the
 * numbers.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { notFound, permanentRedirect } from "next/navigation";
import Script from "next/script";
import { db } from "@sports/db";
import {
  buildMatchupPreview,
  slugify,
  type MatchupPreviewInput,
  type MatchupPick,
} from "@/lib/seo/sports-jsonld";
import { resolveSportParam } from "@/lib/preview/sport-resolution";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import type { PickType } from "@sports/db";
import {
  bindPublicConsensusClaim,
  consensusEvidenceCaption,
  isBookmakerConsensusClaim,
} from "@/lib/claims/public-consensus-claim";

// Per-viewer gating means this page can never be served from a shared static /
// full-route cache — a cached Pro render would hand the paid metrics to the next
// anonymous visitor. Mirrors /room/[gameId] (#109).
export const dynamic = "force-dynamic";

// ── helpers ──────────────────────────────────────────────────────────────────

async function loadGameForSlug(sportId: string, slug: string) {
  const vsIdx = slug.indexOf("-vs-");
  if (vsIdx === -1) return null;
  const awayPart = slug.slice(0, vsIdx);
  const homePart = slug.slice(vsIdx + 4); // "-vs-".length === 4

  // Pull recent + upcoming games for the sport (bounded query — no full scan)
  try {
    const candidates = await db.game.findMany({
      where: {
        sportId,
        status: { in: ["SCHEDULED", "LIVE", "FINAL"] },
      },
      orderBy: { commenceTime: "desc" },
      take: 500,
      include: {
        picks: {
          where: {
            isPublished: true,
            isBootstrap: false, // never expose bootstrap-era picks publicly (mirrors /api/picks)
            // Production seed-row exclusion (defense-in-depth) — drop dev seed
            // rows tagged modelVersion="v5.0.0-seed" only in production; no-op in
            // dev/test. Mirrors excludeSeedInProd in app/api/picks/route.ts.
            ...(process.env.NODE_ENV === "production"
              ? { NOT: { modelVersion: "v5.0.0-seed" } }
              : {}),
          },
          orderBy: { confidence: "desc" },
          take: 1,
        },
      },
    });
    return (
      candidates.find(
        (g) =>
          slugify(g.awayTeamName) === awayPart &&
          slugify(g.homeTeamName) === homePart,
      ) ?? null
    );
  } catch {
    return null; // DB unavailable — render 404 rather than 500
  }
}

type LoadedGame = NonNullable<Awaited<ReturnType<typeof loadGameForSlug>>>;

function toMatchupInput(
  sportName: string,
  game: LoadedGame,
  canSeeConfidence: boolean,
): MatchupPreviewInput {
  const raw = game.picks[0] ?? null;
  const base = {
    sport: sportName,
    homeTeam: game.homeTeamName,
    awayTeam: game.awayTeamName,
    startTimeIso: game.commenceTime.toISOString(),
  };
  if (!raw) return { ...base, pick: null };

  const type = raw.pickType as PickType & ("SPREAD" | "MONEYLINE" | "TOTAL");

  if (canSeeConfidence) {
    // Entitled viewers (PRO/ELITE): unchanged — the full pick, confidence included.
    const pick: MatchupPick = {
      type,
      selection: raw.selection,
      line: raw.line,
      confidence: raw.confidence,
    };
    return { ...base, pick };
  }

  // Un-entitled viewers (anonymous → FREE, fail-closed): the confidence number
  // is the paid metric (`canSeeConfidence` — board, audit route, game room).
  // Never hand it to the SEO builder: `buildMatchupPreview` would embed it in
  // the meta description and the FAQ JSON-LD of the anonymous document. Keep
  // the free-visible facts (selection / line / market) via a page-built FAQ
  // that mirrors `defaultMatchupFaq` minus the confidence clause.
  const lineText = type === "MONEYLINE" ? "" : ` ${raw.line > 0 ? "+" : ""}${raw.line}`;
  return {
    ...base,
    pick: null,
    faq: [
      {
        q: `Who is favored in ${game.awayTeamName} vs ${game.homeTeamName}?`,
        a: `Our model's lean: ${raw.selection}${lineText} (${type.toLowerCase()}). The confidence score is part of Pro.`,
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
 * (selection + line) stay in the SERP snippet without leaking the number.
 */
function freeSafeDescription(sportName: string, game: LoadedGame): string {
  const raw = game.picks[0] ?? null;
  const sportUpper = sportName.toUpperCase();
  const lead = raw
    ? `${raw.selection} ${raw.pickType === "MONEYLINE" ? "ML" : raw.line}.`
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
  const { sport: sportParam, slug } = await params;
  const resolution = await resolveSportParam(sportParam);
  if (resolution.kind === "unknown") return { title: "Preview not found" };
  if (resolution.kind === "redirect") {
    // Legacy cuid or non-canonical casing — 308 before ANY metadata is emitted
    // (permanentRedirect throws, so no cuid ever reaches an SEO surface).
    permanentRedirect(`/preview/${resolution.sport.slug}/${slug}`);
  }
  const [game, viewer] = await Promise.all([
    loadGameForSlug(resolution.sport.id, slug),
    getViewerEntitlements(),
  ]);
  if (!game) return { title: "Preview not found" };

  const input = toMatchupInput(resolution.sport.name, game, viewer.canSeeConfidence);
  const preview = buildMatchupPreview(input);
  // Entitled viewers keep the existing description (confidence included);
  // everyone else — crawlers are anonymous → FREE — gets the free-safe variant.
  const description = viewer.canSeeConfidence
    ? preview.metadata.description
    : freeSafeDescription(resolution.sport.name, game);

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
  const { sport: sportParam, slug } = await params;
  const resolution = await resolveSportParam(sportParam);
  if (resolution.kind === "unknown") notFound();
  if (resolution.kind === "redirect") {
    // Legacy cuid or non-canonical casing — 308 to the canonical slug form
    // before any query or render work. The matchup slug passes through
    // untouched; a bad one 404s on the canonical URL after the hop.
    permanentRedirect(`/preview/${resolution.sport.slug}/${slug}`);
  }
  // Resolve the viewer's entitlements server-side (anonymous → FREE, fail-closed)
  // BEFORE anything paid is selected for render (CLAUDE.md rule #3).
  const [game, viewer] = await Promise.all([
    loadGameForSlug(resolution.sport.id, slug),
    getViewerEntitlements(),
  ]);
  if (!game) notFound();

  const input = toMatchupInput(resolution.sport.name, game, viewer.canSeeConfidence);
  const preview = buildMatchupPreview(input);
  const pick = game.picks[0] ?? null;

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

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-ion-2">
            {resolution.sport.name.toUpperCase()} · {formattedDate}
          </p>
          <h1 className="text-3xl font-bold text-ion-white">
            {game.awayTeamName} vs {game.homeTeamName}
          </h1>
          <p className="text-ion-2">{formattedTime}</p>
        </header>

        {/* Model lean */}
        {pick ? (
          <section className="rounded-lg border border-mineral p-6 space-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-ion-2">
              Model lean
            </p>
            <p className="text-2xl font-semibold">{pick.selection}</p>
            {/* The confidence number is the paid metric (`canSeeConfidence` —
                gated for FREE on the board and the game room). Render it ONLY
                past the gate; un-entitled viewers get an honest locked hint,
                never the value. */}
            {viewer.canSeeConfidence ? (
              <p className="text-sm text-ion-2">
                {pick.pickType} · Confidence {pick.confidence}/100
              </p>
            ) : (
              <p className="text-sm text-ion-2">
                {pick.pickType} ·{" "}
                <Link
                  href="/pricing"
                  className="font-semibold text-orbital-cyan hover:text-ion-white"
                >
                  Confidence unlocks with Pro
                </Link>
              </p>
            )}
            {/* Free teaser. Quantified "bookmaker consensus" claims only render
                when bound to bookmakerCount + dataFreshnessAt (T-1 tripwire).
                Non-consensus shorts still render as stored. Claim text is not
                rewritten — evidence rides as a caption. */}
            {(() => {
              const short = pick.reasoningShort?.trim() ?? "";
              if (!short) return null;
              if (isBookmakerConsensusClaim(short)) {
                const bound = bindPublicConsensusClaim({
                  reasoningShort: short,
                  consensusPct: pick.consensusPct,
                  bookmakerCount: pick.bookmakerCount,
                  dataFreshnessAt: pick.dataFreshnessAt,
                });
                if (!bound) return null;
                return (
                  <>
                    <p className="text-sm mt-2 text-ion-white">{bound.claimText}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">
                      {consensusEvidenceCaption(bound)}
                    </p>
                  </>
                );
              }
              return <p className="text-sm mt-2 text-ion-white">{short}</p>;
            })()}
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
          <h2 className="font-display text-lg font-semibold text-ion-white">Matchup details</h2>
          <dl className="text-sm space-y-1.5">
            <div className="flex gap-2">
              <dt className="text-ion-2 w-28 shrink-0">Away</dt>
              <dd>{game.awayTeamName}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ion-2 w-28 shrink-0">Home</dt>
              <dd>{game.homeTeamName}</dd>
            </div>
            {game.openingSpread != null && (
              <div className="flex gap-2">
                <dt className="text-ion-2 w-28 shrink-0">
                  Opening spread
                </dt>
                <dd>
                  {game.openingSpread > 0 ? "+" : ""}
                  {game.openingSpread}
                </dd>
              </div>
            )}
            {game.openingTotal != null && (
              <div className="flex gap-2">
                <dt className="text-ion-2 w-28 shrink-0">
                  Total (O/U)
                </dt>
                <dd>{game.openingTotal}</dd>
              </div>
            )}
            {/* Line movement is the Pro-tier market read (`canSeeLineMovement`
                — gated for FREE on the board and the game room, #109). The
                value is read ONLY past the gate; un-entitled viewers always get
                the locked row (never the delta, and no presence/absence signal
                about whether the line has moved). */}
            {viewer.canSeeLineMovement ? (
              game.lineMovementSpread != null &&
              game.lineMovementSpread !== 0 && (
                <div className="flex gap-2">
                  <dt className="text-ion-2 w-28 shrink-0">
                    Line movement
                  </dt>
                  <dd>
                    {game.lineMovementSpread > 0 ? "+" : ""}
                    {game.lineMovementSpread.toFixed(1)} (spread)
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
