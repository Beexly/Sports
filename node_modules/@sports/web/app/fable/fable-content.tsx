import type { ReactNode } from "react";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import type { FablePublicSummary } from "@/lib/fable/public-summary";
import { COMMANDS, NON_CLAIMS, PROOF_LAYERS } from "./fable-data";
import { EvidenceMetric, formatLedgerDate, LayerCard, OwnerGatedClaimCard } from "./fable-cards";

export function FableEvidenceLab({
  evidenceSummary,
  proofDashboard,
}: {
  readonly evidenceSummary: FablePublicSummary;
  readonly proofDashboard?: ReactNode;
}) {
  const statusCounts = evidenceSummary.claimStatusCounts.filter((row) => row.count > 0);
  const riskCounts = evidenceSummary.sourceRiskCounts.filter((row) => row.count > 0);
  const awsDefaultsBlocked =
    !evidenceSummary.awsDeployDefaultAllowed &&
    !evidenceSummary.awsPaidDefaultAllowed &&
    !evidenceSummary.awsDecisionDefaultAllowed;

  return (
    <div className="relative isolate min-h-screen bg-carbon text-ion">
      <GeneratedPlate assetId="proof-crystal" className="-z-10 opacity-20" />
      <Nav />

      <main id="main-content" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="border-b border-mineral pb-10">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-orbital-cyan">
            FABLE Evidence Lab
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-ion-white sm:text-5xl">
            The research layer that keeps the product honest.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
            FABLE is the local proof system behind Galaxy Sports Edge. It connects source rights,
            claim review, model uncertainty, drift checks, and AWS cost gates before a claim reaches
            a public surface or a cloud action reaches an account.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/proof" className="btn btn-primary">
              Open Proof of Record
            </Link>
            <Link
              href="/waitlist"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-orbital-cyan/60 px-5 py-2.5 text-sm font-semibold text-orbital-cyan hover:border-orbital-cyan hover:text-ion-white"
            >
              Join the founding waitlist
            </Link>
          </div>
        </header>

        {proofDashboard}

        <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {PROOF_LAYERS.map((layer, index) => (
            <LayerCard key={layer.label} index={index + 1} {...layer} />
          ))}
        </section>

        <section className="mt-10 border-y border-mineral py-8">
          <EvidenceSnapshot evidenceSummary={evidenceSummary} awsDefaultsBlocked={awsDefaultsBlocked} />
          <EvidenceBreakdown evidenceSummary={evidenceSummary} riskCounts={riskCounts} statusCounts={statusCounts} />
          <OwnerGateList evidenceSummary={evidenceSummary} />
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <CommandPanel />
          <NonClaimPanel />
        </section>

        <section className="mt-10 rounded-2xl border border-orbital-cyan/25 bg-orbital-cyan/[0.04] p-6">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-orbital-cyan">
                Why it matters
              </p>
              <h2 className="mt-3 text-2xl font-bold text-ion-white">The edge is operational discipline.</h2>
            </div>
            <p className="text-sm leading-6 text-ion-1">
              Sports intelligence products usually fail when the public story runs ahead of the evidence. This page
              makes the opposite path visible: source permissions first, claims second, local checks third, and
              owner-gated cloud work only after a written reason exists.
            </p>
          </div>
        </section>

        <div className="mt-8">
          <RiskDisclosure variant="compact" className="text-center" />
        </div>
      </main>

      <Footer />
    </div>
  );
}

