import { attributionFor } from "@sports/data-ingestion";

/**
 * Renders the required attribution lines for the data sources used on a surface.
 * Satisfies CC-BY / source-credit obligations declared in the legal source
 * registry. Sources with no attribution requirement contribute nothing.
 */
export function Attribution({
  sourceIds,
  className = "",
}: {
  sourceIds: readonly string[];
  className?: string;
}): JSX.Element | null {
  const lines = Array.from(
    new Set(sourceIds.map((id) => attributionFor(id)).filter((line): line is string => Boolean(line))),
  );
  if (lines.length === 0) return null;
  return (
    <p
      data-testid="source-attribution"
      className={`font-mono text-[10px] leading-5 tracking-[0.04em] text-ink-400 ${className}`}
    >
      {lines.join("  •  ")}{" "}
      <a href="/data" className="text-orbital-cyan hover:text-white">
        How we source data
      </a>
    </p>
  );
}
