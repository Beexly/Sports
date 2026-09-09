/**
 * WP-28 publish-time market probability — MOVED (C-253).
 *
 * The implementation now lives in `packages/prediction-engine/src/publish-time-market-p.ts`
 * so that `packages/ingestion-pipeline` can call it too. The signal slate needs
 * the same resolver at GENERATION time that the calibration loader uses after
 * settlement; a package cannot import from `apps/web`, and copying the de-vig
 * arithmetic into the ingestion package would have produced two implementations
 * of the receipt's own number that could silently drift apart. There is exactly
 * one.
 *
 * This file is a re-export so every existing import path and test keeps
 * working unchanged. Do not add logic here.
 */
export {
  PUBLISH_TIME_MARKET_P_METHOD,
  NON_BOOK_BOOKMAKER_KEYS,
  isRealBookmakerKey,
  pickedSide,
  latestH2hRowPerBookmaker,
  publishTimeMarketPSource,
  resolvePublishTimeMarketP,
  publishTimeMarketP,
} from "@sports/prediction-engine";
export type {
  OddsRowForMarketP,
  PickForMarketP,
  PickedSide,
  PublishTimeMarketPUnresolvedReason,
  PublishTimeMarketPSource,
  PublishTimeMarketPResolved,
  PublishTimeMarketPUnresolved,
  PublishTimeMarketPResult,
} from "@sports/prediction-engine";
