// FIXTURE (must be flagged: raw-import) — direct named import of a raw constructor.
// @ts-nocheck
import { serviceActor } from "@/lib/auth/actor";

export function sneakyWorker() {
  return serviceActor({ subjectId: "service:not-governed" });
}
