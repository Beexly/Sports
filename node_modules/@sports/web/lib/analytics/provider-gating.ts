/**
 * OP-004: analytics providers must fail independently. Each provider renders
 * only when the master flag is on AND that provider's own identifier is
 * present — a missing token must never emit a malformed request (e.g. a
 * Clarity tag literally named "undefined") and must never disable a sibling
 * provider whose token IS configured. This module is pure so the gating
 * logic is unit-testable without rendering the layout component.
 */

function isPresentEnvValue(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isAnalyticsMasterEnabled(analyticsEnabled: string | undefined): boolean {
  return analyticsEnabled === "true";
}

export function shouldRenderCloudflareAnalytics(
  analyticsEnabled: string | undefined,
  beaconToken: string | undefined,
): boolean {
  return isAnalyticsMasterEnabled(analyticsEnabled) && isPresentEnvValue(beaconToken);
}

export function shouldRenderMicrosoftClarity(
  analyticsEnabled: string | undefined,
  clarityProjectId: string | undefined,
): boolean {
  return isAnalyticsMasterEnabled(analyticsEnabled) && isPresentEnvValue(clarityProjectId);
}
