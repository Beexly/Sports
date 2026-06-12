import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Behavioral tests for retracted Model Journal distribution:
 *
 * - retracted slugs answer HTTP 410 Gone with a tombstone page
 * - the RSS feed contains published entries only (no drafts, no retracted)
 * - the sitemap excludes retracted entries while keeping published URLs
 * - the retract action revalidates the archive, RSS feed, sitemap, and
 *   entry paths so retraction propagates without a redeploy
 */

interface JournalFixtureRow {
  readonly id: string;
  readonly isoWeek: number;
  readonly isoYear: number;
  readonly status: "DRAFT" | "REVIEW_PENDING" | "PUBLISHED" | "RETRACTED";
  readonly title: string;
  readonly slug: string;
  readonly bodyMarkdown: string;
  readonly referencedPickIds: readonly string[];
  readonly referencedAutopsyIds: readonly string[];
  readonly modelVersion: string;
  readonly draftedAt: Date;
  readonly publishedAt: Date | null;
  readonly retractedAt: Date | null;
  readonly retractionReason: string | null;
}

interface JournalWhere {
  readonly status?: string;
  readonly slug?: string;
}

const mocks = vi.hoisted(() => {
  const rows: JournalFixtureRow[] = [];
  const matches = (row: JournalFixtureRow, where: JournalWhere | undefined): boolean => {
    if (!where) return true;
    if (where.status !== undefined && row.status !== where.status) return false;
    if (where.slug !== undefined && row.slug !== where.slug) return false;
    return true;
  };
  return {
    rows,
    matches,
    revalidatePath: vi.fn<(path: string) => void>(),
    auth: vi.fn<() => Promise<{ user: { id: string; role: string } } | null>>(),
    update: vi.fn<(args: unknown) => Promise<unknown>>(),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@sports/db", () => ({
  db: {
    modelJournalEntry: {
      findMany: vi.fn(async (args: { where?: JournalWhere }) =>
        mocks.rows.filter((row) => mocks.matches(row, args.where))
      ),
      findFirst: vi.fn(
        async (args: { where?: JournalWhere }) =>
          mocks.rows.find((row) => mocks.matches(row, args.where)) ?? null
      ),
      findUnique: vi.fn(
        async (args: { where: { id?: string } }) =>
          mocks.rows.find((row) => row.id === args.where.id) ?? null
      ),
      update: mocks.update,
    },
  },
}));

import { GET as tombstoneGet } from "@/app/journal/retracted/[slug]/route";
import { GET as rssGet } from "@/app/journal/rss.xml/route";
import sitemap from "@/app/sitemap";
import { POST as retractPost } from "@/app/api/cockpit/journal/[id]/retract/route";

const PUBLISHED_SLUG = "week-23-2026-line-value-notes";
const RETRACTED_SLUG = "week-21-2026-overstated-edge";
const DRAFT_SLUG = "week-24-2026-draft-notes";

const PUBLISHED_TITLE = "Week 23: where the closing line agreed with us";
const RETRACTED_TITLE = "Week 21: an edge we overstated";
const DRAFT_TITLE = "Week 24: draft notes pending review";

function fixtureRows(): JournalFixtureRow[] {
  return [
    {
      id: "mj_published",
      isoWeek: 23,
      isoYear: 2026,
      status: "PUBLISHED",
      title: PUBLISHED_TITLE,
      slug: PUBLISHED_SLUG,
      bodyMarkdown: "## Settled picks\n\nThe model graded fourteen settled picks this week.",
      referencedPickIds: ["pick_1"],
      referencedAutopsyIds: [],
      modelVersion: "v1.4.0",
      draftedAt: new Date("2026-06-05T12:00:00.000Z"),
      publishedAt: new Date("2026-06-07T14:00:00.000Z"),
      retractedAt: null,
      retractionReason: null,
    },
    {
      id: "mj_retracted",
      isoWeek: 21,
      isoYear: 2026,
      status: "RETRACTED",
      title: RETRACTED_TITLE,
      slug: RETRACTED_SLUG,
      bodyMarkdown: "## Factor drift\n\nThis section relied on a stale closing-line snapshot.",
      referencedPickIds: [],
      referencedAutopsyIds: ["autopsy_1"],
      modelVersion: "v1.3.2",
      draftedAt: new Date("2026-05-22T12:00:00.000Z"),
      publishedAt: new Date("2026-05-24T14:00:00.000Z"),
      retractedAt: new Date("2026-05-26T09:00:00.000Z"),
      retractionReason: "Closing-line snapshot was stale; the stated edge was wrong.",
    },
    {
      id: "mj_draft",
      isoWeek: 24,
      isoYear: 2026,
      status: "DRAFT",
      title: DRAFT_TITLE,
      slug: DRAFT_SLUG,
      bodyMarkdown: "## Draft\n\nNot yet reviewed.",
      referencedPickIds: [],
      referencedAutopsyIds: [],
      modelVersion: "v1.4.0",
      draftedAt: new Date("2026-06-10T12:00:00.000Z"),
      publishedAt: null,
      retractedAt: null,
      retractionReason: null,
    },
  ];
}