function EvidenceSnapshot({
  evidenceSummary,
  awsDefaultsBlocked,
}: {
  readonly evidenceSummary: FablePublicSummary;
  readonly awsDefaultsBlocked: boolean;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-orbital-cyan">
          Checked-in ledger snapshot
        </p>
        <h2 className="mt-3 text-2xl font-bold text-ion-white">The page now reads the local evidence record.</h2>
        <p className="mt-4 text-sm leading-6 text-ion-1">
          This summary is generated from the repository's FABLE claim ledger, source-rights registry, AWS
          default-deny gates, and fixture-only forensic demo. It is a local artifact snapshot, not an AWS account
          status report.
        </p>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-ion-3">
          Ledger generated {formatLedgerDate(evidenceSummary.generatedAt)}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <EvidenceMetric
          label="Claims tracked"
          value={String(evidenceSummary.claimCount)}
          detail={`${evidenceSummary.highRiskClaimCount} high-risk claims are explicitly classified.`}
        />
        <EvidenceMetric
          label="Guarded claims"
          value={String(evidenceSummary.guardedClaimCount)}
          detail="Unsupported, false, and blocked claims stay out of public copy."
        />
        <EvidenceMetric
          label="Owner gates"
          value={String(evidenceSummary.ownerDecisionClaimCount)}
          detail="Claims requiring owner or legal review before any stronger wording."
        />
        <EvidenceMetric
          label="Source registry"
          value={String(evidenceSummary.sourceCount)}
          detail={`${evidenceSummary.sourceOwnerDecisionCount} sources still require an owner decision.`}
        />
        <EvidenceMetric
          label="AWS storage"
          value={`${evidenceSummary.sourceAwsStorageAllowedCount}/${evidenceSummary.sourceCount}`}
          detail="Sources whose current registry status allows AWS storage."
        />
        <EvidenceMetric
          label="Default gates"
          value={awsDefaultsBlocked ? "Blocked" : "Review"}
          detail={
            awsDefaultsBlocked
              ? "Deploys, paid resources, and paid-model decisions default off."
              : "One or more AWS default gates needs review."
          }
        />
      </div>
    </div>
  );
}

function EvidenceBreakdown({
  evidenceSummary,
  riskCounts,
  statusCounts,
}: {
  readonly evidenceSummary: FablePublicSummary;
  readonly riskCounts: FablePublicSummary["sourceRiskCounts"];
  readonly statusCounts: FablePublicSummary["claimStatusCounts"];
}) {
  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-3">
      <CountPanel title="Claim statuses" rows={statusCounts} />
      <CountPanel title="Source risk" rows={riskCounts} />
      <div className="rounded-lg border border-mineral bg-eclipse/40 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ion-2">Fixture demo</h3>
        <p className="mt-4 text-sm leading-6 text-ion-1">
          Fixture {evidenceSummary.forensicDemo.fixture_id} reports a local probability delta of{" "}
          <span className="font-mono text-orbital-cyan">
            {evidenceSummary.forensicDemo.probability_delta.toFixed(2)}
          </span>
          . The uncertainty flag is {evidenceSummary.forensicDemo.uncertainty_flag ? "on" : "off"}.
        </p>
        <p className="mt-4 text-xs leading-5 text-ion-3">
          Evidence validation:{" "}
          {evidenceSummary.evidenceValidationOk
            ? "all checked local validators pass"
            : `${evidenceSummary.validationIssueCount} local issue(s) found`}
          .
        </p>
      </div>
    </div>
  );
}

function CountPanel({
  title,
  rows,
}: {
  readonly title: string;
  readonly rows: readonly { readonly key: string; readonly label: string; readonly count: number }[];
}) {
  return (
    <div className="rounded-lg border border-mineral bg-eclipse/40 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ion-2">{title}</h3>
      <dl className="mt-4 grid gap-3">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4">
            <dt className="text-sm text-ion-1">{row.label}</dt>
            <dd className="font-mono text-sm font-semibold text-orbital-cyan">{row.count}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function OwnerGateList({ evidenceSummary }: { readonly evidenceSummary: FablePublicSummary }) {
  return (
    <div className="mt-6 rounded-lg border border-caution/25 bg-caution/5 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-caution">Current owner-gated items</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {evidenceSummary.topOwnerGatedClaims.map((claim) => (
          <OwnerGatedClaimCard key={claim.claim_id} claim={claim} />
        ))}
      </div>
    </div>
  );
}

function CommandPanel() {
  return (
    <div className="rounded-2xl border border-mineral bg-eclipse/45 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-ion-2">Local evidence commands</h2>
      <p className="mt-3 text-sm leading-6 text-ion-1">
        These checks run without paid cloud services. They are designed to fail loudly when a claim, source, AWS
        gate, or demo artifact drifts away from the evidence record.
      </p>
      <ul className="mt-5 grid gap-2">
        {COMMANDS.map((command) => (
          <li key={command} className="rounded-xl border border-titanium/60 bg-carbon/70 px-4 py-3">
            <code className="font-mono text-xs text-orbital-cyan">{command}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NonClaimPanel() {
  return (
    <div className="rounded-2xl border border-caution/30 bg-caution/5 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-caution">
        What this page does not claim
      </h2>
      <ul className="mt-5 space-y-3 text-sm leading-6 text-ion-1">
        {NON_CLAIMS.map((line) => (
          <li key={line} className="flex gap-3">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-caution" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
