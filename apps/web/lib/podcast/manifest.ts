import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Podcast manifest loader (POD-01).
 *
 * The manifest (content/podcast/manifest.json) holds ONLY founder-published
 * episodes — entries are added by hand after the founder listens to the
 * rendered audio. The RSS feed and /podcast page render exactly what is here
 * and nothing else. Missing/unparseable manifest degrades to an empty show
 * (honest empty state), never throws.
 */

export interface PodcastEpisode {
  readonly title: string;
  readonly description: string;
  readonly date: string;
  readonly audioUrl: string;
  readonly durationSec?: number;
}

export interface PodcastManifest {
  readonly showTitle?: string;
  readonly showDescription?: string;
  readonly episodes?: PodcastEpisode[];
}

export function isPodcastEnabled(): boolean {
  return process.env["PODCAST_ENABLED"] === "true";
}

export function loadPodcastManifest(): PodcastManifest {
  try {
    const manifestPath = path.join(process.cwd(), "content", "podcast", "manifest.json");
    return JSON.parse(readFileSync(manifestPath, "utf8")) as PodcastManifest;
  } catch {
    return { episodes: [] };
  }
}

/** Published episodes only — entries missing required fields never render. */
export function publishableEpisodes(manifest: PodcastManifest): PodcastEpisode[] {
  return (manifest.episodes ?? []).filter((e) => Boolean(e.title && e.audioUrl && e.date));
}
