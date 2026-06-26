/**
 * MeaningPreviewView — the instrument-grade surface for /meaning/preview.
 *
 * Not the plain paper renderer: a dark, cinematic view that makes the category visible — GSE compiles
 * meaning. The compile pipeline, the seven-organ anatomy, per-objectType tabs showing each compiled
 * claim's organs + its downgrade trail, and the eight Galileo lenses. Server component; reuses the dark
 * <Tabs>. All data flows from the canonical engine via buildMeaningPreview(); on fixtures every claim is
 * capped at INFO_ONLY, so nothing here can read as a live call.
 */

import type { ReactNode } from "react";
import { Tabs } from "@/components/ui/tabs";
import {
  MEANING_VIEWS,
  ORGANS,
  PIPELINE,
  type MeaningPreview,
  type MeaningView,
  type ObserverArena,
} from "@/lib/meaning/meaning-preview";
import type { ClaimObject, Lens } from "@sports/decision-field-runtime";

const PATH = "/meaning/preview";

function emphasisClass(e: "NEUTRAL" | "CAUTION" | "BLOCK"): string {
  return e === "BLOCK" ? "text-rose-400" : e === "CAUTION" ? "text-nebula-purple" : "text-orbital-cyan";
}

function Panel({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-mineral bg-carbon/80 p-5 ${className}`}>
      {title ? <h3 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ion-1">{title}</h3> : null}
      {children}
    </section>
  );
}

function Row({ k, v, vClass = "text-ion-white" }: { k: ReactNode; v: ReactNode; vClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-mineral/50 py-1.5 text-[13px] last:border-0">
      <span className="text-ion-1">{k}</span>
      <span className={`max-w-[60%] text-right font-medium ${vClass}`}>{v}</span>
    </div>
  );
}

function ClaimCard({ c }: { c: ClaimObject }) {
  const refused = c.lifecycle === "DO_NOT_USE";
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-mineral bg-eclipse/60 p-5">
      <header>
        <p className="text-[15px] font-semibold leading-snug text-ion-white">{c.subject}</p>
        <span className={`mt-1 inline-block rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${refused ? "bg-rose-500/15 text-rose-400" : "bg-nebula-purple/15 text-nebula-purple"}`}>
          permitted: {refused ? "DO_NOT_USE" : c.publicExpression}
        </span>
      </header>
      <div>
        <Row k="blood · source" v={`${c.sourceLineage.providerName ?? c.sourceLineage.sourceKind}`} />
        <Row k="immune · rights" v={c.rights.status} />
        <Row k="nervous · knowable" v={c.time.knowability} />
        <Row k="spine · binds at" v={c.authority.composition.bindingLayers.join(", ") || "—"} />
        <Row k="weakness" v={c.risk.weakness} vClass="text-ion-1" />
      </div>
      <div>
        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-1">downgrade trail — every cap names its engine</p>
        {c.explain.downgrades.length === 0 ? (
          <p className="border-l-2 border-emerald-400/60 pl-3 text-[12px] text-emerald-300">cleared — every layer permits it at this lifecycle</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {c.explain.downgrades.map((d, i) => (
              <li key={i} className="flex flex-wrap gap-2 border-l-2 border-mineral pl-3 text-[12px]">
                <span className="min-w-[120px] font-mono text-plasma">{d.engine}</span>
                <span className="text-ion-1">caps to <span className="font-medium text-amber-300">{d.cappedTo}</span></span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="border-t border-mineral pt-2.5 text-[12.5px] text-ion">{c.explain.authorityStory}</p>
    </article>
  );
}

function LensCard({ l }: { l: Lens }) {
  return (
    <Panel title={l.title}>
      <p className="mb-3 text-[12.5px] text-ion-1">{l.description}</p>
      <ul className="flex flex-col gap-1.5">
        {l.rows.slice(0, 6).map((r, i) => (
          <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-mineral/50 py-1.5 text-[12px] last:border-0">
            <span className="max-w-[55%] text-ion-white">{r.subject}</span>
            <span className={`font-mono text-[11px] ${emphasisClass(r.emphasis)}`}>{r.headline}</span>
          </li>
        ))}
        {l.rows.length === 0 ? <li className="text-[12px] text-ion-1">no rows in this fixture corpus.</li> : null}
      </ul>
    </Panel>
  );
}

function lagLabel(v: number | null): string {
  return v == null ? "unknown" : `${v >= 0 ? "+" : ""}${v}s`;
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

const ENTITY_STATUS_CLASS: Record<string, string> = {
  CANONICAL: "bg-emerald-500/15 text-emerald-300",
  CROSS_VERIFIED: "bg-emerald-500/15 text-emerald-300",
  ALIAS_ONLY: "bg-nebula-purple/15 text-nebula-purple",
  DISCOVERED: "bg-amber-500/15 text-amber-300",
  CONFLICTED: "bg-rose-500/15 text-rose-400",
  RETIRED: "bg-mineral text-ion-1",
};

/** The Public Observer Arena — the Chronos clock chain, the entity ladder, and rights-gated highlights. */
function ObserverArenaPanels({ observer }: { observer: ObserverArena }): JSX.Element {
  const { lag, clockChain, stats, entities, highlights } = observer;
  return (
    <div className="flex flex-col gap-3">
      <Panel className="border-nebula-purple/40">
        <p className="text-[13px] text-ion">
          SerpApi / Google Sports is <span className="font-semibold text-ion-white">one observer in the arena</span> — it
          records what dominant discovery systems <span className="italic">show the public</span>, never official truth. It
          cannot settle an event, price a market, or trigger an action. Everything below is{" "}
          <span className="font-mono text-orbital-cyan">public DISPLAY truth</span>, fixture-only.
        </p>
      </Panel>

      <Panel title="Public Consensus Lag — the Chronos clock chain (observability only; never an edge)">
        <div className="flex flex-wrap items-stretch gap-1.5">
          {clockChain.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <div className="min-w-[120px] rounded-lg border border-mineral bg-carbon px-3 py-2">
                <p className="text-[12px] text-ion-white">{s.label}</p>
                <p className="mt-1 font-mono text-[11px] text-orbital-cyan">{s.clockSec == null ? "—" : `${s.clockSec}s`}</p>
              </div>
              {i < clockChain.length - 1 ? <span className="font-mono text-ion-1">→</span> : null}
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-mineral bg-eclipse/60 p-3">
            <p className="font-mono text-[10px] uppercase tracking-wide text-ion-1">public consensus lag</p>
            <p className="text-lg font-semibold text-ion-white">{lagLabel(lag.publicConsensusLag)}</p>
            <p className="text-[11px] text-ion-1">public shown − official source</p>
          </div>
          <div className="rounded-lg border border-mineral bg-eclipse/60 p-3">
            <p className="font-mono text-[10px] uppercase tracking-wide text-ion-1">public scoreboard delay</p>
            <p className="text-lg font-semibold text-ion-white">{lagLabel(lag.publicScoreboardDelay)}</p>
            <p className="text-[11px] text-ion-1">public shown − event itself</p>
          </div>
          <div className="rounded-lg border border-mineral bg-eclipse/60 p-3">
            <p className="font-mono text-[10px] uppercase tracking-wide text-ion-1">GSE vs public</p>
            <p className="text-lg font-semibold text-ion-white">{lagLabel(lag.gseVsPublicLag)}</p>
            <p className="text-[11px] text-ion-1">GSE compiled − public shown</p>
          </div>
        </div>
        <p className="mt-2 text-[11.5px] text-ion-1">
          canImplyEdge: <span className="font-mono text-rose-400">false</span> · canCreateAction:{" "}
          <span className="font-mono text-rose-400">false</span> — lag is a clock fact, not a betting signal.
        </p>
      </Panel>

      {stats.length > 0 ? (
        <Panel title="Observer visibility — how rich the public result is (a display measure, not a quality verdict)">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {stats.map((s) => (
              <div key={s.observerId} className="rounded-xl border border-mineral bg-eclipse/60 p-4">
                <p className="text-[14px] font-semibold text-ion-white">{s.subject}</p>
                <span className="mt-1 inline-block rounded-md bg-nebula-purple/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-nebula-purple">
                  {s.resultType} · ceiling {s.authorityCeiling}
                </span>
                <div className="mt-2">
                  <Row k="Google visibility index" v={pct(s.visibility)} vClass="text-orbital-cyan" />
                  <Row k="knowledge-graph coverage" v={pct(s.kgCoverage)} vClass="text-orbital-cyan" />
                  <Row k="SERP sports confidence" v={pct(s.confidence)} vClass="text-orbital-cyan" />
                  <Row k="can settle the event" v="never" vClass="text-rose-400" />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel title="Entity Passports — a kgmid anchors identity, not current truth (the ladder to CANONICAL)">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {entities.map((e) => (
            <div key={e.gseEntityId} className="rounded-xl border border-mineral bg-eclipse/60 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[14px] font-semibold text-ion-white">{e.canonicalName}</p>
                <span className={`rounded-md px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wide ${ENTITY_STATUS_CLASS[e.status] ?? "bg-mineral text-ion-1"}`}>
                  {e.status}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-ion-1">{e.entityType.toLowerCase()} · {e.sport ?? "—"}</p>
              <div className="mt-2">
                <Row k="kgmid" v={<span className="font-mono text-[11px]">{e.googleKgmid ?? "—"}</span>} />
                <Row k="confidence" v={pct(e.confidence)} vClass={e.confidence >= 0.9 ? "text-emerald-300" : "text-amber-300"} />
                <Row k="rights" v={e.rightsStatus} vClass="text-ion-1" />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] text-ion-1">
          A Google kgmid creates a <span className="font-mono text-amber-300">DISCOVERED</span> candidate; a provider id
          advances it to <span className="font-mono text-nebula-purple">ALIAS_ONLY</span>; only cross-verification against an
          official name reaches <span className="font-mono text-emerald-300">CANONICAL</span>.
        </p>
      </Panel>

      <Panel title="Highlights — discovery is never ownership (gates closed until rights clear)">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {highlights.map((h) => (
            <div key={h.highlightId} className="rounded-xl border border-mineral bg-eclipse/60 p-4">
              <p className="text-[14px] font-semibold text-ion-white">{h.title}</p>
              <span className="mt-1 inline-block rounded-md bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber-300">
                rights: {h.rightsStatus}
              </span>
              <div className="mt-2">
                <Row k="display allowed" v={h.displayAllowed ? "yes" : "no"} vClass={h.displayAllowed ? "text-emerald-300" : "text-rose-400"} />
                <Row k="embed allowed" v={h.embedAllowed ? "yes" : "no"} vClass={h.embedAllowed ? "text-emerald-300" : "text-rose-400"} />
                <Row k="thumbnail reusable" v={h.thumbnailReusable ? "yes" : "no"} vClass={h.thumbnailReusable ? "text-emerald-300" : "text-rose-400"} />
                <Row k="public-safe asset" v={h.publicSafe ? "yes" : "no"} vClass={h.publicSafe ? "text-emerald-300" : "text-rose-400"} />
              </div>
              <p className="mt-2 border-t border-mineral pt-2 text-[12px] text-ion-1">{h.notes}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function MeaningPreviewView({ preview, view }: { preview: MeaningPreview; view: MeaningView }): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.22em] text-orbital-cyan">GSE · the Meaning Compiler · fixture · not advice</p>
        <h1 className="text-3xl font-bold text-ion-white">
          GSE does not build pages. <span className="text-nebula-purple">GSE compiles meaning.</span>
        </h1>
        <p className="max-w-2xl text-[15px] text-ion">
          Every stat, trend, prediction, odds price, market state, bonus, provider, alert, and decision card becomes one
          typed <span className="font-semibold text-ion-white">ClaimObject</span> and passes through one governed pipeline.
          On fixture data every claim is capped at <span className="font-mono text-orbital-cyan">INFO_ONLY</span> — and tells
          you, in plain words, exactly why and what would lift it.
        </p>
        <div className="flex flex-wrap gap-2 text-[11px] text-ion-1">
          <span className="rounded-full border border-mineral px-3 py-1">{preview.counts.total} objects compiled</span>
          <span className="rounded-full border border-mineral px-3 py-1">{preview.counts.infoOnly} at INFO_ONLY</span>
          <span className="rounded-full border border-mineral px-3 py-1">{preview.counts.types} object types · one grammar</span>
          <span className="rounded-full border border-mineral px-3 py-1 text-nebula-purple">fixture · offline · no spend</span>
        </div>
      </header>

      <Panel title="The pipeline — downgrade-only; every cap names its engine">
        <div className="flex flex-wrap gap-1.5">
          {PIPELINE.map((p) => (
            <div key={p.n} className="min-w-[110px] flex-1 rounded-lg border border-mineral bg-carbon px-3 py-2">
              <p className="font-mono text-[10px] text-ion-1">{p.n}</p>
              <p className="text-[12.5px] text-ion-white">{p.stage}</p>
              <p className="mt-1 font-mono text-[10px] text-orbital-cyan">{p.out}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="The anatomy of a claim — seven organs (nothing public may be anatomically incomplete)">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {ORGANS.map((o) => (
            <div key={o.organ} className="rounded-xl border border-mineral bg-carbon p-3">
              <p className="font-mono text-[13px] text-ion-white">{o.organ}</p>
              <p className="text-[11.5px] text-ion-1">{o.role}</p>
              <p className="mt-1.5 font-mono text-[10px] text-orbital-cyan">{o.engine}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Tabs
        param="view"
        active={view}
        items={MEANING_VIEWS.map((v) => ({ value: v.value, label: v.label }))}
        pathname={PATH}
        ariaLabel="Meaning views"
        variant="dark"
      />

      {view === "observers" ? (
        <ObserverArenaPanels observer={preview.observer} />
      ) : view === "lenses" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {preview.lenses.map((l) => (
            <LensCard key={l.key} l={l} />
          ))}
        </div>
      ) : preview.claims.length === 0 ? (
        <Panel>
          <p className="text-[13px] text-ion-1">No compiled objects in this view for the fixture corpus.</p>
        </Panel>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {preview.claims.map((c) => (
            <ClaimCard key={c.claimObjectId} c={c} />
          ))}
        </div>
      )}

      <footer className="border-t border-mineral pt-3 text-[12px] text-ion-1">
        Fixture data · offline · no live odds · no affiliate links · no spend. Every value is the real output of the
        Meaning Compiler. Illustrative only — not betting advice and not a performance claim.
      </footer>
    </div>
  );
}
