/**
 * /glass-ledger — The Glass Ledger (handoff §2 Phase 2).
 *
 * Mounted BESIDE the existing /ledger Trust Ledger (per-pick receipts —
 * a live surface this build must not regress); this route is the new
 * season-aggregate, founder-gated Glass Ledger and stays additive until
 * the founder flips PUBLISH_LEDGER.
 *
 * Founder-gated public performance surface. `loadLedgerView()` (see
 * `@/lib/ledger/ledger-view`) is off by default — nothing real renders
 * until a founder sets `PUBLISH_LEDGER=true` in the deploy environment.
 *
 * Even once published, EVERY metric cell on this page is routed through
 * `renderableMetricOrNull()` (`@/lib/ledger/display-guard`, the §1
 * statutory guard): a number missing a coverage denominator, a Wilson or
 * Clopper-Pearson lower bound, CLV backing, or walk-forward lineage stamp
 * never renders — the page shows an honest, deliberately-styled refusal
 * state in its place instead (`<GuardRefusal>`). `loadLedgerView()` today
 * always resolves to an empty shape (no live ledger-chain entries exist
 * yet), so with the flag on this page currently renders every cell in
 * that honest refusal state. That is intentional, not a bug.
 *
 * DESIGN — "math you can read": this is a design pass on a page with no
 * live data yet. Unpublished isn't an empty placeholder; it's a sealed
 * vault that explains, in three tight sections plus a specification
 * plaque, exactly what will be shown and how anyone can check it without
 * trusting us — the open recompute verifier (`scripts/edge-lab/recompute.ts`,
 * `packages/prediction-engine/src/edge-lab/recompute-verifier.ts`) already
 * exists at the engine layer; this page names it. Published mirrors the
 * same spec plaque, adds a headline tile strip, an nfelo-shaped season
 * table (SU% / ATS vs. close / CLV / MAE) extended with the coverage and
 * lower-bound columns nfelo doesn't publish, and a reliability-bucket
 * table over `calibration.buckets` (previously defined on the contract,
 * never rendered).
 *
 * Copy rules (handoff §1/§3, repo rule #1 — no fake data, no fabricated
 * stats): lead with calibration, never win-rate; no ROI/accuracy claims;
 * no "proven", no bare percentages, no "edge" as a marketing noun. The
 * confidence-tier filter defaults to ALL PICKS — a transparency tool, not
 * a way to cherry-pick a favorable slice.
 *
 * Vocabulary note: the unpublished state must never contain the substring
 * "proven" (pinned by a banned-language regression test), which rules out
 * the word "provenance" there. Both states therefore say "walk-forward
 * lineage" for the guard's fourth statutory leg, consistently, rather than
 * forking the copy per state.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import {
  loadLedgerView,
  type LedgerSeasonRow,
  type LedgerReliabilityBucket,
} from "@/lib/ledger/ledger-view";
import { renderableMetricOrNull, type SubstantiatedMetric } from "@/lib/ledger/display-guard";
import {
  formatClvBacking,
  formatCoverage,
  formatLineageFootnote,
  formatLowerBoundPct,
  formatMetricValue,
  lowerBoundMethodLabel,
  shortHash,
  type MetricUnit,
} from "@/lib/ledger/format";
import { NUMERIC_TEXT_CLASS, formatCount } from "@/lib/format/stat";

export const dynamic = "force-dynamic";

const UNPUBLISHED_HEADLINE = "The Glass Ledger is sealed — nothing is published until the founder flips PUBLISH_LEDGER.";

const ALL_PICKS_SENTENCE =
  "The record defaults to all picks, every tier, every sport we cover — a transparency tool, never a cherry-pick.";

const NOT_SUBSTANTIATED_TEXT =
  "Not yet substantiated (needs coverage + lower bound + CLV + provenance).";

interface SeasonColumnDef {
  readonly key: "suPct" | "atsVsClose" | "clv" | "mae";
  readonly label: string;
  readonly title: string;
  readonly unit: MetricUnit;
}

const SEASON_COLUMNS: readonly SeasonColumnDef[] = [
  { key: "suPct", label: "SU%", title: "Straight-up settle rate", unit: "percent" },
  {
    key: "atsVsClose",
    label: "ATS vs. Close",
    title: "Against-the-spread rate measured against the closing line",
    unit: "percent",
  },
  { key: "clv", label: "CLV", title: "Realized closing-line value", unit: "bps" },
  {
    key: "mae",
    label: "MAE",
    title: "Mean absolute error between projected and settled confidence",
    unit: "score",
  },
];

interface SealedVaultSection {
  readonly title: string;
  readonly body: string;
  readonly code?: string;
}

const SEALED_VAULT_SECTIONS: readonly SealedVaultSection[] = [
  {
    title: "Sealed before kickoff",
    body:
      "Every pick is written and hash-linked before its game starts, never after. Each entry points to the one written just before it, so changing any past record breaks the chain at that point and every point after it. There is no update path. Only append.",
  },
  {
    title: "Graded against the close",
    body:
      "Once a game ends, the pick is scored first against the closing line: the price the market settled on right before kickoff, and the one benchmark that can't be cherry-picked after the fact. Calibration leads. A single headline rate never speaks alone.",
  },
  {
    title: "Independently re-computable",
    body:
      "Anyone can replay the math without taking our word for it. Export the chain and run the open recompute verifier: it walks every hash link, checks that every pick was decided before its own kickoff, and re-derives every CLV figure straight from the recorded prices.",
    code: "npx tsx scripts/edge-lab/recompute.ts ledger-export.json",
  },
];

const SUBSTANTIATION_LEGS = [
  {
    title: "Coverage",
    body: "How many eligible picks actually fired, shown as a fraction — never a bare rate floating free of its sample.",
  },
  {
    title: "Lower bound",
    body: "The conservative edge of a Wilson or Clopper-Pearson interval, not the flattering point estimate.",
  },
  {
    title: "CLV backing",
    body: "Graded against the closing line — the one benchmark that can't be cherry-picked after kickoff.",
  },
  {
    title: "Walk-forward lineage",
    body: "Which model version produced it, stamped and hash-linked at generation time, never restated after the fact.",
  },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const view = loadLedgerView();
  return {
    title: "The Glass Ledger",
    description: view.published
      ? "The public record of every graded pick: calibration first, scored on CLV vs the close, hash-chained and independently recomputable. Gated until each number is honestly substantiated."
      : "The Glass Ledger is sealed. Nothing is published until the founder flips PUBLISH_LEDGER.",
    alternates: { canonical: "/glass-ledger" },
    ...(view.published ? {} : { robots: { index: false, follow: true } }),
  };
}

// ── Decorative chain motif — CSS/SVG only, no external assets ──────────────

function ChainMotif({ className, gradientId }: { className?: string; gradientId: string }): JSX.Element {
  const linkCount = 8;
  return (
    <svg aria-hidden="true" viewBox="0 0 400 24" preserveAspectRatio="none" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="52%" stopColor="#FF38C7" />
          <stop offset="100%" stopColor="#7B61FF" />
        </linearGradient>
      </defs>
      {Array.from({ length: linkCount }).map((_, i) => (
        <rect
          key={i}
          x={i * 48 + 4}
          y={7}
          width={30}
          height={10}
          rx={5}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={2}
          opacity={0.35 + (i / linkCount) * 0.5}
        />
      ))}
    </svg>
  );
}

// ── The specification plaque — the four-field rule, displayed as a promise ─

function SubstantiationPlaque(): JSX.Element {
  return (
    <section aria-labelledby="ledger-plaque-heading" className="surface-card mt-10 p-6 sm:p-8">
      <p className="eyebrow">Specification</p>
      <h2 id="ledger-plaque-heading" className="mt-2 text-lg font-bold text-ion-white">
        No number renders here without all four.
      </h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {SUBSTANTIATION_LEGS.map((leg, i) => (
          <div key={leg.title}>
            <span aria-hidden="true" className="font-mono text-xs text-orbital-cyan">
              0{i + 1}
            </span>
            <h3 className="mt-1 text-sm font-semibold text-ion-white">{leg.title}</h3>
            <p className="mt-1 text-xs leading-5 text-ion-2">{leg.body}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 border-t border-mineral pt-4 font-mono text-xs leading-6 text-ion-1">
        The promise: no number renders here without coverage, a Wilson or Clopper-Pearson lower
        bound, CLV backing, and walk-forward lineage.
      </p>
    </section>
  );
}

// ── The guard's refusal state — a deliberate, styled element, not a blank ──

function LockGlyph({ className }: { className?: string }): JSX.Element {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function GuardRefusal({ size = "md" }: { size?: "sm" | "md" }): JSX.Element {
  const compact = size === "sm";
  return (
    <span
      data-testid="ledger-guard-refusal"
      className={compact ? "inline-flex flex-col items-start gap-1" : "flex flex-col items-start gap-1.5"}
    >
      <span
        className={[
          "inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide text-ion-2",
          compact ? "text-[10px]" : "text-xs",
        ].join(" ")}
      >
        <LockGlyph className={compact ? "h-3 w-3 shrink-0" : "h-3.5 w-3.5 shrink-0"} />
        Insufficient record — not shown
      </span>
      <span className={compact ? "text-[10px] leading-4 text-ion-2" : "text-[11px] leading-5 text-ion-2"}>
        {NOT_SUBSTANTIATED_TEXT}
      </span>
    </span>
  );
}

// ── Compact metric display — season-table cells and bucket rows ────────────

function MetricValue({
  metric,
  unit,
}: {
  metric: SubstantiatedMetric | null | undefined;
  unit: MetricUnit;
}): JSX.Element {
  const safe = metric ? renderableMetricOrNull(metric) : null;
  if (!safe) return <GuardRefusal size="sm" />;
  return (
    <span
      data-testid="ledger-metric-value"
      title={`Coverage ${formatCoverage(safe)} · ${lowerBoundMethodLabel(safe)} lower bound ${formatLowerBoundPct(
        safe,
      )} · CLV backing ${formatClvBacking(safe)} · ${formatLineageFootnote(safe)}`}
      className={`font-mono text-sm text-ion-white ${NUMERIC_TEXT_CLASS}`}
    >
      {formatMetricValue(safe, unit)}
    </span>
  );
}

/** Coverage/LCB columns are derived from the season's headline SU% bundle. */
function DerivedValue({
  suPct,
  field,
}: {
  suPct: SubstantiatedMetric | null | undefined;
  field: "coverage" | "lowerBound";
}): JSX.Element {
  const safe = suPct ? renderableMetricOrNull(suPct) : null;
  if (!safe) return <GuardRefusal size="sm" />;
  return (
    <span data-testid="ledger-metric-value" className={`font-mono text-sm text-ion-white ${NUMERIC_TEXT_CLASS}`}>
      {field === "coverage" ? formatCoverage(safe) : formatLowerBoundPct(safe)}
    </span>
  );
}

