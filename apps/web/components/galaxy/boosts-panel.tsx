"use client";

import { useState } from "react";
import { GALAXY } from "@/lib/galaxy/theme";

interface BoostItem {
  id: string;
  name: string;
  kind: string;
  description: string;
  rarity: string;
  source: string;
  novaPrice: number | null;
  owned: number;
  timed: boolean;
}

const rarityColor = (r: string) => (r === "EPIC" ? GALAXY.violet : r === "RARE" ? GALAXY.cyan : GALAXY.textMuted);

export function BoostsPanel({ items, canAct }: { items: BoostItem[]; canAct: boolean }) {
  const [inv, setInv] = useState(items);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function call(action: "acquire" | "activate", item: BoostItem) {
    if (!canAct) { setMsg("Create your Galaxy Profile to use boosts."); return; }
    setBusy(item.id + action);
    setMsg(null);
    try {
      const res = await fetch("/api/galaxy/consumables", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, consumableId: item.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setMsg(data.error ?? "Failed."); return; }
      if (action === "acquire") {
        setInv((prev) => prev.map((x) => (x.id === item.id ? { ...x, owned: x.owned + 1 } : x)));
        setMsg(data.testMode ? `Bought ${item.name} (Stripe test mode — no charge).` : `Got ${item.name}.`);
      } else {
        setInv((prev) => prev.map((x) => (x.id === item.id ? { ...x, owned: Math.max(0, x.owned - 1) } : x)));
        setMsg(data.message ?? `Activated ${item.name}.`);
      }
    } catch {
      setMsg("Failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {msg && <p style={{ color: GALAXY.cyan, fontSize: 13 }}>{msg}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 12 }}>
        {inv.map((it) => {
          const canActivate = it.owned > 0 && it.kind !== "streak_shield";
          return (
            <div key={it.id} style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong style={{ color: GALAXY.text }}>{it.name}</strong>
                <span style={{ fontSize: 11, color: rarityColor(it.rarity), fontWeight: 700 }}>{it.rarity}</span>
              </div>
              <p style={{ fontSize: 12, color: GALAXY.textMuted, margin: "6px 0" }}>{it.description}</p>
              <div style={{ fontSize: 11, color: GALAXY.textMuted }}>Owned: {it.owned}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {it.source === "nova" && it.novaPrice != null && (
                  <button onClick={() => call("acquire", it)} disabled={busy != null} style={btnOutline(GALAXY.gold)}>
                    {busy === it.id + "acquire" ? "…" : `Buy ${it.novaPrice} Nova (test)`}
                  </button>
                )}
                {canActivate && (
                  <button onClick={() => call("activate", it)} disabled={busy != null} style={btn(GALAXY.cyan)}>
                    {busy === it.id + "activate" ? "…" : "Activate"}
                  </button>
                )}
                {it.kind === "streak_shield" && it.owned > 0 && (
                  <span style={{ fontSize: 11, color: GALAXY.textMuted }}>Auto-used on a missed day</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function btn(accent: string): React.CSSProperties {
  return { padding: "6px 12px", borderRadius: 8, border: "none", background: accent, color: GALAXY.void, fontWeight: 700, cursor: "pointer", fontSize: 12 };
}
function btnOutline(accent: string): React.CSSProperties {
  return { padding: "6px 12px", borderRadius: 8, border: `1px solid ${accent}66`, background: `${accent}14`, color: accent, fontWeight: 700, cursor: "pointer", fontSize: 12 };
}
