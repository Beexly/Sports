/**
 * Structured logger.
 *
 * A tiny, dependency-free logging primitive used by the observability layer
 * and any server code that wants level-aware, structured output.
 *
 * Behaviour:
 *   - JSON lines in production (NODE_ENV === "production") for log shippers.
 *   - Pretty, human-readable lines in dev/test.
 *   - The minimum level is configurable via LOG_LEVEL (default "info").
 *     Entries below the threshold are dropped — a safe no-op.
 *
 * This module never throws: malformed context is serialized defensively, and
 * the underlying sink is the console (the only place console is used in the
 * observability layer). It does NOT send anything off-box; transport to a
 * provider is the concern of capture.ts and stays inert without provider keys.
 *
 * Usage:
 *   import { logger } from "@/lib/observability/logger";
 *   logger.info("pick_rendered", { pickId });
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  readonly [key: string]: unknown;
}

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly time: string;
  readonly fields?: LogFields;
}

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(bindings: LogFields): Logger;
}

const LEVEL_WEIGHT: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const VALID_LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"];

function resolveMinLevel(): LogLevel {
  const raw = process.env["LOG_LEVEL"]?.toLowerCase();
  if (raw && (VALID_LEVELS as readonly string[]).includes(raw)) {
    return raw as LogLevel;
  }
  return "info";
}

function isProduction(): boolean {
  return process.env["NODE_ENV"] === "production";
}

/**
 * Defensive JSON serialization: handles circular references and BigInt without
 * throwing, so a logging call can never crash the caller.
 */
function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, (_key, val: unknown) => {
      if (typeof val === "bigint") return val.toString();
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "[Circular]";
        seen.add(val);
      }
      return val;
    });
  } catch {
    return '"[Unserializable]"';
  }
}

function formatPretty(entry: LogEntry): string {
  const head = `${entry.time} ${entry.level.toUpperCase().padEnd(5)} ${entry.message}`;
  if (!entry.fields || Object.keys(entry.fields).length === 0) return head;
  return `${head} ${safeStringify(entry.fields)}`;
}

function emit(entry: LogEntry): void {
  const line = isProduction() ? safeStringify(entry) : formatPretty(entry);
  // The console sink is centralized here; this is the only place the
  // observability layer writes to console. Mirrors lib/auth.ts.
  // eslint-disable-next-line no-console
  if (entry.level === "error") console.error(line);
  // eslint-disable-next-line no-console
  else if (entry.level === "warn") console.warn(line);
  // eslint-disable-next-line no-console
  else console.log(line);
}

function mergeFields(
  base: LogFields | undefined,
  extra: LogFields | undefined
): LogFields | undefined {
  if (!base) return extra;
  if (!extra) return base;
  return { ...base, ...extra };
}

function createLogger(bindings?: LogFields): Logger {
  const minWeight = LEVEL_WEIGHT[resolveMinLevel()];

  function log(level: LogLevel, message: string, fields?: LogFields): void {
    if (LEVEL_WEIGHT[level] < minWeight) return;
    const merged = mergeFields(bindings, fields);
    const entry: LogEntry = {
      level,
      message,
      time: new Date().toISOString(),
      ...(merged && Object.keys(merged).length > 0 ? { fields: merged } : {}),
    };
    emit(entry);
  }

  return {
    debug: (message, fields) => log("debug", message, fields),
    info: (message, fields) => log("info", message, fields),
    warn: (message, fields) => log("warn", message, fields),
    error: (message, fields) => log("error", message, fields),
    child: (childBindings) => createLogger(mergeFields(bindings, childBindings)),
  };
}

/** The shared application logger. */
export const logger: Logger = createLogger();

/** Build a logger that stamps every entry with the given bindings. */
export function createChildLogger(bindings: LogFields): Logger {
  return createLogger(bindings);
}
