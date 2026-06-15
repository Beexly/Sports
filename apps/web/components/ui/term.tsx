import type { ReactNode } from "react";
import { glossaryEntry } from "@/lib/glossary";

/**
 * Inline "what is this?" explainer. Wrap any branded metric or insider term so a
 * customer can read a one-sentence, jargon-free definition without leaving the
 * page — the numbers still speak, but nobody is left guessing what they mean.
 *
 * Server-safe (no hooks/state): the tooltip shows on hover AND keyboard focus,
 * and the full definition is on the element's aria-label for screen readers.
 * Unknown term ids degrade to plain text, so it can never render a blank tip.
 *
 *   <Term term="gpi" />            → renders "Galaxy Index" with the explainer
 *   <Term term="clv">CLV</Term>    → custom label, same explainer
 */
export function Term({
  term,
  children,
  className = "",
}: {
  term: string;
  children?: ReactNode;
  className?: string;
}): JSX.Element {
  const entry = glossaryEntry(term);
  const label = children ?? entry?.label ?? term;

  if (!entry) {
    return <span className={className}>{label}</span>;
  }

  return (
    <span className={`group relative inline-flex items-center ${className}`}>
      <span
        tabIndex={0}
        aria-label={`${entry.label}: ${entry.plain}`}
        className="cursor-help underline decoration-dotted decoration-ion-3 underline-offset-2 outline-none focus-visible:decoration-ion-white"
      >
        {label}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 hidden w-64 rounded-lg border border-titanium/50 bg-obsidian/95 p-3 text-left text-xs font-normal leading-relaxed text-ion-2 shadow-xl group-hover:block group-focus-within:block"
      >
        <span className="block font-semibold text-ion-white">{entry.label}</span>
        <span className="mt-1 block">{entry.plain}</span>
      </span>
    </span>
  );
}
