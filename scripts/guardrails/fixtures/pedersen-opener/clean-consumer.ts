// FIXTURE — the compliant shape, so the guard's test proves it does NOT
// false-positive. Explicit select (rule A); the public hex is the sealed
// commitment and is safe to publish, while the opener columns are absent
// (rule B). Mirrors what `/api/verify/slate` actually does today.
declare const db: any;

export async function loadSlateForRoute(slateKey: string) {
  // Naming pedersenBlindingSum in a COMMENT must not trip the guard — comments
  // are stripped before the field scan, and this line proves it.
  return db.slateCommitment.findUnique({
    where: { slateKey },
    select: {
      slateKey: true,
      root: true,
      count: true,
      committedAt: true,
      pedersenAggregateHex: true,
    },
  });
}

/** Writes are untouched by the guard — minting necessarily sets all three columns. */
export async function mint(data: unknown) {
  return db.slateCommitment.create({ data });
}
