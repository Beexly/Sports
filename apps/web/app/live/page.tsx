import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export default function LivePage() {
  return (
    <div className="min-h-screen bg-obsidian text-ion">
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
        <h1 className="font-display text-4xl font-semibold text-ion-white sm:text-5xl">
          Observatory
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-ion-1">
          The Live Board is currently in calibration. We are building up odds and settlement history to ensure every signal is backed by a proven track record.
        </p>
        <div className="mt-10">
          <p className="text-sm font-mono uppercase tracking-widest text-ion-2">
            LIVE_BOARD status: Gated
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
