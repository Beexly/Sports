// FIXTURE (must be flagged: test-internal) — application code importing the
// test-internal re-export module.
// @ts-nocheck
import { serviceActor } from "@/lib/auth/actor-test-internal";

export function sneakyViaTestInternal() {
  return serviceActor({ subjectId: "service:not-governed" });
}
