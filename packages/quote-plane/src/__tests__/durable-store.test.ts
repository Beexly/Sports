import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  existsSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ClosingArchive } from "../archive/closing-archive";
import {
  hydrateClosingArchive,
  persistClosingArchive,
  resolveArchivePath,
  readArchiveSnapshot,
  writeArchiveSnapshot,
  emptySnapshot,
} from "../archive/durable-store";
import type { QuoteLine } from "../types";

function line(
  partial: Partial<QuoteLine> & Pick<QuoteLine, "eventId" | "q">,
): QuoteLine {
  return {
    eventId: partial.eventId,
    sport: partial.sport ?? "NFL",
    market: partial.market ?? "binary_pm",
    selection: partial.selection ?? "Yes",
    q: partial.q,
    quoteAsOf: partial.quoteAsOf ?? "2026-07-29T12:00:00.000Z",
    sourceId: partial.sourceId ?? "polymarket.gamma",
    sourceKind: partial.sourceKind ?? "prediction_market",
    rights: partial.rights ?? "public_market",
  };
}

describe("durable ClosingArchive store", () => {
  let dir: string;
  let path: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gse-archive-"));
    path = join(dir, "closing.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("resolveArchivePath refuse-default when unset", () => {
    expect(resolveArchivePath(null, {})).toBeNull();
    expect(resolveArchivePath("  ", {})).toBeNull();
    expect(resolveArchivePath("/tmp/x", {})).toBe("/tmp/x");
    expect(resolveArchivePath(null, { CLOSING_ARCHIVE_PATH: "/a/b" })).toBe(
      "/a/b",
    );
  });

  it("missing file hydrates empty without inventing", () => {
    const a = new ClosingArchive();
    const r = hydrateClosingArchive(a, { path });
    expect(r.code).toBe("missing");
    expect(a.size()).toBe(0);
  });

  it("round-trip persist + hydrate preserves rows", () => {
    const a = new ClosingArchive();
    a.ingestLines([
      line({ eventId: "e1", q: 0.55, selection: "Yes" }),
      line({ eventId: "e1", q: 0.45, selection: "No" }),
    ]);
    const w = persistClosingArchive(a, { path });
    expect(w.ok).toBe(true);
    expect(w.rows).toBe(2);
    expect(existsSync(path)).toBe(true);

    const b = new ClosingArchive();
    const h = hydrateClosingArchive(b, { path });
    expect(h.ok).toBe(true);
    expect(b.size()).toBe(2);
  });

  it("corrupt file refuses invent and returns empty", () => {
    writeArchiveSnapshot(path, emptySnapshot());
    writeFileSync(path, "{not-json", "utf8");
    const { result, snapshot } = readArchiveSnapshot(path);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("corrupt");
    expect(snapshot.rows).toEqual([]);
  });

  it("merge hydrate does not drop existing keys", () => {
    const a = new ClosingArchive();
    a.ingestLines([
      line({
        eventId: "keep",
        q: 0.6,
        quoteAsOf: "2026-01-01T00:00:00.000Z",
      }),
    ]);
    persistClosingArchive(a, { path });

    const b = new ClosingArchive();
    b.ingestLines([
      line({
        eventId: "live",
        q: 0.7,
        quoteAsOf: "2026-02-01T00:00:00.000Z",
      }),
    ]);
    hydrateClosingArchive(b, { path });
    expect(b.size()).toBe(2);
  });
});
