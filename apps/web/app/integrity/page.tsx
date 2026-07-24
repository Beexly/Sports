/**
 * /integrity — public "Galaxy Governed Decision Path" front door.
 *
 * This page is about a DIFFERENT thing than /accountability or /proof: those
 * cover the betting-picks record (settlement, calibration, CLV). This page
 * covers the AI/agent control plane — the internal admission bookkeeping
 * that governs tool calls the platform's own agents make (invocation
 * claims, credit holds, dispatch) — nothing about odds, grading, or picks.
 *
 * It fabricates no numbers and runs no live query: the honest per-window
 * counts already live in docs/formal/SRQC_STATUS.md (§3, §8, §11), which
 * this page links to rather than re-deriving. Every external link here
 * points to a real, public, buildable artifact (a receipt route, the public
 * keyring, or a GitHub blob on this public repo) — none are placeholders.
 *
 * Admin-only detail (the Built/Wired/Proven/Public-Safe ledger for every
 * internal system) stays at /cockpit/integrity, which is noindexed and not
 * linked from here. This page only ever shows safe aggregates and doc links.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

const REPO_BLOB = "https://github.com/Beexly/Sports/blob/main";

export const metadata: Metadata = {
  title: `Integrity · Governed Decision Path · ${BRAND_NAME}`,
  description:
    "How the AI/agent control plane governs its own tool calls: what we govern, what SHADOW mode actually does, signed receipts you can verify yourself, and what we do not claim.",
  alternates: { canonical: "/integrity" },
  openGraph: {
    title: `Integrity · Governed Decision Path · ${BRAND_NAME}`,
    description:
      "What our AI/agent control plane governs, how to verify a signed receipt yourself, and the explicit list of what we do not claim.",
    url: "/integrity",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `Integrity · Governed Decision Path · ${BRAND_NAME}`,
    description:
      "What our AI/agent control plane governs, and what we do not claim.",
  },
};

function IntegrityCard({
  eyebrow,
  title,
  body,
  href,
  linkLabel,
  external,
}: {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
  external?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-mineral bg-eclipse/50 p-6">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ion-2">
        {eyebrow}
      </p>
      <h2 className="text-xl font-bold text-ion-white">{title}</h2>
      <p className="text-sm leading-6 text-ion-1">{body}</p>
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="mt-auto self-start rounded-lg border border-orbital-cyan/40 px-4 py-2 text-sm font-semibold text-orbital-cyan hover:bg-orbital-cyan/10"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

export default function IntegrityPage() {
  return (
    <div className="relative isolate min-h-screen bg-carbon text-ion">
      <Nav />

      <main
        id="main-content"
        className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8"
      >
        {/* Header */}
        <header className="border-b border-mineral pb-10">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-orbital-cyan">
            Integrity — Governed Decision Path
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-ion-white sm:text-5xl">
            How we govern our own AI agents.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
            Our platform&apos;s own agents make tool calls — starting invocations,
            holding credit, dispatching work. Those calls are watched by an
            internal control plane that projects a live event ledger through
            the same abstract model our formal specs are checked against, and
            flags the runtime state that model says should be unreachable.
            This page is about that system, not about betting picks, odds,
            or grading — see{" "}
            <Link href="/accountability" className="underline hover:text-orbital-cyan">
              /accountability
            </Link>{" "}
            for that.
          </p>
          <p className="mt-3 text-sm text-ion-2">
            Every claim below links to something you can independently check —
            a live receipt route, a published public key, or a document in
            this public repository. Nothing here is asserted without a way to
            verify it yourself.
          </p>
        </header>

        {/* What we govern */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-ion-2">
            What we govern
          </h2>
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
            <IntegrityCard
              eyebrow="Detection"
              title="A live projection, watched"
              body="Every internal tool call folds the recent event ledger into an abstract state (claim phase, exposure phase, pending-attempt count) — the same shape our TLA+ specs reason over. Two forbidden states are watched for: two-or-more concurrently pending attempts on one invocation, and a rejected fingerprint with nothing binding it."
              href={`${REPO_BLOB}/docs/formal/SRQC_STATUS.md#1-architecture-pipeline`}
              linkLabel="See the architecture pipeline"
              external
            />
            <IntegrityCard
              eyebrow="Posture"
              title="SHADOW is the only default"
              body="Detecting a forbidden state does not block anything by default. SHADOW mode always admits and only ever writes an evidence row. An enforcement mode exists, but it is reachable only from an explicitly lab-gated code path — never from a production route, cron, or worker."
              href={`${REPO_BLOB}/docs/formal/SRQC_STATUS.md#4-tlc-only-vs-runtime-detection-vs-enforcement`}
              linkLabel="See the enforcement posture"
              external
            />
            <IntegrityCard
              eyebrow="Evidence"
              title="Signed, publicly verifiable receipts"
              body="When a gated tool call is refused (lab-only today), it produces a signed receipt: what was asked, why it was refused, and an ed25519 signature over a canonical payload. Anyone can fetch our published public key and verify a receipt themselves — no shared secret required."
              href="/.well-known/receipt-keys.json"
              linkLabel="View the public keyring"
            />
          </div>
        </section>

        {/* Shadow evidence + active certificate */}
        <section className="rounded-2xl border border-mineral bg-eclipse/30 p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-ion-2">
            Shadow evidence &amp; active certificate
          </h2>
          <p className="text-sm leading-6 text-ion-1">
            We do not publish a live shadow-would-refuse counter on this page —
            a number here with no way for an outside reader to recompute it
            would just be a claim, not evidence. Instead, the honest,
            independently-reproducible numbers live in one place:
          </p>
          <ul className="mt-4 flex flex-col gap-2 text-sm leading-6 text-ion-1">
            <li className="flex items-start gap-3">
              <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-orbital-cyan" />
              <span>
                Real TLC model-checking receipts, real state/depth counts —{" "}
                <Link href={`${REPO_BLOB}/docs/formal/SRQC_STATUS.md#3-what-is-proved-real-receipts-real-numbers`} className="underline hover:text-orbital-cyan" target="_blank" rel="noopener noreferrer">
                  §3, &quot;What is PROVED&quot;
                </Link>
                .
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-orbital-cyan" />
              <span>
                Whether any certificate version is currently active (today:
                no — activation is a human-only CLI action, never automated)
                —{" "}
                <Link href={`${REPO_BLOB}/docs/formal/SRQC_STATUS.md#10-active-certificate`} className="underline hover:text-orbital-cyan" target="_blank" rel="noopener noreferrer">
                  §10, &quot;Active certificate&quot;
                </Link>
                .
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-orbital-cyan" />
              <span>
                Seven concrete steps to verify all of this yourself, not just
                trust it —{" "}
                <Link href={`${REPO_BLOB}/docs/formal/SRQC_STATUS.md#11-attack-checklist-for-outsiders`} className="underline hover:text-orbital-cyan" target="_blank" rel="noopener noreferrer">
                  §11, &quot;Attack checklist for outsiders&quot;
                </Link>
                .
              </span>
            </li>
          </ul>
        </section>

        {/* Demo */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-ion-2">
            See it run
          </h2>
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
            <IntegrityCard
              eyebrow="90-second walkthrough"
              title="Force a REFUSE, verify the signature"
              body="A scripted, end-to-end walkthrough: trigger a real violation, get a signed REFUSE receipt, open it over HTTP, fetch the public keyring, and verify the signature — all runnable from a clean checkout."
              href={`${REPO_BLOB}/docs/devrel/DEMO_SCRIPT.md`}
              linkLabel="Read the demo script"
              external
            />
            <IntegrityCard
              eyebrow="Full record"
              title="The single honest status document"
              body="Architecture, what is actually proved (with real receipt numbers), enforcement posture, a full SHA-traceable receipts index, and every explicit non-claim — kept current against main, not a point-in-time snapshot."
              href={`${REPO_BLOB}/docs/formal/SRQC_STATUS.md`}
              linkLabel="Read SRQC_STATUS.md"
              external
            />
          </div>
        </section>

        {/* NON-CLAIMS */}
        <section className="border-t border-mineral pt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-ion-2">
            What we do not claim
          </h2>
          <ul className="flex flex-col gap-2 text-sm leading-6 text-ion-1">
            {[
              "Not a parameterized (∀N) proof. Every model-checking result behind this page is a fixed-constant, finite-cutoff check, not a machine-checked universal statement.",
              "Not a production enforce-by-default posture. SHADOW is the only default anywhere this admission check runs. Enforcement is reachable only from an explicitly lab-gated path, confirmed by direct code search, not assertion.",
              "Not a claim about bet-settlement correctness or any user-facing betting logic. This entire surface is about internal AI/agent tool-call admission bookkeeping — nothing about odds, grading, or picks.",
              "Not a SOC 2, ISO 27001, or EU AI Act certification. Related internal alignment work exists and is documented separately, but nothing on this page is a certification claim.",
              "Not autonomous. Certificate-version activation is a human-only, manually-run action — never triggered by CI, a cron job, or any automated caller.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-orbital-cyan"
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
}
