/**
 * Scaled dot-product attention.
 *
 * Vaswani et al., 2017: softmax(q · k / sqrt(d)).
 * The NGS coverage model uses this to weigh frames. Alammar's illustrated
 * post is CC BY-NC-SA and was not copied.
 */

function softmax(scores: readonly number[]): number[] {
  const peak = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - peak));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export function attentionWeights(query: readonly number[], keys: readonly (readonly number[])[]): number[] {
  if (keys.length === 0) throw new Error("at least one key is required");
  const width = query.length;
  if (width === 0 || keys.some((k) => k.length !== width)) throw new Error("query and keys must share a positive width");
  const scale = Math.sqrt(width);
  const scores = keys.map((key) => query.reduce((sum, q, i) => sum + q * (key[i] ?? 0), 0) / scale);
  if (scores.some((s) => !Number.isFinite(s))) throw new Error("attention scores must be finite");
  return softmax(scores);
}
