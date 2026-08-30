export async function load() {
  const m = await import("@/lib/claude-api/providers/vertex");
  return m;
}
