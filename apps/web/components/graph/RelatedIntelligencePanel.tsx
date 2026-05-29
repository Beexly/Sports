import type { ReactNode } from "react";

interface Section {
  eyebrow: string;
  children: ReactNode;
}

interface Props {
  heading?: string;
  sections: Section[];
  className?: string;
}

/**
 * Section wrapper for the intelligence graph relationship display.
 * Composes RelatedLessons, RelatedReports, RelatedDecisionCards.
 */
export function RelatedIntelligencePanel({
  heading = "Related intelligence",
  sections,
  className = "",
}: Props) {
  const nonEmpty = sections.filter((s) => s.children !== null && s.children !== undefined);
  if (nonEmpty.length === 0) return null;

  return (
    <section
      aria-label={heading}
      className={["rounded-2xl border border-mineral bg-gray-900/30 p-6", className].join(" ")}
    >
      <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
        {heading}
      </p>
      <div className="flex flex-col gap-6">
        {nonEmpty.map((section, i) => (
          <div key={i}>
            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-gray-600">
              {section.eyebrow}
            </p>
            {section.children}
          </div>
        ))}
      </div>
    </section>
  );
}
