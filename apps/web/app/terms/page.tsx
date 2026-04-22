import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export const metadata = {
  title: "Terms of Service — SportsPicks Pro",
  description: "Terms and conditions for using SportsPicks Pro.",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Nav />

      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-white">Terms of Service</h1>
          <p className="mt-2 text-sm text-gray-500">Last updated: April 2026</p>

          <div className="mt-10 space-y-8 text-sm leading-relaxed text-gray-400">
            <Section title="Acceptance of Terms">
              <p>
                By accessing or using SportsPicks Pro, you agree to be bound by these Terms of
                Service. If you do not agree, do not use the service.
              </p>
            </Section>

            <Section title="Service Description">
              <p>
                SportsPicks Pro provides data-driven sports analysis and picks for informational
                purposes. All picks are generated algorithmically from real odds data and are not
                financial or betting advice.
              </p>
            </Section>

            <Section title="No Gambling Advice">
              <p>
                SportsPicks Pro is an information service only. We do not facilitate, promote, or
                guarantee any gambling outcomes. Past performance does not guarantee future results.
                Sports betting involves significant financial risk. Only bet what you can afford to
                lose. If you have a gambling problem, call{" "}
                <a
                  href="tel:1-800-522-4700"
                  className="text-gray-300 underline underline-offset-2 hover:text-white"
                >
                  1-800-522-4700
                </a>
                .
              </p>
            </Section>

            <Section title="Subscriptions and Payments">
              <p>
                Paid subscriptions are billed monthly through Stripe. You may cancel at any time.
                Cancellation takes effect at the end of the current billing period. No refunds are
                issued for partial billing periods.
              </p>
            </Section>

            <Section title="Prohibited Use">
              <ul className="list-disc space-y-1 pl-5">
                <li>Reselling or redistributing picks without written permission</li>
                <li>Using automated tools to scrape the service</li>
                <li>Sharing account credentials with others</li>
                <li>Using the service in violation of applicable laws</li>
              </ul>
            </Section>

            <Section title="Disclaimers and Limitation of Liability">
              <p>
                The service is provided &ldquo;as is&rdquo; without warranties of any kind.
                SportsPicks Pro is not liable for any losses arising from use of the picks or
                service, including gambling losses.
              </p>
            </Section>

            <Section title="Changes to Terms">
              <p>
                We may update these terms from time to time. Continued use of the service after
                changes constitutes acceptance of the updated terms.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                For questions, contact us at{" "}
                <span className="text-gray-300">support@sportspickspro.com</span>.
              </p>
            </Section>
          </div>

          <div className="mt-12 border-t border-gray-800 pt-6">
            <Link href="/" className="text-sm text-gray-500 transition-colors hover:text-gray-300">
              &larr; Back to home
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}
