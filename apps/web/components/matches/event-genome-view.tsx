/**
 * EventGenomeView — the product surface for /matches/preview/*.
 *
 * The rights-safe answer to a Scores24 match page. A scoreboard shows the result; this shows the truth
 * architecture underneath it: every stat carries a passport, every prediction is on trial, every market
 * has a lifecycle, and one Authority Flight Record states — in plain words — exactly what GSE is allowed
 * to claim. All data flows from the canonical engine via buildEventGenomePreview(); on fixture data the
 * authority meet caps everything at "FYI" (INFO_ONLY), so nothing here can read as a live betting call.
 *
 * Server component. Reuses <Tabs> (URL-driven, shareable) and lib/decision-ui/status.ts. No DB, no
 * network, no client state — the active view is read from the URL by the parent page.
 */

import type { ReactNode } from "react";
import { Tabs } from "@/components/ui/tabs";
import { toneClass } from "@/lib/intelligence/colors";
import { strengthChip } from "@/lib/decision-ui/status";
import {
  GENOME_VIEWS,
  type EventGenomePreview,
  type GenomeView,
} from "@/lib/matches/event-genome-preview";
import type { MaxPermittedStrength } from "@sports/decision-field-runtime";

// ── small presentational atoms (paper surface — same tokens as components/decision/*) ──

