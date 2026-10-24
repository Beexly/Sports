/**
 * Build-time guard for the coach path. Scans import and require lines only.
 * A comment that says "odds" is not an import. assertCoachInputs still rejects
 * price keys on the value object; this rejects a book module at the source.
 */

const IMPORT_LINE = /^\s*import\b|^\s*export\s+[^;]*\bfrom\b|\brequire\s*\(/
const BOOK = /from\s+["'][^"']*(odds|spread|market|bookmaker|pinnacle|oddsjam|the-odds-api)/i
const NAMED = /\b(TheOddsAPI|OddsJam|Unabated|SportsLine|Props\.Cash|FlashScore|PickFinder)\b/

export function findBookImports(source: string): string[] {
  const hits: string[] = []
  for (const line of source.split("\n")) {
    const trimmed = line.trim()
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue
    if (!IMPORT_LINE.test(line)) continue
    if (BOOK.test(line) || NAMED.test(line)) hits.push(trimmed)
  }
  return hits
}

export function assertNoBookInCoachSource(source: string, file: string): void {
  const hits = findBookImports(source)
  if (hits.length > 0) {
    throw new Error(`no-book fence: ${file} imports a book (${hits[0]})`)
  }
}
