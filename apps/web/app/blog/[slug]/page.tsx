import { notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { formatDate } from "@/lib/utils";
import { SITE_URL } from "@/lib/seo/sports-jsonld";
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
    select: { title: true, seoTitle: true, seoDescription: true, excerpt: true, publishedAt: true },
  });

  if (!post) return { title: "Not Found" };

  const url = `${SITE_URL}/blog/${params.slug}`;
  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.excerpt.slice(0, 155);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: "Galaxy Sports Edge",
      ...(post.publishedAt ? { publishedTime: post.publishedAt.toISOString() } : {}),
    },
    twitter: { card: "summary_large_image", title, description },
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

  const showFullContent = entitlements.canSeePremiumPicks;

  const canonicalUrl = `${SITE_URL}/blog/${params.slug}`;
  // BlogPosting rich-result markup — makes published analysis eligible for
  // Article rich results. Author/publisher = Organization (Galaxy Sports Edge).
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDescription ?? post.excerpt.slice(0, 200),
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
    ...(post.publishedAt
      ? { datePublished: post.publishedAt.toISOString(), dateModified: post.publishedAt.toISOString() }
      : {}),
    author: { "@type": "Organization", name: "Galaxy Sports Edge", url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: "Galaxy Sports Edge",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo-mark.svg` },
    },
    ...(post.sport ? { about: post.sport } : {}),
    ...(post.tags.length > 0 ? { keywords: post.tags.join(", ") } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />
      <Nav />
      <main className="min-h-screen bg-obsidian">
        <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">
          {/* Back link */}
          <Link href="/blog" className="text-ink-500 hover:text-ink-300 text-sm transition-colors mb-8 inline-flex items-center gap-1">
            ← Back to Blog
          </Link>

          <article className="mt-6">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                {post.sport && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    {post.sport}
                  </span>
                )}
                {post.publishedAt && (
                  <span className="text-xs text-ink-500">{formatDate(post.publishedAt)}</span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">{post.title}</h1>
              <div className="flex flex-wrap gap-1">
                {post.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-white/[0.08] text-ink-400 px-2 py-0.5 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-invert prose-sm max-w-none">
              {/* Always show excerpt */}
              <div className="text-ink-300 leading-relaxed whitespace-pre-line">
                {post.excerpt}
              </div>

              {showFullContent ? (
                <div className="text-ink-300 leading-relaxed whitespace-pre-line mt-4">
                  {post.content}
                </div>
              ) : (
                <div className="relative mt-8">
                  {/* Blur overlay for locked content */}
                  <div className="text-ink-400 leading-relaxed whitespace-pre-line blur-sm select-none pointer-events-none line-clamp-3">
                    {post.content.slice(0, 300)}...
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-obsidian/80 to-obsidian">
                    <div className="text-center p-6 bg-white/[0.03] border border-white/[0.10] rounded-2xl max-w-sm">
                      <div className="w-10 h-10 bg-caution/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-5 h-5 text-caution" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <p className="text-white font-semibold mb-1">Premium Content</p>
                      <p className="text-ink-400 text-sm mb-4">Upgrade to Pro or Elite to read full analysis</p>
                      <Link
                        href="/pricing"
                        className="block w-full py-2 px-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg text-center transition-colors"
                      >
                        Upgrade Now
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
