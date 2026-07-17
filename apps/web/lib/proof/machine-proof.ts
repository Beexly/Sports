/**
 * Machine-auditable Proof surface — the single source of truth for
 * `/llms.txt` and the read-only JSON Proof API (`/api/proof/ledger`).
 *
 * The thesis: any AI agent (or skeptical human with `curl`) should be able
 * to read ONE manifest, discover exactly how to INDEPENDENTLY verify our
 * record, and get a machine-readable snapshot of what — if anything — is
 * substantiated enough to publish today. No sports-signal service exposes
 * its record this way; that is the point.
 *
 * Honesty is not re-implemented here. This module composes on top of
 * `loadLedgerView()` (lib/ledger/ledger-view.ts), which is the ONE
 * founder-gated (`PUBLISH_LEDGER`) seam and which can only ever carry
 * `SubstantiatedMetric`s that already cleared the four-leg display guard
 * (coverage + Wilson/CP lower bound + CLV + walk-forward provenance). So
 * this surface inherits, rather than restates, the "would rather show
 * nothing than an unsubstantiated number" contract:
 *   - When nothing is published, it says so, in machine-readable form.
 *   - It NEVER emits a performance number that did not pass the guard.
 *
 * Pure module: no HTTP, no React. `buildMachineProof` takes an injectable
 * clock + base URL so the routes stay thin and the whole thing is
 * unit-testable without a server. The route handlers (app/llms.txt/route.ts,
 * app/api/proof/ledger/route.ts) are the only callers.
 */

import { loadLedgerView, type LedgerView } from "@/lib/ledger/ledger-view";
import { SITE_URL } from "@/lib/seo/site-url";

/** A named, resolvable surface an agent can follow to verify a claim. */
export interface ProofLink {
  readonly rel: string;
  readonly url: string;
  readonly description: string;
}

/** The structured proof document both output formats render from. */
export interface MachineProofDoc {
  readonly service: string;
  readonly summary: string;
  /** The record doctrine, stated plainly for a machine reader. */
  readonly doctrine: readonly string[];
  /** The current, founder-gated public ledger state (reused verbatim). */
  readonly ledger: LedgerView;
  /** How to verify — human page + programmatic endpoints + the method. */
  readonly verify: {
    readonly method: readonly string[];
    readonly links: readonly ProofLink[];
  };
  /** Where the method and data-rights are documented. */
  readonly references: readonly ProofLink[];
  /** Hard refusals — the things this service will never emit. */
  readonly neverDoes: readonly string[];
  /** ISO-8601 stamp of when this snapshot was generated. */
  readonly generatedAt: string;
}

export interface BuildMachineProofOptions {
  /** Injected clock for deterministic tests. Defaults to now at call time. */
  readonly now?: Date;
  /** Injected base URL. Defaults to the canonical SITE_URL. */
  readonly siteUrl?: string;
}

const DOCTRINE: readonly string[] = [
  "Every pick is committed to a tamper-evident, hash-chained receipt BEFORE kickoff — the claim is frozen before the outcome is known.",
  "The judge is closing-line value (CLV) measured against the market's closing number, plus the settled result — not our own after-the-fact narration.",
  "A performance number renders only if it carries all four legs: a coverage denominator, a Wilson or Clopper-Pearson lower bound, CLV backing, and walk-forward provenance. Missing any leg, it is withheld, not shown.",
  "Publication is founder-gated and defaults OFF. Until it is on and a metric is substantiated, this surface publishes no record — and says so.",
];

const NEVER_DOES: readonly string[] = [
  "Emit a performance number that has not passed the four-leg substantiation guard.",
  "Backfill or fabricate a track record, sample size, or win rate.",
  "Open a pick's committed fields (selection, price, confidence, edge) before kickoff — pre-kickoff receipts verify as SEALED, so verification can never be used to free-ride a paid pick.",
  "Present the market as beaten, or a result as certain. Signals are one input to a disciplined decision, never the decision.",
];

/**
 * Compose the current machine-auditable proof snapshot. Reads the founder
 * gate through `loadLedgerView()`, so its published/unpublished shape is
 * always exactly what the human Glass Ledger page would show.
 */
