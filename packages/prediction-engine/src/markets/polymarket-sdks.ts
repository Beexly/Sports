/**
 * Vendored Polymarket SDKs.
 *
 * The MIT trees live in packages/polymarket-sdks. They are in the engine so
 * a caller can import the official client instead of a one-off fetch.
 *
 * Publish stays closed. source-router.ts marks polymarket-gamma cleared:false
 * until counsel approves storage and commercial display. This module does
 * not flip that flag and does not place orders.
 */

export const VENDORED_POLYMARKET_SDKS = [
  "ts-sdk",
  "py-sdk",
  "lattice-std",
  "py-clob-client-v2",
  "polymarket-us-python",
  "polymarket-us-typescript",
  "real-time-data-client",
  "clob-client-v2",
  "rs-clob-client-v2",
] as const;

export const POLYMARKET_PUBLISH_HOLD =
  "polymarket-gamma is cleared:false. Storage and commercial display stay off until a counsel-approved registry entry.";

export function polymarketPublishAllowed(): false {
  return false;
}
