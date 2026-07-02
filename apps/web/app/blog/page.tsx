import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { formatDate } from "@/lib/utils";
import { guardPublicExcerpt, guardPublicTitle } from "@/lib/blog/public-guard";

export const metadata: Metadata = {
  title: "From the desk · Sports market analysis from Galaxy Sports Edge",
  description:
    "Pre-game reads, line-movement breakdowns, and methodology notes from the Galaxy Sports Edge desk. Every post tied back to the live board.",
  alternates: { canonical: "/blog" },
};

export const revalidate = 300; // 5 min

export default async function BlogPage() {
  const gates = getReadinessGates();
  let posts: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    sport: string | null;
    tags: string[];
    publishedAt: Date | null;
    isFeatured: boolean;
  }> = [];

  if (gates.canPublishContent) {
    try {
      posts = await db.blogPost.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
        take: 20,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          sport: true,
          tags: true,
          publishedAt: true,
          isFeatured: true,
        },
      });
    } catch {
      // DB unavailable during build — renders empty state, revalidated at runtime
    }
  }

  return (
    <>
      <Nav />
      <main id="main-content" className="min-h-screen bg-obsidian">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-300 mb-2">
              From the desk
            </p>
            <h1 className="text-4xl font-bold text-white mb-4">Market notes & methodology reads.</h1>
            <p className="text-ion-2 text-lg">
              Pre-game reads, line-movement breakdowns, and methodology notes.
              Every post tied back to the live board.
            </p>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-ion-3 text-lg">
                Posts arrive once the board opens. The first reads will cover
                methodology: how a signal gets scored, gated, and shipped.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-carbon border border-titanium rounded-xl p-6 hover:border-titanium transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {post.sport && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-brand-500/10 text-brand-400 border border-brand-500/20">
                            {post.sport}
                          </span>
                        )}
                        {post.isFeatured && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-400/10 text-yellow-400">
                            Featured
                          </span>
                        )}
                      </div>
                      <Link href={`/blog/${post.slug}`}>
                        <h2 className="text-xl font-semibold text-white hover:text-brand-400 transition-colors mb-2 line-clamp-2">
                          {guardPublicTitle(post.title)}
                        </h2>
                      </Link>
                      <p className="text-ion-2 text-sm line-clamp-2 mb-3">
                        {guardPublicExcerpt(post.excerpt)}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-ion-3">
                        {post.publishedAt && (
                          <span>{formatDate(post.publishedAt)}</span>
                        )}
                        <div className="flex gap-1 flex-wrap">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="bg-titanium px-2 py-0.5 rounded text-ion-2">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
