/**
 * Shared client for the gse-watch-pipeline HF Space.
 *
 * The Space is the CV compute brain (cloud-hosted — nothing runs on Garrett's
 * local workspace or the GSE VM). Its URL is configured via the
 * GSE_WATCH_SPACE_URL env var; when unset it defaults to the production
 * Space (https://beexly-gse-watch-pipeline.hf.space).
 */

/** Base URL of the watch-pipeline Space (no trailing slash). */
export const DEFAULT_WATCH_SPACE_URL = "https://beexly-gse-watch-pipeline.hf.space";

export function watchSpaceUrl(): string | null {
  const u = (process.env.GSE_WATCH_SPACE_URL?.trim() || DEFAULT_WATCH_SPACE_URL).replace(
    /\/+$/,
    "",
  );
  return u && u.length > 0 ? u : null;
}

/**
 * Warm-ping the Space's /health so it doesn't cold-start mid-drive.
 * Returns true when the Space reports healthy. Never throws — the scheduler
 * treats a failed ping as "not warm" and retries next tick.
 */
export async function pingWatchSpace(timeoutMs = 8000): Promise<boolean> {
  const base = watchSpaceUrl();
  if (!base) return false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/health`, { signal: ctrl.signal });
    if (!res.ok) return false;
    const data = (await res.json()) as { status?: string };
    return data.status === "ok";
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
