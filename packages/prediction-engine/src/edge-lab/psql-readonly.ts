/**
 * Spawn psql without putting a credential-bearing DSN on argv (CWE-214).
 *
 * ps(1) on a multi-user host can read argv for the life of the process.
 * PGPASSWORD in the child env is the documented client path; argv here is
 * only flags and SQL. The DSN itself is never copied onto argv, logs, or
 * error messages.
 *
 * CI uses --rows / stdin. This helper is the convenience replica lane only.
 */
export type ParsedReadonlyDsn = {
  readonly host: string;
  readonly port: string;
  readonly user: string;
  readonly password: string;
  readonly database: string;
  readonly sslMode: string | null;
};

export type ReadonlyPsqlLaunch = {
  readonly argv: readonly string[];
  readonly env: NodeJS.ProcessEnv;
};

function redactedError(message: string): Error {
  return new Error(message);
}

/**
 * Parse a postgres:// DSN. Throws a redacted error on malformed input —
 * the raw URL is never in the message.
 */
export function parseReadonlyPostgresDsn(dsn: string): ParsedReadonlyDsn {
  if (typeof dsn !== "string" || dsn.trim() === "") {
    throw redactedError("parseReadonlyPostgresDsn: empty DSN");
  }
  let url: URL;
  try {
    url = new URL(dsn);
  } catch {
    throw redactedError("parseReadonlyPostgresDsn: malformed DSN");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw redactedError("parseReadonlyPostgresDsn: DSN must be postgres:// or postgresql://");
  }
  const host = url.hostname;
  if (!host) throw redactedError("parseReadonlyPostgresDsn: DSN missing host");
  const database = decodeURIComponent(url.pathname.replace(/^\//, "").split("/")[0] ?? "");
  if (!database) throw redactedError("parseReadonlyPostgresDsn: DSN missing database");
  return {
    host,
    port: url.port || "5432",
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    sslMode: url.searchParams.get("sslmode"),
  };
}

/** argv is flags + SQL only. Password lives in env.PGPASSWORD. */
export function readonlyPsqlLaunch(dsn: string, sql: string): ReadonlyPsqlLaunch {
  const parsed = parseReadonlyPostgresDsn(dsn);
  const env: NodeJS.ProcessEnv = { ...process.env };
  env.PGHOST = parsed.host;
  env.PGPORT = parsed.port;
  env.PGUSER = parsed.user;
  env.PGPASSWORD = parsed.password;
  env.PGDATABASE = parsed.database;
  if (parsed.sslMode) env.PGSSLMODE = parsed.sslMode;
  delete env.DATABASE_URL;
  delete env.READONLY_DATABASE_URL;
  return {
    argv: ["-v", "ON_ERROR_STOP=1", "-At", "-c", sql],
    env,
  };
}

/** True when `token` appears in argv — the leak this helper exists to forbid. */
export function argvLeaksSecret(argv: readonly string[], secret: string): boolean {
  if (!secret) return false;
  return argv.some((a) => a.includes(secret));
}
