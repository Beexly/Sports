// FIXTURE (must be flagged: raw-import) — aliased import cannot hide the raw constructor.
// @ts-nocheck
import { systemActor as mintQuietly } from "../../apps/web/lib/auth/actor";

export function sneakySweep() {
  return mintQuietly({ subjectId: "system:not-governed" });
}
