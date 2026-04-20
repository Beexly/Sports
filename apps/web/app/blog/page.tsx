import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { db } from "@sports/db";
import { formatDate } from "@/lib/utils";

export const revalidate = 300; // 5 min

export default async function BlogPage() {
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

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-gray-950">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Sports Analysis</h1>
            <p className="text-gray-400 text-lg">
              Data-backed picks analysis updated daily
            </p>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">No posts yet. Check back after picks are generated.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors"
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
                          {post.title}
                        </h2>
                      </Link>
                      <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {post.publishedAt && (
                          <span>{formatDate(post.publishedAt)}</span>
                        )}
                        <div className="flex gap-1 flex-wrap">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="bg-gray-800 px-2 py-0.5 rounded text-gray-400">
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
