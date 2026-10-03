// FIXTURE — a deliberate violation. Not real code; exists so the guard's own
// test can prove the detector fires (rule A). Prisma returns EVERY scalar
// column when `select` is omitted, so this read silently carries the opener.
declare const db: any;

export async function loadSlates(sport: string) {
  return db.slateCommitment.findMany({
    where: { slateKey: { startsWith: sport } },
    orderBy: { committedAt: "desc" },
  });
}
