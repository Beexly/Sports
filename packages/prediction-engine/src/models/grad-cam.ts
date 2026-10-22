/**
 * Grad-CAM localization.
 *
 * Selvaraju et al., ICCV 2017, pp. 618-626. The channel weight is the
 * mean gradient. The map is ReLU of the weighted activations.
 * Guided Grad-CAM, which the NGS post uses, also needs guided
 * backpropagation. That second step is not here.
 */

export function gradCamMap(activations: readonly (readonly number[])[], gradients: readonly (readonly number[])[]): number[] {
  if (activations.length === 0 || activations.length !== gradients.length) {
    throw new Error("activations and gradients need the same positive channel count");
  }
  const spatial = activations[0].length;
  if (spatial === 0) throw new Error("each channel needs at least one location");
  const weights = activations.map((channel, c) => {
    const grad = gradients[c];
    if (channel.length !== spatial || grad.length !== spatial) throw new Error("channels must share a spatial length");
    return grad.reduce((sum, g) => sum + g, 0) / spatial;
  });
  return Array.from({ length: spatial }, (_, i) => {
    const raw = weights.reduce((sum, w, c) => sum + w * activations[c][i], 0);
    return raw > 0 ? raw : 0;
  });
}
