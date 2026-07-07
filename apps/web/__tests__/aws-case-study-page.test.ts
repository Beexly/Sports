import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { scanMediaClaimText } from "@/lib/media-revenue/claim-safety";
import {
  AWS_CASE_STUDY_BOUNDARIES,
  AWS_CASE_STUDY_LIVE_ACTION_LOCKS,
  AWS_CASE_STUDY_PILLARS,
  AWS_CASE_STUDY_PROOF_POINTS,
} from "@/lib/aws-case-study/public-case-study";

const repoRoot = resolve(__dirname, "..", "..", "..");
const pagePath = "apps/web/app/case-studies/aws-governed-sports-intelligence/page.tsx";
const modulePath = "apps/web/lib/aws-case-study/public-case-study.ts";

function readRepoFile(file: string): string {
  return readFileSync(resolve(repoRoot, file), "utf8");
}

const UNSUPPORTED_CASE_STUDY_CLAIMS = [
  "aws approved",
  "aws activate approved",
  "aws funded",
  "live aws",
  "production-ready",
  "production ready",
  "deployed to aws",
  "active users",
  "active sponsors",
  "espn noticed",
  "legal cleared",
  "guaranteed roi",
] as const;

describe("AWS-governed sports intelligence case-study page", () => {
  it("creates a launch-safe public route with canonical metadata and layout chrome", () => {
    const src = readRepoFile(pagePath);

    expect(src).toContain("export const metadata");
    expect(src).toContain('canonical: "/case-studies/aws-governed-sports-intelligence"');
    expect(src).toContain("<Nav />");
    expect(src).toContain("<Footer />");
    expect(src).toContain('id="main-content"');
    expect(src).toContain("AWS-governed sports intelligence, built locally before it is allowed to run.");
    expect(src).toContain("This page is a portfolio case study, not an AWS deployment claim.");
    expect(src).toContain("Live-action locks");
  });

  it("keeps every AWS case-study live-action lock closed", () => {
    expect(AWS_CASE_STUDY_LIVE_ACTION_LOCKS).toEqual({
      cloudResourcesCreated: false,
      credentialsUsed: false,
      deploymentApproved: false,
      fundingApprovalClaimed: false,
      paidResources: false,
      productionReadyClaimed: false,
    });
  });

  it("covers all six Well-Architected pillars with repo evidence", () => {
    expect(AWS_CASE_STUDY_PILLARS.map((pillar) => pillar.id)).toEqual([
      "operational_excellence",
      "security",
      "reliability",
      "performance_efficiency",
      "cost_optimization",
      "sustainability",
    ]);
    expect(AWS_CASE_STUDY_PILLARS.every((pillar) => pillar.repoEvidence.length >= 2)).toBe(true);
    expect(AWS_CASE_STUDY_PROOF_POINTS.every((proof) => proof.sourcePaths.length >= 2)).toBe(true);
  });

  it("keeps page and data module free of live AWS/provider hooks and unsupported claims", () => {
    const combined = `${readRepoFile(pagePath)}\n${readRepoFile(modulePath)}`.toLowerCase();

    expect(combined).not.toContain("process.env");
    expect(combined).not.toContain("fetch(");
    expect(combined).not.toContain("@aws-sdk");
    expect(combined).not.toContain("aws_access_key");
    expect(combined).not.toContain("secret_access_key");
    for (const claim of UNSUPPORTED_CASE_STUDY_CLAIMS) {
      expect(combined, `unsupported AWS case-study claim: ${claim}`).not.toContain(claim);
    }
  });

  it("passes media claim-safety scan for every public copy string", () => {
    const copy = [
      ...AWS_CASE_STUDY_BOUNDARIES.map((entry) => `${entry.label} ${entry.copy}`),
      ...AWS_CASE_STUDY_PILLARS.map(
        (entry) => `${entry.name} ${entry.gseControl} ${entry.publicTakeaway} ${entry.repoEvidence.join(" ")}`,
      ),
      ...AWS_CASE_STUDY_PROOF_POINTS.map((entry) => `${entry.label} ${entry.copy} ${entry.sourcePaths.join(" ")}`),
    ].join(" ");
    const result = scanMediaClaimText(copy);

    expect(result.ok).toBe(true);
    expect(result.blockedHits).toEqual([]);
    expect(result.evidenceRequiredHits).toEqual([]);
  });
});
