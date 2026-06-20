"use client";

import { useState } from "react";
import { GALAXY } from "@/lib/galaxy/theme";

export function DailyClaim({ streak }: { streak: number }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function claim() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/galaxy/daily", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg(data.error ?? "Could not claim.");
        return;
      }
      if (data.alreadyClaimedToday) setMsg(`Already claimed today — streak ${data.streak}. Come back tomorrow.`);
      else setMsg(`+${data.creditsAwarded} Credits · streak ${data.streak}${data.insuranceUsed ? " (insurance covered a missed day)" : ""}.`);
    } catch {
      setMsg("Could not claim.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
      <button
        onClick={claim}
        disabled={busy}
        style={{ padding: "8px 16px", borderRadius: 9, border: `1px solid ${GALAXY.gold}66`, background: `${GALAXY.gold}14`, color: GALAXY.gold, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", fontSize: 13 }}
      >
        {busy ? "…" : `Claim daily (streak ${streak})`}
      </button>
      {msg && <span style={{ fontSize: 12, color: GALAXY.textMuted }}>{msg}</span>}
    </span>
  );
}
