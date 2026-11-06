import { spawn } from "node:child_process";

export interface PlaySegment {
  readonly playIndex: number;
  readonly tStart: number;
  readonly tEnd: number;
}

export interface FilmSplitterOptions {
  readonly serviceRoot?: string;
  readonly pythonPath?: string;
  readonly signal?: AbortSignal;
}

function runPython(args: readonly string[], options: FilmSplitterOptions): Promise<string> {
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
      else reject(new Error(`film splitter exited ${code}: ${stderr}`));
    });
  });
}

function isSegment(value: unknown): value is PlaySegment {
  if (value === null || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.playIndex === "number" && Number.isInteger(row.playIndex) && row.playIndex >= 0 &&
    typeof row.tStart === "number" && Number.isFinite(row.tStart) && row.tStart >= 0 &&
    typeof row.tEnd === "number" && Number.isFinite(row.tEnd) && row.tEnd >= row.tStart;
}

export async function splitFilm(
  videoRef: string,
  options: FilmSplitterOptions = {},
): Promise<readonly PlaySegment[]> {
  if (!videoRef.trim()) return [];
  const raw = await runPython([
    "-c",
    "import json,sys; from app.models.film_splitter import split_film; print(json.dumps(split_film(sys.argv[1])))",
    videoRef,
  ], options);
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.filter(isSegment) : [];
}
