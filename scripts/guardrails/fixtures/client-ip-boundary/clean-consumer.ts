// FIXTURE — the only sanctioned shape: ask the shared helper. Mentioning
// "x-forwarded-for" in a comment is prose, not a literal, and must NOT be
// flagged — otherwise the guard would punish documentation.
import { clientIp, consumeRateLimit } from "@/lib/api/rate-limit";

export function goodRouteKey(req: Request): string {
  const limit = consumeRateLimit("fixture", clientIp(req), 5, 60_000);
  return limit.ok ? "ok" : "limited";
}
