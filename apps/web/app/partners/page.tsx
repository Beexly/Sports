import type { Metadata } from "next";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { SUPPORT_EMAIL } from "@/lib/brand";
import { SPONSOR_CANNOT_CONTROL } from "@/lib/media-revenue/sponsorship-packages";

export const metadata: Metadata = {
  alternates: { canonical: "/partners" },
  description: "Galaxy Sports Edge partner standards, disclosure policy, responsible gaming posture, and editorial independence rules.",
  title: "GSE Partner Standards",
};

const CATEGORIES = [
  "Creator tools",
  "Sports data and API tools",
  "Fantasy tools",
  "Sports cards and collectibles",
  "Cloud, AI, and developer tools",
  "Local and regional sponsors",
  "Podcast and creator collaborations",
];

const WILL_NOT_PROMOTE = [
  "Unclear or undisclosed sponsor relationships.",
  "Sportsbook or DFS offers without complete compliance metadata.",
  "Products that require fabricated performance, audience, or revenue claims.",
  "Unlicensed sports footage, copyrighted broadcast clips, or scraped assets.",
  "Any partner asking GSE to alter editorial conclusions or model accountability.",
];

export default function PartnersPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="border-b border-mineral/40 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Partners</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-ion-white">Partnerships with editorial independence.</h1>
            <p className="mt-5 max-w-3xl text-lg text-ion-1">
              GSE works with partners that make the sports intelligence workflow better. Every paid or affiliate relationship is
              disclosed. Sponsors do not control picks, model outputs, no-bet decisions, loss autopsies, calibration claims, or
              editorial conclusions.
            </p>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
            <article className="surface-card p-6">
              <h2 className="font-display text-2xl text-ion-white">Selection standards</h2>
              <p className="mt-4 text-sm leading-7 text-ion-1">
                A partner must fit the audience, strengthen the content, respect claim safety, and accept that GSE may pass on a
                promotion if compliance or source context is incomplete.
              </p>
            </article>
            <article className="surface-card p-6">
              <h2 className="font-display text-2xl text-ion-white">Disclosure policy</h2>
              <p className="mt-4 text-sm leading-7 text-ion-1">
                Sponsor and affiliate mentions require plain disclosure near the mention. Platform-specific disclosure controls, such
                as paid-promotion labels, must be used when applicable.
              </p>
            </article>
            <article className="surface-card p-6">
              <h2 className="font-display text-2xl text-ion-white">Responsible gaming</h2>
              <p className="mt-4 text-sm leading-7 text-ion-1">
                Betting content stays educational and analytical. Regulated offers require terms, state eligibility, restricted-state
                handling, responsible-gaming text, and manual approval before public display.
              </p>
            </article>
          </div>
        </section>

        <section className="border-t border-mineral/40 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
            <div>
              <p className="eyebrow">Partner categories</p>
              <ul className="mt-5 space-y-3 text-sm text-ion-1">
                {CATEGORIES.map((category) => (
                  <li key={category} className="border-b border-mineral/40 pb-3">{category}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow">What GSE will not promote</p>
              <ul className="mt-5 space-y-3 text-sm text-ion-1">
                {WILL_NOT_PROMOTE.map((item) => (
                  <li key={item} className="border-b border-mineral/40 pb-3">{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t border-mineral/40 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Editorial firewall</p>
            <h2 className="mt-3 font-display text-display-lg text-ion-white">The model and the audit trail stay independent.</h2>
            <p className="mt-4 text-sm leading-7 text-ion-1">
              Sponsor influence stops at approved placement and disclosed messaging. It never reaches {SPONSOR_CANNOT_CONTROL.join(", ")}.
            </p>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=GSE%20partner%20inquiry`} className="btn btn-primary mt-8">
              Partner inquiry
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
