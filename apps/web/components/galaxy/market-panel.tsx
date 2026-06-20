"use client";

import { useState } from "react";
import { GALAXY } from "@/lib/galaxy/theme";

interface CardLite {
  slug: string;
  name: string;
}
interface OfferLite {
  id: string;
  fromHandle: string;
  offerCardName: string;
  requestCardSlug: string | null;
  note: string | null;
}

export function MarketPanel({
  cards,
  watched,
  offers,
  canAct,
}: {
  cards: CardLite[];
  watched: string[];
  offers: OfferLite[];
  canAct: boolean;
}) {
  const [watchSet, setWatchSet] = useState<Set<string>>(new Set(watched));
  const [offerCard, setOfferCard] = useState(cards[0]?.slug ?? "");
  const [wantSlug, setWantSlug] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggleWatch(slug: string) {
    if (!canAct) { setError("Create your Galaxy Profile to use the Vault Market."); return; }
    setError(null);
    try {
      const res = await fetch("/api/galaxy/market", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "watch", cardSlug: slug }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed.");
      setWatchSet((prev) => {
        const next = new Set(prev);
        if (data.watching) next.add(slug);
        else next.delete(slug);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
    }
  }

  async function postOffer() {
    if (!canAct) { setError("Create your Galaxy Profile to post a trade offer."); return; }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/galaxy/market", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "offer", offerCardSlug: offerCard, requestCardSlug: wantSlug || undefined, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed.");
      setMsg("Trade offer posted. Acceptance/settlement arrives with the full marketplace (Stage 3).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 15, color: GALAXY.text }}>Watch cards</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 10 }}>
        {cards.map((c) => {
          const on = watchSet.has(c.slug);
          return (
            <div key={c.slug} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 10, padding: "10px 12px" }}>
              <span style={{ color: GALAXY.text, fontSize: 14 }}>{c.name}</span>
              <button onClick={() => toggleWatch(c.slug)} style={{ background: "transparent", border: `1px solid ${on ? GALAXY.gold : GALAXY.border}`, color: on ? GALAXY.gold : GALAXY.textMuted, borderRadius: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>
                {on ? "★ Watching" : "☆ Watch"}
              </button>
            </div>
          );
        })}
      </div>

      <h2 style={{ fontSize: 15, color: GALAXY.text, marginTop: 24 }}>Post a card-for-card offer</h2>
      <p style={{ fontSize: 12, color: GALAXY.textMuted, marginTop: 0 }}>
        No currency, no cash — cards only. Settlement is Stage-3 (partner-gated).
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select value={offerCard} onChange={(e) => setOfferCard(e.target.value)} style={selectStyle}>
          {cards.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <span style={{ color: GALAXY.textMuted }}>for</span>
        <input value={wantSlug} onChange={(e) => setWantSlug(e.target.value)} placeholder="card slug you want (optional)" style={{ ...selectStyle, minWidth: 200 }} />
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="note (optional)" maxLength={120} style={{ ...selectStyle, width: "100%", maxWidth: 420, marginTop: 10 }} />
      <div style={{ marginTop: 10 }}>
        <button onClick={postOffer} disabled={busy} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: GALAXY.gold, color: GALAXY.void, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}>
          {busy ? "Posting…" : "Post offer"}
        </button>
      </div>
      {msg && <p style={{ color: GALAXY.cyan, fontSize: 13, marginTop: 8 }}>{msg}</p>}
      {error && <p style={{ color: GALAXY.magenta, fontSize: 13, marginTop: 8 }}>{error}</p>}

      <h2 style={{ fontSize: 15, color: GALAXY.text, marginTop: 24 }}>Open offers</h2>
      {offers.length === 0 ? (
        <p style={{ color: GALAXY.textMuted, fontSize: 14 }}>No open offers yet — post the first one.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {offers.map((o) => (
            <div key={o.id} style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 14 }}>
              <strong style={{ color: GALAXY.text }}>@{o.fromHandle}</strong> offers{" "}
              <span style={{ color: GALAXY.gold }}>{o.offerCardName}</span>
              {o.requestCardSlug && <> for <span style={{ color: GALAXY.cyan }}>{o.requestCardSlug}</span></>}
              {o.note && <div style={{ fontSize: 12, color: GALAXY.textMuted }}>{o.note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 9,
  background: GALAXY.void,
  color: GALAXY.text,
  border: `1px solid ${GALAXY.border}`,
  fontSize: 14,
};
