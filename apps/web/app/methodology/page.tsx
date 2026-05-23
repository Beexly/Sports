import { ContextualVaultCta } from "@/components/contextual-vault-cta";
import {
  contextualVaultCtaEnabled,
  proofSurfaceEmailCaptureEnabled,
} from "@/lib/feature-flags";
import { ProofSurfaceEmailCapture } from "@/components/proof-surface-email-capture";
import { ProofSurfaceFreshness } from "@/components/proof-surface-freshness";

const sections = [
  {
    id: "factor-model",
    title: "01 - The factor model",
    body: "Galaxy publishes calibrated probability assessments from a deterministic factor model. The public page names factor categories and model versions while keeping exact weights private.",
  },
  {
    id: "confidence-thresholds",
    title: "02 - Confidence thresholds",
    body: "Standard publications require a 60% confidence floor. Mid-series contexts require 65%. Calls below the relevant floor become passes, not quiet opinions.",
  },
  {
    id: "publication-process",
    title: "03 - The publication process",
    body: "Candidate games move through slot, factor verification, cross-model sanity check, line-movement check, and final operator review.",
  },
  {
    id: "autopsy-framework",
    title: "04 - The autopsy framework",
    body: "Every settled losing publication receives a Loss Room entry with one root-cause tag and a permanent link back to the methodology.",
  },
  {
    id: "pass-list",
    title: "05 - The Pass List",
    body: "The Pass List archives games Galaxy considered publishing and chose not to publish. Restraint leaves a record.",
  },
  {
    id: "calibration",
    title: "06 - Calibration",
    body: "Calibration checks whether confidence numbers mean what they claim. Live bands will be pulled from Ledger data in the production implementation.",
  },
  {
    id: "model-versioning",
    title: "07 - Model versioning",
    body: "Every meaningful factor-list or factor-weight change ships as a model version with a changelog entry.",
  },
  {
    id: "limits",
    title: "08 - What this methodology cannot do",
    body: "The methodology provides probability assessments, not certainty, investment advice, or claims about future outcomes.",
  },
  {
    id: "open-questions",
    title: "09 - Open questions",
    body: "Open methodology questions stay visible so readers can audit what Galaxy does and does not know yet.",
  },
];

export default function MethodologyPage() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Methodology</p>
        <h1>How Galaxy publishes.</h1>
        <p className="lede">
          The static scaffold for the public methodology page. Production will
          hydrate calibration and model-version data from the Ledger and
          changelog.
        </p>
        <ProofSurfaceFreshness surface="methodology" />
      </section>

      <section className="section">
        {sections.map((section) => (
          <article className="copy-block" id={section.id} key={section.id}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </article>
        ))}
      </section>

      {contextualVaultCtaEnabled() ? (
        <ContextualVaultCta surface="methodology" />
      ) : null}
      {proofSurfaceEmailCaptureEnabled() ? (
        <ProofSurfaceEmailCapture variant="default" />
      ) : null}
    </main>
  );
}
