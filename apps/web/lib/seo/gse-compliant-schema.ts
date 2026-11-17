/**
 * Enriched Global OnlineStore + Multi-Sport SoftwareApplication + Dataset
 * structured data nodes for Galaxy Sports Edge.
 *
 * Resolves Google Search Console [WNC-10030322] ("Missing field 'license'" on
 * Dataset) and positions Galaxy Sports Edge nationally and internationally
 * across English-speaking and global sports analytics markets.
 */
import { PUBLIC_RECORD_LINE } from "@/lib/ledger/public-record";

export const GSE_DATASET_LICENSE_URL = "https://www.galaxysportsedge.com/terms";

export const GLOBAL_SERVED_REGIONS = [
  "US",
  "CA",
  "GB",
  "AU",
  "IE",
  "NZ",
  "DE",
  "NL",
  "SE",
  "NO",
  "DK",
  "BR",
  "MX",
] as const;

export function buildGseCompliantOrganizationAndDatasetNodes(params?: {
  dateModified?: string;
}) {
  const dateModified = params?.dateModified ?? "2026-11-16";

  const organizationNode = {
    "@context": "https://schema.org",
    "@type": ["OnlineStore", "OnlineBusiness", "Organization"],
    "@id": "https://www.galaxysportsedge.com/#organization",
    name: "Galaxy Sports Edge",
    legalName: "Galaxy Sports Network LLC",
    url: "https://www.galaxysportsedge.com",
    email: "hq@galaxysportsedge.com",
    areaServed: "Worldwide",
    knowsAbout: [
      "NFL Quantitative Analytics",
      "NBA Statistical Projections",
      "MLB Run and Pitcher Modeling",
      "NHL Expected Goals Analytics",
      "NCAA Football and Basketball Modeling",
      "Global Soccer and MLS Analytics",
      "Daily Fantasy Sports Optimization",
      "Closing Line Value and Conformal Calibration",
    ],
    logo: {
      "@type": "ImageObject",
      url: "https://www.galaxysportsedge.com/icon-512.png",
      width: 512,
      height: 512,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "hq@galaxysportsedge.com",
        areaServed: GLOBAL_SERVED_REGIONS,
        url: "https://www.galaxysportsedge.com/accountability",
        availableLanguage: ["en"],
      },
    ],
    sameAs: ["https://x.com/GalaxySportsHQ", "https://github.com/Beexly/Sports"],
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: GLOBAL_SERVED_REGIONS,
      returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
      merchantReturnLink: "https://www.galaxysportsedge.com/terms",
    },
  };

  const datasetNode = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": "https://www.galaxysportsedge.com/record#settlement-ledger",
    name: "Galaxy Sports Edge Global Public Settlement and Calibration Ledger",
    description:
      `Publicly auditable sports pick settlement ledger, Honest Band calibration tracking, operator loss post-mortems, and cryptographic hash verification maintained by Galaxy Sports Network LLC. Current settled ledger status: ${PUBLIC_RECORD_LINE}. Sports wagering carries real risk; call 1-800-GAMBLER.`,
    url: "https://www.galaxysportsedge.com/record",
    license: GSE_DATASET_LICENSE_URL,
    isAccessibleForFree: true,
    dateModified,
    keywords: [
      "sports analytics",
      "NFL projections",
      "NBA projections",
      "MLB projections",
      "closing line value",
      "tamper-evident settlement ledger",
      "Daily Fantasy Sports projections",
    ],
    creator: {
      "@type": "Organization",
      "@id": "https://www.galaxysportsedge.com/#organization",
      name: "Galaxy Sports Network LLC",
      url: "https://www.galaxysportsedge.com",
    },
    publisher: {
      "@type": "Organization",
      "@id": "https://www.galaxysportsedge.com/#organization",
      name: "Galaxy Sports Edge",
      url: "https://www.galaxysportsedge.com",
    },
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "text/html",
        contentUrl: "https://www.galaxysportsedge.com/record",
        description: "Interactive public settlement ledger and hash proof room",
      },
      {
        "@type": "DataDownload",
        encodingFormat: "text/markdown",
        contentUrl: "https://www.galaxysportsedge.com/llms-full.txt",
        description: "Machine-readable methodology and public ledger manifest",
      },
    ],
  };

  return { organizationNode, datasetNode };
}
