"use client";

import { useState } from "react";
import { GALAXY } from "@/lib/galaxy/theme";

export function NovaPackButton({ sku, nova, usd }: { sku: string; nova: number; usd: number }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function buy() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/galaxy/store/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sku }),
      });
      const data = await res.json();
      setMsg(data.ok ? data.checkout.message : (data.error ?? "Unavailable."));
    } catch {
      setMsg("Checkout unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <strong style={{ color: GALAXY.gold, fontSize: 18 }}>{nova} Nova</strong>
        <span style={{ color: GALAXY.textMuted, fontSize: 13 }}>${usd.toFixed(2)}</span>
      </div>
      <button
        onClick={buy}
        disabled={busy}
        style={{
          marginTop: 10,
          width: "100%",
          padding: "9px",
          borderRadius: 8,
          border: `1px solid ${GALAXY.gold}66`,
          background: `${GALAXY.gold}14`,
          color: GALAXY.gold,
          fontWeight: 700,
          cursor: busy ? "not-allowed" : "pointer",
        }}
      >
        {busy ? "…" : "Buy (test mode)"}
      </button>
      {msg && <p style={{ fontSize: 12, color: GALAXY.textMuted, marginTop: 8 }}>{msg}</p>}
    </div>
  );
}