export function buildMachineProof(opts: BuildMachineProofOptions = {}): MachineProofDoc {
  const base = (opts.siteUrl ?? SITE_URL).replace(/\/+$/, "");
  const now = opts.now ?? new Date();
  const ledger = loadLedgerView();

  const verifyLinks: readonly ProofLink[] = [
    {
      rel: "receipt-verify",
      url: `${base}/api/verify?hash=<64-hex-sha256>`,
      description:
        "Programmatic receipt check. Paste a pick's receipt hash; the stored payload is re-hashed live and compared to the frozen commitment. Pre-kickoff receipts return SEALED (existence + integrity + freeze time + model version only); post-kickoff/settled receipts open in full.",
    },
    {
      rel: "human-verify",
      url: `${base}/verify`,
      description: "Human-facing verification page for the same receipt check.",
    },
    {
      rel: "record",
      url: `${base}/proof`,
      description: "Proof-of-record surface: the published, substantiated track record (or an honest empty state until one exists).",
    },
    {
      rel: "receipts",
      url: `${base}/api/proof/receipts`,
      description: "Enumerable JSON list of every SETTLED pick receipt (paginated). Each row carries the leaf preimage so you can recompute its hash and verify it independently; pre-kickoff/unsettled receipts are never listed.",
    },
    {
      rel: "self",
      url: `${base}/api/proof/ledger`,
      description: "This document as JSON — the machine-readable ledger snapshot and verification map.",
    },
    {
      rel: "openapi",
      url: `${base}/api/proof/openapi.json`,
      description: "OpenAPI 3.1 contract for the read-only Proof API — import it to call these endpoints from any OpenAPI-aware tooling.",
    },
    {
      rel: "ots-anchor",
      url: `${base}/api/proof/ots/<slateKey>`,
      description:
        "OpenTimestamps proof for a published slate Merkle root — raw .ots bytes (or ?format=json for status). Once upgraded, the commitment time is attested by a Bitcoin block header: verify with any OpenTimestamps client, zero trust in our clock or database.",
    },
    {
      rel: "verification-spec",
      url: `${base}/api/proof/verification-spec.json`,
      description: "The trustless conformance spec: the exact hash-chain algorithm plus synthetic known-answer test vectors, so you can build your own verifier in any language and check us with zero trust in our code.",
    },
  ];

  const verifyMethod: readonly string[] = [
    "Receipts are minted pre-kickoff and never rewritten; each is a SHA-256 content hash over a canonical payload.",
    "Receipts extend a hash chain, so any back-dated edit or dropped entry breaks the chain and is detectable.",
    "Independent recomputation is the design goal: the record is reproducible from the committed receipts and public closing lines, not taken on trust.",
  ];

  const references: readonly ProofLink[] = [
    { rel: "methodology", url: `${base}/methodology`, description: "How the engine scores signals and what the confidence numbers mean." },
    { rel: "calibration", url: `${base}/calibration`, description: "Reliability / calibration track record once substantiated entries exist." },
    { rel: "how-we-make-money", url: `${base}/how-we-make-money`, description: "Revenue model and disclosed-conflict affiliate posture." },
    { rel: "data-rights", url: `${base}/data`, description: "Data sourcing and rights posture: facts only, attributed, rights-gated extraction." },
    { rel: "responsible-play", url: `${base}/responsible-play`, description: "Limits and variance guidance. Signals are not certainty." },
  ];

  return {
    service: "Galaxy Sports Edge — Proof API",
    summary:
      "A verifiable, publish-before-kickoff record of calibrated sports-market signals. This document tells an AI agent how to independently verify that record and gives a machine-readable snapshot of what is substantiated enough to publish today.",
    doctrine: DOCTRINE,
    ledger,
    verify: { method: verifyMethod, links: verifyLinks },
    references,
    neverDoes: NEVER_DOES,
    generatedAt: now.toISOString(),
  };
}

/**
 * Render a `MachineProofDoc` as an `llms.txt` document (llmstxt.org format:
 * an H1 title, a blockquote summary, then link-rich sections). Deterministic
 * given a fixed `generatedAt` — no I/O, no clock of its own.
 */
export function renderLlmsTxt(doc: MachineProofDoc): string {
  const lines: string[] = [];

  lines.push(`# ${doc.service}`);
  lines.push("");
  lines.push(`> ${doc.summary}`);
  lines.push("");

  lines.push("## Record doctrine");
  lines.push("");
  for (const d of doc.doctrine) lines.push(`- ${d}`);
  lines.push("");

  lines.push("## Current published state");
  lines.push("");
  if (doc.ledger.published) {
    lines.push(
      `- Publication is ON. Substantiated seasons: ${doc.ledger.seasons.length}. ${doc.ledger.note}`,
    );
  } else {
    lines.push(`- Publication is OFF (founder-gated). ${doc.ledger.reason}`);
  }
  lines.push("");

  lines.push("## Verify our record yourself");
  lines.push("");
  for (const m of doc.verify.method) lines.push(`- ${m}`);
  lines.push("");
  for (const link of doc.verify.links) {
    lines.push(`- [${link.rel}](${link.url}): ${link.description}`);
  }
  lines.push("");

  lines.push("## Methodology & data rights");
  lines.push("");
  for (const ref of doc.references) {
    lines.push(`- [${ref.rel}](${ref.url}): ${ref.description}`);
  }
  lines.push("");

  lines.push("## What this service will never do");
  lines.push("");
  for (const n of doc.neverDoes) lines.push(`- ${n}`);
  lines.push("");

  lines.push(`Generated: ${doc.generatedAt}`);
  lines.push("");

  return lines.join("\n");
}
