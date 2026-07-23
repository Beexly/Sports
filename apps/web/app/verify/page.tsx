import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { VerifyConsole } from "@/components/trust-ledger/verify-console";
import { GeneratedPlate } from "@/components/immersive/generated-plate";

export const metadata: Metadata = {
  title: "Verify a Pick · Tamper-Evident Proof of Record",
  description:
    "Picks are committed to tamper-evident SHA-256 receipts before kickoff and never rewritten. Paste a receipt hash and check the commitment yourself: the integrity check runs live against the stored record.",
  alternates: { canonical: "/verify" },
};

export default function VerifyPage({
  searchParams,
}: {
  searchParams: { hash?: string | string[] };
}) {
  // Deep-link support: pick cards link here with their receipt hash so the
  // check runs on arrival. A duplicated ?hash= makes Next hand us string[],
  // so normalize to a single value before validating (repeated params must
  // not 500 the page).
  const raw = Array.isArray(searchParams.hash) ? searchParams.hash[0] : searchParams.hash;
  const initialHash = /^[0-9a-f]{64}$/.test(raw?.toLowerCase() ?? "")
    ? raw!.toLowerCase()
    : "";
  return (
    <div className="relative isolate flex min-h-screen flex-col bg-obsidian text-ion-white">
      {/* Same atmosphere as /proof and /calibration — the trust surfaces read
          as one room. */}
      <GeneratedPlate assetId="proof-crystal" className="-z-10 opacity-20" />
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-orbital-cyan">
          Proof of record
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-ion-white sm:text-4xl">
          Verify any pick yourself.
        </h1>
        <p className="mt-3 text-sm leading-6 text-ion-1">
          Before kickoff, each published pick with a full market quote is
          frozen into a receipt: the side, the line, the price, the scores we
          claimed, and the moment it was frozen, all stamped with a SHA-256
          hash. The receipt is never rewritten. Paste a hash below and the
          server re-computes the hash from the stored record, live. If
          anything had been edited after the fact, the hashes would not
          match, and this page would say so, plainly and in public. A pick
          without a receipt
          carries no verified claim — we don&apos;t grade what we didn&apos;t seal.
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
