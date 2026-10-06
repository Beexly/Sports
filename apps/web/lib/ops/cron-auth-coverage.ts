/**
 * Static auth-coverage analysis for cron route handlers (pure).
 *
 * WHY THIS EXISTS
 * ---------------
 * `lib/cron/authorize.ts` is correct and fails closed: with `CRON_SECRET` unset
 * it returns 500 rather than running the job, and it compares secrets in
 * constant time. Its own unit tests cover that. But a helper only protects the
 * routes that remember to call it, and nothing checks that they do.
 *
 * The consequence of forgetting is not a broken build — it is a publicly
 * triggerable job. `/api/cron/refresh-odds` spends metered The Odds API credits
 * on every invocation; an unauthenticated handler lets an anonymous caller drain
 * the plan quota at will, and the failure mode downstream is a dark board, not
 * an error page. Several other cron routes write to the database or send mail.
 *
 * Reviewing 25 files by eye is exactly the check that silently stops happening.
 * This module makes it mechanical: given route source text, which exported HTTP
 * handlers reach an authorization call before doing anything else?
 *
 * Deliberately a source analysis rather than a behavioral one: importing all 25
 * route modules pulls in Prisma, the prediction engine and the ingestion
 * pipeline, so a behavioral sweep would be slow, and — worse — a route that
 * failed to import for an unrelated reason would silently drop out of coverage.
 * Text analysis cannot be skipped by an import error.
 */

/** Helper functions from `lib/cron/authorize` that authorize a request. */
export const CRON_AUTH_FUNCTIONS = [
  "cronAuthError",
  "cronAuthErrorBearerOnly",
  "authorizeCronRequest",
] as const;

/** HTTP method exports Next.js will route to. */
export const HTTP_HANDLER_NAMES = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

export type HttpHandlerName = (typeof HTTP_HANDLER_NAMES)[number];

/**
 * Remove line comments, block comments and string/template literals.
 *
 * Without this, a commented-out `// cronAuthError(request)` — or the phrase
 * appearing in a docblock, which it does in most of these files — would satisfy
 * the guard while the handler runs unauthenticated. Stripping first means only
 * executable text is ever considered.
 */
export function stripCommentsAndStrings(source: string): string {
  return scrub(source, { blankStrings: true });
}

/**
 * Remove comments but keep string literals intact.
 *
 * Needed for checks whose subject *is* a literal — `mode: "dual"` is meaningful
 * text, and blanking it would make the dual-mode opt-in undetectable.
 */
export function stripComments(source: string): string {
  return scrub(source, { blankStrings: false });
}

function scrub(source: string, options: { blankStrings: boolean }): string {
  let out = "";
  let i = 0;
  const n = source.length;

  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === "/" && next === "/") {
      while (i < n && source[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      const start = i;
      i += 1;
      while (i < n && source[i] !== quote) {
        if (source[i] === "\\") i += 1;
        i += 1;
      }
      i += 1;
      out += options.blankStrings ? '""' : source.slice(start, Math.min(i, n));
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

/** One exported HTTP handler and whether it reaches an authorization call. */
export interface HandlerAuthCoverage {
  readonly handler: HttpHandlerName;
  /** Authorization helper invoked directly in the handler's region. */
  readonly authCall: string | null;
  /** Another exported handler this one delegates to, e.g. `return GET(request)`. */
  readonly delegatesTo: HttpHandlerName | null;
  readonly authorized: boolean;
}

export interface CronRouteAuthAnalysis {
  readonly exportedHandlers: readonly HandlerAuthCoverage[];
  /** True when the file imports from the shared authorize module. */
  readonly importsSharedHelper: boolean;
  /** True when any handler opts into the spoofable `x-vercel-cron` dual mode. */
  readonly usesDualMode: boolean;
  /** Handlers with no authorization on any path. */
  readonly unauthorizedHandlers: readonly HttpHandlerName[];
}

const HANDLER_PATTERN = new RegExp(
  String.raw`export\s+(?:async\s+)?(?:function\s+(` +
    HTTP_HANDLER_NAMES.join("|") +
    String.raw`)\b|const\s+(` +
    HTTP_HANDLER_NAMES.join("|") +
    String.raw`)\b\s*=)`,
  "g",
);

/**
 * Analyze one route file's source for authorization coverage.
 *
 * Each handler owns the region from its own declaration to the start of the next
 * exported handler (or end of file). An authorization call anywhere in that
 * region counts, as does delegating to another exported handler that is itself
 * authorized — `gamma`'s `POST` is `return GET(request)`, which is genuinely
 * safe and must not be reported as a hole.
 */
export function analyzeCronRouteAuth(source: string): CronRouteAuthAnalysis {
  const code = stripCommentsAndStrings(source);

  // Checked against comment-stripped source that still has its literals: the
  // module path IS a string literal, so the string-blanking pass would erase it.
  const importsSharedHelper = /from\s*["'`][^"'`]*lib\/cron\/authorize["'`]/.test(
    stripComments(source),
  );
  // Checked against comment-stripped source that still has its literals, so a
  // docblock discussing "dual" mode does not read as an opt-in, but real code
  // passing `mode: "dual"` does.
  const usesDualMode = /mode\s*:\s*["'`]dual["'`]/.test(stripComments(source));

  const starts: { handler: HttpHandlerName; index: number }[] = [];
  HANDLER_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null = HANDLER_PATTERN.exec(code);
  while (match !== null) {
    const name = (match[1] ?? match[2]) as HttpHandlerName | undefined;
    if (name !== undefined) starts.push({ handler: name, index: match.index });
    match = HANDLER_PATTERN.exec(code);
  }

  const coverage: HandlerAuthCoverage[] = starts.map((start, idx) => {
    const nextStart = starts[idx + 1]?.index ?? code.length;
    const region = code.slice(start.index, nextStart);

    const authCall =
      CRON_AUTH_FUNCTIONS.find((fn) => new RegExp(String.raw`\b${fn}\s*\(`).test(region)) ??
      null;

    const delegatesTo =
      HTTP_HANDLER_NAMES.find(
        (h) => h !== start.handler && new RegExp(String.raw`\b${h}\s*\(`).test(region),
      ) ?? null;

    return {
      handler: start.handler,
      authCall,
      delegatesTo,
      authorized: authCall !== null || delegatesTo !== null,
    };
  });

  // A delegation is only real protection when the target is itself authorized.
  const directlyAuthorized = new Set(
    coverage.filter((c) => c.authCall !== null).map((c) => c.handler),
  );
  const resolved: HandlerAuthCoverage[] = coverage.map((c) => ({
    ...c,
    authorized:
      c.authCall !== null || (c.delegatesTo !== null && directlyAuthorized.has(c.delegatesTo)),
  }));

  return {
    exportedHandlers: resolved,
    importsSharedHelper,
    usesDualMode,
    unauthorizedHandlers: resolved.filter((c) => !c.authorized).map((c) => c.handler),
  };
}
