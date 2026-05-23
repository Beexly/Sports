import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { PromoCodeButton } from "@/components/promotions/promo-code-button";
import { PromoFitCheck } from "@/components/promotions/promo-fit-check";
import { db } from "@sports/db";
import {
  buildPublicPromotionsResponse,
  PUBLIC_PROMOTIONS_NOTICE,
  type PublicPromotion,
} from "@/lib/promotions/public-payload";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Promo Code Desk - Reviewed Sportsbook Offers",
  description:
    "A responsible promo-code desk for reviewed sportsbook, DFS, and pick'em offers. Codes, terms, eligible states, and disclosure shown before any link.",
  alternates: { canonical: "/promotions" },
};

interface PromotionsPageProps {
  searchParams: Promise<{ state?: string }>;
}

const QUICK_STATES = ["AZ", "CO", "IL", "IN", "NJ", "NY", "OH", "PA", "TN", "VA"] as const;
const PARTNER_TARGETS = [
  "DraftKings",
  "FanDuel",
  "BetMGM",
  "PrizePicks",
  "Underdog",
  "Fanatics",
] as const;

function parseState(raw: string | undefined): string | null {
  if (!raw) return null;
  const up = raw.toUpperCase();
  return /^[A-Z]{2}$/.test(up) ? up : null;
}

