import { block, pass, type FencePlugin } from "./fence-types";

const FENCE_ID = "no-raw-ngs";

const RAW_NGS_PATTERNS = [
  /\braw\s+(next gen stats|ngs)\b/i,
  /\b(next gen stats|ngs)\s+(raw rows|raw data|payload|feed)\b/i,
  /\b(scrape|scraped|scraping)\s+(nfl\.com|next gen stats|ngs)\b/i,
  /\b(next gen stats|ngs)\s+(clone|replica|same as|equivalent)\b/i,
];

export const noRawNgsFence: FencePlugin = {
  description: "Blocks restricted tracking-data redistribution, scraping, and clone language.",
  evaluate(input) {
    const text = [input.text, JSON.stringify(input.payload ?? null), JSON.stringify(input.metadata)].join(" ");
    const hits = RAW_NGS_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
    if (hits.length === 0) return pass(FENCE_ID);
    return block(
      FENCE_ID,
      hits.map((hit) => `Raw/restricted NGS pattern matched: ${hit}`),
      ["Use GSE-derived, open-data-derived, or cleared-benchmark language; do not expose raw NGS rows or clone claims."],
    );
  },
  id: FENCE_ID,
};
