import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/brand";
import { loadFablePublicSummary } from "@/lib/fable/public-summary";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { SITE_URL } from "@/lib/seo/site-url";
import { FableEvidenceLab } from "./fable-content";
import { ProofDashboard } from "./proof-dashboard";

const FABLE_DESCRIPTION =
  "The local-first evidence lab behind Galaxy Sports Edge: source-rights checks, claim ledgers, uncertainty review, drift tests, and AWS cost gates before any public claim or paid cloud action.";

export const metadata: Metadata = {
  title: `FABLE Evidence Lab | ${BRAND_NAME}`,
  description: FABLE_DESCRIPTION,
  alternates: { canonical: "/fable" },
  openGraph: {
    title: `FABLE Evidence Lab | ${BRAND_NAME}`,
    description:
      "A public map of the local evidence, source-rights, and AWS cost gates that keep Galaxy Sports Edge claims accountable.",
    url: "/fable",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `FABLE Evidence Lab | ${BRAND_NAME}`,
    description:
      "Source-rights checks, claim ledgers, uncertainty review, drift tests, and AWS cost gates before public claims.",
  },
};

const fableJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: `FABLE Evidence Lab | ${BRAND_NAME}`,
  description: FABLE_DESCRIPTION,
  url: `${SITE_URL}/fable`,
};

export default function FableEvidenceLabPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(fableJsonLd) }}
      />
      <FableEvidenceLab
        evidenceSummary={loadFablePublicSummary()}
        proofDashboard={<ProofDashboard />}
      />
    </>
  );
}
