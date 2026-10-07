export const byTier = Object.groupBy([{ tier: "free" }], (p) => p.tier);
export const asMap = Map.groupBy([{ tier: "pro" }], (p) => p.tier);
