/**
 * Log hygiene for operator-facing error output.
 *
 * Two distinct hazards, one module:
 *
 *  - `redactErrorDetail` — an Error raised by a database driver is NOT safe to
 *    print verbatim. Prisma's P1001 embeds the server host and port ("Can't
 *    reach database server at `db.internal`:`5432`") and a
 *    PrismaClientInitializationError can carry the whole datasource URL,
 *    credentials included. Application logs are shipped off-box and retained;
 *    a connection string sitting in one is a leaked secret, and the rule
 *    against putting secrets in code is worth nothing if the logs print them.
 *
 *  - `sanitizeLogField` — a caller-supplied string interpolated into a log line
 *    can carry newlines and terminal control sequences, letting whoever
 *    supplied it forge additional log records (or repaint a terminal reading
 *    them). Flatten to a single line and bound the length.
 *
 * Neither function changes a verdict. They only shape what is printed.
 */

/** Longest error detail we will print. Bounds one fault's log volume. */
const MAX_DETAIL_CHARS = 400;

/**
 * Any `scheme://…` authority. Catches `postgres://user:pass@host:5432/db`,
 * `redis://…`, `https://…?token=…` — the shapes a connection string takes.
 *
 * The terminator set is deliberately narrow. It once excluded `)`, `'` and `]`
 * so a URL in prose would not swallow the closing bracket — but a password may
 * legally contain any of them, and stopping the match there published the rest
 * of the password, the host and the port. Over-redacting a trailing bracket is
 * a cosmetic cost; under-redacting is a leaked credential, so the match now
 * runs to whitespace (or a quote, which cannot appear unescaped in a URL).
 */
const URL_WITH_AUTHORITY = /\b[a-z][a-z0-9+.-]*:\/\/[^\s"`<>]+/gi;

/**
 * Prisma's "…database server at HOST:PORT", in both the backtick-quoted form
 * the driver emits and the plain form, with or without spaces around the colon.
 * Keeps the diagnosis ("cannot reach the database") while dropping the internal
 * topology.
 */
const DB_SERVER_AT = /(database server at\s+)(`?[^\s`,;]+`?(?:\s*:\s*`?\d+`?)?)/gi;

/**
 * A dotted hostname or IPv4 followed by a port, anywhere in the message.
 *
 * Prisma is not the only driver that talks: `pg` emits "connection to
 * db.internal:5432 failed" and `ioredis` emits "connect ECONNREFUSED
 * db.internal:6379", neither of which contains the phrase above. Requiring a
 * DOT (or `localhost`) is what keeps this from eating ordinary diagnostics —
 * `line:42`, `Error:5432` and `attempt:3` all survive, because none of them
 * looks like a host.
 */
const DOTTED_HOST_PORT =
  /\b(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\s*:\s*\d{2,5}\b/gi;

/**
 * A bare (dot-less) host and port introduced by a connection error keyword —
 * the container-network shape, e.g. "connect ECONNREFUSED db:6379". Anchoring
 * on the keyword is what makes it safe to match a host with no dot in it.
 */
const CONNECT_HOST_PORT =
  /\b(ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|ENOTFOUND|connection to|connect(?:ing)? to)\s+\S+?\s*:\s*\d{2,5}\b/gi;

/**
 * A DNS failure names the host with NO port at all — `getaddrinfo ENOTFOUND
 * db.internal` — so none of the patterns above touch it and the internal
 * hostname went to the log verbatim. Anchored on the errno so it cannot eat
 * ordinary words.
 */
const DNS_HOST_ONLY = /\b(ENOTFOUND|EAI_AGAIN)\s+([a-z0-9][a-z0-9.-]*)/gi;

/** C0 and C1 control characters — CR/LF included. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]+/g;

/**
 * Flatten a string to one printable line and bound its length.
 *
 * Control characters — CR/LF above all — become spaces, so a value carrying a
 * newline plus a forged "[entitlements] FAIL-CLOSED …" prefix cannot appear as
 * its own log record.
 */
export function sanitizeLogField(value: unknown, maxChars = 120): string {
  // Takes `unknown`, not `string`. Its callers hand it values parsed straight
  // out of a request body, where the declared type is a claim rather than a
  // guarantee: `{"setBy": 12}` would otherwise throw "value.replace is not a
  // function" and turn a malformed ops POST into a 500 from a kill-switch
  // endpoint. A log-sanitiser that crashes on hostile input is not one.
  const text = typeof value === "string" ? value : value == null ? "" : String(value);
  const flattened = text.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
  return flattened.length > maxChars ? `${flattened.slice(0, maxChars)}…[truncated]` : flattened;
}

/**
 * `name: message` for an Error (or `String(err)` otherwise), with connection
 * strings and database hosts removed and the result flattened to one line.
 */
export function redactErrorDetail(error: unknown, maxChars = MAX_DETAIL_CHARS): string {
  const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  // URLs first: once an authority is replaced wholesale, the host:port passes
  // below cannot re-match inside what is left of it.
  const redacted = raw
    .replace(URL_WITH_AUTHORITY, "<redacted-url>")
    .replace(DB_SERVER_AT, "$1<redacted-host>")
    .replace(CONNECT_HOST_PORT, "$1 <redacted-host>")
    .replace(DOTTED_HOST_PORT, "<redacted-host>")
    .replace(DNS_HOST_ONLY, "$1 <redacted-host>");
  return sanitizeLogField(redacted, maxChars);
}
