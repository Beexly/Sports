import { createFileRoute } from "@tanstack/react-router";
import { KIT_SEQUENCES, PARTNERSHIPS, SCORING, band } from "@/lib/outreach";
import { leadsCsv, listLeads } from "@/lib/leads";
import { StudioNav } from "@/components/studio/nav";
import { IG_DM } from "@/lib/kit-offer";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/outreach")({
  component: OutreachPage,
  head: () => ({
    meta: [{ title: "Outreach & partnership kit — drafts only" }],
  }),
});

function OutreachPage() {
  const [tick, setTick] = useState(0);
  const leads = useMemo(() => listLeads(), [tick]);

  function download() {
    const blob = new Blob([leadsCsv(leads)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "beexly-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="kit-shell">
      <div className="grain" />
      <StudioNav current="/outreach" cta={{ href: IG_DM, label: "DM KIT" }} />
      <article className="mx-auto max-w-[800px] px-5 py-10 md:px-8">
        <p className="kicker">Drafts only · never sent from here</p>
        <h1 className="display mt-3 text-3xl">Outreach & partnership kit.</h1>
        <p className="mt-4 text-muted">
          Day 0 / 3 / 7 for Kit. One-pagers for shops, planners, venues. Scoring rules. Leads captured in this preview
          can be downloaded as CSV — they have not been emailed to anyone.
        </p>

        <h2 className="display mt-14 text-2xl">Kit sequence</h2>
        <div className="mt-6 grid gap-6">
          {KIT_SEQUENCES.map((s) => (
            <section key={s.day} className="rounded-[18px] border border-line p-6">
              <p className="kicker">
                Day {s.day} · {s.name}
              </p>
              <h3 className="mt-2 font-medium">{s.subject}</h3>
              <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-[1.55] text-muted">{s.body}</pre>
            </section>
          ))}
        </div>

        <h2 className="display mt-14 text-2xl">Partnership one-pagers</h2>
        <div className="mt-6 grid gap-4">
          {PARTNERSHIPS.map((p) => (
            <section key={p.who} className="rounded-[18px] border border-line p-6">
              <p className="kicker">{p.who}</p>
              <h3 className="display mt-2 text-xl">{p.offer}</h3>
              <p className="mt-3 text-sm text-muted">{p.why}</p>
              <p className="mt-2 text-sm">{p.price}</p>
              <p className="mt-2 text-sm text-copper">{p.ask}</p>
            </section>
          ))}
        </div>

        <h2 className="display mt-14 text-2xl">Lead scoring</h2>
        <ul className="mt-6 grid gap-2">
          {SCORING.map((r) => (
            <li key={r.rule} className="flex gap-3 border-b border-line py-3 text-sm">
              <span className="w-10 font-mono text-copper">{r.pts > 0 ? `+${r.pts}` : r.pts}</span>
              <span className="text-muted">{r.rule}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          Bands: 7+ {band(7)} · 4–6 {band(4)} · 1–3 {band(1)} · ≤0 {band(0)}
        </p>

        <h2 className="display mt-14 text-2xl">Leads on this device</h2>
        <p className="mt-2 text-sm text-muted">{leads.length} captured in this browser.</p>
        <div className="mt-4 flex gap-3">
          <button type="button" className="btn-primary" onClick={download} disabled={!leads.length}>
            Download CSV
          </button>
          <button type="button" className="btn-ghost" onClick={() => setTick((n) => n + 1)}>
            Refresh
          </button>
        </div>
      </article>
    </div>
  );
}
