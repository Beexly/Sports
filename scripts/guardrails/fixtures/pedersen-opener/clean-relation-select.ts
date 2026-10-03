// FIXTURE — the compliant traversal shape, so the guard's test proves rule D
// does NOT false-positive. The `slate` relation is traversed with a nested
// `select` naming only public columns; `slate: false` returns nothing at all.
declare const db: any;

export async function receiptsWithPublicSlateFields(gameIds: string[]) {
  return db.pickProofReceipt.findMany({
    where: { pick: { gameId: { in: gameIds } } },
    select: {
      pickId: true,
      contentHash: true,
      slate: {
        select: { slateKey: true, root: true, count: true, pedersenAggregateHex: true },
      },
    },
  });
}

export async function receiptsWithoutSlate(pickId: string) {
  return db.pickProofReceipt.findFirst({
    where: { pickId },
    select: { pickId: true, slate: false },
  });
}
