import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Footer } from "@/components/ui/footer";
import { IntelligenceSubnav } from "@/components/intelligence/intelligence-subnav";
import { Nav } from "@/components/ui/nav";
import {
  metricsByCategory,
  methodologySummary,
  STABILITY_LABEL,
  type Metric,
  type Stability,
} from "@/lib/intelligence/metric-methodology";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How We Read the Numbers — Metric Methodology",
  description:
    "Every signal the engine uses, explained: what each metric is, how we read it, how it's commonly misread, and why stable inputs beat noisy outputs that regress to nothing.",
  alternates: { canonical: "/intelligence/metrics" },
};

function stabilityClass(s: Stability): string {
  if (s === "anchor") return "text-orbital-cyan";
  if (s === "signal") return "text-ultraviolet";
  return "text-plasma";
}

function MetricCard({ m }: { m: Metric }): JSX.Element {
  return (
    <article className="flex flex-col border border-mineral bg-eclipse p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold leading-tight text-ion-white">
            {m.name}{m.abbr ? <span className="ml-2 font-mono text-xs text-ion-2">{m.abbr}</span> : null}
          </h3>
          <p className={`mt-1 font-mono text-[10px] uppercase tracking-[0.14em] ${stabilityClass(m.stability)}`}>
            {STABILITY_LABEL[m.stability]}
          </p>
        </div>
        <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${m.status === "live" ? "text-orbital-cyan" : "text-ion-2"}`} style={{ background: "rgba(255,255,255,0.04)" }}>
          {m.status === "live" ? "live" : "queued"}
        </span>
      </div>

      {m.formula ? <p className="mt-3 border border-mineral bg-carbon px-3 py-1.5 font-mono text-[11px] text-ion-1">{m.formula}</p> : null}

      <dl className="mt-3 space-y-2.5 text-sm leading-6">
        <Row term="What it is" tone="text-ion-1">{m.whatItIs}</Row>
        <Row term="How we read it" tone="text-orbital-cyan">{m.howWeRead}</Row>
        <Row term="Commonly misread" tone="text-plasma">{m.commonMistake}</Row>
        <Row term="Our edge" tone="text-ultraviolet">{m.ourEdge}</Row>
      </dl>

      {m.href ? (
        <Link href={m.href} className="mt-4 inline-block text-sm font-semibold text-orbital-cyan hover:text-ion-white">
          See it live →
        </Link>
      ) : null}
    </article>
  );
}

function Row({ term, tone, children }: { term: string; tone: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <dt className={`font-mono text-[10px] uppercase tracking-[0.14em] ${tone}`}>{term}</dt>
      <dd className="mt-0.5 text-ion-1">{children}</dd>
    </div>
  );
}

export default async function MetricsMethodologyPage(): Promise<JSX.Element> {
  // Founder gate — the methodology page is the competitor-sensitive glass box.
  // Only an ADMIN session sees it; everyone else is bounced to sign-in.
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/auth/signin?callbackUrl=/intelligence/metrics");
  }

  const groups = metricsByCategory();
  const s = methodologySummary();

  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <IntelligenceSubnav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <section className="border-b border-mineral pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Methodology</p>
          <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
            How we read the numbers.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-ion-1">
            Most products show you stats. The edge is in reading them. We separate <span className="text-orbital-cyan">anchors</span> —
            stable, predictive inputs like opportunity, volume, accuracy, and quality of contact — from <span className="text-plasma">noisy</span> outputs
            like efficiency, results, and touchdown rate that regress to the mean. An accurate projection leans on the anchors
            and treats the noise as a sample, not a skill. Here&apos;s every signal we use, and exactly how we read it.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 font-mono text-[11px] text-ion-2">
            <span className="border border-mineral bg-eclipse px-3 py-1.5">{s.total} metrics tracked</span>
            <span className="border border-mineral bg-eclipse px-3 py-1.5">{s.anchors} anchors</span>
            <span className="border border-mineral bg-eclipse px-3 py-1.5">{s.live} live · {s.queued} queued</span>
          </div>
        </section>

        {groups.map((g) => (
          <section key={g.category}>
            <h2 className="font-display text-2xl font-semibold text-ion-white">{g.label}</h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {g.items.map((m) => <MetricCard key={m.key} m={m} />)}
            </div>
          </section>
        ))}

        <section className="border border-mineral bg-eclipse p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">The doctrine</p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ion-1">
            When two independent signals disagree, we surface the gap — we don&apos;t average it into false precision.
            Opportunity that outruns production is a buy-low; production that outruns opportunity is a sell-high. That
            single discipline, applied across every position and sport, is how we keep projections honest and close to accurate.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
