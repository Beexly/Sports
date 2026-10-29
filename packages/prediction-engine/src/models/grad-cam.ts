/**
 * Grad-CAM localization.
 *
 * Selvaraju et al., ICCV 2017, pp. 618-626. The channel weight is the
 * mean gradient. The map is ReLU of the weighted activations.
 * Guided Grad-CAM is the elementwise product of that map and the guided
 * backprop signal. The gate keeps a gradient only when both the activation
 * and the incoming gradient are positive.
 */

export function gradCamMap(activations: readonly (readonly number[])[], gradients: readonly (readonly number[])[]): number[] {
  if (activations.length === 0 || activations.length !== gradients.length) {
    throw new Error("activations and gradients need the same positive channel count");
  }
  const firstChan = activations[0] ?? [];
  const spatial = firstChan.length;
  if (spatial === 0) throw new Error("each channel needs at least one location");
  const weights = activations.map((channel, c) => {
    const grad = gradients[c];
    if (!grad || channel.length !== spatial || grad.length !== spatial) throw new Error("channels must share a spatial length");
    return grad.reduce((sum, g) => sum + g, 0) / spatial;
  });
  return Array.from({ length: spatial }, (_, i) => {
    const raw = weights.reduce((sum, w, c) => sum + w * (activations[c]?.[i] ?? 0), 0);
    return raw > 0 ? raw : 0;
  });
}

/** Guided backprop gate: keep the incoming gradient only when both it and the activation are positive. */
export function guidedBackpropGate(activation: number, incomingGrad: number): number {
  if (!Number.isFinite(activation) || !Number.isFinite(incomingGrad)) {
    throw new Error("activation and gradient must be finite");
  }
  if (activation <= 0 || incomingGrad <= 0) return 0;
  return incomingGrad;
}

/** Guided Grad-CAM is the Grad-CAM map times the guided-backprop signal, elementwise. */
export function guidedGradCam(cam: readonly number[], guidedSignal: readonly number[]): number[] {
  if (cam.length === 0 || cam.length !== guidedSignal.length) {
    throw new Error("cam and guided signal must share a positive length");
  }
  return cam.map((value, i) => value * (guidedSignal[i] ?? 0));
}
