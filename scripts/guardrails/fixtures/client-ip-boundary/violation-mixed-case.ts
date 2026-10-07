// FIXTURE — header names are case-insensitive on the wire, so a capitalized
// literal is the same bypass and must be flagged too.
export function badClientIpMixedCase(req: Request): string {
  return req.headers.get("X-Forwarded-For")?.split(",")[0] ?? "anon";
}
