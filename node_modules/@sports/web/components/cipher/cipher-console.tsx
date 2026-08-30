"use client";

/**
 * CipherConsole — the sitewide "the engine talks" easter-egg.
 *
 * Prints a styled nudge to the browser devtools console on every page. It only
 * ever receives sanitized status from the server (state, codename, counts) —
 * never the shard tokens — so opening the console points curious visitors at
 * the hunt without handing them the answer. Fires once per page load.
 */

import { useEffect } from "react";

type Props = {
  state: "live" | "sealed";
  codename: string;
  week: number;
  shardCount: number;
};

export function CipherConsole({ state, codename, week, shardCount }: Props) {
  useEffect(() => {
    const head = "color:#00E5FF;font-weight:700;font-size:13px";
    const body = "color:#9fb3c8;font-size:12px";
    const accent = "color:#FF38C7;font-weight:600";
    /* eslint-disable no-console */
    if (state === "live") {
      console.log("%c◬ THE GLASS BOX CIPHER", head);
      console.log(
        `%cChapter ${week}: "${codename}" is LIVE. %c${shardCount} shards%c are hidden across the site.\nInspect what others only read. Assemble them in order, then bring the key to %c/cipher%c.`,
        body, accent, body, accent, body,
      );
    } else {
      console.log("%c◬ THE GLASS BOX CIPHER", head);
      console.log(
        `%cThe box is sealed. The next transmission opens %cMon 11:59am ET%c.\nWhen it does, the shards return. %c/cipher%c`,
        body, accent, body, accent, body,
      );
    }
    /* eslint-enable no-console */
  }, [state, codename, week, shardCount]);

  return null;
}
