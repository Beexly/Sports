import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { Entitlements } from "@sports/types";
import { SITE_URL } from "@/lib/seo/site-url";

/**
 * /preview/[sport]/[slug] URL-form contract — canonical sport slugs render,
 * legacy Sport-cuid URLs 308, and the cuid never reaches an SEO surface.
 *
 * The [sport] segment historically WAS the Sport cuid (the page queried
 * `Game.sportId` with the raw param), so ~731 cuid URLs got indexed and the
 * cuid leaked into the title, meta description, JSON-LD, and page header.
 * The fix: `resolveSportParam` maps either form to the Sport row; canonical
 * slugs (slugify(Sport.name)) render, everything else 308s via
 * `permanentRedirect` BEFORE any metadata or game query — in BOTH the page
 * and generateMetadata (a coherent pair), so link equity transfers and no
 * legacy document is ever emitted.
 *
 * Invariants pinned here:
 *  - legacy cuid param → permanentRedirect("/preview/<slug>/<matchup>") from
 *    both entry points, with the game query never issued pre-redirect;
 *  - unknown sport → notFound() (page) / "Preview not found" (metadata);
 *  - canonical request → alternates.canonical is the slug-form URL, and the
 *    Sport cuid appears NOWHERE in the rendered HTML or the metadata.
 */

// notFound()/permanentRedirect() throw in Next — model them as capturable
// sentinels. Defined via vi.hoisted so the hoisted vi.mock factory can see them.
const sentinels = vi.hoisted(() => {
  class PermanentRedirectSentinel extends Error {
    readonly url: string;
    constructor(url: string) {
      super(`permanentRedirect: ${url}`);
      this.url = url;
    }
  }
  class NotFoundSentinel extends Error {
    constructor() {
      super("notFound");
    }
  }
  return { PermanentRedirectSentinel, NotFoundSentinel };
});

const mocks = vi.hoisted(() => ({
  gameFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  sportFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  auth: vi.fn<() => Promise<{ user?: { id?: string } } | null>>(),
  getUserEntitlements: vi.fn<(userId: string) => Promise<Entitlements>>(),
}));

vi.mock("next/navigation", () => ({
  notFound: (): never => {
    throw new sentinels.NotFoundSentinel();
  },
  permanentRedirect: (url: string): never => {
    throw new sentinels.PermanentRedirectSentinel(url);
  },
}));

vi.mock("@sports/db", () => ({
  db: {
    game: { findMany: mocks.gameFindMany },
    sport: { findMany: mocks.sportFindMany },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/entitlements", () => ({
  getUserEntitlements: mocks.getUserEntitlements,
}));

// Nav is an async server component (session-aware) and Footer is pure chrome —
// neither carries game data. Stub them so the render stays focused on the page.
vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));

// next/script injects via effects in the browser; render a plain <script> so the
// JSON-LD payload is part of the asserted document exactly as it ships in HTML.
vi.mock("next/script", () => ({
  default: (props: {
    id?: string;
    type?: string;
    dangerouslySetInnerHTML?: { __html: string };
  }): JSX.Element => (
    <script
      id={props.id}
      type={props.type}
      dangerouslySetInnerHTML={props.dangerouslySetInnerHTML}
    />
  ),
}));

import PreviewPage, {
  generateMetadata,
} from "@/app/preview/[sport]/[slug]/page";

// Letters-only cuid so it can't collide with any numeric assertion.
const SPORT_CUID = "cmsportnflzz";

function sportFixture() {
  return { id: SPORT_CUID, key: "americanfootball_nfl", name: "NFL" };
}

function gameFixture() {
  return {
    id: "game-1",
    sportId: SPORT_CUID,
    status: "SCHEDULED",
    homeTeamName: "Chiefs",
    awayTeamName: "Broncos",
    commenceTime: new Date("2026-07-12T20:00:00.000Z"),
    openingSpread: -2.5,
    openingTotal: 47.5,
    lineMovementSpread: -2.7,
    lineMovementTotal: 1.5,
    picks: [
      {
        id: "pick-1",
        pickType: "SPREAD",
        selection: "Chiefs -3.5",
        line: -3.5,
        confidence: 91,
        reasoningShort: "Market and rest edges align.",
      },
    ],
  };
}

