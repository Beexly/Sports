"use client";

import { useState } from "react";
import { GALAXY } from "@/lib/galaxy/theme";

interface WardrobeItem {
  id: string;
  name: string;
  category: string;
  source: string;
  rarity: string;
  description: string;
  novaPrice: number | null;
  owned: boolean;
  equipped: boolean;
  unlockable: boolean;
  requirementLabel: string | null;
}
interface WardrobeCategory {
  id: string;
  label: string;
  items: WardrobeItem[];
}

const rarityColor = (r: string) =>
  r === "LEGEND" ? GALAXY.gold : r === "EPIC" ? GALAXY.violet : r === "RARE" ? GALAXY.cyan : GALAXY.textMuted;

export function Wardrobe({ categories, canAct }: { categories: WardrobeCategory[]; canAct: boolean }) {
  const [cats, setCats] = useState(categories);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function patch(id: string, p: Partial<WardrobeItem>) {
    setCats((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items.map((it) => {
          if (it.id === id) return { ...it, ...p };
          // single equip per category
          if (p.equipped && it.category === cat.items.find((x) => x.id === id)?.category) {
            return { ...it, equipped: false };
          }
          return it;
        }),
      })),
    );
  }

  async function act(action: "acquire" | "equip", item: WardrobeItem) {
    if (!canAct) { setMsg("Create your Galaxy Profile to use the Wardrobe."); return; }
    setBusy(item.id);
    setMsg(null);
    try {
      const res = await fetch("/api/galaxy/cosmetics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, cosmeticId: item.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setMsg(data.error ?? "Failed."); return; }
      if (action === "acquire") {
        patch(item.id, { owned: true });
        setMsg(data.testMode ? `Acquired ${item.name} (Stripe test mode — no charge).` : `Earned ${item.name}!`);
      } else {
        patch(item.id, { equipped: true });
        setMsg(`Equipped ${item.name}.`);
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
      {cats.map((cat) => (
        <div key={cat.id} style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 14, letterSpacing: 1.2, color: GALAXY.textMuted, marginBottom: 8 }}>
            {cat.label.toUpperCase()}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 10 }}>
            {cat.items.map((it) => (
              <div key={it.id} style={{ background: GALAXY.panel, border: `1px solid ${it.equipped ? `${GALAXY.gold}66` : GALAXY.border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ color: GALAXY.text }}>{it.name}</strong>
                  <span style={{ fontSize: 11, color: rarityColor(it.rarity), fontWeight: 700 }}>{it.rarity}</span>
                </div>
                <p style={{ fontSize: 12, color: GALAXY.textMuted, margin: "6px 0" }}>{it.description}</p>
                {it.equipped ? (
                  <span style={{ fontSize: 12, color: GALAXY.gold, fontWeight: 700 }}>✓ Equipped</span>
                ) : it.owned ? (
                  <button onClick={() => act("equip", it)} disabled={busy === it.id} style={btn(GALAXY.gold)}>
                    {busy === it.id ? "…" : "Equip"}
                  </button>
                ) : it.source === "nova" ? (
                  <button onClick={() => act("acquire", it)} disabled={busy === it.id} style={btnOutline(GALAXY.gold)}>
                    {busy === it.id ? "…" : `Buy ${it.novaPrice} Nova (test)`}
                  </button>
                ) : it.unlockable ? (
                  <button onClick={() => act("acquire", it)} disabled={busy === it.id} style={btn(GALAXY.cyan)}>
                    {busy === it.id ? "…" : "Claim (earned)"}
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: GALAXY.textMuted }}>🔒 {it.requirementLabel ?? "Locked"}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function btn(accent: string): React.CSSProperties {
  return { padding: "6px 12px", borderRadius: 8, border: "none", background: accent, color: GALAXY.void, fontWeight: 700, cursor: "pointer", fontSize: 12 };
}
function btnOutline(accent: string): React.CSSProperties {
  return { padding: "6px 12px", borderRadius: 8, border: `1px solid ${accent}66`, background: `${accent}14`, color: accent, fontWeight: 700, cursor: "pointer", fontSize: 12 };
}
