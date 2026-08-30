import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { CONTENT_PILLARS } from "@/lib/media-revenue/content-pillars";
import { SPONSORSHIP_PACKAGES, SPONSOR_CANNOT_CONTROL } from "@/lib/media-revenue/sponsorship-packages";
import { SUPPORT_EMAIL } from "@/lib/brand";

export const metadata: Metadata = {
  alternates: { canonical: "/media-kit" },
  description: "Media kit for evidence-first Galaxy Sports Edge and Galaxy Sports Network sponsorships, partnerships, and founder-led content.",
  title: "GSE Media Kit",
};

export default function MediaKitPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="border-b border-mineral/40 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Media kit</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-ion-white">
              Reach an audience built around evidence, not tout culture.
            </h1>
            <p className="mt-5 max-w-3xl text-lg text-ion-1">
              GSE is building a sports intelligence audience around decision quality, source reliability, calibration discipline, loss
              autopsies, and the idea that no bet can be the right decision. GSN is the future media umbrella for board meetings,
              explainers, podcasts, and partner-safe programming.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={`mailto:${SUPPORT_EMAIL}?subject=GSE%20founding%20sponsor%20inquiry`} className="btn btn-primary">
                Founding sponsor inquiry
              </a>
              <Link href="/partners" className="btn btn-ghost">
                Partner standards
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="eyebrow">What this is</p>
              <h2 className="mt-3 font-display text-display-lg text-ion-white">A media company for auditable sports intelligence.</h2>
              <p className="mt-4 text-sm leading-7 text-ion-1">
                This media layer starts before the full prediction system is finished because authority, trust, partner demand, and
                owned audience are built in public. We are not claiming traffic, monetization status, sponsor inventory sell-through,
                or performance outcomes that have not been proven.
              </p>
            </div>
            <div className="surface-card p-6">
              <p className="text-sm font-semibold text-ion-white">Current audience posture</p>
              <ul className="mt-4 space-y-3 text-sm text-ion-1">
                <li>No fabricated audience numbers.</li>
                <li>No fabricated revenue, ROI, or conversion claims.</li>
                <li>No sponsor can control picks, model outputs, no-bet decisions, loss autopsies, calibration claims, or editorial conclusions.</li>
                <li>Every paid or affiliate mention requires disclosure and manual review.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t border-mineral/40 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow">Content pillars</p>
            <h2 className="mt-3 font-display text-display-lg text-ion-white">What sponsors appear next to.</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {CONTENT_PILLARS.slice(0, 6).map((pillar) => (
                <article key={pillar.id} className="surface-card p-5">
                  <h3 className="text-base font-semibold text-ion-white">{pillar.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-ion-1">{pillar.coreIdea}</p>
                  <p className="mt-3 font-mono text-xs uppercase tracking-[0.18em] text-ion-2">{pillar.revenuePaths.join(" / ")}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-mineral/40 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow">Founding packages</p>
            <h2 className="mt-3 font-display text-display-lg text-ion-white">Sponsor support without editorial capture.</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {SPONSORSHIP_PACKAGES.map((pkg) => (
                <article key={pkg.id} className="surface-card p-5">
                  <p className="text-sm font-semibold text-ion-white">{pkg.name}</p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-orbital-cyan">
                    {pkg.monthlyPriceUsd === null ? "Affiliate only" : `$${pkg.monthlyPriceUsd}/mo`}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-ion-1">
                    {pkg.deliverables.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <div className="mt-8 surface-card p-6">
              <p className="text-sm font-semibold text-ion-white">Sponsors cannot control</p>
              <p className="mt-3 text-sm text-ion-1">{SPONSOR_CANNOT_CONTROL.join(", ")}.</p>
            </div>
          </div>
        </section>

        <section className="border-t border-mineral/40 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Compliance posture</p>
            <h2 className="mt-3 font-display text-display-lg text-ion-white">Evidence first, disclosure always.</h2>
            <p className="mt-4 text-sm leading-7 text-ion-1">
              Betting-related partner content is educational and compliance-gated. Sportsbook or DFS offers are not first-lane unless
              disclosure, terms URL, eligible states, restricted states, responsible-gaming text, and approval metadata are complete.
              GSE uses original graphics, app screenshots, diagrams, cleared assets, and commentary-first formats.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
