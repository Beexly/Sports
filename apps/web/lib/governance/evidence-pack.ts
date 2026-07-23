/**
 * EU AI Act evidence-pack assembler.
 *
 * See docs/governance/EU_AI_ACT_EVIDENCE_PACK.md for the full framing. In
 * short: this produces an INVENTORY of artifacts that could support a future
 * compliance conversation. It is explicitly NOT a declaration of conformity,
 * NOT CE marking, and NOT a claim of high-risk-system certification — the
 * `disclaimer` field below is load-bearing and must stay verbatim (or very
 * close to it) in every generated pack.
 *
 * Pure function: it does not read the filesystem, the database, or the
 * network. Callers (e.g. scripts/governance/export-evidence-pack.ts) gather
 * `EvidenceItem[]` from whatever real sources exist and pass them in.
 */

export type EvidenceItem = {
  id: string;
  control: string;
  artifactPath: string;
  nist?: string;
  iso42001?: string;
  euTheme?: string;
};

export function buildEvidencePack(items: EvidenceItem[]): {
  generatedAt: string;
  disclaimer: string;
  items: EvidenceItem[];
} {
  return {
    generatedAt: new Date().toISOString(),
    disclaimer:
      "Evidence inventory only. Not a declaration of EU AI Act conformity, CE marking, or high-risk certification.",
    items,
  };
}
