import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

const LAST_UPDATED = "2026-05-28";

export const metadata: Metadata = {
  title: "Evidence Vault Explained — How Intelligence Facts Are Stored | Galaxy Sports Edge",
  description:
    "What the Galaxy Sports Edge Evidence Vault is: a structured store of every observed intelligence fact with source tier, TTL, provenance, and public-safety flag. How it prevents fabrication and enables auditability.",
  alternates: { canonical: "/brain/evidence-vault-explained" },
  openGraph: {
    title: `Evidence Vault Explained — ${BRAND_NAME}`,
    description:
      "Every intelligence fact stored with source tier, freshness TTL, and provenance. The vault is how the Brain cites rather than fabricates.",
  },
};

const ARTICLE_LD = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Evidence Vault Explained — How Intelligence Facts Are Stored",
  description:
    "Architecture of the Galaxy Sports Edge Evidence Vault: source-tier tagging, TTL enforcement, public-safety flags, and the append-only audit log that makes every claim traceable.",
  dateModified: LAST_UPDATED,
  author: { "@type": "Organization", name: BRAND_NAME },
  publisher: { "@type": "Organization", name: BRAND_NAME },
} as const;

const ANSWER_BLOCK = {
  question: "What is the Evidence Vault and how does it prevent fabrication?",
  answer:
    "The Evidence Vault is the central store for every observed intelligence fact on the platform. Each item has a source tier (1–6), a time-to-live (TTL), a public-safety flag, an entity link (player, team, game, or market), and a claim type. The vault prevents fabrication because the Research Brain is only permitted to surface facts that exist in the vault — it cannot generate a claim that has no corresponding evidence item. When no evidence exists for a question, the Brain surfaces an insufficient-evidence response. The vault is append-only: items can be expired but not deleted or altered, so every past claim is auditable.",
  attribution: "Galaxy Sports Edge Evidence Vault methodology",
  confidence: "HIGH — published methodology, matches ADR 003 architecture proposal",
};

const ITEM_FIELDS = [
  {
    field: "sourceId",
    type: "string",
    description: "Identifier of the source that observed this fact. Maps to the source registry for attribution.",
  },
  {
    field: "sourceTier",
    type: "1 | 2 | 3 | 4 | 5 | 6",
    description: "The source tier at observation time. Determines what claims the item can support and whether it can graduate Rumor Radar signals.",
  },
  {
    field: "entityType / entityId",
    type: "string",
    description: "The canonical entity this fact is about (player, team, game, market, coordinator, venue). Linked to the Entity Graph.",
  },
  {
    field: "claimType",
    type: "string",
    description: "The type of claim: injury_status, line_movement, usage_share, scheme_change, roster_move, weather_update, etc. Enables structured lookup.",
  },
  {
    field: "observedAt",
    type: "DateTime",
    description: "When the fact was observed by the ingestion pipeline. Not when it was published — when the data was received.",
  },
  {
    field: "content",
    type: "Json",
    description: "The structured fact payload. Shape varies by claimType — an injury_status item has different fields than a line_movement item.",
  },
  {
    field: "ttlSeconds",
    type: "number",
    description: "Time-to-live in seconds from observedAt. After this window, the item is expired and cannot be used in Brain responses or pick scoring.",
  },
  {
    field: "confidence",
    type: "number (0–100)",
    description: "The ingestion pipeline's confidence in the accuracy of this item at observation time. Distinct from the pick confidence score.",
  },
  {
    field: "publicSafe",
    type: "boolean",
    description: "Whether this item can be surfaced in public-facing responses. Items containing proprietary model internals or operator-sensitive data have publicSafe=false.",
  },
  {
    field: "auditLog",
    type: "Json[]",
    description: "Append-only log of every state change this item has undergone: created, expired, contradicted, graduated. The full history is retained.",
  },
] as const;

