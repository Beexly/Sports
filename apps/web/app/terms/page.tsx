import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME, LEGAL_EMAIL } from "@/lib/brand";
import { TERMS_LAST_UPDATED, formatLegalDate } from "@/lib/legal-dates";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of service governing the use of ${BRAND_NAME}.`,
  alternates: { canonical: "/terms" },
};

/**
 * Terms of Service — placeholder, written to be safe-by-default while the
 * operator runs the final legal review. The content is reasonable to ship as
 * v1 but must be reviewed by counsel before paid checkout is enabled.
 */
export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main id="main-content" className="flex-1">
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <article className="prose-content mx-auto max-w-3xl">
            <p className="eyebrow">Legal</p>
            <h1 className="mt-3 font-display text-display-xl text-white">
              Terms of Service
            </h1>
            <p className="mt-2 text-sm text-ink-500">
              Last updated: {formatLegalDate(TERMS_LAST_UPDATED)}
            </p>

            <Heading>1. Acceptance of these terms</Heading>
            <Para>
              By creating an account or otherwise using {BRAND_NAME}
              (&quot;the Service&quot;), you agree to be bound by these terms.
              If you do not agree, you must not use the Service.
            </Para>

            <Heading>2. What the Service is</Heading>
            <Para>
              {BRAND_NAME} is an informational service that publishes
              algorithmic analysis of sporting events using publicly available
              odds data. The Service is not a sportsbook, does not accept
              wagers, and does not facilitate any wager. Nothing on the
              Service constitutes gambling advice, investment advice, or a
              promise of any outcome.
            </Para>

            <Heading>3. No guarantees</Heading>
            <Para>
              No outcome from following content on the Service is ever
              promised or assured. Sports outcomes are uncertain and any
              historical record we publish is a description of the past, not
              a prediction of the future. You are solely responsible for any
              wager you choose to place outside the Service.
            </Para>

            <Heading>4. Eligibility</Heading>
            <Para>
              You must be at least the legal age to wager in your jurisdiction
              to use the Service. You are responsible for confirming that
              accessing the Service is legal where you live. If sports
              wagering is prohibited in your jurisdiction, you may still view
              {" "}{BRAND_NAME} as informational content, but you accept that
              you do so at your own risk.
            </Para>

            <Heading>5. Subscriptions and billing</Heading>
            <Para>
              Paid plans renew automatically on the interval you select
              (monthly or annual) until canceled. You can cancel from your
              account dashboard at any time. Cancellation takes effect at the
              end of the current billing period; we do not pro-rate refunds for
              partial periods. We may offer occasional refunds at our
              discretion within the period stated at checkout.
            </Para>

            <Heading>6. Acceptable use</Heading>
            <Para>
              You agree not to scrape, automate, resell, or republish content
              from the Service without written permission. You agree not to
              attempt to circumvent authentication or paywalls. We may
              terminate accounts that abuse the Service.
            </Para>

            <Heading>7. Promotions and affiliate links</Heading>
            <Para>
              The Service may surface promotional offers from third-party
              sportsbooks. Where applicable, these are disclosed as affiliate
              links. {BRAND_NAME} does not control those third parties and is
              not responsible for their offers, terms, or practices.
            </Para>

            <Heading>8. Disclaimers</Heading>
            <Para>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF
              ANY KIND, EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
              NON-INFRINGEMENT. TO THE EXTENT PERMITTED BY LAW, {BRAND_NAME}
              IS NOT LIABLE FOR ANY INDIRECT, CONSEQUENTIAL, SPECIAL,
              INCIDENTAL, OR PUNITIVE DAMAGES, OR FOR LOST WAGERS, LOST
              PROFITS, OR LOST DATA.
            </Para>

            <Heading>9. Changes</Heading>
            <Para>
              We may update these terms from time to time. If a change is
              material, we will notify you on the Service or by email. Your
              continued use of the Service after a change takes effect
              constitutes acceptance.
            </Para>

            <Heading>10. Contact</Heading>
            <Para>
              Questions about these terms should be sent to{" "}
              <a
                href={`mailto:${LEGAL_EMAIL}`}
                className="text-accent-300 underline-offset-4 hover:underline"
              >
                {LEGAL_EMAIL}
              </a>
              .
            </Para>
          </article>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 font-display text-2xl font-semibold text-white">
      {children}
    </h2>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-sm leading-relaxed text-ink-300">{children}</p>
  );
}
