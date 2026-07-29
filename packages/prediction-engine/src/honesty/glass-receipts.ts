/**
 * Glass Ledger receipt chain (pure) — demo fingerprint for open recompute.
 * Production anchors with stronger hash + OpenTimestamps; structure matches.
 */

export interface PickReceipt {
  readonly pickId: string;
  readonly sport: string;
  readonly market: string;
  readonly selection: string;
  readonly modelVersion: string;
  readonly committedAt: string;
  readonly settledAt: string | null;
  readonly result: "WIN" | "LOSS" | "PUSH" | "OPEN" | "BOOTSTRAP";
  readonly edgeIndex: number | null;
  readonly clv: number | null;
  readonly fingerprint: string;
  readonly prevFingerprint: string | null;
}

export interface LedgerHead {
  readonly masterFingerprint: string;
  readonly n: number;
  readonly nSettled: number;
  readonly nBootstrap: number;
  readonly winRatePublic: boolean;
  readonly winRate: number | null;
  readonly gate: string;
}

/** FNV-1a 32-bit — deterministic demo fingerprint (not production crypto). */
export function fingerprintPayload(payload: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ("00000000" + (h >>> 0).toString(16)).slice(-8);
}

export function buildReceipt(input: {
  pickId: string;
  sport: string;
  market: string;
  selection: string;
  modelVersion: string;
  committedAt: string;
  settledAt?: string | null;
  result?: PickReceipt["result"];
  edgeIndex?: number | null;
  clv?: number | null;
  prevFingerprint?: string | null;
}): PickReceipt {
  const body = [
    input.pickId,
    input.sport,
    input.market,
    input.selection,
    input.modelVersion,
    input.committedAt,
    input.settledAt ?? "",
    input.result ?? "OPEN",
    String(input.edgeIndex ?? ""),
    input.prevFingerprint ?? "",
  ].join("|");
  return {
    pickId: input.pickId,
    sport: input.sport,
    market: input.market,
    selection: input.selection,
    modelVersion: input.modelVersion,
    committedAt: input.committedAt,
    settledAt: input.settledAt ?? null,
    result: input.result ?? "OPEN",
    edgeIndex: input.edgeIndex ?? null,
    clv: input.clv ?? null,
    fingerprint: fingerprintPayload(body),
    prevFingerprint: input.prevFingerprint ?? null,
  };
}

export function chainReceipts(
  specs: Array<Omit<Parameters<typeof buildReceipt>[0], "prevFingerprint">>,
): PickReceipt[] {
  const out: PickReceipt[] = [];
  let prev: string | null = null;
  for (const s of specs) {
    const r = buildReceipt({ ...s, prevFingerprint: prev });
    out.push(r);
    prev = r.fingerprint;
  }
  return out;
}

export function recomputeChain(receipts: readonly PickReceipt[]): {
  ok: boolean;
  master: string;
} {
  let prev: string | null = null;
  let ok = true;
  for (const r of receipts) {
    const body = [
      r.pickId,
      r.sport,
      r.market,
      r.selection,
      r.modelVersion,
      r.committedAt,
      r.settledAt ?? "",
      r.result,
      String(r.edgeIndex ?? ""),
      prev ?? "",
    ].join("|");
    if (fingerprintPayload(body) !== r.fingerprint) ok = false;
    prev = r.fingerprint;
  }
  const master = fingerprintPayload(receipts.map((r) => r.fingerprint).join(""));
  return { ok, master };
}

export function ledgerHead(receipts: readonly PickReceipt[], settledFloor = 100): LedgerHead {
  const settled = receipts.filter(
    (r) => r.result === "WIN" || r.result === "LOSS" || r.result === "PUSH",
  );
  const judged = settled.filter((r) => r.result !== "PUSH" && r.result !== "BOOTSTRAP");
  const wins = judged.filter((r) => r.result === "WIN").length;
  const nBootstrap = receipts.filter((r) => r.result === "BOOTSTRAP").length;
  const winRate = judged.length ? wins / judged.length : null;
  const publicOk = judged.length >= settledFloor;
  const { master } = recomputeChain(receipts);
  return {
    masterFingerprint: master,
    n: receipts.length,
    nSettled: settled.length,
    nBootstrap,
    winRatePublic: publicOk,
    winRate: publicOk ? winRate : null,
    gate: publicOk
      ? "open — settled floor met"
      : `closed — need ${settledFloor - judged.length} more judged picks`,
  };
}
