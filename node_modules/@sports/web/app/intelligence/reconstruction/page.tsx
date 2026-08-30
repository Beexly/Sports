import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { db } from "@sports/db";
import {
  loadReconstructedSeparation,
  type ReconstructedSeparationSurface,
  type LoadableSeparationClient,
} from "@/lib/reconstruction/separation-surface";
import { SeparationPanel } from "@/components/reconstruction/separation-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reconstruction Lab · Estimated, Not Measured",
  description:
    "An R&D exhibit: receiver separation tendencies reconstructed from public Next Gen Stats aggregates, de-noised and shown with honest uncertainty. Reconstructed, never measured tracking.",
  alternates: { canonical: "/intelligence/reconstruction" },
};

/**
 * Reconstruction Lab — the first live surface for the reconstruction engine.
 * Ships DARK behind RECONSTRUCTION_FEATURES_ENABLED (default off): the engine is
 * R&D that must not move a public number until edge-lab promotes it. When the
 * flag is off, or before NGS data has accrued, the page shows an honest state.
 */
export default async function ReconstructionPage() {
  const enabled = process.env["RECONSTRUCTION_FEATURES_ENABLED"] === "true";

  const surface: ReconstructedSeparationSurface = enabled
    ? await loadReconstructedSeparation(db as unknown as LoadableSeparationClient).catch(() => ({
        available: false,
        players: [],
        note: "Reconstruction data is temporarily unavailable.",
      }))
    : {
        available: false,
        players: [],
        note:
          "The Reconstruction Lab is an internal R&D exhibit and is not enabled. When on, it shows separation tendencies estimated from public aggregates (reconstructed, never measured tracking), with their uncertainty.",
      };

  return (
    <div className="flex min-h-screen flex-col bg-obsidian text-ion-white">
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-orbital-cyan">Reconstruction Lab</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Estimated from public aggregates. Shown with its uncertainty.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ion-1">
          Proprietary reconstruction: we estimate trajectory-level features from cleared public
          data (Next Gen Stats), de-noise them, and label them honestly. This is not measured
          tracking, and it does not move any published pick or confidence number.
        </p>
        <div className="mt-8">
          <SeparationPanel surface={surface} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
