/**
 * Observability layer (barrel).
 *
 * A minimal, importable structured-logging + error/event-capture surface that
 * is a SAFE no-op unless its provider env keys are set. Nothing here is wired
 * into a page, route, or layout — it is a pure library to be opted into.
 *
 * Inert-by-default:
 *   - logger: writes structured lines to the local console only. Never egresses.
 *     Threshold via LOG_LEVEL; format via NODE_ENV. Always safe to call.
 *   - captureError / captureEvent: silent no-ops (local log line only) unless a
 *     provider env key is present (presence checked, value never read/printed).
 *
 * Usage:
 *   import { logger, captureError, captureEvent } from "@/lib/observability";
 */
export {
  logger,
  createChildLogger,
  type Logger,
  type LogLevel,
  type LogEntry,
  type LogFields,
} from "./logger";

export {
  captureError,
  captureEvent,
  isErrorCaptureEnabled,
  isEventCaptureEnabled,
  type CaptureContext,
  type EventProps,
} from "./capture";
