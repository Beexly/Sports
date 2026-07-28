// FIXTURE — a deliberate violation. Not real code; exists so the guard's own
// test can prove rule D fires. The word "slateCommitment" never appears in
// either call, yet both return the FULL related commitment row — opener
// included — via the receipt's `slate` relation.
declare const db: any;

export async function receiptsWithSlateWholesale(gameIds: string[]) {
  return db.pickProofReceipt.findMany({
    where: { pick: { gameId: { in: gameIds } } },
    include: { slate: true },
  });
}

export async function receiptWithSlateObjectNoSelect(pickId: string) {
  // Nested object but no `select` — Prisma still returns every column.
  return db.pickProofReceipt.findFirst({
    where: { pickId },
    select: { pickId: true, slate: { where: undefined } },
  });
}
