import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export default function BlogPostNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Nav />
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="mx-auto max-w-lg text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-300">
            404 / Post not found
          </p>
          <h1 className="mt-4 text-3xl font-bold text-white">That post isn't in the feed.</h1>
          <p className="mt-4 text-sm text-ink-300">
            The post may have been renamed, unpublished, or may not exist. Check
            the blog index for the full archive.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/blog" className="btn-primary px-5 py-2.5 text-sm">
              Blog index
            </Link>
            <Link href="/brief" className="btn-secondary px-5 py-2.5 text-sm">
              Daily Brief
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
