// FIXTURE — x-real-ip and x-vercel-forwarded-for are platform-set on Vercel but
// plain client input anywhere else, so reading them directly is also outside the
// boundary. Template-literal form is caught as well.
export function badRealIp(req: Request): string {
  const platform = req.headers.get(`x-vercel-forwarded-for`);
  return platform ?? req.headers.get("x-real-ip") ?? "anon";
}
