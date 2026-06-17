import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, InsightCard, SectionHeader, StatusRibbon, SimpleTable } from "../../stats/_components";
import { loadSummary, loadAudit, loadActiveMetricManifest } from "@/lib/statking/product";

export default async function Page() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const s = loadSummary();
  const a = loadAudit();
  const m = loadActiveMetricManifest();

  return (
    <Shell title="StatKing Admin">
      <StatusRibbon status="fixture" label="StatKing admin — foundation mode, fixture-backed data" />
      <InsightCard
        eyebrow="Founder Dashboard"
        headline="You're in foundation mode — real sources, fixture data"
        body="Crown score: 61/100. Upgrade path: activate live feeds → build proof archive → hit 90+. Each admin section below maps to a dimension of that score."
        tone="warn"
      />
      <Cards items={[
        { label: "Sources", value: s.source_count },
        { label: "Active metrics", value: m.active_calculated_count },
        { label: "Real systems", value: a.summary.real_working ?? 0 },
        { label: "Stub systems", value: a.summary.stub_only ?? 0 }
      ]} />
      <SectionHeader eyebrow="Data & Sources" title="Data & Sources" />
      <SimpleTable rows={[
        { section: "Data & Sources", page: "Audit", href: "/admin/statking/audit" },
        { section: "Data & Sources", page: "Coverage", href: "/admin/statking/coverage" },
        { section: "Data & Sources", page: "Rights Ledger", href: "/admin/statking/rights" },
        { section: "Data & Sources", page: "Activation ROI", href: "/admin/statking/roi" },
      ]} />
      <SectionHeader eyebrow="Intelligence" title="Intelligence" />
      <SimpleTable rows={[
        { section: "Intelligence", page: "Crown Dashboard", href: "/admin/statking/crown" },
        { section: "Intelligence", page: "King Gap Map", href: "/admin/statking/gaps" },
        { section: "Intelligence", page: "Metric Manifest", href: "/admin/statking/metrics" },
      ]} />
      <SectionHeader eyebrow="Ops & Proof" title="Ops & Proof" />
      <SimpleTable rows={[
        { section: "Ops & Proof", page: "Readiness", href: "/admin/statking/readiness" },
        { section: "Ops & Proof", page: "Proof Archive", href: "/admin/statking/proof" },
        { section: "Ops & Proof", page: "Summary", href: "/admin/statking/summary" },
      ]} />
      <SimpleTable rows={a.items} />
    </Shell>
  );
}
