import { getSourceRightsEntry } from "@/lib/scraping/source-rights-registry";

export function sourceAttributionFor(sourceIds: readonly string[]): readonly string[] {
  return [...new Set(sourceIds)]
    .map((sourceId) => getSourceRightsEntry(sourceId))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .filter((entry) => entry.attribution_required && entry.attribution_text !== null)
    .map((entry) => entry.attribution_text as string);
}
