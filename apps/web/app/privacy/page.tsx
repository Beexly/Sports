import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export const metadata = {
  title: "Privacy Policy — SportsPicks Pro",
  description: "How SportsPicks Pro collects and uses your data.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Nav />

      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-white">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-500">Last updated: April 2026</p>

          <div className="mt-10 space-y-8 text-sm leading-relaxed text-gray-400">
            <Section title="Information We Collect">
              <p>
                When you create an account, we collect your email address and name (provided by your
                Google account). We also collect usage data such as which picks you view and your
                subscription status.
              </p>
            </Section>

            <Section title="How We Use Your Information">
              <ul className="list-disc space-y-1 pl-5">
                <li>To provide and improve the SportsPicks Pro service</li>
                <li>To process subscription payments via Stripe</li>
                <li>To send service-related emails (e.g. pick alerts, if subscribed)</li>
                <li>To analyze aggregate usage trends and improve pick quality</li>
              </ul>
            </Section>

            <Section title="Data Sharing">
              <p>
                We do not sell your personal data. We share data only with service providers
                necessary to operate the platform: Stripe (payments), Google (authentication),
                and our hosting provider.
              </p>
            </Section>

            <Section title="Data Retention">
              <p>
                Account data is retained while your account is active. You may request deletion
                of your account and associated data at any time by contacting us.
              </p>
            </Section>

            <Section title="Cookies">
              <p>
                We use a single session cookie to keep you signed in. We do not use advertising
                or tracking cookies.
              </p>
            </Section>

            <Section title="Your Rights">
              <p>
                You may request access to, correction of, or deletion of your personal data.
                Contact us at the address below.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                For privacy questions, contact us at{" "}
                <span className="text-gray-300">privacy@sportspickspro.com</span>.
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
