import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME, LEGAL_EMAIL, SUPPORT_EMAIL } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with the ${BRAND_NAME} team.`,
  alternates: { canonical: "/contact" },
};

const INBOXES = [
  {
    title: "Support",
    description: "Account access, subscription issues, bug reports.",
    email: SUPPORT_EMAIL,
  },
  {
    title: "Legal & privacy",
    description: "Data requests, account deletion, compliance questions, DMCA.",
    email: LEGAL_EMAIL,
  },
  {
    title: "Press",
    description: "Media requests, interview availability, embargoed coverage.",
    email: SUPPORT_EMAIL,
  },
];

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main className="flex-1">
        <section className="px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Get in touch</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-white">
              I answer real people, not bots.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-300">
              I aim to reply within one business day. Faster on weekday
              afternoons, slower around major slates.
            </p>

            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {INBOXES.map((box) => (
                <a
                  key={box.title}
                  href={`mailto:${box.email}`}
                  className="surface-card group flex flex-col gap-2 p-6 transition-colors hover:border-accent-700"
                >
                  <p className="eyebrow">{box.title}</p>
                  <p className="text-sm leading-relaxed text-ink-300">
                    {box.description}
                  </p>
                  <p className="mt-2 font-mono text-sm text-accent-300 group-hover:underline">
                    {box.email}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
