/**
 * Event-driven scorebug-reading front end for the video lane
 *
 * Research port: arXiv:2411.00862
 * Normalized lane: tracking | Doctrine: INFRA
 *
 * Pure port of the paper's temporal-grounding pattern, adapted to broadcast
 * scorebug reading: a change-detection layer computes the frame-difference
 * of the scorebug region between consecutive frames and only runs OCR on
 * frames where the difference exceeds a threshold (cutting OCR compute ~10x),
 * then diffs consecutive OCR reads into a discrete event stream
 * (Q2, 3:42, 3rd&7) — producing play boundaries directly instead of via
 * timestamp matching. Frames are plain grayscale pixel grids; the OCR
 * function is injected.
 *
 * ACCEPTANCE GATE: Adopt as the video lane's alignment stage if >=90% of
 * plays align within +-2 s of nflverse timestamps on held-out networks (a
 * network not in training must be in the test set); reject if per-network
 * retraining is required.
 */

export type GrayFrame = number[][];

export interface ScorebugRegion {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** OCR function: cropped scorebug region pixels -> read text. Injected. */
export type OcrFn = (region: GrayFrame) => string;

function crop(frame: GrayFrame, region: ScorebugRegion): GrayFrame {
  const out: GrayFrame = [];
  for (let y = Math.max(0, region.y0); y < Math.min(frame.length, region.y1); y++) {
    const row = frame[y] ?? [];
    out.push(row.slice(Math.max(0, region.x0), Math.max(0, region.x1)));
  }
  return out;
}

/**
 * Mean absolute pixel difference of the scorebug region between two frames.
 * NaN when the region is empty or frames are missing.
 */
export function frameDifference(a: GrayFrame, b: GrayFrame, region: ScorebugRegion): number {
  if (!a || !b) return Number.NaN;
  const ca = crop(a, region);
  const cb = crop(b, region);
  let sum = 0;
  let n = 0;
  for (let y = 0; y < Math.max(ca.length, cb.length); y++) {
    const ra = ca[y] ?? [];
    const rb = cb[y] ?? [];
    for (let x = 0; x < Math.max(ra.length, rb.length); x++) {
      sum += Math.abs((ra[x] ?? 0) - (rb[x] ?? 0));
      n++;
    }
  }
  return n === 0 ? Number.NaN : sum / n;
}

export interface OcrRead {
  frameIndex: number;
  text: string;
}

/**
 * Change-detection pass: return the frame indices where the scorebug
 * region's frame-difference exceeds the threshold (plus index 0, which is
 * always read to seed the stream). Only these frames need OCR.
 */
export function detectChangedFrames(
  frames: GrayFrame[],
  region: ScorebugRegion,
  threshold: number,
): number[] {
  if (frames.length === 0) return [];
  const changed: number[] = [0];
  for (let i = 1; i < frames.length; i++) {
    const d = frameDifference(frames[i - 1] as GrayFrame, frames[i] as GrayFrame, region);
    if (Number.isFinite(d) && (d as number) > threshold) changed.push(i);
  }
  return changed;
}

/** Run OCR only on changed frames (the ~10x compute saving). */
export function readChangedFrames(
  frames: GrayFrame[],
  region: ScorebugRegion,
  threshold: number,
  ocr: OcrFn,
): OcrRead[] {
  return detectChangedFrames(frames, region, threshold).map((i) => ({
    frameIndex: i,
    text: ocr(crop(frames[i] as GrayFrame, region)),
  }));
}

export interface ScorebugEvent {
  frameIndex: number;
  quarter: string | null;
  clock: string | null;
  down: number | null;
  distance: number | null;
  /** which fields changed vs the previous read */
  changed: Array<"quarter" | "clock" | "down" | "distance">;
}

const READ_RE = /Q([1-4])\s+(\d{1,2}:\d{2})(?:\s+(\d)(?:st|nd|rd|th)\s*&\s*(\d+))?/i;

/** Parse one OCR read into structured scorebug fields. */
export function parseScorebugRead(text: string): Omit<ScorebugEvent, "frameIndex" | "changed"> {
  const m = typeof text === "string" ? text.match(READ_RE) : null;
  if (!m) return { quarter: null, clock: null, down: null, distance: null };
  return {
    quarter: m[1] ?? null,
    clock: m[2] ?? null,
    down: m[3] === undefined ? null : parseInt(m[3] ?? "", 10),
    distance: m[4] === undefined ? null : parseInt(m[4] ?? "", 10),
  };
}

/**
 * Diff consecutive OCR reads into a discrete event stream: an event is
 * emitted only when at least one field changed (Q2, 3:42, 3rd&7 ...).
 * Unparseable reads are skipped without breaking the stream.
 */
export function diffReadsToEvents(reads: OcrRead[]): ScorebugEvent[] {
  const events: ScorebugEvent[] = [];
  let prev: Omit<ScorebugEvent, "frameIndex" | "changed"> | null = null;
  for (const r of reads) {
    const cur = parseScorebugRead(r.text);
    if (cur.quarter === null && cur.clock === null) continue;
    const changed: ScorebugEvent["changed"] = [];
    if (!prev || prev.quarter !== cur.quarter) changed.push("quarter");
    if (!prev || prev.clock !== cur.clock) changed.push("clock");
    if (!prev || prev.down !== cur.down) changed.push("down");
    if (!prev || prev.distance !== cur.distance) changed.push("distance");
    if (changed.length > 0 || prev === null) {
      events.push({ frameIndex: r.frameIndex, ...cur, changed });
    }
    prev = cur;
  }
  return events;
}

export const GSE_SCOREBUG_EVENT_FRONTEND_ENABLED = false;
