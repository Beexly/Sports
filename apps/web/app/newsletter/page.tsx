import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";

export const metadata: Metadata = {
  alternates: { canonical: "/newsletter" },
  description: "The GSE newsletter for board notes, market mirage lessons, no-bet discipline, and evidence-first sports intelligence.",
  title: "GSE Newsletter",
};

const LEAD_MAGNETS = [
  "No-Bet Playbook",
  "Market Mirage Checklist",
  "Sports AI Builder Field Guide",
  "Fantasy Role Volatility Watchlist",
];

export default function NewsletterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="border-b border-ink-800/60 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Newsletter</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-white">The conversion spine for evidence-first sports intelligence.</h1>
            <p className="mt-5 max-w-3xl text-lg text-ink-300">
              The newsletter will carry the GSE Board Meeting, market lessons, loss autopsies, and build notes in an owned-audience
              format. No email provider is wired here yet, so this page uses a transparent waitlist state.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/waitlist" className="btn btn-primary">Join the waitlist</Link>
              <Link href="/content-lab" className="btn btn-ghost">Browse content pillars</Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow">Lead magnets</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {LEAD_MAGNETS.map((magnet) => (
                <article key={magnet} className="surface-card p-6">
                  <h2 className="font-display text-2xl text-white">{magnet}</h2>
                  <p className="mt-3 text-sm leading-7 text-ink-300">
                    Draft-only concept. Final download requires source review, claim scan, and operator approval before publication.
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
