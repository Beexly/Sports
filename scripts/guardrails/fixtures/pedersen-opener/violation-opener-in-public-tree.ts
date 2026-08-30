// FIXTURE — a deliberate violation. Not real code; exists so the guard's own
// test can prove the detector fires (rule B). The select is explicit, so rule A
// is satisfied — but it names the blinding sum, which OPENS the commitment. The
// test mounts this file under a synthetic `apps/` tree.
declare const db: any;

export async function loadSlateForRoute(slateKey: string) {
  return db.slateCommitment.findUnique({
    where: { slateKey },
    select: {
      slateKey: true,
      root: true,
      pedersenAggregateHex: true,
      pedersenBlindingSum: true,
    },
  });
}
