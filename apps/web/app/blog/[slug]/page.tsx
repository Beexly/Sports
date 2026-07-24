import { notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { formatDate } from "@/lib/utils";
import { guardPublicContent, guardPublicExcerpt, guardPublicTitle } from "@/lib/blog/public-guard";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const gates = getReadinessGates();
  if (!gates.canPublishContent) return { title: "Not Found" };

  const post = await db.blogPost.findUnique({
    where: { slug: params.slug, status: "PUBLISHED" },
    select: { title: true, seoTitle: true, seoDescription: true, excerpt: true },
  });

  if (!post) return { title: "Not Found" };

  return {
    title: guardPublicTitle(post.seoTitle ?? post.title),
    description: post.seoDescription
      ? guardPublicTitle(post.seoDescription)
      : guardPublicExcerpt(post.excerpt).slice(0, 155),
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const gates = getReadinessGates();
  if (!gates.canPublishContent) notFound();

  const session = await auth();
  const entitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : { tier: "FREE" as const, canSeePremiumPicks: false, canSeeConfidence: false, canSeeLineMovement: false, canGetAlerts: false, dailyPickLimit: 1 };

  const post = await db.blogPost.findUnique({
    where: { slug: params.slug, status: "PUBLISHED" },
  });

  if (!post) notFound();

  // Paid-tier gate (decoupled from canSeePremiumPicks, now true for all since
  // picks are free — ENTITLEMENT_REMAP_SPEC.md). Blog gating preserved as-is.
  const showFullContent = entitlements.tier !== "FREE";

  return (
    <>
      <Nav />
      <main id="main-content" className="min-h-screen bg-obsidian">
        <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">
          {/* Back link */}
          <Link href="/blog" className="text-ion-2 hover:text-ion-white text-sm transition-colors mb-8 inline-flex items-center gap-1">
            ← Back to Blog
          </Link>

          <article className="mt-6">
            {/* Header */}
            <header className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                {post.sport && (
                  <span className="px-2 py-0.5 rounded-full font-mono text-[11px] uppercase tracking-wider bg-ultraviolet/10 text-ultraviolet-glow border border-ultraviolet/30">
                    {post.sport}
                  </span>
                )}
                {post.publishedAt && (
                  <time dateTime={post.publishedAt.toISOString()} className="font-mono text-xs text-ion-2">
                    {formatDate(post.publishedAt)}
                  </time>
                )}
              </div>
              <h1 className="text-3xl font-bold text-balance text-ion-white mb-4 sm:text-4xl">
                {guardPublicTitle(post.title)}
              </h1>
              <div className="flex flex-wrap gap-1">
                {post.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-titanium text-ion-2 px-2 py-0.5 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            </header>

            {/* Content */}
            <div className="max-w-none">
              {/* Always show excerpt */}
              <div className="text-lg text-ion leading-relaxed whitespace-pre-line">
                {guardPublicExcerpt(post.excerpt)}
              </div>

              {showFullContent ? (
                <div className="text-ion leading-relaxed whitespace-pre-line mt-6">
                  {guardPublicContent(post.content)}
                </div>
              ) : (
                <div className="relative mt-8">
                  {/* Blur overlay for locked content */}
                  <div className="text-ion-2 leading-relaxed whitespace-pre-line blur-sm select-none pointer-events-none line-clamp-3" aria-hidden="true">
                    {guardPublicContent(post.content).slice(0, 300)}...
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-obsidian/80 to-obsidian">
                    <div className="text-center p-6 bg-carbon border border-mineral rounded-2xl max-w-sm">
                      <div className="w-10 h-10 bg-ultraviolet/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-5 h-5 text-ultraviolet" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <p className="text-ion-white font-semibold mb-1">Premium content</p>
                      <p className="text-ion-1 text-sm mb-4">Upgrade to Pro or Elite to read full analysis</p>
                      <Link
                        href="/pricing"
                        className="block w-full py-2 px-4 bg-plasma hover:bg-plasma-glow text-plasma-ink text-sm font-semibold rounded-lg text-center transition-colors"
                      >
                        Upgrade now
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