// ── Headline tile — full detail: value + coverage + LCB + CLV + lineage ────

function MetricTile({
  label,
  metric,
  unit,
}: {
  label: string;
  metric: SubstantiatedMetric | null | undefined;
  unit: MetricUnit;
}): JSX.Element {
  const safe = metric ? renderableMetricOrNull(metric) : null;
  return (
    <div className="surface-card flex flex-col gap-3 p-5">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ion-2">{label}</p>
      {safe ? (
        <>
          <p
            data-testid="ledger-metric-value"
            className={`font-mono text-3xl font-bold text-ion-white ${NUMERIC_TEXT_CLASS}`}
          >
            {formatMetricValue(safe, unit)}
          </p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] text-ion-2">
            <div>
              <dt className="text-ion-2">Coverage</dt>
              <dd className={NUMERIC_TEXT_CLASS}>{formatCoverage(safe)}</dd>
            </div>
            <div>
              <dt className="text-ion-2">{lowerBoundMethodLabel(safe)} LCB</dt>
              <dd className={NUMERIC_TEXT_CLASS}>{formatLowerBoundPct(safe)}</dd>
            </div>
            <div>
              <dt className="text-ion-2">CLV backing</dt>
              <dd className={NUMERIC_TEXT_CLASS}>{formatClvBacking(safe)}</dd>
            </div>
            <div>
              <dt className="text-ion-2">Lineage</dt>
              <dd className={`truncate ${NUMERIC_TEXT_CLASS}`} title={formatLineageFootnote(safe)}>
                {safe.provenance.modelVersion} · {shortHash(safe.provenance.stampHash)}
              </dd>
            </div>
          </dl>
        </>
      ) : (
        <GuardRefusal size="md" />
      )}
    </div>
  );
}

