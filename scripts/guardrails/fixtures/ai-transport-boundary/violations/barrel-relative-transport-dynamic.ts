// Dynamic import of the transport module via a relative specifier (simulated
// path inside apps/web/lib/claude-api/).
export async function lazyTransport() {
  const m = await import("./messages");
  return m;
}
