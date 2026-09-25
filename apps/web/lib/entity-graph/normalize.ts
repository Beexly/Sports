const GENERATION_SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

/**
 * Normalize a human-entered entity name into a stable lookup key.
 * The order is deliberate: accents are folded before punctuation is removed,
 * and generational suffixes are removed only after token boundaries exist.
 */
export function normalizeEntityName(raw: string): string {
  if (raw.length === 0) return "";

  const normalized = raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  if (normalized.length === 0) return "";

  const tokens = normalized.split(" ");
  const finalToken = tokens[tokens.length - 1];
  if (tokens.length >= 3 && finalToken !== undefined && GENERATION_SUFFIXES.has(finalToken)) {
    tokens.pop();
  }

  return tokens.join(" ");
}
