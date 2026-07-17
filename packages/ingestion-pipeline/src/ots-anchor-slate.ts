/**
 * OTS anchoring for freshly-frozen slate commitments (W-OTS slice 2).
 *
 * Runs AFTER the atomic Merkle-commitment transaction succeeds, and is
 * fail-open by contract: nothing here may ever throw or add a failure mode to
 * the freeze path — the Merkle commitment is the load-bearing artifact; the
 * Bitcoin anchor is an upgrade layered on top. Concretely:
 *   - OTS_ANCHOR_ENABLED !== "true"  → DISABLED, zero network, zero DB writes.
 *   - all calendars down             → the detached artifact STILL stores with
 *     pending markers (per the packet doctrine: a down calendar leaves a valid,
 *     upgradeable pending artifact — buildDetachedOts works fully offline).
 *   - otsProof column not migrated   → honest SKIP_NOT_MIGRATED warn (P2022 /
 *     column-does-not-exist), never a crash — same graceful-degradation
 *     doctrine as the watchlist/line-archive tables.
 *
 * Transport is injected (no hidden HTTP); the default uses global fetch with
 * a bounded timeout per calendar.
 */

import { submitToCalendars, type CalendarTransport } from "@sports/crypto";

type Env = Record<string, string | undefined>;

/** Literal-"true" gate, same convention as every founder-gated flag. */
export function isOtsAnchorEnabled(env: Env = process.env): boolean {
  return env["OTS_ANCHOR_ENABLED"] === "true";
}

export type SlateAnchorResult =
  | { readonly action: "DISABLED" }
  | { readonly action: "ANCHORED"; readonly okCalendars: number; readonly failedCalendars: number }
  | { readonly action: "SKIP_NOT_MIGRATED" }
  | { readonly action: "FAILED"; readonly reason: string };

/** Minimal delegate shape (mirrors lib/watchlist/db.ts's honest-cast doctrine:
 *  the generated client type may predate the founder-applied migration). */
interface SlateOtsDb {
  slateCommitment: {
    update(args: {
      where: { slateKey: string };
      data: { otsProof: Uint8Array };
    }): Promise<unknown>;
  };
}

function isMissingColumnError(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  const message = error instanceof Error ? error.message : String(error);
  return code === "P2022" || /column .* does not exist/i.test(message) || message.includes("otsProof");
}

const CALENDAR_TIMEOUT_MS = 10_000;

/** Default transport: real fetch, bounded per-calendar timeout. */
export function defaultCalendarTransport(): CalendarTransport {
  return {
    fetchBinary: async (url: string, body: Uint8Array): Promise<Uint8Array> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CALENDAR_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: Buffer.from(body),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
        return new Uint8Array(await res.arrayBuffer());
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

/**
 * Anchor one just-frozen slate root. NEVER throws; the caller logs the result.
 */
export async function anchorSlateCommitment(args: {
  readonly slateKey: string;
  readonly rootHex: string;
  readonly db: unknown;
  readonly env?: Env;
  readonly transport?: CalendarTransport;
}): Promise<SlateAnchorResult> {
  const env = args.env ?? process.env;
  if (!isOtsAnchorEnabled(env)) return { action: "DISABLED" };
  try {
    const transport = args.transport ?? defaultCalendarTransport();
    const { ots, ok, failed } = await submitToCalendars(args.rootHex, transport);
    // Even ok=0 stores the valid pending artifact — upgradeable later.
    const db = args.db as SlateOtsDb;
    try {
      await db.slateCommitment.update({
        where: { slateKey: args.slateKey },
        data: { otsProof: ots },
      });
    } catch (updateErr) {
      if (isMissingColumnError(updateErr)) return { action: "SKIP_NOT_MIGRATED" };
      throw updateErr;
    }
    return { action: "ANCHORED", okCalendars: ok.length, failedCalendars: failed.length };
  } catch (error) {
    return { action: "FAILED", reason: error instanceof Error ? error.message : String(error) };
  }
}
