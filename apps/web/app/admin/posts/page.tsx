import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { formatDate } from "@/lib/utils";

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
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Blog Posts</h1>
            <p className="text-gray-400 mt-1">{posts.length} posts</p>
          </div>
          <Link href="/admin" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Back to Admin
          </Link>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
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
                <tr key={post.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium line-clamp-1 max-w-xs">{post.title}</div>
                    <div className="text-xs text-gray-500">/blog/{post.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{post.sport ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      post.status === "PUBLISHED"
                        ? "bg-green-500/10 text-green-400"
                        : post.status === "DRAFT"
                        ? "bg-yellow-500/10 text-yellow-400"
                        : "bg-gray-700 text-gray-400"
                    }`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {post.isFeatured ? (
                      <span className="text-yellow-400">★</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
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
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
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
