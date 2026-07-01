/**
 * Programmatic-SEO engine for matchup/preview pages — the content flywheel.
 *
 * Pure builders: turn one game+pick into the slug, canonical path, page metadata, and the
 * schema.org JSON-LD (SportsEvent + FAQPage + BreadcrumbList) that wins rich results. A
 * `/preview/[sport]/[slug]` page just calls `buildMatchupPreview(input)` and spreads the
 * result. At 7 sports × full schedules this generates thousands of long-tail indexable
 * pages ("lakers vs celtics prediction") from data already in the DB.
 *
 * Facts-only + on-brand: copy is templated from the structured pick (no fabricated stats,
 * no hype/guarantees — CLAUDE.md). No DB here — pure + fully testable.
 */

export const SITE_URL = (process.env["NEXT_PUBLIC_APP_URL"] ?? "https://galaxysportsedge.com").replace(/\/$/, "");

export type MatchupPick = {
  readonly type: "SPREAD" | "MONEYLINE" | "TOTAL";
  readonly selection: string;
  readonly line: number;
  readonly confidence: number; // 0–100
};

export type MatchupPreviewInput = {
  readonly sport: string; // "nfl", "ncaaf", ...
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly startTimeIso: string;
  readonly venue?: string | null;
  readonly pick?: MatchupPick | null;
  readonly faq?: ReadonlyArray<{ q: string; a: string }>;
};

const slugify = (s: string): string =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** "away-team-vs-home-team" (away first — the natural "@ home" reading order). */
export function matchupSlug(awayTeam: string, homeTeam: string): string {
  return `${slugify(awayTeam)}-vs-${slugify(homeTeam)}`;
}

export function matchupPath(sport: string, awayTeam: string, homeTeam: string): string {
  return `/preview/${slugify(sport)}/${matchupSlug(awayTeam, homeTeam)}`;
}

export function matchupCanonical(input: MatchupPreviewInput): string {
  return `${SITE_URL}${matchupPath(input.sport, input.awayTeam, input.homeTeam)}`;
}

function pickSentence(pick: MatchupPick): string {
  const line = pick.type === "MONEYLINE" ? "" : ` ${pick.line > 0 ? "+" : ""}${pick.line}`;
  return `Our model's lean: ${pick.selection}${line} (${pick.type.toLowerCase()}), confidence ${Math.round(pick.confidence)}/100.`;
}

export function buildMatchupMetadata(input: MatchupPreviewInput): { title: string; description: string; canonical: string } {
  const base = `${input.awayTeam} vs ${input.homeTeam} prediction & pick`;
  const sportUpper = input.sport.toUpperCase();
  const lead = input.pick
    ? `${input.pick.selection} ${input.pick.type === "MONEYLINE" ? "ML" : input.pick.line}, ${Math.round(input.pick.confidence)}/100 confidence.`
    : "Model read, line, and matchup context.";
  return {
    title: `${base} | ${sportUpper}`,
    description: `${sportUpper}: ${input.awayTeam} at ${input.homeTeam}. ${lead} Data-backed, no hype.`.slice(0, 300),
    canonical: matchupCanonical(input),
  };
}

export function buildSportsEventJsonLd(input: MatchupPreviewInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${input.awayTeam} vs ${input.homeTeam}`,
    sport: input.sport.toUpperCase(),
    startDate: input.startTimeIso,
    eventStatus: "https://schema.org/EventScheduled",
    ...(input.venue ? { location: { "@type": "Place", name: input.venue } } : {}),
    competitor: [
      { "@type": "SportsTeam", name: input.awayTeam },
      { "@type": "SportsTeam", name: input.homeTeam },
    ],
    url: matchupCanonical(input),
  };
}

export function buildBreadcrumbJsonLd(input: MatchupPreviewInput): Record<string, unknown> {
  const items = [
    { name: "Picks", path: "/picks" },
    // Sport crumb → the always-indexable /picks hub. /preview/{sport} has no
    // index page (404 on every matchup crumb), and per-sport /{sport} pages
    // don't exist for all sports, so /picks is the only universally-safe target.
    { name: input.sport.toUpperCase(), path: "/picks" },
    { name: `${input.awayTeam} vs ${input.homeTeam}`, path: matchupPath(input.sport, input.awayTeam, input.homeTeam) },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  };
}

export function buildFaqJsonLd(faq: ReadonlyArray<{ q: string; a: string }>): Record<string, unknown> | null {
  if (!faq.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

/** Default, fact-templated FAQ when a page doesn't supply its own. */
export function defaultMatchupFaq(input: MatchupPreviewInput): Array<{ q: string; a: string }> {
  const faq: Array<{ q: string; a: string }> = [
    {
      q: `Who is favored in ${input.awayTeam} vs ${input.homeTeam}?`,
      a: input.pick ? pickSentence(input.pick) : `See the latest model read and market line for ${input.awayTeam} at ${input.homeTeam}.`,
    },
    { q: `When do ${input.awayTeam} and ${input.homeTeam} play?`, a: `Scheduled for ${input.startTimeIso}${input.venue ? ` at ${input.venue}` : ""}.` },
  ];
  return faq;
}

/** One call a `/preview/[sport]/[slug]` page spreads: metadata + canonical + all JSON-LD blocks. */
export function buildMatchupPreview(input: MatchupPreviewInput): {
  metadata: { title: string; description: string; canonical: string };
  path: string;
  jsonLd: Array<Record<string, unknown>>;
} {
  const faq = input.faq?.length ? [...input.faq] : defaultMatchupFaq(input);
  const faqLd = buildFaqJsonLd(faq);
  return {
    metadata: buildMatchupMetadata(input),
    path: matchupPath(input.sport, input.awayTeam, input.homeTeam),
    jsonLd: [buildSportsEventJsonLd(input), buildBreadcrumbJsonLd(input), ...(faqLd ? [faqLd] : [])],
  };
}
