/**
 * CipherConsoleMount — server wrapper that feeds the client console clue.
 *
 * Computes the live status server-side and passes only sanitized fields to the
 * client <CipherConsole>. Drop it on the cipher-relevant pages so the devtools
 * nudge appears where the hunt lives, without importing shard tokens into the
 * client bundle or forcing the whole app into dynamic rendering via the layout.
 */

import { getCipherStatus } from "@/lib/cipher/cipher";
import { CipherConsole } from "./cipher-console";

export function CipherConsoleMount() {
  const { chapter, state } = getCipherStatus();
  return (
    <CipherConsole
      state={state}
      codename={chapter.codename}
      week={chapter.week}
      shardCount={chapter.shards.length}
    />
  );
}
