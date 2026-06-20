"use client";

import { useState } from "react";
import { GALAXY } from "@/lib/galaxy/theme";

export function FollowButton({ handle, initialFollowing, canAct }: { handle: string; initialFollowing: boolean; canAct: boolean }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function toggle() {
    if (!canAct) { setMsg("Create your Galaxy Profile to follow players."); return; }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/galaxy/social", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "follow", handle }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setMsg(data.error ?? "Failed."); return; }
      setFollowing(Boolean(data.following));
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
        style={{
          padding: "8px 16px",
          borderRadius: 9,
          border: `1px solid ${following ? GALAXY.border : GALAXY.gold}`,
          background: following ? "transparent" : GALAXY.gold,
          color: following ? GALAXY.textMuted : GALAXY.void,
          fontWeight: 700,
          cursor: busy ? "not-allowed" : "pointer",
          fontSize: 13,
        }}
      >
        {busy ? "…" : following ? "Following ✓" : "+ Follow"}
      </button>
      {msg && <span style={{ fontSize: 12, color: GALAXY.textMuted }}>{msg}</span>}
    </span>
  );
}
