import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import {
  TWO_DOOR_PACK_OFFERS,
  MEMBERSHIP_PRICING,
  FOUNDING_SEAT_COPY,
  singleSlateCheckoutAvailability,
  membershipCheckoutAvailability,
} from "@/lib/packages/two-door-offers";
import { getStage5GateStatus } from "@/lib/packages/stage5-gate";
import { SingleSlateCard, MembershipPlans } from "./_components/two-door-checkout";

// The Stage-5 gate is live state: never cache this page into a stale
// "checkout open" or "checkout closed" snapshot.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Season Membership & Single-Slate Packs | Galaxy Sports Edge" },
  description:
    "Two doors: a season membership at founding pricing, or single-slate packs with store-credit protection. Every official play clears a five-stage check - and every pass is published free.",
};

const eyebrow = "font-numerals text-[11px] uppercase tracking-[0.22em]";

const FIVE_STAGES: readonly { readonly title: string; readonly body: string }[] = [
  {
    title: "Fresh-data check",
    body: "Injury reports, roster rulings and odds are verified fresh before any number is trusted. Stale data never reaches a pick.",
  },
  {
    title: "Full-market scan",
    body: "We compare the number across every book we track - not one screen - so the price we grade against is the real market.",
  },
  {
    title: "Edge verification",
    body: "The model must show a measurable edge at the current number. No edge, no play - regardless of how good the storyline sounds.",
  },
  {
    title: "Price check",
    body: "If the line has already moved past our fair price, the play dies here. We do not chase steam and call it conviction.",
  },
  {
    title: "Publication gate",
    body: "A sealed five-stage receipt must be attached before a pick can be published or sold. No receipt, no official play.",
  },
];

