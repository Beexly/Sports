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
 */
const URL_WITH_AUTHORITY = /\b[a-z][a-z0-9+.-]*:\/\/[^\s"'`<>)\]]+/gi;

/**
 * Prisma's "…database server at HOST:PORT", in both the backtick-quoted form
 * the driver emits and the plain form. Keeps the diagnosis ("cannot reach the
 * database") while dropping the internal topology.
 */
const DB_SERVER_AT = /(database server at\s+)(`?[^\s`,;]+`?(?::\s*`?\d+`?)?)/gi;

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
export function sanitizeLogField(value: string, maxChars = 120): string {
  const flattened = value.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
  return flattened.length > maxChars ? `${flattened.slice(0, maxChars)}…[truncated]` : flattened;
}

/**
 * `name: message` for an Error (or `String(err)` otherwise), with connection
 * strings and database hosts removed and the result flattened to one line.
 */
export function redactErrorDetail(error: unknown, maxChars = MAX_DETAIL_CHARS): string {
  const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const redacted = raw
    .replace(URL_WITH_AUTHORITY, "<redacted-url>")
    .replace(DB_SERVER_AT, "$1<redacted-host>");
  return sanitizeLogField(redacted, maxChars);
}
