/**
 * EvidenceCard — canonical data-card primitive enforcing the
 * Evidence Chain Standard (docs/product/EVIDENCE_CHAIN_STANDARD.md).
 *
 * Every data card that renders an analytical claim should compose this
 * primitive (directly or via a wrapper). The card requires:
 *   - header + subject
 *   - claim (children)
 *   - evidence row: source + freshness + model version
 *   - optional failure case (for picks)
 *   - optional next-action link
 *
 * Compliance laws this primitive enforces by shape:
 *   - Constitution #5: no stale-data deception (freshness pill required)
 *   - Constitution #9: no pick without a failure case
 *     (when `kind === "pick"`, failureCase prop is required by type)
 *   - Evidence Chain Standard: card anatomy
 *
 * This is a server-safe component (no `"use client"` needed — it has
 * no event handlers).
 */
import Link from "next/link";
import type { ReactNode } from "react";

export type EvidenceFreshness =
  | "live"
  | "fresh"
  | "today"
  | "stale"
  | "sample"
  | "unknown";

export type EvidenceSource =
  | "provider"
  | "galaxy-model"
  | "aggregate"
  | "public-record"
  | "editorial"
  | "illustrative";

const FRESHNESS_STYLES: Record<EvidenceFreshness, string> = {
  live: "border-lime-700/60 bg-lime-950/30 text-lime-300",
  fresh: "border-cyan-800/60 bg-cyan-950/30 text-cyan-300",
  today: "border-mineral bg-gray-900/40 text-gray-300",
  stale: "border-amber-800/60 bg-amber-950/30 text-amber-300",
  sample: "border-violet-800/60 bg-violet-950/30 text-violet-300",
  unknown: "border-mineral bg-gray-900/40 text-gray-500",
};

const FRESHNESS_LABELS: Record<EvidenceFreshness, string> = {
  live: "Live",
  fresh: "Fresh",
  today: "Today",
  stale: "Stale",
  sample: "Sample",
  unknown: "Unknown",
};

const SOURCE_LABELS: Record<EvidenceSource, string> = {
  provider: "Provider",
  "galaxy-model": "Galaxy model",
  aggregate: "Aggregate",
  "public-record": "Public record",
  editorial: "Editorial",
  illustrative: "Illustrative",
};

interface EvidenceMeta {
  readonly source: EvidenceSource;
  /** Specific provider/model identifier when applicable (e.g., "The Odds API", "model v0.4.2"). */
  readonly attribution?: string;
  readonly freshness: EvidenceFreshness;
  /** Human-readable freshness annotation (e.g., "2 min ago", "11:42 ET"). */
  readonly freshnessNote?: string;
  /** When the source is the Galaxy model. */
  readonly modelVersion?: string;
}

interface BaseProps {
  readonly header: string;
  readonly subject: string;
  readonly evidence: EvidenceMeta;
  readonly children?: ReactNode;
  readonly nextAction?: { readonly href: string; readonly label: string };
  readonly className?: string;
}

type EvidenceCardProps =
  | (BaseProps & { readonly kind?: "data" | "signal" | "no-bet" })
  | (BaseProps & {
      readonly kind: "pick";
      /** Picks must declare how the bet can be wrong. Enforces Constitution #9. */
      readonly failureCase: string;
    });

export function EvidenceCard(props: EvidenceCardProps): JSX.Element {
  const { header, subject, evidence, children, nextAction, className } = props;
  const failureCase = "failureCase" in props ? props.failureCase : undefined;
  const kindAccent =
    props.kind === "pick"
      ? "border-l-cyan-500"
      : props.kind === "no-bet"
        ? "border-l-amber-500"
        : props.kind === "signal"
          ? "border-l-violet-500"
          : "border-l-mineral";

  return (
    <article
      className={`flex flex-col rounded-xl border border-mineral border-l-4 ${kindAccent} bg-gray-900/40 p-5 ${className ?? ""}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
            {header}
          </p>
          <h3 className="mt-1 text-base font-bold text-white">{subject}</h3>
        </div>
        <EvidenceRow evidence={evidence} />
      </header>

      <div className="mt-4 text-sm leading-6 text-gray-300">{children}</div>

      {failureCase ? (
        <div className="mt-4 rounded border border-amber-900/40 bg-amber-950/15 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber-500">
            How this can be wrong
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-100/80">{failureCase}</p>
        </div>
      ) : null}

      {nextAction ? (
        <div className="mt-4 flex items-center justify-end">
          <Link
            href={nextAction.href}
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-blue hover:text-cyan-300"
          >
            {nextAction.label} →
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function EvidenceRow({ evidence }: { evidence: EvidenceMeta }): JSX.Element {
  const sourceText = evidence.attribution
    ? `${SOURCE_LABELS[evidence.source]} · ${evidence.attribution}`
    : SOURCE_LABELS[evidence.source];
  const freshnessText = evidence.freshnessNote
    ? `${FRESHNESS_LABELS[evidence.freshness]} · ${evidence.freshnessNote}`
    : FRESHNESS_LABELS[evidence.freshness];

  return (
    <div className="flex flex-col items-end gap-1">
      <span
        className={`rounded border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${FRESHNESS_STYLES[evidence.freshness]}`}
      >
        {freshnessText}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-600">
        {sourceText}
      </span>
      {evidence.source === "galaxy-model" && evidence.modelVersion ? (
        <span className="font-mono text-[9px] text-gray-700">
          {evidence.modelVersion}
        </span>
      ) : null}
    </div>
  );
}
