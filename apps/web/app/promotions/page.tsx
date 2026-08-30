import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { PartnerLink } from "@/components/ui/partner-link-disclosure";
import { db } from "@sports/db";
import {
  buildPublicPromotionsResponse,
  PUBLIC_PROMOTIONS_NOTICE,
  type PublicPromotion,
} from "@/lib/promotions/public-payload";

export const metadata: Metadata = {
  title: "Promotions",
  description:
    "Active, compliance-reviewed sportsbook promotions and offers. Eligibility and terms vary by state.",
  alternates: { canonical: "/promotions" },
};

export const dynamic = "force-dynamic";

interface PromotionsPageProps {
  searchParams: { state?: string };
}

function parseState(raw: string | undefined): string | null {
  if (!raw) return null;
  const up = raw.toUpperCase();
  return /^[A-Z]{2}$/.test(up) ? up : null;
}

export default async function PromotionsPage({
  searchParams,
}: PromotionsPageProps) {
  const state = parseState(searchParams.state);

  // Server-render directly from the DB — no internal HTTP round-trip needed.
  const rows = await db.promotion
    .findMany({
      where: { status: "ACTIVE", complianceStatus: "APPROVED" },
      orderBy: { updatedAt: "desc" },
      take: 50,
    })
    .catch(() => [] as Awaited<ReturnType<typeof db.promotion.findMany>>);

  const payload = buildPublicPromotionsResponse(rows, { state });
  const promotions = payload.data;

  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Nav />

      <main id="main-content" className="flex-1">
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <p className="eyebrow mb-2 text-plasma">
              Sportsbook Promotions
            </p>
            <h1 className="font-display text-3xl font-bold text-ion-white sm:text-4xl">
              Vetted sportsbook promotions.
            </h1>
            <p className="mt-3 text-sm text-ion-2">
              A directory of sportsbook offers reviewed for transparency and
              basic eligibility coverage. Listings here aren&apos;t an
              endorsement of any operator. Terms and conditions apply at the
              operator&apos;s site. 21+ where applicable.
            </p>
          </div>

          {/* State selector */}
          <form
            action="/promotions"
            method="GET"
            className="mb-8 flex flex-col gap-3 rounded-xl border border-titanium bg-carbon/40 p-5 sm:flex-row sm:items-end"
          >
            <label
              htmlFor="state"
              className="flex flex-col gap-1 text-xs uppercase tracking-widest text-ion-3"
            >
              <span>Your state</span>
              <input
                type="text"
                name="state"
                id="state"
                defaultValue={state ?? ""}
                maxLength={2}
                placeholder="e.g. NJ"
                className="rounded-md border border-titanium bg-obsidian px-3 py-2 text-sm text-ion-white placeholder-ion-3 focus:border-plasma focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-plasma px-4 py-2 text-sm font-semibold text-plasma-ink transition-colors hover:bg-plasma-glow"
            >
              Apply
            </button>
            {state && (
              <a
                href="/promotions"
                className="text-xs text-ion-3 underline-offset-2 hover:text-ion-1 hover:underline"
              >
                Clear state
              </a>
            )}
          </form>

          {promotions.length === 0 ? (
            <PromotionsEmptyState state={state} />
          ) : (
            <ul
              data-testid="promotions-list"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {promotions.map((promo) => (
                <li key={promo.id}>
                  <PromotionCard promo={promo} />
                </li>
              ))}
            </ul>
          )}

          <div className="mt-10 space-y-4">
            <p
              data-testid="promotions-notice"
              className="rounded-lg border border-titanium bg-carbon/40 p-4 text-xs leading-relaxed text-ion-2"
            >
              {PUBLIC_PROMOTIONS_NOTICE}
            </p>
            <RiskDisclosure />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function PromotionCard({ promo }: { promo: PublicPromotion }) {
  return (
    <article
      data-testid="promotion-card"
      className="flex h-full flex-col gap-3 rounded-xl border border-titanium bg-carbon/40 p-5"
    >
      <header className="flex items-center justify-between">
        <span className="rounded bg-plasma/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-plasma-glow">
          {promo.offerCategory.replaceAll("_", " ")}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-ion-3">
          {promo.sportsbookKey}
        </span>
      </header>
      <h2 className="text-base font-semibold text-ion-white">{promo.headline}</h2>
      <p className="text-sm text-ion-2">{promo.offerSummary}</p>

      <dl className="grid grid-cols-2 gap-2 text-[11px] text-ion-3">
        <div>
          <dt className="uppercase tracking-widest">Operator</dt>
          <dd className="text-ion-1">{promo.operatorName}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-widest">Min age</dt>
          <dd className="text-ion-1">{promo.minimumAge}+</dd>
        </div>
        {promo.promoCode && (
          <div className="col-span-2">
            <dt className="uppercase tracking-widest">Promo code</dt>
            <dd className="text-ion-1">{promo.promoCode}</dd>
          </div>
        )}
        <div className="col-span-2">
          <dt className="uppercase tracking-widest">Eligible states</dt>
          <dd className="text-ion-1">
            {promo.eligibleStates.length > 0
              ? promo.eligibleStates.join(", ")
              : "Not specified"}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-col gap-2 border-t border-titanium pt-3">
        <a
          href={promo.termsUrl}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="text-xs text-plasma-glow underline-offset-2 hover:underline"
        >
          Read operator terms
        </a>
        {promo.affiliateUrl && (
          <PartnerLink
            href={`/go/${promo.slug}`}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-md bg-plasma px-3 py-2 text-xs font-semibold text-plasma-ink transition-colors hover:bg-plasma-glow"
            wrapperClassName="w-full"
          >
            Visit operator
          </PartnerLink>
        )}
        <p
          data-testid="promotion-disclosure"
          className="text-[10px] leading-snug text-ion-3"
        >
          {promo.disclosureText}
        </p>
        <p
          data-testid="promotion-rg"
          className="text-[10px] leading-snug text-ion-3"
        >
          {promo.responsibleGamingText}
        </p>
      </div>
    </article>
  );
}

function PromotionsEmptyState({ state }: { state: string | null }) {
  return (
    <div
      data-testid="promotions-empty"
      className="rounded-xl border border-titanium bg-carbon/40 p-8 text-center"
    >
      <h2 className="text-base font-semibold text-ion-white">
        No promotions available right now
      </h2>
      <p className="mt-2 text-sm text-ion-2">
        {state
          ? `We do not have any reviewed promotions cleared for ${state} at the moment.`
          : "We do not have any reviewed promotions cleared for public display at the moment."}
      </p>
      <p className="mt-3 text-xs text-ion-3">
        Listings here only appear after a manual compliance review. We never
        surface promotions without operator terms, disclosure, or eligibility
        evidence.
      </p>
    </div>
  );
}
