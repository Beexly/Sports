import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { db } from "@sports/db";
import { bootstrapGateResponse, getReadinessGates } from "@sports/prediction-engine";
import type { PublicBlogPost } from "@sports/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const gates = getReadinessGates();
  if (!gates.canPublishContent) {
    return NextResponse.json(bootstrapGateResponse("Public blog"), { status: 503 });
  }

  const session = await auth();
  const entitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : {
        tier: "FREE" as const,
        canSeePremiumPicks: false,
        canSeeConfidence: false,
        canSeeLineMovement: false,
        canGetAlerts: false,
        dailyPickLimit: 1,
      };

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = 10;
  const sportFilter = searchParams.get("sport");
  const slug = searchParams.get("slug");

  if (slug) {
    // Single post
    const post = await db.blogPost.findUnique({
      where: { slug, status: "PUBLISHED" },
    });

    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const publicPost: PublicBlogPost = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      // PAYWALL: full content only for paid subscribers. Keyed off paid-tier
      // membership (not canSeePremiumPicks, which is now true for all tiers since
      // picks are free — ENTITLEMENT_REMAP_SPEC.md). Blog gating preserved as-is.
      content: entitlements.tier !== "FREE" ? post.content : null,
      sport: post.sport,
      tags: post.tags,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      isFeatured: post.isFeatured,
    };

    return NextResponse.json({ success: true, data: publicPost });
  }

  // List posts
  const [posts, total] = await Promise.all([
    db.blogPost.findMany({
      where: {
        status: "PUBLISHED",
        ...(sportFilter ? { sport: { contains: sportFilter, mode: "insensitive" as const } } : {}),
      },
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        sport: true,
        tags: true,
        seoTitle: true,
        seoDescription: true,
        publishedAt: true,
        isFeatured: true,
      },
    }),
    db.blogPost.count({
      where: { status: "PUBLISHED" },
    }),
  ]);

  const publicPosts: PublicBlogPost[] = posts.map((p) => ({
    ...p,
    content: null, // Never return full content in list view
    publishedAt: p.publishedAt?.toISOString() ?? null,
  }));

  return NextResponse.json({
    success: true,
    data: publicPosts,
    meta: { total, page, pageSize, hasMore: page * pageSize < total },
  });
}