export default async function PackagesPage(): Promise<JSX.Element> {
  const gate = await getStage5GateStatus();
  const slateAvailability = singleSlateCheckoutAvailability();
  const membershipAvailability = membershipCheckoutAvailability();

  return (
    <div className="relative min-h-screen bg-obsidian text-ion-white">
      {/* Page-level motion + scrollbar language (flat FIELD surfaces, no glow) */}
      <style>{`
        .gse-packages ::-webkit-scrollbar { width: 10px; height: 10px; }
        .gse-packages ::-webkit-scrollbar-track { background: #08090C; }
        .gse-packages ::-webkit-scrollbar-thumb { background: #23262E; border: 2px solid #08090C; }
        .gse-packages ::-webkit-scrollbar-thumb:hover { background: #31353F; }
        .gse-packages { scrollbar-width: thin; scrollbar-color: #23262E #08090C; }
        @keyframes gse-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .gse-rise { animation: gse-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .gse-rise-1 { animation-delay: 0.06s; }
        .gse-rise-2 { animation-delay: 0.14s; }
        .gse-rise-3 { animation-delay: 0.22s; }
        @keyframes gse-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        .gse-pulse { animation: gse-pulse 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .gse-rise, .gse-pulse { animation: none; }
        }
      `}</style>

      <div className="gse-packages">
        <Nav />
        <main id="main-content" className="mx-auto w-full max-w-6xl px-4 pb-24 pt-14 sm:px-6">
          {/* ── Hero · filed report, not a template plate ─────────────── */}
          <header className="gse-rise border-b border-mineral pb-10">
            <p className={`${eyebrow} text-plasma`}>Galaxy Sports Edge · Week 10 · Storefront</p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.05] text-ion-white sm:text-6xl">
              Two doors. One standard.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1 sm:text-lg">
              Join for the season, or buy a single slate. Either way, you only ever pay for
              plays that clear our five-stage check - and when we pass, the reasoning is
              published free. Passing is a decision we are proud of, not a gap we hide.
            </p>

            {/* Live Stage-5 gate band */}
            <div
              data-testid="stage5-gate-band"
              className={`mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border px-4 py-3.5 ${
                gate.checkoutEnabled ? "border-mineral-hi bg-eclipse" : "border-plasma/60 bg-eclipse"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={`gse-pulse inline-block h-2 w-2 ${gate.checkoutEnabled ? "bg-ion-white" : "bg-plasma"}`}
                />
                <span className={`${eyebrow} ${gate.checkoutEnabled ? "text-ion-white" : "text-plasma"}`}>
                  Stage-5 gate · {gate.checkoutEnabled ? "open" : "closed"}
                </span>
              </span>
              <span className="font-numerals text-[11px] uppercase tracking-[0.18em] tabular-nums text-ion-2">
                {gate.officialPlayCount} official {gate.officialPlayCount === 1 ? "play" : "plays"} published
              </span>
              <span className="w-full text-sm leading-6 text-ion-1 sm:w-auto sm:flex-1">
                {gate.reason}
              </span>
            </div>
          </header>

          {/* ── Door 1 · Season Membership ────────────────────────────── */}
          <section id="season-membership" aria-labelledby="door-1-heading" className="gse-rise gse-rise-1 mt-14">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <div>
                <p className={`${eyebrow} text-ion-2`}>Door 1</p>
                <h2 id="door-1-heading" className="mt-2 font-display text-3xl text-ion-white sm:text-4xl">
                  Season Membership
                </h2>
              </div>
              <span className={`${eyebrow} border border-plasma px-3 py-1.5 text-plasma`}>
                {FOUNDING_SEAT_COPY}
              </span>
            </div>

            <div className="mt-6 border border-mineral bg-eclipse">
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <div className="border-b border-mineral p-6 sm:p-8 lg:border-b-0 lg:border-r">
                  <p className="text-base leading-7 text-ion-1">
                    Every official play we publish for the rest of the season - sides,
                    totals, props, correlated parlays and DFS builds - with the same
                    five-stage discipline on every slate. Members see the full reasoning,
                    including every pass, the moment it is filed.
                  </p>
                  <ul className="mt-6 space-y-2.5 text-sm leading-6 text-ion-1">
                    <li className="flex gap-2.5"><span aria-hidden className="text-plasma">-</span>All single-slate packs included while your membership is active</li>
                    <li className="flex gap-2.5"><span aria-hidden className="text-plasma">-</span>Full reasoning on every official play and every pass</li>
                    <li className="flex gap-2.5"><span aria-hidden className="text-plasma">-</span>Playoff coverage included in the one-time option</li>
                    <li className="flex gap-2.5"><span aria-hidden className="text-plasma">-</span>Cancel monthly anytime; the one-time option runs to the final whistle</li>
                  </ul>
                </div>
                <div className="p-6 sm:p-8">
                  <p className={`${eyebrow} text-ion-2`}>Founding rate</p>
                  <p className="mt-2 font-numerals text-5xl font-semibold tabular-nums text-ion-white">
                    ${(MEMBERSHIP_PRICING.foundingMonthlyCents / 100).toFixed(2)}
                    <span className="text-lg font-normal text-ion-2">/mo</span>
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ion-2">
                    ${(MEMBERSHIP_PRICING.standardMonthlyCents / 100).toFixed(2)}/mo standard after the
                    first 100 members - or ${(MEMBERSHIP_PRICING.restOfSeasonCents / 100).toFixed(0)}{" "}
                    one-time for the rest of the season plus playoffs.
                  </p>
                  <p className="mt-4 border-t border-mineral pt-4 text-xs leading-5 text-ion-2">
                    Founding seats are a pricing policy, not a countdown: we do not publish
                    a live seat counter we cannot verify. The rate holds for the first 100
                    members, full stop.
                  </p>
                </div>
              </div>
              <div className="border-t border-mineral p-6 sm:p-8">
                <MembershipPlans gate={gate} availability={membershipAvailability} />
              </div>
            </div>
          </section>

          {/* ── Door 2 · Single-Slate Packs ───────────────────────────── */}
          <section id="pack-cards" aria-labelledby="door-2-heading" className="gse-rise gse-rise-2 mt-16">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <div>
                <p className={`${eyebrow} text-ion-2`}>Door 2</p>
                <h2 id="door-2-heading" className="mt-2 font-display text-3xl text-ion-white sm:text-4xl">
                  Choose Your Football Pack
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-ion-1">
                  One-time purchase. Your official picks, player props, and parlays unlock immediately right inside the card below.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {TWO_DOOR_PACK_OFFERS.map((offer) => {
                const availability = slateAvailability.find((a) => a.offerSlug === offer.slug);
                return (
                  <SingleSlateCard
                    key={offer.slug}
                    offer={offer}
                    gate={gate}
                    standardConfigured={availability?.standardConfigured ?? false}
                    creditBackConfigured={availability?.creditBackConfigured ?? false}
                  />
                );
              })}
            </div>
          </section>

          {/* ── The five-stage check · why a pass is a feature ────────── */}
          <section aria-labelledby="five-stage-heading" className="gse-rise gse-rise-3 mt-16 border border-mineral bg-eclipse">
            <div className="border-b border-mineral p-6 sm:p-8">
              <p className={`${eyebrow} text-plasma`}>The standard behind both doors</p>
              <h2 id="five-stage-heading" className="mt-2 font-display text-2xl text-ion-white sm:text-3xl">
                Five stages. No shortcuts.
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-ion-1">
                Every official play clears all five stages below before it can be
                published or sold. A game that fails any stage becomes a free, published
                pass - you get the reasoning without paying for it.
              </p>
            </div>
            <ol className="grid gap-0 sm:grid-cols-2 lg:grid-cols-5">
              {FIVE_STAGES.map((stage, i) => (
                <li
                  key={stage.title}
                  className="border-b border-mineral p-6 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 lg:p-6"
                >
                  <p className="font-numerals text-2xl tabular-nums text-plasma">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-3 font-display text-lg text-ion-white">{stage.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ion-2">{stage.body}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* ── Record band · link, never quote ───────────────────────── */}
          <section className="mt-16 border border-mineral bg-eclipse p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
              <div className="max-w-2xl">
                <p className={`${eyebrow} text-ion-2`}>The verified record</p>
                <p className="mt-2 font-display text-2xl text-ion-white">
                  We don&apos;t quote win rates on this page.
                </p>
                <p className="mt-2 text-sm leading-6 text-ion-1">
                  Every graded play, every pass and every unit is sealed in the public
                  record - wins and losses alike. Read it before you spend a dollar.
                </p>
              </div>
              <Link
                href="/record"
                className="border border-plasma px-6 py-3.5 font-numerals text-sm uppercase tracking-[0.18em] text-plasma transition-colors hover:bg-plasma hover:text-plasma-ink"
              >
                See the verified record →
              </Link>
            </div>
          </section>

          {/* ── Still browsing? Free surfaces ─────────────────────────── */}
          <p className="mt-10 text-sm leading-6 text-ion-2">
            Not ready to buy? The free board shows every published pass with its reasoning:{" "}
            <Link href="/board" className="text-plasma transition-colors hover:text-plasma-glow">
              open the board →
            </Link>
          </p>
        </main>
        <Footer />
      </div>
    </div>
  );
}