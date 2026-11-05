// guarded conformal p-value from Sesia-Favaro 2026 eq (5)
// p(y~) = [1 + sum I[s((X,y~);D) <= s(Zi;D)]] / (n+1)
// fail closed on non-numeric or empty
export function sesiaConformalPValue(scores, testScore) {
  if (!Array.isArray(scores) || scores.length === 0 || typeof testScore !== 'number' || !Number.isFinite(testScore)) {
    return null; // fail closed
  }
  const n = scores.length;
  let count = 1; // the +1 for the test itself if <=
  for (const s of scores) {
    if (typeof s !== 'number' || !Number.isFinite(s)) return null;
    if (testScore <= s) count++;
  }
  return count / (n + 1);
}
