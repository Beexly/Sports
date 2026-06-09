import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Atmosphere } from "@/components/ui/atmosphere";
import { Attribution } from "@/components/ui/attribution";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { SourceError } from "@/components/ui/source-error";
import { UpsellGate } from "@/components/ui/upsell-gate";
import { Reveal } from "@/components/motion/reveal";
import { AmbientGlow, SignatureGrid } from "@/components/motion/signature-grid";
import { ShareBar, PercentileBar, DivergingBar, SignalChip } from "@/components/ui/dataviz";
import { canAccess, getViewerTier } from "@/lib/access";
import { ratingTierClass, type SignalTone } from "@/lib/intelligence/colors";
import {
  loadPlayerDossier,
  type PlayerDossier,
  type DossierSection,
} from "@/lib/intelligence/dossier";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // joins eight live nflverse/Sleeper loads — needs headroom

export const metadata: Metadata = {
  title: "Player Dossier — every signal, one read",
  description:
    "The full-spectrum dossier for one player: the GSE Rating and the plain-English why, then every advanced signal we hold — usage, tracking efficiency, scheme, scoring-zone equity, the athletic prior, availability, and live market — joined into one view.",
};

const EM_DASH = "—";

// ── tiny server-safe formatters (no hooks; page owns all presentation) ───────

function num(value: number | null, digits = 2): string {
  if (value == null) return EM_DASH;
  return value.toFixed(digits);
}

/** A label + value row inside a domain card. Honest dash when the value is null. */
function Stat({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-surface-line/60 py-2 last:border-b-0">
      <span className="flex flex-col">
        <span className="text-sm text-ion-1">{label}</span>
        {hint ? <span className="text-[11px] leading-4 text-ion-2">{hint}</span> : null}
      </span>
      <span className="shrink-0 text-right">{children}</span>
    </div>
  );
}

/** A domain card shell with a kicker + title. Renders an honest empty/error body
 *  when the section has no value, so a missing source never looks like a bug. */
function DomainCard<T>({
  kicker,
  title,
  section,
  emptyLabel,
  children,
}: {
  kicker: string;
  title: string;
  section: DossierSection<T>;
  emptyLabel: string;
  children: (value: T) => ReactNode;
}): JSX.Element {
  return (
    <section className="flex flex-col gap-3 rounded-ds-md border border-surface-line bg-surface-raised p-5">
      <div className="flex flex-col gap-0.5">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-orbital-cyan">
          {kicker}
        </p>
        <h3 className="text-lg font-semibold text-ion-white">{title}</h3>
      </div>
      {section.state === "source-error" ? (
        <p className="text-sm leading-6 text-ion-2">
          This source couldn&apos;t be reached right now. We show nothing rather than a number we
          can&apos;t stand behind.
        </p>
      ) : section.value == null ? (
        <p className="text-sm leading-6 text-ion-2">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col">{children(section.value)}</div>
      )}
    </section>
  );
}

// ── the hero: name/team/pos + the big GSE Rating + tier + the why ─────────────

