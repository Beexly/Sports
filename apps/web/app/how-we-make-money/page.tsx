import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { BRAND_NAME } from "@/lib/brand";

/**
 * /how-we-make-money — the trust layer required before any affiliate
 * partner link can go live.
 *
 * Context: the founder ruling (2026-07-16, reports/agent-handoffs/
 * ACTIVE_AGENT_RELAY.md "FOUNDER RULINGS") turned affiliate revenue ON
 * under a disclosed-conflict model — not "no affiliate ever," but never
 * without disclosure, never without structural separation between pick
 * generation and partner economics, and never with the absolute
 * "our number is only right because we're unbiased" framing that a plain
 * disclosed-conflict admission makes unnecessary and untrue.
 *
 * Rules for this page (do not relax without a founder ruling):
 *   - No invented numbers. Every figure this page could show lives on
 *     /performance, /clv, or /accountability and is linked there, not
 *     restated here.
 *   - No partner names. The operator registry
 *     (apps/web/lib/cockpit/operator-registry.ts) has zero
 *     APPROVED_PARTNER rows today; this page describes the POLICY, not a
 *     current partner list.
 *   - No absolute claims tying revenue to pick correctness. Commissions are
 *     structurally separated from scoring — described honestly, not
 *     oversold.
 */

export const metadata: Metadata = {
  title: "How we make money",
  description:
    "Subscriptions are the primary business. Some pages may also carry clearly labeled partner links that earn a commission. Commissions never influence picks, and the separation is checked automatically on every change.",
  alternates: { canonical: "/how-we-make-money" },
};

const REVENUE_SOURCES = [
  {
    title: "Subscriptions: the primary business",
    body: `${BRAND_NAME} is a subscription product first. Pro and Elite unlock the full board, confidence scores, and the deeper tools; Free stays a real product with a public Edge Index and the same published track record. Subscription revenue is what the business is built to run on.`,
  },
  {
    title: "Partner links: additive, licensed, and labeled",
    body: "Some pages may also carry links to licensed sportsbook operators. If you click one and it leads to signing up, the operator may pay a commission. Nothing about a partner relationship changes what you see on the board: the pick model runs the same regardless of who is or isn't a partner.",
  },
] as const;

const SEPARATION_POINTS = [
  {
    title: "Different code, different people, different pipeline",
    body: "The code that scores and ranks picks lives in a separate part of the codebase from the code that manages partner links and commission accounting. Neither reads from the other.",
  },
  {
    title: "Machine-checked, not just promised",
    body: "An automated check runs on every single code change and fails the build if the pick-scoring engine or the data-ingestion pipeline ever imports anything from the partner-economics code, or the other way around. A promise can be forgotten; a failing build cannot be shipped.",
  },
  {
    title: "No pay-for-placement",
    body: "An operator cannot buy a better grade, a higher rank, or a spot on the board. The scoring model reads market data, not partner contracts.",
  },
] as const;

const DISCLOSURE_POINTS = [
  {
    title: "Adjacent, not buried",
    body: "Every partner link carries its own disclosure label immediately next to it, not just a note in the footer or on a separate terms page. If you can see the link, you can see the label.",
  },
  {
    title: "Plain language",
    body: "The label reads “Paid partner link” and points back to this page. Regulators have flagged the bare words “affiliate link” as easy to skim past; we don't rely on that phrasing alone.",
  },
  {
    title: "State and age gating",
    body: "Any page carrying a partner link also carries 21+, responsible-gambling, and state-eligibility information, the same as the rest of the site.",
  },
] as const;

// Section accents as design-token classes, in doctrine order: orbital-cyan
// (data), ultraviolet (model depth), plasma (emphasis). No raw hex — the
// palette-cohesion guard and the token file stay the single source of truth.
const ACCENT_BAR = ["bg-orbital-cyan", "bg-ultraviolet", "bg-plasma"] as const;
const ACCENT_TEXT = ["text-orbital-cyan", "text-ultraviolet", "text-plasma"] as const;

