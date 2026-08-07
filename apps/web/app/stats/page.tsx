import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export const metadata = {
  title: "Performance Stats | Galaxy Sports Edge",
  description: "Verified win rates and ROI metrics for the Galaxy Sports Edge intelligence system.",
  alternates: { canonical: "/stats" },
};

export default function StatsPage() {
  return (
    <div className="min-h-screen bg-obsidian text-ion">
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
        <h1 className="font-display text-4xl font-semibold text-ion-white sm:text-5xl">
          Performance Stats
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-ion-1">
          Performance statistics are currently gated. We only publish verified win rates and ROI metrics after a sufficient sample of canonical history has been settled.
        </p>
        <div className="mt-10">
          <p className="text-sm font-mono uppercase tracking-widest text-ion-2">
            STATS_PUBLIC status: Gated
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
