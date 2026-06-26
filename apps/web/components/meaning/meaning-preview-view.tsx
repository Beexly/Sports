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

      {view === "lenses" ? (
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
