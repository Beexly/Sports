/**
 * `decodeDatasetText` must return BYTE-IDENTICAL text to the old buffered
 * path, on gzip and on plain input, and must not drop a single byte.
 *
 * The production OOM this fixes: `/api/cron/refresh-player-stats` returned 500
 * sixteen times on dpl_5w9WsXUHtYq3KbMiX58gTZzKZjZR with "instance was killed
 * because it ran out of available memory", on the PRIMARY path (not the 10:00
 * satellite window) — yet the same path also succeeded at 2026-09-28T02:00:03Z.
 * A margin problem, not a hard limit.
 *
 * The streaming rewrite is only acceptable if it is provably lossless, so
 * these tests compare it against a reference implementation of the ORIGINAL
 * buffered decode over the same bytes.
 */
import { describe, it, expect } from "vitest";
import { gzipSync } from "node:zlib";
import { Readable } from "node:stream";
import { decodeDatasetText } from "./nflverse-source";

/** The original implementation, verbatim, as the reference oracle. */
function originalDecode(buf: Buffer): string {
  const isGzip = buf.length > 1 && buf[0] === 0x1f && buf[1] === 0x8b;
  return isGzip ? require("node:zlib").gunzipSync(buf).toString("utf8") : buf.toString("utf8");
}

/** Build a Response whose body streams in `chunkSize` pieces. */
function streamingResponse(bytes: Buffer, chunkSize: number): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) {
        controller.enqueue(new Uint8Array(bytes.subarray(i, i + chunkSize)));
      }
      controller.close();
    },
  });
  return new Response(stream);
}

const CSV =
  'player_id,season,week,position,fantasy_points\n' +
  Array.from({ length: 500 }, (_, i) => `p${i},2026,${i % 18},WR,${(i % 40) / 3}`).join("\n") +
  "\n";

describe("decodeDatasetText — streaming decode is lossless", () => {
  it("plain (uncompressed) text: byte-identical to the original", async () => {
    const bytes = Buffer.from(CSV, "utf8");
    const got = await decodeDatasetText(streamingResponse(bytes, 97));
    expect(got).toBe(originalDecode(bytes));
    expect(got).toBe(CSV);
  });

  it("gzipped text: byte-identical to the original", async () => {
    const bytes = gzipSync(Buffer.from(CSV, "utf8"));
    const got = await decodeDatasetText(streamingResponse(bytes, 61));
    expect(got).toBe(originalDecode(bytes));
    expect(got).toBe(CSV);
  });

  it("survives a single-chunk body", async () => {
    const bytes = gzipSync(Buffer.from(CSV, "utf8"));
    const got = await decodeDatasetText(streamingResponse(bytes, bytes.length));
    expect(got).toBe(CSV);
  });

  it("survives a many-tiny-chunks body (exercises cross-chunk utf8 + gzip state)", async () => {
    const bytes = gzipSync(Buffer.from(CSV, "utf8"));
    const got = await decodeDatasetText(streamingResponse(bytes, 7));
    expect(got).toBe(CSV);
  });

  it("handles a MULTIBYTE character split across a chunk boundary", async () => {
    // A naive per-chunk decode would corrupt these; the incremental
    // TextDecoder with { stream: true } is what makes this correct.
    const text = "a,b,c\n" + "é,😀,漢\n".repeat(50);
    const plain = Buffer.from(text, "utf8");
    expect(await decodeDatasetText(streamingResponse(plain, 1))).toBe(text);
    const gz = gzipSync(plain);
    expect(await decodeDatasetText(streamingResponse(gz, 1))).toBe(text);
  });

  it("returns empty for an empty body rather than throwing", async () => {
    const empty = new Response(new ReadableStream<Uint8Array>({ start(c) { c.close(); } }));
    expect(await decodeDatasetText(empty)).toBe("");
  });

  it("never drops or duplicates a row on a realistically large payload", async () => {
    const big = "id,v\n" + Array.from({ length: 20000 }, (_, i) => `${i},${i * 2}`).join("\n") + "\n";
    const gz = gzipSync(Buffer.from(big, "utf8"));
    const got = await decodeDatasetText(streamingResponse(gz, 1024));
    expect(got).toBe(big);
    const rows = got.trim().split("\n").length - 1;
    expect(rows).toBe(20000);
  });
});
