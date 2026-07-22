// FIXTURE (must NOT be flagged) — legitimate consumption of the governed API.
// @ts-nocheck
import {
  requireAdminActor,
  resolveServiceActor,
  assertActorType,
  type TrustedActor,
} from "@/lib/auth/actor";

export async function legitimateConsumer(): Promise<TrustedActor> {
  const actor = await requireAdminActor();
  assertActorType(actor, ["HUMAN"], "fixture");
  void resolveServiceActor;
  return actor;
}
