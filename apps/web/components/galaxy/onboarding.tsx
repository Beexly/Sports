"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ARCHETYPES, FACTIONS, getArchetype } from "@sports/galaxy-engine";
import { GALAXY } from "@/lib/galaxy/theme";

export function GalaxyOnboarding() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [archetype, setArchetype] = useState<string | null>(null);
  const [faction, setFaction] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickArchetype(id: string) {
    setArchetype(id);
    // Default the faction to the archetype's affinity (user can still change it).
    if (!faction) setFaction(getArchetype(id as never).defaultFaction);
  }

  async function submit() {
    if (!handle.trim() || !archetype || !faction) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/galaxy/onboard", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle: handle.trim(), archetype, faction }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setError("Sign in first, then create your Galaxy Profile. (Demo: explore the Campus without signing in.)");
        return;
      }
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Could not create profile.");
      router.push("/galaxy/war-room?academy=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create profile.");
    } finally {
      setBusy(false);
    }
  }

  const ready = handle.trim().length >= 2 && archetype && faction;

  return (
    <div>
      <label style={{ display: "block", fontSize: 13, color: GALAXY.textMuted, marginBottom: 6 }}>
        Pick your handle
      </label>
      <input
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        placeholder="e.g. NightSignal"
        aria-label="Pick your handle"
        maxLength={24}
        style={{
          width: "100%",
          maxWidth: 360,
          padding: "11px 14px",
          borderRadius: 10,
          border: `1px solid ${GALAXY.border}`,
          background: GALAXY.panel,
          color: GALAXY.text,
          fontSize: 15,
        }}
      />

      <h3 style={{ marginTop: 26, marginBottom: 6, fontSize: 15, color: GALAXY.text }}>
        Choose your archetype
      </h3>
      <p style={{ color: GALAXY.textMuted, fontSize: 13, marginTop: 0 }}>
        Your lane. Every archetype is viable — skill is earned, never bought.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 12 }}>
        {ARCHETYPES.map((a) => {
          const selected = archetype === a.id;
          return (
            <button
              key={a.id}
              onClick={() => pickArchetype(a.id)}
              style={{
                textAlign: "left",
                padding: 16,
                borderRadius: 12,
                border: `1.5px solid ${selected ? a.accent : GALAXY.border}`,
                background: selected ? `${a.accent}14` : GALAXY.panel,
                color: GALAXY.text,
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 16, color: selected ? a.accent : GALAXY.text }}>
                {a.name}
              </div>
              <div style={{ fontSize: 12, color: GALAXY.textMuted, marginTop: 4 }}>{a.tagline}</div>
              <div style={{ fontSize: 12, color: GALAXY.textMuted, marginTop: 8 }}>{a.signaturePerk}</div>
            </button>
          );
        })}
      </div>

      <h3 style={{ marginTop: 26, marginBottom: 6, fontSize: 15, color: GALAXY.text }}>
        Choose your faction
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 10 }}>
        {FACTIONS.map((f) => {
          const selected = faction === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFaction(f.id)}
              style={{
                textAlign: "left",
                padding: 14,
                borderRadius: 10,
                border: `1.5px solid ${selected ? f.accent : GALAXY.border}`,
                background: selected ? `${f.accent}14` : GALAXY.panel,
                color: GALAXY.text,
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 700, color: selected ? f.accent : GALAXY.text }}>{f.name}</div>
              <div style={{ fontSize: 12, color: GALAXY.textMuted, marginTop: 4 }}>{f.creed}</div>
            </button>
          );
        })}
      </div>

      {error && <p style={{ color: GALAXY.magenta, fontSize: 13, marginTop: 16 }}>{error}</p>}

      <button
        onClick={submit}
        disabled={!ready || busy}
        style={{
          marginTop: 22,
          padding: "13px 26px",
          borderRadius: 10,
          border: "none",
          background: ready ? GALAXY.gold : GALAXY.border,
          color: ready ? GALAXY.void : GALAXY.textMuted,
          fontWeight: 800,
          fontSize: 15,
          cursor: ready && !busy ? "pointer" : "not-allowed",
        }}
      >
        {busy ? "Entering the Campus…" : "Enter the Campus →"}
      </button>
    </div>
  );
}
