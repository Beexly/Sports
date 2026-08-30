import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import {
  AWS_CASE_STUDY_BOUNDARIES,
  AWS_CASE_STUDY_LIVE_ACTION_LOCKS,
  AWS_CASE_STUDY_PILLARS,
  AWS_CASE_STUDY_PROOF_POINTS,
} from "@/lib/aws-case-study/public-case-study";

export const metadata: Metadata = {
  alternates: { canonical: "/case-studies/aws-governed-sports-intelligence" },
  description:
    "A public-safe GSE case study on local AWS-style governance, Well-Architected discipline, API abuse fixtures, and no-cost sports intelligence controls.",
  title: "AWS-Governed Sports Intelligence Case Study",
};

export default function AwsGovernedSportsIntelligenceCaseStudyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="border-b border-mineral/40 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="eyebrow">Case study</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-ion-white">
              AWS-governed sports intelligence, built locally before it is allowed to run.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-ion-1">
              Galaxy Sports Edge uses AWS concepts as a governance vocabulary for sports intelligence: shadow control
              towers, Well-Architected pillar checks, abuse-response fixtures, source-rights gates, and no-cost local
              review workflows. This page is a portfolio case study, not an AWS deployment claim.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/content-lab" className="btn btn-primary">
                View content lab
              </Link>
              <Link href="/media-kit" className="btn btn-ghost">
                Media kit
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="eyebrow">Boundary</p>
              <h2 className="mt-3 font-display text-display-lg text-ion-white">Aggressive architecture, conservative claims.</h2>
              <p className="mt-4 text-sm leading-7 text-ion-1">
                The public value is the operating discipline: every cloud-shaped idea has to pass cost, rights, security,
                replay, evidence, and owner-review gates before it can move toward a live system.
              </p>
            </div>
            <div className="grid gap-4">
              {AWS_CASE_STUDY_BOUNDARIES.map((boundary) => (
                <article key={boundary.label} className="surface-card p-5">
                  <h3 className="text-base font-semibold text-ion-white">{boundary.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-ion-1">{boundary.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-mineral/40 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow">Well-Architected lens</p>
            <h2 className="mt-3 font-display text-display-lg text-ion-white">Six pillars translated into GSE controls.</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {AWS_CASE_STUDY_PILLARS.map((pillar) => (
                <article key={pillar.id} className="surface-card p-5">
                  <p className="text-sm font-semibold text-ion-white">{pillar.name}</p>
                  <p className="mt-3 text-sm leading-6 text-ion-1">{pillar.gseControl}</p>
                  <p className="mt-4 font-mono text-xs uppercase tracking-widest text-orbital-cyan">{pillar.publicTakeaway}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-mineral/40 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="eyebrow">Evidence path</p>
              <h2 className="mt-3 font-display text-display-lg text-ion-white">What the repo can show without touching AWS.</h2>
              <p className="mt-4 text-sm leading-7 text-ion-1">
                The proof points are local artifacts: docs, typed fixtures, guardrails, and tests. They make the operating
                model visible while keeping AWS credentials, paid resources, deployments, and live data movement out of
                scope.
              </p>
            </div>
            <div className="space-y-4">
              {AWS_CASE_STUDY_PROOF_POINTS.map((proof) => (
                <article key={proof.label} className="surface-card p-5">
                  <h3 className="text-base font-semibold text-ion-white">{proof.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-ion-1">{proof.copy}</p>
                  <p className="mt-3 font-mono text-xs uppercase tracking-widest text-ion-2">{proof.sourcePaths.join(" / ")}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-mineral/40 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Live-action locks</p>
            <h2 className="mt-3 font-display text-display-lg text-ion-white">What this page does not unlock.</h2>
            <div className="mt-6 surface-card p-6">
              <ul className="grid gap-3 text-sm text-ion-1 sm:grid-cols-2">
                <li>Cloud resources created: {String(AWS_CASE_STUDY_LIVE_ACTION_LOCKS.cloudResourcesCreated)}</li>
                <li>Paid resources: {String(AWS_CASE_STUDY_LIVE_ACTION_LOCKS.paidResources)}</li>
                <li>Credentials used: {String(AWS_CASE_STUDY_LIVE_ACTION_LOCKS.credentialsUsed)}</li>
                <li>Deployment approved: {String(AWS_CASE_STUDY_LIVE_ACTION_LOCKS.deploymentApproved)}</li>
                <li>Funding approval claimed: {String(AWS_CASE_STUDY_LIVE_ACTION_LOCKS.fundingApprovalClaimed)}</li>
                <li>Release readiness claimed: {String(AWS_CASE_STUDY_LIVE_ACTION_LOCKS.productionReadyClaimed)}</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
