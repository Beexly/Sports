"use client";

import { useState } from "react";
import { GALAXY } from "@/lib/galaxy/theme";

interface PreviewCrew {
  name: string;
  tag: string;
  motto: string;
  faction: string;
  memberCount: number;
}

export function CrewPanel({ previews }: { previews: PreviewCrew[] }) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [motto, setMotto] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (name.trim().length < 2 || tag.trim().length < 2) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/galaxy/crew", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", name: name.trim(), tag: tag.trim(), motto: motto.trim() || undefined }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setError("Create your Galaxy Profile first, then form a Crew.");
        return;
      }
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Could not create Crew.");
      setMsg(data.crew ? `Crew "${data.crew.name}" created — you're the Captain.` : "Crew created.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create Crew.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 16, color: GALAXY.text }}>Form a Crew</h2>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, maxWidth: 440 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Crew name"
          maxLength={32}
          style={inputStyle}
        />
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value.toUpperCase())}
          placeholder="TAG"
          maxLength={5}
          style={inputStyle}
        />
      </div>
      <input
        value={motto}
        onChange={(e) => setMotto(e.target.value)}
        placeholder="Motto (optional)"
        maxLength={80}
        style={{ ...inputStyle, marginTop: 10, maxWidth: 440, width: "100%" }}
      />
      {error && <p style={{ color: GALAXY.magenta, fontSize: 13 }}>{error}</p>}
      {msg && <p style={{ color: GALAXY.cyan, fontSize: 13 }}>{msg}</p>}
      <button
        onClick={create}
        disabled={busy}
        style={{
          marginTop: 12,
          padding: "10px 20px",
          borderRadius: 9,
          border: "none",
          background: GALAXY.gold,
          color: GALAXY.void,
          fontWeight: 800,
          cursor: busy ? "not-allowed" : "pointer",
        }}
      >
        {busy ? "Creating…" : "Create Crew"}
      </button>

      <h2 style={{ fontSize: 16, color: GALAXY.text, marginTop: 28 }}>Crews forming now</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 12, marginTop: 10 }}>
        {previews.map((c) => (
          <div key={c.tag} style={{ background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong style={{ color: GALAXY.text }}>{c.name}</strong>
              <span style={{ color: GALAXY.gold, fontSize: 12 }}>[{c.tag}]</span>
            </div>
            <div style={{ fontSize: 12, color: GALAXY.textMuted, marginTop: 4 }}>{c.motto}</div>
            <div style={{ fontSize: 11, color: GALAXY.textMuted, marginTop: 8 }}>
              {c.memberCount} members · {c.faction}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 9,
  border: `1px solid ${GALAXY.border}`,
  background: GALAXY.panel,
  color: GALAXY.text,
  fontSize: 14,
};
