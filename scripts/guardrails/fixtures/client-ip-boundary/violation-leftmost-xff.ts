// FIXTURE — the exact bypass the guard exists to stop: the leftmost
// x-forwarded-for entry is whatever the caller sent, so every forged header
// gets its own rate-limit bucket. Never copy this into a real route.
export function badClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
}
