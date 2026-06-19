/**
 * Glass-Box Pick Explainer — presentation.
 *
 * Server component. Renders the public header (grade, Edge Index, result) of
 * each REAL published pick plus its factor trail, with server-side tier gating:
 *
 *  - PRO+ (`canSeeFactorBreakdown`): the full per-factor breakdown, including
 *    the numeric contribution of every factor.
 *  - FREE: the factor NAMES and structure (so the transparency is real), but
 *    every numeric contribution is redacted behind a tasteful upsell. The gated
 *    numbers are NEVER serialized into the DOM for a FREE viewer — the redacted
 *    branch renders a placeholder, not the value.
 *
 * Edge Index is public on every tier (`canSeeEdgeScore`). Confidence is shown
 * only when `canSeeConfidence` is true; the loader intentionally does not carry
 * the confidence number, so there is nothing paid to leak here.
 *
 * Honest empty state when there are no published picks to explain.
 */

import Link from "next/link";
import type { Entitlements, FactorBreakdown, PickGrade, PickResult } from "@sports/types";
import { PICK_GRADE_LABELS } from "@sports/types";
import { BRAND_COLORS } from "@/lib/brand";
import type { GlassBoxPick, GlassBoxResult } from "@/lib/lab/glass-box";

interface GlassBoxExplainerProps {
  picks: GlassBoxResult;
  entitlements: Entitlements;
}

/** The named scoring factors, with their score range, in display order. */
const FACTOR_ROWS: ReadonlyArray<{
  label: string;
  key: keyof FactorBreakdown;
  max: number;
}> = [
  { label: "Bookmaker consensus", key: "consensusScore", max: 30 },
  { label: "Market depth", key: "marketDepthScore", max: 20 },
  { label: "Pricing edge", key: "edgeScore", max: 25 },
  { label: "Line movement", key: "lineMovementScore", max: 15 },
];

function gradeColor(grade: PickGrade): string {
  switch (grade) {
    case "ELITE_PLAY":
      return BRAND_COLORS.ionMagenta;
    case "STRONG_PLAY":
      return "#5FD9A3";
    case "SOLID_PLAY":
      return BRAND_COLORS.orbitalCyan;
    default:
      return BRAND_COLORS.softUltravioletText;
  }
}

function resultStyle(result: PickResult): { label: string; color: string } | null {
  switch (result) {
    case "WIN":
      return { label: "Win", color: "#5FD9A3" };
    case "LOSS":
      return { label: "Loss", color: "#FF6470" };
    case "PUSH":
      return { label: "Push", color: BRAND_COLORS.softUltravioletText };
    case "VOID":
      return { label: "Void", color: BRAND_COLORS.softUltravioletText };
    default:
      return null; // PENDING — no settled badge yet
  }
}

export function GlassBoxExplainer({ picks, entitlements }: GlassBoxExplainerProps): JSX.Element {
  if (picks.isEmpty) {
    return (
      <div
        className="rounded-xl border p-6"
        style={{
          borderColor: `${BRAND_COLORS.orbitalCyan}18`,
          background: `${BRAND_COLORS.orbitalCyan}06`,
        }}
      >
        <h3 className="font-display text-base font-semibold text-white">
          No published picks to explain yet — the board is building its record.
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-400">
          The explainer opens the moment a pick clears the gate and is published.
          Until then there is nothing to show — and we will not invent one. Watch
          the board fill in real time.
        </p>
        <Link
          href="/board"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
          style={{ borderColor: `${BRAND_COLORS.orbitalCyan}40`, color: BRAND_COLORS.orbitalCyan }}
        >
          Open today&apos;s board
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-2xl text-sm leading-relaxed text-ink-300">
        Every pick below is real and already published. This is the same factor
        trail the engine scored it on — no marketing layer between you and the
        math.{" "}
        {!entitlements.canSeeFactorBreakdown && (
          <span className="text-ink-400">
            Free shows the factors in play; Pro shows what each one contributed.
          </span>
        )}
      </p>

      <div className="grid gap-4">
        {picks.picks.map((pick) => (
          <GlassBoxCard key={pick.id} pick={pick} entitlements={entitlements} />
        ))}
      </div>

      {picks.isSampleData && (
        <p
          className="rounded-lg border px-3 py-2 text-xs leading-relaxed"
          style={{ borderColor: "rgba(255,196,84,0.4)", background: "rgba(255,196,84,0.08)", color: "#FFC454" }}
        >
          Sample data: these are deterministic dev rows, shown while live
          ingestion is wired up. They never settle and never count toward a
          public record.
        </p>
      )}
    </div>
  );
}

function GlassBoxCard({
  pick,
  entitlements,
}: {
  pick: GlassBoxPick;
  entitlements: Entitlements;
}): JSX.Element {
  const grade = PICK_GRADE_LABELS[pick.pickGrade];
  const gradeC = gradeColor(pick.pickGrade);
  const result = resultStyle(pick.result);

  return (
    <article
      className="rounded-xl border p-4"
      style={{ borderColor: "rgba(255,255,255,0.09)", background: "rgba(8,6,20,0.5)" }}
    >
      {/* Public header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">
            {pick.sport}
          </p>
          <h3 className="mt-1 truncate font-display text-sm font-semibold text-white">
            {pick.matchup}
          </h3>
          <p className="mt-0.5 text-xs text-ink-300">
            {pick.market}
            {pick.line !== 0 && pick.pickType !== "SPREAD" && (
              <span className="text-ink-400">
                {" "}
                · {pick.line > 0 ? "+" : ""}
                {pick.line}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ color: gradeC, background: `${gradeC}1a` }}
          >
            {grade.label}
          </span>
          {/* Edge Index — public on every tier */}
          {pick.edgeScore !== null && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums"
              style={{ color: BRAND_COLORS.orbitalCyan, background: `${BRAND_COLORS.orbitalCyan}14` }}
            >
              Edge {Math.round(pick.edgeScore)}
            </span>
          )}
          {result && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ color: result.color, background: `${result.color}1a` }}
            >
              {result.label}
            </span>
          )}
        </div>
      </div>

      {/* Factor trail */}
      <div className="mt-4">
        {entitlements.canSeeFactorBreakdown ? (
          pick.factorBreakdown ? (
            <FactorTrailFull breakdown={pick.factorBreakdown} canSeeConfidence={entitlements.canSeeConfidence} />
          ) : (
            <p className="text-xs text-ink-500">
              The stored factor trail for this pick is unavailable.
            </p>
          )
        ) : (
          <FactorTrailRedacted breakdown={pick.factorBreakdown} />
        )}
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────
// PRO+ — full factor trail (numbers visible)
// ─────────────────────────────────────────────

