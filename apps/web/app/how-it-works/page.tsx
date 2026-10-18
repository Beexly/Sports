import Link from "next/link";
import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { HowAPickGetsMade } from "@/components/home/how-a-pick-gets-made";

export const metadata: Metadata = {
  title: "How a pick gets made",
  description:
    "We look at the lines, who's hurt and who's playing, size up how strong a pick looks, and tell you why. A signal, not a promise.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage(): JSX.Element {
  return (
    <div className="relative isolate flex min-h-screen flex-col bg-carbon">
      <Nav />
      <main id="main-content" className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <HowAPickGetsMade headingLevel="h1" />
          <div className="mt-10">
            <Link href="/picks" className="btn-primary inline-flex min-h-11 items-center px-5 py-3">
              See today&apos;s picks
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