function props(sport: string) {
  return { params: Promise.resolve({ sport, slug: "broncos-vs-chiefs" }) };
}

/** Await a page/metadata promise and hand back whatever it threw (null if none). */
async function captureThrow(p: Promise<unknown>): Promise<unknown> {
  try {
    await p;
    return null;
  } catch (err) {
    return err;
  }
}

beforeEach(() => {
  mocks.gameFindMany.mockReset().mockResolvedValue([gameFixture()]);
  mocks.sportFindMany.mockReset().mockResolvedValue([sportFixture()]);
  mocks.auth.mockReset().mockResolvedValue(null);
  mocks.getUserEntitlements.mockReset();
});

describe("/preview/[sport]/[slug] — legacy cuid URLs 308 to the sport slug", () => {
  it("page: legacy cuid param redirects BEFORE the game query is issued", async () => {
    const err = await captureThrow(PreviewPage(props(SPORT_CUID)));
    expect(err).toBeInstanceOf(sentinels.PermanentRedirectSentinel);
    expect((err as InstanceType<typeof sentinels.PermanentRedirectSentinel>).url).toBe(
      "/preview/nfl/broncos-vs-chiefs",
    );
    // The redirect precedes any game lookup — no query wasted on a doomed URL.
    expect(mocks.gameFindMany).not.toHaveBeenCalled();
  });

  it("generateMetadata: same redirect — the pair stays coherent, no legacy metadata", async () => {
    const err = await captureThrow(generateMetadata(props(SPORT_CUID)));
    expect(err).toBeInstanceOf(sentinels.PermanentRedirectSentinel);
    expect((err as InstanceType<typeof sentinels.PermanentRedirectSentinel>).url).toBe(
      "/preview/nfl/broncos-vs-chiefs",
    );
    expect(mocks.gameFindMany).not.toHaveBeenCalled();
  });

  it("non-canonical casing ('NFL') also redirects to the lowercase slug", async () => {
    const err = await captureThrow(PreviewPage(props("NFL")));
    expect(err).toBeInstanceOf(sentinels.PermanentRedirectSentinel);
    expect((err as InstanceType<typeof sentinels.PermanentRedirectSentinel>).url).toBe(
      "/preview/nfl/broncos-vs-chiefs",
    );
  });
});

describe("/preview/[sport]/[slug] — unknown sport 404s in both entry points", () => {
  it("page: unknown sport param throws notFound", async () => {
    const err = await captureThrow(PreviewPage(props("cricket")));
    expect(err).toBeInstanceOf(sentinels.NotFoundSentinel);
    expect(mocks.gameFindMany).not.toHaveBeenCalled();
  });

  it("generateMetadata: unknown sport returns the not-found title", async () => {
    const metadata = await generateMetadata(props("cricket"));
    expect(metadata).toEqual({ title: "Preview not found" });
  });
});

describe("/preview/[sport]/[slug] — canonical slug renders, cuid banished from SEO text", () => {
  it("canonical tag points at the slug-form URL and metadata carries no cuid", async () => {
    const metadata = await generateMetadata(props("nfl"));
    expect(metadata.alternates?.canonical).toBe(
      `${SITE_URL}/preview/nfl/broncos-vs-chiefs`,
    );
    // Sport.name drives every SEO string — the cuid can no longer leak into
    // the title, description, OG/twitter, or canonical.
    expect(JSON.stringify(metadata)).not.toContain(SPORT_CUID);
    expect(metadata.title).toBe("Broncos vs Chiefs prediction & pick | NFL");
    expect(metadata.description).toContain("NFL:");
  });

  it("rendered HTML (body + JSON-LD) never contains the Sport cuid", async () => {
    const { container } = render(await PreviewPage(props("nfl")));
    const html = container.innerHTML;
    expect(html).not.toContain(SPORT_CUID);
    // The header chip renders the Sport name, not the URL param or the cuid.
    expect(container.textContent).toContain("NFL");
  });
});