function DossierHero({ dossier }: { dossier: PlayerDossier }): JSX.Element {
  const rating = dossier.rating;
  return (
    <div className="relative isolate overflow-hidden rounded-ds-lg border border-surface-line">
      <AmbientGlow className="-z-10" />
      <SignatureGrid className="-z-10" opacity={0.1} rotate />
      <div className="relative z-10 grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-orbital-cyan">
            Player Dossier
          </p>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] text-ion-white sm:text-5xl">
            {dossier.name}
          </h1>
          <p className="font-mono text-sm text-ion-1">
            {dossier.position ?? EM_DASH}
            {dossier.team ? ` · ${dossier.team}` : ""}
            {dossier.season ? ` · ${dossier.season}` : ""}
            {dossier.throughWeek ? ` · through Wk ${dossier.throughWeek}` : ""}
          </p>
          {rating ? (
            <p className="mt-2 max-w-2xl text-base leading-7 text-ion-1">{rating.why}</p>
          ) : null}
        </div>

        {rating ? (
          <div className="flex flex-col items-start gap-2 rounded-ds-md border border-surface-line bg-surface-sunken/60 p-5 lg:items-center">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ion-2">
              GSE Rating
            </p>
            <p
              className={`font-numerals text-6xl font-semibold tabular-nums leading-none ${ratingTierClass(
                rating.grade,
              )}`}
            >
              {rating.grade}
            </p>
            <SignalChip label={rating.tierLabel} tone={rating.tierTone} />
            <div className="mt-1 flex w-full items-center justify-between gap-3 lg:justify-center">
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ion-2">
                Production
              </span>
              <PercentileBar pct={rating.productionPct} />
            </div>
            <p className="text-xs leading-5 text-ion-2">{rating.note}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── domain cards (the gated DEPTH) ───────────────────────────────────────────

function UsageCard({ dossier }: { dossier: PlayerDossier }): JSX.Element {
  return (
    <DomainCard
      kicker="Usage"
      title="How big is the role"
      section={dossier.usage}
      emptyLabel="No usage detail on file for this player."
    >
      {(u) => (
        <>
          <Stat label="Games">
            <span className="font-mono tabular-nums text-ion-white">{u.games}</span>
          </Stat>
          <Stat label="Touches" hint="carries + targets">
            <span className="font-mono tabular-nums text-ion-white">{u.touches}</span>
          </Stat>
          <Stat label="WOPR" hint="weighted opportunity rating">
            <span className="font-mono tabular-nums text-ion-white">{num(u.wopr, 2)}</span>
          </Stat>
          <Stat label="Target share">
            <ShareBar value={u.targetShare} tone="neutral" />
          </Stat>
          <Stat label="Snap share" hint="of team offensive snaps">
            <ShareBar value={u.snapSharePct} tone="neutral" />
          </Stat>
          <Stat label="Red-zone share" hint="of team scoring-zone looks">
            <ShareBar value={u.rzShare} tone="neutral" />
          </Stat>
        </>
      )}
    </DomainCard>
  );
}

function EfficiencyCard({ dossier }: { dossier: PlayerDossier }): JSX.Element {
  return (
    <DomainCard
      kicker="Efficiency & tracking"
      title="The quality of the output"
      section={dossier.efficiency}
      emptyLabel="No tracking detail on file for this player."
    >
      {(e) => (
        <>
          <Stat label="EPA / play">
            <DivergingBar value={e.epaPerPlay} domain={0.4} digits={3} />
          </Stat>
          <Stat label="DAKOTA" hint="adj. EPA + CPOE composite">
            <span className="font-mono tabular-nums text-ion-white">{num(e.dakota, 3)}</span>
          </Stat>
          <Stat label="PACR" hint="passing air-yards conversion">
            <span className="font-mono tabular-nums text-ion-white">{num(e.pacr, 2)}</span>
          </Stat>
          <Stat label="Separation" hint="NGS yards at catch">
            <span className="font-mono tabular-nums text-ion-white">{num(e.avgSeparation, 2)}</span>
          </Stat>
          <Stat label="YAC over expected" hint="NGS, per reception">
            <DivergingBar value={e.avgYacAboveExpectation} domain={3} digits={2} />
          </Stat>
          <Stat label="Catch %">
            <ShareBar value={e.catchPct} tone="neutral" />
          </Stat>
          <Stat label="CPOE" hint="completion % over expected">
            <DivergingBar value={e.cpoe} domain={10} digits={1} />
          </Stat>
          <Stat label="Time to throw" hint="NGS seconds">
            <span className="font-mono tabular-nums text-ion-white">{num(e.avgTimeToThrow, 2)}</span>
          </Stat>
          <Stat label="RYOE / attempt" hint="rush yards over expected">
            <DivergingBar value={e.ryoePerAtt} domain={2} digits={2} />
          </Stat>
          <Stat label="Stacked box %" hint="vs 8+ defenders">
            <ShareBar value={e.pctStackedBox} tone="neutral" />
          </Stat>
          <Stat label="ADOT" hint="PFR avg depth of target">
            <span className="font-mono tabular-nums text-ion-white">{num(e.adot, 1)}</span>
          </Stat>
          <Stat label="Drop %" hint="PFR charted drops">
            <ShareBar value={e.dropPct} tone="bad" />
          </Stat>
        </>
      )}
    </DomainCard>
  );
}

function RoleCard({ dossier }: { dossier: PlayerDossier }): JSX.Element {
  return (
    <DomainCard
      kicker="Role & scheme"
      title="How the offense uses him"
      section={dossier.role}
      emptyLabel="Per-player scheme attribution is QB-only (FTN charting attributes design to the passer)."
    >
      {(r) => (
        <>
          <Stat label="Play-action rate">
            <ShareBar value={r.playActionRate} tone="neutral" />
          </Stat>
          <Stat label="RPO rate">
            <ShareBar value={r.rpoRate} tone="neutral" />
          </Stat>
          <Stat label="Screen rate">
            <ShareBar value={r.screenRate} tone="neutral" />
          </Stat>
          <Stat label="Motion rate">
            <ShareBar value={r.motionRate} tone="neutral" />
          </Stat>
          <Stat label="No-huddle rate">
            <ShareBar value={r.noHuddleRate} tone="neutral" />
          </Stat>
          <Stat label="Blitzers faced" hint="mean per dropback">
            <span className="font-mono tabular-nums text-ion-white">{num(r.avgBlitzersFaced, 2)}</span>
          </Stat>
          <Stat label="Pressure rate" hint="PFR share of dropbacks">
            <ShareBar value={r.pressurePct} tone="bad" />
          </Stat>
          <Stat label="Pocket time" hint="PFR seconds">
            <span className="font-mono tabular-nums text-ion-white">{num(r.pocketTime, 2)}</span>
          </Stat>
          <Stat label="Play-action attempts" hint="PFR count">
            <span className="font-mono tabular-nums text-ion-white">
              {r.paPassAtt == null ? EM_DASH : r.paPassAtt}
            </span>
          </Stat>
        </>
      )}
    </DomainCard>
  );
}

function SituationalCard({ dossier }: { dossier: PlayerDossier }): JSX.Element {
  const signalTone = (s: "buy" | "sell" | "in-line"): SignalTone =>
    s === "buy" ? "good" : s === "sell" ? "bad" : "neutral";
  return (
    <DomainCard
      kicker="Situational"
      title="Scoring-zone equity"
      section={dossier.situational}
      emptyLabel="No scoring-zone opportunities on file for this player."
    >
      {(s) => (
        <>
          <Stat label="RZ carries">
            <span className="font-mono tabular-nums text-ion-white">{s.rzCarries}</span>
          </Stat>
          <Stat label="RZ targets">
            <span className="font-mono tabular-nums text-ion-white">{s.rzTargets}</span>
          </Stat>
          <Stat label="Inside the 5" hint="highest-equity looks">
            <span className="font-mono tabular-nums text-ion-white">{s.inside5}</span>
          </Stat>
          <Stat label="RZ touchdowns">
            <span className="font-mono tabular-nums text-ion-white">{s.rzTds}</span>
          </Stat>
          <Stat label="TD rate" hint="per scoring-zone opp">
            <ShareBar value={s.tdRate} tone="neutral" />
          </Stat>
          <Stat label="Expected TD rate" hint="regressed to position">
            <ShareBar value={s.expectedTdRate} tone="neutral" />
          </Stat>
          <Stat label="EPA / opp" hint="on scoring-zone touches">
            <DivergingBar value={s.rzEpaPerOpp} domain={1} digits={2} />
          </Stat>
          <Stat label="Read">
            <SignalChip
              label={s.signal === "buy" ? "Buy-low" : s.signal === "sell" ? "Sell-high" : "In-line"}
              tone={signalTone(s.signal)}
            />
          </Stat>
        </>
      )}
    </DomainCard>
  );
}

function AthleticCard({ dossier }: { dossier: PlayerDossier }): JSX.Element {
  return (
    <DomainCard
      kicker="Athletic prior"
      title="The combine measurements"
      section={dossier.athletic}
      emptyLabel="No combine testing on file (not every player tested, and the file carries no team to confirm a join)."
    >
      {(a) => (
        <>
          <Stat label="Draft class">
            <span className="font-mono tabular-nums text-ion-white">{a.draftYear || EM_DASH}</span>
          </Stat>
          <Stat label="Height / weight">
            <span className="font-mono tabular-nums text-ion-white">
              {a.heightIn || EM_DASH}
              {a.weight ? ` · ${a.weight} lb` : ""}
            </span>
          </Stat>
          <Stat label="40-yard dash" hint="seconds">
            <span className="font-mono tabular-nums text-ion-white">{num(a.forty, 2)}</span>
          </Stat>
          <Stat label="Vertical" hint="inches">
            <span className="font-mono tabular-nums text-ion-white">{num(a.vertical, 1)}</span>
          </Stat>
          <Stat label="Broad jump" hint="inches">
            <span className="font-mono tabular-nums text-ion-white">{num(a.broadJump, 0)}</span>
          </Stat>
          <Stat label="3-cone" hint="seconds">
            <span className="font-mono tabular-nums text-ion-white">{num(a.cone, 2)}</span>
          </Stat>
          <Stat label="Shuttle" hint="seconds">
            <span className="font-mono tabular-nums text-ion-white">{num(a.shuttle, 2)}</span>
          </Stat>
          <Stat label="Bench" hint="reps">
            <span className="font-mono tabular-nums text-ion-white">
              {a.bench == null ? EM_DASH : a.bench}
            </span>
          </Stat>
        </>
      )}
    </DomainCard>
  );
}

function AvailabilityCard({ dossier }: { dossier: PlayerDossier }): JSX.Element {
  const statusTone = (s: string): SignalTone =>
    s === "Out" || s === "Doubtful" ? "bad" : s === "Questionable" ? "neutral" : "good";
  return (
    <DomainCard
      kicker="Availability"
      title="Official injury report"
      section={dossier.availability}
      emptyLabel="No injury designation on the latest report — read as healthy / unreported."
    >
      {(av) => (
        <>
          <Stat label="Designation">
            <SignalChip label={av.reportStatus} tone={statusTone(av.reportStatus)} />
          </Stat>
          <Stat label="Injury">
            <span className="text-sm text-ion-white">{av.primaryInjury || EM_DASH}</span>
          </Stat>
          <Stat label="Practice">
            <span className="text-sm text-ion-white">{av.practiceStatus || EM_DASH}</span>
          </Stat>
          <Stat label="Report week">
            <span className="font-mono tabular-nums text-ion-white">{av.week ?? EM_DASH}</span>
          </Stat>
        </>
      )}
    </DomainCard>
  );
}

function MarketCard({ dossier }: { dossier: PlayerDossier }): JSX.Element {
  return (
    <DomainCard
      kicker="Market"
      title="Live crowd sentiment"
      section={dossier.market}
      emptyLabel="Not trending on Sleeper in the current window."
    >
      {(m) => (
        <>
          <Stat label="Direction" hint={`Sleeper, last ${m.lookbackHours}h`}>
            <SignalChip
              label={m.direction === "adding" ? "Adding" : "Dropping"}
              tone={m.direction === "adding" ? "good" : "bad"}
            />
          </Stat>
          <Stat label="Leagues moving him">
            <span className="font-mono tabular-nums text-ion-white">{m.count.toLocaleString()}</span>
          </Stat>
        </>
      )}
    </DomainCard>
  );
}

/** The full grid of domain cards — the DEPTH that PRO unlocks. */
function DomainGrid({ dossier }: { dossier: PlayerDossier }): JSX.Element {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <UsageCard dossier={dossier} />
      <EfficiencyCard dossier={dossier} />
      <RoleCard dossier={dossier} />
      <SituationalCard dossier={dossier} />
      <AthleticCard dossier={dossier} />
      <AvailabilityCard dossier={dossier} />
      <MarketCard dossier={dossier} />
    </div>
  );
}

// ── the page ─────────────────────────────────────────────────────────────────

export default async function PlayerDossierPage({
  params,
}: {
  params: { playerId: string };
}): Promise<JSX.Element> {
  const playerId = decodeURIComponent(params.playerId);
  const [tier, dossier] = await Promise.all([getViewerTier(), loadPlayerDossier(playerId)]);
  const unlocked = canAccess(tier, "PRO");

  const shell = (body: ReactNode): JSX.Element => (
    <div className="min-h-screen bg-surface-base text-ion-white">
      <Atmosphere />
      <Nav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        {body}
      </main>
      <Footer />
    </div>
  );

  if (dossier.status === "source-error") {
    return shell(
      <SourceError
        kicker="Source error"
        title="The dossier isn't loading right now."
        reason="The GSE Rating reads from live nflverse data and it couldn't be reached. We'd rather show you nothing than a number we can't stand behind — check back shortly."
      >
        <p className="font-mono text-xs leading-5 text-ion-2">{dossier.error ?? "UNKNOWN"}</p>
      </SourceError>,
    );
  }

  if (dossier.status === "not-found" || dossier.rating == null) {
    return shell(
      <SourceError
        kicker="Not in the graded pool"
        title="No dossier for this player yet."
        reason="We only carry a GSE Rating for qualified skill players (QB / RB / WR / TE) who clear the involvement floor this season. This id isn't in the current graded pool."
      >
        <Link
          href="/intelligence/rating"
          className="inline-flex min-h-9 items-center justify-center rounded-ds-sm border border-surface-line px-3 py-2 text-xs font-semibold text-ion-2 hover:border-surface-line-strong hover:text-ion-white"
        >
          Back to the GSE Rating board
        </Link>
      </SourceError>,
    );
  }

  return shell(
    <>
      {/* HERO — the Rating + tier + the why are FREE for everyone. */}
      <Reveal>
        <DossierHero dossier={dossier} />
      </Reveal>

      {/* THE DEPTH — every joined signal. FREE sees a blurred teaser behind the
          PRO gate; PRO/ELITE/ADMIN see the full grid. */}
      <Reveal delay={80}>
        <section className="flex flex-col gap-4" aria-label="Advanced signals">
          <div className="flex flex-col gap-1">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-orbital-cyan">
              The full read
            </p>
            <h2 className="text-xl font-semibold text-ion-white">Every signal we hold, joined.</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-ion-1">
              The rating is the headline. The depth behind it — usage, tracking efficiency, scheme,
              scoring-zone equity, the athletic prior, availability, and live market — is part of PRO.
            </p>
          </div>
          {unlocked ? (
            <DomainGrid dossier={dossier} />
          ) : (
            <UpsellGate locked tier="PRO" label="every advanced signal">
              <DomainGrid dossier={dossier} />
            </UpsellGate>
          )}
        </section>
      </Reveal>

      <Reveal delay={140}>
        <div className="flex flex-col gap-3 border-t border-surface-line pt-6">
          <p className="max-w-3xl text-xs leading-5 text-ion-2">{dossier.note}</p>
          <Attribution sourceIds={["nflverse", "sleeper"]} />
        </div>
      </Reveal>
    </>,
  );
}
