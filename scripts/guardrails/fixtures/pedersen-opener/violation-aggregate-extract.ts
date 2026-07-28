// FIXTURE — a deliberate violation. Not real code; exists so the guard's own
// test can prove rule E fires. `aggregate` has no `select`, but `_max` on a
// string column RETURNS that column — filtered to one row, this extracts the
// blinding without the word "select" ever appearing.
declare const db: any;

export async function extractBlindingViaAggregate(slateKey: string) {
  return db.slateCommitment.aggregate({
    where: { slateKey },
    _max: { pedersenBlindingSum: true },
  });
}
