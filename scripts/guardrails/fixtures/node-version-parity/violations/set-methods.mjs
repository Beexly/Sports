const a = new Set([1, 2]);
const b = new Set([2, 3]);
export const disjoint = a.isDisjointFrom(b);
export const symmetric = a.symmetricDifference(b);