const VAULT_PROPERTIES = [
  {
    property: "Append-only",
    description: "Evidence items can only be created or expired — never updated or deleted. Every version of every fact is permanently recorded.",
    color: "border-emerald-700 bg-emerald-950/20",
  },
  {
    property: "TTL-enforced",
    description: "Every item has a maximum age. Stale evidence cannot contribute to any claim, pick score, or Brain response. The TTL is set per source tier and claim type.",
    color: "border-cyan-700 bg-cyan-950/20",
  },
  {
    property: "Source-tier tagged",
    description: "Every item is tagged with the source tier at observation time. The tier is immutable — it reflects the source at the moment of ingestion.",
    color: "border-yellow-700 bg-yellow-950/20",
  },
  {
    property: "Public-safety gated",
    description: "Items with publicSafe=false are stored in the vault but never returned to public-facing surfaces. Operator-internal analysis stays internal.",
    color: "border-mineral bg-gray-900/20",
  },
] as const;

const CLUSTER_LINKS = [
  { href: "/brain", label: "Research Brain — the live Q&A surface" },
  { href: "/brain/how-brain-works", label: "How the Research Brain Works — six-step pipeline" },
  { href: "/intelligence/source-hierarchy", label: "Source Hierarchy — the six-tier taxonomy" },
  { href: "/intelligence/how-it-works", label: "How the Intelligence Network Works" },
  { href: "/methodology", label: "Methodology — the full scoring guide" },
];

export default function EvidenceVaultExplainedPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />
      <main className="flex-1">
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.08),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">Research Brain · Evidence Vault</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Evidence Vault explained.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              Every observed intelligence fact stored with source tier, TTL, and provenance. The vault is how the Brain cites instead of fabricates.
            </p>

            <div className="mt-10 border-l-2 border-cyan-700 bg-gray-900/60 p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-blue">Direct answer</p>
              <p className="mt-2 text-base font-semibold text-white">{ANSWER_BLOCK.question}</p>
              <p className="mt-3 text-sm leading-7 text-gray-300">{ANSWER_BLOCK.answer}</p>
              <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                <div>
                  <p className="font-mono uppercase tracking-[0.14em] text-gray-500">Source</p>
                  <p className="mt-1 text-gray-300">{ANSWER_BLOCK.attribution}</p>
                </div>
                <div>
                  <p className="font-mono uppercase tracking-[0.14em] text-gray-500">Confidence</p>
                  <p className="mt-1 text-emerald-300">{ANSWER_BLOCK.confidence}</p>
                </div>
                <div>
                  <p className="font-mono uppercase tracking-[0.14em] text-gray-500">Last updated</p>
                  <p className="mt-1 text-gray-300">{LAST_UPDATED}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Four core properties</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">What makes the vault trustworthy.</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {VAULT_PROPERTIES.map(({ property, description, color }) => (
                <div key={property} className={`border p-5 ${color}`}>
                  <h3 className="text-sm font-bold text-white">{property}</h3>
                  <p className="mt-2 text-sm leading-7 text-gray-300">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Evidence item fields</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">What is stored per fact.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
              Every evidence item in the vault carries these fields. The shape is derived from ADR 003 — the change proposal for the Evidence Vault MVP.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              {ITEM_FIELDS.map(({ field, type, description }) => (
                <div key={field} className="border border-mineral bg-carbon/60 p-4">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="font-mono text-sm font-bold text-ion-blue">{field}</span>
                    <span className="font-mono text-xs text-gray-500">{type}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-gray-300">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Continue reading</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Research Brain methodology cluster</h2>
            <ul className="mt-6 flex flex-col gap-2">
              {CLUSTER_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="block border border-mineral bg-carbon/60 px-4 py-3 text-sm text-gray-200 hover:border-cyan-700 hover:text-ion-blue">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
              Last updated: {LAST_UPDATED} · Source: {BRAND_NAME} Evidence Vault ADR 003
            </p>
          </div>
        </section>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_LD) }} />
    </div>
  );
}
