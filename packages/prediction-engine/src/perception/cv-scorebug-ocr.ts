/**
 * Score-bug OCR: free structured game state from the broadcast graphic.
 *
 * The score bug is the densest information on screen: quarter, clock,
 * down, distance, score, and often the yard line and possession. Reading it
 * turns "22 moving dots" into "3rd-and-7, Q4, down 4" — the context every
 * downstream perception and tendency computation needs.
 *
 * Layouts differ per network (CBS / FOX / NBC / ESPN / Prime / NFLN), so
 * the crop region and field geometry are configurable presets. The OCR
 * engine is a swappable boundary: Tesseract via subprocess in production,
 * a fixture engine in tests.
 *
 * Original implementation for GSE.
 */

/** Crop region as fractions of the frame (0..1). */
export interface CropRegion {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export type BroadcastNetwork =
  | "CBS"
  | "FOX"
  | "NBC"
  | "ESPN"
  | "PRIME"
  | "NFLN"
  | "UNKNOWN";

export interface ScoreBugPreset {
  readonly network: BroadcastNetwork;
  /** Where the bug lives. Defaults below are approximate; tune per feed. */
  readonly region: CropRegion;
  /** Does this layout show the yard line ("Ball on")? */
  readonly showsYardLine: boolean;
  /** Does this layout show a possession indicator? */
  readonly showsPossession: boolean;
  readonly notes: string;
}

export const SCORE_BUG_PRESETS: Record<BroadcastNetwork, ScoreBugPreset> = {
  // All regions are starting approximations — the score-bug geometry is
  // tuned per feed on first sighting and then locked in.
  CBS: {
    network: "CBS",
    region: { x: 0.02, y: 0.86, w: 0.3, h: 0.12 },
    showsYardLine: true,
    showsPossession: true,
    notes: "Bottom-left bar; down & distance under the clock.",
  },
  FOX: {
    network: "FOX",
    region: { x: 0.02, y: 0.86, w: 0.3, h: 0.12 },
    showsYardLine: true,
    showsPossession: true,
    notes: "Bottom-left box score; possession dot by team abbrev.",
  },
  NBC: {
    network: "NBC",
    region: { x: 0.02, y: 0.04, w: 0.32, h: 0.1 },
    showsYardLine: true,
    showsPossession: true,
    notes: "Top-left; SNF layout with yard line strip.",
  },
  ESPN: {
    network: "ESPN",
    region: { x: 0.66, y: 0.03, w: 0.32, h: 0.1 },
    showsYardLine: true,
    showsPossession: false,
    notes: "Top-right MNF layout; possession often absent.",
  },
  PRIME: {
    network: "PRIME",
    region: { x: 0.02, y: 0.86, w: 0.3, h: 0.12 },
    showsYardLine: true,
    showsPossession: true,
    notes: "TNF bottom-left; Prime Video variant of FOX-ish bar.",
  },
  NFLN: {
    network: "NFLN",
    region: { x: 0.02, y: 0.86, w: 0.3, h: 0.12 },
    showsYardLine: false,
    showsPossession: true,
    notes: "Bottom-left; yard line strip inconsistent.",
  },
  UNKNOWN: {
    network: "UNKNOWN",
    region: { x: 0.0, y: 0.8, w: 0.4, h: 0.2 },
    showsYardLine: false,
    showsPossession: false,
    notes: "Wide net for unidentified feeds; expect noisy OCR.",
  },
};

export interface ScoreBugState {
  readonly quarter: number | null;
  /** Seconds remaining in the quarter. */
  readonly clockSec: number | null;
  readonly down: number | null;
  /** Yards to go. Null for goal-to-go (use distanceYd=goal). */
  readonly distanceYd: number | null;
  readonly yardLine: { team: string; yard: number } | null;
  readonly homeTeam: string | null;
  readonly homeScore: number | null;
  readonly awayTeam: string | null;
  readonly awayScore: number | null;
  readonly possession: string | null;
  readonly rawText: string;
  /** 0..1 — fraction of fields successfully parsed. */
  readonly confidence: number;
}

/** Swappable OCR boundary. Crop is a grayscale pixel matrix. */
export interface OCREngine {
  readonly name: string;
  recognize(crop: readonly (readonly number[])[]): Promise<string>;
}

/** Deterministic fixture engine: returns canned text per call. */
export class FixtureOCREngine implements OCREngine {
  readonly name = "fixture-ocr";
  private calls = 0;
  constructor(private readonly script: readonly string[]) {}
  async recognize(_crop: readonly (readonly number[])[]): Promise<string> {
    const text = this.script[Math.min(this.calls, this.script.length - 1)] ?? "";
    this.calls++;
    return text;
  }
}

/**
 * Tesseract via subprocess. Requires the `tesseract` binary on PATH.
 * Throws a descriptive error when missing so callers can fall back.
 */
export class TesseractOCREngine implements OCREngine {
  readonly name = "tesseract-ocr";
  async recognize(crop: readonly (readonly number[])[]): Promise<string> {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const execFileAsync = promisify(execFile);
    // Encode as PGM; single uniform text block mode. The crop goes through
    // a temp file because execFile options carry no stdin payload.
    const h = crop.length;
    const w = crop[0]?.length ?? 0;
    if (h === 0 || w === 0) return "";
    let pgm = `P2\n${w} ${h}\n255\n`;
    for (const row of crop) pgm += row.map((v) => Math.max(0, Math.min(255, Math.round(v)))).join(" ") + "\n";
    const dir = mkdtempSync(join(tmpdir(), "scorebug-"));
    const pgmPath = join(dir, "crop.pgm");
    try {
      writeFileSync(pgmPath, pgm);
      const { stdout } = await execFileAsync("tesseract", [
        pgmPath,
        "stdout",
        "--psm",
        "6",
        "-c",
        "tessedit_char_whitelist=0123456789:&QSTNDRDTHstndrdth-ABCDEFGHIJKLMNOPQRSTUVWXYZ ",
      ]);
      return stdout.trim();
    } catch (err) {
      throw new Error(
        `tesseract OCR failed (is the tesseract binary installed?): ${(err as Error).message}`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
}

/** Crop a grayscale frame to a fractional region. */
export function cropRegion(
  frame: readonly (readonly number[])[],
  frameW: number,
  frameH: number,
  region: CropRegion,
): number[][] {
  const x0 = Math.floor(region.x * frameW);
  const y0 = Math.floor(region.y * frameH);
  const w = Math.floor(region.w * frameW);
  const h = Math.floor(region.h * frameH);
  const out: number[][] = [];
  for (let y = y0; y < Math.min(y0 + h, frameH); y++) {
    const row: number[] = [];
    for (let x = x0; x < Math.min(x0 + w, frameW); x++) {
      row.push(frame[y]?.[x] ?? 0);
    }
    out.push(row);
  }
  return out;
}

const DOWN_RE = /([1-4])(?:st|nd|rd|th)\s*&?\s*(\d+|goal)/i;
const CLOCK_RE = /(\d{1,2}):(\d{2})/;
const QTR_RE = /\bQ([1-4])\b|\bOT\b/i;
const SCORE_RE = /\b([A-Z]{2,3})\s+(\d{1,3})\b.*?\b([A-Z]{2,3})\s+(\d{1,3})\b/;
const YARD_RE = /\b([A-Z]{2,3})\s+(\d{1,2})\b/;
const TEAM_RE = /\b([A-Z]{2,3})\b/g;

/** Parse raw OCR text into structured game state. Pure function, fully testable. */
export function parseScoreBug(rawText: string): ScoreBugState {
  const text = rawText.replace(/\s+/g, " ").trim();
  let filled = 0;
  const total = 7;

  let quarter: number | null = null;
  const qm = QTR_RE.exec(text);
  if (qm) {
    quarter = qm[1] ? parseInt(qm[1], 10) : 5;
    filled++;
  }

  let clockSec: number | null = null;
  const cm = CLOCK_RE.exec(text);
  if (cm) {
    clockSec = parseInt(cm[1]!, 10) * 60 + parseInt(cm[2]!, 10);
    filled++;
  }

  let down: number | null = null;
  let distanceYd: number | null = null;
  const dm = DOWN_RE.exec(text);
  if (dm) {
    down = parseInt(dm[1]!, 10);
    distanceYd = dm[2]!.toLowerCase() === "goal" ? 0 : parseInt(dm[2]!, 10);
    filled++;
  }

  let homeTeam: string | null = null;
  let homeScore: number | null = null;
  let awayTeam: string | null = null;
  let awayScore: number | null = null;
  const sm = SCORE_RE.exec(text);
  if (sm) {
    awayTeam = sm[1]!;
    awayScore = parseInt(sm[2]!, 10);
    homeTeam = sm[3]!;
    homeScore = parseInt(sm[4]!, 10);
    filled += 2;
  }

  // Yard line: look for a team abbrev + number NOT consumed by the score.
  // Scans every occurrence — the yard line usually trails the score.
  let yardLine: { team: string; yard: number } | null = null;
  const teams = [...new Set([...text.matchAll(TEAM_RE)].map((m) => m[1]!))];
  for (const t of teams) {
    const re = new RegExp(`\\b${t}\\s+(\\d{1,2})\\b`, "g");
    for (const m of text.matchAll(re)) {
      const yard = parseInt(m[1]!, 10);
      const isScoreTeam =
        (t === awayTeam && yard === awayScore) ||
        (t === homeTeam && yard === homeScore);
      if (!isScoreTeam && yard >= 1 && yard <= 50) {
        yardLine = { team: t, yard };
        filled++;
        break;
      }
    }
    if (yardLine) break;
  }

  // Possession: a team abbrev adjacent to a dot/arrow marker is unreliable
  // via OCR text alone; left null unless the layout encodes it textually.
  const possession: string | null = null;

  return {
    quarter,
    clockSec,
    down,
    distanceYd,
    yardLine,
    homeTeam,
    homeScore,
    awayTeam,
    awayScore,
    possession,
    rawText: text,
    confidence: Math.round((filled / total) * 100) / 100,
  };
}

/** End-to-end: crop → OCR → parse. */
export async function readScoreBug(
  frame: readonly (readonly number[])[],
  frameW: number,
  frameH: number,
  preset: ScoreBugPreset,
  engine: OCREngine,
): Promise<ScoreBugState> {
  const crop = cropRegion(frame, frameW, frameH, preset.region);
  const raw = await engine.recognize(crop);
  return parseScoreBug(raw);
}
