import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/brand";
import { loadFablePublicSummary } from "@/lib/fable/public-summary";
import { FableEvidenceLab } from "./fable-content";

export const metadata: Metadata = {
  title: `FABLE Evidence Lab | ${BRAND_NAME}`,
  description:
    "The local-first evidence lab behind Galaxy Sports Edge: source-rights checks, claim ledgers, uncertainty review, drift tests, and AWS cost gates before any public claim or paid cloud action.",
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

export default function FableEvidenceLabPage() {
  return <FableEvidenceLab evidenceSummary={loadFablePublicSummary()} />;
}
