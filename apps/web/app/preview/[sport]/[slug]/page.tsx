/**
 * /preview/[sport]/[slug] — programmatic SEO matchup preview page.
 *
 * One page per game. The slug encodes "away-team-vs-home-team" (URL-safe). On
 * page load we find the matching Game row, attach the best published pick if one
 * exists, then spread the result from buildMatchupPreview() for metadata + JSON-LD.
 *
 * Graceful degradation: if the DB is unavailable or the game isn't found, returns
 * 404. If no pick exists yet the page still renders matchup details + JSON-LD.
 */

import type { Metadata } from "next";
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
import type { PickType } from "@sports/db";

// ── helpers ──────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function loadGameForSlug(sport: string, slug: string) {
  const vsIdx = slug.indexOf("-vs-");
  if (vsIdx === -1) return null;
  const awayPart = slug.slice(0, vsIdx);
  const homePart = slug.slice(vsIdx + 4); // "-vs-".length === 4

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

function toMatchupInput(
  sport: string,
  game: NonNullable<Awaited<ReturnType<typeof loadGameForSlug>>>,
): MatchupPreviewInput {
  const raw = game.picks[0] ?? null;
  const pick: MatchupPick | null = raw
    ? {
        type: raw.pickType as PickType & ("SPREAD" | "MONEYLINE" | "TOTAL"),
        selection: raw.selection,
        line: raw.line,
        confidence: raw.confidence,
      }
    : null;

  return {
    sport,
    homeTeam: game.homeTeamName,
    awayTeam: game.awayTeamName,
    startTimeIso: game.commenceTime.toISOString(),
    pick,
  };
}

// ── Next.js route exports ─────────────────────────────────────────────────────

interface Props {
  params: Promise<{ sport: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sport, slug } = await params;
  const game = await loadGameForSlug(sport, slug);
  if (!game) return { title: "Preview not found" };

  const input = toMatchupInput(sport, game);
  const preview = buildMatchupPreview(input);

  return {
    title: preview.metadata.title,
    description: preview.metadata.description,
    alternates: { canonical: preview.metadata.canonical },
    openGraph: {
      title: preview.metadata.title,
      description: preview.metadata.description,
      url: preview.metadata.canonical,
      type: "article",
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: preview.metadata.title,
      description: preview.metadata.description,
      images: ["/opengraph-image"],
    },
  };
}

export default async function PreviewPage({ params }: Props) {
  const { sport, slug } = await params;
  const game = await loadGameForSlug(sport, slug);
  if (!game) notFound();

  const input = toMatchupInput(sport, game);
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

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            {sport.toUpperCase()} · {formattedDate}
          </p>
          <h1 className="text-3xl font-bold">
            {game.awayTeamName} vs {game.homeTeamName}
          </h1>
          <p className="text-muted-foreground">{formattedTime}</p>
        </header>

        {/* Model lean */}
        {pick ? (
          <section className="rounded-lg border p-6 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Model Lean
            </p>
            <p className="text-2xl font-semibold">{pick.selection}</p>
            <p className="text-sm text-muted-foreground">
              {pick.pickType} · Confidence {pick.confidence}/100
            </p>
            {pick.reasoningShort && (
              <p className="text-sm mt-2 text-foreground">{pick.reasoningShort}</p>
            )}
          </section>
        ) : (
          <section className="rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">
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
              <dt className="text-muted-foreground w-28 shrink-0">Away</dt>
              <dd>{game.awayTeamName}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground w-28 shrink-0">Home</dt>
              <dd>{game.homeTeamName}</dd>
            </div>
            {game.openingSpread != null && (
              <div className="flex gap-2">
                <dt className="text-muted-foreground w-28 shrink-0">
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
                <dt className="text-muted-foreground w-28 shrink-0">
                  Total (O/U)
                </dt>
                <dd>{game.openingTotal}</dd>
              </div>
            )}
            {game.lineMovementSpread != null &&
              game.lineMovementSpread !== 0 && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-28 shrink-0">
                    Line movement
                  </dt>
                  <dd>
                    {game.lineMovementSpread > 0 ? "+" : ""}
                    {game.lineMovementSpread.toFixed(1)} (spread)
                  </dd>
                </div>
              )}
          </dl>
        </section>

        {/* Legal */}
        <p className="text-xs text-muted-foreground border-t pt-4">
          All model reads are generated from real bookmaker odds data. Not
          financial or gambling advice. Past model performance does not guarantee
          future results.
        </p>
      </main>

      <Footer />
    </>
  );
}
