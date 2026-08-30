// FIXTURE (must be flagged: namespace-minting) — namespace import + member access.
// @ts-nocheck
import * as actors from "@/lib/auth/actor";

export function sneakyNamespace() {
  return actors.serviceActor({ subjectId: "service:not-governed" });
}

export function sneakyComputed() {
  return actors["systemActor"]({ subjectId: "system:not-governed" });
}
