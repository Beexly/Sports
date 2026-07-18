import { formatAmericanOdds } from "@sports/types";

export function formatCommittedMarket(
  selection: string | null | undefined,
  entryOdds: number | null | undefined,
): string {
  const canonicalSelection = selection?.trim();
  const entryDisplay = formatAmericanOdds(entryOdds);

  if (!canonicalSelection || entryDisplay === "N/A") {
    return "Market values unavailable";
  }
  return `${canonicalSelection} at ${entryDisplay}`;
}
