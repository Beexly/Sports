import { NextResponse } from "next/server";
import { loadPublicJournalEntry, loadRetractedJournalEntry } from "@/lib/journal/load";
import { SITE_URL } from "@/lib/seo/site-url";

/**
 * HTTP 410 Gone tombstone for retracted Model Journal entries.
 *
 * App Router pages cannot set a 410 status (`notFound()` is 404-only),
 * so `/journal/[slug]` issues a permanent redirect here for retracted
 * slugs and this Route Handler answers with a real 410 Response plus a
 * brief tombstone page. Retracted entries are already excluded from the
 * archive index, RSS feed, and sitemap by the published-only loaders.
 */

export const dynamic = "force-dynamic";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function tombstoneHtml(title: string, retractedAt: string | null): string {
  const retractedLine = retractedAt
    ? `This entry was retracted on ${escapeHtml(
        new Date(retractedAt).toUTCString()
      )} and is no longer available.`
    : "This entry was retracted and is no longer available.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Entry retracted - Model Journal</title>
</head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#030712;color:#d1d5db;font-family:ui-sans-serif,system-ui,sans-serif;">
<main style="max-width:36rem;padding:3rem 1.5rem;text-align:center;">
<p style="font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#fde047;">410 - Gone</p>
<h1 style="margin-top:1rem;font-size:1.75rem;line-height:1.3;color:#ffffff;">${escapeHtml(title)}</h1>
<p style="margin-top:1rem;line-height:1.7;">${retractedLine} Retractions are part of our public correction record.</p>
<p style="margin-top:2rem;"><a href="/journal" style="color:#fde047;text-decoration:underline;">Back to the Model Journal archive</a></p>
</main>
</body>
</html>`;
}

export async function GET(
  _req: Request,
  context: { readonly params: { readonly slug: string } | Promise<{ readonly slug: string }> }
): Promise<NextResponse> {
  const params = await Promise.resolve(context.params);

  const retracted = await loadRetractedJournalEntry(params.slug);
  if (retracted) {
    return new NextResponse(tombstoneHtml(retracted.title, retracted.retractedAt), {
      status: 410,
      statusText: "Gone",
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex",
        "Cache-Control": "no-store",
      },
    });
  }

  // A live published entry should never be served from the tombstone
  // path — send readers back to the canonical entry URL.
  const published = await loadPublicJournalEntry(params.slug);
  if (published) {
    return NextResponse.redirect(new URL(`/journal/${params.slug}`, SITE_URL), 308);
  }

  return new NextResponse("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
