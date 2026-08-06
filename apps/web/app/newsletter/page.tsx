import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";

export const metadata: Metadata = {
  alternates: { canonical: "/newsletter" },
  description:
    "Join the GSE newsletter waitlist for board notes, market mirage lessons, no-bet discipline, and evidence-first sports intelligence.",
  title: "GSE Newsletter",
};

const LEAD_MAGNETS = [
  {
    title: "No-Bet Playbook",
    body: "When the governor passes: evidence gaps, freshness, rights, and responsible-gaming boundaries — explained without hype.",
  },
  {
    title: "Market Mirage Checklist",
    body: "A repeatable scan for crowd traps, line mirages, and places the public price is ahead of the story.",
  },
  {
    title: "Sports AI Builder Field Guide",
    body: "How GSE ships local-first intelligence: honesty gates, calibration, and no public ROI language.",
  },
  {
    title: "Fantasy Role Volatility Watchlist",
    body: "Roles that swing weekly: opportunity, scheme, and availability signals managers actually use.",
  },
] as const;

export default function NewsletterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="border-b border-mineral/40 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Newsletter · Waitlist</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-ion-white">
              The conversion spine for evidence-first sports intelligence.
            </h1>
            <p className="mt-5 max-w-3xl text-lg text-ion-1">
              Board notes, market lessons, loss autopsies, and build notes in an owned-audience format.
              Join the waitlist — every send is operator-reviewed for claim safety before it ships.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/waitlist" className="btn btn-primary">
                Join the waitlist
              </Link>
              <Link href="/content-lab" className="btn btn-ghost">
                Browse content pillars
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow">Planned lead magnets</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {LEAD_MAGNETS.map((magnet) => (
                <article key={magnet.title} className="surface-card p-6">
                  <h2 className="font-display text-2xl text-ion-white">{magnet.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-ion-1">{magnet.body}</p>
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
