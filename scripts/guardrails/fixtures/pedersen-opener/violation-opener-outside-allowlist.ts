// FIXTURE — a deliberate violation. Not real code; exists so the guard's own
// test can prove the detector fires (rule C).
//
// This one is the subtle case: it is NOT under apps/, so rule B would let it
// pass, and its select is explicit, so rule A would too. But it is a second
// module reading the opener — and a server-only helper that quietly selects the
// blinding is one import away from a route. Opener reads belong in the single
// allowlisted module, which refuses by default.
declare const db: any;

export async function auditSlateTotals(slateKey: string) {
  return db.slateCommitment.findFirst({
    where: { slateKey },
    select: {
      slateKey: true,
      pedersenAggregateValue: true,
    },
  });
}