function tombstoneRequest(slug: string): Parameters<typeof tombstoneGet> {
  return [
    new NextRequest(`http://localhost/journal/retracted/${slug}`),
    { params: { slug } },
  ];
}

beforeEach(() => {
  mocks.rows.splice(0, mocks.rows.length, ...fixtureRows());
  mocks.revalidatePath.mockReset();
  mocks.auth.mockReset();
  mocks.update.mockReset();
});

describe("retracted Journal slugs answer 410 Gone", () => {
  it("returns a 410 tombstone for a retracted slug", async () => {
    const res = await tombstoneGet(...tombstoneRequest(RETRACTED_SLUG));
    expect(res.status).toBe(410);
    expect(res.headers.get("Content-Type")).toContain("text/html");
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");

    const html = await res.text();
    expect(html).toContain("410 - Gone");
    expect(html).toContain("retracted");
    expect(html).toContain(RETRACTED_TITLE);
    expect(html).toContain('href="/journal"');
    // The internal retraction reason never reaches the public tombstone.
    expect(html).not.toContain("Closing-line snapshot was stale");
  });

  it("permanently redirects the tombstone path back to a live published entry", async () => {
    const res = await tombstoneGet(...tombstoneRequest(PUBLISHED_SLUG));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toContain(`/journal/${PUBLISHED_SLUG}`);
  });

  it("returns 404 from the tombstone path for unknown slugs", async () => {
    const res = await tombstoneGet(...tombstoneRequest("never-existed"));
    expect(res.status).toBe(404);
  });
});

describe("RSS feed visibility", () => {
  it("includes published entries", async () => {
    const res = await rssGet();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/rss+xml");

    const xml = await res.text();
    expect(xml).toContain(PUBLISHED_TITLE);
    expect(xml).toContain(`/journal/${PUBLISHED_SLUG}`);
  });

  it("excludes draft and retracted entries", async () => {
    const xml = await (await rssGet()).text();
    expect(xml).not.toContain(RETRACTED_TITLE);
    expect(xml).not.toContain(RETRACTED_SLUG);
    expect(xml).not.toContain(DRAFT_TITLE);
    expect(xml).not.toContain(DRAFT_SLUG);
  });
});

describe("sitemap visibility", () => {
  it("keeps published entry URLs and drops draft and retracted slugs", async () => {
    const urls = (await sitemap()).map((route) => route.url).join("\n");
    expect(urls).toContain(`/journal/${PUBLISHED_SLUG}`);
    expect(urls).not.toContain(RETRACTED_SLUG);
    expect(urls).not.toContain(DRAFT_SLUG);
  });
});

describe("retraction revalidates public distribution", () => {
  it("revalidates the archive, RSS feed, sitemap, and entry paths", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "admin_1", role: "ADMIN" } });
    mocks.update.mockResolvedValue({
      id: "mj_published",
      status: "RETRACTED",
      retractedAt: new Date("2026-06-12T10:00:00.000Z"),
      retractionReason: "Edge overstated due to stale closing-line data.",
      updatedAt: new Date("2026-06-12T10:00:00.000Z"),
    });

    const req = new NextRequest("http://localhost/api/cockpit/journal/mj_published/retract", {
      method: "POST",
      body: JSON.stringify({ reason: "Edge overstated due to stale closing-line data." }),
      headers: { "content-type": "application/json" },
    });
    const res = await retractPost(req, { params: { id: "mj_published" } });
    expect(res.status).toBe(200);

    const revalidated = mocks.revalidatePath.mock.calls.map(([path]) => path);
    expect(revalidated).toContain("/journal");
    expect(revalidated).toContain("/journal/rss.xml");
    expect(revalidated).toContain("/sitemap.xml");
    expect(revalidated).toContain(`/journal/${PUBLISHED_SLUG}`);
    expect(revalidated).toContain(`/journal/retracted/${PUBLISHED_SLUG}`);

    const body = (await res.json()) as {
      success: boolean;
      distribution: { revalidatedPaths: readonly string[] };
    };
    expect(body.success).toBe(true);
    expect(body.distribution.revalidatedPaths).toEqual(revalidated);
  });

  it("does not revalidate anything when the entry is not published", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "admin_1", role: "ADMIN" } });

    const req = new NextRequest("http://localhost/api/cockpit/journal/mj_draft/retract", {
      method: "POST",
      body: JSON.stringify({ reason: "Attempting to retract an unpublished draft." }),
      headers: { "content-type": "application/json" },
    });
    const res = await retractPost(req, { params: { id: "mj_draft" } });
    expect(res.status).toBe(409);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
