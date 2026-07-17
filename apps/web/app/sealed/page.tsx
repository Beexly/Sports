import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { HashMaterialize } from "@/components/engine/engine-atoms";
import { loadSealedSlateView, type SealedCommitment } from "@/lib/sealed/sealed-slate-view";

/**
 * /sealed — THE SEALED ENGINE: the commitment ritual (task #12, flagship).
 *
 * The emotional front-door to the Glass Ledger: watch the machine SEAL its slate
 * in public before kickoff, then check — after settlement — that nothing was
 * changed. This surface renders the commit → seal → reveal lifecycle and NOTHING
 * about method. It is deliberately additive and sits beside two live surfaces it
 * must not regress:
 *   - `/engine` (the ungated live-telemetry story: sweep → gate → seal → record)
 *     — `/sealed` is the gated, ceremony-focused lens on the ONE mechanism that
 *     matters most, and interlocks OUT to `/engine` for the rest.
 *   - `/api/verify/slate` + `/proof` — where anyone RE-FOLDS the published root
 *     and proves the population was pre-registered, without trusting us.
 *
 * FOUNDER-GATED (sibling of the ledger's `PUBLISH_LEDGER`): the whole ritual is
 * off until a founder sets `SEALED_ENGINE_ENABLED=true`. Off, it renders an
 * honest "being built" sealed-vault ceremony — the design of the mechanism, with
 * ZERO fabricated commitment values — exactly like `/glass-ledger`'s unpublished
 * state. On, it shows only REAL persisted commitments (each cleared by
 * `renderableCommitmentOrNull`); a corrupt row renders nothing, never a
 * fake-looking hash.
 *
 * METHOD-OPACITY (standing doctrine, CI-enforced by sealed-slate-page.test.tsx):
 * the loader selects only cryptographic commitment facts, and rendered copy
 * carries no factor/weight/threshold/formula/model vocabulary. No pick's
 * CONTENTS leak pre-kickoff — that is the entire point of sealing.
 */

export const dynamic = "force-dynamic";

const HEADLINE_OFF = "The Sealed Engine is being built — nothing is sealed in public yet.";

export async function generateMetadata(): Promise<Metadata> {
  const view = await loadSealedSlateView();
  return {
    title: "The Sealed Engine: Watch the Machine Commit",
    description: view.published
      ? "Before kickoff, the engine publishes one hash over its whole slate — the exact picks and their count, sealed and un-editable. After settlement, anyone re-folds that hash and proves nothing changed. The commitment is public; the recipe is not."
      : "The Sealed Engine is being built. Here is exactly how the pre-kickoff commitment works — and how anyone will check it — before the first hash is published.",
    alternates: { canonical: "/sealed" },
    // Gated + not-yet-published: keep it out of the index until a founder flips it,
    // mirroring /glass-ledger's unpublished robots policy.
    ...(view.published ? {} : { robots: { index: false, follow: true } }),
  };
}

// ── The sealing motif — inline SVG + scoped CSS, no external assets ──────────
//
// A wax-seal / vault ring in the canonical signal-fade gradient. The outer ring
// slowly rotates (motion as identity) but ONLY when the visitor has not asked to
// reduce motion — the @media guard lives in the scoped <style>, so this stays a
// pure server component with no client JS.

function SealMotif({ className }: { className?: string }): JSX.Element {
  return (
    <div className={className} aria-hidden="true">
      <style>{`
        @keyframes gse-seal-rotate { to { transform: rotate(360deg); } }
        @keyframes gse-seal-pulse { 0%,100% { opacity: .35; } 50% { opacity: .8; } }
        .gse-seal-ring { transform-origin: 50% 50%; }
        @media (prefers-reduced-motion: no-preference) {
          .gse-seal-ring { animation: gse-seal-rotate 24s linear infinite; }
          .gse-seal-core { animation: gse-seal-pulse 4s ease-in-out infinite; }
        }
      `}</style>
      <svg viewBox="0 0 120 120" className="h-28 w-28" role="img" aria-label="A slate sealed under one hash">
        <defs>
          <linearGradient id="gse-seal-fade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="52%" stopColor="#FF38C7" />
            <stop offset="100%" stopColor="#7B61FF" />
          </linearGradient>
        </defs>
        {/* Rotating outer seal ring — dashed, like a wax stamp's serration. */}
        <circle
          className="gse-seal-ring"
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="url(#gse-seal-fade)"
          strokeWidth="2.5"
          strokeDasharray="6 7"
          opacity="0.7"
        />
        {/* Static inner ring. */}
        <circle cx="60" cy="60" r="40" fill="none" stroke="url(#gse-seal-fade)" strokeWidth="1.5" opacity="0.5" />
        {/* Pulsing sealed core — a closed padlock body. */}
        <g className="gse-seal-core" fill="none" stroke="url(#gse-seal-fade)" strokeWidth="3">
          <rect x="46" y="58" width="28" height="24" rx="4" />
          <path d="M52 58 v-6 a8 8 0 0 1 16 0 v6" />
        </g>
      </svg>
    </div>
  );
}

