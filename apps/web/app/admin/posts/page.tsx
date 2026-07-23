import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, type Prisma } from "@sports/db";
import { formatDate } from "@/lib/utils";

const adminPostsQuery = {
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
} satisfies Prisma.BlogPostFindManyArgs;

export default async function AdminPostsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const posts = await db.blogPost
    .findMany(adminPostsQuery)
    // Fail-open: a transient DB error degrades to the page's existing
    // "No posts yet…" empty state instead of crashing the admin app.
    .catch(() => [] as Prisma.BlogPostGetPayload<typeof adminPostsQuery>[]);

  return (
    <div className="min-h-screen bg-obsidian p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-ion-white">Blog Posts</h1>
            <p className="text-ion-2 mt-1">{posts.length} posts</p>
          </div>
          <a href="/admin" className="text-ion-2 hover:text-ion-white text-sm transition-colors">
            ← Back to Admin
          </a>
        </div>

        <div className="bg-carbon border border-titanium rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-titanium text-ion-2 text-xs uppercase">
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
                <tr key={post.id} className="border-b border-titanium/50 hover:bg-titanium/30">
                  <td className="px-4 py-3">
                    <div className="text-ion-white font-medium line-clamp-1 max-w-xs">{post.title}</div>
                    <div className="text-xs text-ion-3">/blog/{post.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-ion-2">{post.sport ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      post.status === "PUBLISHED"
                        ? "bg-verify/10 text-verify"
                        : post.status === "DRAFT"
                        ? "bg-caution/10 text-caution"
                        : "bg-titanium text-ion-2"
                    }`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ion-2">
                    {post.isFeatured ? (
                      <span className="text-caution">★</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-ion-3 text-xs">
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
                  <td colSpan={6} className="px-4 py-8 text-center text-ion-3">
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
