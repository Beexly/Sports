import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: "Terms of Service — SportsPicks Pro",
  description: "Terms of Service for SportsPicks Pro.",
};

const EFFECTIVE_DATE = "January 1, 2026";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Nav />
      <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <article className="mx-auto max-w-3xl text-gray-300">
          <header className="mb-10 border-b border-gray-800 pb-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Terms of Service
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Effective {EFFECTIVE_DATE}
            </p>
          </header>

          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using SportsPicks Pro (&ldquo;the Service&rdquo;),
              you agree to be bound by these Terms of Service. If you do not
              agree, do not use the Service.
            </p>
          </Section>

          <Section title="2. Information Only — Not Gambling Advice">
            <p>
              SportsPicks Pro provides data-driven sports analysis and
              algorithmically-scored picks for <strong>informational and
              entertainment purposes only</strong>. We do not accept, place, or
              facilitate wagers. We are not a bookmaker or sportsbook. Nothing
              on the Service constitutes a guarantee of outcome.
            </p>
            <p>
              Past performance does not predict future results. Sports betting
              involves financial risk and is illegal in some jurisdictions. You
              are solely responsible for knowing and complying with the laws
              that apply to you.
            </p>
          </Section>

          <Section title="3. Eligibility">
            <p>
              You must be at least 21 years of age (or the legal age for sports
              wagering in your jurisdiction, whichever is greater) to use the
              Service. By using the Service you represent that you meet this
              requirement.
            </p>
          </Section>

          <Section title="4. Accounts">
            <p>
              You are responsible for safeguarding the credentials of any
              account you create, and for all activity that occurs under your
              account. We may suspend or terminate accounts for any reason,
              including suspected abuse, fraud, or violation of these Terms.
            </p>
          </Section>

          <Section title="5. Subscriptions and Billing">
            <p>
              Paid subscriptions renew automatically until canceled. Prices
              listed on the <a className="text-brand-400 hover:text-brand-300" href="/pricing">Pricing page</a> are
              authoritative. Payments are processed by Stripe; we do not store
              full card numbers. You may cancel at any time through the
              subscription portal; cancellations take effect at the end of the
              current billing period.
            </p>
            <p>
              Except where prohibited by law, subscription fees are
              non-refundable. Disputes should first be raised with our support
              team.
            </p>
          </Section>

          <Section title="6. Acceptable Use">
            <p>
              You agree not to: scrape or redistribute picks or odds data;
              resell Service output without authorization; attempt to reverse
              engineer our models; interfere with the Service&apos;s operation;
              or use the Service in any unlawful manner.
            </p>
          </Section>

          <Section title="7. Intellectual Property">
            <p>
              All content, models, scoring algorithms, and software comprising
              the Service are the intellectual property of SportsPicks Pro or
              our licensors. You receive a limited, non-transferable,
              revocable license to access the Service for personal,
              non-commercial use.
            </p>
          </Section>

          <Section title="8. Disclaimer of Warranties">
            <p>
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
              AVAILABLE&rdquo; WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
              IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE
              UNINTERRUPTED, ERROR-FREE, ACCURATE, OR PROFITABLE.
            </p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, SPORTSPICKS PRO SHALL NOT
              BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
              OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR WAGERING LOSSES,
              ARISING FROM YOUR USE OF THE SERVICE. OUR AGGREGATE LIABILITY
              SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SERVICE IN THE
              TWELVE MONTHS PRECEDING THE CLAIM.
            </p>
          </Section>

          <Section title="10. Responsible Gambling">
            <p>
              If you or someone you know has a gambling problem, help is
              available. Call the National Problem Gambling Helpline at{" "}
              <a href="tel:1-800-522-4700" className="text-brand-400 hover:text-brand-300">
                1-800-522-4700
              </a>
              , or visit{" "}
              <a
                href="https://www.ncpgambling.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 hover:text-brand-300"
              >
                ncpgambling.org
              </a>
              .
            </p>
          </Section>

          <Section title="11. Changes to These Terms">
            <p>
              We may update these Terms from time to time. Material changes
              will be announced via in-app notice or email. Continued use of
              the Service after changes take effect constitutes acceptance.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              Questions about these Terms? Contact us via the support channel
              listed in your account, or email the address published on our
              support page.
            </p>
          </Section>

        </article>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-gray-400">
        {children}
      </div>
    </section>
  );
}
