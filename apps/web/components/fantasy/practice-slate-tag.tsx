/**
 * PracticeSlateTag: the one quiet marker for sample (non-live) player data.
 *
 * Replaces the longer "fictional players / illustrative numbers" copy across
 * the fantasy suite. Wherever sample data renders, this tag must render with
 * it; it is never removed without live data replacing the sample pool.
 * Style mirrors the existing muted "Sample slate" pill in projections-table.
 */

export const PRACTICE_SLATE_LABEL = "Practice slate";
export const PRACTICE_SLATE_TITLE = "Sample players for trying the tool. Not live data.";

export function PracticeSlateTag({
  className = "",
  testId,
}: {
  className?: string;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      title={PRACTICE_SLATE_TITLE}
      className={`inline-flex items-center rounded-full border border-mineral px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ion-2 ${className}`.trim()}
    >
      {PRACTICE_SLATE_LABEL}
      {/* title is not reliably announced; screen readers get the same sentence. */}
      <span className="sr-only"> {PRACTICE_SLATE_TITLE}</span>
    </span>
  );
}
