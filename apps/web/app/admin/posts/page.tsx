import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { formatDate } from "@/lib/utils";

// Admin surfaces are auth-gated and read live data — never statically
// prerendered (stale data + couples the build to DB connectivity).
export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const posts = await db.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      slug: true,
      sport: true,
      status: true,
      isFeatured: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  return (
    <div className="min-h-screen bg-obsidian p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Blog Posts</h1>
            <p className="text-ink-400 mt-1">{posts.length} posts</p>
          </div>
          <a href="/admin" className="text-ink-400 hover:text-white text-sm transition-colors">
            ← Back to Admin
          </a>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.10] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.10] text-ink-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Sport</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Featured</th>
                <th className="text-left px-4 py-3">Published</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-white/[0.10]/50 hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium line-clamp-1 max-w-xs">{post.title}</div>
                    <div className="text-xs text-ink-500">/blog/{post.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-400">{post.sport ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      post.status === "PUBLISHED"
                        ? "bg-green-500/10 text-green-400"
                        : post.status === "DRAFT"
                        ? "bg-yellow-500/10 text-yellow-400"
                        : "bg-white/[0.08] text-ink-400"
                    }`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-400">
                    {post.isFeatured ? (
                      <span className="text-yellow-400">★</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-500 text-xs">
                    {post.publishedAt ? formatDate(post.publishedAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-400 hover:text-brand-300 text-xs transition-colors"
                    >
                      View →
                    </a>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ink-500">
                    No posts yet. Posts are generated automatically after picks are created.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