export default async function PromotionsPage({ searchParams }: PromotionsPageProps) {
  const query = await searchParams;
  const state = parseState(query.state);

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
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Nav />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-cyan-400/10 px-4 py-14 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(0,229,255,0.14),transparent_30%),radial-gradient(circle_at_80%_18%,rgba(255,45,214,0.13),transparent_26%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-cyan-200">
                Promo Code Desk
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">
                Take the bonus. Don&apos;t let the bonus take the wheel.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-300">
                Reviewed sportsbook and DFS offers live here, away from the
                picks. Codes, state eligibility, terms, and disclosure appear
                before any outbound link.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/80 p-5 shadow-2xl shadow-cyan-950/30">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200">
                Desk rules
              </p>
              <ul className="mt-4 space-y-3 text-sm font-semibold text-gray-200">
                <li>Terms first. Always.</li>
                <li>Promos never change a pick.</li>
                <li>21+ where applicable. State rules apply.</li>
                <li>Galaxy Sports Edge may earn commission from partner links.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-8">
            <PromoFitCheck />
          </div>

          <div className="mb-8 rounded-2xl border border-gray-800 bg-gray-900/50 p-5">
            <form action="/promotions" method="GET" className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <label htmlFor="state" className="flex max-w-xs flex-col gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                  Filter by state
                </span>
                <input
                  type="text"
                  name="state"
                  id="state"
                  defaultValue={state ?? ""}
                  maxLength={2}
                  placeholder="TX, NJ, NY..."
                  className="rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm font-bold uppercase text-white placeholder-gray-600 focus:border-cyan-400 focus:outline-none"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {QUICK_STATES.map((code) => (
                  <a
                    key={code}
                    href={`/promotions?state=${code}`}
                    className={[
                      "rounded-full border px-3 py-2 text-xs font-black transition",
                      state === code
                        ? "border-cyan-300 bg-cyan-300 text-slate-950"
                        : "border-gray-700 bg-gray-950 text-gray-200 hover:border-cyan-300",
                    ].join(" ")}
                  >
                    {code}
                  </a>
                ))}
                {state && (
                  <a href="/promotions" className="rounded-full border border-gray-700 px-3 py-2 text-xs font-bold text-gray-400 hover:text-white">
                    Clear
                  </a>
                )}
                <button type="submit" className="rounded-full bg-fuchsia-500 px-4 py-2 text-xs font-black text-slate-950">
                  Apply
                </button>
              </div>
            </form>
          </div>

          {promotions.length === 0 ? (
            <PromotionsEmptyState state={state} />
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
              <ul data-testid="promotions-list" className="grid gap-5 md:grid-cols-2">
                {promotions.map((promo) => (
                  <li key={promo.id}>
                    <PromotionCard promo={promo} />
                  </li>
                ))}
              </ul>

              <aside className="h-fit rounded-2xl border border-gray-800 bg-gray-900/50 p-5">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200">
                  Before you claim
                </p>
                <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-300">
                  <p>
                    A promotion can improve your starting position. It cannot
                    make a bad bet good.
                  </p>
                  <p>
                    Read rollover, minimum deposit, expiration, eligible states,
                    and withdrawal rules before creating an account.
                  </p>
                  <p>
                    If a promo ever conflicts with discipline, skip the promo.
                  </p>
                </div>
              </aside>
            </div>
          )}

          <div className="mt-10 space-y-4">
            <p
              data-testid="promotions-notice"
              className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 text-xs leading-relaxed text-gray-400"
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
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/60 shadow-2xl shadow-black/20"
    >
      <div className="relative border-b border-gray-800 bg-[radial-gradient(circle_at_24%_20%,rgba(0,229,255,0.20),transparent_35%),linear-gradient(135deg,rgba(255,45,214,0.18),rgba(0,229,255,0.08))] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-cyan-200">
              {promo.operatorName.slice(0, 1)}
            </div>
            <div>
              <p className="text-sm font-black text-white">{promo.operatorName}</p>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">
                {promo.offerCategory.replaceAll("_", " ")}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-slate-950/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-gray-300">
            {promo.minimumAge}+
          </span>
        </div>
        <h2 className="mt-5 text-2xl font-black leading-tight text-white">
          {promo.headline}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-200">
          {promo.offerSummary}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        {promo.promoCode ? (
          <PromoCodeButton code={promo.promoCode} />
        ) : (
          <div className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
              Promo code
            </p>
            <p className="mt-1 text-sm font-bold text-gray-300">
              No public code listed. Use operator terms.
            </p>
          </div>
        )}

        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-gray-800 bg-gray-950 p-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">States</dt>
            <dd className="mt-1 font-bold text-gray-200">
              {promo.eligibleStates.length > 0
                ? promo.eligibleStates.slice(0, 8).join(", ")
                : "Check terms"}
              {promo.eligibleStates.length > 8 ? "..." : ""}
            </dd>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-950 p-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">Expires</dt>
            <dd className="mt-1 font-bold text-gray-200">
              {promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString("en-US") : "See terms"}
            </dd>
          </div>
        </dl>

        <div className="mt-auto space-y-3 border-t border-gray-800 pt-4">
          <a
            href={promo.termsUrl}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="block rounded-xl border border-gray-700 px-4 py-3 text-center text-sm font-black text-gray-100 transition hover:border-cyan-300"
          >
            Read terms first
          </a>
          {promo.affiliateUrl && (
            <a
              href={promo.affiliateUrl}
              target="_blank"
              rel="nofollow sponsored noopener noreferrer"
              className="block rounded-xl bg-cyan-300 px-4 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-cyan-200"
            >
              Claim with partner link
            </a>
          )}
          <p data-testid="promotion-disclosure" className="text-[10px] leading-snug text-gray-500">
            {promo.disclosureText}
          </p>
          <p data-testid="promotion-rg" className="text-[10px] leading-snug text-gray-500">
            {promo.responsibleGamingText}
          </p>
        </div>
      </div>
    </article>
  );
}

function PromotionsEmptyState({ state }: { state: string | null }) {
  return (
    <div
      data-testid="promotions-empty"
      className="rounded-2xl border border-gray-800 bg-gray-900/50 p-10 text-center"
    >
      <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">
        No cleared offers
      </p>
      <h2 className="mt-3 text-2xl font-black text-white">
        {state ? `Nothing reviewed for ${state} yet.` : "The promo desk is waiting on reviewed offers."}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-400">
        Offers only appear after the operator link, terms URL, eligibility,
        disclosure, and responsible-gaming language clear review. That keeps
        this from becoming a messy ad wall.
      </p>
      <div className="mx-auto mt-7 grid max-w-3xl gap-3 sm:grid-cols-3">
        {PARTNER_TARGETS.map((name) => (
          <div
            key={name}
            className="rounded-2xl border border-gray-800 bg-gray-950 p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300 text-sm font-black text-slate-950">
                {name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="text-sm font-black text-white">{name}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">
                  Review queue
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <a
        href="mailto:hq@galaxysportsedge.com?subject=Promo%20partner%20review"
        className="mt-6 inline-flex rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950"
      >
        Submit a partner offer
      </a>
    </div>
  );
}
