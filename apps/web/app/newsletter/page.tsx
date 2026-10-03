import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { WaitlistForm } from "@/components/gsn/waitlist-form";
import { listIssues } from "@/lib/newsletter/issues";

export const metadata: Metadata = {
  alternates: { canonical: "/newsletter" },
  description:
    "GSE newsletter: operator-reviewed board notes, No-Bet lessons, and build updates. Subscribe with the live form. Read the full issue archive.",
  title: "GSE Newsletter",
};

export default function NewsletterPage() {
  const issues = listIssues();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="border-b border-mineral/40 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Newsletter · live</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-ion-white">
              Evidence-first notes for operators who refuse hype.
            </h1>
            <p className="mt-5 max-w-3xl text-lg text-ion-1">
              Board notes, market lessons, loss autopsies, and build updates. Every issue is
              operator-reviewed for claim safety before it ships. Subscribe with the form — leads
              are stored for owner review (no silent third-party blast).
            </p>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl text-ion-white">Subscribe</h2>
              <div className="mt-6">
                <WaitlistForm />
              </div>
            </div>
            <div>
              <h2 className="font-display text-2xl text-ion-white">Issue archive</h2>
              <div className="mt-6 space-y-4">
                {issues.map((issue) => (
                  <article key={issue.slug} className="surface-card p-5">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-ion-2">
                      Issue {String(issue.number).padStart(3, "0")} ·{" "}
                      {new Date(issue.publishedAt).toLocaleDateString()}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-ion-white">
                      <Link href={`/newsletter/${issue.slug}`} className="hover:text-orbital-cyan">
                        {issue.title}
                      </Link>
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-ion-1">{issue.lede}</p>
                  </article>
                ))}
              </div>
              <p className="mt-8 text-sm text-ion-2">
                Also see{" "}
                <Link href="/content-lab" className="text-orbital-cyan hover:underline">
                  content pillars
                </Link>{" "}
                and the{" "}
                <Link href="/podcast" className="text-orbital-cyan hover:underline">
                  Board Meeting podcast
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
