import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

/**
 * Brand-voiced global not-found page. No default framework 404.
 */
export const metadata: Metadata = {
  title: "Off the board - Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main className="flex flex-1 items-center justify-center px-4 py-22 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-300">
            404 / Off the board
          </p>
          <h1 className="mt-4 font-display text-display-lg text-balance text-white">
            That signal isn&apos;t in the feed.
          </h1>
          <p className="mt-5 text-base text-ink-300">
            Either the page never shipped, the gate is not open yet, or
            something got renamed. Head back to the homepage and try again, or
            jump to one of the live surfaces below.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn-primary px-6 py-3 text-sm">
              Back to home
            </Link>
            <Link
              href="/methodology"
              className="btn-secondary px-6 py-3 text-sm"
            >
              See methodology
            </Link>
            <Link href="/pricing" className="btn-secondary px-6 py-3 text-sm">
              See pricing
            </Link>
            <Link href="/faq" className="btn-secondary px-6 py-3 text-sm">
              FAQ
            </Link>
          </div>

          <p className="mt-10 font-mono text-xs uppercase tracking-widest text-ink-500">
            If you got here from a link inside the site, write to{" "}
            <a
              href="mailto:hq@galaxysportsedge.com"
              className="text-accent-300 underline-offset-4 hover:underline"
            >
              hq@galaxysportsedge.com
            </a>{" "}
            and the broken link will get fixed.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
