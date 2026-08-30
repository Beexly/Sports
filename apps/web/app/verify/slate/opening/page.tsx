/**
 * /verify/slate/opening — public explainer for the slate-commitment opening
 * layer (Phase 0.5b). See docs/ops/PHASE_05B_REVEAL_PROTOCOL.md for the full
 * protocol spec this page summarizes for a customer audience.
 *
 * WHAT THIS PAGE IS. A static explainer of a mechanism, not a per-slate
 * checker. It never queries the database and never calls
 * /api/verify/slate/opening itself — it only describes what that endpoint
 * does and links to it so a reader can run the machine-readable check
 * themselves. No opener material (a disclosed total or blinding sum) is ever
 * fetched or rendered here, in any gate state.
 *
 * GATE. Reads `SLATE_OPENING_REVEAL_ENABLED` (exact-string, same check as the
 * route) only to decide which status line to show. Unset in git; disclosure
 * of a cryptographic opening is a founder decision, not a deploy artifact.
 *
 * LANGUAGE. This is a classical Pedersen commitment over secp256k1 —
 * perfectly hiding, computationally binding under the discrete-log
 * assumption. The only words used for it here are "commitment", "opening",
 * and "binding". Stronger cryptographic claims are not available to this
 * layer, and `no-zk-overclaim.mjs` blocks them on this surface in CI —
 * including inside comments like this one, deliberately.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { GeneratedPlate } from "@/components/immersive/generated-plate";

export const metadata: Metadata = {
  title: "Opening a Slate Commitment · Binding Check on the Record",
  description:
    "Every slate's aggregate commitment is published as a compressed hex before the first kickoff. After the slate fully settles, the opening can be disclosed so anyone can recompute the commitment on secp256k1 and confirm it matches. A binding check on the record — not a claim about whether the picks won.",
  alternates: { canonical: "/verify/slate/opening" },
};

// The gate decides the status copy below; never statically frozen, so a
// founder flip is reflected without a redeploy of this page.
export const dynamic = "force-dynamic";

export default function SlateOpeningExplainerPage(): JSX.Element {
  const revealEnabled = process.env["SLATE_OPENING_REVEAL_ENABLED"] === "true";

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-obsidian text-ion-white">
      {/* Same atmosphere as /verify — the trust surfaces read as one room. */}
      <GeneratedPlate assetId="proof-crystal" className="-z-10 opacity-20" />
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-orbital-cyan">
          Proof of record · Slate commitment
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-ion-white sm:text-4xl">
          How a slate&apos;s aggregate commitment opens.
        </h1>
        <p className="mt-3 text-sm leading-6 text-ion-1">
          Before the first kickoff of a sport&apos;s game-day, we publish one
          number for the whole slate: a compressed hex string that commits to
          the sum of every covered pick&apos;s edge score, sealed together
          with a random blinding factor so the hex reveals nothing about any
          individual pick. That hex is published at{" "}
          <Link href="/api/verify/slate" className="underline hover:text-orbital-cyan">
            /api/verify/slate
          </Link>{" "}
          before any result is known and is never rewritten.
        </p>
        <p className="mt-3 text-sm leading-6 text-ion-1">
          A commitment nobody can open proves nothing on its own — it is a
          number no one has been shown how to check. Once every covered pick
          on that slate has a final result, the two numbers behind the hex —
          the total and the blinding sum added to it — can be disclosed. That
          is what turns the hex from plumbing into evidence.
        </p>

        <section className="mt-10 border border-mineral bg-eclipse/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ion-2">
            How to check it yourself
          </h2>
          <p className="mt-3 text-sm leading-6 text-ion-1">
            Given a disclosed value and blinding sum, recompute the commitment
            on the secp256k1 curve:
          </p>
          <p className="mt-3 rounded border border-mineral bg-obsidian/60 px-4 py-3 font-mono text-xs leading-6 text-ion-white">
            C = [value]·G + [blinding sum]·H
          </p>
          <p className="mt-3 text-sm leading-6 text-ion-1">
            G is the standard secp256k1 base point. H is a second point with
            no known relationship to G, derived deterministically from the
            public seed{" "}
            <code className="rounded bg-obsidian/60 px-1.5 py-0.5 font-mono text-xs text-orbital-cyan">
              GSE-pedersen-h-secp256k1-v1
            </code>{" "}
            by hash-and-increment — anyone can regenerate H from that seed
            without trusting us for it. If the compressed hex of the
            recomputed C equals the string published before the slate&apos;s
            first kickoff, the disclosure checks out.
          </p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="border border-mineral bg-eclipse/40 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-orbital-cyan">
              What an opening proves
            </h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm leading-6 text-ion-1">
              <li className="flex items-start gap-3">
                <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-orbital-cyan" />
                <span>
                  The total published before kickoff is the one being opened
                  now.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-orbital-cyan" />
                <span>
                  That total was fixed in advance and has not been edited
                  since — a binding check on the record.
                </span>
              </li>
            </ul>
          </div>
          <div className="border border-mineral bg-eclipse/40 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-ion-2">
              What an opening does not prove
            </h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm leading-6 text-ion-1">
              <li className="flex items-start gap-3">
                <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ion-3" />
                <span>Whether the picks in that total were good.</span>
              </li>
              <li className="flex items-start gap-3">
                <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ion-3" />
                <span>Whether the edge behind them was real.</span>
              </li>
              <li className="flex items-start gap-3">
                <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ion-3" />
                <span>Whether the slate made money.</span>
              </li>
            </ul>
            <p className="mt-4 text-xs leading-5 text-ion-2">
              It is a binding check on the record, not a claim about whether
              the picks won.
            </p>
          </div>
        </section>

        <section className="mt-8 border border-caution/50 bg-eclipse/40 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-caution">
              Current status
            </p>
            <span
              data-testid="opening-gate-badge"
              className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                revealEnabled
                  ? "border-orbital-cyan text-orbital-cyan"
                  : "border-mineral text-ion-2"
              }`}
            >
              {revealEnabled ? "Openings enabled" : "Openings founder-gated"}
            </span>
          </div>
          {revealEnabled ? (
            <p className="mt-3 text-sm leading-6 text-ion-1">
              Commitment openings are enabled in this environment. Query{" "}
              <Link href="/api/verify/slate/opening" className="underline hover:text-orbital-cyan">
                /api/verify/slate/opening
              </Link>{" "}
              with a slate key (
              <code className="rounded bg-obsidian/60 px-1.5 py-0.5 font-mono text-xs">
                ?slateKey=SPORT:YYYY-MM-DD
              </code>
              ) for any settled slate. When that slate&apos;s opening checks
              out, the response discloses the total, the blinding sum, and how
              to recompute the commitment yourself. If it has not fully
              settled, or has no stored opening, or the disclosure would not
              reproduce the published hex, the endpoint says so in plain
              language instead of guessing.
            </p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-ion-1">
              Commitment openings are founder-gated and not yet enabled in
              this environment. Disclosure of a cryptographic opening is a
              deliberate decision, not a deploy default. This does not affect
              what is already verifiable: the sealed aggregate commitment and
              its Merkle root are published and independently checkable right
              now at{" "}
              <Link href="/api/verify/slate" className="underline hover:text-orbital-cyan">
                /api/verify/slate
              </Link>
              .
            </p>
          )}
          <p className="mt-3 text-xs leading-5 text-ion-2">
            The same off-by-default state is enforced at the machine level,
            not just in this copy — query{" "}
            <Link href="/api/verify/slate/opening" className="underline hover:text-orbital-cyan">
              /api/verify/slate/opening
            </Link>{" "}
            yourself for the current, machine-readable answer.
          </p>
        </section>

        <section className="mt-8 border-t border-mineral pt-6">
          <p className="text-sm leading-6 text-ion-2">
            For a single pick&apos;s own tamper-evident receipt, see{" "}
            <Link href="/verify" className="underline hover:text-orbital-cyan">
              /verify
            </Link>
            . The slate commitment above is the population-level check that
            answers a different question: not &quot;was this one pick
            edited,&quot; but &quot;was the whole day&apos;s claimed total
            fixed before any game kicked off.&quot;
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
