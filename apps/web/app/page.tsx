import type { Metadata } from "next";
import { RedlineWorld } from "@/components/redline/redline-world";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { Footer } from "@/components/ui/footer";
import { orderPacksForStorefront, upcomingOnly } from "@/components/packages/storefront-order";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import { getActiveUpcomingWriteups } from "@/lib/writeups/coach-writeup-engine";
import { isPagePublic } from "@/lib/launch/internal-surface-fence";
import { loadDoctrineBoard } from "@/lib/board/doctrine-loader";
import { DoctrineBoardView } from "@/components/board/doctrine-board";

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: "Galaxy Sports Edge | NFL Picks, Player Props & Parlays" },
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

export default async function HomePage(): Promise<JSX.Element> {
  const packs = orderPacksForStorefront(LIVE_PACKAGE_CATALOG);
  const writeups = upcomingOnly(getActiveUpcomingWriteups());
  // STALENESS_LAW (WP-5): the front door carries the same two-doctrines board
  // as /board and /picks. PASS-only is a proud state, never an error page.
  const doctrine = await loadDoctrineBoard();
  return (
    <>
<section aria-label="Sunday Quick-Buy Pack Strip" className="relative z-10 border-b border-mineral bg-void px-4 py-5 text-ion-white sm:px-6">
<div className="mx-auto max-w-5xl">
<div className="flex flex-wrap items-center justify-between gap-2">
<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-plasma">Sunday Quick-Buy</p>
<div className="flex items-center gap-2">
<a href="/board" className="rounded-full border border-mineral px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ion-2 hover:border-plasma hover:text-ion-white">Board</a>
<a href="/parlay-mri" className="rounded-full border border-mineral px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ion-2 hover:border-plasma hover:text-ion-white">Parlay MRI</a>
</div>
</div>
<div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
{LIVE_PACKAGE_CATALOG.filter((p) => p.forSale && Boolean(p.stripePriceId)).map((pkg) => (
<div key={pkg.slug} className="flex flex-col justify-between border border-mineral bg-carbon p-4">
<div>
<div className="flex items-baseline justify-between gap-2">
<h2 className="font-display text-base uppercase tracking-tight text-ion-white">{pkg.title}</h2>
<span className="font-mono text-sm font-semibold text-plasma">${Math.round(pkg.standardPriceCents / 100)}</span>
</div>
<p className="mt-1 text-xs text-ion-2">{pkg.subtitle}</p>
</div>
<form method="POST" action="/api/packages/checkout" className="mt-3">
<input type="hidden" name="packageSlug" value={pkg.slug} />
<button type="submit" className="inline-flex min-h-[48px] w-full items-center justify-center bg-plasma px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-void hover:bg-ion-white">
{`Buy Pack - $${Math.round(pkg.standardPriceCents / 100)} ->`}
</button>
</form>
</div>
))}
</div>
</div>
</section>
      <RedlineWorld packs={packs} writeups={writeups} initialStage={2} />
      <section
        id="doctrine-board"
        data-testid="homepage-doctrine-board"
        className="relative z-10 border-t border-mineral bg-carbon px-6 py-16 text-ion-white"
      >
        <div className="mx-auto max-w-5xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-plasma">
            The board / Plays and passes
          </p>
          <div className="mt-6">
            <DoctrineBoardView board={doctrine} compact />
          </div>
        </div>
      </section>
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
