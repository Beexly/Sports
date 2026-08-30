"use client";

/**
 * FilmRoom — the Academy's video wing, built to receive.
 *
 * Episodes with a file in VIDEO_MANIFEST render a real player (poster =
 * generated key art, no autoplay, preload=none — decorative bandwidth is
 * rude). Episodes without a file show the in-production card. Dropping an
 * mp4 into public/academy/film/ and adding one manifest line lights an
 * episode up — zero further code.
 */

import { useState } from "react";
import Image from "next/image";
import { BRAND_COLORS } from "@/lib/brand";

const uv = BRAND_COLORS.softUltraviolet;
const cyan = BRAND_COLORS.orbitalCyan;

export const KEY_ART = "/academy/film/key-art.jpg";

interface Episode {
  readonly ep: string;
  readonly title: string;
  readonly minutes: string;
  /** path under /public, or null while the episode is in production */
  readonly src: string | null;
}

/** Production order. Fill `src` as episodes land in public/academy/film/. */
const EPISODES: readonly Episode[] = [
  { ep: "EP 01", title: "How to read a line like a price", minutes: "≈4 min", src: null },
  { ep: "EP 02", title: "The vig, de-vigging, and 52.4%", minutes: "≈5 min", src: null },
  { ep: "EP 03", title: "CLV: the only honest scoreboard", minutes: "≈5 min", src: null },
  { ep: "EP 04", title: "Key numbers and the half-points that matter", minutes: "≈4 min", src: null },
  { ep: "EP 05", title: "Bankroll: survival is the strategy", minutes: "≈4 min", src: null },
  { ep: "EP 06", title: "Steam, openers, and reading limits", minutes: "≈5 min", src: null },
] as const;

export function FilmRoom() {
  const [playing, setPlaying] = useState<string | null>(null);
  const liveCount = EPISODES.filter((e) => e.src !== null).length;

  return (
    <div className="flex flex-col gap-4">
      {/* key art marquee — the room itself */}
      <div
        className="relative overflow-hidden rounded-2xl border"
        style={{ borderColor: `${uv}33` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={KEY_ART}
          alt="The Film Room: a screening room in deep space"
          className="block h-44 w-full object-cover sm:h-56"
          loading="lazy"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, transparent 30%, rgba(5,6,8,0.92) 100%)" }}
        />
        <div className="absolute bottom-4 left-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: cyan }}>
            the film room
          </p>
          <p className="mt-1 font-display text-xl font-semibold text-white">
            {liveCount > 0
              ? `${liveCount} of ${EPISODES.length} episodes live`
              : "Six episodes in production"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EPISODES.map((e) =>
          e.src !== null ? (
            <div key={e.ep} className="surface-card overflow-hidden">
              {playing === e.ep ? (
                <video
                  className="aspect-video w-full"
                  src={e.src}
                  poster={KEY_ART}
                  controls
                  autoPlay
                  playsInline
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPlaying(e.ep)}
                  className="group relative block aspect-video w-full overflow-hidden text-left"
                  aria-label={`Play ${e.ep}: ${e.title}`}
                >
                  <Image src={KEY_ART} alt="" fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "rgba(5,6,8,0.45)" }}
                  >
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-full text-lg transition-transform duration-200 group-hover:scale-110"
                      style={{ background: cyan, color: BRAND_COLORS.obsidianBlack, boxShadow: `0 0 28px ${cyan}66` }}
                    >
                      ▶
                    </span>
                  </span>
                </button>
              )}
              <div className="p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: cyan }}>
                  {e.ep} · {e.minutes}
                </p>
                <p className="mt-1.5 text-sm font-semibold text-white">{e.title}</p>
              </div>
            </div>
          ) : (
            <div key={e.ep} className="surface-card relative overflow-hidden p-5" aria-label={`${e.ep}: in production`}>
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-24 animate-pulse opacity-20"
                style={{ background: `linear-gradient(110deg, ${uv}30, ${cyan}18, transparent)` }}
              />
              <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: uv }}>
                {e.ep} · {e.minutes}
              </p>
              <p className="mt-2 text-sm font-semibold text-white">{e.title}</p>
              <p className="mt-3 inline-block rounded-full border border-mineral px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-400">
                in production
              </p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
