"use client";

import { useState } from "react";
import { CREW_ROLES } from "@sports/galaxy-engine";
import { GALAXY } from "@/lib/galaxy/theme";

export function CrewLanePicker({ crewId, currentLane }: { crewId: string; currentLane: string | null }) {
  const [lane, setLane] = useState(currentLane);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function pick(id: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/galaxy/crew", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "lane", crewId, lane: id }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setLane(id);
        setMsg("Lane set — your weekly mission is below.");
      } else setMsg(data.error ?? "Could not set lane.");
    } catch {
      setMsg("Could not set lane.");
    } finally {
      setBusy(false);
    }
  }

  const active = CREW_ROLES.find((r) => r.id === lane) ?? null;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {CREW_ROLES.map((r) => {
          const on = r.id === lane;
          return (
            <button
              key={r.id}
              onClick={() => pick(r.id)}
              disabled={busy}
              style={{
                padding: "7px 12px",
                borderRadius: 999,
                border: `1px solid ${on ? GALAXY.violet : GALAXY.border}`,
                background: on ? `${GALAXY.violet}1a` : "transparent",
                color: on ? GALAXY.text : GALAXY.textMuted,
                fontSize: 13,
                fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {r.name}
            </button>
          );
        })}
      </div>
      {active && (
        <div style={{ marginTop: 10, background: GALAXY.panel, border: `1px solid ${GALAXY.border}`, borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontSize: 12, color: GALAXY.violet, fontWeight: 700 }}>{active.name} — weekly mission</div>
          <div style={{ fontSize: 14, color: GALAXY.text, marginTop: 2 }}>{active.weeklyMission}</div>
          <a href={active.href} style={{ fontSize: 13, color: GALAXY.cyan }}>Go →</a>
        </div>
      )}
      {msg && <p style={{ fontSize: 12, color: GALAXY.textMuted, marginTop: 8 }}>{msg}</p>}
    </div>
  );
}
