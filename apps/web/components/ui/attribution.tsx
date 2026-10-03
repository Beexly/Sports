import { attributionFor } from "@sports/data-ingestion";
import { getSourceRightsEntry } from "@/lib/scraping/source-rights-registry";

/**
 * Resolve one source id to its required attribution line. The legacy
 * data-ingestion registry is checked first (existing ids keep their exact
 * lines), then the Source Rights Registry — so rights-registry-only sources
 * (e.g. `ffverse-ffopportunity`) propagate their `attribution_text` to every
 * surface that displays their data, as the registry requires.
 */
function attributionLineFor(id: string): string | null {
  const legacy = attributionFor(id);
  if (legacy) return legacy;
  const rights = getSourceRightsEntry(id);
  return rights && rights.attribution_required ? rights.attribution_text : null;
}

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
    new Set(sourceIds.map((id) => attributionLineFor(id)).filter((line): line is string => Boolean(line))),
  );
  if (lines.length === 0) return null;
  return (
    <p
      data-testid="source-attribution"
      className={`font-mono text-[10px] leading-5 tracking-[0.04em] text-ion-2 ${className}`}
    >
      {lines.join("  •  ")}{" "}
      <a href="/data" className="text-orbital-cyan hover:text-ion-white">
        How we source data
      </a>
    </p>
  );
}
