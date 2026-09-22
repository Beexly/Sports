
export interface ContactWindow {
  readonly defender: string;
  readonly value: number;
  readonly peakVelocityTowardCarrier: number;
}

/**
 * Attribute a contact window's value across its defenders by peak toward-carrier
 * velocity share. Windows with no positive velocity mass are skipped (no credit
 * manufactured from a pile-up with no measurable pursuit).
 */
export function attributeWindow(windows: readonly ContactWindow[]): Record<string, number> {
  const credit: Record<string, number> = {};
  const totalV = windows.reduce((s, w) => s + Math.max(w.peakVelocityTowardCarrier, 0), 0);
  if (!(totalV > 0)) return credit;
  for (const w of windows) {
    const share = Math.max(w.peakVelocityTowardCarrier, 0) / totalV;
    credit[w.defender] = (credit[w.defender] ?? 0) + w.value * share;
  }
  return credit;
}

/** Aggregate window credits into per-defender fractional tackles over a sample. */
export function aggregateCredits(allWindows: ReadonlyArray<readonly ContactWindow[]>): Record<string, number> {
  const total: Record<string, number> = {};
  for (const windows of allWindows) {
    const c = attributeWindow(windows);
    for (const [d, v] of Object.entries(c)) total[d] = (total[d] ?? 0) + v;
  }
  return total;
}

/** Per-play fractional-tackle rate for a defender. */
export function fractionalTackleRate(totalCredit: number, plays: number): number {
  if (!(plays > 0)) throw new Error("fractional-tackles: plays must be positive");
  return totalCredit / plays;
}