// ── The three-stage lifecycle — copy only, method-opaque, shown in every state ─

interface RitualStage {
  readonly index: string;
  readonly title: string;
  readonly body: string;
}

const RITUAL_STAGES: readonly RitualStage[] = [
  {
    index: "01",
    title: "Commit — before kickoff",
    body:
      "Before the first game of the day starts, the engine writes one hash over its entire slate: every pick's frozen receipt, folded into a single Merkle root, published with the exact population count. The contents stay sealed. Only the fingerprint and the size go public.",
  },
  {
    index: "02",
    title: "Seal — nothing can move",
    body:
      "That root is immutable and pre-registers the whole set. You cannot later add a winner or drop a loser without changing the published hash. There is no update path — only the one root, stamped with the moment it was published, ahead of every result.",
  },
  {
    index: "03",
    title: "Reveal — check it yourself",
    body:
      "After the games settle, each sealed receipt opens and the whole slate re-folds back to the same published root. Anyone can run that check live, or replay it offline. If a single field had been touched, the hash would not match — and it always matches.",
  },
] as const;

function RitualStages(): JSX.Element {
  return (
    <section aria-labelledby="sealed-ritual-heading" className="mt-10">
      <h2 id="sealed-ritual-heading" className="sr-only">
        The commitment ritual
      </h2>
      <div className="grid gap-5 sm:grid-cols-3">
        {RITUAL_STAGES.map((stage) => (
          <article key={stage.index} className="surface-card p-6">
            <span aria-hidden="true" className="font-mono text-2xl tabular-nums text-orbital-cyan">
              {stage.index}
            </span>
            <h3 className="mt-3 text-lg font-bold text-white">{stage.title}</h3>
            <p className="mt-2 text-sm leading-6 text-ion-1">{stage.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

// ── How to verify — names the real, checkable paths (no trust required) ──────

function VerifyPlaque(): JSX.Element {
  return (
    <section aria-labelledby="sealed-verify-heading" className="surface-card mt-10 p-6 sm:p-8">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-orbital-cyan">How to check it</p>
      <h2 id="sealed-verify-heading" className="mt-2 text-lg font-bold text-white">
        You never have to take our word for it.
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-ion-1">
        The published root and count are the authoritative pre-registration. Two independent paths
        re-derive them from the public record — one live in your browser, one offline on your own
        machine.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-mineral bg-eclipse/50 p-4">
          <h3 className="text-sm font-semibold text-white">Live re-fold</h3>
          <p className="mt-1 text-xs leading-5 text-ion-2">
            The verifier re-folds the whole slate from its public receipt fingerprints and confirms
            it lands on the exact committed root.
          </p>
          <code className="mt-3 block overflow-x-auto whitespace-pre rounded-lg bg-titanium px-3 py-2 font-mono text-[11px] text-ion-1">
            GET /api/verify/slate?slateKey=SPORT:YYYY-MM-DD
          </code>
        </div>
        <div className="rounded-xl border border-mineral bg-eclipse/50 p-4">
          <h3 className="text-sm font-semibold text-white">Offline recompute</h3>
          <p className="mt-1 text-xs leading-5 text-ion-2">
            Export the chain and replay every hash link and every settled figure with the open,
            checked-in verifier — it trusts nothing it cannot re-derive.
          </p>
          <code className="mt-3 block overflow-x-auto whitespace-pre rounded-lg bg-titanium px-3 py-2 font-mono text-[11px] text-ion-1">
            npx tsx scripts/edge-lab/recompute.ts ledger-export.json
          </code>
        </div>
      </div>
    </section>
  );
}

// ── One real, sealed commitment ──────────────────────────────────────────────

function SealedCommitmentCard({ commitment }: { commitment: SealedCommitment }): JSX.Element {
  const committedUtc = new Date(commitment.committedAt).toUTCString();
  return (
    <article data-testid="sealed-commitment" className="surface-card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-orbital-cyan">
          Sealed slate · {commitment.slateKey}
        </p>
        <p className="text-[11px] text-ion-3">Committed {committedUtc}</p>
      </div>

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-ion-2">
        Published root
      </p>
      <HashMaterialize
        hash={commitment.root}
        className="mt-2 rounded bg-black/40 p-4 text-[13px]"
      />

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <p className="text-sm text-ion-1">
          <span data-testid="sealed-commitment-count" className="font-mono font-semibold text-ion-white tabular-nums">
            {commitment.count.toLocaleString("en-US")}
          </span>{" "}
          {commitment.count === 1 ? "pick" : "picks"} sealed before kickoff
        </p>
        <Link
          href={`/api/verify/slate?slateKey=${encodeURIComponent(commitment.slateKey)}`}
          className="text-sm font-semibold text-orbital-cyan hover:text-ion-white"
        >
          Re-fold this seal live →
        </Link>
      </div>
    </article>
  );
}

// ── Interlock — every chapter exits into another organ of the system ─────────

function Interlock(): JSX.Element {
  return (
    <section aria-labelledby="sealed-interlock-heading" className="mt-12 border-t border-mineral pt-8">
      <h2 id="sealed-interlock-heading" className="text-xs font-semibold uppercase tracking-widest text-ion-2">
        Follow the proof
      </h2>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href="/engine" className="text-sm font-semibold text-orbital-cyan hover:text-ion-white">
          The live engine telemetry →
        </Link>
        <Link href="/proof" className="text-sm font-semibold text-orbital-cyan hover:text-ion-white">
          Verify a sealed slate →
        </Link>
        <Link href="/glass-ledger" className="text-sm font-semibold text-orbital-cyan hover:text-ion-white">
          The settled record →
        </Link>
        <Link href="/verify" className="text-sm font-semibold text-orbital-cyan hover:text-ion-white">
          Check a single receipt →
        </Link>
        <Link href="/picks" className="btn btn-primary whitespace-nowrap">
          See today&apos;s board
        </Link>
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function SealedEnginePage(): Promise<JSX.Element> {
  const view = await loadSealedSlateView();

  // ── Off-state: the honest "being built" sealed-vault ceremony ──────────────
  if (!view.published) {
    return (
      <div className="flex min-h-screen flex-col bg-obsidian text-ion-white">
        <Nav />
        <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-4 py-16 sm:px-6">
          <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-orbital-cyan">
                The Sealed Engine
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {HEADLINE_OFF}
              </h1>
            </div>
            <SealMotif className="shrink-0" />
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-6 text-ion-1">
            When it goes live, this is the moment you watch: before the first kickoff, the machine
            publishes one hash over its whole slate and cannot touch it again. Not how it thinks —
            what it is willing to sign, in public, ahead of every result. Here is exactly how it
            works, before there is a single sealed hash on it.
          </p>

          <RitualStages />
          <VerifyPlaque />

          <p className="mt-10 border-t border-mineral pt-6 text-sm leading-6 text-ion-2">
            Nothing here is sealed yet, and we would rather ship this empty than ship it fabricated.
            No sample roots, no placeholder hashes, no premature commitments — just the mechanism,
            until there is a real slate sealed in public to show.
          </p>

          <Interlock />
          <RiskDisclosure variant="compact" className="mt-10 text-center" />
        </main>
        <Footer />
      </div>
    );
  }

  // ── Published states ───────────────────────────────────────────────────────
  const hasSeals = view.commitments.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-obsidian text-ion-white">
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-4 py-16 sm:px-6">
        <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-orbital-cyan">
              The Sealed Engine
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Watch the machine <span className="text-plasma">commit</span>.
            </h1>
          </div>
          <SealMotif className="shrink-0" />
        </div>

        <p className="mt-5 max-w-2xl text-sm leading-6 text-ion-1">
          Before kickoff, the engine seals its whole slate under one hash — the exact picks and
          their count, sealed and un-editable. The contents stay sealed until the games settle; the
          fingerprint is yours to check the moment it is published.
        </p>

        <RitualStages />

        {/* ── Outage: never a verdict ── */}
        {view.unreachable && (
          <section
            data-testid="sealed-unreachable-state"
            className="mt-10 rounded-2xl border border-caution/40 bg-caution/[0.06] px-6 py-10 text-center"
          >
            <p className="text-base font-semibold text-ion-white">
              The commitment feed is temporarily unreachable.
            </p>
            <p className="mt-3 text-sm leading-6 text-ion-1">
              A connection problem, not a verdict. Every published seal is immutable and unchanged;
              refresh in a moment.
            </p>
          </section>
        )}

        {/* ── Quiet: nothing sealed yet, restraint not brokenness ── */}
        {!view.unreachable && !hasSeals && (
          <section
            data-testid="sealed-quiet-state"
            className="mt-10 rounded-2xl border border-mineral bg-eclipse/50 px-6 py-10 text-center"
          >
            <p className="text-base font-semibold text-ion-white">Nothing sealed yet.</p>
            <p className="mt-3 text-sm leading-6 text-ion-1">
              The engine does not seal an empty slate. When the day&apos;s games and prices arrive
              and the picks are frozen, the published root appears here — ahead of the first kickoff,
              exactly as it is stored.
            </p>
          </section>
        )}

        {/* ── The real seals ── */}
        {!view.unreachable && hasSeals && (
          <section aria-labelledby="sealed-live-heading" className="mt-10">
            <h2 id="sealed-live-heading" className="text-xl font-bold text-white">
              Sealed in public
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ion-1">
              Each root below was published before its slate&apos;s first kickoff. The picks stay
              sealed inside it until settlement; the hash and the population are public now.
            </p>
            <div className="mt-5 grid gap-4">
              {view.commitments.map((c) => (
                <SealedCommitmentCard key={c.slateKey} commitment={c} />
              ))}
            </div>
            <p className={`mt-4 text-[11px] text-ion-3`}>
              As of {new Date(view.generatedAt).toUTCString()}
            </p>
          </section>
        )}

        <VerifyPlaque />
        <Interlock />
        <RiskDisclosure variant="compact" className="mt-10 text-center" />
      </main>
      <Footer />
    </div>
  );
}
