
export interface RoleFeatures {
  readonly indicators: Record<string, number>;
  readonly pairAdjustments: { readonly pair: string; readonly effect: number }[];
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("+");
}

/**
 * Role-composition features: one-hot role indicators plus signed top role-pair
 * interactions (clamped to the paper's +/-0.5 OFFRTG scale). Unknown pairs get 0.
 */
export function roleFeatures(
  roles: readonly string[],
  pairEffects: Readonly<Record<string, number>>,
): RoleFeatures {
  const indicators: Record<string, number> = {};
  for (const r of roles) indicators[r] = 1;
  const pairAdjustments: { pair: string; effect: number }[] = [];
  for (let i = 0; i < roles.length; i++) {
    for (let j = i + 1; j < roles.length; j++) {
      const key = pairKey(roles[i] ?? "", roles[j] ?? "");
      const effect = pairEffects[key] ?? 0;
      if (effect !== 0) {
        pairAdjustments.push({ pair: key, effect: Math.min(Math.max(effect, -0.5), 0.5) });
      }
    }
  }
  return { indicators, pairAdjustments };
}

/** Total lineup adjustment: sum of signed pair effects. */
export function lineupAdjustment(feat: RoleFeatures): number {
  return feat.pairAdjustments.reduce((s, p) => s + p.effect, 0);
}
