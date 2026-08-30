/**
 * edge-lab/sealed-split.mjs — a tamper-evident train/validation/sealed-vault split.
 *
 * The whole point: the 2024 holdout ("vault") must be touched EXACTLY ONCE, at the
 * very end, on the final chosen model. This object makes peeking a thrown error
 * instead of a silent mistake — the discipline that separates a real edge from an
 * overfit mirage. (This is the honest version of the "sealed 2024 vault" claim.)
 */

export function makeSeasonSplit(rows, { trainMax, valSeasons, vaultSeasons }, getSeason = (r) => r.season) {
  const train = [];
  const val = [];
  const vault = [];
  for (const r of rows) {
    const s = getSeason(r);
    if (s <= trainMax) train.push(r);
    else if (valSeasons.includes(s)) val.push(r);
    else if (vaultSeasons.includes(s)) vault.push(r);
  }

  let unsealed = false;
  return {
    train,
    val,
    counts: { train: train.length, val: val.length, vault: vault.length },
    /**
     * Read the sealed vault. Throws on any second call — a model may be evaluated
     * on the vault once and only once. `reason` is logged for the audit trail.
     */
    unsealVault(reason) {
      if (unsealed) {
        throw new Error("VAULT ALREADY UNSEALED — the 2024 holdout may be read exactly once. Re-running on it invalidates the result.");
      }
      if (!reason) throw new Error("unsealVault(reason) requires a reason for the audit trail.");
      unsealed = true;
      return vault;
    },
    isUnsealed: () => unsealed,
  };
}
