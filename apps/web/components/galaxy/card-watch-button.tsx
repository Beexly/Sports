"use client";

import { useState } from "react";
import { GALAXY } from "@/lib/galaxy/theme";

export function CardWatchButton({ slug, initialWatching, canAct }: { slug: string; initialWatching: boolean; canAct: boolean }) {
  const [on, setOn] = useState(initialWatching);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function toggle() {
    if (!canAct) { setMsg("Create your Galaxy Profile to watch cards."); return; }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/galaxy/market", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "watch", cardSlug: slug }),
      });
      const data = await res.json();
      if (res.ok && data.ok) setOn(Boolean(data.watching));
      else setMsg(data.error ?? "Failed.");
    } catch {
      setMsg("Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
      <button
        onClick={toggle}
        disabled={busy}
        style={{ padding: "8px 16px", borderRadius: 9, border: `1px solid ${on ? GALAXY.gold : GALAXY.border}`, background: on ? `${GALAXY.gold}14` : "transparent", color: on ? GALAXY.gold : GALAXY.textMuted, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", fontSize: 13 }}
      >
        {on ? "★ Watching" : "☆ Watch this card"}
      </button>
      {msg && <span style={{ fontSize: 12, color: GALAXY.textMuted }}>{msg}</span>}
    </span>
  );
}
