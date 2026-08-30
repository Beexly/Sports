// FIXTURE (must be flagged: dynamic-import) — dynamic import exposes the whole
// module, including the raw constructors.
// @ts-nocheck
export async function sneakyDynamic() {
  const mod = await import("@/lib/auth/actor");
  return mod.serviceActor({ subjectId: "service:not-governed" });
}