function FactorTrailFull({
  breakdown,
  canSeeConfidence,
}: {
  breakdown: FactorBreakdown;
  canSeeConfidence: boolean;
}): JSX.Element {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-300">
        Factor trail
      </p>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {FACTOR_ROWS.map((row) => {
          const raw = breakdown[row.key];
          const value = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
          return <ScoreBar key={String(row.key)} label={row.label} value={value} max={row.max} />;
        })}
      </div>

      {/* Human-readable factor list */}
      {breakdown.factors.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {breakdown.factors.map((factor, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  background:
                    factor.impact === "positive"
                      ? "#5FD9A3"
                      : factor.impact === "negative"
                        ? "#FF6470"
                        : "rgba(255,255,255,0.3)",
                }}
                aria-hidden="true"
              />
              <span className="text-[11px] leading-relaxed text-ink-400">{factor.description}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Penalties — honest negatives */}
      {(breakdown.volatilityPenalty < 0 ||
        (breakdown.uncertaintyPenalty !== undefined && breakdown.uncertaintyPenalty < 0)) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {breakdown.volatilityPenalty < 0 && (
            <span
              className="rounded px-2 py-0.5 text-[10px]"
              style={{ color: "#FF6470", background: "rgba(255,100,112,0.1)" }}
            >
              Market risk {breakdown.volatilityPenalty} pts
            </span>
          )}
          {breakdown.uncertaintyPenalty !== undefined && breakdown.uncertaintyPenalty < 0 && (
            <span
              className="rounded px-2 py-0.5 text-[10px]"
              style={{ color: BRAND_COLORS.softUltravioletText, background: `${BRAND_COLORS.softUltraviolet}1a` }}
            >
              Signal conflict {breakdown.uncertaintyPenalty} pts
            </span>
          )}
        </div>
      )}

      {/* Data quality — always public trust signal */}
      {typeof breakdown.dataQualityScore === "number" && (
        <p className="mt-2 text-[10px] text-ink-500">
          Data quality {Math.round(breakdown.dataQualityScore)}/100
        </p>
      )}

      {!canSeeConfidence && (
        <p className="mt-2 text-[10px] text-ink-500">
          Confidence score unlocks on Elite alerts and per-pick detail.
        </p>
      )}
    </div>
  );
}

function ScoreBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}): JSX.Element {
  const pct = Math.round(Math.max(0, Math.min((value / max) * 100, 100)));
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[10px]">
        <span className="text-ink-300">{label}</span>
        <span className="font-medium tabular-nums text-ink-400">{Math.round(value)}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: BRAND_COLORS.orbitalCyan }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FREE — factor structure, numbers redacted
// ─────────────────────────────────────────────

function FactorTrailRedacted({ breakdown }: { breakdown: FactorBreakdown | null }): JSX.Element {
  // Show ONLY the factor names/structure. No numeric contribution is rendered
  // for a FREE viewer — the redacted branch emits a placeholder, so gated
  // numbers never reach the DOM.
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-300">
        Factors in play
      </p>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {FACTOR_ROWS.map((row) => (
          <div key={String(row.key)}>
            <div className="mb-0.5 flex justify-between text-[10px]">
              <span className="text-ink-300">{row.label}</span>
              <span className="text-ink-500" aria-label="locked value">
                •••
              </span>
            </div>
            <div
              className="h-1 w-full overflow-hidden rounded-full"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full w-full rounded-full"
                style={{
                  background:
                    "repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0 6px, transparent 6px 12px)",
                }}
                aria-hidden="true"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Names of the human-readable factors that fired — structure, no weights.
          Falls back gracefully when the stored trail is unavailable. */}
      {breakdown && breakdown.factors.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {breakdown.factors.map((factor, idx) => (
            <li
              key={idx}
              className="rounded-full px-2 py-0.5 text-[10px] text-ink-400"
              style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
            >
              {factor.name}
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/pricing"
        className="mt-3 block rounded-lg border border-dashed px-4 py-3 transition-colors"
        style={{ borderColor: `${BRAND_COLORS.ionMagenta}40` }}
      >
        <p className="text-xs font-semibold" style={{ color: BRAND_COLORS.ionMagenta }}>
          Unlock the full factor trail with Pro →
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-400">
          See exactly how many points each factor contributed to this pick&apos;s
          score. Edge Index stays public on every tier.
        </p>
      </Link>
    </div>
  );
}
