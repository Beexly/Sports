import { spawn } from "node:child_process";

export type HighlightType = "TD" | "INT";

export interface Highlight {
  readonly tStart: number;
  readonly tEnd: number;
  readonly type: HighlightType;
  readonly confidence: number;
}

export interface HighlightDetectorOptions {
  readonly serviceRoot?: string;
  readonly pythonPath?: string;
  readonly signal?: AbortSignal;
}

function runPython(args: readonly string[], options: HighlightDetectorOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(options.pythonPath ?? "python3", args, {
      cwd: options.serviceRoot ?? "gse-ml-service",
      stdio: ["ignore", "pipe", "pipe"],
      signal: options.signal,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code: number | null) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`highlight detector exited ${code}: ${stderr}`));
    });
  });
}

function isHighlight(value: unknown): value is Highlight {
  if (value === null || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.tStart === "number" && Number.isFinite(row.tStart) &&
    typeof row.tEnd === "number" && Number.isFinite(row.tEnd) &&
    (row.type === "TD" || row.type === "INT") &&
    typeof row.confidence === "number" && Number.isFinite(row.confidence) &&
    row.confidence >= 0 && row.confidence <= 1;
}

/** Call the Python detector for a local broadcast reference and parse its JSON sidecar. */
export async function detectHighlights(
  videoRef: string,
  options: HighlightDetectorOptions = {},
): Promise<readonly Highlight[]> {
  if (!videoRef.trim()) return [];
  const raw = await runPython([
    "-c",
    "import json,sys; from app.models.highlight_detector import detect_highlights; print(json.dumps(detect_highlights(sys.argv[1])))",
    videoRef,
  ], options);
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.filter(isHighlight) : [];
}
