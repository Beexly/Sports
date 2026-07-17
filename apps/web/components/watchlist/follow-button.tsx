"use client";

import { useState } from "react";
import type { WatchlistEntityType } from "@/lib/watchlist/types";

/**
 * FollowButton — the watchlist retention primitive's UI: follow/unfollow a
 * team or player. Calls the server-side-gated API routes (no client-side
 * paywall math — CLAUDE.md rule #3); a 403 from /api/watchlist/follow
 * (follow cap reached) renders as an honest inline upsell, not a silent
 * failure or a fabricated success.
 */

interface FollowButtonProps {
  readonly entityType: WatchlistEntityType;
  readonly entityId: string;
  readonly entityLabel: string;
  readonly initialFollowing: boolean;
  /** Server-computed: true when the caller is already at their tier's
   *  follow cap AND not currently following this entity. Passed down so
   *  the button can show the upsell state without an extra round trip;
   *  the API still re-checks server-side regardless of this hint. */
  readonly atFollowLimit?: boolean;
  readonly onChange?: (following: boolean) => void;
}

type UiState = "idle" | "loading" | "limit_reached" | "error";

export function FollowButton({
  entityType,
  entityId,
  entityLabel,
  initialFollowing,
  atFollowLimit = false,
  onChange,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [state, setState] = useState<UiState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function toggle() {
    setState("loading");
    setMessage(null);
    const endpoint = following ? "/api/watchlist/unfollow" : "/api/watchlist/follow";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entityType, entityId }),
      });
      const body = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string; upsell?: { upgradeTier?: string } }
        | null;

      if (res.status === 403) {
        setState("limit_reached");
        setMessage(
          body?.error ??
            `Follow limit reached. Upgrade to ${body?.upsell?.upgradeTier ?? "Pro"} for more room.`,
        );
        return;
      }
      if (res.status === 401) {
        setState("error");
        setMessage("Sign in to follow teams and players.");
        return;
      }
      if (!res.ok || !body?.success) {
        setState("error");
        setMessage(body?.error ?? "Couldn't update your watchlist. Try again.");
        return;
      }

      const nowFollowing = !following;
      setFollowing(nowFollowing);
      setState("idle");
      onChange?.(nowFollowing);
    } catch {
      setState("error");
      setMessage("Network blip. Check your connection and retry.");
    }
  }

  const disabled = state === "loading" || (!following && atFollowLimit && state !== "limit_reached");
  const label = following
    ? "Following"
    : atFollowLimit
      ? "Follow limit reached"
      : "Follow";

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        disabled={disabled}
        aria-busy={state === "loading"}
        aria-pressed={following}
        aria-label={`${following ? "Unfollow" : "Follow"} ${entityLabel}`}
        onClick={toggle}
        className={[
          "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
          following
            ? "border-orbital-cyan/50 bg-orbital-cyan/10 text-orbital-cyan hover:bg-orbital-cyan/20"
            : "border-mineral bg-eclipse/60 text-ion-1 hover:border-orbital-cyan/40 hover:text-orbital-cyan",
          disabled ? "cursor-not-allowed opacity-60" : "",
        ].join(" ")}
      >
        {state === "loading" ? (
          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : following ? (
          <span aria-hidden="true">✓</span>
        ) : (
          <span aria-hidden="true">+</span>
        )}
        {label}
      </button>
      {message && (
        <p role="status" className={state === "error" ? "text-[11px] text-alert" : "text-[11px] text-ion-2"}>
          {message}
        </p>
      )}
    </div>
  );
}
