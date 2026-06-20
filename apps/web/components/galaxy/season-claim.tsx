"use client";

import { useState } from "react";
import { GALAXY } from "@/lib/galaxy/theme";

export function SeasonClaimButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/galaxy/season", { method: "POST" });
      const data = await res.json();
      if (res.status === 401) {
        setError("Create your Galaxy Profile to join the Season Cup.");
        return;
      }
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Claim failed.");
      if (data.claimed.length === 0) {
        setMsg("Nothing to claim yet — earn more Season Points by running Signal Checks.");
      } else {
        const tiers = data.claimed.map((t: { name: string }) => t.name).join(", ");
        setMsg(`Claimed ${tiers} — +${data.creditsAwarded} Credits.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claim failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={claim}
        disabled={busy}
        style={{
          padding: "11px 22px",
          borderRadius: 10,
          border: "none",
          background: GALAXY.gold,
          color: GALAXY.void,
          fontWeight: 800,
          cursor: busy ? "not-allowed" : "pointer",
        }}
      >
        {busy ? "Claiming…" : "Claim Season rewards"}
      </button>
      {msg && <p style={{ color: GALAXY.cyan, fontSize: 13, marginTop: 10 }}>{msg}</p>}
      {error && <p style={{ color: GALAXY.magenta, fontSize: 13, marginTop: 10 }}>{error}</p>}
    </div>
  );
}