function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-paper-border bg-paper-raised p-5 ${className}`}>
      {title ? (
        <h3 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-2">{title}</h3>
      ) : null}
      {children}
    </section>
  );
}

function Row({ k, v, valueClass = "text-ink" }: { k: ReactNode; v: ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-paper-border/60 py-1.5 text-sm last:border-0">
      <span className="text-ink-2">{k}</span>
      <span className={`text-right font-medium ${valueClass}`}>{v}</span>
    </div>
  );
}

function StrengthChip({ strength }: { strength: MaxPermittedStrength }) {
  const chip = strengthChip(strength);
  return (
    <span className={`rounded-full border border-paper-border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${toneClass(chip.tone)}`}>
      {chip.label}
    </span>
  );
}

function Badge({ text, tone = "neutral" }: { text: string; tone?: "good" | "bad" | "neutral" }) {
  return <span className={`font-mono text-[10px] font-semibold uppercase tracking-wide ${toneClass(tone)}`}>{text}</span>;
}

function fmt(n: number | null, places = 2): string {
  return n == null ? "—" : (Math.round(n * 10 ** places) / 10 ** places).toString();
}

// ── the nine views ────────────────────────────────────────────────────────────

function Overview({ p }: { p: EventGenomePreview }) {
  const g = p.genome;
  const statBag = Object.entries(g.stats).slice(0, 6);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title={`${g.league}${g.tournament ? " · " + g.tournament : ""} · ${g.status}`}>
        <p className="mb-3 text-xl font-semibold text-ink">
          {g.participants[0].name} {g.scoreState.final ? `${g.scoreState.home}–${g.scoreState.away}` : "vs"} {g.participants[1].name}
        </p>
        {g.venue ? <Row k="Venue" v={g.venue} /> : null}
        {g.weather ? <Row k="Weather" v={g.weather} /> : null}
        {g.officials ? <Row k="Officials" v={g.officials} /> : null}
        {statBag.map(([k, v]) => (
          <Row key={k} k={k} v={String(v)} />
        ))}
      </Card>
      <Card title="What GSE adds that a scoreboard doesn't">
        <p className="mb-3 text-sm text-ink-1">
          Every number here can explain where it came from, what it knows, what it can&apos;t prove, and which decision it
          changes. Open the Passports and Proof tabs to inspect the receipts.
        </p>
        <Row k="Stat passports" v={p.derivedStats.length || "see Passports"} />
        <Row k="Trends on trial" v={p.trends.length} />
        <Row k="Predictions on trial" v={p.trials.length} />
        <Row k="Market lifecycles" v={p.markets.length || "—"} />
        <Row k="Authority ceiling" v={<StrengthChip strength={p.authorityCeiling} />} />
      </Card>
    </div>
  );
}

function Worldline({ p }: { p: EventGenomePreview }) {
  const tl = p.genome.timeline;
  return (
    <Card title="Worldline — what happened, and whether it was knowable in time">
      {tl.length === 0 ? (
        <p className="text-sm text-ink-1">Upcoming — no timeline yet. The worldline fills in as the event unfolds.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tl.map((e, i) => (
            <li key={i} className="flex gap-3 border-l-2 border-paper-border pl-3 text-sm">
              <span className="min-w-[3rem] font-mono text-ink-2">{e.marker}</span>
              <span className="text-ink">
                {e.subject}
                {e.detail ? <span className="text-ink-2"> — {e.detail}</span> : null}
                {!e.knownAtMarker ? <span className="ml-2 text-[10px] uppercase tracking-wide text-ink-2">(not knowable at this marker)</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Trial({ p }: { p: EventGenomePreview }) {
  return (
    <Card title="Prediction Court — process graded apart from outcome">
      <p className="mb-3 text-sm text-ink-1">
        A win can have bad process; a loss can have good process; a claim louder than its ceiling fails regardless. No
        fixture trial counts as a public performance claim.
      </p>
      <div className="flex flex-col gap-2.5">
        {p.trials.map((t) => {
          const tone = t.result === "WIN" ? "good" : t.result === "LOSS" ? "bad" : "neutral";
          return (
            <div key={t.predictionId} className="rounded-xl border border-paper-border p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-ink">
                  {t.market} — {t.selection}
                </span>
                <span className="flex items-center gap-2">
                  <Badge text={t.result} tone={tone} />
                  <span className="text-xs text-ink-2">{t.outcomeGrade}</span>
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-2">
                Process: <span className="font-medium text-ink-1">{t.processGrade}</span>
                {t.clv != null ? <> · CLV {t.clv > 0 ? "+" : ""}{fmt(t.clv, 3)}</> : null}
                {!t.authorityRespected ? <span className="ml-1 text-rose-700"> · claim exceeded its ceiling</span> : null}
              </p>
              {t.lesson ? <p className="mt-1 text-xs text-ink-1">{t.lesson}</p> : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Genome({ p }: { p: EventGenomePreview }) {
  const g = p.genome;
  return (
    <Card title="Match Genome — the structured event object">
      <Row k="Sport / league" v={`${g.sport} · ${g.league}`} />
      <Row k="Period schema" v={`${g.periodSchema.kind} · ${g.periodSchema.segments.join(", ")}`} />
      <Row k="Status" v={g.status} />
      {g.scoreState.periodScores.length > 0 ? (
        <Row k="Period scores" v={g.scoreState.periodScores.map((s) => `${s.period}: ${s.home}-${s.away}`).join("  ")} />
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-x-4 sm:grid-cols-3">
        {Object.entries(g.stats).map(([k, v]) => (
          <div key={k} className="border-b border-paper-border/60 py-1 text-xs">
            <span className="text-ink-2">{k}</span> <span className="font-medium text-ink">{String(v)}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-2">
        Adapter: {g.sport} · period schema present · fixture-watermarked. Sport-specific data degrades gracefully — no
        fixture is ever rendered as live.
      </p>
    </Card>
  );
}

function Market({ p }: { p: EventGenomePreview }) {
  return (
    <Card title="Market Bloom — every market has a life">
      <p className="mb-3 text-sm text-ink-1">
        UNBORN → OPENED → THIN → BROADENING → MATURE → MOVING → CAUGHT_UP → STALE → CLOSED. A young or thin market is
        watch-only; a stale or caught-up market suppresses any call.
      </p>
      {p.markets.length === 0 ? (
        <p className="text-sm text-ink-2">No market-lifecycle fixtures wired for this event.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {p.markets.map((m) => (
            <div key={m.marketKey} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-paper-border/60 py-1.5">
              <span className="text-sm text-ink">{m.marketKey}</span>
              <span className="flex items-center gap-2 text-xs">
                <Badge text={m.stage} tone={m.suppressesAction ? "bad" : "neutral"} />
                <span className="text-ink-2">
                  {m.bookCount} book{m.bookCount === 1 ? "" : "s"} · {m.note}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Passports({ p }: { p: EventGenomePreview }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-1">
        Stat &amp; trend passports — the genealogy behind each number. On fixture data none can exceed EXPERIMENTAL, and a
        trend alone never licenses an action.
      </p>
      {p.derivedStats.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {p.derivedStats.map((s) => (
            <div key={s.key} className="rounded-xl border border-paper-border bg-paper-raised p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-lg text-ink">{fmt(s.value)}</p>
                  <p className="text-sm font-medium text-ink">{s.name}</p>
                </div>
                <Badge text={s.passport.status} />
              </div>
              <p className="mt-1.5 text-xs text-ink-2">formula: <span className="text-ink-1">{s.formula}</span></p>
              <p className="text-xs text-rose-700">fails when: {s.weakness}</p>
              <p className="text-xs text-ink-2">decision-use: <span className="text-ink-1">{s.decisionUse}</span></p>
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {p.trends.map((t) => (
          <div key={t.trendId} className="rounded-xl border border-paper-border bg-paper-raised p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-ink">{t.claim}</p>
              <StrengthChip strength={t.authorityCeiling} />
            </div>
            <p className="mt-1.5 text-xs text-ink-2">
              {t.sampleScope} · {t.hitCount}/{t.sampleSize} · fragility {fmt(t.fragilityScore)} · overfit {t.overfitRisk}
            </p>
            {t.correlatedTrends.length > 0 ? (
              <p className="text-xs text-rose-700">correlated with {t.correlatedTrends.length} other trend(s) — not independent evidence</p>
            ) : null}
            <p className="text-xs text-ink-2">{t.whatWouldInvalidate}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Odds({ p }: { p: EventGenomePreview }) {
  return (
    <Card title="Odds — fixture prices, no affiliate links">
      {p.genome.odds.length === 0 ? (
        <p className="text-sm text-ink-2">No odds fixtures wired for this event.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {p.genome.odds.map((o, i) => (
            <Row key={i} k={`${o.market} — ${o.selection}`} v={`${o.price.toFixed(2)} · ${o.bookCount} books · ${o.observedAtLabel}`} />
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-ink-2">
        Prices are illustrative fixtures. GSE never surfaces an affiliate link unless the owner configures it, and never
        states an offer is current without verification.
      </p>
    </Card>
  );
}

function Proof({ p }: { p: EventGenomePreview }) {
  const fr = p.flightRecord;
  return (
    <Card title="Authority Flight Record — exactly what GSE is allowed to say">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-ink-2">Requested</span>
        <StrengthChip strength={fr.requestedExpression} />
        <span className="text-ink-2">→ Permitted</span>
        <StrengthChip strength={fr.permittedExpression} />
      </div>
      <p className="mb-3 text-sm text-ink-1">{fr.whyNot} {fr.whatWouldUpgrade}</p>
      <div className="flex flex-col gap-1">
        {fr.layerResults.map((l, i) => (
          <div
            key={l.layer}
            className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-1.5 text-sm ${
              l.binding ? "border-rose-300 bg-rose-50" : "border-paper-border"
            }`}
          >
            <span className="text-ink-2">{i + 1}</span>
            <span className="flex-1 text-ink">
              {l.layer.replace(/_/g, " ").toLowerCase()}
              {l.binding ? <span className="ml-2 text-[10px] uppercase tracking-wide text-rose-700">binding</span> : null}
            </span>
            <span className={`font-mono text-xs ${l.binding ? "text-rose-700" : "text-ink-2"}`}>{l.ceiling}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Autopsy({ p }: { p: EventGenomePreview }) {
  const settled = p.trials.filter((t) => t.result !== "UNKNOWN");
  return (
    <Card title="Autopsy — what GSE learned, and what it refuses to over-learn">
      {settled.length === 0 ? (
        <p className="text-sm text-ink-1">Upcoming — the trial is pending and will be graded at kickoff.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {settled.map((t) => (
            <div key={t.predictionId} className="border-b border-paper-border/60 pb-2 last:border-0">
              <p className="text-sm font-medium text-ink">{t.market} — {t.selection}</p>
              <p className="text-sm text-ink-1">{t.autopsy}</p>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-ink-2">
        One result moves no model weight. Autopsies are written to the Learning Ledger and only update calibration once
        the sample and review gates are met.
      </p>
    </Card>
  );
}

function Compiler({ p }: { p: EventGenomePreview }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-1">
        Every object on this page is also routed through the GSE Meaning Compiler — one grammar for the whole institution.
        Each compiles to a <span className="font-mono">ClaimObject</span> whose permitted expression is the meet of its
        engines; on fixture data that meet is <span className="font-mono">INFO_ONLY</span>, and the trail names every cap.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {p.compiled.map((c) => (
          <div key={c.claimObjectId} className="rounded-xl border border-paper-border bg-paper-raised p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-ink-2">{c.objectType.replace(/_/g, " ").toLowerCase()}</p>
                <p className="text-sm font-medium text-ink">{c.subject}</p>
              </div>
              <StrengthChip strength={c.publicExpression} />
            </div>
            <p className="mt-1.5 text-xs text-ink-2">
              binds at {c.authority.composition.bindingLayers.join(", ") || "—"} · {c.sourceLineage.providerName ?? c.sourceLineage.sourceKind}
            </p>
            {c.explain.downgrades.length > 0 ? (
              <p className="text-xs text-ink-2">
                trail: {c.explain.downgrades.map((d) => `${d.engine}→${d.cappedTo}`).join(" · ")}
              </p>
            ) : (
              <p className="text-xs text-emerald-700">cleared at this lifecycle</p>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-2">
        {p.compiled.length} objects compiled · all fixture-watermarked · nothing on this page escapes the grammar.
      </p>
    </div>
  );
}

const PANELS: Record<GenomeView, (props: { p: EventGenomePreview }) => JSX.Element> = {
  overview: Overview,
  worldline: Worldline,
  trial: Trial,
  genome: Genome,
  market: Market,
  passports: Passports,
  odds: Odds,
  compiler: Compiler,
  proof: Proof,
  autopsy: Autopsy,
};

// ── the view ──────────────────────────────────────────────────────────────────

export function EventGenomeView({
  preview,
  pathname,
  view,
}: {
  preview: EventGenomePreview;
  pathname: string;
  view: GenomeView;
}): JSX.Element {
  const g = preview.genome;
  const Panel = PANELS[view];
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-2">
          {g.league}
          {g.region ? ` · ${g.region}` : ""} · {g.startTimeLabel} · fixture · not advice
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-ink">
            {g.participants[0].name} <span className="text-ink-2">vs</span> {g.participants[1].name}
          </h1>
          <StrengthChip strength={preview.authorityCeiling} />
        </div>
        <p className="text-sm text-ink-1">
          A scoreboard shows the result. GSE shows what the data is allowed to mean — every number with a passport, every
          call on trial, every market with a lifecycle.
        </p>
      </header>

      <Tabs
        param="view"
        active={view}
        items={GENOME_VIEWS.map((v) => ({ value: v.value, label: v.label }))}
        pathname={pathname}
        ariaLabel="Match views"
      />

      <Panel p={preview} />

      <footer className="border-t border-paper-border pt-3 text-xs text-ink-2">
        Fixture data · offline · no live odds · no affiliate links · no spend. Illustrative only — not betting advice and
        not a performance claim.
      </footer>
    </div>
  );
}
