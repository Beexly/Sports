import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: "Privacy Policy — SportsPicks Pro",
  description: "How SportsPicks Pro collects, uses, and protects your data.",
};

const EFFECTIVE_DATE = "January 1, 2026";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Nav />
      <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <article className="mx-auto max-w-3xl text-gray-300">
          <header className="mb-10 border-b border-gray-800 pb-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Effective {EFFECTIVE_DATE}
            </p>
          </header>

          <Section title="1. Information We Collect">
            <p>We collect only what we need to run the Service:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong>Account information</strong> — name, email address, and
                profile image from your Google OAuth sign-in.
              </li>
              <li>
                <strong>Subscription information</strong> — tier, status, and
                billing cycle. Payment details are stored and processed by
                Stripe; we never see or store full card numbers.
              </li>
              <li>
                <strong>Usage data</strong> — pages you visit, picks you view,
                and interactions with the Service, used to improve the product
                and detect abuse.
              </li>
              <li>
                <strong>Technical data</strong> — IP address, browser, device
                type, and crash reports.
              </li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul className="ml-5 list-disc space-y-1">
              <li>Operate, maintain, and improve the Service.</li>
              <li>Authenticate you and manage your subscription.</li>
              <li>Process payments through Stripe.</li>
              <li>
                Send transactional messages (billing receipts, security
                alerts). We do not send marketing email without your consent.
              </li>
              <li>Detect, investigate, and prevent abuse and fraud.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </Section>

          <Section title="3. Sharing">
            <p>
              We do <strong>not</strong> sell your personal information. We
              share data only with:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong>Service providers</strong> acting on our behalf —
                Stripe (payments), Google (OAuth sign-in), our hosting and
                database providers, analytics providers. These parties may
                only use your data to perform services for us.
              </li>
              <li>
                <strong>Legal authorities</strong> when required by law, court
                order, or to protect the rights, property, or safety of
                SportsPicks Pro or others.
              </li>
            </ul>
          </Section>

          <Section title="4. Data Retention">
            <p>
              We keep your account data for as long as your account is active.
              When you delete your account, we delete your personal data within
              30 days, except where we are required to retain it (e.g., tax or
              payment records). Anonymized or aggregated analytics may be kept
              indefinitely.
            </p>
          </Section>

          <Section title="5. Your Rights">
            <p>
              Depending on where you live, you may have the right to access,
              correct, delete, or export your personal data, and to object to
              or restrict certain processing. To exercise these rights, contact
              us via the support channel listed in your account.
            </p>
            <p>
              California residents have specific rights under the CCPA/CPRA,
              including the right to know what personal information we have
              collected and the right to request deletion. We do not sell
              personal information.
            </p>
          </Section>

          <Section title="6. Security">
            <p>
              We take reasonable technical and organizational measures to
              protect your data — encryption in transit, encrypted backups,
              least-privilege access controls, and regular security reviews. No
              system is perfectly secure; we cannot guarantee absolute
              security.
            </p>
          </Section>

          <Section title="7. Cookies and Similar Technologies">
            <p>
              We use cookies to keep you signed in and to remember preferences.
              We do not use advertising trackers. You can disable cookies in
              your browser, but the Service may not function without them.
            </p>
          </Section>

          <Section title="8. Children">
            <p>
              The Service is not directed to children under 21. We do not
              knowingly collect personal information from anyone under the
              minimum age for sports wagering in their jurisdiction.
            </p>
          </Section>

          <Section title="9. International Transfers">
            <p>
              We process data in the United States. If you access the Service
              from outside the U.S., your data will be transferred to and
              processed in the U.S., which may have different data-protection
              laws than your country.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this policy from time to time. Material changes
              will be announced via in-app notice or email.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              Questions about this Privacy Policy or your personal data?
              Contact us through the support channel listed in your account.
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
