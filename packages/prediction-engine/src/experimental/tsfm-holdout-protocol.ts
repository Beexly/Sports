
export interface HoldoutSplit {
  readonly trainEnd: string;
  readonly embargoStart: string;
  readonly embargoEnd: string;
  readonly testStart: string;
  readonly testEnd: string;
}

/** Build a temporal holdout split with an embargo gap (all ISO dates). */
export function tsfmHoldoutSplit(trainEnd: string, embargoDays: number, testDays: number): HoldoutSplit {
  if (!(embargoDays >= 0 && testDays >= 1)) throw new Error("tsfm-holdout-protocol: bad window sizes");
  const t = new Date(trainEnd + "T00:00:00Z");
  if (Number.isNaN(t.getTime())) throw new Error("tsfm-holdout-protocol: bad trainEnd date");
  const iso = (d: Date): string => d.toISOString().slice(0, 10);
  const addDays = (d: Date, n: number): Date => new Date(d.getTime() + n * 86400000);
  const embargoStart = addDays(t, 1);
  const embargoEnd = addDays(t, embargoDays);
  const testStart = addDays(t, embargoDays + 1);
  const testEnd = addDays(t, embargoDays + testDays);
  return {
    trainEnd: iso(t),
    embargoStart: iso(embargoStart),
    embargoEnd: iso(embargoEnd),
    testStart: iso(testStart),
    testEnd: iso(testEnd),
  };
}

/** True when a candidate training date respects the embargo (no leakage). */
export function respectsEmbargo(candidateDate: string, split: HoldoutSplit): boolean {
  return candidateDate <= split.trainEnd;
}

/** Disclosure checklist every TSFM evaluation must complete. */
export function disclosureChecklist(): string[] {
  return [
    "training cutoff date documented",
    "embargo window listed (structural breaks, season boundaries)",
    "no-shuffle temporal split verified",
    "leakage audit: no test-period features in training",
    "random seeds recorded",
  ];
}

/** Checklist pass/fail from a completed-items set. */
export function checklistPassed(completed: readonly string[]): boolean {
  const required = disclosureChecklist();
  return required.every((item) => completed.includes(item));
}
