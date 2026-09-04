import { describe, expect, it } from "vitest";
import { redactErrorDetail, sanitizeLogField } from "@/lib/log-safety";

/**
 * The fail-closed logging added alongside these helpers prints driver errors.
 * Driver errors are the single most likely place for a connection string to
 * escape into a log stream that is shipped off-box and retained — so these
 * assertions use SENTINEL secrets and check the secret is absent from the
 * output, not merely that some redaction happened.
 */

const SENTINEL_PASSWORD = "s3nt1nel-should-never-appear";
const SENTINEL_HOST = "db-primary.internal.sentinel";

/**
 * Built from parts on purpose. These are synthetic fixtures, but a literal
 * `scheme://user:pass@host` in the source is what the repo's secret scanner
 * looks for and it should keep looking for it — assembling the string here
 * keeps the guard sharp for real credentials while the test still exercises a
 * genuine DSN at runtime.
 */
function fakeDsn(scheme: string, user: string, port: number, tail = ""): string {
  return [scheme, "://", user, ":", SENTINEL_PASSWORD, "@", SENTINEL_HOST, ":", port, tail].join("");
}

describe("redactErrorDetail", () => {
  it("removes a Postgres connection string, credentials included", () => {
    const err = new Error(
      `Can't parse datasource URL ${fakeDsn("postgresql", "gse_app", 5432, "/gse?sslmode=require")}`,
    );

    const out = redactErrorDetail(err);

    expect(out).not.toContain(SENTINEL_PASSWORD);
    expect(out).not.toContain(SENTINEL_HOST);
    expect(out).not.toContain("postgresql://");
    expect(out).toContain("<redacted-url>");
    // The diagnosis survives — an operator can still tell what broke.
    expect(out).toMatch(/Can't parse datasource URL/);
  });

  it("removes the host and port from Prisma's P1001 text, both quoting styles", () => {
    const backticked = redactErrorDetail(
      new Error("Can't reach database server at `" + SENTINEL_HOST + "`:`5432`"),
    );
    const plain = redactErrorDetail(
      new Error(`Can't reach database server at ${SENTINEL_HOST}:5432`),
    );

    for (const out of [backticked, plain]) {
      expect(out).not.toContain(SENTINEL_HOST);
      expect(out).not.toContain("5432");
      expect(out).toContain("<redacted-host>");
      // Still recognisable as "the database is unreachable".
      expect(out).toMatch(/Can't reach database server/);
    }
  });

  it("redacts a redis:// URL too — the queue carries credentials as well", () => {
    const out = redactErrorDetail(
      new Error(`ECONNREFUSED ${fakeDsn("redis", "default", 6379)}`),
    );

    expect(out).not.toContain(SENTINEL_PASSWORD);
    expect(out).toContain("<redacted-url>");
  });

  it("keeps the error name and an ordinary message intact", () => {
    const err = new Error("Timed out fetching a new connection from the pool");
    err.name = "PrismaClientKnownRequestError";

    expect(redactErrorDetail(err)).toBe(
      "PrismaClientKnownRequestError: Timed out fetching a new connection from the pool",
    );
  });

  it("flattens a multi-line driver error onto a single log record", () => {
    const out = redactErrorDetail(new Error("line one\nline two\rline three"));

    expect(out).not.toContain("\n");
    expect(out).toBe("Error: line one line two line three");
  });

  it("bounds the printed length so one fault cannot flood the log", () => {
    const out = redactErrorDetail(new Error("x".repeat(5_000)));

    expect(out.length).toBeLessThanOrEqual(420);
    expect(out).toMatch(/\[truncated\]$/);
  });

  it("redacts a password containing bracket and quote characters", () => {
    // The terminator set once excluded `)` and `'`, so a password containing
    // either truncated the match and published everything after it — the rest
    // of the password, the host and the port.
    for (const pw of ["pa)ss", "pa'ss", "pa]ss", "p(a)s'[s]"]) {
      const out = redactErrorDetail(
        new Error(["Can't reach ", "postgresql", "://gse:", pw, "@", SENTINEL_HOST, ":5432/gse"].join("")),
      );
      expect(out).not.toContain(pw);
      expect(out).not.toContain(SENTINEL_HOST);
      expect(out).not.toContain("5432");
    }
  });

  it("redacts host:port from driver errors that are not Prisma's phrasing", () => {
    // `pg` and `ioredis` never say "database server at". Before this the host
    // and port went to the log verbatim.
    const pg = redactErrorDetail(new Error(`connection to ${SENTINEL_HOST}:5432 failed`));
    expect(pg).not.toContain(SENTINEL_HOST);
    expect(pg).not.toContain("5432");

    const redis = redactErrorDetail(new Error(`connect ECONNREFUSED ${SENTINEL_HOST}:6379`));
    expect(redis).not.toContain(SENTINEL_HOST);
    expect(redis).not.toContain("6379");

    // Dot-less container hostname, introduced by the errno keyword.
    const bare = redactErrorDetail(new Error("connect ECONNREFUSED db:6379"));
    expect(bare).not.toContain("db:6379");

    const ip = redactErrorDetail(new Error("connection to 10.1.2.3:5432 refused"));
    expect(ip).not.toContain("10.1.2.3");
  });

  it("redacts a host-only DNS failure, which carries no port at all", () => {
    // `getaddrinfo ENOTFOUND db.internal` matched none of the other patterns —
    // they all require a port or a scheme — so the internal hostname went to
    // the log verbatim. DNS failures are among the commonest a driver emits.
    const enotfound = redactErrorDetail(new Error(`getaddrinfo ENOTFOUND ${SENTINEL_HOST}`));
    expect(enotfound).not.toContain(SENTINEL_HOST);
    expect(enotfound).toContain("<redacted-host>");
    expect(enotfound).toMatch(/ENOTFOUND/); // the diagnosis survives

    const eaiAgain = redactErrorDetail(new Error(`getaddrinfo EAI_AGAIN ${SENTINEL_HOST}`));
    expect(eaiAgain).not.toContain(SENTINEL_HOST);
  });

  it("redacts the port even with whitespace around the colon", () => {
    const out = redactErrorDetail(
      new Error(`Can't reach database server at ${SENTINEL_HOST} : 5432`),
    );
    expect(out).not.toContain("5432");
    expect(out).not.toContain(SENTINEL_HOST);
  });

  it("leaves ordinary diagnostics that merely look like host:port alone", () => {
    // Requiring a dotted host (or an errno keyword) is what keeps redaction
    // from eating the numbers an operator actually needs.
    const out = redactErrorDetail(new Error("failed at line:42 after attempt:3 of 5"));
    expect(out).toContain("line:42");
    expect(out).toContain("attempt:3");
  });

  it("handles a thrown non-Error without crashing the logger", () => {
    expect(redactErrorDetail("plain string failure")).toBe("plain string failure");
    expect(redactErrorDetail(undefined)).toBe("undefined");
  });
});

describe("sanitizeLogField", () => {
  it("strips the newline a caller would need to forge a second log record", () => {
    const forged = "founder\n[entitlements] FAIL-CLOSED at auth:session-store — all clear";

    const out = sanitizeLogField(forged);

    expect(out).not.toContain("\n");
    expect(out.split("\n")).toHaveLength(1);
  });

  it("strips ANSI/terminal control sequences", () => {
    const ESC = String.fromCharCode(27);
    const out = sanitizeLogField(`founder${ESC}[2J${ESC}[Hcleared`);

    expect(out).not.toContain(ESC);
    expect(out).toBe("founder [2J [Hcleared");
  });

  it("truncates past the caller's ceiling", () => {
    const out = sanitizeLogField("a".repeat(500), 32);

    expect(out.startsWith("a".repeat(32))).toBe(true);
    expect(out).toMatch(/\[truncated\]$/);
  });

  it("leaves an ordinary value untouched", () => {
    expect(sanitizeLogField("ops.ranking-pause-apply")).toBe("ops.ranking-pause-apply");
  });

  it("does not throw on a non-string — its callers read untrusted request bodies", () => {
    // `{"setBy": 12}` used to reach `value.replace` and turn a malformed ops
    // POST into a 500 from a kill-switch endpoint.
    expect(() => sanitizeLogField(12 as unknown as string)).not.toThrow();
    expect(sanitizeLogField(12 as unknown as string)).toBe("12");
    expect(sanitizeLogField(undefined)).toBe("");
    expect(sanitizeLogField(null)).toBe("");
    expect(sanitizeLogField({ a: 1 } as unknown as string)).toBe("[object Object]");
    expect(sanitizeLogField(["a", "b"] as unknown as string)).toBe("a,b");
  });
});
