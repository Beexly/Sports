/**
 * Safe serializer for JSON-LD embedded in a `<script type="application/ld+json">`.
 *
 * `JSON.stringify` does NOT escape `<`, `>`, or `&`, so any value that ever
 * contains the sequence `</script>` — a journal title or body sourced from the
 * DB, a team name from an odds feed, an FAQ answer — breaks out of the script
 * element and the trailing markup is parsed as HTML: a stored/reflected XSS.
 *
 * Escaping those three characters to their `\uXXXX` forms keeps the payload
 * inside the script tag while remaining byte-identical to JSON parsers (Google's
 * Rich Results reader included). This is the standard, framework-agnostic
 * hardening for inline JSON-LD and must be used at EVERY
 * `dangerouslySetInnerHTML` JSON-LD site instead of raw `JSON.stringify`.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
