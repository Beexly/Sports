import type { Metadata } from "next";
import { RedlineWorld } from "@/components/redline/redline-world";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { Footer } from "@/components/ui/footer";
import { orderPacksForStorefront, upcomingOnly } from "@/components/packages/storefront-order";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import { getActiveUpcomingWriteups } from "@/lib/writeups/coach-writeup-engine";
import { isPagePublic } from "@/lib/launch/internal-surface-fence";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Galaxy Sports Edge | NFL Picks, Player Props & Parlays",
  description: "Plain-English NFL picks, player props and parlays. See the field, choose your pack, and unlock the official slate.",
};

/**
 * Trust destinations carried by the responsible close. The RedlineWorld field
 * owns the whole first viewport, so these are the homepage's only route to the
 * methodology, the responsible-play help, the revenue disclosure, the public
 * record, and the price list. Dropping one removes it from the front door.
 */
const TRUST_LINKS = [
  { label: "Read the methodology", href: "/methodology" },
  { label: "Responsible play", href: "/responsible-play" },
  { label: "How we make money", href: "/how-we-make-money" },
  { label: "Accountability", href: "/accountability" },
  { label: "Plans and pricing", href: "/pricing" },
] as const;

export default function HomePage(): JSX.Element {
  const packs = orderPacksForStorefront(LIVE_PACKAGE_CATALOG);
  const writeups = upcomingOnly(getActiveUpcomingWriteups());
  return (
    <>
      <RedlineWorld packs={packs} writeups={writeups} />
      <section
        id="responsible-close"
        data-testid="homepage-responsible-close"
        className="relative z-10 border-t border-mineral bg-carbon px-6 py-16 text-ion-white"
      >
        <div className="mx-auto max-w-5xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-plasma">
            Close / Responsible Intelligence
          </p>
          <h2 className="mt-4 font-display text-3xl uppercase tracking-tight sm:text-4xl">
            The math can point. The decision stays yours.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ion-2">
            Every number on this page is a probability, not a promise. The engine
            reads the field and prices the risk. The stake, the pass, and the
            decision stay with you.
          </p>
          <RiskDisclosure variant="card" includePastPerformance className="mt-8" />
          <nav aria-label="Trust and disclosure" className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {TRUST_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={isPagePublic(href) ? href : "/engine"}
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2 transition-colors hover:text-plasma"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </section>
      <Footer />
    </>
  );
}
