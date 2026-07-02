import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { VerifyConsole } from "@/components/trust-ledger/verify-console";

export const metadata: Metadata = {
  title: "Verify a Pick · Tamper-Evident Proof of Record",
  description:
    "Every pick is frozen into a SHA-256 receipt before kickoff and never rewritten. Paste a receipt hash and check the commitment yourself: the integrity check runs live against the stored record.",
  alternates: { canonical: "/verify" },
};

export default function VerifyPage({
  searchParams,
}: {
  searchParams: { hash?: string };
}) {
  // Deep-link support: pick cards link here with their receipt hash so the
  // check runs on arrival. Validated again client- and server-side.
  const initialHash = /^[0-9a-f]{64}$/.test(searchParams.hash?.toLowerCase() ?? "")
    ? searchParams.hash!.toLowerCase()
    : "";
  return (
    <div className="flex min-h-screen flex-col bg-obsidian text-ion-white">
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-orbital-cyan">
          Proof of record
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Verify any pick yourself.
        </h1>
        <p className="mt-3 text-sm leading-6 text-ion-1">
          Before kickoff, every pick is frozen into a receipt: the side, the
          line, the price, the scores we claimed, and the moment it was
          frozen, all stamped with a SHA-256 hash. The receipt is never
          rewritten. Paste a hash below and the server re-computes the hash
          from the stored record, live. If anything had been edited after the
          fact, the hashes would not match, and this page would say so in red.
        </p>
        <p className="mt-2 text-xs leading-5 text-ion-2">
          Receipts for games that have not started verify as sealed: you can
          confirm the commitment exists and predates kickoff, and the fields
          open automatically once the game begins.
        </p>
        <div className="mt-8">
          <VerifyConsole initialHash={initialHash} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