export default function HowWeMakeMoneyPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <p className="eyebrow">How we make money</p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-4 font-display text-display-xl text-balance text-ion-white">
                Subscriptions come first. Partner links are additive and labeled.
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-ion-1">
                {BRAND_NAME} runs on subscriptions. Some pages may also carry
                links to licensed sportsbook operators that pay a commission
                when they lead to a signup. This page explains both, plainly,
                and how the two are kept apart.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Revenue sources */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="eyebrow">Where the money comes from</p>
              <h2 className="mt-3 font-display text-display-lg text-balance text-ion-white">
                Two sources. One of them is primary.
              </h2>
            </Reveal>
            <Stagger className="mt-8 grid gap-5 md:grid-cols-2" step={100}>
              {REVENUE_SOURCES.map((item, index) => (
                <article key={item.title} className="surface-card p-6">
                  <span
                    aria-hidden="true"
                    className={`block h-1 w-10 rounded-full ${ACCENT_BAR[index] ?? "bg-orbital-cyan"}`}
                  />
                  <h3 className="mt-4 text-lg font-semibold text-ion-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-ion-1">{item.body}</p>
                </article>
              ))}
            </Stagger>
            <Reveal delay={120}>
              <p className="mx-auto mt-6 max-w-3xl text-sm leading-6 text-ion-1">
                We don&apos;t currently have any live partner links. The operator
                registry that has to approve one before it can appear
                publicly has zero approved partners today. This page describes
                the policy those links will follow whenever that changes, so
                the policy exists before the first link does.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Structural separation */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="eyebrow">Structural separation</p>
              <h2 className="mt-3 font-display text-display-lg text-balance text-ion-white">
                Commissions never influence picks.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-ion-1">
                A disclosed conflict of interest is still a conflict of
                interest. The honest answer isn&apos;t a claim that the
                conflict doesn&apos;t exist; it&apos;s keeping it from ever
                touching the part of the system that decides what a pick is.
              </p>
            </Reveal>
            <Stagger className="mt-8 grid gap-5 md:grid-cols-3" step={100}>
              {SEPARATION_POINTS.map((item, index) => (
                <article key={item.title} className="surface-card p-6">
                  <span
                    aria-hidden="true"
                    className={`font-mono text-2xl font-semibold tabular-nums ${ACCENT_TEXT[index] ?? "text-orbital-cyan"}`}
                  >
                    0{index + 1}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-ion-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-ion-1">{item.body}</p>
                </article>
              ))}
            </Stagger>
          </div>
        </section>

        {/* Disclosure */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="eyebrow">Disclosure</p>
              <h2 className="mt-3 font-display text-display-lg text-balance text-ion-white">
                Every partner link is labeled.
              </h2>
            </Reveal>
            <Stagger className="mt-8 grid gap-5 md:grid-cols-3" step={100}>
              {DISCLOSURE_POINTS.map((item) => (
                <article key={item.title} className="surface-card p-6">
                  <h3 className="text-lg font-semibold text-ion-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-ion-1">{item.body}</p>
                </article>
              ))}
            </Stagger>
          </div>
        </section>

        {/* Track record stays independent */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow">The record doesn&apos;t move for this</p>
              <h2 className="mt-3 font-display text-display-lg text-balance text-ion-white">
                Track record, published either way.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-ion-1">
                The calibration report, closing-line value, and loss autopsies
                publish on the same gate and the same schedule whether or not
                any partner relationship exists. Nothing about a commission
                changes how those numbers are computed or when they&apos;re
                allowed to appear.
              </p>
            </Reveal>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/performance" className="btn btn-ghost">
                View calibration
              </Link>
              <Link href="/clv" className="btn btn-ghost">
                See our CLV
              </Link>
              <Link href="/accountability" className="btn btn-ghost">
                Read accountability
              </Link>
              <Link href="/methodology" className="btn btn-ghost">
                Read methodology
              </Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
              <h2 className="font-display text-display-lg text-balance text-ion-white">
                Questions about a specific link or offer?
              </h2>
              <p className="text-sm leading-6 text-ion-1">
                See something on the site you think should carry a disclosure
                label and doesn&apos;t, or want to know how a specific page
                makes money, reach out and we&apos;ll answer directly.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/pricing" className="btn btn-primary">
                  See subscription plans
                </Link>
                <Link href="/responsible-play" className="btn btn-ghost">
                  Responsible play
                </Link>
              </div>
              <RiskDisclosure variant="compact" className="text-center" />
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </div>
  );
}
