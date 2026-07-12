import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME, LEGAL_EMAIL } from "@/lib/brand";
import { PRIVACY_LAST_UPDATED, formatLegalDate } from "@/lib/legal-dates";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${BRAND_NAME} collects, uses, and protects your information.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main id="main-content" className="flex-1">
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <article className="mx-auto max-w-3xl">
            <p className="eyebrow">Legal</p>
            <h1 className="mt-3 font-display text-display-xl text-white">
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-ink-500">
              Last updated: {formatLegalDate(PRIVACY_LAST_UPDATED)}
            </p>

            <Heading>1. What we collect</Heading>
            <Para>
              When you create an account, we collect your name, email address,
              and (if you sign in with Google) your Google profile image. When
              you subscribe, our payment processor (Stripe) collects payment
              details directly. We never see or store your card number.
            </Para>
            <Para>
              We log standard request data (IP address, user agent, referrer)
              for security, abuse-prevention, and aggregate analytics. We do
              not use third-party advertising trackers.
            </Para>

            <Heading>2. How we use it</Heading>
            <Para>
              We use your account information to operate the Service:
              authenticate you, deliver picks, manage your subscription, and
              send transactional email (receipts, password resets, security
              notifications). We use aggregated analytics to understand
              feature usage and improve the model.
            </Para>

            <Heading>3. What we share</Heading>
            <Para>
              We share data only with the subprocessors who help us run the
              Service: hosting (Vercel), database (managed Postgres),
              authentication (Google), payments (Stripe), and email (a
              transactional email provider). We do not sell personal data and
              we do not share data with advertisers.
            </Para>

            <Heading>4. Your choices</Heading>
            <Para>
              You can delete your account at any time from the dashboard. When
              you do, we delete your profile information within 30 days,
              retaining only the minimum records required for tax, fraud,
              and legal compliance.
            </Para>
            <Para>
              If you are a California, EU, or UK resident, you have additional
              rights, including the right to access, correct, or export the
              personal data we hold about you. Email {" "}
              <a
                href={`mailto:${LEGAL_EMAIL}`}
                className="text-accent-300 underline-offset-4 hover:underline"
              >
                {LEGAL_EMAIL}
              </a>{" "}
              and we will respond within 30 days.
            </Para>

            <Heading>5. Security</Heading>
            <Para>
              We use TLS in transit, encrypted database storage at rest, and
              role-scoped database access. Authentication uses standard
              OAuth flows. We will notify affected users without undue delay
              if we ever experience a breach affecting their account data.
            </Para>

            <Heading>6. Children</Heading>
            <Para>
              The Service is not directed to children. We do not knowingly
              collect data from anyone under the legal wagering age in their
              jurisdiction.
            </Para>

            <Heading>7. Changes</Heading>
            <Para>
              If we change this policy materially, we&apos;ll notify you on the
              Service or by email before the change takes effect.
            </Para>

            <Heading>8. Contact</Heading>
            <Para>
              Email{" "}
              <a
                href={`mailto:${LEGAL_EMAIL}`}
                className="text-accent-300 underline-offset-4 hover:underline"
              >
                {LEGAL_EMAIL}
              </a>{" "}
              for any privacy-related request.
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
