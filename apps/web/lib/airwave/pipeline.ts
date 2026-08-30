/**
 * Airwave Ledger — capture pipeline contracts (inert by default).
 *
 * This module defines the typed contract for the capture -> transcribe ->
 * extract -> grade pipeline and its per-source adapters. It deliberately does
 * NOT perform capture: the heavy, out-of-process work (segment capture, Whisper
 * transcription, diarization, LLM extraction) lives in a worker
 * (workers/airwave-ledger, documented in docs/airwave-ledger.md). What lives
 * here is the gate.
 *
 * Default posture is REFUSAL. Nothing captures unless a founder opens the gate,
 * and satellite-radio sources (SiriusXM-class) additionally require an explicit
 * legal acknowledgement, because their terms and the copyright posture are a
 * real-world decision a human signs off — not a flag a script flips for itself.
 *
 * Pure TypeScript, no Node-only or network imports, so it is covered by the web
 * typecheck and can never accidentally do I/O.
 */

import type { SourceKind } from "./types";

/** Programming is captured only inside this window (US Central Time). */
export const AIRING_WINDOW_CT = { startHour: 5, endHour: 23 } as const;

/** True when an hour-of-day (0..23, CT) falls inside the airing window. */
export function isWithinAiringWindow(hourCt: number): boolean {
  return hourCt >= AIRING_WINDOW_CT.startHour && hourCt < AIRING_WINDOW_CT.endHour;
}

/** The subset of environment flags that govern the gate. */
export type AirwaveEnv = {
  /** Master switch. False (default) = the whole pipeline is inert. */
  readonly enabled: boolean;
  /** Human-signed acknowledgement required for satellite-radio sources. */
  readonly siriusxmLegalAck: boolean;
};

/** Read the gate flags from an env bag (defaults to a fully-inert posture). */
export function readAirwaveEnv(env: Record<string, string | undefined> = {}): AirwaveEnv {
  return {
    enabled: env["AIRWAVE_ENABLED"] === "true",
    siriusxmLegalAck: env["AIRWAVE_SIRIUSXM_LEGAL_ACK"] === "true",
  };
}

export type SourceAdapter = {
  readonly kind: SourceKind;
  readonly label: string;
  /** Satellite-radio adapters set this; it forces the legal-ack gate. */
  readonly requiresLegalAck: boolean;
};

/** Freely-published sources carry the lowest real-world risk; gate is the master switch only. */
export const YOUTUBE_ADAPTER: SourceAdapter = { kind: "youtube", label: "YouTube show feed", requiresLegalAck: false };
export const PODCAST_ADAPTER: SourceAdapter = { kind: "podcast", label: "Podcast RSS feed", requiresLegalAck: false };
export const BROADCAST_TV_ADAPTER: SourceAdapter = { kind: "broadcast-tv", label: "Broadcast-TV simulcast", requiresLegalAck: true };
/** SiriusXM-class. Held behind an explicit human legal acknowledgement. */
export const SATELLITE_RADIO_ADAPTER: SourceAdapter = { kind: "satellite-radio", label: "Satellite radio (SiriusXM-class)", requiresLegalAck: true };

export const ALL_ADAPTERS: readonly SourceAdapter[] = [
  YOUTUBE_ADAPTER,
  PODCAST_ADAPTER,
  BROADCAST_TV_ADAPTER,
  SATELLITE_RADIO_ADAPTER,
];

export type GateDecision = {
  readonly allowed: boolean;
  readonly reason: string;
};

/**
 * Pure gate check. An adapter may capture only when the master switch is on
 * AND (if it is a legal-ack source) the human acknowledgement is also on.
 */
export function captureGate(adapter: SourceAdapter, env: AirwaveEnv): GateDecision {
  if (!env.enabled) {
    return { allowed: false, reason: "Airwave capture is gated off (AIRWAVE_ENABLED is not set)." };
  }
  if (adapter.requiresLegalAck && !env.siriusxmLegalAck) {
    return {
      allowed: false,
      reason: `${adapter.label} requires a signed legal acknowledgement (AIRWAVE_SIRIUSXM_LEGAL_ACK).`,
    };
  }
  return { allowed: true, reason: "Gate open." };
}

export class AirwaveGatedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "AirwaveGatedError";
  }
}

export type CaptureWindow = {
  readonly startIsoCt: string;
  readonly endIsoCt: string;
};

export type CapturePlanItem = {
  readonly adapter: SourceKind;
  readonly label: string;
  readonly held: boolean;
  readonly reason: string;
};

/**
 * Produce a dry-run plan: for each adapter, whether it would capture in this
 * window or is being held, and why. By design this NEVER captures — it is the
 * honest, inspectable statement of intent the cockpit shows the operator. Real
 * execution is the worker's job, and only past this gate.
 */
export function planCapture(
  adapters: readonly SourceAdapter[],
  _window: CaptureWindow,
  env: AirwaveEnv,
): CapturePlanItem[] {
  return adapters.map((adapter) => {
    const gate = captureGate(adapter, env);
    return { adapter: adapter.kind, label: adapter.label, held: !gate.allowed, reason: gate.reason };
  });
}
