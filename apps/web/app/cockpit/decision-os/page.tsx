/**
 * Cockpit — Decision OS index.
 *
 * The internal hub for the GSE Universal Decision Intelligence layer. Browses the
 * typed contracts in apps/web/lib/gse/* and links to each system's view. Pure /
 * static — admin-gated by the cockpit layout, safe in stub mode.
 */

import Link from "next/link";
import { GSE_SCORING_SYSTEMS } from "@/lib/gse";
import { Pill, Section, Table } from "../_gse/shell";

export const metadata = { title: "Decision OS · Cockpit" };

const SYSTEMS: ReadonlyArray<{ href: string; label: string; blurb: string }> = [
  { href: "/cockpit/data-excellence", label: "Data Excellence", blurb: "Source registry, data-quality + integrity scoring, data health." },
  { href: "/cockpit/decision-graph", label: "Decision Graph", blurb: "The connected ontology: entities, domains, relationships." },
  { href: "/cockpit/evidence-engine", label: "Evidence Engine", blurb: "Claim → evidence → counter → falsifier → verdict + courtroom templates." },
  { href: "/cockpit/jarvis-os", label: "Jarvis OS", blurb: "Decision-copilot mode contracts + readiness scoring." },
  { href: "/cockpit/agents-os", label: "Agents OS", blurb: "The constrained agent council + trust scoring." },
  { href: "/cockpit/revenue-os", label: "Revenue OS", blurb: "Funnel, trust-safe copy, revenue-readiness scoring." },
  { href: "/cockpit/product-os", label: "Product OS", blurb: "Opportunity, launch readiness, moat, roadmap." },
  { href: "/cockpit/page-intelligence", label: "Page Intelligence", blurb: "The 'thinking website' contracts + scoring." },
  { href: "/cockpit/claim-safety", label: "Claim Safety", blurb: "Public-claim safety + source-rights risk gates." },
];

export default function DecisionOsIndexPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-md bg-orbital-cyan/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-orbital-cyan">
            Decision OS · Internal
          </span>
          <Link
            href="/cockpit"
            className="rounded-lg border border-titanium/40 px-3 py-1.5 text-xs text-ion-1 hover:bg-carbon/60"
          >
            Back to Cockpit
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-ion-white">Universal Decision Intelligence</h1>
        <p className="max-w-3xl text-sm text-ion-2">
          The layer underneath the product. Most sites display data; GSE judges it. Every system below is a
          typed contract in <code className="text-ion-2">apps/web/lib/gse/*</code> with tests in{" "}
          <code className="text-ion-2">gse-contracts.test.ts</code>. These views are internal contract
          browsers — worked numbers are illustrative, not live.
        </p>
        <p className="text-[11px] text-ion-3">
          The operating loop: source → data → quality check → evidence → context → contradiction → uncertainty →
          recommendation → decision → action → outcome → autopsy → calibration → memory → sharper future strategy.
        </p>
      </header>

      <Section title="Systems" blurb="Nine contract surfaces, one connected decision graph.">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SYSTEMS.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="flex h-full flex-col gap-1 rounded-lg border border-titanium/40 bg-obsidian/50 p-4 hover:border-orbital-cyan/40 hover:bg-carbon/40"
              >
                <span className="text-sm font-semibold text-ion-white">{s.label}</span>
                <span className="text-xs text-ion-3">{s.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Scoring systems"
        blurb="Twenty typed judgements. Higher-is-riskier scores are the watchlist set; everything carries a rationale and flags."
      >
        <Table
          columns={["Score", "Purpose", "Orientation", "Surface"]}
          rows={GSE_SCORING_SYSTEMS.map((s) => [
            <span key="n" className="font-medium text-ion-1">{s.name}</span>,
            <span key="p">{s.purpose}</span>,
            s.orientation === "higher_is_riskier" ? (
              <Pill key="o" tone="warn">higher = riskier</Pill>
            ) : (
              <Pill key="o" tone="good">higher = better</Pill>
            ),
            <Pill key="s" tone={s.surface === "internal" ? "neutral" : "info"}>{s.surface.replace(/_/g, " ")}</Pill>,
          ])}
        />
      </Section>
    </div>
  );
}
