/**
 * /reliability — "The receipts" proof hub.
 *
 * A single unified overview of every honesty pillar the platform already proves
 * in depth elsewhere, each shown as a COMPACT summary with a deep-link to its
 * full surface:
 *
 *   1. Calibration / reliability  → reuses CalibrationPanel + calibrationCurve()
 *                                    (full detail: /performance)
 *   2. Closing-line value         → reuses loadPublicClvPolicy() / summarizeClv
 *                                    (full detail: /clv)
 *   3. Edge significance          → loadEdgeSignificance() permutation test
 *                                    "does the record beat a no-edge null?"
 *                                    (this hub is its only home; intro at /intelligence)
 *   4. Tamper-evident record      → reuses loadProofOfRecord() Merkle root
 *                                    (full detail: /proof)
 *
 * This is NOT a duplicate of /performance, /clv, or /proof — it is the index
 * that points at all of them. Each section is loader-backed and gated; below a
 * gate it renders an explicit "building the record — N/MIN settled" empty state.
 * No fabricated numbers, no win-rate/ROI/"guaranteed" language (CLAUDE.md #1/#2/#5).
 *
 * Design idiom matches /performance, /clv, /proof (obsidian, cyan/ultraviolet
 * signal palette, surface cards, eyebrow, NUMERIC_TEXT_CLASS, honest empty state,
 * the honest-band 95%-interval framing). Brand tokens via lib/brand.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { RingGauge } from "@/components/ui/ring-gauge";
import { CalibrationPanel } from "@/components/performance/calibration-panel";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { loadPublicClvPolicy } from "@/lib/performance/public-clv-policy";
import { loadEdgeSignificance } from "@/lib/proof/load-edge-significance";
import { loadProofOfRecord } from "@/lib/proof/load-proof-of-record";
import { BRAND_COLORS, BRAND_NAME } from "@/lib/brand";
import {
  NUMERIC_TEXT_CLASS,
  formatCount,
  formatPercent,
  formatRatioAsPercent,
} from "@/lib/format/stat";

export const dynamic = "force-dynamic";

const TITLE = `The Receipts — Reliability & Proof — ${BRAND_NAME}`;
const DESCRIPTION =
  "One page for every honesty pillar: confidence calibration, closing-line value, an edge-significance test against a no-edge null, and the tamper-evident Merkle record. Every number is loader-backed and gated — nothing shows until the settled sample can honestly support it.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/reliability" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/reliability",
    type: "website",
    siteName: BRAND_NAME,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// ── Shared empty / gated state ────────────────────────────────────────────────
// Mirrors the /clv accruing-progress framing: explicit "N / MIN settled", a
// progress bar, and the discipline note — never a fabricated stand-in number.

function GatedProgress({
  current,
  min,
  message,
}: {
  current: number;
  min: number;
  message: string;
}) {
  const safeMin = Math.max(min, 1);
  const pct = Math.min(100, Math.round((current / safeMin) * 100));
  return (
    <div
      data-testid="reliability-gated"
      className="rounded-xl border p-5"
      style={{
        borderColor: "rgba(255,180,84,0.25)",
        background:
          "linear-gradient(135deg, rgba(255,180,84,0.05) 0%, rgba(26,18,48,0.6) 100%)",
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-caution animate-live-pulse" aria-hidden="true" />
        <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
          Building the record
        </h3>
      </div>
      <p className="text-sm leading-7 text-ink-300">{message}</p>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-ink-400">
          <span>Settled canonical picks</span>
          <span className={`tabular-nums text-ink-300 ${NUMERIC_TEXT_CLASS}`}>
            {formatCount(current)} / {formatCount(safeMin)}
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: BRAND_COLORS.orbitalCyan }}
          />
        </div>
      </div>
      <p className="mt-4 text-[11px] text-ink-500">
        No number is shown before the sample is large enough to be honest — the
        same discipline as the public win rate.
      </p>
    </div>
  );
}

// ── Pillar card shell ─────────────────────────────────────────────────────────

function PillarCard({
  index,
  eyebrow,
  title,
  lede,
  accent,
  href,
  hrefLabel,
  children,
}: {
  index: string;
  eyebrow: string;
  title: string;
  lede: string;
  accent: string;
  href: string;
  hrefLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="overflow-hidden rounded-2xl border p-6"
      style={{
        borderColor: `${accent}22`,
        background: `linear-gradient(140deg, ${accent}06 0%, rgba(8,6,20,0.7) 70%)`,
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>
            <span className="mr-2 text-ink-500">{index}</span>
            {eyebrow}
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-300">{lede}</p>
        </div>
        <Link
          href={href}
          className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:text-white"
          style={{ borderColor: `${accent}40`, color: accent }}
        >
          {hrefLabel} →
        </Link>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

// ── Section: edge-significance verdict ────────────────────────────────────────

function edgeVerdictHexColor(significant: boolean): string {
  return significant ? BRAND_COLORS.orbitalCyan : "rgba(255,255,255,0.55)";
}

function EdgeSignificanceSummary({
  report,
}: {
  report: Awaited<ReturnType<typeof loadEdgeSignificance>>;
}) {
  if (report === null) {
    return (
      <p className="text-sm leading-7 text-ink-300">
        The edge-significance test compares the model&apos;s settled win record
        against a no-edge null — a market-implied baseline that wins only at the
        price&apos;s fair probability. It opens once enough canonical picks have
        settled to run the permutation test honestly. See the gate on the
        calibration card above for current progress.
      </p>
    );
  }

  const { result } = report;
  const verdictColor = edgeVerdictHexColor(result.significant);

  return (
    <div data-testid="reliability-edge-significance">
      <div className="flex flex-wrap items-center gap-5">
        <RingGauge
          value={Math.min(100, Math.max(0, (1 - result.winRatePValue) * 100))}
          display={result.winRatePValue.toFixed(3)}
          caption="p-value"
          size={120}
          color={verdictColor}
        />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold" style={{ color: verdictColor }}>
            {result.significant
              ? "The record beats a no-edge null"
              : "Not yet distinguishable from a no-edge null"}
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-300">
            Under the null, each pick wins only with its market-implied
            probability. Across{" "}
            <span className={NUMERIC_TEXT_CLASS}>{formatCount(result.picks)}</span>{" "}
            decided canonical picks, the model won{" "}
            <span className={NUMERIC_TEXT_CLASS}>{formatCount(result.observedWins)}</span> vs a
            no-edge expectation of{" "}
            <span className={NUMERIC_TEXT_CLASS}>{result.expectedWins.toFixed(1)}</span>. A
            no-edge baseline would match or beat that win count in{" "}
            <span className={NUMERIC_TEXT_CLASS}>{formatRatioAsPercent(result.winRatePValue)}</span>{" "}
            of{" "}
            <span className={NUMERIC_TEXT_CLASS}>{formatCount(result.trials)}</span>{" "}
            Monte-Carlo permutations.
          </p>
        </div>
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-ink-500">
        Null basis:{" "}
        <span className={NUMERIC_TEXT_CLASS}>{formatCount(report.marketNullCount)}</span> picks
        priced against a multi-book market consensus,{" "}
        <span className={NUMERIC_TEXT_CLASS}>{formatCount(report.constructionNullCount)}</span>{" "}
        spread/total picks priced to the 50% construction baseline. This is
        evidence, not a guarantee — a low p-value means the wins exceed luck so
        far, not that future results are assured. Computed{" "}
        {new Date(report.generatedAt).toUTCString()}.
      </p>
    </div>
  );
}

// ── Section: CLV summary ──────────────────────────────────────────────────────

function ClvSummary({
  policy,
  minGraded,
}: {
  policy: Awaited<ReturnType<typeof loadPublicClvPolicy>> | null;
  minGraded: number;
}) {
  if (!policy || !policy.canExposeClv || policy.beatCloseRatePct === null) {
    return (
      <GatedProgress
        current={policy?.gradedSampleSize ?? 0}
        min={minGraded}
        message={
          policy?.publicMessage ??
          "Closing line value is still accruing. The beat-close rate opens once enough picks have settled and been graded against the closing line."
        }
      />
    );
  }

  return (
    <div data-testid="reliability-clv" className="flex flex-wrap items-center gap-5">
      <RingGauge
        value={policy.beatCloseRatePct}
        display={`${policy.beatCloseRatePct.toFixed(1)}%`}
        caption="Beat the close"
        size={120}
        color={BRAND_COLORS.orbitalCyan}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-6 text-ink-300">
          Beat the close on{" "}
          <span className={NUMERIC_TEXT_CLASS}>{formatPercent(policy.beatCloseRatePct)}</span>{" "}
          of{" "}
          <span className={NUMERIC_TEXT_CLASS}>{formatCount(policy.gradedSampleSize)}</span>{" "}
          graded canonical picks — beat{" "}
          <span className={NUMERIC_TEXT_CLASS}>{formatCount(policy.beatCloseCount)}</span> ·
          matched{" "}
          <span className={NUMERIC_TEXT_CLASS}>{formatCount(policy.matchedCloseCount)}</span> ·
          lost{" "}
          <span className={NUMERIC_TEXT_CLASS}>{formatCount(policy.lostToCloseCount)}</span>.
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
          Closing line value is the sharp-credible leading indicator of a real
          edge — not a guarantee of future results.
        </p>
      </div>
    </div>
  );
}

// ── Section: calibration compact summary ──────────────────────────────────────

function brierReadShort(brier: number | null): string {
  if (brier === null) return "Not enough settled picks yet.";
  if (brier <= 0.18) return "Sharp — confidence tracks outcomes closely.";
  if (brier <= 0.25) return "Better than a coin flip — calibration is holding.";
  return "Above the coin-flip baseline — calibration needs work.";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ReliabilityHubPage() {
  const gates = getReadinessGates();
  const minSettled =
    gates.minSettledPicksForLearning > 0 ? gates.minSettledPicksForLearning : 25;

  // Every section is loader-backed and gated. Each loader fails closed (null /
  // empty) so a transient read error never fabricates a number.
  const [calibration, clvPolicy, edgeReport, proofBoard] = await Promise.all([
    loadPublicCalibrationReport().catch(() => null),
    loadPublicClvPolicy(db, {
      canExposePerformanceStats: gates.canExposePerformanceStats,
      minGradedForPublic: gates.minSettledPicksForLearning,
    }).catch(() => null),
    loadEdgeSignificance({
      canExposePerformanceStats: gates.canExposePerformanceStats,
      minDecidedForPublic: minSettled,
    }).catch(() => null),
    loadProofOfRecord().catch(() => null),
  ]);

  const calData = calibration?.data ?? null;
  const calBrier = calData?.brierScore ?? null;
  const calSample = calData?.sampleSize ?? 0;
  const merkleRoot = proofBoard?.merkleRoot ?? "";
  const totalSettled = proofBoard?.totalSettled ?? 0;
  const hasMerkleSet = Boolean(merkleRoot) && totalSettled > 0;

  return (
    <div
      className="relative isolate flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack, color: "white" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem]"
        style={{
          background: `radial-gradient(55% 70% at 50% 0%, ${BRAND_COLORS.orbitalCyan}12, transparent 60%), radial-gradient(35% 50% at 80% 20%, ${BRAND_COLORS.softUltraviolet}0d, transparent 65%)`,
        }}
      />
      <GeneratedPlate assetId="proof-crystal" className="absolute inset-0 -z-10 opacity-10" />
      <Nav />

      <main id="main-content" className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* ── Hero ── */}
          <div className="mb-12 pt-12">
            <Reveal>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: BRAND_COLORS.orbitalCyan,
                  borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                  backgroundColor: `${BRAND_COLORS.orbitalCyan}0d`,
                }}
              >
                The receipts
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1
                className="mt-5 font-display text-balance text-white"
                style={{ fontSize: "clamp(2.4rem, 7vw, 4rem)", lineHeight: 1.0, letterSpacing: "-0.02em" }}
              >
                Four ways we prove it.{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan} 0%, ${BRAND_COLORS.softUltraviolet} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  None of them is a screenshot.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-300">
                Calibration, closing-line value, an edge-significance test against
                a no-edge null, and a tamper-evident record. Each number on this
                page comes from a loader behind a gate — below the gate you see an
                honest &ldquo;building the record&rdquo; state, never a fabricated
                figure. Deep-link into any pillar for the full detail.
              </p>
            </Reveal>
          </div>

          <Stagger className="flex flex-col gap-6" step={70}>
            {/* ── Pillar 1: Calibration / reliability ── */}
            <Reveal>
              <PillarCard
                index="01"
                eyebrow="Calibration"
                title="Does higher confidence win more?"
                lede="The reliability diagram: observed vs expected win rate per confidence bucket, the Brier score, and the honest 95% band — not a point claim."
                accent={BRAND_COLORS.orbitalCyan}
                href="/performance"
                hrefLabel="Full calibration report"
              >
                {/* Compact calibration headline */}
                <div className="mb-5 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">
                      Brier score
                    </p>
                    <p className={`mt-1 text-2xl font-bold text-ion ${NUMERIC_TEXT_CLASS}`}>
                      {calBrier === null ? "—" : calBrier.toFixed(3)}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-400">{brierReadShort(calBrier)}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">
                      Settled sample
                    </p>
                    <p className={`mt-1 text-2xl font-bold text-white ${NUMERIC_TEXT_CLASS}`}>
                      {formatCount(calSample)}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-400">
                      canonical picks behind the curve
                    </p>
                  </div>
                </div>
                {/* The full panel reuses calibrationCurve() + honest-band's 95% framing */}
                <CalibrationPanel />
              </PillarCard>
            </Reveal>

            {/* ── Pillar 2: Closing-line value ── */}
            <Reveal>
              <PillarCard
                index="02"
                eyebrow="Closing line value"
                title="Did we beat the close?"
                lede="The share of graded picks that beat where the market settled — the leading indicator tout services almost never publish."
                accent={BRAND_COLORS.orbitalCyan}
                href="/clv"
                hrefLabel="Full CLV report"
              >
                <ClvSummary policy={clvPolicy} minGraded={minSettled} />
              </PillarCard>
            </Reveal>

            {/* ── Pillar 3: Edge significance ── */}
            <Reveal>
              <PillarCard
                index="03"
                eyebrow="Edge significance"
                title="Does the record beat luck?"
                lede="A Monte-Carlo permutation test: how often would a no-edge baseline match the model's settled win count? A low p-value is evidence the edge is real, not noise."
                accent={BRAND_COLORS.softUltraviolet}
                href="/intelligence"
                hrefLabel="How the engine works"
              >
                <EdgeSignificanceSummary report={edgeReport} />
              </PillarCard>
            </Reveal>

            {/* ── Pillar 4: Tamper-evident record ── */}
            <Reveal>
              <PillarCard
                index="04"
                eyebrow="Tamper-evident record"
                title="The record can't be rewritten."
                lede="Every settled pick is hashed at generation time into a Merkle tree. Edit one pick and the published root changes — anyone can re-derive it and catch the difference."
                accent={BRAND_COLORS.ionMagenta}
                href="/proof"
                hrefLabel="Full proof of record"
              >
                {hasMerkleSet ? (
                  <div data-testid="reliability-merkle">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
                      Committed Merkle root
                    </p>
                    <p className="mt-1 text-[11px] text-ink-400">
                      Over{" "}
                      <span className={NUMERIC_TEXT_CLASS}>{formatCount(totalSettled)}</span>{" "}
                      settled canonical picks · computed{" "}
                      {new Date(proofBoard!.generatedAt).toUTCString()}
                    </p>
                    <code
                      className={`mt-3 block break-all rounded px-3 py-2 font-mono text-[11px] text-ink-300 ${NUMERIC_TEXT_CLASS}`}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.10)",
                      }}
                    >
                      {merkleRoot}
                    </code>
                  </div>
                ) : (
                  <p data-testid="reliability-merkle-empty" className="text-sm leading-7 text-ink-300">
                    The committed Merkle root appears once the first canonical
                    pick settles. Until then there is no set to commit — and we do
                    not publish a placeholder root. Bootstrap-era picks are
                    excluded from the committed set by design.
                  </p>
                )}
              </PillarCard>
            </Reveal>
          </Stagger>

          {/* ── Deep-link strip ── */}
          <Reveal delay={120}>
            <Stagger className="mt-10 flex flex-wrap gap-3 text-sm" step={50}>
              {[
                { href: "/performance", label: "The Calibration Report →" },
                { href: "/clv", label: "Closing line value →" },
                { href: "/proof", label: "Proof of record →" },
                { href: "/accountability", label: "Full accountability →" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg border px-4 py-2 text-ink-300 transition-colors hover:border-orbital-cyan/30 hover:text-white"
                  style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)" }}
                >
                  {link.label}
                </Link>
              ))}
            </Stagger>
          </Reveal>

          <div className="mt-10">
            <RiskDisclosure variant="card" includePastPerformance />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