// ── Season row ───────────────────────────────────────────────────────────

function SeasonRow({ row }: { row: LedgerSeasonRow }): JSX.Element {
  return (
    <tr className="border-b border-mineral/60">
      <td className="px-4 py-3 text-sm text-ion-white">
        {row.season} <span className="text-ion-2">· {row.sport}</span>
      </td>
      {SEASON_COLUMNS.map((col) => (
        <td key={col.key} className="px-4 py-3">
          <MetricValue metric={row[col.key]} unit={col.unit} />
        </td>
      ))}
      <td className="px-4 py-3">
        <DerivedValue suPct={row.suPct} field="coverage" />
      </td>
      <td className="px-4 py-3">
        <DerivedValue suPct={row.suPct} field="lowerBound" />
      </td>
    </tr>
  );
}

// ── Reliability bucket row ──────────────────────────────────────────────

function BucketRow({ bucket }: { bucket: LedgerReliabilityBucket }): JSX.Element {
  return (
    <tr className="border-b border-mineral/60">
      <td className="px-4 py-3 text-sm text-ion-white">{bucket.label}</td>
      <td className="px-4 py-3">
        <MetricValue metric={bucket.predicted} unit="percent" />
      </td>
      <td className="px-4 py-3">
        <MetricValue metric={bucket.observed} unit="percent" />
      </td>
    </tr>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export default async function LedgerPage(): Promise<JSX.Element> {
  const view = loadLedgerView();

  if (!view.published) {
    return (
      <div className="flex min-h-screen flex-col bg-obsidian text-ion-white">
        <Nav />
        <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-4 py-16 sm:px-6">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-orbital-cyan">
            The Glass Ledger
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ion-white sm:text-4xl">
            {UNPUBLISHED_HEADLINE}
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-ion-1">
            A public, tamper-evident record, computed in the open — not a marketing claim, a
            mechanism. Here is exactly what it will be, before there is a single real number on
            it.
          </p>

          <ChainMotif gradientId="glass-ledger-chain-vault" className="mt-8 h-6 w-full max-w-md" />

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {SEALED_VAULT_SECTIONS.map((section, i) => (
              <article key={section.title} className="surface-card p-6">
                <span aria-hidden="true" className="font-mono text-2xl tabular-nums text-orbital-cyan">
                  0{i + 1}
                </span>
                <h2 className="mt-3 text-lg font-bold text-ion-white">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ion-1">{section.body}</p>
                {section.code !== undefined && (
                  <code className="mt-4 block overflow-x-auto whitespace-pre rounded-lg bg-titanium px-3 py-2 font-mono text-[11px] text-ion-1">
                    {section.code}
                  </code>
                )}
              </article>
            ))}
          </div>

          <SubstantiationPlaque />

          <section aria-labelledby="ledger-filter-note-heading" className="mt-10">
            <h2
              id="ledger-filter-note-heading"
              className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2"
            >
              No cherry-picking, by design
            </h2>
            <p className="mt-2 text-sm leading-6 text-ion-1">{ALL_PICKS_SENTENCE}</p>
          </section>

          <p className="mt-10 border-t border-mineral pt-6 text-sm leading-6 text-ion-2">
            Nothing on this page is real yet, and we would rather ship it empty than ship it
            fabricated. No sample rows, no placeholder numbers, no premature performance
            teasers — just this design, until there is a real, substantiated record to show.
          </p>

          {/*
            The sealed state's one outward action.

            A page that says "you will be able to check this" and offers no way
            to learn how leaves the reader with nothing to do but trust it —
            which is the posture this whole surface exists to reject. The
            method does not depend on there being rows yet, so it can be
            published now even though the record cannot.

            Wording note: the unpublished state must not contain the substring
            "proven" (pinned by a banned-language regression test), which is why
            this reads "check" rather than any cognate of that word.
          */}
          <p className="mt-6 text-sm leading-6 text-ion-1">
            The method does not depend on the rows existing yet, so it is
            published already:{" "}
            <Link
              href="/how-to-verify-a-record"
              className="underline hover:text-orbital-cyan"
            >
              how to check a prediction record
            </Link>{" "}
            — including the checks that catch a record edited after the fact.
            Read it now and hold this page to it later.
          </p>

          <RiskDisclosure variant="compact" className="mt-10 text-center" />
        </main>
        <Footer />
      </div>
    );
  }

  const { seasons, calibration, significance, note } = view;
  const latestSeason = seasons[0];
  const buckets = calibration?.buckets ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-carbon text-ion">
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-16 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-orbital-cyan">
          The Glass Ledger
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ion-white sm:text-4xl">
          The record, computed in the open.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-ion-1">
          Every pick is recorded before kickoff, sealed into a hash-chained record, and never
          rewritten after the fact. This page leads with calibration — how well confidence numbers
          matched reality — and closing-line value, not a single headline stat. {note}
        </p>

        <ChainMotif gradientId="glass-ledger-chain-published" className="mt-6 h-5 w-full max-w-md" />

        <SubstantiationPlaque />

        {/* Headline strip — the same guard, at a glance. */}
        <section aria-labelledby="ledger-headline-heading" className="mt-10">
          <h2 id="ledger-headline-heading" className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">
            At a glance
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile label="SU% · latest season" metric={latestSeason?.suPct} unit="percent" />
            <MetricTile label="CLV · latest season" metric={latestSeason?.clv} unit="bps" />
            <MetricTile label="Calibration · Brier score" metric={calibration?.brierScore} unit="score" />
            <MetricTile
              label="Toward significance · LCB clears breakeven"
              metric={significance?.lowerBoundClearsBreakeven}
              unit="percent"
            />
          </div>
        </section>

        {/* Confidence-tier filter — a transparency tool, never a cherry-pick. */}
        <section aria-labelledby="ledger-filter-heading" className="mt-10">
          <h2 id="ledger-filter-heading" className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">
            Confidence tier
          </h2>
          <p className="mt-2 text-sm leading-6 text-ion-1">{ALL_PICKS_SENTENCE}</p>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Confidence tier filter">
            <span
              aria-current="true"
              className="rounded-full border border-orbital-cyan/60 bg-orbital-cyan/10 px-3 py-1 text-xs font-semibold text-orbital-cyan"
            >
              All picks (default)
            </span>
            <span className="rounded-full border border-mineral px-3 py-1 text-xs text-ion-2">High</span>
            <span className="rounded-full border border-mineral px-3 py-1 text-xs text-ion-2">Medium</span>
            <span className="rounded-full border border-mineral px-3 py-1 text-xs text-ion-2">Low</span>
          </div>
        </section>

        {/* Season table — the nfelo shape (SU% / ATS vs. close / CLV), plus
            the coverage and lower-bound columns nfelo doesn't publish. */}
        <section aria-labelledby="ledger-seasons-heading" className="mt-10">
          <h2 id="ledger-seasons-heading" className="text-xl font-bold text-ion-white">
            By season
          </h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-mineral">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-mineral bg-eclipse/50">
                  <th scope="col" className="px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ion-2">
                    Season
                  </th>
                  {SEASON_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      title={col.title}
                      className="px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ion-2"
                    >
                      {col.label}
                    </th>
                  ))}
                  <th
                    scope="col"
                    title="Coverage backing the season's SU% figure: eligible picks fired / eligible picks total"
                    className="px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ion-2"
                  >
                    Coverage
                  </th>
                  <th
                    scope="col"
                    title="Wilson or Clopper-Pearson lower bound backing the season's SU% figure — our addition, not published by comparable public trackers"
                    className="px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ion-2"
                  >
                    LCB
                  </th>
                </tr>
              </thead>
              <tbody>
                {seasons.length === 0 ? (
                  <tr>
                    <td colSpan={SEASON_COLUMNS.length + 3} className="px-4 py-8 text-sm leading-6 text-ion-2">
                      No seasons recorded yet. This table fills in as settled picks accumulate in
                      the ledger chain — nothing is backfilled or estimated.
                    </td>
                  </tr>
                ) : (
                  seasons.map((row) => <SeasonRow key={`${row.season}-${row.sport}`} row={row} />)
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Reliability / Brier calibration */}
        <section aria-labelledby="ledger-calibration-heading" className="mt-10">
          <h2 id="ledger-calibration-heading" className="text-xl font-bold text-ion-white">
            Reliability &amp; calibration
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ion-1">
            The Brier score decomposition and the reliability curve (projected confidence vs.
            settled outcome, by confidence band) render here once there is a substantiated
            sample to compute them from.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <MetricTile label="Brier score" metric={calibration?.brierScore} unit="score" />
          </div>
          {buckets.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-mineral">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-mineral bg-eclipse/50">
                    <th scope="col" className="px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ion-2">
                      Confidence band
                    </th>
                    <th scope="col" className="px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ion-2">
                      Predicted
                    </th>
                    <th scope="col" className="px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ion-2">
                      Observed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.map((bucket) => (
                    <BucketRow key={bucket.label} bucket={bucket} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* n-toward-significance */}
        <section aria-labelledby="ledger-significance-heading" className="mt-10">
          <h2 id="ledger-significance-heading" className="text-xl font-bold text-ion-white">
            Progress toward a substantiated sample
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ion-1">
            A result only counts once its lower bound clears breakeven with real coverage and CLV
            backing behind it. This panel tracks distance to that bar honestly, not a projected
            arrival date.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <MetricTile
              label="Lower bound clears breakeven"
              metric={significance?.lowerBoundClearsBreakeven}
              unit="percent"
            />
          </div>
          {significance && (
            <p className={`mt-3 text-xs text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
              {formatCount(significance.settledCount)} settled toward a target of{" "}
              {formatCount(significance.targetCount)}.
            </p>
          )}
        </section>

        <RiskDisclosure variant="compact" className="mt-12 text-center" />
      </main>
      <Footer />
    </div>
  );
}
