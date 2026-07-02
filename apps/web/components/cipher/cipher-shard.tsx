/**
 * CipherShard — server component that hides one weekly shard on its page.
 *
 * Rendered into intelligence / methodology / observatory. It emits the shard's
 * token ONLY when the cipher window is live and ONLY on the shard's assigned
 * page, as a faint corner glyph whose value lives in a data-attribute — visible
 * to anyone who inspects the DOM or reads the source, invisible to a casual
 * skim. This is a server component, so the token is never bundled into client
 * JS; it appears solely in the rendered HTML where it is meant to be found.
 */

import { getCipherStatus, type ShardPage } from "@/lib/cipher/cipher";

export function CipherShard({ page }: { page: ShardPage }) {
  const { chapter, state } = getCipherStatus();
  if (state !== "live") return null;
  const shard = chapter.shards.find((s) => s.page === page);
  if (!shard) return null;

  return (
    <span
      aria-hidden="true"
      data-glassbox-cipher={`shard-${shard.id}`}
      data-frequency={shard.value}
      title="◬ Glass Box Cipher: a shard rests here"
      className="fixed bottom-3 right-3 z-[2] select-none font-mono text-[11px] leading-none"
      style={{ color: shard.color, opacity: 0.22 }}
    >
      ◬
      {/* The token, present in source for those who look. */}
      <span hidden data-shard-value={shard.value}>
        {`GLASSBOX::SHARD-${shard.id}::${shard.value}`}
      </span>
    </span>
  );
}
