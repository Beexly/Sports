import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BRAND_NAME } from "@/lib/brand";
import {
  AFFILIATE_FREE_PLEDGE,
  PLEDGE_STATEMENT,
  PLEDGE_VIOLATION,
  PLEDGE_WHY,
} from "@/lib/pledge/affiliate-free";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { SITE_URL } from "@/lib/seo/site-url";

const PLEDGE_DESCRIPTION =
  "Galaxy Sports Edge does not carry sportsbook or DFS affiliate or commission links, and never will.";

export const metadata: Metadata = {
  title: `Affiliate pledge · ${BRAND_NAME}`,
  description: PLEDGE_DESCRIPTION,
  alternates: { canonical: "/pledge" },
  openGraph: {
    title: `Affiliate pledge · ${BRAND_NAME}`,
    description:
      "A dated, machine-readable pledge: no sportsbook or DFS affiliate or commission links.",
    url: "/pledge",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `Affiliate pledge · ${BRAND_NAME}`,
    description: PLEDGE_DESCRIPTION,
  },
};

const pledgeJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: `Affiliate pledge · ${BRAND_NAME}`,
  description: PLEDGE_DESCRIPTION,
  url: `${SITE_URL}/pledge`,
};

export default function PledgePage(): JSX.Element {
  return (
    <div className="relative isolate min-h-screen bg-carbon text-ion">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(pledgeJsonLd) }}
      />
      <Nav />
      <main id="main-content" className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
        <header className="border-b border-mineral pb-10">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-orbital-cyan">
            Pledge · published {AFFILIATE_FREE_PLEDGE.since}
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-ion-white sm:text-5xl">
            No sportsbook or DFS affiliate links.
          </h1>
          <p data-testid="pledge-statement" className="mt-5 text-base leading-7 text-ion-1">
            {PLEDGE_STATEMENT}
          </p>
        </header>

        <section>
          <h2 className="text-xl font-bold text-ion-white">What it means</h2>
          <p className="mt-3 text-sm leading-6 text-ion-1">
            {BRAND_NAME} will not place, sell, or take commission on sportsbook
            or daily-fantasy links. Subscriptions are the business. A separate
            disclosed-partner program may exist for non-gambling tools; that is
            described on{" "}
            <Link href="/how-we-make-money" className="text-orbital-cyan underline">
              How we make money
            </Link>
            . This page is only about the sportsbook and DFS category.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ion-white">Why it exists</h2>
          <p data-testid="pledge-why" className="mt-3 text-sm leading-6 text-ion-1">
            {PLEDGE_WHY} A sportsbook or DFS operator is paid more when a
            customer loses a bet. Taking a cut of that relationship would put
            this product on the other side of the people it writes for.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ion-white">If this is broken</h2>
          <p data-testid="pledge-violation" className="mt-3 text-sm leading-6 text-ion-1">
            {PLEDGE_VIOLATION}. No violations have been published.
          </p>
        </section>

        <section className="rounded-2xl border border-mineral bg-eclipse/40 p-5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ion-3">
            Machine-readable
          </p>
          <p className="mt-2 text-sm text-ion-1">
            Category <span className="font-numerals">{AFFILIATE_FREE_PLEDGE.category}</span>.
            Enforcement: {AFFILIATE_FREE_PLEDGE.enforcement}. JSON at{" "}
            <Link href="/api/pledge/affiliate-free" className="text-orbital-cyan underline">
              /api/pledge/affiliate-free
            </Link>
            .
          </p>
        </section>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}
