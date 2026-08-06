import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { SUPPORT_EMAIL } from "@/lib/brand";

export const metadata: Metadata = {
  alternates: { canonical: "/podcast" },
  description:
    "GSE Board Meeting — a waitlist for the operator-reviewed podcast format covering what shipped, what broke, model lessons, no-bet decisions, and partner spotlights.",
  title: "GSE Board Meeting Podcast",
};

const SEGMENTS = [
  "what shipped",
  "what broke",
  "what the model learned",
  "what GSE passed on",
  "partner/tool spotlight",
] as const;

export default function PodcastPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="border-b border-mineral/40 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Podcast · Waitlist</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-ion-white">
              GSE Board Meeting — join the waitlist.
            </h1>
            <p className="mt-5 max-w-3xl text-lg text-ion-1">
              Operator-reviewed episodes in a board-meeting format: what shipped, what broke, what the model
              learned, what GSE passed on, and which partners or tools deserve a closer look. Episodes publish
              only after human review — no auto-publishing path.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/waitlist" className="btn btn-primary">
                Join the waitlist
              </Link>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=GSE%20Board%20Meeting%20guest%20or%20partner%20inquiry`}
                className="btn btn-ghost"
              >
                Guest or partner inquiry
              </a>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="eyebrow">Segment structure</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {SEGMENTS.map((segment) => (
                <article key={segment} className="surface-card p-5">
                  <h2 className="font-display text-2xl capitalize text-ion-white">{segment}</h2>
                  <p className="mt-3 text-sm leading-7 text-ion-1">
                    Operator-reviewed segment with evidence notes, clear caveats, and no auto-publishing path.
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
