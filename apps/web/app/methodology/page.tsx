import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

/**
 * Deferred methodology placeholder (owner directive, 2026-10-17).
 *
 * Direct URL only: not linked from nav, footer, command palette, or any
 * customer page, and kept out of search. The plain-language explanation of
 * how a pick gets made lives at /how-it-works.
 */
export const metadata: Metadata = {
  title: "Methodology",
  description: "Methodology and transparency details will be added here.",
  alternates: { canonical: "/methodology" },
  robots: { index: false, follow: false },
};

export default function MethodologyPage(): JSX.Element {
  return (
    <div className="relative isolate flex min-h-screen flex-col bg-carbon">
      <Nav />
      <main id="main-content" className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-black tracking-tight text-ion-white sm:text-5xl">
            Methodology
          </h1>
          <p className="mt-5 text-lg text-ion-1">
            Methodology and transparency details will be added here.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
